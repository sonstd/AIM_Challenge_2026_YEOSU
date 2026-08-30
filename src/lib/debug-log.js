/**
 * ⚠️⚠️ 제출 전 삭제 대상 — 개발 확인용 디버그 로거 ⚠️⚠️
 *
 * Agent에 보낸 프롬프트 / 받은 응답 / 최종 JSON을 서버 콘솔에 찍는다.
 * 서버사이드에서 실행되므로 출력은 브라우저가 아니라 `npm run dev` 를 돌린
 * **터미널**에 나온다.
 *
 * ── 삭제 방법 (총 3개 파일) ─────────────────────────────────
 *  1. 이 파일(src/lib/debug-log.js)을 삭제한다.
 *  2. src/lib/agent.js
 *     - 맨 위 `import { logAgentRequest, logAgentResponse } ...` 한 줄 삭제
 *     - `// [DEBUG]` 주석이 달린 호출 2곳 삭제
 *     - requestRecommendations 파라미터의 `attempt = 1,` / `maxAttempts = 1,` 2줄 삭제
 *  3. src/app/api/recommend/route.js
 *     - 맨 위 `import { logFinalResponse } ...` 한 줄 삭제
 *     - `// [DEBUG]` 주석이 달린 호출 1곳 삭제
 *     - requestRecommendations 호출의 `attempt` / `maxAttempts` 인자 2줄 삭제
 *       (로그에 시도 횟수를 찍기 위해서만 넘기는 값이다)
 *  → 남은 곳이 없는지 확인: `grep -rn "DEBUG" src/`
 *  → `npm run build` 가 통과하면 잔재가 없는 것이다.
 *
 * 지우지 않고 잠깐 끄고 싶으면 .env.local 에 DEBUG_AGENT=0 을 넣는다.
 * ────────────────────────────────────────────────────────────
 */

const ENABLED = process.env.DEBUG_AGENT !== "0";

const WIDTH = 78;

function banner(title) {
  console.log("\n" + "━".repeat(WIDTH));
  console.log(`  ${title}`);
  console.log("━".repeat(WIDTH));
}

function divider(title) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, WIDTH - title.length - 4))}`);
}

/** ① Agent에 보내는 텍스트 */
export function logAgentRequest({
  attempt,
  maxAttempts,
  model,
  systemInstruction,
  prompt,
}) {
  if (!ENABLED) return;

  banner(`[DEBUG] Agent 요청  (시도 ${attempt}/${maxAttempts})  model=${model}`);
  divider(`systemInstruction (${systemInstruction.length}자)`);
  console.log(systemInstruction);
  divider(`prompt (${prompt.length}자)`);
  console.log(prompt);
}

/**
 * ② Agent에게서 받은 응답
 * 호출 자체가 실패한 경우는 여기까지 오지 않는다 —
 * route.js 의 재시도 루프가 `[recommend] Agent 호출 실패` 로 따로 찍는다.
 */
export function logAgentResponse({ attempt, maxAttempts, raw, parsed }) {
  if (!ENABLED) return;

  banner(`[DEBUG] Agent 응답  (시도 ${attempt}/${maxAttempts})`);
  divider(`원본 텍스트 (${String(raw ?? "").length}자)`);
  console.log(raw);

  if (parsed) {
    divider("파싱 결과");
    for (const [index, item] of (parsed.recommendations ?? []).entries()) {
      const sentences = String(item?.recommend_reason ?? "")
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      console.log(
        `  ${index + 1}. ${item?.place_id} — ${sentences.length}문장`,
      );
    }
  }
}

/** ③ 클라이언트에 내려보내는 최종 JSON */
export function logFinalResponse({ source, body }) {
  if (!ENABLED) return;

  banner(`[DEBUG] 최종 응답 JSON  (source=${source})`);
  console.log(JSON.stringify(body, null, 2));
  divider("요약");
  for (const [index, rec] of body.recommendations.entries()) {
    console.log(
      `  ${index + 1}위 ${rec.place_id} ${rec.place_name} — 매칭도 ${rec.match_score}% — tags [${rec.matched_tags.join(", ")}]`,
    );
  }
  console.log("━".repeat(WIDTH) + "\n");
}
