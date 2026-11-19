/**
 * 대기 게임 문구. 화면 코드를 건드리지 않고 여기만 고치면 된다.
 * 말투는 설문·대화 화면과 같은 토박이 구어체로 맞춘다.
 */

/** 선택 화면 */
export const SELECT_COPY = {
  title: "미리 한번 가 보까요",
  lead: "어디로 갈지, 누구랑 갈지 골라 보씨요. 영상 만드는 동안 심심치 않게 놀 것도 있어라우.",
  placeLabel: "어디로 가 볼라요?",
  characterLabel: "누구랑 같이 갈라요?",
  startLabel: "시작하기",
  startHint: "갈 데하고 사람을 먼저 골라 주씨요",
  backLabel: "← 추천 결과로",
};

/** 게임 화면 */
export const GAME_COPY = {
  title: "영상 만드는 동안 틀린 그림 찾기",
  lead: "위아래 그림에서 다른 데를 눌러 보씨요.",
  foundLabel: "찾은 곳",
  timeLabel: "남은 시간",
  hintLabel: "힌트 보기",
  hintWaiting: "힌트는 조금 있다가",
  roundLabel: "{round}번째 그림",
  /**
   * 라운드가 끝날 때마다 그 장소를 한 줄로 소개한다. 대기 시간을 노출 시간으로 바꾼다.
   * `{copula}` 는 장소 이름의 받침에 따라 "이"가 붙거나 빠진다(오동도여라 / 무술목해변이여라).
   */
  roundOutro: "여그가 아까 말한 {place}{copula}여라.",
  roundOutroFound: "{found}개 다 찾았구만이라.",
  roundOutroTimeout: "{found}개 찾았소. 다음 그림으로 가 보까라.",
};

/** 영상이 다 나왔을 때의 중단 연출 */
export const INTERRUPT_COPY = {
  toast: "영상 다 나왔어라우!",
  score: "틀린 그림 {count}개 찾았어라우",
  countdown: "{seconds}초 뒤에 영상 보여 드리지라",
  goNow: "지금 보러 가기",
};

/** 영상 화면 */
export const VIDEO_COPY = {
  title: "{place} 다녀오는 길이요",
  caption: "{character}{randa} 같이 간 {place}",
  placeholder: "영상을 불러오지 못했어라우",
  placeholderNote: "잠시 뒤 다시 해 보씨요.",
  homeLabel: "처음으로",
};

/** 영상을 끝내 못 만들었을 때(안전장치) */
export const FAILED_COPY = {
  title: "영상이 늦어지고 있어라우",
  lead: "지금은 영상을 못 보여 드리겄소. 추천받은 데는 그대로 있응께 다시 봐 주씨요.",
  backLabel: "추천 결과로",
  homeLabel: "처음으로",
};

/**
 * 이름 뒤에 올 "이"가 필요한지 본다. 받침이 있으면 "이", 없으면 빈 문자열.
 * 한글이 아닌 이름(숫자·영문)은 붙이지 않는다.
 */
export function copulaFor(name) {
  const last = String(name ?? "").trim().slice(-1);
  if (!last) return "";
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "";
  return (code - 0xac00) % 28 === 0 ? "" : "이";
}

/** 이름 뒤에 올 주격 조사를 고른다. 받침이 있으면 "이", 없으면 "가". */
export function subjectParticle(name) {
  return copulaFor(name) ? "이" : "가";
}

/** 이름 뒤에 올 "이랑/랑"을 고른다. 받침이 있으면 "이랑". */
export function randaFor(name) {
  return `${copulaFor(name)}랑`;
}

/** `{키}` 자리를 값으로 바꾼다. 문구에 없는 키를 넘겨도 조용히 무시된다. */
export function fill(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
