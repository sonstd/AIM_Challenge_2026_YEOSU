"use client";

import Image from "next/image";
import { useState } from "react";

import { splitDisplaySentences } from "@/lib/sentences";

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

/**
 * @param {number} [maxSentences] 추천 이유에서 앞 몇 문장만 보일지. 대화 화면의
 *   카드는 1문장(객관)만 노출해 훑어보게 한다. 생략하면 전체를 보여준다.
 * @param {() => void} [onSelect] 주면 카드 전체가 버튼이 된다(대화 전환용).
 */
/** 순위 배지. 1위만 동백색으로 구분한다. */
function RankBadge({ index, className = "" }) {
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-extrabold ${className}`}
      style={{
        background: index === 0 ? "var(--cta)" : "var(--accent)",
        color: "var(--accent-contrast)",
      }}
    >
      {index + 1}
    </span>
  );
}

function TagList({ tags }) {
  if (!tags?.length) return null;
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            background: "color-mix(in oklch, var(--accent) 14%, transparent)",
            color: "var(--accent)",
          }}
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}

export default function PlaceCard({
  recommendation,
  matchScore,
  index,
  maxSentences,
  compact = false,
  onSelect,
}) {
  const [imageFailed, setImageFailed] = useState(false);

  // 매칭도는 응답 본문이 아니라 X-Match-Scores 헤더에서 온다(제출 규격 유지).
  const { place_name, recommend_reason, matched_tags, images } = recommendation;
  const src = images?.[0];
  const showImage = Boolean(src) && !imageFailed;

  const sentences = splitDisplaySentences(recommend_reason);
  const shown =
    typeof maxSentences === "number" ? sentences.slice(0, maxSentences) : sentences;

  const Tag = onSelect ? "button" : "article";

  const frame = {
    borderColor: "var(--border)",
    background: "var(--surface)",
    boxShadow: "var(--shadow-md)",
    animationDelay: `${index * 80}ms`,
  };

  /*
   * compact — 대화 화면 아래 목록용 가로형.
   * 썸네일을 옆에 두면 글이 들어갈 폭이 넓어져, 추천 근거 한 문장이 잘리지 않고
   * 다 보이면서도 카드 높이는 낮게 유지된다(전시 태블릿에서 한 화면에 담기 위함).
   */
  if (compact) {
    return (
      <Tag
        type={onSelect ? "button" : undefined}
        onClick={onSelect}
        className={`animate-rise flex w-full gap-3 overflow-hidden rounded-2xl border-2 p-2.5 ${onSelect ? "text-left" : ""}`}
        style={frame}
      >
        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl">
          {showImage ? (
            <Image
              src={src}
              alt={place_name}
              fill
              sizes="96px"
              className="object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <ImagePlaceholder />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <RankBadge index={index} />
            <h3 className="truncate text-base font-bold">{place_name}</h3>
            {typeof matchScore === "number" && (
              <span
                className="ml-auto shrink-0 text-xs font-extrabold"
                style={{ color: "var(--accent)" }}
              >
                매칭도 {matchScore}%
              </span>
            )}
          </div>

          <TagList tags={matched_tags} />

          <div className="mt-1.5 space-y-1">
            {shown.map((sentence, i) => (
              <p key={i} className="break-keep text-base leading-snug">
                {sentence}
              </p>
            ))}
          </div>
        </div>
      </Tag>
    );
  }

  return (
    <Tag
      type={onSelect ? "button" : undefined}
      onClick={onSelect}
      className={`animate-rise w-full overflow-hidden rounded-3xl border-2 ${onSelect ? "text-left" : ""}`}
      style={frame}
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
        <RankBadge index={index} className="absolute left-3 top-3 h-8 w-8" />
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-lg font-bold sm:text-xl">{place_name}</h3>
          {typeof matchScore === "number" && (
            <span
              className="shrink-0 text-xs font-extrabold"
              style={{ color: "var(--accent)" }}
            >
              매칭도 {matchScore}%
            </span>
          )}
        </div>

        <TagList tags={matched_tags} />

        <div className="mt-3.5 space-y-1.5">
          {shown.map((sentence, i) => (
            <p key={i} className="text-base leading-relaxed">
              {sentence}
            </p>
          ))}
        </div>
      </div>
    </Tag>
  );
}
