import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// 원본 CSV 위치. 다른 곳에 있으면 PLACES_CSV 환경변수로 덮어쓴다.
const CSV =
  process.env.PLACES_CSV ??
  path.resolve(here, "../../04_YEOSU/여행지_20_여수_utf-8.csv");
const OUT = path.resolve(here, "../src/data/places.json");

/** RFC4180-ish parser: handles quoted fields containing commas / doubled quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (c === "\r") continue;
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Hand-authored per-place image generation prompts + fixed seeds.
// Grounded in evidence_text_4 (대표 볼거리) so imagery matches the recommendation text.
const ART = {
  YEOSU_001: {
    prompt:
      "A camellia island in Yeosu, Korea: a long stone breakwater walkway leading to the island, dense red camellia blossoms lining a forest path, a white lighthouse on the cliff, bamboo grove, clear winter daylight, travel photography, wide angle, natural color",
    seeds: [1101, 1102, 1103],
  },
  YEOSU_002: {
    prompt:
      "A marine cable car crossing the sea between two hilltop parks in Yeosu, Korea, glass-bottomed crystal cabins suspended over blue water, a small island and city skyline below, golden hour, aerial travel photography, crisp detail",
    seeds: [1201, 1202, 1203],
  },
  YEOSU_003: {
    prompt:
      "A coastal world expo complex at night in Yeosu, Korea: a huge circular steel structure standing over the water, a tall tower converted from cement silos, illuminated pavilion buildings, reflections on the sea, long exposure night photography",
    seeds: [1301, 1302, 1303],
  },
  YEOSU_004: {
    prompt:
      "A large aquarium building on the Yeosu waterfront, curved wave-shaped glass facade echoing ocean swells, seaside promenade in front, bright overcast daylight, architectural exterior photography, wide angle",
    seeds: [1401, 1402, 1403],
  },
  YEOSU_005: {
    prompt:
      "A hilltop park overlooking Yeosu harbor, an observation deck with a view down onto a wooded camellia island and the island-dotted sea, a bronze admiral statue, a cable car station nearby, clear blue sky, travel photography",
    seeds: [1501, 1502, 1503],
  },
  YEOSU_006: {
    prompt:
      "A cable-stayed bridge at night in Yeosu, Korea, fan-shaped cables lit with changing colored floodlights, light trails reflected on the dark sea, city lights behind, long exposure night cityscape photography",
    seeds: [1601, 1602, 1603],
  },
  YEOSU_007: {
    prompt:
      "A small Korean Buddhist hermitage built on a rocky cliff facing the sea at sunrise, traditional tiled roof hall above the water, a narrow stone gate passage between boulders, turtle-shell patterned rock, golden sunrise over the South Sea, serene atmosphere",
    seeds: [1701, 1702, 1703],
  },
  YEOSU_008: {
    prompt:
      "A pebble beach on the Korean coast, rounded dark stones covering the shore, waves rolling the pebbles, a windbreak pine forest along the beach edge, soft morning light, calm natural landscape photography",
    seeds: [1801, 1802, 1803],
  },
  YEOSU_009: {
    prompt:
      "A small curved white sand beach in a sheltered bay, ringed by an old pine windbreak forest, calm shallow water, warm summer afternoon light, peaceful coastal photography",
    seeds: [1901, 1902, 1903],
  },
  YEOSU_010: {
    prompt:
      "A hilltop park observation deck at night overlooking Yeosu city, panoramic view of an illuminated cable-stayed bridge, a small island, and glittering city lights reflected on the sea, long exposure night panorama",
    seeds: [2001, 2002, 2003],
  },
  YEOSU_011: {
    prompt:
      "A seaside civic plaza in the old town of Yeosu, Korea, a full-size replica of a Korean turtle ship warship, a bronze statue of Admiral Yi Sun-sin, harbor water behind, blue sky, wide travel photography",
    seeds: [2101, 2102, 2103],
  },
  YEOSU_012: {
    prompt:
      "A waterfront park along the old town coast of Yeosu at night, a small red lighthouse, a lit bridge across the bay, a row of glowing night food stalls along the promenade, warm lights reflected on the water, atmospheric night photography",
    seeds: [2201, 2202, 2203],
  },
  YEOSU_013: {
    prompt:
      "A coastal wooden boardwalk park in Yeosu at night, a street of night food stalls with warm lights, a busker performing on a small stage, crowds strolling, island lights across the dark water, lively night atmosphere",
    seeds: [2301, 2302, 2303],
  },
  YEOSU_014: {
    prompt:
      "A steep hillside alley mural village in Yeosu, Korea, painted stairways and walls, narrow lanes opening to a view of the sea and a distant bridge, sunny afternoon, colorful street photography",
    seeds: [2401, 2402, 2403],
  },
  YEOSU_015: {
    prompt:
      "A monumental single-story Korean wooden government hall from the Joseon dynasty, vast hip-and-gable tiled roof supported by dozens of thick wooden columns, broad stone front steps, open hall interior columns receding in rows, overcast daylight, architectural heritage photography",
    seeds: [2501, 2502, 2503],
  },
  YEOSU_016: {
    prompt:
      "A clifftop coastal trekking path on a Korean island, a wooden viewing deck on the edge of a sheer sea cliff, deep blue southern sea below, a small fishing village harbor at the trailhead, clear sunny day, dramatic landscape photography",
    seeds: [2601, 2602, 2603],
  },
  YEOSU_017: {
    prompt:
      "A remote southern Korean island lighthouse at the end of a cliff, a shaded tunnel path of camellia trees leading toward it, rugged rock coastline and open sea beyond, soft morning haze, atmospheric travel photography",
    seeds: [2701, 2702, 2703],
  },
  YEOSU_018: {
    prompt:
      "A small Korean island coastline with dinosaur footprint fossils preserved in flat coastal bedrock, strange eroded rock formations, a sandbar path revealed at low tide connecting to a neighbouring island, bright daylight, geological travel photography",
    seeds: [2801, 2802, 2803],
  },
  YEOSU_019: {
    prompt:
      "A small art island off the Yeosu coast, a long pedestrian bridge over the sea leading to it, a grassy hill, a modern exhibition hall and outdoor sculptures, sunset light over the water, calm minimal architectural photography",
    seeds: [2901, 2902, 2903],
  },
  YEOSU_020: {
    prompt:
      "An urban artificial beach park in Yeosu, calm inner-bay water, clean white sand, a wide lawn for picnics, a yacht marina, modern apartment skyline behind, sunset over the sea, bright family-friendly travel photography",
    seeds: [3001, 3002, 3003],
  },
};

const rows = parseCsv(fs.readFileSync(CSV, "utf8"));
const header = rows[0].map((h) => h.trim());
const places = rows
  .slice(1)
  .filter((r) => r.length >= header.length && r[0].trim())
  .map((r) => {
    const rec = Object.fromEntries(
      header.map((h, i) => [h, (r[i] ?? "").trim()]),
    );
    const art = ART[rec.place_id];
    if (!art) throw new Error("No image prompt authored for " + rec.place_id);
    return {
      place_id: rec.place_id,
      place_name: rec.place_name,
      category: rec.category,
      preference_tags: rec.preference_tags,
      avoid_tags: rec.avoid_tags,
      summary: rec.summary,
      embedding_text: rec.embedding_text,
      evidence_text_1: rec.evidence_text_1,
      evidence_text_2: rec.evidence_text_2,
      evidence_text_3: rec.evidence_text_3,
      evidence_text_4: rec.evidence_text_4,
      evidence_text_5: rec.evidence_text_5,
      image_prompt: art.prompt,
      seeds: art.seeds,
      images: [1, 2, 3].map(
        (i) => "/images/places/" + rec.place_id + "_0" + i + ".png",
      ),
    };
  });

if (places.length !== 20)
  throw new Error("Expected 20 places, got " + places.length);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(places, null, 2) + "\n", "utf8");
console.log("Wrote " + places.length + " places to " + OUT);
console.log(
  "preference tags:",
  [...new Set(places.flatMap((p) => p.preference_tags.split(",")))].join(" | "),
);
console.log(
  "avoid tags:",
  [
    ...new Set(
      places.flatMap((p) => p.avoid_tags.split(",").filter(Boolean)),
    ),
  ].join(" | "),
);
