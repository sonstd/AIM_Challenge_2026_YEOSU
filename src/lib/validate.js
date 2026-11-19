import {
  MAX_RECOMMENDATIONS,
  MAX_SENTENCES,
  MIN_RECOMMENDATIONS,
  MIN_SENTENCES,
} from "@/lib/constants";
// 문장 분리는 화면과 검증이 같은 규칙을 써야 한다. 공용 모듈 한 곳에만 둔다.
import { splitSentences } from "@/lib/sentences";

export { splitSentences };

/**
 * 인용부호. 원문 evidence에 없는 기호가 섞이면 임베딩 유사도가 희석된다.
 * 곧은 따옴표와 둥근 따옴표를 모두 본다.
 */
const QUOTE_PATTERN = /['"‘’“”]/;

export function hasQuoteMark(text) {
  return QUOTE_PATTERN.test(String(text ?? ""));
}

/**
 * [8] 과한 사투리 어휘. 어투는 친근한 구어체까지만 허용하고,
 * 비속어에 가깝거나 희화화로 읽히는 표현은 코드로 막는다. (Agent 규칙 15-2)
 */
const HEAVY_DIALECT_WORDS = ["허벌나게", "거시기", "워메", "그라제", "아따"];

export function findHeavyDialectWords(text) {
  const value = String(text ?? "");
  return HEAVY_DIALECT_WORDS.filter((word) => value.includes(word));
}

/**
 * [9] 종결 어미. 문장 끝 두 글자로 본다(지라 / 께요 / 라우 …).
 * 세 문장이 모두 같은 어미로 끝나면 읽을 때 단조로워진다. (Agent 규칙 15-3)
 */
export function endingOf(sentence) {
  return String(sentence ?? "")
    .replace(/[\s.!?]+$/, "")
    .slice(-2);
}

export function hasUniformEndings(sentences) {
  if (sentences.length < 2) return false;
  const endings = sentences.map(endingOf);
  return endings.every((ending) => ending && ending === endings[0]);
}

/**
 * ④ 검증 레이어
 *
 * Agent 응답을 항목 단위로 검증한다. 통과한 항목만 items에 담기고,
 * 실패 사유는 issues에 쌓인다. 호출부는 issues가 비어 있고 개수가 규격대로일 때만
 * ok === true 를 받는다(그 외에는 재호출 대상).
 *
 * [1] 화이트리스트 / [2] 중복 / [3] 개수 / [4] 문장 수  → 실패 시 재호출
 * [6] 인용부호                                        → 경고 로그
 * [8] 과한 사투리 어휘                                  → 실패 시 재호출
 * [9] 세 문장의 종결 어미가 모두 같은가                   → 경고 로그
 *
 * @param {unknown} payload Agent가 반환한 JSON
 * @param {{ whitelist: Set<string>, candidateIds?: Set<string> }} options
 */
export function validateAgentResponse(payload, { whitelist, candidateIds }) {
  const issues = [];
  const items = [];
  const seen = new Set();

  const list = Array.isArray(payload?.recommendations)
    ? payload.recommendations
    : null;

  if (!list) {
    return {
      ok: false,
      items,
      issues: ["응답에 recommendations 배열이 없습니다."],
    };
  }

  for (const [index, entry] of list.entries()) {
    const label = `recommendations[${index}]`;
    const placeId = entry?.place_id;
    const reason = entry?.recommend_reason;

    if (typeof placeId !== "string" || !whitelist.has(placeId)) {
      issues.push(`${label}: place_id "${placeId}" 는 허용된 장소가 아닙니다.`);
      continue;
    }
    if (seen.has(placeId)) {
      issues.push(`${label}: place_id "${placeId}" 가 중복되었습니다.`);
      continue;
    }
    if (typeof reason !== "string" || !reason.trim()) {
      issues.push(`${label}: recommend_reason 이 비어 있습니다.`);
      continue;
    }

    const sentences = splitSentences(reason);
    if (sentences.length < MIN_SENTENCES || sentences.length > MAX_SENTENCES) {
      issues.push(
        `${label}: 추천 이유가 ${sentences.length}문장입니다. ` +
          `${MIN_SENTENCES}~${MAX_SENTENCES}문장이어야 합니다.`,
      );
      continue;
    }

    // [8] 과한 사투리는 재호출 대상이다. 어투는 바꾸되 품위는 지켜야 한다.
    const heavyWords = findHeavyDialectWords(reason);
    if (heavyWords.length) {
      issues.push(
        `${label}: 과한 사투리 표현(${heavyWords.join(", ")})이 있습니다. ` +
          `어미 중심의 친근한 구어체로 다시 쓰세요.`,
      );
      continue;
    }

    // [9] 세 문장이 같은 어미로 끝나는지는 경고만 남긴다(규칙 15-3).
    if (hasUniformEndings(sentences)) {
      console.warn(
        `[validate] ${placeId}: 문장 종결 어미가 모두 "${endingOf(sentences[0])}" 로 같습니다 — ${reason}`,
      );
    }

    // 아래 두 가지는 경고일 뿐 항목을 탈락시키지 않는다.
    if (hasQuoteMark(reason)) {
      console.warn(
        `[validate] ${placeId}: 추천 이유에 인용부호가 포함되어 있습니다 — ${reason}`,
      );
    }
    if (candidateIds && !candidateIds.has(placeId)) {
      console.warn(
        `[validate] ${placeId}: 후보 목록에 없는 장소를 Agent가 선택했습니다.`,
      );
    }

    seen.add(placeId);
    items.push({ place_id: placeId, recommend_reason: reason.trim() });
  }

  if (items.length < MIN_RECOMMENDATIONS || items.length > MAX_RECOMMENDATIONS) {
    const expected =
      MIN_RECOMMENDATIONS === MAX_RECOMMENDATIONS
        ? `정확히 ${MIN_RECOMMENDATIONS}곳`
        : `${MIN_RECOMMENDATIONS}~${MAX_RECOMMENDATIONS}곳`;
    issues.push(`추천 장소가 ${items.length}곳입니다. ${expected}이어야 합니다.`);
  }

  return { ok: issues.length === 0, items, issues };
}
