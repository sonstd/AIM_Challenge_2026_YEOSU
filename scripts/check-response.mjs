/**
 * 저장한 추천 API 응답(JSON 파일)이 제출 규격을 지키는지 점검한다.
 *
 *   node scripts/check-response.mjs 02_지역추천지.json
 *
 * 점검 항목: region_id / 필드 구성 / place_id 존재·중복 / 추천 3곳 /
 * 문장 수 2~5 (. ! ? 기준) / 소수점 수치 / 인용부호
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2];
if (!file) {
  console.error("사용법: node scripts/check-response.mjs <응답 JSON 파일>");
  process.exit(2);
}

const places = JSON.parse(
  fs.readFileSync(path.resolve(here, "../src/data/places.json"), "utf8"),
);
const placeIds = new Set(places.map((place) => place.place_id));
const body = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));

const TOP_KEYS = ["region_id", "recommendations"];
const ITEM_KEYS = [
  "place_id",
  "place_name",
  "recommend_reason",
  "matched_tags",
  "image_prompt",
  "images",
];

const errors = [];
const sameKeys = (obj, keys) =>
  Object.keys(obj).length === keys.length && keys.every((key) => key in obj);

if (!sameKeys(body, TOP_KEYS)) errors.push("최상위 필드가 region_id, recommendations 와 다릅니다.");
if (body.region_id !== "YEOSU") errors.push(`region_id 가 YEOSU 가 아닙니다: ${body.region_id}`);

const items = Array.isArray(body.recommendations) ? body.recommendations : [];
if (items.length !== 3) errors.push(`추천 장소가 3곳이 아닙니다: ${items.length}곳`);

const seen = new Set();
for (const item of items) {
  const id = item.place_id;
  if (!sameKeys(item, ITEM_KEYS)) errors.push(`${id}: 필드 구성이 규격과 다릅니다.`);
  if (!placeIds.has(id)) errors.push(`${id}: 기준 데이터에 없는 place_id 입니다.`);
  if (seen.has(id)) errors.push(`${id}: 중복 추천입니다.`);
  seen.add(id);

  const reason = String(item.recommend_reason ?? "");
  const sentences = reason.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length < 2 || sentences.length > 5) {
    errors.push(`${id}: 문장 수가 ${sentences.length}개입니다 (2~5개 필요).`);
  }
  if (/\d+\.\d+/.test(reason)) errors.push(`${id}: 소수점 수치가 있습니다.`);
  if (/['"‘’“”]/.test(reason)) errors.push(`${id}: 인용부호가 있습니다.`);

  console.log(`- ${id} ${item.place_name}: ${sentences.length}문장`);
}

if (errors.length) {
  console.error("\n[실패]");
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log("\n[통과] 제출 규격을 모두 만족합니다.");
