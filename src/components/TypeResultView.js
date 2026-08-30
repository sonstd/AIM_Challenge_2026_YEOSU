"use client";

import { AXIS_LABELS, TRAVEL_TYPES } from "@/config/travel-types";

const X_BANDS = [1, 2, 3, 4];
/** 위에서 아래로 그리므로 Y는 4 → 1 순서다. */
const Y_BANDS = [4, 3, 2, 1];

function Chip({ children }) {
  return (
    <li
      className="rounded-full px-2.5 py-1 text-xs font-bold"
      style={{
        background: "color-mix(in oklch, var(--accent) 12%, transparent)",
        color: "var(--accent)",
      }}
    >
      {children}
    </li>
  );
}

/** 4×4 좌표평면. 사용자가 속한 칸을 강조하고, 실제 좌표에 점을 찍는다. */
function AxisPlane({ x, y, typeId }) {
  // -10~+10 을 0~100% 로 변환. y는 위쪽이 +10이라 뒤집는다.
  const left = ((x + 10) / 20) * 100;
  const top = ((10 - y) / 20) * 100;

  return (
    <div>
      <p
        className="mb-1.5 text-center text-xs font-bold"
        style={{ color: "var(--muted)" }}
      >
        {AXIS_LABELS.yPositive} (Y +10)
      </p>

      <div className="flex items-center gap-1.5">
        <p
          className="text-xs font-bold [writing-mode:vertical-rl] [text-orientation:mixed]"
          style={{ color: "var(--muted)", transform: "rotate(180deg)" }}
        >
          {AXIS_LABELS.xNegative} (X −10)
        </p>

        <div className="relative flex-1">
          <div
            className="grid grid-cols-4 overflow-hidden rounded-2xl border-2"
            style={{ borderColor: "var(--border)" }}
          >
            {Y_BANDS.map((yBand) =>
              X_BANDS.map((xBand) => {
                const id = `X${xBand}Y${yBand}`;
                const type = TRAVEL_TYPES[id];
                const isMine = id === typeId;
                return (
                  <div
                    key={id}
                    className="flex aspect-square flex-col items-center justify-center gap-0.5 border p-1 text-center"
                    style={{
                      borderColor: "var(--border)",
                      background: isMine
                        ? "color-mix(in oklch, var(--accent) 16%, var(--surface))"
                        : "var(--surface)",
                    }}
                  >
                    <span className="text-base sm:text-lg" aria-hidden="true">
                      {type.emoji}
                    </span>
                    <span
                      className="text-[9px] font-bold leading-tight sm:text-[10px]"
                      style={{
                        color: isMine ? "var(--accent)" : "var(--muted)",
                      }}
                    >
                      {type.name}
                    </span>
                  </div>
                );
              }),
            )}
          </div>

          {/* 실제 X/Y 위치 */}
          <span
            className="pointer-events-none absolute z-10 block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              borderColor: "#fff",
              background: "var(--cta)",
              boxShadow: "0 2px 8px oklch(0.3 0.05 250 / 0.45)",
            }}
            aria-label={`내 좌표 X ${x}, Y ${y}`}
          />
        </div>

        <p
          className="text-xs font-bold [writing-mode:vertical-rl]"
          style={{ color: "var(--muted)" }}
        >
          {AXIS_LABELS.xPositive} (X +10)
        </p>
      </div>

      <p
        className="mt-1.5 text-center text-xs font-bold"
        style={{ color: "var(--muted)" }}
      >
        {AXIS_LABELS.yNegative} (Y −10)
      </p>
    </div>
  );
}

export default function TypeResultView({ travelType, onContinue }) {
  const { name, emoji, description, keywords, x, y } = travelType;

  return (
    <section className="grid gap-7 lg:grid-cols-2 lg:items-center">
      <div>
        <p className="text-sm font-bold" style={{ color: "var(--muted)" }}>
          당신의 여행 유형은
        </p>
        <h2 className="display mt-1 text-3xl sm:text-4xl">
          {name} <span aria-hidden="true">{emoji}</span>
        </h2>
        <p className="mt-3 text-sm leading-relaxed sm:text-base">
          {description}
        </p>

        {/*
          축 합계가 0 부근이면 구간 경계에 걸린 것이라 유형 이름만 보면
          성향이 뚜렷한 것처럼 오해된다. 그 경우 중립임을 먼저 알려 준다.
        */}
        {(travelType.xNeutral || travelType.yNeutral) && (
          <p
            className="mt-3 rounded-xl px-3.5 py-2.5 text-xs font-bold leading-relaxed"
            style={{
              background: "color-mix(in oklch, var(--accent) 10%, transparent)",
              color: "var(--accent)",
            }}
          >
            {neutralAxisNames(travelType)} 성향이 중간에 가까워요. 어느 한쪽으로
            치우치지 않아서 추천도 양쪽 성격이 섞여 나옵니다.
          </p>
        )}

        <div
          className="mt-5 rounded-2xl border-2 p-4"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="text-xs font-bold" style={{ color: "var(--muted)" }}>
            나의 여행 좌표
          </p>
          <div className="mt-1.5 flex items-baseline gap-5">
            <span className="display text-2xl">
              X <span style={{ color: "var(--accent)" }}>{formatScore(x)}</span>
            </span>
            <span className="display text-2xl">
              Y <span style={{ color: "var(--accent)" }}>{formatScore(y)}</span>
            </span>
          </div>
          <dl className="mt-3 grid gap-1 text-xs" style={{ color: "var(--muted)" }}>
            <div className="flex justify-between gap-2">
              <dt>{travelType.xBandLabel}</dt>
              <dd className="font-bold">{travelType.xIntensity.label}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{travelType.yBandLabel}</dt>
              <dd className="font-bold">{travelType.yIntensity.label}</dd>
            </div>
          </dl>
        </div>

        <p className="mt-5 text-xs font-bold" style={{ color: "var(--muted)" }}>
          나를 표현하는 키워드
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {keywords.map((keyword) => (
            <Chip key={keyword}>{keyword}</Chip>
          ))}
        </ul>

        <button
          type="button"
          onClick={onContinue}
          className="chunky mt-7 w-full rounded-2xl px-6 py-4 text-xl font-extrabold"
          style={{
            background: "var(--cta)",
            color: "var(--cta-text)",
            "--chunk": "var(--cta-shadow)",
          }}
        >
          맞춤 여행 추천 보기
        </button>
      </div>

      <AxisPlane x={x} y={y} typeId={travelType.typeId} />
    </section>
  );
}

/** 중립에 가까운 축이 무엇인지 사람이 읽을 수 있는 이름으로 만든다. */
function neutralAxisNames({ xNeutral, yNeutral }) {
  if (xNeutral && yNeutral) return "두 축 모두";
  if (xNeutral) return `${AXIS_LABELS.xNegative}·${AXIS_LABELS.xPositive}`;
  return `${AXIS_LABELS.yNegative}·${AXIS_LABELS.yPositive}`;
}

/** +5, -2.5 처럼 부호를 붙이고 불필요한 소수점은 없앤다. */
function formatScore(score) {
  const sign = score > 0 ? "+" : score < 0 ? "−" : "";
  const magnitude = Math.abs(score);
  return `${sign}${Number.isInteger(magnitude) ? magnitude : magnitude.toFixed(2).replace(/0$/, "")}`;
}
