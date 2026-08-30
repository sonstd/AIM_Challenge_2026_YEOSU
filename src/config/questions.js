/**
 * 설문 config. 문항 텍스트를 바꾸고 싶으면 이 파일만 고치면 된다.
 *
 * 1) 여행 조건 4문항 — X/Y 점수에 절대 반영하지 않는다. 후보 감점과 어조에만 쓴다.
 * 2) 여행 성향 8문항 — X1 → Y1 → X2 → Y2 → X3 → Y3 → X4 → Y4 순서로 노출한다.
 */

export const CONDITION_QUESTIONS = [
  {
    id: "companion",
    question: "누구와 함께 여행하나요?",
    options: ["혼자", "친구", "연인", "가족"],
  },
  {
    id: "duration",
    question: "여수에서 얼마나 여행하나요?",
    options: ["반나절", "당일치기", "1박 2일", "2박 3일 이상"],
  },
  {
    id: "budget",
    question: "여행 경비는 어떻게 쓰는 편인가요?",
    options: [
      "최대한 알뜰하게",
      "적당히 쓰면서 즐긴다",
      "특별한 경험이라면 비용을 더 써도 된다",
    ],
  },
  {
    id: "transport",
    question: "여수에서는 어떻게 이동할 예정인가요?",
    options: ["도보 + 대중교통", "자가용", "렌터카", "아직 정하지 않았다"],
  },
];

/**
 * 4단계 응답. A쪽이 음수, B쪽이 양수다.
 * 사용자 화면에는 label만 보여주고 value(숫자)는 절대 노출하지 않는다.
 */
export const ANSWER_LEVELS = [
  { value: -2.5, label: "A가 훨씬 좋아요" },
  { value: -1.25, label: "A가 조금 더 좋아요" },
  { value: 1.25, label: "B가 조금 더 좋아요" },
  { value: 2.5, label: "B가 훨씬 좋아요" },
];

/** 허용되는 응답 값. 검증에 쓴다. */
export const ALLOWED_ANSWER_VALUES = ANSWER_LEVELS.map((level) => level.value);

/**
 * 성향 8문항. slot 은 X1~X4 / Y1~Y4 이고 배열 순서가 곧 노출 순서다.
 * A(음수) = 자연·힐링 / 한적·로컬, B(양수) = 액티비티·체험 / 핫플·데이트
 */
export const PERSONALITY_QUESTIONS = [
  {
    slot: "X1",
    axis: "x",
    question: "여행지에 도착했다. 가장 먼저 하고 싶은 것은?",
    a: { emoji: "🏞️", text: "좋은 풍경부터 천천히 둘러본다." },
    b: { emoji: "🎢", text: "여기서만 할 수 있는 체험부터 찾아본다." },
  },
  {
    slot: "Y1",
    axis: "y",
    question: "여행지를 하나만 고른다면?",
    a: { emoji: "🤫", text: "관광객이 적은 숨은 장소" },
    b: { emoji: "🎡", text: "사람들이 많이 찾는 대표적인 명소" },
  },
  {
    slot: "X2",
    axis: "x",
    question: "바다를 만났을 때 나는?",
    a: { emoji: "🌊", text: "바다를 보면서 걷거나 쉬는 게 좋다." },
    b: { emoji: "🛶", text: "보기만 하기보다 직접 할 수 있는 활동을 찾아본다." },
  },
  {
    slot: "Y2",
    axis: "y",
    question: "여행 중 더 끌리는 거리는?",
    a: { emoji: "🏘️", text: "조용한 골목과 현지 분위기가 느껴지는 곳" },
    b: { emoji: "🎪", text: "볼거리와 사람들이 모여 활기찬 곳" },
  },
  {
    slot: "X3",
    axis: "x",
    question: "여행 중 하루가 통째로 비었다면?",
    a: { emoji: "☕", text: "예쁜 풍경을 보면서 여유롭게 보내고 싶다." },
    b: { emoji: "🧗", text: "새로운 장소와 체험으로 하루를 채우고 싶다." },
  },
  {
    slot: "Y3",
    axis: "y",
    question: "여행 사진을 한 장 남긴다면?",
    a: { emoji: "🍀", text: "우연히 발견한 나만 알고 싶은 장소" },
    b: { emoji: "📸", text: "여수에 왔다면 꼭 남기고 싶은 대표 명소" },
  },
  {
    slot: "X4",
    axis: "x",
    question: "여행이 끝난 뒤 가장 기억에 남았으면 하는 것은?",
    a: { emoji: "🌅", text: "그곳에서 본 풍경과 느꼈던 여유" },
    b: { emoji: "🏄", text: "직접 해본 특별한 경험과 활동" },
  },
  {
    slot: "Y4",
    axis: "y",
    question: "저녁 여행을 마무리한다면?",
    a: { emoji: "🌙", text: "조용한 곳에서 천천히 여수의 분위기를 느낀다." },
    b: { emoji: "🌃", text: "야경이나 볼거리가 있는 곳에서 여행 기분을 즐긴다." },
  },
];
