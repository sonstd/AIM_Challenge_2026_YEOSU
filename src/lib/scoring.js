import {
  AVOID_PENALTIES,
  AXIS_AFFINITY_TAGS,
  CANDIDATE_LIMIT,
  COMPANION_AUTO_BONUS,
  COMPANION_AUTO_TAGS,
  DURATION_PENALTIES,
  EXCLUSIVE_GROUPS,
  MIN_CANDIDATES,
  NEUTRAL_THRESHOLD,
  TRANSPORT_PENALTIES,
} from "@/lib/constants";
import { getAllPlaces } from "@/lib/places";

/** 좌표 평면의 최대 거리: (-10,-10) ↔ (+10,+10) */
const MAX_DISTANCE = Math.hypot(20, 20);

/** "a,b,c" 형태의 태그 문자열을 배열로 변환한다. */
function splitTags(value) {
  return String(value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/**
 * 성향 매칭도(0~100).
 *
 * 사용자 좌표와 장소 좌표의 거리를 최대 거리로 정규화한 값이다.
 * 조건(기간·이동수단) 감점은 여기 섞지 않는다 — 매칭도는 어디까지나
 * "성향이 얼마나 맞는가"만 나타내야 하기 때문이다.
 */
export function computeAffinity(user, placeAxis) {
  const distance = Math.hypot(user.x - placeAxis.x, user.y - placeAxis.y);
  const affinity = 100 - (distance / MAX_DISTANCE) * 100;
  return Math.max(0, Math.min(100, affinity));
}

/** 감점표 여러 개를 합쳐 태그별 총 감점을 만든다. */
function collectPenalties(tables) {
  const merged = {};
  for (const table of tables) {
    for (const [tag, points] of Object.entries(table ?? {})) {
      merged[tag] = (merged[tag] ?? 0) + points;
    }
  }
  return merged;
}

/**
 * 사용자가 기울어진 쪽의 성향 태그를 매칭 대상으로 본다.
 * 예) x가 음수(자연·힐링 쪽)이면 "액티비티" 태그는 매칭으로 치지 않는다.
 *
 * 단, 그 축이 중립에 가까우면(|점수| < 2.5) 양쪽 태그를 모두 인정한다.
 * 축 합계가 정확히 0인 사용자에게 "0은 음수가 아니다"는 이유만으로
 * 반대쪽 태그를 전부 잘라내면 근거가 없기 때문이다.
 */
function axisTags(score, { negative, positive }) {
  if (Math.abs(score) < NEUTRAL_THRESHOLD) return [...negative, ...positive];
  return score < 0 ? negative : positive;
}

function affinityTagsFor({ x, y }) {
  return [
    ...axisTags(x, AXIS_AFFINITY_TAGS.x),
    ...axisTags(y, AXIS_AFFINITY_TAGS.y),
  ];
}

/**
 * ① 스코어링
 *
 * score = 성향 매칭도(0~100)
 *       + 동반 유형 자동 태그 가산
 *       - 조건(동반·기간·이동수단) 기반 avoid_tags 감점
 *
 * 조건 문항은 X/Y 좌표에 전혀 반영되지 않는다. 오직 이 감점에만 쓰인다.
 */
export function scorePlace(place, { axisScores, conditions }) {
  const { companion, duration, transport } = conditions ?? {};
  const preferenceTags = splitTags(place.preference_tags);
  const avoidTags = splitTags(place.avoid_tags);

  const affinity = computeAffinity(axisScores, place.axis);

  // 성향 방향과 맞는 태그만 추린다.
  const wanted = affinityTagsFor(axisScores);
  const matchedAffinityTags = preferenceTags.filter((tag) =>
    wanted.includes(tag),
  );

  // 동반 유형에서 자동으로 따라오는 태그
  const autoTag = COMPANION_AUTO_TAGS[companion] ?? null;
  const autoMatched =
    autoTag &&
    preferenceTags.includes(autoTag) &&
    !matchedAffinityTags.includes(autoTag)
      ? autoTag
      : null;
  const autoBonus = autoMatched ? COMPANION_AUTO_BONUS : 0;

  const matchedTags = autoMatched
    ? [...matchedAffinityTags, autoMatched]
    : matchedAffinityTags;

  // 조건 기반 감점 (하드 필터가 아니라 소프트 감점)
  const penaltyTable = collectPenalties([
    AVOID_PENALTIES[companion],
    DURATION_PENALTIES[duration],
    TRANSPORT_PENALTIES[transport],
  ]);
  const triggeredAvoidTags = avoidTags.filter((tag) => penaltyTable[tag] > 0);
  const penalty = triggeredAvoidTags.reduce(
    (sum, tag) => sum + penaltyTable[tag],
    0,
  );

  return {
    place,
    place_id: place.place_id,
    score: affinity + autoBonus - penalty,
    /** 화면에 보여줄 성향 매칭도 — 감점을 섞지 않은 순수 값 */
    matchScore: Math.round(affinity),
    matchedTags,
    autoMatchedTag: autoMatched,
    autoBonus,
    triggeredAvoidTags,
    penalty,
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
