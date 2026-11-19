/**
 * 설문 화면 문구. **토박이가 묻는 말투**로 쓴다.
 *
 * 문항의 개수·순서·응답값은 src/config/questions.js 가 그대로 갖고 있고,
 * 여기서는 **화면에 보이는 질문 문장만** 갈아 끼운다. 점수 계산과는 무관하다.
 *
 * 말투 기준은 추천 이유와 같다 — 어미 중심으로 바꾸고,
 * 허벌나게·거시기·워메 같은 과한 사투리 어휘는 쓰지 않는다.
 * 선택지(혼자·친구…)는 **여행객이 고르는 말이라 표준어 그대로 둔다.**
 * (조건 선택지는 서버 검증에도 쓰이므로 글자를 바꾸면 안 된다.)
 */

/*
 * 안내 캐릭터는 인트로에 선 여섯 명이 한 문항씩 맡는다(src/config/intro.js 의
 * INTRO_CAST). 따로 두던 토박이 일러스트는 더 쓰지 않는다.
 */

/* 시작 화면 문구는 연출과 함께 붙어 있어 src/config/intro.js 로 옮겼다. */

/** 조건 문항(questions.js 의 id) → 토박이 말투 질문. */
export const CONDITION_COPY = {
  companion: "뉘랑 같이 가신디요?",
  duration: "여수서 얼매나 머물다 가실라요?",
};

/** 성향 문항(questions.js 의 slot) → 토박이 말투 질문. */
export const PERSONALITY_COPY = {
  X1: "여수 딱 도착허믄 뭣부터 허고 싶으요?",
  Y1: "딱 한 군데만 간다믄 어디가 땡기요?",
  X2: "바다 앞에 서믄 어찌 보내는 편이요?",
  Y2: "걷는다믄 어떤 거리가 더 좋소?",
};

/** 단계 라벨. 진행률 옆에 붙는다. */
export const STEP_LABELS = {
  conditions: "여행 조건",
  personality: "여행 성향",
};

/** 결과를 불러오는 동안 보여줄 말. */
export const LOADING_LINES = [
  "여수 스무 군데를 쭉 훑어보는 중이요",
  "성향에 맞는 데를 추려 보는 중이요",
  "왜 좋은지 근거를 맞춰 보는 중이요",
];

/**
 * 문항 id(또는 slot)로 토박이 말투 질문을 찾는다.
 * 문구가 없으면 원래 질문을 그대로 쓴다(문항을 추가해도 화면이 깨지지 않는다).
 */
export function guideQuestion(key, fallback) {
  return CONDITION_COPY[key] ?? PERSONALITY_COPY[key] ?? fallback;
}
