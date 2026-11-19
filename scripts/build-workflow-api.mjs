/**
 * ComfyUI UI 워크플로(src/data/workflow_vod.json)를 **API 포맷**으로 변환한다.
 *
 * Comfy Cloud 의 POST /api/prompt 는 UI 그래프가 아니라
 * `{ "<node id>": { class_type, inputs } }` 형태만 받는다. UI 파일에는 서브그래프가
 * 들어 있어 그대로 보낼 수 없으므로, 여기서 한 번 펼쳐서 파일로 떨궈 둔다.
 *
 * 실행 (워크플로를 새로 받았을 때만)
 *   node scripts/build-workflow-api.mjs
 *
 * 노드 입력 이름은 서버의 /api/object_info 로 검증한다(.env.local 의
 * COMFY_BASE_URL / COMFYUI_API_KEY 사용). --object-info <경로> 로 캐시를 쓸 수도 있다.
 * 검증을 건너뛰려면 --no-validate.
 *
 * 결과: src/data/workflow.api.json
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "src/data/workflow_vod.json");
const TARGET = path.join(ROOT, "src/data/workflow.api.json");

/** 화면(UI)에만 있는 위젯. API 입력이 아니므로 버린다. */
const UI_ONLY_WIDGETS = new Set(["control_after_generate", "upload"]);

function readArgs() {
  const args = process.argv.slice(2);
  const get = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : null;
  };
  return {
    objectInfoPath: get("--object-info"),
    validate: !args.includes("--no-validate"),
  };
}

/** .env.local 을 직접 읽는다(스크립트라 dotenv 를 끌어오지 않는다). */
function readEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

async function loadObjectInfo({ objectInfoPath }) {
  if (objectInfoPath) {
    return JSON.parse(fs.readFileSync(objectInfoPath, "utf8"));
  }
  const env = readEnv();
  const base = env.COMFY_BASE_URL;
  const key = env.COMFYUI_API_KEY;
  if (!base || !key) {
    throw new Error(
      "COMFY_BASE_URL / COMFYUI_API_KEY 가 없습니다. --object-info <경로> 또는 --no-validate 를 쓰세요.",
    );
  }
  const response = await fetch(`${base.replace(/\/$/, "")}/api/object_info`, {
    headers: { "X-API-Key": key },
  });
  if (!response.ok) {
    throw new Error(`object_info 조회 실패: ${response.status}`);
  }
  return response.json();
}

/**
 * 어떤 클래스가 받을 수 있는 입력 이름을 모두 모은다.
 *
 * 동적 콤보(COMFY_DYNAMICCOMBO_V3)는 고른 선택지마다 하위 입력이 따로 붙는데,
 * **서버는 이 하위 입력을 "부모.자식" 형태의 이름 그대로 받는다**
 * (shorter_size 가 아니라 resize_type.shorter_size). UI 파일의 키와 같은 모양이라
 * 그대로 두면 된다.
 */
function allowedInputs(spec) {
  const names = new Set();

  const walk = (group, prefix) => {
    for (const [name, definition] of Object.entries(group ?? {})) {
      const full = prefix ? `${prefix}.${name}` : name;
      names.add(full);
      if (!Array.isArray(definition)) continue;
      const [type, options] = definition;
      if (type !== "COMFY_DYNAMICCOMBO_V3") continue;
      for (const option of options?.options ?? []) {
        walk(option.inputs?.required, full);
        walk(option.inputs?.optional, full);
      }
    }
  };

  walk(spec?.input?.required, "");
  walk(spec?.input?.optional, "");
  return names;
}

/** 링크 표기가 두 가지다(최상위는 배열, 서브그래프는 객체). 한 가지로 맞춘다. */
function normalizeLink(link) {
  if (Array.isArray(link)) {
    return {
      id: link[0],
      origin_id: link[1],
      origin_slot: link[2],
      target_id: link[3],
      target_slot: link[4],
    };
  }
  return link;
}

function buildScope({ nodes, links, parent = null, instance = null, prefix = "" }) {
  return {
    nodes: new Map(nodes.map((node) => [node.id, node])),
    links: new Map((links ?? []).map((link) => [normalizeLink(link).id, normalizeLink(link)])),
    parent,
    instance,
    prefix,
  };
}

export function convert(graph, objectInfo) {
  const subgraphs = new Map(
    (graph.definitions?.subgraphs ?? []).map((definition) => [definition.id, definition]),
  );
  const api = {};
  const warnings = [];

  const keyOf = (scope, nodeId) => `${scope.prefix}${nodeId}`;
  const isSubgraph = (node) => subgraphs.has(node.type);

  /** 노드 출력 하나가 API 포맷에서 어떤 [노드키, 슬롯]이 되는지 찾는다. */
  function resolveOutput(scope, nodeId, slot) {
    const node = scope.nodes.get(nodeId);
    if (!node) throw new Error(`노드를 찾을 수 없습니다: ${nodeId}`);
    if (!isSubgraph(node)) return [keyOf(scope, nodeId), slot];

    // 서브그래프 인스턴스의 출력 → 안쪽에서 출력 노드(-20)로 들어가는 링크를 따라간다.
    const inner = enterSubgraph(scope, node);
    const boundary = [...inner.links.values()].find(
      (link) => link.target_id === -20 && link.target_slot === slot,
    );
    if (!boundary) throw new Error(`서브그래프 출력이 비어 있습니다: ${nodeId}[${slot}]`);
    return resolveOutput(inner, boundary.origin_id, boundary.origin_slot);
  }

  /**
   * 입력 하나를 푼다.
   * 반환: { link: [노드키, 슬롯] } 또는 { value } (서브그래프 경계에서 상수로 들어온 값)
   */
  function resolveInput(scope, node, input) {
    const link = scope.links.get(input.link);
    if (!link) throw new Error(`링크를 찾을 수 없습니다: ${node.id}.${input.name}`);

    if (link.origin_id !== -10) {
      return { link: resolveOutput(scope, link.origin_id, link.origin_slot) };
    }

    // 서브그래프 입력 경계 — 바깥 인스턴스의 같은 번호 입력으로 올라간다.
    const outerInput = scope.instance.inputs?.[link.origin_slot];
    if (!outerInput) throw new Error(`서브그래프 입력이 없습니다: ${link.origin_slot}`);
    if (outerInput.link != null) {
      return resolveInput(scope.parent, scope.instance, outerInput);
    }
    // 연결이 없으면 인스턴스 위젯에 적힌 값이 그대로 들어온다(프롬프트 텍스트 등).
    return { value: scope.instance.widgets_values_named?.[outerInput.name] };
  }

  function enterSubgraph(scope, node) {
    const definition = subgraphs.get(node.type);
    return buildScope({
      nodes: definition.nodes,
      links: definition.links,
      parent: scope,
      instance: node,
      // 구분자는 ComfyUI 자체 내보내기와 같은 ":" 를 쓴다(실행 캐시 키가 맞아떨어진다).
      prefix: `${keyOf(scope, node.id)}:`,
    });
  }

  function emit(scope) {
    for (const node of scope.nodes.values()) {
      if (node.mode === 4 || node.mode === 2) {
        warnings.push(`건너뜀(뮤트/바이패스): ${node.id} ${node.type}`);
        continue;
      }
      if (isSubgraph(node)) {
        emit(enterSubgraph(scope, node));
        continue;
      }

      const spec = objectInfo?.[node.type];
      if (objectInfo && !spec) {
        warnings.push(`서버에 없는 노드: ${node.type}`);
      }
      const allowed = spec ? allowedInputs(spec) : null;
      const inputs = {};

      // ① 위젯 값. 동적 콤보의 하위 입력("부모.자식")은 이름을 그대로 둔다.
      for (const [name, value] of Object.entries(node.widgets_values_named ?? {})) {
        if (UI_ONLY_WIDGETS.has(name)) continue;
        if (allowed && !allowed.has(name)) {
          warnings.push(`알 수 없는 위젯 무시: ${node.type}.${name}`);
          continue;
        }
        inputs[name] = value;
      }

      // ② 연결된 입력. 위젯 값보다 우선한다.
      for (const input of node.inputs ?? []) {
        if (input.link == null) continue;
        const resolved = resolveInput(scope, node, input);
        if (allowed && !allowed.has(input.name)) {
          warnings.push(`알 수 없는 입력 무시: ${node.type}.${input.name}`);
          continue;
        }
        inputs[input.name] = "link" in resolved ? resolved.link : resolved.value;
      }

      api[keyOf(scope, node.id)] = {
        class_type: node.type,
        _meta: { title: node.title ?? node.type },
        inputs,
      };
    }
  }

  emit(buildScope({ nodes: graph.nodes, links: graph.links }));

  // 필수 입력이 빠졌는지 확인한다. 빠진 채로 보내면 400 으로 돌아온다.
  if (objectInfo) {
    for (const [id, node] of Object.entries(api)) {
      const required = Object.keys(objectInfo[node.class_type]?.input?.required ?? {});
      for (const name of required) {
        if (!(name in node.inputs)) {
          warnings.push(`필수 입력 누락: ${id} ${node.class_type}.${name}`);
        }
      }
    }
  }

  return { api, warnings };
}

async function main() {
  const args = readArgs();
  const graph = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
  const objectInfo = args.validate ? await loadObjectInfo(args) : null;

  const { api, warnings } = convert(graph, objectInfo);

  fs.writeFileSync(TARGET, `${JSON.stringify(api, null, 2)}\n`, "utf8");

  console.log(`노드 ${Object.keys(api).length}개 → ${path.relative(ROOT, TARGET)}`);
  for (const warning of warnings) console.log(`  · ${warning}`);
  if (!warnings.length) console.log("  · 경고 없음");
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
