/**
 * 마지막 화면 — 같이 다녀온 사람이 봐 주는 **오늘의 운세와 먹거리**.
 *
 * 글은 전부 여기 있다. 말투는 추천 이유·설문과 같은 토박이 구어체로 맞춘다.
 * LLM 으로 매번 새로 짓지 않는 이유: 전시장에서는 **즉시 떠야 하고**, 글이 고정이라야
 * 음성(TTS)이 캐시에 남아 두 번째 관람객부터 기다림이 없다.
 */

/** 운세 등급. 뽑히는 비중이 다르다(좋은 쪽이 자주 나오게). */
export const LUCK_LEVELS = [
  { id: "best", label: "대박", weight: 2, emoji: "🌞" },
  { id: "good", label: "좋음", weight: 4, emoji: "🌤️" },
  { id: "soso", label: "무던", weight: 3, emoji: "⛅" },
  { id: "quiet", label: "잔잔", weight: 2, emoji: "🌊" },
];

/**
 * 등급별 운세 문장. 한 번에 두 줄을 뽑아 붙인다.
 * 여행 이야기라 "돈 들어온다" 같은 말보다 길·바다·사람 이야기로 쓴다.
 */
export const FORTUNE_LINES = {
  best: [
    "오늘은 뭘 해도 술술 풀리는 날이구만이라.",
    "가는 데마다 자리가 딱딱 비어 있을 운이여라.",
    "오늘 찍는 사진은 죄다 잘 나오겄소.",
    "바다가 오늘따라 유독 이뻐 보일 것인디요.",
  ],
  good: [
    "서두르지만 않으면 하루가 곱게 흘러가겄네요.",
    "오늘 만나는 사람한테 좋은 말 한마디 듣겄소.",
    "길 한번 잘못 들었다가 더 좋은 데를 볼 운이여라.",
    "점심을 잘 고르면 하루가 통째로 좋아지는 날이구만요.",
    "느지막이 나서도 늦지 않을 것인디요.",
  ],
  soso: [
    "큰 욕심만 안 부리면 무던하게 좋은 날이어라.",
    "한 군데를 오래 머무는 쪽이 이로운 날이구만이라.",
    "오늘은 걷는 길에 답이 있응께 천천히 가 보씨요.",
    "날씨 따라 마음이 왔다 갔다 할 것인디, 그러려니 하씨요.",
  ],
  quiet: [
    "오늘은 바쁘게 돌아다니기보다 쉬는 쪽이 낫겄소.",
    "조용한 데서 바다나 한참 보고 오면 딱 좋을 날이어라.",
    "사람 많은 데는 살짝 비켜 가는 게 이로운 날이구만요.",
    "오늘 못 본 데는 다음에 또 오면 되는 것이지라.",
  ],
};

/**
 * 여수 먹거리. `when` 은 어울리는 때고, 운세 문장 뒤에 한 줄로 붙는다.
 * 사진이 없어 글과 이모지로만 보여 준다(사진이 생기면 image 를 더하면 된다).
 */
export const YEOSU_FOODS = [
  { name: "갓김치", emoji: "🥬", note: "밥 한 공기 금방 비우는 여수 대표 밑반찬이지라." },
  { name: "게장백반", emoji: "🦀", note: "간장게장에 밥 비벼 묵으면 말이 없어진당께요." },
  { name: "서대회무침", emoji: "🐟", note: "새콤한 막걸리 식초 맛이 여수에서만 나는 맛이어라." },
  { name: "장어탕", emoji: "🍲", note: "걷느라 지친 다리에는 이만한 게 없지라." },
  { name: "삼치회", emoji: "🍣", note: "김에 싸서 한입에 넣어야 제맛이구만요." },
  { name: "굴구이", emoji: "🦪", note: "바닷바람 맞고 나면 생각나는 맛이어라." },
  { name: "해물삼합", emoji: "🍴", note: "여럿이 왔으면 이걸로 시작허씨요." },
  { name: "돌산갓돌솥밥", emoji: "🍚", note: "속 편하게 한 끼 하고 싶을 때 딱이지라." },
  { name: "문어숙회", emoji: "🐙", note: "쫄깃한 게 술안주로도 밥반찬으로도 좋당께요." },
  { name: "빵집 꿀빵", emoji: "🥐", note: "돌아가는 길에 손에 들고 가기 좋은 것이어라." },
];

/** 뽑기 카드 수. 다 같은 뒷면이라 몇 장이든 고르는 맛만 달라진다. */
export const FORTUNE_CARDS = 4;

/** 화면 문구. */
export const FORTUNE_COPY = {
  button: "오늘 운세 봐 주까라",
  drawTitle: "오늘의 여수 운세 뽑기",
  drawPrompt: "맘에 드는 걸로 하나 골라 보씨요.",
  title: "{character}{은} 봐 주는 오늘",
  luckLabel: "오늘의 운",
  foodLabel: "오늘 묵어야 할 것",
  placeLabel: "가 보면 좋을 데",
  homeLabel: "처음으로",
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function pickLuck() {
  const total = LUCK_LEVELS.reduce((sum, level) => sum + level.weight, 0);
  let roll = Math.random() * total;
  for (const level of LUCK_LEVELS) {
    roll -= level.weight;
    if (roll <= 0) return level;
  }
  return LUCK_LEVELS[0];
}

/**
 * 운세 한 판을 뽑는다. **무작위가 들어 있으므로 이벤트 핸들러에서 부른다**
 * (렌더 중에 부르면 다시 그릴 때마다 결과가 바뀐다).
 *
 * 장소는 **관람객이 추천받은 곳 중에서** 고른다. 영상으로 이미 본 곳은 빼서,
 * 마지막에 한 군데를 더 얹어 주는 모양이 되게 한다.
 *
 * @param {{ recommendations: object[], excludePlaceId?: string }} input
 */
export function buildFortune({ recommendations = [], excludePlaceId } = {}) {
  const luck = pickLuck();
  const lines = FORTUNE_LINES[luck.id];
  const first = pick(lines);
  const second = pick(lines.filter((line) => line !== first)) ?? "";

  const others = recommendations.filter((item) => item.place_id !== excludePlaceId);
  const place = pick(others.length ? others : recommendations) ?? null;

  return {
    luck,
    lines: [first, second].filter(Boolean),
    food: pick(YEOSU_FOODS),
    place,
  };
}
