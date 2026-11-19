/**
 * 인트로(어트랙트) 화면 설정.
 *
 * 여섯 명이 계단처럼 서서 뒤를 보고 있다가, 앞에서부터 차례로 고개를 돌린다.
 * 돌아보는 순간 조명이 켜지고 역광이 번지며 타이틀과 시작 버튼이 뜬다.
 * 화면 코드는 건드리지 말고 **여기 값만** 고치면 된다.
 */

/**
 * 배열 순서 = 계단 순서(0번이 맨 앞·맨 아래).
 * frames 는 고개를 돌릴 때 차례로 넘어가는 사진이다(뒤 → … → 앞).
 * 사진은 public/images/intro/{id}_{frame}.webp 에 있다.
 * 3/4 각도 같은 사진이 생기면 frames 에 이름만 더하면 된다.
 *
 * `voice` 는 이 사람이 말할 때 쓰는 Gemini TTS 목소리다.
 * 남자 사람은 남자 목소리, 여자 사람은 여자 목소리로 맞춰 두었다.
 *   남: Charon(차분·설명조) / Puck(들뜬) / Umbriel(느긋한)
 *   여: Sulafat(따뜻한) / Callirrhoe(편안한) / Vindemiatrix(부드러운)
 */
export const INTRO_CHARACTERS = [
  { id: "male_03", voice: "Umbriel", name: "한기철", ar: 0.5839, frames: ["back", "side", "front"] },
  { id: "female_03", voice: "Vindemiatrix", name: "백설희", ar: 0.5769, frames: ["back", "side", "front"] },
  { id: "male_01", voice: "Charon", name: "박만수", ar: 0.5937, frames: ["back", "side", "front"] },
  { id: "female_02", voice: "Callirrhoe", name: "문지혜", ar: 0.5646, frames: ["back", "side", "front"] },
  { id: "male_02", voice: "Puck", name: "정상길", ar: 0.5697, frames: ["back", "side", "front"] },
  { id: "female_01", voice: "Sulafat", name: "김말순", ar: 0.5965, frames: ["back", "side", "front"] },
];

/** 계단 대열. 단위는 무대 크기 대비 %. */
export const INTRO_LAYOUT = {
  cx0: 15,
  dx: 14,
  top0: 24.5,
  rise: 3.6,
  h0: 128,
  depth: 0.965,
};

/** 타이밍(ms). 전시장 체감 속도를 여기서 조절한다. */
export const INTRO_TIMING = {
  firstHold: 1500, // 처음 뒤돌아 서 있는 시간
  frame: 210, // 사진 한 장 → 다음 장 (클수록 천천히 돈다)
  jitter: 70, // together 일 때 사람마다 어긋나는 정도
  stagger: 150, // 파도처럼 돌 때 사람 간격
  frontHold: 4600, // 앞을 본 채로 유지
  backHold: 1300, // 다시 뒤돈 뒤 대기
};

/** 도는 방식: frontToBack(앞에서 뒤로) | backToFront | together */
export const INTRO_ORDER = "frontToBack";
/** 되돌아가며 계속 반복할지 */
export const INTRO_LOOP = true;
/** 옆모습이 바라보는 쪽 (-1 왼쪽, +1 오른쪽) */
export const INTRO_SIDE_FACES = -1;

/** 파일 id(male_01 …)로 출연자를 찾는다. */
export function introCharacter(fileId) {
  return INTRO_CHARACTERS.find((character) => character.id === fileId) ?? null;
}

/** 출연자 사진 경로. frame 은 back / side / front. */
export function introPhoto(id, frame = "front") {
  return `/images/intro/${id}_${frame}.webp`;
}

/**
 * 설문에서 문항을 하나씩 맡는 출연 순서 — **인트로에 선 순서 그대로**다.
 * 인트로에서 맨 앞에 선 사람이 첫 질문을 던진다.
 */
export const INTRO_CAST = INTRO_CHARACTERS.map((character) => ({
  ...character,
  photo: introPhoto(character.id),
}));

/** 화면 문구. title 은 줄 단위다. */
export const INTRO_TEXT = {
  title: ["니는 어떤", "여수 스타일인디?"],
  sub: "니 여행 취향, 우리가 딱 골라줄랑께!",
  start: "TEST",
};
