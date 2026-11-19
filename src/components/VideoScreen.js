"use client";

import Image from "next/image";

import RetroText from "@/components/RetroText";
import { FORTUNE_COPY } from "@/config/fortune";
import { fill, randaFor, VIDEO_COPY } from "@/config/game-copy";

/**
 * 생성된 영상을 보여 주는 화면.
 *
 * videoUrl 은 Comfy Cloud 가 내준 **서명된 저장소 주소**다. 몇 시간 뒤 만료되므로
 * 어디에도 저장하지 않고 이 화면에서만 쓴다.
 * 유휴 복귀(60초)는 화면 전체를 쥔 Wizard 가 관리한다.
 */
export default function VideoScreen({ place, character, videoUrl, foundCount, onFortune, onHome }) {
  return (
    <section className="flex flex-col items-center gap-4">
      <header className="text-center">
        <h2 className="text-2xl sm:text-3xl">
          <RetroText>{fill(VIDEO_COPY.title, { place: place.place_name })}</RetroText>
        </h2>
        <p className="mt-1 text-base" style={{ color: "var(--muted)" }}>
          {fill(VIDEO_COPY.caption, {
            place: place.place_name,
            character: character.name,
            randa: randaFor(character.name),
          })}
        </p>
      </header>

      {/*
        생성된 영상. 전시장이라 소리 없이 자동 재생하고 반복한다
        (muted 가 없으면 브라우저가 자동 재생을 막는다). 조작은 컨트롤로 맡긴다.
      */}
      <div
        className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-3xl border-2"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface-sunken)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {videoUrl ? (
          <video
            key={videoUrl}
            src={videoUrl}
            className="h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            controls
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <p className="text-lg font-extrabold">{VIDEO_COPY.placeholder}</p>
            <p
              className="break-keep px-6 text-center text-sm"
              style={{ color: "var(--muted)" }}
            >
              {VIDEO_COPY.placeholderNote}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* 전신 세로 그림이라 세로 틀에 담는다. */}
        <span className="relative block h-16 w-12">
          <Image
            src={character.image}
            alt={character.name}
            fill
            sizes="48px"
            className="object-contain"
          />
        </span>
        {typeof foundCount === "number" && (
          <span className="text-base font-bold" style={{ color: "var(--muted)" }}>
            틀린 그림 {foundCount}개 찾았어라우
          </span>
        )}
      </div>

      <div className="flex w-full max-w-xl flex-col items-center gap-2 sm:flex-row sm:justify-center">
        {/* 마지막 한 가지 더 — 같이 간 사람이 운세를 봐 준다. */}
        {onFortune && (
          <button
            type="button"
            onClick={onFortune}
            className="retro-cta w-full px-7 py-4 text-lg font-extrabold sm:w-auto"
          >
            {FORTUNE_COPY.button}
          </button>
        )}
        <button
          type="button"
          onClick={onHome}
          className="chunky w-full rounded-2xl border-2 px-7 py-4 text-lg font-extrabold sm:w-auto"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            "--chunk": "var(--chunk-soft)",
          }}
        >
          {VIDEO_COPY.homeLabel}
        </button>
      </div>
    </section>
  );
}
