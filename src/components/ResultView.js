"use client";

import PlaceCard from "@/components/PlaceCard";

export default function ResultView({ result, preferences, onRestart }) {
  /** 제출물 02번을 실제 시스템 출력으로 만들기 위해 API 응답을 가공 없이 그대로 저장한다. */
  function downloadJson() {
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${result.region_id ?? "recommendations"}_recommendations.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const summary = [
    preferences.companion,
    preferences.themes.join(" · "),
    preferences.detail,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-2xl sm:text-3xl">
            아래 {result.recommendations.length}곳 어때요?
          </h2>
          <p
            className="mt-1 text-sm font-medium"
            style={{ color: "var(--muted)" }}
          >
            {summary}
          </p>
        </div>
        <button
          type="button"
          onClick={downloadJson}
          className="chunky rounded-xl border-2 px-4 py-2.5 text-sm font-extrabold"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            "--chunk": "var(--chunk-soft)",
          }}
        >
          JSON 다운로드
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {result.recommendations.map((recommendation, index) => (
          <PlaceCard
            key={recommendation.place_id}
            recommendation={recommendation}
            index={index}
          />
        ))}
      </div>

      <div className="mt-7 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
        <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          추천받은 곳이 별로라면?
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="chunky w-full rounded-xl px-6 py-3.5 text-sm font-extrabold sm:w-auto"
          style={{
            background: "var(--accent)",
            color: "var(--accent-contrast)",
            "--chunk": "var(--accent-strong)",
          }}
        >
          다시 추천받기
        </button>
      </div>
    </section>
  );
}
