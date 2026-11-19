/**
 * Next(3000) 와 평가용 조회 API(5000)를 **한 번에** 띄운다.
 *
 *   node scripts/serve.mjs dev     개발 서버
 *   node scripts/serve.mjs start   빌드 결과 실행
 *
 * 평가 쪽은 고정 포트 5000 으로 들어오고 운영자는 명령을 하나만 치면 되도록
 * npm run dev / npm run start 가 이 스크립트를 거친다.
 * Next 만 띄우려면 npm run dev:web / start:web 을 쓴다.
 */

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";

import { startRegionServer } from "./region-server.mjs";

const require = createRequire(import.meta.url);
const mode = process.argv[2] === "start" ? "start" : "dev";

// 조회 API 는 같은 프로세스에서 돌린다(프로세스가 하나 줄고 종료 처리도 단순해진다).
startRegionServer();

// Next 는 자식 프로세스로. npm 을 거치지 않아 OS 를 가리지 않는다.
const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, mode, ...process.argv.slice(3)], {
  stdio: "inherit",
  env: process.env,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
    process.exit(0);
  });
}

child.on("exit", (code, signal) => {
  process.exit(signal ? 1 : (code ?? 0));
});
