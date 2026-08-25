"use client";

import PlaceCard from "@/components/PlaceCard";

export default function ResultView({ result, preferences, onRestart }) {
  const summary = [
    preferences.companion,
    preferences.themes.join(" · "),
    preferences.detail,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <section>
      <div className="mb-5">
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
