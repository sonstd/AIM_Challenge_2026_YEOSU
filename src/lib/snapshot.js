/**
 * 가장 최근에 생성된 추천 근거 JSON 보관소. **서버 전용이다.**
 *
 * 추천 API(/api/recommend)가 응답을 만들 때마다 같은 내용을 파일로 떨궈 두고,
 * 평가용 조회 API(GET :5000/current_region?region_id=YEOSU)가 그 파일을 그대로 돌려준다.
 *
 * 파일에 적히는 건 **응답 본문 그대로**다. 화면용 값(매칭도 등)은 본문이 아니라
 * 헤더로 나가므로 섞이지 않는다. 그래서 이 파일이 곧 제출물 02번이 된다
 * (규칙 1-5: 제출 JSON 과 REST API 결과 일치).
 *
 * 조회 서버(scripts/region-server.mjs)는 Next 밖에서 도는 순수 node 스크립트라
 * 이 모듈에는 `@/` 별칭이나 외부 의존성을 쓰지 않는다.
 */

import fs from "node:fs/promises";
import path from "node:path";

/** 저장 위치. public 아래가 아니라서 정적 경로로는 노출되지 않는다. */
export const SNAPSHOT_DIR = path.join(process.cwd(), "data/recommendations");

/** 지역 id 모양. 파일 이름에 그대로 들어가므로 반드시 통과시킨다(경로 탈출 방지). */
const REGION_PATTERN = /^[A-Z][A-Z0-9_]{0,31}$/;

export function snapshotPath(regionId) {
  if (!REGION_PATTERN.test(String(regionId ?? ""))) return null;
  return path.join(SNAPSHOT_DIR, `${regionId}.json`);
}

/**
 * 응답 본문을 저장한다. 저장에 실패해도 추천 자체는 내보내야 하므로 호출부에서 삼킨다.
 *
 * @param {{region_id: string, recommendations: object[]}} body 추천 API 응답 본문
 */
export async function saveLatestRecommendation(body) {
  const file = snapshotPath(body?.region_id);
  if (!file) throw new Error(`region_id 가 올바르지 않습니다: ${body?.region_id}`);

  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
  // 사람이 열어 볼 파일이기도 해서 들여쓰기해 둔다. 파싱 결과는 응답 본문과 같다.
  await fs.writeFile(file, `${JSON.stringify(body, null, 2)}\n`, "utf8");
  return file;
}

/**
 * 저장해 둔 가장 최근 응답을 **글자 그대로** 읽는다.
 * 다시 직렬화하지 않아야 조회 API 응답과 저장 파일이 완전히 같다.
 *
 * @returns {Promise<string|null>} 없으면 null
 */
export async function readLatestRecommendation(regionId) {
  const file = snapshotPath(regionId);
  if (!file) return null;
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}
