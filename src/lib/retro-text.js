/**
 * 인트로 타이틀에 쓰는 무지개 레트로 글자를 SVG 로 만든다.
 *
 * 인트로와 본편이 **같은 글자**를 쓰도록 생성기를 여기 한 곳에 둔다.
 * 글자 폭을 재야 해서 브라우저에서만 쓸 수 있고, IntroBlack 폰트가 로드된 뒤에
 * 불러야 폭이 맞는다(그 전에 부르면 대체 글꼴 폭으로 계산된다).
 */

let sequence = 0;

/**
 * @param {string[]} lines 줄 단위 문자열
 * @returns {string} <svg> 마크업
 */
export function retroTextSvg(lines, { size = 100, lineH = 1.1, spacing = -3 } = {}) {
  const id = `rt${++sequence}`;
  const pad = 34;

  const measure = document.createElement("canvas").getContext("2d");
  measure.font = `900 ${size}px IntroBlack`;
  const widths = lines.map(
    (line) => measure.measureText(line).width + spacing * (line.length - 1),
  );
  const W = Math.ceil(Math.max(...widths) + pad * 2);
  const H = Math.ceil(lines.length * size * lineH + pad * 2 - size * (lineH - 1));

  const font = `font-family="IntroBlack, sans-serif" font-weight="900" font-size="${size}" letter-spacing="${spacing}"`;
  const row = (line, i, attrs) =>
    `<text x="${pad}" y="${pad + size * 0.86 + i * size * lineH}" ${font} ${attrs}>${escapeText(line)}</text>`;
  const layer = (attrs) => lines.map((line, i) => row(line, i, attrs)).join("");

  // 같은 글자를 다섯 겹으로 겹쳐 그리므로 읽어 주는 기기에는 숨긴다(바깥 span 이 이름을 갖는다).
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="${id}r" gradientUnits="userSpaceOnUse" x1="${pad}" y1="0" x2="${W - pad}" y2="${size * 0.35}">
        <stop offset="0" stop-color="#ff2d2d"/><stop offset=".15" stop-color="#ff9a1f"/>
        <stop offset=".3" stop-color="#ffe83a"/><stop offset=".45" stop-color="#3fe05c"/>
        <stop offset=".6" stop-color="#1fd3ff"/><stop offset=".75" stop-color="#3a6cff"/>
        <stop offset=".88" stop-color="#b44cff"/><stop offset="1" stop-color="#ff3fb2"/>
      </linearGradient>
      <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".42" stop-color="#fff" stop-opacity=".12"/>
        <stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/>
      </linearGradient>
      <filter id="${id}f" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="${size * 0.09}"/></filter>
    </defs>
    <g filter="url(#${id}f)" opacity=".85">${layer(`fill="none" stroke="url(#${id}r)" stroke-width="${size * 0.36}" stroke-linejoin="round"`)}</g>
    ${layer(`fill="#14112a" stroke="#14112a" stroke-width="${size * 0.27}" stroke-linejoin="round"`)}
    ${layer(`fill="#fff" stroke="#fff" stroke-width="${size * 0.16}" stroke-linejoin="round"`)}
    ${layer(`fill="url(#${id}r)"`)}
    ${layer(`fill="url(#${id}g)"`)}
  </svg>`;
}

/** 장소 이름·유형 이름이 그대로 들어오므로 마크업으로 샐 수 있는 글자를 막는다. */
function escapeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** IntroBlack 이 준비될 때까지 기다린다. 폰트가 없으면 조용히 넘어간다. */
export function waitForRetroFont() {
  return document.fonts?.load("900 100px IntroBlack") ?? Promise.resolve();
}
