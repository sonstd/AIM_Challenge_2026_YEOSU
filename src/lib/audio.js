/**
 * 배경음악 — **브라우저에서만 돈다.**
 *
 * 한 번에 한 곡만 틀고, 화면이 바뀌면 부드럽게 갈아 끼운다.
 *
 * 자동 재생 제약: 브라우저는 **사용자가 화면을 한 번 건드리기 전까지 소리를 막는다.**
 * 그래서 재생을 시도했다가 거절당하면 첫 터치를 기다렸다가 다시 튼다.
 * (전시 기기를 켜고 운영자가 한 번만 누르면 그 뒤로는 계속 나온다. 크롬을
 *  `--autoplay-policy=no-user-gesture-required` 로 띄우면 그 한 번도 필요 없다.)
 */

const TRACKS = {
  start: "/mp3/start.mp3",
  game: "/mp3/game.mp3",
};

/** 평소 음량과, 말소리가 나올 때 낮추는 음량. */
const VOLUME = 0.38;
const DUCKED = 0.1;
const FADE_MS = 400;

const players = new Map();
let currentName = null;
let ducked = false;
let muted = false;
let waitingForTouch = false;

function playerFor(name) {
  if (players.has(name)) return players.get(name);
  const audio = new Audio(TRACKS[name]);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0;
  players.set(name, audio);
  return audio;
}

function targetVolume() {
  if (muted) return 0;
  return ducked ? DUCKED : VOLUME;
}

/** 음량을 뚝 끊지 않고 조금씩 옮긴다. */
function fadeTo(audio, to, { stop = false } = {}) {
  const from = audio.volume;
  const started = performance.now();
  clearInterval(audio.__fade);
  audio.__fade = setInterval(() => {
    const t = Math.min(1, (performance.now() - started) / FADE_MS);
    audio.volume = Math.max(0, Math.min(1, from + (to - from) * t));
    if (t >= 1) {
      clearInterval(audio.__fade);
      if (stop) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
  }, 40);
}

/** 첫 터치를 기다렸다가 다시 튼다. 한 번만 걸어 둔다. */
function retryOnFirstTouch() {
  if (waitingForTouch || typeof window === "undefined") return;
  waitingForTouch = true;
  const retry = () => {
    waitingForTouch = false;
    window.removeEventListener("pointerdown", retry);
    window.removeEventListener("keydown", retry);
    if (currentName) playLoop(currentName);
  };
  window.addEventListener("pointerdown", retry, { once: true });
  window.addEventListener("keydown", retry, { once: true });
}

/**
 * 곡을 틀어 둔다. 이미 같은 곡이 돌고 있으면 아무 일도 하지 않는다.
 * @param {"start"|"game"} name
 */
export function playLoop(name) {
  if (typeof window === "undefined" || !TRACKS[name]) return;

  if (currentName && currentName !== name) stopLoop(currentName);
  currentName = name;

  const audio = playerFor(name);
  const play = audio.play();
  if (play?.catch) {
    play
      .then(() => fadeTo(audio, targetVolume()))
      .catch(() => retryOnFirstTouch()); // 아직 아무도 화면을 건드리지 않았다
  } else {
    fadeTo(audio, targetVolume());
  }
}

/** 이 곡이 돌고 있으면 멈춘다(다른 곡이 이미 올라왔으면 건드리지 않는다). */
export function stopLoop(name) {
  const audio = players.get(name);
  if (!audio) return;
  if (currentName === name) currentName = null;
  fadeTo(audio, 0, { stop: true });
}

/** 말소리가 나오는 동안 배경음악을 낮춘다. */
export function duckAudio(on) {
  ducked = on;
  const audio = currentName && players.get(currentName);
  if (audio) fadeTo(audio, targetVolume());
}

/** 소리 끄기/켜기. 꺼도 곡은 계속 돌아간다(다시 켜면 이어서 들린다). */
export function setMuted(value) {
  muted = value;
  const audio = currentName && players.get(currentName);
  if (audio) fadeTo(audio, targetVolume());
}

export function isMuted() {
  return muted;
}
