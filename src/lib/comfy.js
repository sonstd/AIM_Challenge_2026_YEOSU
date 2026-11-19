/**
 * Comfy Cloud 연동 — **서버 전용 모듈이다.** API 키가 들어 있으므로
 * 클라이언트 컴포넌트에서 import 하지 않는다(화면은 /api/video 라우트를 호출한다).
 *
 * 흐름
 *   ① 레퍼런스 시트 업로드            POST /api/upload/image
 *   ② 워크플로에 시트·프롬프트 꽂기    (src/data/workflow.api.json 복제본)
 *   ③ 실행 요청                       POST /api/prompt       → prompt_id
 *   ④ 상태 조회                       GET  /api/jobs/{id}
 *   ⑤ 결과 주소                       GET  /api/view?...     → 302 서명 URL
 *
 * 워크플로는 UI 그래프를 그대로 보낼 수 없다(서브그래프가 들어 있다).
 * scripts/build-workflow-api.mjs 로 미리 API 포맷으로 펼쳐 둔 파일을 쓴다.
 */

import fs from "node:fs/promises";
import path from "node:path";

import workflowTemplate from "@/data/workflow.api.json";

/**
 * 요청마다 값을 갈아 끼우는 노드. 워크플로를 새로 받으면 id 가 바뀔 수 있어
 * 호출할 때마다 class_type 을 확인한다(조용히 엉뚱한 노드를 고치지 않도록).
 */
const NODE = {
  image: { id: "2004", classType: "LoadImage" },
  prompt: { id: "5103:2483", classType: "CLIPTextEncode" },
  save: { id: "4852", classType: "SaveVideo" },
  /* 시드 두 개. 같은 class_type 이 둘이라 제목까지 확인한다. */
  noise: { id: "5103:4832", classType: "RandomNoise", title: "RandomNoise" },
  noise2: { id: "5103:5112", classType: "RandomNoise", title: "Stage2 Noise (fixed)" },
};

/** seed.json 의 키 → 위 노드 이름. */
const SEED_KEYS = { RandomNoise: "noise", Stage2Noise: "noise2" };

/** 장소/캐릭터별 prompt.txt + seed.json 이 들어 있는 곳. 전부 서버 안에 둔다. */
const VOD_DIR = path.join(process.cwd(), "public/vod_gen");
const SHEET_DIR = path.join(process.cwd(), "public/images/reference_sheets");

/**
 * 생성 도구가 프롬프트 앞에 붙여 놓은 머리말. 본문이 아니라서 떼어 낸다.
 * 파일에 따라 "male_01" 같은 이름 줄이 먼저 오기도 하고 없기도 해서 반복해서 걷어낸다.
 */
function stripPromptHeaders(text, slug) {
  let value = text.replace(/\r\n/g, "\n").trim();
  const header = new RegExp(`^(?:${slug}|Generated video:)[ \\t]*\\n`);
  for (let guard = 0; guard < 4; guard += 1) {
    const next = value.replace(header, "").trim();
    if (next === value) break;
    value = next;
  }
  return value;
}

/** 장소 id 모양. 경로에 끼워 넣기 전에 반드시 통과시킨다(경로 탈출 방지). */
const PLACE_ID_PATTERN = /^YEOSU_\d{3}$/;

/** 같은 시트를 매번 올리지 않도록 올린 이름을 기억한다(클라우드는 내용 주소 저장이라 결과가 같다). */
const uploadedSheets = new Map();
/** 프롬프트·시드 캐시. */
const recipeCache = new Map();

export class ComfyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ComfyError";
    this.code = code;
  }
}

function config() {
  const base = process.env.COMFY_BASE_URL;
  const key = process.env.COMFYUI_API_KEY;
  if (!base || !key) {
    throw new ComfyError(
      "CONFIG",
      "COMFY_BASE_URL / COMFYUI_API_KEY 가 .env.local 에 없습니다.",
    );
  }
  return { base: base.replace(/\/$/, ""), key };
}

/**
 * 캐릭터 id → 파일 이름. MALE_2 → male_02, FEMALE_1 → female_01.
 * 레퍼런스 시트와 프롬프트가 같은 규칙을 쓴다.
 */
export function characterFileSlug(characterId) {
  const match = /^(MALE|FEMALE)_([1-9])$/.exec(String(characterId ?? ""));
  if (!match) throw new ComfyError("BAD_CHARACTER", `캐릭터 id 가 올바르지 않습니다: ${characterId}`);
  return `${match[1].toLowerCase()}_0${match[2]}`;
}

export function assertPlaceId(placeId) {
  if (!PLACE_ID_PATTERN.test(String(placeId ?? ""))) {
    throw new ComfyError("BAD_PLACE", `장소 id 가 올바르지 않습니다: ${placeId}`);
  }
  return placeId;
}

/** 로컬 파일을 읽는다. 없거나 비어 있으면 null. */
async function readLocal(...segments) {
  try {
    const text = await fs.readFile(path.join(VOD_DIR, ...segments), "utf8");
    return text.trim() || null;
  } catch {
    return null;
  }
}

/** seed.json 본문 → { RandomNoise?: number, Stage2Noise?: number } */
function parseSeeds(raw, where) {
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`[comfy] seed.json 을 읽지 못했습니다(형식 오류): ${where}`);
    return {};
  }

  const seeds = {};
  for (const key of Object.keys(SEED_KEYS)) {
    const value = parsed?.[key];
    if (Number.isFinite(value)) seeds[key] = value;
    else if (value != null) console.warn(`[comfy] 시드 값이 숫자가 아닙니다: ${where} ${key}`);
  }
  return seeds;
}

/**
 * 장소·캐릭터에 지정된 **프롬프트와 시드**를 읽는다. 전부 서버 안에 있는 파일이다.
 *
 *   public/vod_gen/{장소id}/{캐릭터}/prompt.txt   생성 프롬프트(필수)
 *   public/vod_gen/{장소id}/{캐릭터}/seed.json    시드 2개(선택)
 *
 * 시드가 없으면 워크플로에 적힌 기본 시드를 그대로 쓴다.
 *
 * @returns {Promise<{prompt: string, seeds: object}>}
 */
export async function loadVideoRecipe(placeId, characterId) {
  assertPlaceId(placeId);
  const slug = characterFileSlug(characterId);
  const where = `${placeId}/${slug}`;
  if (recipeCache.has(where)) return recipeCache.get(where);

  const [prompt, seedRaw] = await Promise.all([
    readLocal(placeId, slug, "prompt.txt"),
    readLocal(placeId, slug, "seed.json"),
  ]);

  if (!prompt) {
    throw new ComfyError(
      "PROMPT_EMPTY",
      `생성 프롬프트가 아직 없습니다: vod_gen/${where}/prompt.txt`,
    );
  }

  const recipe = {
    prompt: stripPromptHeaders(prompt, slug),
    seeds: parseSeeds(seedRaw, where),
  };
  recipeCache.set(where, recipe);
  return recipe;
}

/** 레퍼런스 시트를 올리고 ComfyUI 가 아는 파일 이름을 돌려받는다. */
export async function uploadReferenceSheet(placeId, characterId) {
  assertPlaceId(placeId);
  const slug = characterFileSlug(characterId);
  const cacheKey = `${placeId}/${slug}`;
  if (uploadedSheets.has(cacheKey)) return uploadedSheets.get(cacheKey);

  const file = path.join(SHEET_DIR, placeId, `${slug}.png`);
  let bytes;
  try {
    bytes = await fs.readFile(file);
  } catch {
    throw new ComfyError("SHEET_NOT_FOUND", `레퍼런스 시트가 없습니다: ${cacheKey}.png`);
  }

  const { base, key } = config();
  const form = new FormData();
  form.append("image", new Blob([bytes], { type: "image/png" }), `${placeId}_${slug}.png`);
  form.append("type", "input");

  const response = await fetch(`${base}/api/upload/image`, {
    method: "POST",
    headers: { "X-API-Key": key },
    body: form,
  });
  if (!response.ok) {
    throw new ComfyError("UPLOAD_FAILED", `시트 업로드 실패 (${response.status})`);
  }

  const result = await response.json();
  const name = result?.name;
  if (!name) throw new ComfyError("UPLOAD_FAILED", "업로드 응답에 파일 이름이 없습니다.");

  uploadedSheets.set(cacheKey, name);
  return name;
}

/** 템플릿을 복제해 이번 요청 값으로 갈아 끼운다. 원본은 절대 건드리지 않는다. */
export function buildGraph({ imageName, promptText, seeds = {} }) {
  const graph = structuredClone(workflowTemplate);

  for (const [role, { id, classType, title }] of Object.entries(NODE)) {
    const node = graph[id];
    const matches = node?.class_type === classType && (!title || node?._meta?.title === title);
    if (!matches) {
      throw new ComfyError(
        "WORKFLOW_MISMATCH",
        `워크플로의 ${role} 노드(${id})가 ${title ?? classType} 이 아닙니다. scripts/build-workflow-api.mjs 로 다시 만들고 NODE 를 맞춰 주세요.`,
      );
    }
  }

  graph[NODE.image.id].inputs.image = imageName;
  graph[NODE.prompt.id].inputs.text = promptText;

  // 지정된 시드가 있을 때만 바꾼다. 없으면 워크플로에 적힌 값을 그대로 쓴다.
  for (const [seedKey, role] of Object.entries(SEED_KEYS)) {
    const value = seeds[seedKey];
    if (Number.isFinite(value)) graph[NODE[role].id].inputs.noise_seed = value;
  }

  return graph;
}

/**
 * 같은 워크플로라도 배정된 머신에 모델이 아직 없으면 검증에서 바로 떨어진다
 * (value_not_in_list). 다른 머신에 걸리면 그대로 돌아가므로 몇 번 다시 보낸다.
 * 검증 실패는 GPU 를 쓰지 않아 재시도 비용이 없다.
 */
const MAX_SUBMIT_ATTEMPTS = 3;
/** 보낸 뒤 이만큼은 지켜본다. 검증 실패는 보통 2~3초 안에 돌아온다. */
const VALIDATION_WATCH_MS = 9000;
const WATCH_INTERVAL_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function submitGraph(graph) {
  const { base, key } = config();
  const response = await fetch(`${base}/api/prompt`, {
    method: "POST",
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: graph }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || result?.error) {
    const detail = result?.error?.message ?? result?.error ?? response.status;
    throw new ComfyError("SUBMIT_FAILED", `생성 요청이 거절됐습니다: ${detail}`);
  }
  if (!result?.prompt_id) {
    throw new ComfyError("SUBMIT_FAILED", "응답에 prompt_id 가 없습니다.");
  }
  return result.prompt_id;
}

/** 보내자마자 떨어졌는지 잠깐 지켜본다. 떨어졌으면 사유를, 아니면 null 을 준다. */
async function watchForEarlyFailure(jobId) {
  const deadline = Date.now() + VALIDATION_WATCH_MS;
  while (Date.now() < deadline) {
    await sleep(WATCH_INTERVAL_MS);
    const job = await fetchJob(jobId);
    const status = job?.execution_status?.status_str ?? job?.status ?? "";
    if (FAILED.has(status)) {
      return job?.execution_error?.exception_message ?? `생성이 실패했습니다 (${status})`;
    }
    // 실행이 시작됐거나 이미 끝났으면 검증은 통과한 것이다. 더 지켜볼 필요가 없다.
    if (job?.execution_start_time || DONE.has(status)) return null;
  }
  return null;
}

/** 생성을 시작하고 prompt_id 를 돌려준다. */
export async function startJob({ placeId, characterId }) {
  const [imageName, recipe] = await Promise.all([
    uploadReferenceSheet(placeId, characterId),
    loadVideoRecipe(placeId, characterId),
  ]);
  const graph = buildGraph({
    imageName,
    promptText: recipe.prompt,
    seeds: recipe.seeds,
  });

  let lastFailure = null;
  for (let attempt = 1; attempt <= MAX_SUBMIT_ATTEMPTS; attempt += 1) {
    const jobId = await submitGraph(graph);
    lastFailure = await watchForEarlyFailure(jobId);
    if (!lastFailure) return jobId;
    console.warn(`[comfy] 시작 직후 실패, 재시도 ${attempt}/${MAX_SUBMIT_ATTEMPTS}: ${lastFailure}`);
  }

  throw new ComfyError("SUBMIT_FAILED", lastFailure);
}

/** 끝났다고 볼 수 있는 상태값. 클라우드는 success, 구버전 표기는 completed. */
const DONE = new Set(["success", "completed"]);
const FAILED = new Set(["error", "non_retryable_error", "lost", "cancelled", "failed"]);

/** 작업 기록 원본. 아직 큐에 안 잡혔으면 null. */
async function fetchJob(jobId) {
  const { base, key } = config();
  const response = await fetch(`${base}/api/jobs/${encodeURIComponent(jobId)}`, {
    headers: { "X-API-Key": key },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new ComfyError("STATUS_FAILED", `상태 조회 실패 (${response.status})`);
  }
  return response.json();
}

/**
 * 진행 상황을 본다.
 * @returns {Promise<{state: "pending"|"ready"|"failed", url?: string, message?: string}>}
 */
export async function readJob(jobId) {
  const job = await fetchJob(jobId);
  if (!job) return { state: "pending" };

  const status = job?.execution_status?.status_str ?? job?.status ?? "";
  if (FAILED.has(status)) {
    // 원인을 그대로 올려 보낸다. 워크플로가 거절된 이유를 로그에서 바로 봐야 한다.
    const reason = job?.execution_error?.exception_message;
    return {
      state: "failed",
      message: reason ? `생성이 실패했습니다: ${reason}` : `생성이 실패했습니다 (${status})`,
    };
  }
  if (!DONE.has(status)) return { state: "pending" };

  const output =
    job?.outputs?.[NODE.save.id]?.images?.[0] ??
    (job?.preview_output?.filename ? job.preview_output : null);
  if (!output?.filename) {
    return { state: "failed", message: "결과 파일을 찾지 못했습니다." };
  }

  return { state: "ready", url: await resolveDownloadUrl(output) };
}

/**
 * 결과 파일의 실제 주소를 얻는다.
 * /api/view 는 서명된 저장소 URL 로 302 를 돌려준다. **리다이렉트를 따라가면 안 된다**
 * — API 키가 저장소로 넘어간다. Location 만 읽어서 그대로 브라우저에 넘긴다.
 */
export async function resolveDownloadUrl({ filename, subfolder = "", type = "output" }) {
  const { base, key } = config();
  const query = new URLSearchParams({ filename, subfolder, type });
  const response = await fetch(`${base}/api/view?${query}`, {
    headers: { "X-API-Key": key },
    redirect: "manual",
    cache: "no-store",
  });

  const location = response.headers.get("location");
  if (location) return location;
  if (response.ok) return `${base}/api/view?${query}`;
  throw new ComfyError("VIEW_FAILED", `결과 주소를 받지 못했습니다 (${response.status})`);
}
