import { CONDITION_QUESTIONS } from "@/config/questions";
import {
  buildFallbackRecommendations,
  requestRecommendations,
} from "@/lib/agent";
import {
  MAX_AGENT_ATTEMPTS,
  MAX_RECOMMENDATIONS,
  MIN_RECOMMENDATIONS,
  REGION_ID,
  TARGET_RECOMMENDATIONS,
} from "@/lib/constants";
import {
  computeAxisScores,
  isPersonalityComplete,
  resolveTravelType,
} from "@/lib/personality";
import { getAllPlaces, getPlaceById } from "@/lib/places";
import { scoreAllPlaces, selectCandidates } from "@/lib/scoring";
import { validateAgentResponse } from "@/lib/validate";

/**
 * 요청 본문을 검증하고 정규화한다. 문제가 있으면 error 문자열을 돌려준다.
 *
 * X/Y 좌표는 클라이언트가 보낸 값을 믿지 않고 8문항 응답에서 서버가 다시 계산한다.
 */
function parseRequest(body) {
  const conditions = body?.conditions;
  if (!conditions || typeof conditions !== "object") {
    return { error: "conditions 가 없습니다." };
  }

  for (const { id, question, options } of CONDITION_QUESTIONS) {
    if (!options.includes(conditions[id])) {
      return {
        error: `"${question}" 의 답이 올바르지 않습니다: ${conditions[id]}`,
      };
    }
  }

  const answers = body?.answers;
  if (!answers || typeof answers !== "object") {
    return { error: "answers 가 없습니다." };
  }
  if (!isPersonalityComplete(answers)) {
    return { error: "성향 8문항에 모두 답해야 추천을 받을 수 있습니다." };
  }

  const axisScores = computeAxisScores(answers);
  const travelType = resolveTravelType(axisScores.x, axisScores.y);

  return {
    preferences: {
      conditions: {
        companion: conditions.companion,
        duration: conditions.duration,
        budget: conditions.budget,
        transport: conditions.transport,
      },
      axisScores,
      travelType,
    },
  };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "요청 본문이 올바른 JSON이 아닙니다." },
      { status: 400 },
    );
  }

  const { preferences, error } = parseRequest(body);
  if (error) return Response.json({ error }, { status: 400 });

  // ① 스코어링 → ② 후보 압축
  const scored = await scoreAllPlaces(preferences);
  const candidates = selectCandidates(scored);

  const allPlaces = await getAllPlaces();
  const whitelist = new Set(allPlaces.map((place) => place.place_id));
  const candidateIds = new Set(candidates.map((entry) => entry.place_id));
  // 검증 [7] 원문 복사 판정용. 1~3문장이 각각 evidence_text_1~3 과 대응한다.
  const evidenceById = new Map(
    allPlaces.map((place) => [
      place.place_id,
      [place.evidence_text_1, place.evidence_text_2, place.evidence_text_3],
    ]),
  );

  // ③ Agent 호출 + ④ 검증. 실패하면 문제점을 되먹여 최대 3회까지 재호출한다.
  let items = [];
  let issues = [];
  // 원문 복사로 거부된 문장. 다음 호출 프롬프트에 원문·거부 문장을 그대로 싣는다.
  let copyRejections = [];
  // 3회 모두 실패했을 때 고를 "가장 나은 시도"의 복사 거부 건수
  let bestCopyCount = Infinity;
  let reachedModel = false;
  let source = "agent";

  for (let attempt = 1; attempt <= MAX_AGENT_ATTEMPTS; attempt++) {
    let payload;
    try {
      payload = await requestRecommendations({
        candidates,
        preferences,
        previousIssues: issues,
        copyRejections,
      });
      reachedModel = true;
    } catch (err) {
      console.error(
        `[recommend] Agent 호출 실패 (${attempt}/${MAX_AGENT_ATTEMPTS}):`,
        err?.message ?? err,
      );
      continue;
    }

    const result = validateAgentResponse(payload, {
      whitelist,
      candidateIds,
      evidenceById,
    });
    if (result.ok) {
      items = result.items;
      issues = [];
      copyRejections = [];
      break;
    }

    console.warn(
      `[recommend] 검증 실패 (${attempt}/${MAX_AGENT_ATTEMPTS}):`,
      [
        ...result.issues,
        ...result.copyRejections.map(
          (r) => `${r.placeId} ${r.order}문장 원문 복사 ${Math.round(r.ratio * 100)}%`,
        ),
      ].join(" / "),
    );
    issues = result.issues;
    copyRejections = result.copyRejections;
    // 3회 모두 실패하면 통과한 항목만으로 응답하기 위해 가장 성적이 좋은 시도를 남긴다.
    // 항목 수가 많은 쪽, 같으면 원문 복사 거부가 적은 쪽을 고른다.
    const copyCount = result.copyRejections.length;
    if (
      result.items.length > items.length ||
      (result.items.length === items.length && copyCount < bestCopyCount)
    ) {
      items = result.items;
      bestCopyCount = copyCount;
    }
  }

  // 모델에 아예 닿지 못한 경우(키 미설정·네트워크 차단)에만 결정적 대체 경로를 쓴다.
  // 검증 실패로 인한 부분 응답에는 관여하지 않는다.
  if (!reachedModel && items.length < MIN_RECOMMENDATIONS) {
    const fallback = buildFallbackRecommendations(
      candidates,
      TARGET_RECOMMENDATIONS,
    );
    // 대체 응답은 evidence를 그대로 조립하는 방식이라 원문 복사 검사([7])는 적용하지 않는다.
    const result = validateAgentResponse(
      { recommendations: fallback },
      { whitelist, candidateIds, evidenceById, checkCopy: false },
    );
    if (result.ok) {
      console.warn(
        "[recommend] Agent에 연결하지 못해 evidence 조립 기반 대체 응답을 사용합니다.",
      );
      items = result.items;
      source = "fallback";
    }
  }

  if (items.length < MIN_RECOMMENDATIONS) {
    return Response.json(
      {
        error: "추천을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        detail: [
          ...issues,
          ...copyRejections.map(
            (r) => `${r.placeId} ${r.order}문장 원문 복사 ${Math.round(r.ratio * 100)}%`,
          ),
        ],
      },
      { status: 500 },
    );
  }

  // ⑤ 응답 조립
  const scoreByPlaceId = new Map(scored.map((entry) => [entry.place_id, entry]));

  /**
   * 본문은 제출 규격(CLAUDE.md §5)과 정확히 같은 필드만 담는다.
   * 이 응답을 그대로 저장한 파일이 제출물 02번이 되어야 하므로
   * (규칙 1-5: 제출 JSON과 REST API 결과 일치), 화면 표시용 값은 본문에 넣지 않고
   * X-Match-Scores 헤더로 따로 내려보낸다. 헤더는 저장되는 JSON에 섞이지 않는다.
   */
  const recommendations = [];
  const matchScores = {};

  for (const item of items.slice(0, MAX_RECOMMENDATIONS)) {
    const place = await getPlaceById(item.place_id);
    if (!place) continue;
    const entry = scoreByPlaceId.get(place.place_id);
    matchScores[place.place_id] = entry?.matchScore ?? null;
    recommendations.push({
      place_id: place.place_id,
      place_name: place.place_name,
      recommend_reason: item.recommend_reason,
      matched_tags: entry?.matchedTags ?? [],
      image_prompt: place.image_prompt,
      images: place.images,
    });
  }

  // 카드에 순위 배지와 매칭도가 함께 붙으므로 둘의 순서가 어긋나면 버그처럼 보인다.
  // 후보 선정·Agent 선택까지는 조건 감점이 반영된 점수로 하되, 최종 노출 순서는
  // 화면에 실제로 찍히는 매칭도 기준으로 맞춘다.
  recommendations.sort(
    (a, b) => (matchScores[b.place_id] ?? -1) - (matchScores[a.place_id] ?? -1),
  );

  const responseBody = { region_id: REGION_ID, recommendations };

  return Response.json(responseBody, {
    headers: {
      "X-Recommend-Source": source,
      // 화면 표시 전용. 본문을 제출 규격 그대로 두기 위해 헤더로 뺐다.
      "X-Match-Scores": JSON.stringify(matchScores),
    },
  });
}
