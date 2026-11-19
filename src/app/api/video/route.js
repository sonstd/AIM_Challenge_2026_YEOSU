import { CHARACTERS } from "@/config/characters";
import { ComfyError, readJob, startJob } from "@/lib/comfy";
import { getPlaceById } from "@/lib/places";

/**
 * 미리 여행 체험 영상 생성.
 *
 * API 키는 서버에만 둔다. 화면은 이 라우트만 호출하고 Comfy Cloud 를 직접 부르지 않는다.
 *
 *   POST /api/video   { placeId, characterId }  → { jobId }
 *   GET  /api/video?jobId=...                   → { state: "pending" | "ready" | "failed", url? }
 */

export const dynamic = "force-dynamic";

function fail(status, message, code) {
  return Response.json({ error: message, code }, { status });
}

/** 들어온 값을 기준 데이터와 대조한다. 경로에 끼워 넣기 전에 반드시 거친다. */
async function validate(body) {
  const placeId = body?.placeId;
  const characterId = body?.characterId;

  const place = typeof placeId === "string" ? await getPlaceById(placeId) : null;
  if (!place) return { error: `장소 id 가 올바르지 않습니다: ${placeId}` };

  if (!CHARACTERS.some((character) => character.id === characterId)) {
    return { error: `캐릭터 id 가 올바르지 않습니다: ${characterId}` };
  }

  return { placeId: place.place_id, characterId };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "요청 본문을 읽지 못했습니다.");
  }

  const parsed = await validate(body);
  if (parsed.error) return fail(400, parsed.error);

  try {
    const jobId = await startJob(parsed);
    return Response.json({ jobId });
  } catch (error) {
    if (error instanceof ComfyError) {
      console.error(`[video] ${error.code}: ${error.message}`);
      // 프롬프트·시트가 아직 없는 건 서버 설정 문제이므로 그대로 알려 준다.
      return fail(502, error.message, error.code);
    }
    console.error("[video] 생성 요청 실패", error);
    return fail(502, "영상 생성을 시작하지 못했습니다.");
  }
}

export async function GET(request) {
  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) return fail(400, "jobId 가 없습니다.");

  try {
    return Response.json(await readJob(jobId));
  } catch (error) {
    if (error instanceof ComfyError) {
      console.error(`[video] ${error.code}: ${error.message}`);
      return fail(502, error.message, error.code);
    }
    console.error("[video] 상태 조회 실패", error);
    return fail(502, "영상 상태를 확인하지 못했습니다.");
  }
}
