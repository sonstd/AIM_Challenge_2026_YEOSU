import {
  buildFallbackRecommendations,
  requestRecommendations,
} from "@/lib/agent";
import {
  COMPANIONS,
  DETAILS_BY_COMPANION,
  MAX_AGENT_ATTEMPTS,
  MAX_RECOMMENDATIONS,
  MAX_THEMES,
  MIN_RECOMMENDATIONS,
  MIN_THEMES,
  REGION_ID,
  THEMES,
} from "@/lib/constants";
import { getAllPlaces, getPlaceById } from "@/lib/places";
import { scoreAllPlaces, selectCandidates } from "@/lib/scoring";
import { validateAgentResponse } from "@/lib/validate";

/** 요청 본문을 검증하고 정규화한다. 문제가 있으면 error 문자열을 돌려준다. */
function parsePreferences(body) {
  const companion = body?.companion;
  if (!COMPANIONS.includes(companion)) {
    return { error: `companion 값이 올바르지 않습니다: ${companion}` };
  }

  const themes = body?.themes;
  if (!Array.isArray(themes)) {
    return { error: "themes 는 배열이어야 합니다." };
  }
  if (themes.length < MIN_THEMES || themes.length > MAX_THEMES) {
    return {
      error: `themes 는 ${MIN_THEMES}~${MAX_THEMES}개여야 합니다. (현재 ${themes.length}개)`,
    };
  }
  const unknown = themes.filter((theme) => !THEMES.includes(theme));
  if (unknown.length) {
    return { error: `알 수 없는 테마: ${unknown.join(", ")}` };
  }
  if (new Set(themes).size !== themes.length) {
    return { error: "themes 에 중복된 값이 있습니다." };
  }

  const detail = body?.detail ?? null;
  if (detail !== null) {
    const allowed = DETAILS_BY_COMPANION[companion]?.options ?? [];
    if (!allowed.includes(detail)) {
      return { error: `"${companion}" 에 대한 detail 값이 올바르지 않습니다: ${detail}` };
    }
  }

  return { preferences: { companion, themes, detail } };
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

  const { preferences, error } = parsePreferences(body);
  if (error) return Response.json({ error }, { status: 400 });

  // ① 스코어링 → ② 후보 압축
  const scored = await scoreAllPlaces(preferences);
  const candidates = selectCandidates(scored);

  const allPlaces = await getAllPlaces();
  const whitelist = new Set(allPlaces.map((place) => place.place_id));
  const candidateIds = new Set(candidates.map((entry) => entry.place_id));

  // ③ Agent 호출 + ④ 검증. 실패하면 문제점을 되먹여 최대 3회까지 재호출한다.
  let items = [];
  let issues = [];
  let reachedModel = false;
  let source = "agent";

  for (let attempt = 1; attempt <= MAX_AGENT_ATTEMPTS; attempt++) {
    let payload;
    try {
      payload = await requestRecommendations({
        candidates,
        preferences,
        previousIssues: issues,
      });
      reachedModel = true;
    } catch (err) {
      console.error(`[recommend] Agent 호출 실패 (${attempt}/${MAX_AGENT_ATTEMPTS}):`, err?.message ?? err);
      continue;
    }

    const result = validateAgentResponse(payload, { whitelist, candidateIds });
    if (result.ok) {
      items = result.items;
      issues = [];
      break;
    }

    console.warn(
      `[recommend] 검증 실패 (${attempt}/${MAX_AGENT_ATTEMPTS}):`,
      result.issues.join(" / "),
    );
    issues = result.issues;
    // 3회 모두 실패하면 통과한 항목만으로 응답하기 위해 가장 성적이 좋은 시도를 남긴다.
    if (result.items.length > items.length) items = result.items;
  }

  // 모델에 아예 닿지 못한 경우(키 미설정·네트워크 차단)에만 결정적 대체 경로를 쓴다.
  // 검증 실패로 인한 부분 응답에는 관여하지 않는다.
  if (!reachedModel && items.length < MIN_RECOMMENDATIONS) {
    const fallback = buildFallbackRecommendations(candidates, 4);
    const result = validateAgentResponse(
      { recommendations: fallback },
      { whitelist, candidateIds },
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
        detail: issues,
      },
      { status: 500 },
    );
  }

  // ⑤ 응답 조립
  const matchedTagsByPlaceId = new Map(
    scored.map((entry) => [entry.place_id, entry.matchedTags]),
  );

  const recommendations = [];
  for (const item of items.slice(0, MAX_RECOMMENDATIONS)) {
    const place = await getPlaceById(item.place_id);
    if (!place) continue;
    recommendations.push({
      place_id: place.place_id,
      place_name: place.place_name,
      recommend_reason: item.recommend_reason,
      matched_tags: matchedTagsByPlaceId.get(place.place_id) ?? [],
      image_prompt: place.image_prompt,
      images: place.images,
    });
  }

  console.log(recommendations);

  return Response.json(
    { region_id: REGION_ID, recommendations },
    { headers: { "X-Recommend-Source": source } },
  );
}
