import { introPhoto } from "@/config/intro";

/**
 * 대화형 결과 화면의 문구 설정. 화면 코드를 건드리지 않고 여기만 고치면 된다.
 *
 * 답변은 추천 이유(recommend_reason) 문장을 **그대로** 쓴다. 여기 있는 문구는
 * 질문·안내처럼 추천 이유가 아닌 부분뿐이다.
 */

/**
 * 답변하는 쪽 — 인트로에 나온 출연자 중 한 명이 그대로 이어서 말한다.
 * `image` 는 전신 사진이고, 말풍선 옆 동그란 프로필에는 얼굴만 잘라 쓴다.
 */
/** 말하는 사람의 목소리. 프로필이 박만수(male_01)라 남자 목소리를 쓴다. */
export const NARRATOR_VOICE = "Charon";

export const LOCAL_GUIDE = {
  name: "여수 토박이 박만수 회장",
  shortName: "박만수 회장",
  image: introPhoto("male_01"),
};

/**
 * 질문 풀. **순서가 곧 추천 이유 문장 순서**다.
 * 1문장(객관) → 2문장(분위기) → 3문장(활동) 구조에 대응한다.
 *
 * 질문은 외지에서 온 여행객의 말이라 **표준어로 쓴다.** 양쪽 다 사투리면
 * 토박이 말투의 대비가 사라진다.
 */
export const CHAT_QUESTIONS = [
  { id: "q1", text: "거기 어떤 데예요?" },
  { id: "q2", text: "가면 기분이 어때요?" },
  { id: "q3", text: "가서 뭐 하면 돼요?" },
];

/** 대화 시작 인사. {place} 는 장소 이름으로 바뀐다. */
export const GREETING_TEMPLATE = "{place} 궁금허요? 뭐든 물어보씨요.";

/** 사진 보기 버튼에 적히는 말. 누르면 사진이 크게 뜬다. */
export const PHOTO_LABEL = "사진 보기";

/** 1순위 대화가 끝난 뒤 카드 목록을 소개하는 말. */
export const CARD_INTRO = "이런 데도 있어라우.";

/** 카드에서 다른 장소를 고른 뒤 대화가 새로 시작될 때. */
export const SWITCH_TEMPLATE = "{place} 말이요? 거기도 좋지라.";

/**
 * 대화 타이밍(ms). 전시장 체감 속도를 여기서 조절한다.
 * 유휴 복귀(60초)는 화면 전체를 쥔 Wizard 가 관리한다(IDLE_RESET_MS).
 */
export const CHAT_TIMING = {
  /** 타이핑 인디케이터 노출 시간 — 이 범위에서 매번 무작위로 고른다. */
  typingMin: 1200,
  typingMax: 1800,
  /** 답변이 뜬 뒤 다음 질문 칩을 보여주기까지 */
  nextChipDelay: 600,
  /** 칩을 이만큼 두드리지 않으면 첫 번째 칩을 자동으로 고른다 */
  autoAdvance: 8000,
};
