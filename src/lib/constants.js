/**
 * 대회 제출 규격 및 추천 파이프라인 전반에서 공유하는 상수.
 */

export const REGION_ID = "YEOSU";

/** 1단계: 동반 유형 (단일 선택) */
export const COMPANIONS = ["혼자", "친구", "연인·부부", "가족"];

/**
 * 2단계: 선호 테마 (다중 선택, 2~3개). places.json의 preference_tags 값의 부분집합이다.
 *
 * "아이와함께"·"로맨틱·커플"은 사용자가 직접 고르지 않는다. 1단계 동반 유형에서
 * 자연히 따라오는 성격이라, 대신 COMPANION_AUTO_TAGS 로 자동 가산한다.
 * (places.json의 preference_tags 값 자체는 그대로 둔다.)
 */
export const THEMES = [
  "자연·힐링",
  "액티비티",
  "사진·인생샷",
  "야경",
  "문화·역사",
  "맛집·미식",
];

export const MIN_THEMES = 2;
export const MAX_THEMES = 3;

/** 3단계: 동반 유형에 따라 달라지는 세부 질문 (선택 사항) */
export const DETAILS_BY_COMPANION = {
  혼자: {
    question: "이번 여행의 목적은?",
    options: ["쉼·리프레시", "사진 촬영", "새로운 경험"],
  },
  친구: {
    question: "몇 명이서?",
    options: ["둘이서", "여럿이서"],
  },
  "연인·부부": {
    question: "관계는?",
    options: ["연인", "신혼", "오래된 부부"],
  },
  가족: {
    question: "누구와?",
    options: ["어린 자녀", "청소년 자녀", "부모님"],
  },
};

/**
 * 동반 유형별 avoid_tags 감점표 (소프트 감점, 하드 필터 아님).
 * 혼자·친구는 감점 없음.
 */
export const AVOID_PENALTIES = {
  혼자: {},
  친구: {},
  "연인·부부": {
    노약자비추천: 0.5,
  },
  가족: {
    노약자비추천: 1,
    이동시간김: 1,
    장거리도보: 1,
    고소공포증비추천: 1,
  },
};

/** 이 세부사항이 선택되면 위 감점을 2배로 적용한다. */
export const PENALTY_DOUBLING_DETAIL = "어린 자녀";

/** themes[0](첫 번째로 고른 테마)과 매칭될 때 주는 가산점. */
export const PRIMARY_THEME_BONUS = 0.5;

/**
 * 동반 유형에서 자동으로 따라오는 선호 태그.
 * 사용자가 2단계에서 고르지 않아도, 해당 태그를 가진 장소에 가산점을 주고
 * matched_tags 에도 포함시킨다.
 */
export const COMPANION_AUTO_TAGS = {
  가족: "아이와함께",
  "연인·부부": "로맨틱·커플",
};

/** COMPANION_AUTO_TAGS 매칭 시 주는 가산점. */
export const COMPANION_AUTO_BONUS = 1;

/** preference_tags 1개 매칭당 가산점. */
export const TAG_MATCH_WEIGHT = 2;

/**
 * 배타 그룹: 성격이 거의 동일해 둘 다 상위에 올리면 추천이 중복으로 보이는 장소들.
 * 그룹 내에서는 점수가 가장 높은 한 곳만 후보로 남긴다.
 */
export const EXCLUSIVE_GROUPS = [["YEOSU_012", "YEOSU_013"]];

/** ② 후보 압축 단계 파라미터 */
export const CANDIDATE_LIMIT = 8;
export const MIN_CANDIDATES = 5;

/** ④ 검증 레이어 파라미터 */
export const MIN_RECOMMENDATIONS = 3;
export const MAX_RECOMMENDATIONS = 5;
export const MIN_SENTENCES = 2;
export const MAX_SENTENCES = 5;
export const MAX_AGENT_ATTEMPTS = 3;
