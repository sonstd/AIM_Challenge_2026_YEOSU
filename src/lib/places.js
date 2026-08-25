import placesData from "@/data/places.json";

/**
 * 여행지 데이터 접근 레이어.
 *
 * 컴포넌트와 API 라우트는 places.json을 직접 import하지 않고 반드시 이 두 함수만 사용한다.
 * 나중에 DB를 붙일 때 이 파일 내부만 쿼리로 교체하면 되도록,
 * 지금부터 async 시그니처를 유지한다(호출부를 그대로 둘 수 있다).
 *
 * 반환값은 매번 얕은 복사본이다. 모듈 스코프 데이터는 요청 간에 공유되므로
 * 호출부가 실수로 원본을 변형하는 것을 막는다.
 */

/** @returns {Promise<Array<object>>} 여행지 20곳 전체 */
export async function getAllPlaces() {
  return placesData.map((place) => ({ ...place }));
}

/** @returns {Promise<object | null>} place_id에 해당하는 여행지, 없으면 null */
export async function getPlaceById(id) {
  const found = placesData.find((place) => place.place_id === id);
  return found ? { ...found } : null;
}
