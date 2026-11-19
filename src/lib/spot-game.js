import { diffKindsFor, GAME_OVERLAYS } from "@/config/game-overlays";

/** 라운드 제한 시간 */
export const ROUND_DURATION_MS = 90_000;
/** 한 라운드의 틀린 곳 개수 */
export const DIFF_COUNT = 4;
/** 힌트 버튼이 열리는 시점 */
export const HINT_AFTER_MS = 30_000;
/** 정답 판정 반경(표시 좌표계 기준 px) */
export const HIT_RADIUS_PX = 40;
/** 힌트가 반짝이는 시간 */
export const HINT_FLASH_MS = 1000;

/** 한 그림에 올리는 요소 수. 정답 4개 + 미끼 2개. */
const ITEM_COUNT = 6;

/** 좌표 범위(%) — 테두리에 딱 붙으면 잘려서 못 찾는다. */
const X_RANGE = [10, 90];
const Y_RANGE = [13, 87];
/** 요소 크기 — 패널 높이 대비 %. 사진 위에서 알아볼 수 있는 최소 크기 이상. */
const SIZE_RANGE = [10, 15];

/**
 * 두 정답이 판정 반경 안에서 겹치면 "어느 쪽을 눌렀는지" 애매해진다.
 * 전시 태블릿의 표시 크기를 기준으로 가로세로 비율을 반영해 거리를 재고,
 * 판정 반경(40px)의 두 배 이상 떨어뜨린다.
 */
const NOMINAL_PANEL = { width: 440, height: 275 };
const MIN_PX_GAP = HIT_RADIUS_PX * 2;

const randomBetween = (min, max) => min + Math.random() * (max - min);

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pixelDistance(a, b) {
  const dx = ((a.x - b.x) / 100) * NOMINAL_PANEL.width;
  const dy = ((a.y - b.y) / 100) * NOMINAL_PANEL.height;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 서로 충분히 떨어진 좌표를 ITEM_COUNT 개 뽑는다. */
function scatter() {
  const points = [];
  let guard = 0;

  while (points.length < ITEM_COUNT && guard < 4000) {
    guard += 1;
    const candidate = {
      x: randomBetween(X_RANGE[0], X_RANGE[1]),
      y: randomBetween(Y_RANGE[0], Y_RANGE[1]),
    };
    if (points.every((point) => pixelDistance(point, candidate) >= MIN_PX_GAP)) {
      points.push(candidate);
    }
  }

  return points;
}

/**
 * 한 라운드를 만든다. 사진은 추천 장소의 것을 그대로 쓴다.
 *
 * **무작위 값은 전부 여기서 만든다.** 화면 렌더 중에 Math.random 을 부르면
 * 다시 그릴 때마다 그림이 바뀌므로, 라운드는 이벤트 핸들러에서 한 번만 만든다.
 */
export function buildRound(place, roundIndex) {
  const points = scatter();
  const types = shuffle(GAME_OVERLAYS);

  const items = points.map((point, i) => {
    const overlay = types[i % types.length];
    return {
      key: `r${roundIndex}-i${i}`,
      overlayId: overlay.id,
      label: overlay.label,
      x: point.x,
      y: point.y,
      size: randomBetween(SIZE_RANGE[0], SIZE_RANGE[1]),
      rotate: randomBetween(-14, 14),
      color: overlay.colors[0],
      altColor: overlay.colors[1] ?? overlay.colors[0],
      diff: null,
    };
  });

  /*
   * 정답으로 쓸 요소를 고르고, 그 요소가 지원하는 변형 중 하나를 준다.
   * 좌우 반전은 한 라운드에 **한 개까지만** 쓴다. 제거나 색 변경보다 눈에 덜 띄어서
   * 여러 개가 겹치면 라운드가 통째로 안 풀린다.
   */
  const answerCount = Math.min(DIFF_COUNT, items.length);
  let flipUsed = false;
  for (const item of shuffle(items).slice(0, answerCount)) {
    const overlay = types.find((type) => type.id === item.overlayId);
    const kinds = diffKindsFor(overlay).filter(
      (kind) => kind !== "flip" || !flipUsed,
    );
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    if (kind === "flip") flipUsed = true;
    item.diff = kind;
  }

  return {
    key: `round-${roundIndex}`,
    placeId: place.place_id,
    placeName: place.place_name,
    image: place.images?.[0] ?? null,
    items,
    answers: items.filter((item) => item.diff).map((item) => item.key),
  };
}

/**
 * 라운드 목록을 미리 만든다.
 *
 * 라운드마다 다른 추천 장소를 쓰고, 고른 장소가 첫 라운드로 온다.
 * 안전장치(VIDEO_TIMEOUT_MS)까지 버틸 만큼 넉넉히 만들어 두어
 * 게임이 중간에 바닥나지 않게 한다.
 */
export function buildRounds(recommendations, selectedPlaceId, count) {
  const ordered = [
    ...recommendations.filter((item) => item.place_id === selectedPlaceId),
    ...recommendations.filter((item) => item.place_id !== selectedPlaceId),
  ];
  if (!ordered.length) return [];

  return Array.from({ length: count }, (_, index) =>
    buildRound(ordered[index % ordered.length], index),
  );
}

/**
 * 누른 지점에서 가장 가까운 정답을 찾는다. 판정 반경을 벗어나면 null.
 *
 * @param {object[]} items buildRound 이 만든 요소 목록
 * @param {{x: number, y: number, width: number, height: number}} tap 패널 안의 px 좌표와 패널 크기
 * @param {string[]} alreadyFound 이미 찾은 정답 key
 */
export function findHit(items, tap, alreadyFound = []) {
  let best = null;
  let bestDistance = Infinity;

  for (const item of items) {
    if (!item.diff || alreadyFound.includes(item.key)) continue;
    const dx = (item.x / 100) * tap.width - tap.x;
    const dy = (item.y / 100) * tap.height - tap.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= HIT_RADIUS_PX && distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }

  return best;
}
