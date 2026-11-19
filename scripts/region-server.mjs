/**
 * 평가용 지역 추천 조회 API. **명세가 고정이라 Next 와 별도 포트로 띄운다.**
 *
 *   GET http://{HOST}:5000/current_region?region_id=YEOSU
 *
 * | 항목 | 값 |
 * | --- | --- |
 * | Method | GET |
 * | Port | 5000 (REGION_API_PORT 로 바꿀 수 있다) |
 * | Bind | 0.0.0.0 (필수 — 바깥에서 들어온다) |
 * | 응답 | JSON, UTF-8, 200 OK |
 *
 * 돌려주는 건 **가장 최근에 /api/recommend 가 만든 응답 본문 그대로**다
 * (data/recommendations/{region_id}.json). 여기서 다시 만들지 않는다.
 *
 * 단독 실행:  node scripts/region-server.mjs
 * 같이 실행:  npm run dev  (scripts/serve.mjs 가 Next 와 함께 띄운다)
 */

import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readLatestRecommendation } from "../src/lib/snapshot.js";

export const REGION_API_PORT = Number(process.env.REGION_API_PORT ?? 5000);
/** 팀별 고정 IP 로 들어오므로 로컬호스트만 열면 안 된다. */
const BIND_HOST = "0.0.0.0";
const ENDPOINT = "/current_region";

function send(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    // 조회 전용 공개 데이터라 브라우저에서 바로 확인할 수 있게 열어 둔다.
    "Access-Control-Allow-Origin": "*",
  });
  response.end(body);
}

function sendError(response, status, message) {
  send(response, status, `${JSON.stringify({ error: message }, null, 2)}\n`);
}

async function handle(request, response) {
  if (request.method !== "GET") {
    return sendError(response, 405, "GET 만 지원합니다.");
  }

  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname !== ENDPOINT) {
    return sendError(response, 404, `${ENDPOINT} 만 지원합니다.`);
  }

  const regionId = url.searchParams.get("region_id");
  if (!regionId) {
    return sendError(response, 400, "region_id 가 없습니다.");
  }

  const body = await readLatestRecommendation(regionId);
  if (body === null) {
    return sendError(
      response,
      404,
      `${regionId} 의 추천 결과가 아직 없습니다. 먼저 추천을 한 번 생성해 주세요.`,
    );
  }

  // 저장된 글자를 그대로 내보낸다. 다시 직렬화하면 제출 파일과 응답이 달라질 수 있다.
  send(response, 200, body);
}

export function startRegionServer({ port = REGION_API_PORT } = {}) {
  const server = http.createServer((request, response) => {
    handle(request, response).catch((error) => {
      console.error("[region-api] 처리 실패:", error);
      if (!response.headersSent) sendError(response, 500, "서버 오류");
    });
  });

  server.on("error", (error) => {
    // 포트가 이미 쓰이고 있어도 본 서비스까지 멈추지는 않는다.
    console.error(`[region-api] ${port} 포트를 열지 못했습니다: ${error.message}`);
  });

  server.listen(port, BIND_HOST, () => {
    console.log(`[region-api] http://${BIND_HOST}:${port}${ENDPOINT}?region_id=YEOSU`);
  });

  return server;
}

// 직접 실행했을 때만 띄운다(serve.mjs 에서 import 할 때는 띄우지 않는다).
const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (entry === import.meta.url || entry === pathToFileURL(fileURLToPath(import.meta.url)).href) {
  startRegionServer();
}
