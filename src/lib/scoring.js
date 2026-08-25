import { getAllPlaces } from "@/lib/places";
import {
  AVOID_PENALTIES,
  CANDIDATE_LIMIT,
  COMPANION_AUTO_BONUS,
  COMPANION_AUTO_TAGS,
  EXCLUSIVE_GROUPS,
  MIN_CANDIDATES,
  PENALTY_DOUBLING_DETAIL,
  PRIMARY_THEME_BONUS,
  TAG_MATCH_WEIGHT,
} from "@/lib/constants";

/** "a,b,c" 형태의 태그 문자열을 배열로 변환한다. */
function splitTags(value) {
  return String(value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/**
 * ① 스코어링
 *
 * score = (사용자가 고른 preference_tags 매칭 수 × 2)
 *       - (저촉된 avoid_tags 감점 합)
 *       + (themes[0]과 매칭되면 +0.5)
 *       + (동반 유형 자동 태그와 매칭되면 +1.5)
 *
 * avoid_tags는 하드 필터가 아니라 소프트 감점이다. 감점 폭은 동반 유형에 따라 다르고,
 * 세부사항이 "어린 자녀"이면 2배가 된다.
 *
 * 자동 태그(가족→아이와함께, 연인·부부→로맨틱·커플)는 ×2 가중치 대상이 아니라
 * 별도의 고정 가산점이다. 다만 matched_tags 에는 함께 노출한다.
 */
export function scorePlace(place, { companion, themes = [], detail = null }) {
  const preferenceTags = splitTags(place.preference_tags);
  const avoidTags = splitTags(place.avoid_tags);

  // 사용자가 고른 순서를 그대로 유지한다(첫 번째 선택에 가중치를 주기 위함).
  const selectedTags = themes.filter((theme) => preferenceTags.includes(theme));

  // 동반 유형에서 자동으로 따라오는 태그. 사용자가 고른 것 뒤에 붙인다.
  const autoTag = COMPANION_AUTO_TAGS[companion] ?? null;
  const autoMatched =
    autoTag && preferenceTags.includes(autoTag) && !selectedTags.includes(autoTag)
      ? autoTag
      : null;
  const autoBonus = autoMatched ? COMPANION_AUTO_BONUS : 0;

  const matchedTags = autoMatched
    ? [...selectedTags, autoMatched]
    : selectedTags;

  const penaltyTable = AVOID_PENALTIES[companion] ?? {};
  const multiplier = detail === PENALTY_DOUBLING_DETAIL ? 2 : 1;
  const triggeredAvoidTags = avoidTags.filter((tag) => penaltyTable[tag] > 0);
  const penalty = triggeredAvoidTags.reduce(
    (sum, tag) => sum + penaltyTable[tag] * multiplier,
    0,
  );

  const primaryTheme = themes[0] ?? null;
  const primaryBonus =
    primaryTheme && preferenceTags.includes(primaryTheme)
      ? PRIMARY_THEME_BONUS
      : 0;

  const score =
    selectedTags.length * TAG_MATCH_WEIGHT - penalty + primaryBonus + autoBonus;

  return {
    place,
    place_id: place.place_id,
    score,
    matchedTags,
    selectedTags,
    autoMatchedTag: autoMatched,
    triggeredAvoidTags,
    penalty,
    primaryBonus,
    autoBonus,
  };
}

/** 20곳 전체를 채점하고 점수 내림차순으로 정렬한다(동점은 place_id 오름차순). */
export async function scoreAllPlaces(preferences) {
  const places = await getAllPlaces();
  return places
    .map((place) => scorePlace(place, preferences))
    .sort((a, b) =>
      b.score !== a.score
        ? b.score - a.score
        : a.place_id.localeCompare(b.place_id),
    );
}

/**
 * ② 후보 압축
 *
 * 상위 8곳을 고르되, 배타 그룹(성격이 거의 동일한 장소들)에서는 점수가 높은 쪽만 남긴다.
 * 상위권을 놓고 경쟁하는 구간에서만 억제가 일어나므로, 낮은 순위의 동일 그룹 장소가
 * 이유 없이 사라지지 않는다. 억제 때문에 후보가 모자라면 최소 5곳까지 되돌린다.
 */
export function selectCandidates(
  scored,
  { limit = CANDIDATE_LIMIT, minimum = MIN_CANDIDATES } = {},
) {
  const groupOfPlace = new Map();
  EXCLUSIVE_GROUPS.forEach((group, index) => {
    group.forEach((placeId) => groupOfPlace.set(placeId, index));
  });

  const candidates = [];
  const suppressed = [];
  const usedGroups = new Set();

  for (const entry of scored) {
    if (candidates.length >= limit) break;

    const groupIndex = groupOfPlace.get(entry.place_id);
    if (groupIndex !== undefined) {
      if (usedGroups.has(groupIndex)) {
        // 같은 그룹에서 더 높은 점수의 장소를 이미 담았다.
        suppressed.push(entry);
        continue;
      }
      usedGroups.add(groupIndex);
    }
    candidates.push(entry);
  }

  if (candidates.length < minimum) {
    candidates.push(...suppressed.slice(0, minimum - candidates.length));
  }

  return candidates;
}
