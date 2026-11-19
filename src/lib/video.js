/**
 * 영상 생성 — **화면이 쓰는 쪽.** 실제 호출은 서버 라우트(/api/video)가 한다.
 *
 * Comfy Cloud 키는 서버에만 있어야 하므로 여기서 클라우드를 직접 부르지 않는다.
 * 화면 코드는 아래 세 함수만 쓴다. 대기 시간을 재는 타이머를 화면 쪽에 심지 않는다.
 *
 *   requestVideo   선택 화면에서 시작하기를 누른 **직후** 호출한다.
 *                  대기 게임이 끝난 뒤에 요청하면 관람객이 또 기다리게 된다.
 *   pollVideo      완성됐는지 묻는다. 아직이면 null.
 *   isVideoExpired 안전장치. 너무 오래 걸렸거나 실패했으면 true.
 */

/** 안전장치 — 이 시간을 넘기면 포기하고 안내 화면으로 보낸다. */
export const VIDEO_TIMEOUT_MS = 300_000;

/** 진행 중인 요청. 경과 시간과 실패 여부를 여기서만 들고 있는다. */
const jobs = new Map();

/**
 * 영상 생성을 요청한다.
 *
 * @param {{ placeId: string, characterId: string }} request
 * @returns {Promise<{ jobId: string }>}
 */
export async function requestVideo({ placeId, characterId }) {
  const response = await fetch("/api/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placeId, characterId }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.jobId) {
    throw new Error(data?.error ?? "영상 생성을 시작하지 못했습니다.");
  }

  jobs.set(data.jobId, { requestedAt: Date.now(), failed: false });
  return { jobId: data.jobId };
}

/**
 * 완성됐는지 묻는다.
 *
 * @param {string} jobId
 * @returns {Promise<{ url: string } | null>} 아직이면 null
 */
export async function pollVideo(jobId) {
  const job = jobs.get(jobId);
  if (!job || job.failed) return null;

  let data;
  try {
    const response = await fetch(`/api/video?jobId=${encodeURIComponent(jobId)}`, {
      cache: "no-store",
    });
    data = await response.json();
    if (!response.ok) throw new Error(data?.error ?? "상태 조회 실패");
  } catch (error) {
    // 한 번 끊긴 것으로 포기하지 않는다. 안전장치 시간까지는 계속 물어본다.
    console.warn("[video] 상태 조회 실패", error);
    return null;
  }

  if (data.state === "failed") {
    job.failed = true;
    console.warn(`[video] 생성 실패: ${data.message ?? ""}`);
    return null;
  }
  if (data.state === "ready" && data.url) return { url: data.url };
  return null;
}

/**
 * 안전장치 — 너무 오래 걸렸거나 생성이 실패했는지 묻는다.
 * 경과 시간 계산을 화면이 아니라 여기서 하는 이유는, 대기 시간 규칙이 바뀌어도
 * 화면 코드를 고치지 않기 위해서다.
 *
 * @param {string | null | undefined} jobId 요청 자체가 실패해 id 가 없으면 즉시 true
 */
export function isVideoExpired(jobId) {
  if (!jobId) return true;
  const job = jobs.get(jobId);
  if (!job) return true;
  if (job.failed) return true;
  return Date.now() - job.requestedAt >= VIDEO_TIMEOUT_MS;
}

/** 화면을 벗어날 때 정리한다. */
export function releaseVideo(jobId) {
  if (!jobId) return;
  jobs.delete(jobId);
}
