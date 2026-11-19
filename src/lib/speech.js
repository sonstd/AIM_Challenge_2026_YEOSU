/**
 * 화면의 글을 읽어 주는 목소리 — **화면이 쓰는 쪽.**
 *
 * 실제 합성은 서버(/api/speech, Gemini TTS)가 한다. 브라우저 내장 TTS 보다 훨씬
 * 자연스럽지만 **한 문장에 5초쯤 걸리므로**, 필요해지기 전에 미리 받아 둔다.
 *
 *   prime(texts)  곧 읽을 글을 미리 받아 둔다(설문 질문 6개, 추천 근거 문장)
 *   speak(text)   읽는다. 미리 받아 둔 게 있으면 즉시 재생된다
 *   cancelSpeech() 읽던 것을 끊는다
 *
 * 서버가 막히거나 늦으면 **브라우저 내장 TTS 로 대신 읽는다.** 소리가 아예 안 나는
 * 것보다는 낫고, 같은 글을 두 번 읽지는 않는다.
 */

import { duckAudio, isMuted } from "@/lib/audio";

/** 미리 받아 둔 음성. `목소리|글` → Promise<string(blob url)> */
const cache = new Map();
const keyOf = (text, voice) => `${voice ?? ""}|${text}`;
/** 동시에 너무 많이 요청하지 않는다(서버가 한 건에 5초쯤 쓴다). */
const MAX_PARALLEL = 3;
let inFlight = 0;
const queue = [];

let currentAudio = null;
let currentTimer = null;
let currentToken = 0;

function pump() {
  while (inFlight < MAX_PARALLEL && queue.length) {
    const job = queue.shift();
    inFlight += 1;
    job().finally(() => {
      inFlight -= 1;
      pump();
    });
  }
}

/** 서버에 합성을 맡기고 재생할 수 있는 주소를 받아 둔다. */
function fetchAudio(text, voice) {
  const key = keyOf(text, voice);
  if (cache.has(key)) return cache.get(key);

  const promise = new Promise((resolve, reject) => {
    queue.push(async () => {
      try {
        const response = await fetch("/api/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice }),
        });
        if (!response.ok) throw new Error(`합성 실패 (${response.status})`);
        const blob = await response.blob();
        resolve(URL.createObjectURL(blob));
      } catch (error) {
        cache.delete(key); // 다음에 다시 시도할 수 있게 비워 둔다
        reject(error);
      }
    });
    pump();
  });

  cache.set(key, promise);
  return promise;
}

/**
 * 곧 읽을 글을 미리 받아 둔다. 실패해도 조용히 넘어간다(그때 가서 다시 시도한다).
 * @param {string[]} texts
 * @param {string} [voice] 읽을 사람의 목소리
 */
export function prime(texts, voice) {
  if (typeof window === "undefined") return;
  for (const text of texts) {
    const value = String(text ?? "").trim();
    if (value) fetchAudio(value, voice).catch(() => {});
  }
}

/** 소리를 꺼 둔 동안에도 대화 속도는 그대로여야 해서, 읽는 데 걸릴 시간을 어림한다. */
function estimateMs(text) {
  return Math.min(20000, Math.max(2000, text.length * 85));
}

/** 브라우저 내장 TTS — 서버가 막혔을 때만 쓴다. */
function speakWithBrowser(text, onDone) {
  const engine = window.speechSynthesis;
  const voices = engine?.getVoices?.() ?? [];
  const korean = voices.find((v) => (v.lang || "").toLowerCase().startsWith("ko"));
  if (!engine || !korean) {
    // 읽어 줄 수단이 없다. 그래도 대화는 흘러가야 하므로 읽었을 만큼 기다린다.
    currentTimer = setTimeout(onDone, estimateMs(text));
    return;
  }

  engine.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = korean;
  utterance.lang = "ko-KR";
  utterance.rate = 1.02;
  utterance.addEventListener("end", onDone);
  utterance.addEventListener("error", onDone);
  engine.speak(utterance);
}

/**
 * 한 토막을 읽는다. 읽던 게 있으면 끊고 새로 읽는다.
 * 읽는 동안 배경음악이 낮아진다.
 *
 * `onEnd` 는 **다 읽은 뒤**에 불린다. 화면은 이걸로 다음 말을 띄울 시점을 잡는다
 * (말하는 도중에 다음 말풍선이 떠서 말이 끊기지 않게 한다).
 * 소리를 꺼 두었거나 합성에 실패해도 onEnd 는 반드시 한 번 불린다.
 *
 * @param {string} rawText
 * @param {{ voice?: string, onEnd?: () => void }} [options]
 */
export async function speak(rawText, { voice, onEnd } = {}) {
  if (typeof window === "undefined") return;
  const text = String(rawText ?? "").trim();
  if (!text) {
    onEnd?.();
    return;
  }

  cancelSpeech();
  const token = ++currentToken;
  const finish = () => {
    if (token !== currentToken) return; // 이미 다음 말이 시작됐다
    duckAudio(false);
    onEnd?.();
  };

  // 소리를 꺼 두었으면 읽지 않되, 읽었을 만큼 기다렸다가 다음으로 넘긴다.
  if (isMuted()) {
    currentTimer = setTimeout(finish, estimateMs(text));
    return;
  }

  duckAudio(true);

  let url;
  try {
    url = await fetchAudio(text, voice);
  } catch {
    if (token !== currentToken) return;
    speakWithBrowser(text, finish); // 서버가 막혔다 — 내장 목소리로라도 읽는다
    return;
  }
  if (token !== currentToken) return; // 기다리는 사이에 화면이 바뀌었다

  const audio = new Audio(url);
  currentAudio = audio;
  audio.addEventListener("ended", finish);
  audio.addEventListener("error", finish);
  audio.play().catch(() => {
    // 아직 아무도 화면을 건드리지 않아 소리가 막혔다. 대화는 그대로 이어 간다.
    currentTimer = setTimeout(finish, estimateMs(text));
  });
}

/** 화면을 벗어날 때 읽던 것을 끊는다. */
export function cancelSpeech() {
  currentToken += 1;
  if (currentTimer) {
    clearTimeout(currentTimer);
    currentTimer = null;
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  window.speechSynthesis?.cancel();
  duckAudio(false);
}
