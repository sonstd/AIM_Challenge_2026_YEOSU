import {
  COPY_WARNING_THRESHOLD,
  MAX_RECOMMENDATIONS,
  MAX_SENTENCES,
  MIN_RECOMMENDATIONS,
  MIN_SENTENCES,
} from "@/lib/constants";

/**
 * 문장 분리 규칙: `.` `!` `?` 로만 나눈다.
 * 쉼표는 문장 구분자가 아니며, 빈 문자열은 제외한다.
 * 평가 시스템과 동일한 방식이어야 한다. (CLAUDE.md §2-1)
 */
export function splitSentences(text) {
  return String(text ?? "")
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/**
 * 소수점이 포함된 수치(예: 1.5km).
 * `.`이 문장 구분자로 처리되므로 한 문장이 두 조각으로 쪼개지고,
 * 앞 조각은 의미가 잘려 근거 지지를 받지 못한다. (CLAUDE.md §2-5)
 */
const DECIMAL_PATTERN = /\d+\.\d+/;

export function hasDecimalNumber(text) {
  return DECIMAL_PATTERN.test(String(text ?? ""));
}

/**
 * 인용부호. 원문 evidence에 없는 기호가 섞이면 임베딩 유사도가 희석된다.
 * 곧은 따옴표와 둥근 따옴표를 모두 본다. (CLAUDE.md §2-6)
 */
const QUOTE_PATTERN = /['"‘’“”]/;
const QUOTE_PATTERN_GLOBAL = /['"‘’“”]/g;

export function hasQuoteMark(text) {
  return QUOTE_PATTERN.test(String(text ?? ""));
}

/** 인용부호를 제거한다. 제거 후 생기는 중복 공백도 정리한다. */
export function stripQuoteMarks(text) {
  return String(text ?? "")
    .replace(QUOTE_PATTERN_GLOBAL, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** 한글·영숫자만 남긴 문자 bigram 집합 */
function bigrams(text) {
  const clean = String(text ?? "").replace(/[^가-힣a-zA-Z0-9]/g, "");
  const set = new Set();
  for (let i = 0; i < clean.length - 1; i++) set.add(clean.slice(i, i + 2));
  return set;
}

/**
 * 생성 문장이 근거 원문에 얼마나 그대로 담겨 있는가 (0~1).
 * 1에 가까울수록 원문을 옮겨 적은 것에 가깝다. (CLAUDE.md §3 [7])
 */
export function copyRatio(sentence, evidence) {
  const a = bigrams(sentence);
  const b = bigrams(evidence);
  if (!a.size) return 0;
  let hit = 0;
  for (const gram of a) if (b.has(gram)) hit++;
  return hit / a.size;
}

/**
 * ④ 검증 레이어 (CLAUDE.md §3)
 *
 * [1] 화이트리스트     → 실패 시 재호출
 * [2] place_id 중복    → 중복 제거
 * [3] 추천 수 정확히 3  → 실패 시 재호출
 * [4] 문장 수 2~5      → 실패 시 재호출
 * [5] 소수점 수치      → 실패 시 재호출 (경고로 넘기지 않는다)
 * [6] 인용부호         → 제거 후 통과
 * [7] 원문 복사        → 경고 로그
 *
 * @param {unknown} payload Agent가 반환한 JSON
 * @param {{
 *   whitelist: Set<string>,
 *   candidateIds?: Set<string>,
 *   evidenceById?: Map<string, string[]>,
 * }} options evidenceById 는 place_id → [evidence_text_1, 2, 3]
 */
export function validateAgentResponse(
  payload,
  { whitelist, candidateIds, evidenceById },
) {
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
    const rawReason = entry?.recommend_reason;

    // [1] 화이트리스트
    if (typeof placeId !== "string" || !whitelist.has(placeId)) {
      issues.push(`${label}: place_id "${placeId}" 는 허용된 장소가 아닙니다.`);
      continue;
    }
    // [2] 중복
    if (seen.has(placeId)) {
      issues.push(`${label}: place_id "${placeId}" 가 중복되었습니다.`);
      continue;
    }
    if (typeof rawReason !== "string" || !rawReason.trim()) {
      issues.push(`${label}: recommend_reason 이 비어 있습니다.`);
      continue;
    }

    // [6] 인용부호 — 재호출하지 않고 제거하고 통과시킨다.
    let reason = rawReason.trim();
    if (hasQuoteMark(reason)) {
      reason = stripQuoteMarks(reason);
      console.warn(`[validate] ${placeId}: 인용부호를 제거했습니다.`);
    }

    // [5] 소수점 수치 — 문장 파싱이 깨지므로 경고가 아니라 재생성 대상이다.
    if (hasDecimalNumber(reason)) {
      issues.push(
        `${label}: 추천 이유에 소수점 수치가 있습니다. ` +
          `마침표가 문장 구분자로 처리되므로 수치를 빼거나 정수로 바꿔 다시 작성하세요 — ${reason}`,
      );
      continue;
    }

    // [4] 문장 수
    const sentences = splitSentences(reason);
    if (sentences.length < MIN_SENTENCES || sentences.length > MAX_SENTENCES) {
      issues.push(
        `${label}: 추천 이유가 ${sentences.length}문장입니다. ` +
          `${MIN_SENTENCES}~${MAX_SENTENCES}문장이어야 합니다.`,
      );
      continue;
    }

    // [7] 원문 복사 — 경고만 남기고 통과시킨다.
    const evidences = evidenceById?.get(placeId);
    if (evidences) {
      sentences.forEach((sentence, order) => {
        const source = evidences[order];
        if (!source) return;
        const ratio = copyRatio(sentence, source);
        if (ratio >= COPY_WARNING_THRESHOLD) {
          console.warn(
            `[validate] ${placeId}: ${order + 1}문장이 evidence_text_${order + 1} 와 ` +
              `${Math.round(ratio * 100)}% 일치합니다(원문 복사 의심) — ${sentence}`,
          );
        }
      });
    }

    if (candidateIds && !candidateIds.has(placeId)) {
      console.warn(
        `[validate] ${placeId}: 후보 목록에 없는 장소를 Agent가 선택했습니다.`,
      );
    }

    seen.add(placeId);
    items.push({ place_id: placeId, recommend_reason: reason });
  }

  // [3] 추천 수
  if (items.length < MIN_RECOMMENDATIONS || items.length > MAX_RECOMMENDATIONS) {
    issues.push(
      `추천 장소가 ${items.length}곳입니다. ` +
        (MIN_RECOMMENDATIONS === MAX_RECOMMENDATIONS
          ? `정확히 ${MIN_RECOMMENDATIONS}곳이어야 합니다.`
          : `${MIN_RECOMMENDATIONS}~${MAX_RECOMMENDATIONS}곳이어야 합니다.`),
    );
  }

  return { ok: issues.length === 0, items, issues };
}
