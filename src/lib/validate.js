import {
  MAX_RECOMMENDATIONS,
  MAX_SENTENCES,
  MIN_RECOMMENDATIONS,
  MIN_SENTENCES,
} from "@/lib/constants";

/**
 * 문장 분리 규칙: `.` `!` `?` 로만 나눈다.
 * 쉼표는 문장 구분자가 아니며, 빈 문자열은 제외한다.
 */
export function splitSentences(text) {
  return String(text ?? "")
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** 소수점이 포함된 수치(예: 1.5km). 마침표가 문장 구분자로 오인된다. */
const DECIMAL_PATTERN = /\d+\.\d+/;

export function hasDecimalNumber(text) {
  return DECIMAL_PATTERN.test(String(text ?? ""));
}

/**
 * 인용부호. 원문 evidence에 없는 기호가 섞이면 임베딩 유사도가 희석된다.
 * 곧은 따옴표와 둥근 따옴표를 모두 본다.
 */
const QUOTE_PATTERN = /['"‘’“”]/;

export function hasQuoteMark(text) {
  return QUOTE_PATTERN.test(String(text ?? ""));
}

/**
 * ④ 검증 레이어
 *
 * Agent 응답을 항목 단위로 검증한다. 통과한 항목만 items에 담기고,
 * 실패 사유는 issues에 쌓인다. 호출부는 issues가 비어 있고 개수가 3~5개일 때만
 * ok === true 를 받는다(그 외에는 재호출 대상).
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

    // 아래 세 가지는 경고일 뿐 항목을 탈락시키지 않는다.
    if (hasDecimalNumber(reason)) {
      console.warn(
        `[validate] ${placeId}: 추천 이유에 소수점 수치가 포함되어 있습니다 — ${reason}`,
      );
    }
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
    issues.push(
      `추천 장소가 ${items.length}곳입니다. ` +
        `${MIN_RECOMMENDATIONS}~${MAX_RECOMMENDATIONS}곳이어야 합니다.`,
    );
  }

  return { ok: issues.length === 0, items, issues };
}
