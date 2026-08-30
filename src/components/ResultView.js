"use client";

import PlaceCard from "@/components/PlaceCard";

export default function ResultView({ result, travelType, onRestart }) {
  const count = result.recommendations.length;

  return (
    <section>
      <div className="mb-5 text-center">
        <h2 className="display text-2xl sm:text-3xl">
          당신에게 딱 맞는{" "}
          <span style={{ color: "var(--accent)" }}>여수 여행 BEST {count}</span>
        </h2>
        {travelType && (
          <p
            className="mt-1.5 text-sm font-bold"
            style={{ color: "var(--muted)" }}
          >
            {travelType.name} · {travelType.xBandLabel} / {travelType.yBandLabel}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          다시 검사하기
        </button>
      </div>
    </section>
  );
}
