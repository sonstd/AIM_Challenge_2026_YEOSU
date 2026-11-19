/**
 * 설문 config. 문항 텍스트를 바꾸고 싶으면 이 파일만 고치면 된다.
 *
 * 1) 여행 조건 2문항 — X/Y 점수에 절대 반영하지 않는다. 후보 감점과 어조에만 쓴다.
 * 2) 여행 성향 4문항 — X1 → Y1 → X2 → Y2 순서로 노출한다.
 *
 * 문항이 길어 지루하다는 피드백 때문에 조건 4문항·성향 8문항에서 줄였다.
 * 뺀 문항(경비·이동수단, X3·Y3·X4·Y4)은 git 이력에 남아 있다.
 */

/**
 * 조건 문항. `icons` 는 선택지와 같은 순서의 그림 이름이다(화면 표시용).
 * **선택지 글자는 서버 검증에도 쓰이므로 바꾸지 않는다.**
 */
export const CONDITION_QUESTIONS = [
  {
    id: "companion",
    question: "누구와 함께 여행하나요?",
    options: ["혼자", "친구", "연인", "가족"],
    icons: ["alone", "friends", "couple", "family"],
  },
  {
    id: "duration",
    question: "여수에서 얼마나 여행하나요?",
    options: ["반나절", "당일치기", "1박 2일", "2박 3일 이상"],
    icons: ["half-day", "one-day", "one-night", "many-nights"],
  },
];

/**
 * 4단계 응답. A쪽이 음수, B쪽이 양수다.
 * 사용자 화면에는 글자만 보여주고 value(숫자)는 절대 노출하지 않는다.
 * `short` 는 선택지 사진 안에 붙는 짧은 말이다(어느 쪽인지는 사진이 말해 준다).
 *
 * 축당 문항이 4개에서 2개로 줄었으므로 값을 두 배로 키웠다.
 * 2문항 × ±5 = ±10 이라 X/Y 범위와 16유형 구간, 장소 좌표를 그대로 쓸 수 있다.
 */
export const ANSWER_LEVELS = [
  { value: -5, label: "A가 훨씬 좋아요", short: "훨씬" },
  { value: -2.5, label: "A가 조금 더 좋아요", short: "조금 더" },
  { value: 2.5, label: "B가 조금 더 좋아요", short: "조금 더" },
  { value: 5, label: "B가 훨씬 좋아요", short: "훨씬" },
];

/** 허용되는 응답 값. 검증에 쓴다. */
export const ALLOWED_ANSWER_VALUES = ANSWER_LEVELS.map((level) => level.value);

/**
 * 성향 4문항. slot 은 X1·X2 / Y1·Y2 이고 배열 순서가 곧 노출 순서다.
 * A(음수) = 자연·힐링 / 한적·로컬, B(양수) = 액티비티·체험 / 핫플·데이트
 *
 * `image` 는 그 선택지를 대표하는 **실제 여수 사진**이다(글만 있으면 지루하고,
 * 고르는 동안 여행지를 미리 보여 주는 효과도 있다). 점수와는 무관하므로
 * 더 어울리는 사진이 있으면 경로만 바꾸면 된다.
 */
export const PERSONALITY_QUESTIONS = [
  {
    slot: "X1",
    axis: "x",
    question: "여행지에 도착했다. 가장 먼저 하고 싶은 것은?",
    a: { image: "/images/places/8.png", imageAlt: "무술목해변", text: "좋은 풍경부터 천천히 둘러본다." },
    b: { image: "/images/places/2.png", imageAlt: "여수해상케이블카", text: "여기서만 할 수 있는 체험부터 찾아본다." },
  },
  {
    slot: "Y1",
    axis: "y",
    question: "여행지를 하나만 고른다면?",
    a: { image: "/images/places/18.png", imageAlt: "사도", text: "관광객이 적은 숨은 장소" },
    b: { image: "/images/places/1.png", imageAlt: "오동도", text: "사람들이 많이 찾는 대표적인 명소" },
  },
  {
    slot: "X2",
    axis: "x",
    question: "바다를 만났을 때 나는?",
    a: { image: "/images/places/9.png", imageAlt: "방죽포해수욕장", text: "바다를 보면서 걷거나 쉬는 게 좋다." },
    b: { image: "/images/places/20.png", imageAlt: "웅천친수공원", text: "보기만 하기보다 직접 할 수 있는 활동을 찾아본다." },
  },
  {
    slot: "Y2",
    axis: "y",
    question: "여행 중 더 끌리는 거리는?",
    a: { image: "/images/places/14.png", imageAlt: "고소동 벽화마을", text: "조용한 골목과 현지 분위기가 느껴지는 곳" },
    b: { image: "/images/places/12.png", imageAlt: "여수해양공원", text: "볼거리와 사람들이 모여 활기찬 곳" },
  },
];
