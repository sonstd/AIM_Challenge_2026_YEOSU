/**
 * 문장 분리 공용 모듈. 검증 레이어와 화면이 **같은 규칙**을 쓰도록 여기 한 곳에 둔다.
 *
 * 규칙 (CLAUDE.md §2-1)
 * - 구분자는 `.` `!` `?` 만. 쉼표는 구분자가 아니다.
 * - 숫자 사이의 점(1.5km)은 구분자가 아니다. 평가 시스템과 같은 방식이다.
 */

/** 문장 경계가 되는 종결 부호. 앞뒤가 모두 숫자인 점은 경계로 보지 않는다. */
const BOUNDARY = /(?<![0-9])[.!?]+|[.!?]+(?![0-9])/g;

/**
 * 종결 부호를 **그대로 붙인 채** 문장을 나눈다.
 *
 * 화면에 문장을 다시 그릴 때 쓴다. 조각을 공백으로 이어 붙이면 원문과 같아야 하므로
 * (제출 JSON과 화면 문장이 글자 단위로 같아야 한다) 부호를 떼지 않는다.
 *
 * @returns {string[]} 예: ["오동도는 동백섬이지라.", "붉은 동백이 섬을 덮는당께요."]
 */
export function splitSentenceParts(text) {
  const value = String(text ?? "");
  const parts = [];
  let start = 0;

  for (const match of value.matchAll(BOUNDARY)) {
    const end = match.index + match[0].length;
    parts.push(value.slice(start, end).trim());
    start = end;
  }

  const tail = value.slice(start).trim();
  if (tail) parts.push(tail);
  return parts.filter(Boolean);
}

/**
 * 평가 시스템과 동일한 문장 수 세기. 종결 부호를 떼고 빈 조각을 버린다.
 * **검증 레이어([4] 문장 수)는 반드시 이 함수를 쓴다.** 짧은 조각도 한 문장으로 센다
 * — 평가 쪽이 그렇게 세기 때문이다.
 */
export function splitSentences(text) {
  return splitSentenceParts(text)
    .map((part) => part.replace(/[.!?]+$/, "").trim())
    .filter(Boolean);
}

/** 이 길이 이하의 조각은 말풍선 하나로 세우지 않고 앞 문장에 붙인다. */
const MIN_DISPLAY_LENGTH = 5;

/**
 * 화면(대화 말풍선)용 분리.
 *
 * 평가용 분리와 달리 **5자 이하 조각은 독립된 말풍선으로 세우지 않는다.**
 * 다만 버리지는 않고 앞 문장 뒤에 그대로 이어 붙인다. 화면에 보이는 글자가
 * recommend_reason 원문과 달라지면 안 되기 때문이다.
 */
export function splitDisplaySentences(text) {
  const parts = splitSentenceParts(text);
  const merged = [];

  for (const part of parts) {
    const tooShort = part.replace(/[.!?]+$/, "").trim().length <= MIN_DISPLAY_LENGTH;
    if (tooShort && merged.length) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${part}`;
      continue;
    }
    merged.push(part);
  }

  // 첫 조각이 너무 짧아 합칠 앞 문장이 없으면 그대로 둔다(글자를 잃지 않는다).
  return merged;
}
