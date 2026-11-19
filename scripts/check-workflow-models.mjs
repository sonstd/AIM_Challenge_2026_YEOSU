/**
 * 워크플로가 부르는 **모델 이름이 지금 서버에 있는지** 확인한다.
 *
 * 클라우드의 모델 목록은 말없이 바뀐다. 목록에 없는 이름이 하나라도 있으면
 * 영상 생성이 제출 직후 검증에서 떨어진다(value_not_in_list). 그 전에 여기서 잡는다.
 *
 *   node scripts/check-workflow-models.mjs
 *
 * .env.local 의 COMFY_BASE_URL / COMFYUI_API_KEY 를 쓴다.
 * 문제가 있으면 종료 코드 1 로 끝난다.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const WORKFLOW = path.join(ROOT, "src/data/workflow.api.json");

/** 값이 "모델 이름"인 입력들. 이 이름들만 목록과 대조한다. */
const MODEL_FIELDS = new Set([
  "ckpt_name",
  "lora_name",
  "model_name",
  "text_encoder",
  "vae_name",
  "clip_name",
  "upscale_model",
]);

function readEnv() {
  const file = path.join(ROOT, ".env.local");
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

/** ComfyUI 는 두 가지 형식을 섞어 쓴다: ["COMBO",{options}] 또는 [[...], {}] */
function optionsOf(spec) {
  if (!spec) return null;
  if (Array.isArray(spec[0])) return spec[0];
  return spec[1]?.options ?? null;
}

function fieldOptions(objectInfo, classType, field) {
  const input = objectInfo[classType]?.input;
  return optionsOf(input?.required?.[field] ?? input?.optional?.[field]);
}

async function main() {
  const env = readEnv();
  const base = env.COMFY_BASE_URL?.replace(/\/$/, "");
  const key = env.COMFYUI_API_KEY;
  if (!base || !key) {
    console.error("COMFY_BASE_URL / COMFYUI_API_KEY 가 .env.local 에 없습니다.");
    process.exit(1);
  }

  const response = await fetch(`${base}/api/object_info`, {
    headers: { "X-API-Key": key },
  });
  if (!response.ok) {
    console.error(`object_info 조회 실패: ${response.status}`);
    process.exit(1);
  }
  const objectInfo = await response.json();
  const workflow = JSON.parse(fs.readFileSync(WORKFLOW, "utf8"));

  let checked = 0;
  const problems = [];

  for (const [id, node] of Object.entries(workflow)) {
    if (!objectInfo[node.class_type]) {
      problems.push(`${id} ${node.class_type} — 서버에 없는 노드`);
      continue;
    }
    for (const [field, value] of Object.entries(node.inputs ?? {})) {
      if (!MODEL_FIELDS.has(field) || typeof value !== "string") continue;
      checked += 1;
      const options = fieldOptions(objectInfo, node.class_type, field);
      if (!options) continue; // 목록이 없는 입력(자유 입력)은 건너뛴다
      if (!options.includes(value)) {
        const hint = options.filter((o) => o.slice(0, 8) === value.slice(0, 8)).slice(0, 3);
        problems.push(
          `${id} ${node.class_type}.${field}\n     없음: ${value}` +
            (hint.length ? `\n     비슷한 것: ${hint.join(", ")}` : ""),
        );
      }
    }
  }

  console.log(`모델 이름 ${checked}개 확인`);
  if (!problems.length) {
    console.log("모두 서버에 있습니다.");
    return;
  }
  console.log(`\n문제 ${problems.length}건:`);
  for (const problem of problems) console.log(`  · ${problem}`);
  process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
