import { GoogleGenAI, Type } from "@google/genai";

import { hasDecimalNumber, splitSentences } from "@/lib/validate";

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
  "2. 후보 중 3~5곳을 선정한다.",
  "3. 각 장소의 추천 이유(recommend_reason)는 정확히 3문장으로 작성한다.",
  "   - 1문장: evidence_text_1(객관적 사실) 기반. 장소명을 반드시 포함한다.",
  "   - 2문장: evidence_text_2(분위기·감각) 기반.",
  "   - 3문장: evidence_text_3(활동) 기반.",
  "4. 각 문장은 독립적으로 근거를 가져야 한다. 제공된 evidence_text에 없는 내용은 절대 쓰지 않는다.",
  "5. 소수점이 포함된 수치(예: 1.5km)는 인용하지 않는다. 필요하면 수치를 빼고 서술한다.",
  "6. 사용자의 동반 유형·세부사항은 문장의 어조 조정에만 반영한다. evidence에 없는 사실을 추가하지 않는다.",
  "7. 문장은 마침표로 끝낸다. 마침표는 문장의 끝에만 쓴다.",
  "8. JSON만 출력한다. 마크다운 코드펜스나 설명 문장을 덧붙이지 않는다.",
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

/** 후보에서 Agent에게 넘길 필드만 추린다. 점수나 내부 태그는 넘기지 않는다. */
export function buildCandidatePayload(candidates) {
  return candidates.map(({ place }) => ({
    place_id: place.place_id,
    place_name: place.place_name,
    summary: place.summary,
    evidence_text_1: place.evidence_text_1,
    evidence_text_2: place.evidence_text_2,
    evidence_text_3: place.evidence_text_3,
    evidence_text_4: place.evidence_text_4,
    evidence_text_5: place.evidence_text_5,
  }));
}

function buildPrompt({ candidates, preferences, previousIssues }) {
  const { companion, themes, detail } = preferences;
  const lines = [
    "## 사용자 선택",
    `- 동반 유형: ${companion}`,
    `- 선호 테마(선택 순서대로, 앞쪽일수록 중요): ${themes.join(", ")}`,
    `- 세부사항: ${detail ?? "선택 안 함"}`,
    "",
    "## 후보 목록",
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
}) {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: buildPrompt({ candidates, preferences, previousIssues }),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.4,
    },
  });

  return parseJson(response.text);
}

/** 소수점 수치가 없는 첫 문장을 고른다. 없으면 null. */
function pickCleanSentence(...sources) {
  for (const source of sources) {
    for (const sentence of splitSentences(source)) {
      if (!hasDecimalNumber(sentence)) return sentence;
    }
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
