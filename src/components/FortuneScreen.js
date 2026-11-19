"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import RetroText from "@/components/RetroText";
import { FORTUNE_CARDS, FORTUNE_COPY } from "@/config/fortune";
import { subjectParticle } from "@/config/game-copy";
import { introPhoto } from "@/config/intro";
import { cancelSpeech, speak } from "@/lib/speech";

/** 고른 카드가 커졌다 사라지는 시간. 이게 끝나면 결과를 보여 준다. */
const FLIP_MS = 480;

/** 카드 뒷면 무늬 — 동백 한 송이. 네 장 모두 같은 그림이어야 고르는 맛이 난다. */
function CardMark() {
  return (
    <svg className="fortune-card-mark" viewBox="0 0 24 24" aria-hidden="true">
      {[
        [12, 5.4],
        [18.2, 10],
        [15.8, 17.4],
        [8.2, 17.4],
        [5.8, 10],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4.2" fill="var(--camellia)" />
      ))}
      <circle cx="12" cy="12" r="3.4" fill="#f6d44a" />
    </svg>
  );
}

/**
 * 마지막 화면 — 같이 다녀온 사람이 **운세 카드를 내민다.**
 *
 *   ① 뽑기: 뒷면이 같은 카드 네 장 중 하나를 고른다
 *   ② 결과: 고른 카드가 열리며 운세·먹거리·가 볼 곳이 나온다
 *
 * 글은 src/config/fortune.js 에 있고, 무엇이 나올지는 **카드를 누른 순간**에 정해진다
 * (화면을 다시 그려도 결과가 바뀌지 않게 뽑기는 바깥에서 한 번만 한다).
 * 말은 같이 간 사람 목소리로 읽어 준다.
 */
export default function FortuneScreen({ fortune, character, onDraw, onHome }) {
  const popRef = useRef(null);
  const [picked, setPicked] = useState(null);
  const drawing = picked !== null && !fortune;

  // 옆에서 쑥 나타나는 느낌. 화면에 들어올 때 한 번만.
  useEffect(() => {
    popRef.current?.animate(
      [
        { opacity: 0, translate: "-14% 18%", scale: 0.86, rotate: "-5deg" },
        { opacity: 1, translate: "0 -2%", scale: 1.03, rotate: "1deg", offset: 0.62 },
        { opacity: 1, translate: "0 0", scale: 1, rotate: "0deg" },
      ],
      { duration: 620, easing: "cubic-bezier(.2,.9,.3,1.2)", fill: "backwards" },
    );
  }, []);

  // 뽑기 안내 → (카드를 고르면) 운세. 각각 한 번씩만 읽는다.
  useEffect(() => {
    const text = fortune
      ? [...fortune.lines, `${fortune.food.name}. ${fortune.food.note}`].join(" ")
      : FORTUNE_COPY.drawPrompt;
    const timer = setTimeout(() => speak(text, { voice: character.voice }), 500);
    return () => {
      clearTimeout(timer);
      cancelSpeech();
    };
  }, [fortune, character.voice]);

  function pick(index) {
    if (picked !== null) return; // 두 번 눌러도 한 번만 뽑는다
    setPicked(index);
    setTimeout(onDraw, FLIP_MS);
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-center text-3xl">
        <RetroText>{FORTUNE_COPY.drawTitle}</RetroText>
      </h2>

      <div className="flex items-end justify-center gap-5">
        {/* 카드를 내미는 사람 */}
        <div className="relative h-[22rem] w-56 shrink-0 self-end" ref={popRef}>
          <Image
            src={introPhoto(character.photoId)}
            alt={character.name}
            fill
            sizes="288px"
            priority
            className="object-contain object-bottom"
          />
        </div>

        {fortune ? (
          <Result fortune={fortune} character={character} onHome={onHome} />
        ) : (
          <div className="flex w-full max-w-2xl flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-3">
              {Array.from({ length: FORTUNE_CARDS }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className="fortune-card"
                  aria-label={`${i + 1}번째 카드 뽑기`}
                  onClick={() => pick(i)}
                  style={
                    drawing
                      ? {
                          animation: "none",
                          rotate: "0deg",
                          translate: picked === i ? "0 -18px" : "0 24px",
                          scale: picked === i ? "1.12" : "0.92",
                          opacity: picked === i ? 1 : 0.25,
                          transition: `all ${FLIP_MS}ms cubic-bezier(.2,.9,.3,1.1)`,
                        }
                      : undefined
                  }
                >
                  <CardMark />
                </button>
              ))}
            </div>
            <p className="text-base font-bold" style={{ color: "var(--muted)" }}>
              {FORTUNE_COPY.drawPrompt}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/** 고른 카드에서 나온 것. */
function Result({ fortune, character, onHome }) {
  return (
    <div className="animate-rise flex w-full max-w-2xl flex-col gap-3">
      <div
        className="rounded-3xl rounded-bl-lg border-2 px-5 py-4"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <p className="text-xs font-bold" style={{ color: "var(--accent)" }}>
          {FORTUNE_COPY.title
            .replace("{character}", character.name)
            .replace("{은}", subjectParticle(character.name))}
        </p>
        <p className="mt-1.5 flex items-center gap-2 text-2xl font-extrabold">
          <span aria-hidden="true">{fortune.luck.emoji}</span>
          <span style={{ color: "var(--cta)" }}>{fortune.luck.label}</span>
        </p>
        {fortune.lines.map((line) => (
          <p key={line} className="mt-1 break-keep text-lg leading-snug">
            {line}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-2xl border-2 p-4"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="text-xs font-bold" style={{ color: "var(--muted)" }}>
            {FORTUNE_COPY.foodLabel}
          </p>
          <p className="mt-1 flex items-center gap-2 text-xl font-extrabold">
            <span aria-hidden="true">{fortune.food.emoji}</span>
            {fortune.food.name}
          </p>
          <p className="mt-1 break-keep text-sm" style={{ color: "var(--muted)" }}>
            {fortune.food.note}
          </p>
        </div>

        {fortune.place && (
          <div
            className="flex gap-3 overflow-hidden rounded-2xl border-2 p-2.5"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <span className="relative block h-20 w-24 shrink-0 overflow-hidden rounded-xl">
              {fortune.place.images?.[0] && (
                <Image
                  src={fortune.place.images[0]}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold" style={{ color: "var(--muted)" }}>
                {FORTUNE_COPY.placeLabel}
              </span>
              <span className="mt-0.5 block truncate text-xl font-extrabold">
                {fortune.place.place_name}
              </span>
              {fortune.place.matched_tags?.length > 0 && (
                <span
                  className="mt-0.5 block truncate text-xs font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  {fortune.place.matched_tags.join(" · ")}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onHome}
        className="retro-cta mt-1 w-full px-6 py-4 text-lg font-extrabold"
      >
        {FORTUNE_COPY.homeLabel}
      </button>
    </div>
  );
}
