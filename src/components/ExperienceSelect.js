"use client";

import Image from "next/image";
import { useState } from "react";

import { CHARACTERS } from "@/config/characters";
import { SELECT_COPY } from "@/config/game-copy";

/**
 * 미리 여행 체험 — 갈 곳 한 곳과 같이 갈 캐릭터 한 명을 고른다.
 *
 * 장소는 추천 결과(recommendations)에서만 고른다. 기본 선택은 1순위다.
 * 캐릭터 그림은 영상 레퍼런스와 같은 파일을 쓴다(src/config/characters.js 주석 참고).
 */
export default function ExperienceSelect({ recommendations, onStart, onBack }) {
  const [placeId, setPlaceId] = useState(recommendations[0]?.place_id ?? null);
  const [characterId, setCharacterId] = useState(null);

  const place = recommendations.find((item) => item.place_id === placeId) ?? null;
  const character = CHARACTERS.find((item) => item.id === characterId) ?? null;
  const ready = Boolean(place && character);

  const chip = (selected) => ({
    borderColor: selected ? "var(--cta)" : "var(--border)",
    background: selected
      ? "color-mix(in oklch, var(--cta) 12%, var(--surface))"
      : "var(--surface)",
    boxShadow: selected ? "var(--shadow-md)" : "var(--shadow-sm)",
  });

  return (
    /*
      전시 태블릿에서는 페이지를 스크롤하지 않는다. 높이는 화면에 맞추되
      **내용을 늘려 채우지 않고** 통째로 가운데에 모은다. 큰 모니터에서 줄 사이가
      멀어지면 한 화면으로 읽히지 않는다.
    */
    <section className="flex flex-col justify-center gap-4 text-center lg:h-[calc(var(--stage-h)-7.5rem)]">
      <header className="shrink-0">
        <h2 className="display text-2xl sm:text-3xl">{SELECT_COPY.title}</h2>
        <p className="mt-1 break-keep text-base" style={{ color: "var(--muted)" }}>
          {SELECT_COPY.lead}
        </p>
      </header>

      {/* 장소 — 가로로 넘겨 본다. 세로로 쌓으면 전시 태블릿 화면을 넘어간다. */}
      <div className="shrink-0">
        <p className="mb-2 text-sm font-bold" style={{ color: "var(--muted)" }}>
          {SELECT_COPY.placeLabel}
        </p>
        {/* 바깥은 넘치면 가로로 넘겨 보는 띠, 안쪽은 폭이 남으면 가운데로 모이는 줄. */}
        <div className="snap-x snap-mandatory overflow-x-auto pb-1">
          <div className="mx-auto flex w-max max-w-full gap-3">
          {recommendations.map((recommendation) => {
            const selected = recommendation.place_id === placeId;
            return (
              <button
                key={recommendation.place_id}
                type="button"
                onClick={() => setPlaceId(recommendation.place_id)}
                aria-pressed={selected}
                className="w-36 shrink-0 snap-start overflow-hidden rounded-2xl border-2 text-left sm:w-40"
                style={chip(selected)}
              >
                <span className="relative block aspect-[16/10] w-full">
                  {recommendation.images?.[0] ? (
                    <Image
                      src={recommendation.images[0]}
                      alt=""
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                  ) : (
                    <span
                      className="block h-full w-full"
                      style={{ background: "var(--surface-sunken)" }}
                    />
                  )}
                </span>
                <span className="block px-3 pb-2.5 pt-2">
                  <span className="block truncate text-base font-bold">
                    {recommendation.place_name}
                  </span>
                  {recommendation.matched_tags?.length > 0 && (
                    <span
                      className="mt-0.5 block truncate text-xs font-medium"
                      style={{ color: "var(--accent)" }}
                    >
                      {recommendation.matched_tags.join(" · ")}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          </div>
        </div>
      </div>

      {/*
        캐릭터 — 6종(아저씨 3 + 아줌마 3). 여기 보이는 그림이 영상에 나오는 사람과 같아야 한다.
        그림 아래에 이름과 한 줄 소개를 붙인다(src/config/characters.js 에서 고친다).
      */}
      <div className="shrink-0">
        <p className="mb-2 text-sm font-bold" style={{ color: "var(--muted)" }}>
          {SELECT_COPY.characterLabel}
        </p>
        {/* 이름 한 줄이 잘리지 않는 폭으로 묶는다. 더 넓히면 카드가 옆으로 비어 보인다. */}
        <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {CHARACTERS.map((item) => {
            const selected = item.id === characterId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCharacterId(item.id)}
                aria-pressed={selected}
                aria-label={`${item.name} — ${item.tagline}`}
                className="overflow-hidden rounded-2xl border-2 p-1.5"
                style={chip(selected)}
              >
                <span className="relative block h-28 w-full sm:h-32">
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 30vw, 140px"
                    className="object-contain"
                  />
                </span>
                <span className="mt-1.5 block truncate text-sm font-bold sm:text-base">
                  {item.name}
                </span>
                <span
                  className="block truncate text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  {item.tagline}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-2">
        <button
          type="button"
          disabled={!ready}
          onClick={() => onStart(place, character)}
          className="retro-cta w-full max-w-md px-8 py-4 text-xl font-extrabold disabled:opacity-60"
        >
          {SELECT_COPY.startLabel}
        </button>
        {!ready && (
          <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
            {SELECT_COPY.startHint}
          </p>
        )}
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] rounded-xl px-3 text-sm font-bold"
          style={{ color: "var(--muted)" }}
        >
          {SELECT_COPY.backLabel}
        </button>
      </div>
    </section>
  );
}
