"use client";

import { ANSWER_LEVELS } from "@/config/questions";

/**
 * 성향 문항 한 개 화면. A/B 대표 카드 + 4단계 선택 컨트롤.
 *
 * 카드는 좁은 화면에서도 2열을 유지한다. 세로로 쌓으면 화면이 길어지면서
 * 카드 안쪽이 비어 보이기 때문이다.
 *
 * 점수(-2.5 ~ +2.5)는 화면에 절대 노출하지 않는다. 라벨만 보여준다.
 */
export default function PersonalityStep({ question, value, onSelect }) {
  const side = value == null ? null : value < 0 ? "a" : "b";

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {["a", "b"].map((key) => {
          const option = question[key];
          const isSelected = side === key;
          const tint = key === "a" ? "var(--accent)" : "var(--cta)";

          return (
            <div
              key={key}
              className="flex flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-4 text-center transition-colors"
              style={{
                borderColor: isSelected ? tint : "var(--border)",
                background: isSelected
                  ? `color-mix(in oklch, ${tint} 10%, var(--surface))`
                  : "var(--surface)",
              }}
            >
              <span className="text-3xl leading-none sm:text-4xl" aria-hidden="true">
                {option.emoji}
              </span>
              <p className="text-[13px] font-bold leading-snug sm:text-[15px]">
                {option.text}
              </p>
            </div>
          );
        })}
      </div>

      {/*
        좁은 화면에서 4열로 깔면 "A가 훨씬 좋아요"가 세 줄로 접힌다.
        모바일은 2×2로 두어 라벨이 한 줄에 들어오게 한다(읽기 순서는 그대로 A강→B강).
      */}
      <div
        className="grid grid-cols-2 gap-1.5 sm:grid-cols-4"
        role="radiogroup"
        aria-label={question.question}
      >
        {ANSWER_LEVELS.map((level) => {
          const isSelected = value === level.value;
          const isStrong = Math.abs(level.value) === 2.5;
          const tint = level.value < 0 ? "var(--accent)" : "var(--cta)";

          return (
            <button
              key={level.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(level.value)}
              className="chunky flex items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2.5"
              style={{
                borderColor: isSelected ? tint : "var(--border)",
                background: isSelected ? tint : "var(--surface)",
                color: isSelected ? "#fff" : "var(--muted)",
                "--chunk": isSelected
                  ? `color-mix(in oklch, ${tint} 70%, black)`
                  : "var(--chunk-soft)",
              }}
            >
              <span
                className="shrink-0 rounded-full border-2"
                style={{
                  width: isStrong ? 14 : 10,
                  height: isStrong ? 14 : 10,
                  borderColor: isSelected ? "#fff" : tint,
                  background: isSelected ? "#fff" : "transparent",
                }}
                aria-hidden="true"
              />
              <span className="text-[11px] font-bold leading-tight sm:text-xs">
                {level.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
