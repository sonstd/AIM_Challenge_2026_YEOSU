"use client";

import Image from "next/image";

import { ANSWER_LEVELS } from "@/config/questions";

/**
 * 성향 문항 한 개 화면. **사진 두 장 중 하나를 고르고, 그 안에서 세기를 고른다.**
 *
 * 예전에는 A/B 카드를 읽고 아래의 "A가 훨씬 좋아요" 버튼을 다시 고르는 구조였다.
 * 고를 때마다 A가 뭐였는지 위로 되짚어야 해서 글을 두 번 읽게 됐다.
 * 지금은 세기 버튼이 **각 사진 안에** 있어 되짚을 일이 없다.
 *
 * 응답값(±2.5 / ±5)과 문항 순서는 그대로다. 고르는 방법만 바뀌었다.
 */
export default function PersonalityStep({ question, value, onSelect }) {
  const side = value == null ? null : value < 0 ? "a" : "b";

  return (
    <div className="grid grid-cols-2 gap-3">
      {["a", "b"].map((key) => {
        const option = question[key];
        const isSide = side === key;
        const tint = key === "a" ? "var(--accent)" : "var(--cta)";
        // A 는 음수, B 는 양수. 약한 값부터 보여 준다.
        const levels = ANSWER_LEVELS.filter((level) =>
          key === "a" ? level.value < 0 : level.value > 0,
        ).sort((x, y) => Math.abs(x.value) - Math.abs(y.value));

        return (
          <div
            key={key}
            className="flex flex-col overflow-hidden rounded-2xl border-2 transition-colors"
            style={{
              borderColor: isSide ? tint : "var(--border)",
              background: isSide
                ? `color-mix(in oklch, ${tint} 10%, var(--surface))`
                : "var(--surface)",
            }}
          >
            <span className="relative block aspect-[16/10] w-full">
              <Image
                src={option.image}
                alt={option.imageAlt ?? ""}
                fill
                sizes="(max-width: 640px) 45vw, 320px"
                // 화면에 바로 보이는 본문이라 미루지 않고 바로 받는다.
                priority
                className="object-cover"
              />
            </span>

            <p className="break-keep px-3 pb-2 pt-2.5 text-center text-[15px] font-bold leading-snug">
              {option.text}
            </p>

            {/* 세기는 이 사진 안에서 고른다. 어느 쪽 이야기인지 되짚을 필요가 없다. */}
            <div className="mt-auto grid grid-cols-2 gap-1.5 p-2">
              {levels.map((level) => {
                const isSelected = value === level.value;
                return (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => onSelect(level.value)}
                    aria-pressed={isSelected}
                    aria-label={`${option.text} ${level.short}`}
                    className="chunky min-h-[44px] rounded-xl border-2 px-2 text-sm font-extrabold"
                    style={{
                      borderColor: isSelected ? tint : "var(--border)",
                      background: isSelected ? tint : "var(--surface)",
                      color: isSelected ? "var(--accent-contrast)" : "var(--text)",
                      "--chunk": isSelected ? "var(--accent-strong)" : "var(--chunk-soft)",
                    }}
                  >
                    {level.short}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
