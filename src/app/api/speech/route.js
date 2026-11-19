import { synthesize } from "@/lib/tts";

/**
 * 글을 읽어 주는 음성을 돌려준다.
 *
 *   POST /api/speech   { "text": "...", "voice": "Charon" }  → audio/wav
 *
 * 키는 서버에만 둔다. 화면은 이 라우트만 부른다.
 * 같은 글은 서버가 디스크에 저장해 두므로 두 번째부터는 바로 돌아온다.
 */

export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "요청 본문을 읽지 못했습니다." }, { status: 400 });
  }

  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return Response.json({ error: "text 가 없습니다." }, { status: 400 });

  try {
    // 목소리는 목록에 있는 이름만 쓴다(synthesize 안에서 거른다).
    const { audio, cached } = await synthesize(text, body?.voice);
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(audio.length),
        "Cache-Control": "public, max-age=86400",
        "X-TTS-Cached": cached ? "1" : "0",
      },
    });
  } catch (error) {
    console.error("[speech]", error?.message ?? error);
    return Response.json(
      { error: "음성을 만들지 못했습니다." },
      { status: 502 },
    );
  }
}
