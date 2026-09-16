/**
 * 대회 제출 규격 및 추천 파이프라인 전반에서 공유하는 상수.
 *
 * 설문 문항 자체는 src/config/questions.js, 유형 이름은 src/config/travel-types.js 에 있다.
 * 여기에는 "점수를 어떻게 매길지"에 대한 값만 둔다.
 */

export const REGION_ID = "YEOSU";

/**
 * 추천 개수. 서비스 사양이 "맞춤 추천 BEST 3"으로 고정이므로
 * 검증 [3]도 정확히 이 개수만 통과시킨다. (CLAUDE.md §3 [3], §5)
 */
export const TARGET_RECOMMENDATIONS = 3;

/**
 * 동반 유형별 avoid_tags 감점표. 0~100 매칭 점수에서 빼는 점수다.
 * 혼자·친구는 감점 없음.
 */
export const AVOID_PENALTIES = {
  혼자: {},
  친구: {},
  연인: {
    노약자비추천: 3,
  },
  가족: {
    노약자비추천: 6,
    이동시간김: 6,
    장거리도보: 6,
    고소공포증비추천: 6,
  },
};

/** 여행 기간이 짧을수록 멀리 나가는 코스를 깎는다. */
export const DURATION_PENALTIES = {
  반나절: { 이동시간김: 12, 간조시간대만가능: 4 },
  당일치기: { 이동시간김: 6 },
  "1박 2일": {},
  "2박 3일 이상": {},
};

/** 이동 수단이 제한적이면 접근성이 나쁜 곳을 깎는다. */
export const TRANSPORT_PENALTIES = {
  "도보 + 대중교통": { 이동시간김: 6, 장거리도보: 3 },
  자가용: {},
  렌터카: {},
  "아직 정하지 않았다": {},
};

/**
 * 동반 유형에서 자동으로 따라오는 선호 태그.
 * 해당 태그를 가진 장소에 가산점을 주고 matched_tags 에도 포함시킨다.
 */
export const COMPANION_AUTO_TAGS = {
  가족: "아이와함께",
  연인: "로맨틱·커플",
};

export const COMPANION_AUTO_BONUS = 4;

/**
 * 이 값보다 절댓값이 작으면 그 축은 "중립에 가까움"으로 본다.
 * (personality.js 의 성향 강도 첫 구간과 같은 기준)
 *
 * 응답값이 ±1.25 / ±2.5 네 개의 합이라 축 합계가 0 부근에 몰린다.
 * 실제로 한 축이 구간 경계(-5, 0, +5)에 정확히 떨어질 확률이 27.3%,
 * 적어도 한 축이 경계일 확률이 47.2%다. 경계에 걸린 사용자에게
 * 한쪽 성향 태그만 매칭 대상으로 삼으면 근거 없이 태그가 잘려 나간다.
 */
export const NEUTRAL_THRESHOLD = 2.5;

/**
 * matched_tags 를 만들 때 쓰는 축별 성향 태그.
 * 사용자가 기운 쪽 태그를 쓰되, 중립에 가까우면 양쪽을 모두 인정한다.
 */
export const AXIS_AFFINITY_TAGS = {
  x: {
    negative: ["자연·힐링"],
    positive: ["액티비티"],
  },
  y: {
    negative: ["문화·역사"],
    positive: ["야경", "맛집·미식", "사진·인생샷"],
  },
};

/** ② 후보 압축 단계 파라미터 */
export const CANDIDATE_LIMIT = 8;
export const MIN_CANDIDATES = 5;

/**
 * 배타 그룹: 성격이 거의 동일해 둘 다 상위에 올리면 추천이 중복으로 보이는 장소들.
 * 그룹 내에서는 점수가 가장 높은 한 곳만 후보로 남긴다.
 */
export const EXCLUSIVE_GROUPS = [["YEOSU_012", "YEOSU_013"]];

/**
 * ④ 검증 [7] 원문 복사 경고 기준 (CLAUDE.md §3).
 * 생성 문장과 대응 evidence_text의 문자 일치율이 이 값 이상이면 경고만 남긴다.
 * 자동 재생성까지는 하지 않고 제출 전 육안 확인 대상으로 삼는다.
 */
export const COPY_WARNING_THRESHOLD = 0.8;

/**
 * ④ 검증 레이어 파라미터
 * 추천 수는 하한·상한 모두 TARGET_RECOMMENDATIONS(3)에 묶는다. 예전에는 3~5를 허용해서
 * Agent가 4~5곳을 돌려줘도 통과했다.
 */
export const MIN_RECOMMENDATIONS = TARGET_RECOMMENDATIONS;
export const MAX_RECOMMENDATIONS = TARGET_RECOMMENDATIONS;
export const MIN_SENTENCES = 2;
export const MAX_SENTENCES = 5;
export const MAX_AGENT_ATTEMPTS = 3;
