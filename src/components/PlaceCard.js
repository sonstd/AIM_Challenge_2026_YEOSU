"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * 추천 이유를 문장 단위로 나눈다. 종결 부호(. ! ?)를 보존해서 그대로 다시 붙인다.
 * 결과 화면 요구사항인 "문장별 줄바꿈"을 위한 것이다.
 */
function toSentences(text) {
  return String(text ?? "").match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
}

function ImagePlaceholder() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2"
      style={{
        background:
          "linear-gradient(140deg, color-mix(in oklch, var(--accent) 18%, var(--surface)), var(--surface))",
        color: "var(--muted)",
      }}
    >
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M3 17l5-5 3 3 4-4 6 6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8.5" cy="8" r="1.6" />
        <rect x="3" y="4" width="18" height="16" rx="2" />
      </svg>
      <span className="text-xs">이미지 준비 중</span>
    </div>
  );
}

export default function PlaceCard({ recommendation, index }) {
  const [imageFailed, setImageFailed] = useState(false);

  const { place_name, recommend_reason, matched_tags, images, match_score } =
    recommendation;
  const src = images?.[0];
  const showImage = Boolean(src) && !imageFailed;

  return (
    <article
      className="animate-rise overflow-hidden rounded-3xl border-2"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-md)",
        animationDelay: `${index * 80}ms`,
      }}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {showImage ? (
          <Image
            src={src}
            alt={place_name}
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <ImagePlaceholder />
        )}
        <span
          className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold"
          style={{
            // 1위만 금색으로 구분한다.
            background: index === 0 ? "var(--cta)" : "var(--accent)",
            color: "#fff",
            boxShadow: "0 2px 8px oklch(0.3 0.05 250 / 0.35)",
          }}
        >
          {index + 1}
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-lg font-bold sm:text-xl">{place_name}</h3>
          {typeof match_score === "number" && (
            <span
              className="shrink-0 text-xs font-extrabold"
              style={{ color: "var(--accent)" }}
            >
              매칭도 {match_score}%
            </span>
          )}
        </div>

        {matched_tags?.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {matched_tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  background:
                    "color-mix(in oklch, var(--accent) 14%, transparent)",
                  color: "var(--accent)",
                }}
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3.5 space-y-1.5">
          {toSentences(recommend_reason).map((sentence, i) => (
            <p key={i} className="text-sm leading-relaxed sm:text-[0.95rem]">
              {sentence}
            </p>
          ))}
        </div>
      </div>
    </article>
  );
}
