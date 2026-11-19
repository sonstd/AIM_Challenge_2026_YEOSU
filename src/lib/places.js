import axisData from "@/data/place-axis.json";
import placesData from "@/data/places.json";

/**
 * 여행지 데이터 접근 레이어.
 *
 * 컴포넌트와 API 라우트는 JSON을 직접 import하지 않고 반드시 이 두 함수만 사용한다.
 * 나중에 DB를 붙일 때 이 파일 내부만 쿼리로 교체하면 되도록,
 * 지금부터 async 시그니처를 유지한다(호출부를 그대로 둘 수 있다).
 *
 * 성향 좌표(place-axis.json)는 여기서 합쳐 준다. 호출부는 두 파일이 나뉘어 있다는 걸
 * 알 필요가 없고, places.json 원본은 그대로 유지된다.
 *
 * 반환값은 매번 얕은 복사본이다. 모듈 스코프 데이터는 요청 간에 공유되므로
 * 호출부가 실수로 원본을 변형하는 것을 막는다.
 */

function withAxis(place) {
  const axis = axisData[place.place_id];
  if (!axis) {
    // 좌표가 없으면 추천 순위가 조용히 틀어지므로 눈에 띄게 알린다.
    console.warn(
      `[places] ${place.place_id} 의 성향 좌표가 place-axis.json 에 없습니다. (0, 0)으로 처리합니다.`,
    );
    return { ...place, axis: { x: 0, y: 0 } };
  }
  return { ...place, axis: { x: axis.x, y: axis.y } };
}

/** @returns {Promise<Array<object>>} 여행지 20곳 전체 */
export async function getAllPlaces() {
  return placesData.map(withAxis);
}

/** @returns {Promise<object | null>} place_id에 해당하는 여행지, 없으면 null */
export async function getPlaceById(id) {
  const found = placesData.find((place) => place.place_id === id);
  return found ? withAxis(found) : null;
}
