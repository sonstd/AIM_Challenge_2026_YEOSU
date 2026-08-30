import {
  ALLOWED_ANSWER_VALUES,
  PERSONALITY_QUESTIONS,
} from "@/config/questions";
import { NEUTRAL_THRESHOLD } from "@/lib/constants";
import {
  TRAVEL_TYPES,
  X_BAND_LABELS,
  Y_BAND_LABELS,
} from "@/config/travel-types";

/**
 * 성향 점수 계산. 서버·클라이언트 양쪽에서 같은 함수를 쓴다
 * (결과 화면은 클라이언트가, 추천 후보 선정은 서버가 계산한다).
 *
 * 응답 값은 -2.5 / -1.25 / +1.25 / +2.5 네 가지뿐이고 축당 4문항이므로
 * X, Y 모두 정확히 -10 ~ +10 범위에 들어온다.
 */

export const AXIS_MIN = -10;
export const AXIS_MAX = 10;

/** 성향 문항 slot 목록 (X1, Y1, X2, ... 순서) */
export const PERSONALITY_SLOTS = PERSONALITY_QUESTIONS.map((q) => q.slot);

const X_SLOTS = PERSONALITY_QUESTIONS.filter((q) => q.axis === "x").map(
  (q) => q.slot,
);
const Y_SLOTS = PERSONALITY_QUESTIONS.filter((q) => q.axis === "y").map(
  (q) => q.slot,
);

function sumSlots(answers, slots) {
  return slots.reduce((total, slot) => total + (answers?.[slot] ?? 0), 0);
}

/** 8문항에 모두, 허용된 값으로 답했는지. 결과 화면 진입 게이트로 쓴다. */
export function isPersonalityComplete(answers) {
  return PERSONALITY_SLOTS.every((slot) =>
    ALLOWED_ANSWER_VALUES.includes(answers?.[slot]),
  );
}

/** @returns {{x: number, y: number}} 각각 -10 ~ +10 */
export function computeAxisScores(answers) {
  return {
    x: sumSlots(answers, X_SLOTS),
    y: sumSlots(answers, Y_SLOTS),
  };
}

/**
 * 점수를 4구간 중 하나로 나눈다.
 * -10 ~ -5 → 1 / -5 ~ 0 → 2 / 0 ~ 5 → 3 / 5 ~ 10 → 4 (각 구간은 왼쪽 경계 포함)
 */
export function getBandIndex(score) {
  if (score < -5) return 1;
  if (score < 0) return 2;
  if (score < 5) return 3;
  return 4;
}

/** @returns {string} "X1Y1" ~ "X4Y4" */
export function getTypeId(x, y) {
  return `X${getBandIndex(x)}Y${getBandIndex(y)}`;
}

/** 그 축이 중립에 가까운가 (유형 이름보다 강도를 앞세워야 하는 구간) */
export function isNeutralAxis(score) {
  return Math.abs(score) < NEUTRAL_THRESHOLD;
}

/** 성향 강도 — 좌표 절댓값 기준 */
export function getIntensity(score) {
  const magnitude = Math.abs(score);
  if (magnitude < NEUTRAL_THRESHOLD) return { level: 0, label: "중립에 가까움" };
  if (magnitude < 5) return { level: 1, label: "약한 선호" };
  if (magnitude < 7.5) return { level: 2, label: "뚜렷한 선호" };
  return { level: 3, label: "매우 강한 선호" };
}

/**
 * 좌표에서 유형 전체 정보를 만든다.
 * 유형 이름·설명은 TEMP config(src/config/travel-types.js)에서 온다.
 */
export function resolveTravelType(x, y) {
  const typeId = getTypeId(x, y);
  const xBand = getBandIndex(x);
  const yBand = getBandIndex(y);

  return {
    typeId,
    x,
    y,
    xBand,
    yBand,
    xBandLabel: X_BAND_LABELS[xBand - 1],
    yBandLabel: Y_BAND_LABELS[yBand - 1],
    xIntensity: getIntensity(x),
    yIntensity: getIntensity(y),
    xNeutral: isNeutralAxis(x),
    yNeutral: isNeutralAxis(y),
    ...TRAVEL_TYPES[typeId],
  };
}
