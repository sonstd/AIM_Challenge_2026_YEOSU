/**
 * 음성 합성(Gemini TTS) — **서버 전용이다.** 키가 들어 있으니 화면에서 import 하지 않는다.
 *
 * 브라우저 내장 TTS 보다 훨씬 자연스럽지만 **한 문장에 5초쯤 걸린다.** 그래서
 *   ① 같은 글은 두 번 만들지 않고 디스크에 저장해 둔다(질문 6개는 사실상 한 번만 만든다)
 *   ② 화면에서는 필요해지기 전에 미리 받아 둔다(src/lib/speech.js 의 prime)
 *
 * 응답은 그대로 재생할 수 있는 WAV(24kHz 16bit 모노)라 헤더를 붙일 필요가 없다.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { GoogleGenAI } from "@google/genai";

/**
 * 쓸 수 있는 목소리. **사람마다 다른 목소리를 쓰므로** 화면에서 골라 보낸다
 * (src/config/intro.js 의 voice). 목록에 없는 이름이 오면 기본값으로 떨어진다.
 *   남: Charon(차분) Puck(들뜬) Umbriel(느긋) Achird(친근)
 *   여: Sulafat(따뜻) Callirrhoe(편안) Vindemiatrix(부드러움) Leda(앳됨)
 */
export const TTS_VOICES = [
  "Charon",
  "Puck",
  "Umbriel",
  "Achird",
  "Sulafat",
  "Callirrhoe",
  "Vindemiatrix",
  "Leda",
];
export const DEFAULT_VOICE = "Sulafat";
/** 말투 지시. 글자는 그대로 읽히고 어조만 바뀐다. */
const TTS_STYLE = "따뜻하고 친근한 동네 어르신이 옆에서 말해 주듯이, 또박또박";
/** 스튜디오 품질 모델. 속도가 더 급하면 gemini-3.8-flash-lite-tts 로 바꾼다. */
const TTS_MODEL = "gemini-3.8-flash-tts";

const CACHE_DIR = path.join(process.cwd(), "data/tts");
/** 한 번에 읽어 줄 만한 길이. 넘기면 만들지 않는다(실수로 긴 글이 들어오는 것 방지). */
const MAX_CHARS = 400;

let client = null;
function genai() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY 가 없습니다.");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

function cacheFile(text, voice) {
  const key = crypto
    .createHash("sha1")
    .update(`${TTS_MODEL}|${voice}|${TTS_STYLE}|${text}`)
    .digest("hex");
  return path.join(CACHE_DIR, `${key}.wav`);
}

/** 화면에서 온 값은 믿지 않는다. 목록에 있는 이름만 쓴다. */
export function resolveVoice(name) {
  return TTS_VOICES.includes(name) ? name : DEFAULT_VOICE;
}

/**
 * 글을 읽은 WAV 를 돌려준다. 같은 글·같은 목소리는 디스크에서 바로 꺼낸다.
 *
 * @param {string} rawText
 * @param {string} [voiceName]
 * @returns {Promise<{audio: Buffer, cached: boolean}>}
 */
export async function synthesize(rawText, voiceName) {
  const voice = resolveVoice(voiceName);
  const text = String(rawText ?? "").trim();
  if (!text) throw new Error("읽을 글이 없습니다.");
  if (text.length > MAX_CHARS) throw new Error(`글이 너무 깁니다(${text.length}자).`);

  const file = cacheFile(text, voice);
  try {
    return { audio: await fs.readFile(file), cached: true };
  } catch {
    // 아직 만든 적이 없다.
  }

  const response = await genai().models.generateContent({
    model: TTS_MODEL,
    // 말투는 speechMetadata 로 준다. 글 안에 "친근하게 읽어줘" 라고 쓰면 그 말까지 읽는다.
    contents: [{ role: "user", parts: [{ text, speechMetadata: { style: TTS_STYLE } }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
        languageCode: "ko-KR",
      },
    },
  });

  const inline = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inline?.data) throw new Error("음성을 받지 못했습니다.");

  const audio = Buffer.from(inline.data, "base64");
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(file, audio);
  } catch (error) {
    // 저장에 실패해도 이번 재생은 그대로 내보낸다.
    console.warn("[tts] 캐시 저장 실패:", error?.message ?? error);
  }

  return { audio, cached: false };
}
