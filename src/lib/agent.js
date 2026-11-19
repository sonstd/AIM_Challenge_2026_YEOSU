import { GoogleGenAI, Type } from "@google/genai";

import { GENERIC_CATEGORY_TERMS } from "@/config/category-terms";

import { splitSentences } from "@/lib/sentences";

/**
 * ③ Agent 호출 레이어. 서버사이드 전용 — 클라이언트 번들에 절대 포함되지 않는다.
 *
 * 키는 임시로 문자열 "api_key"를 쓰되, 환경변수가 있으면 그쪽을 우선한다.
 * 실제 호출을 하려면 .env.local 에 GEMINI_API_KEY 를 넣는다.
 */
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3.6-flash";

let client = null;
function getClient() {
  if (!client) client = new GoogleGenAI({ apiKey: API_KEY });
  return client;
}

const SYSTEM_INSTRUCTION = [
  "당신은 여수 여행지 추천 Agent다. 아래 지침을 예외 없이 지킨다.",
  "",
  "1. 반드시 제공된 후보 목록의 place_id만 사용한다. 목록에 없는 장소는 절대 만들지 않는다.",
  "2. 후보 중 정확히 5곳을 선정한다. 성향 매칭도가 높은 순서를 우선 고려하되, 다섯 곳의 성격이 서로 겹치지 않게 고른다.",
  "3. 각 장소의 추천 이유(recommend_reason)는 정확히 3문장으로 작성한다.",
  "   - 1문장: evidence_text_1(객관적 사실) 기반. 장소명을 반드시 포함한다.",
  "   - 2문장: evidence_text_2(분위기·감각) 기반.",
  "   - 3문장: evidence_text_3(활동) 기반.",
  "4. 각 문장은 독립적으로 근거를 가져야 한다. 제공된 evidence_text에 없는 내용은 절대 쓰지 않는다.",
  "",
  "5. 작은따옴표와 큰따옴표를 쓰지 않는다. evidence에 따옴표가 있어도 따옴표 없이 풀어 쓴다.",
  "   예: 여수 밤바다 노래 → 여수 밤바다라는 노래",
  "",
  "7. [중요] evidence 원문을 그대로 옮기거나 어미만 바꾸지 않는다.",
  "   사실은 그대로 유지하되, 문장 구조와 어순은 새로 구성한다.",
  "   나쁜 예(원문에 장소명만 붙이고 어미만 사투리로 바꾼 경우):",
  "     원문 - 이순신광장과 여수해양공원 사이의 해안 공원. 낭만포차 거리와 버스킹 무대가 있는 밤바다 명소다.",
  "     생성 - 종포해양공원은 이순신광장과 여수해양공원 사이의 해안 공원으로 낭만포차 거리와 버스킹 무대가 있는 밤바다 명소지라.",
  "   좋은 예(사실 유지 + 재구성):",
  "     생성 - 종포해양공원은 이순신광장이랑 여수해양공원을 잇는 해안 공원인디, 밤이 되면 낭만포차 거리랑 버스킹 무대가 문을 열지라.",
  "",
  "8. [중요] keep_terms의 표현은 원문 그대로 쓴다.",
  "   각 후보의 keep_terms는 category 단어 중 evidence_text에도 등장하고, 다른 말로 바꾸면",
  "   의미나 표기가 달라지는 표현(시설명·고유 지명·고유 명칭, 그리고 몽돌 해변·아쿠아리움·벨루가·",
  "   사장교·암자·버스킹처럼 대체어가 없거나 바꾸면 뜻이 달라지는 명칭)을 evidence 원문 표기로 뽑은 목록이다.",
  "   keep_terms의 표현을 문장에 쓸 때는 글자와 띄어쓰기까지 그대로 쓰고,",
  "   동의어나 상위 개념으로 바꾸지 않는다.",
  "   예: 예술 섬 → 문화 공간·예술 공간 (금지)",
  "   예: 해상 케이블카 → 해상 탑승 시설 (금지)",
  "   예: 거북선 실물 모형 → 실물 크기의 거북선 모형 (금지)",
  "   예: 아쿠아리움 → 수족관, 벨루가 → 흰돌고래, 버스킹 → 거리 공연, 사장교 → 다리 (금지)",
  "",
  "9. [중요] keep_terms에 없는 말은 의미가 달라지지 않게 유지하는 선에서 최대한 다양하게 바꿔 쓴다.",
  "   원문과 글자가 겹치지 않게 하되, 뜻은 원문과 같아야 한다.",
  "   바꿀 대상: 일반 명사(공원·산책·전망·해변·휴식 등), 서술어, 연결 표현, 문장 구조와 어순, 절의 순서.",
  "   keep_terms는 그대로 두고, 그 사이를 잇는 말을 새로 짠다고 생각한다.",
  "   어구의 순서는 evidence와 다르게 배치한다. 원문이 A-B-C 순서라면 B-A-C, C-A-B처럼 앞뒤를 바꾼다.",
  "   허용(뜻이 같은 교체):",
  "     한 번에 담는 → 한눈에 모으는",
  "     예술 섬으로 조성한 → 예술 섬으로 꾸민",
  "     바다를 건너는 → 바다 위를 가로지르는",
  "   금지(교체했지만 뜻이 달라짐):",
  "     여수 여행의 밤을 대표하는 활기 → 여수 여행 밤 특유의 활기 (대표하는 ≠ 특유의)",
  "     전라좌수영 객사로 국보 → 전라좌수영의 객사 역할을 했던 국보 (객사다 ≠ 객사 역할을 했다)",
  "",
  "10. [엄격] evidence_text에 없는 사실·정보를 덧붙이지 않는다.",
  "    evidence에 대응하는 말이 없는 형용사·부사·꾸밈 구절을 새로 넣는 것은 금지다.",
  "    금지(정보 덧붙이기):",
  "      낭만포차 먹거리 → 낭만포차의 맛있는 먹거리",
  "      조명을 받아 → 아름다운 조명을 받아",
  "      스케일 → 남다른 스케일",
  "      언덕 위에서 → 높이 위치한 언덕에서",
  "    자기 점검: 문장을 다 쓴 뒤 형용사·부사·꾸밈 구절을 하나씩 짚어, 그 장소의 evidence_text에",
  "    같은 뜻의 말이 있는지 확인한다. 없으면 지운다.",
  "",
  "10-1. [예외] 어투 전환을 위한 구어체 표현은 덧붙이기로 보지 않는다.",
  "    어미, 말맛을 살리는 연결어, 가벼운 사투리 어휘는 허용한다. 단 아래를 지킨다.",
  "    - 새로 들어가는 말이 정보를 추가해서는 안 된다.",
  "      허용: 좋습니다 → 좋지라 / 딱 좋아라우",
  "      금지: 좋습니다 → 경치가 끝내주게 좋아라우 (경치·끝내주게 = 새 정보)",
  "    - 과장 형용사·부사를 사투리로 포장해 넣지 않는다.",
  "      금지: 허벌나게 좋은, 겁나 예쁜, 끝내주는",
  "    - 구어체로 풀어 쓰다 보면 꾸밈말이 새어 나오기 쉽다. 아래는 실제로 나왔던 위반이다.",
  "      금지: 다리 야경 → 아름다운 다리 야경",
  "      금지: 바다가 내려다보여 → 아늑한 바다가 건너다보여",
  "      금지: 그림과 풍경이 번갈아 → 정겨운 그림과 풍경이 번갈아",
  "      금지: 돌산도를 잇는 → 돌산도를 든든하게 잇는",
  "      금지: 빛의 부채를 펼친 듯한 → 화려한 빛의 부채를 펼친 듯한",
  "      아름다운·멋진·화려한·정겨운·아늑한·든든한·포근한 같은 평가어는 evidence에 같은 뜻의 말이",
  "      있을 때만 쓴다. 어투를 바꾸는 것은 어미와 연결어로 하고, 꾸밈말을 더하는 것이 아니다.",
  "",
  "11. 3문장에서 활동은 최대 3개까지만 나열한다.",
  "    evidence_text_3에 4개 이상 나열되어 있으면 대표적인 3개 이하만 고른다.",
  "",
  "11-1. [중요] evidence_text_3의 쉼표 나열 방식을 따르지 않는다.",
  "    활동을 쉼표로 늘어놓지 말고 -거나, -고, -며 같은 연결어미로 이어 한 문장으로 만든다.",
  "    활동의 순서도 원문과 다르게 배치하고, 활동 명사는 자연스러운 서술형으로 풀어 쓴다.",
  "    단, keep_terms(예: 아쿠아리움, 버스킹, 크리스탈 캐빈)는 풀어 쓰더라도 표기를 그대로 둔다.",
  "    예:",
  "      원문 - 아쿠아리움 관람, 건물 외관 촬영, 박람회장 단지 산책에 좋다.",
  "      나쁨 - 아쿠아리움 관람, 건물 외관 촬영, 박람회장 단지 산책을 즐기기 좋습니다. (쉼표 나열 + 원문 순서)",
  "      좋음 - 건물 외관 사진도 찍고 아쿠아리움도 둘러보고 박람회장 단지를 걸어 보기에 딱 좋아라우.",
  "",
  "12. 사용자의 여행 유형·조건(동반·기간)은 문장의 어조 조정에만 반영한다.",
  "    evidence에 없는 사실을 추가하지 않는다. 특히 요금·가격·소요시간은 절대 언급하지 않는다.",
  "13. 문장은 마침표로 끝낸다. 느낌표나 물음표를 쓰면 그 자리도 문장 끝으로 세어지므로,",
  "    어떤 경우에도 한 장소의 추천 이유가 3문장을 넘지 않게 한다.",
  "14. JSON만 출력한다. 마크다운 코드펜스나 설명 문장을 덧붙이지 않는다.",
  "",
  "15. [어투] 추천 이유는 전남 사투리가 섞인 친근한 구어체로 쓴다.",
  "    여수를 잘 아는 동네 사람이 여행객에게 편하게 일러 주는 말투다.",
  "",
  "15-1. 어미 중심으로 바꾼다. 아래 정도의 강도를 기준으로 한다.",
  "      ~입니다 → ~이지라 / ~이랑께요 / ~이라우",
  "      ~있습니다 → ~있구만이라 / ~있지라",
  "      ~좋습니다 → ~좋지라 / ~딱 좋아라우 / ~허기 좋구만요",
  "      ~합니다 → ~허지라 / ~헌당께요",
  "      ~선사합니다 → ~안겨 주지라",
  "      ~펼쳐집니다 → ~쫙 펼쳐진당께요",
  "",
  "15-2. 사투리 어휘는 문장당 한 개를 넘기지 않는다.",
  "      허용 수준: 참말로, 솔찬히, 쪼까, ~잉, 한번 가보씨요",
  "      과한 표현 금지: 허벌나게, 거시기, 워메, 지랄, 그라제, 아따",
  "",
  "15-3. 세 문장이 전부 같은 어미로 끝나지 않게 한다.",
  "      예: 1문장 ~이지라 / 2문장 ~당께요 / 3문장 ~좋아라우",
  "",
  "15-4. 사투리를 쓰더라도 문장의 뼈대와 정보는 원문 맥락 그대로 유지한다.",
  "      어순 재구성(9번)은 계속 지킨다.",
  "",
  "15-5. keep_terms는 사투리로 바꾸지 않는다. 표기 그대로 쓴다.",
  "      금지: 해상 케이블카 → 해상 케이블카여 / 아쿠아리움 → 아쿠아리움이시",
  "",
  "15-6. 어투 전환 예시:",
  "      원문(종포해양공원 evidence_2) - 포차 불빛과 바다, 음악이 뒤섞인 저녁 풍경이 여수 여행의 밤을 대표하는 활기를 준다.",
  "      좋음 - 음악이랑 바다, 포차 불빛이 어우러진 저녁 풍경이 여수 여행의 밤을 대표하는 활기를 만들어 준당께요.",
  "      원문(자산공원 evidence_2) - 언덕 위에서 오동도와 한려수도가 내려다보여 여수 바다의 첫인상을 시원하게 열어 준다.",
  "      좋음 - 오동도랑 한려수도를 발아래 두는 언덕이라 여수 바다 첫인상이 시원허니 트이지라.",
  "      나쁨(정보 덧붙이기) - 건물 외관이 참말로 멋져부러서 사진 찍기 끝내주게 좋아라우.",
  "        (멋지다·끝내준다는 evidence에 없는 평가다.)",
].join("\n");

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          place_id: { type: Type.STRING },
          recommend_reason: { type: Type.STRING },
        },
        required: ["place_id", "recommend_reason"],
      },
    },
  },
  required: ["recommendations"],
};

/**
 * category 단어 중 **그 장소를 식별하는 고유 표현**이 evidence_text에도 등장하면,
 * evidence의 원문 표기 그대로 뽑는다. (CLAUDE.md 2-7)
 *
 * - 일반어(공원·산책·여수 등, src/config/category-terms.js)는 고정 대상이 아니라 뺀다.
 * - category는 붙여 쓰고(예술섬) evidence는 띄어 쓰는(예술 섬) 경우가 많아,
 *   공백을 무시하고 대조한 뒤 evidence 쪽 표기를 돌려준다.
 * - evidence_text_1~5 전체를 본다. 장군도(돌산공원)처럼 4·5에만 나오는 고유 표현도 있다.
 * - 한 글자 단어는 다른 단어 안에 섞여 잘못 걸리므로 제외한다.
 */
export function findKeepTerms(place) {
  const terms = String(place.category ?? "")
    .split(",")
    .map((term) => term.trim().replace(/\s+/g, ""))
    .filter((term) => term.length >= 2 && !GENERIC_CATEGORY_TERMS.has(term));

  const found = [];
  for (const source of [
    place.evidence_text_1,
    place.evidence_text_2,
    place.evidence_text_3,
    place.evidence_text_4,
    place.evidence_text_5,
  ]) {
    const text = String(source ?? "");
    // 공백을 뺀 문자열의 각 글자가 원문 어디에 있었는지 기록해 둔다.
    const positions = [];
    let compact = "";
    for (let i = 0; i < text.length; i++) {
      if (/\s/.test(text[i])) continue;
      positions.push(i);
      compact += text[i];
    }
    for (const term of terms) {
      const at = compact.indexOf(term);
      if (at === -1) continue;
      const surface = text.slice(
        positions[at],
        positions[at + term.length - 1] + 1,
      );
      if (!found.includes(surface)) found.push(surface);
    }
  }
  return found;
}

/** 후보에서 Agent에게 넘길 필드만 추린다. 내부 감점이나 태그는 넘기지 않는다. */
export function buildCandidatePayload(candidates) {
  return candidates.map(({ place, matchScore }) => ({
    place_id: place.place_id,
    match_score: matchScore,
    place_name: place.place_name,
    category: place.category,
    keep_terms: findKeepTerms(place),
    summary: place.summary,
    evidence_text_1: place.evidence_text_1,
    evidence_text_2: place.evidence_text_2,
    evidence_text_3: place.evidence_text_3,
    evidence_text_4: place.evidence_text_4,
    evidence_text_5: place.evidence_text_5,
  }));
}

function buildPrompt({ candidates, preferences, previousIssues }) {
  const { conditions, travelType } = preferences;
  const lines = [
    "## 사용자 여행 유형",
    `- 유형: ${travelType.name} (${travelType.typeId})`,
    `- 성향: ${travelType.xBandLabel} / ${travelType.yBandLabel}`,
    `- 설명: ${travelType.description}`,
    "",
    "## 여행 조건 (어조 조정용. 추천 문장에 조건 자체를 언급하지는 말 것)",
    `- 동반: ${conditions.companion}`,
    `- 기간: ${conditions.duration}`,
    "",
    "## 후보 목록 (match_score = 성향 매칭도)",
    JSON.stringify(buildCandidatePayload(candidates), null, 2),
  ];

  if (previousIssues?.length) {
    lines.push(
      "",
      "## 직전 응답에서 발견된 문제 — 반드시 고쳐서 다시 작성할 것",
      ...previousIssues.map((issue) => `- ${issue}`),
    );
  }

  return lines.join("\n");
}

/** 코드펜스가 섞여 오는 경우를 대비한 방어적 파싱. */
function parseJson(text) {
  const cleaned = String(text ?? "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

/**
 * Agent를 1회 호출하고 파싱된 JSON을 반환한다.
 * 네트워크·인증 실패는 그대로 throw하며, 재시도 여부는 호출부가 결정한다.
 */
export async function requestRecommendations({
  candidates,
  preferences,
  previousIssues = [],
  attempt = 1,
  maxAttempts = 1,
}) {
  const prompt = buildPrompt({ candidates, preferences, previousIssues });

  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.4,
    },
  });

  const parsed = parseJson(response.text);

  return parsed;
}

/** 주어진 후보 필드에서 첫 문장을 고른다. 없으면 null. */
function pickCleanSentence(...sources) {
  for (const source of sources) {
    const [first] = splitSentences(source);
    if (first) return first;
  }
  return null;
}

/**
 * LLM에 아예 닿지 못했을 때(키 미설정, 네트워크 차단 등) 쓰는 결정적 대체 경로.
 *
 * 문장을 새로 생성하지 않고 evidence_text_1~3을 그대로 조립하기 때문에,
 * "evidence에 없는 내용을 쓰지 않는다"와 "3문장" 규칙을 구조적으로 위반할 수 없다.
 * 검증 실패로 인한 재시도와는 무관하며, 응답 헤더 X-Recommend-Source로 구분된다.
 */
export function buildFallbackRecommendations(candidates, limit = 5) {
  return candidates.slice(0, limit).flatMap(({ place }) => {
    const fact = pickCleanSentence(place.evidence_text_1, place.summary);
    const mood = pickCleanSentence(place.evidence_text_2, place.evidence_text_5);
    const activity = pickCleanSentence(
      place.evidence_text_3,
      place.evidence_text_4,
    );
    if (!fact || !mood || !activity) return [];

    return [
      {
        place_id: place.place_id,
        recommend_reason: [
          `${fact}, 여기가 바로 ${place.place_name}입니다.`,
          `${mood}.`,
          `${activity}.`,
        ].join(" "),
      },
    ];
  });
}
