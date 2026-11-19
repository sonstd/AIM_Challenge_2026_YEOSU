/**
 * 틀린 그림 찾기에 올릴 SVG 요소.
 *
 * **새 이미지를 만들지 않는다.** 기존 관광지 사진(place.images[0]) 위에 아래 요소를
 * 무작위 좌표로 올려 왼쪽 그림을 만들고, 같은 배치에서 일부만 변형해 오른쪽 그림을
 * 만든다. 정답 좌표는 코드가 알고 있으니 판정이 정확하고, 배치를 무작위로 돌리면
 * 라운드가 무한히 생성된다. 수동 편집이 필요 없다.
 *
 * 색은 요소마다 `colors[0]`(기본) / `colors[1]`(색 변경 변형)을 쓴다.
 * 도형 안에서는 `var(--item)` 으로 받는다.
 *
 * `flippable` 은 **좌우를 뒤집어야 눈에 보이는** 비대칭 도형만 true 로 둔다.
 * 대칭 도형에 좌우 반전을 쓰면 아무 차이가 없어 못 찾는 정답이 된다.
 */
export const GAME_OVERLAYS = [
  {
    id: "gull",
    label: "갈매기",
    flippable: true,
    colors: ["#ffffff", "#3a3a3a"],
    elements: [
      {
        type: "path",
        d: "M2 19 Q6 3.5 12 12.5 Q17 8 22 10",
        fill: "none",
        stroke: "var(--item)",
        strokeWidth: 2.4,
        strokeLinecap: "round",
      },
    ],
  },
  {
    id: "camellia",
    label: "동백꽃",
    flippable: false,
    colors: ["#d94452", "#f7e3a1"],
    elements: [
      { type: "circle", cx: 12, cy: 5.5, r: 4.2, fill: "var(--item)" },
      { type: "circle", cx: 18.2, cy: 10, r: 4.2, fill: "var(--item)" },
      { type: "circle", cx: 15.8, cy: 17.4, r: 4.2, fill: "var(--item)" },
      { type: "circle", cx: 8.2, cy: 17.4, r: 4.2, fill: "var(--item)" },
      { type: "circle", cx: 5.8, cy: 10, r: 4.2, fill: "var(--item)" },
      { type: "circle", cx: 12, cy: 12, r: 3.4, fill: "#f6d44a" },
    ],
  },
  {
    id: "cloud",
    label: "구름",
    // 좌우를 뒤집어도 거의 같은 덩어리로 보인다. 못 찾는 정답이 되므로 반전은 쓰지 않는다.
    flippable: false,
    colors: ["#ffffff", "#9cb5c4"],
    elements: [
      {
        type: "path",
        d: "M5.5 18 a4 4 0 0 1 0.6 -7.9 A5.6 5.6 0 0 1 16.4 7.4 A4.4 4.4 0 0 1 19.6 18 z",
        fill: "var(--item)",
      },
    ],
  },
  {
    id: "boat",
    label: "작은 배",
    flippable: true,
    colors: ["#f2ead9", "#3f7f86"],
    elements: [
      { type: "path", d: "M12 3.5 L18.5 15 L12 15 z", fill: "var(--item)" },
      { type: "path", d: "M3 16.5 h18 l-3 4.5 H6 z", fill: "#7b5a3a" },
    ],
  },
  {
    id: "balloon",
    label: "풍선",
    flippable: false,
    colors: ["#e8a33d", "#6fa8dc"],
    elements: [
      { type: "ellipse", cx: 12, cy: 9, rx: 6.2, ry: 7.4, fill: "var(--item)" },
      {
        type: "path",
        d: "M12 16.4 q2.5 3 0 6",
        fill: "none",
        stroke: "#f2ead9",
        strokeWidth: 1.5,
        strokeLinecap: "round",
      },
    ],
  },
];

/** 이 요소에 쓸 수 있는 변형 종류. 제거는 모든 요소에서 가능하다. */
export function diffKindsFor(overlay) {
  const kinds = ["remove"];
  if (overlay.flippable) kinds.push("flip");
  if (overlay.colors.length > 1) kinds.push("color");
  return kinds;
}

export function getOverlay(overlayId) {
  return GAME_OVERLAYS.find((overlay) => overlay.id === overlayId) ?? null;
}
