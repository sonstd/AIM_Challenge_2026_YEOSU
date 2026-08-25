"use client";

import { useEffect, useState } from "react";

import Intro from "@/components/Intro";
import OptionGrid from "@/components/OptionGrid";
import ResultView from "@/components/ResultView";
import {
  COMPANIONS,
  DETAILS_BY_COMPANION,
  MAX_THEMES,
  MIN_THEMES,
  THEMES,
} from "@/lib/constants";

/** step 0 은 인트로(랜딩) 화면. 시작 버튼을 눌러야 1단계로 들어간다. */
const INTRO_STEP = 0;

const LOADING_MESSAGES = [
  "여수 관광지 20곳을 살펴보는 중",
  "취향에 맞는 후보를 추리는 중",
  "추천 이유를 근거와 맞춰보는 중",
];

/** 인트로를 벗어난 뒤 화면 위에 계속 남는 작은 브랜드 줄. 누르면 처음으로 돌아간다. */
function BrandBar({ onHome }) {
  return (
    <button
      type="button"
      onClick={onHome}
      className="mx-auto mb-5 block rounded-full border-2 bg-white px-4 py-1.5 text-xs font-bold"
      style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
    >
      AI 여수 여행 추천
    </button>
  );
}

function Panel({ children }) {
  return (
    <div
      className="rounded-3xl border-2 p-5 sm:p-7"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      {children}
    </div>
  );
}

function StepHeader({ step, title, hint }) {
  return (
    <div className="mb-5">
      <div className="mb-4 flex gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className="h-1.5 flex-1 rounded-full transition-colors duration-300"
            style={{
              background: n <= step ? "var(--accent)" : "var(--border)",
            }}
          />
        ))}
      </div>
      <p
        className="display text-xs tracking-wide"
        style={{ color: "var(--accent)" }}
      >
        STEP {step} / 3
      </p>
      <h2 className="display mt-1.5 text-2xl leading-snug sm:text-3xl">
        {title}
      </h2>
      {hint && (
        <p className="display mt-2 text-sm" style={{ color: "var(--muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

const SECONDARY_BUTTON = {
  borderColor: "var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  "--chunk": "var(--chunk-soft)",
};

const PRIMARY_BUTTON = {
  background: "var(--accent)",
  color: "var(--accent-contrast)",
  "--chunk": "var(--accent-strong)",
};

function LoadingPanel() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length),
      2200,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <Panel>
      <div
        className="flex flex-col items-center justify-center gap-4 py-10"
        role="status"
        aria-live="polite"
      >
        <span
          className="h-9 w-9 animate-spin rounded-full border-[3px] border-transparent"
          style={{
            borderTopColor: "var(--accent)",
            borderRightColor: "var(--accent)",
          }}
        />
        <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          {LOADING_MESSAGES[messageIndex]}…
        </p>
      </div>
    </Panel>
  );
}

export default function Wizard() {
  const [step, setStep] = useState(INTRO_STEP);
  const [companion, setCompanion] = useState(null);
  const [themes, setThemes] = useState([]);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [submitted, setSubmitted] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const detailStep = companion ? DETAILS_BY_COMPANION[companion] : null;

  function chooseCompanion(value) {
    setCompanion(value);
    setStep(2);
  }

  /** 선택 순서를 배열 순서로 유지한다. 이미 고른 항목을 누르면 해제된다. */
  function toggleTheme(theme) {
    setThemes((current) => {
      if (current.includes(theme)) return current.filter((t) => t !== theme);
      if (current.length >= MAX_THEMES) return current;
      return [...current, theme];
    });
  }

  async function submit(detail) {
    const preferences = { companion, themes, detail: detail ?? null };
    setSubmitted(preferences);
    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "추천을 생성하지 못했습니다.");
      }
      setResult(data);
      setStatus("done");
    } catch (error) {
      setErrorMessage(error.message ?? "알 수 없는 오류가 발생했습니다.");
      setStatus("error");
    }
  }

  /** 인트로 화면까지 완전히 되돌린다. */
  function restart() {
    setStep(INTRO_STEP);
    setCompanion(null);
    setThemes([]);
    setResult(null);
    setSubmitted(null);
    setErrorMessage(null);
    setStatus("idle");
  }

  if (status === "idle" && step === INTRO_STEP) {
    return <Intro onStart={() => setStep(1)} />;
  }

  if (status === "loading") {
    return (
      <>
        <BrandBar onHome={restart} />
        <LoadingPanel />
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <BrandBar onHome={restart} />
        <Panel>
          <div className="py-6 text-center">
            <p className="display text-xl">추천을 만들지 못했습니다</p>
            <p
              className="mt-2 text-sm font-medium"
              style={{ color: "var(--muted)" }}
            >
              {errorMessage}
            </p>
            <div className="mt-6 flex justify-center gap-2.5">
              <button
                type="button"
                onClick={() => submit(submitted?.detail ?? null)}
                className="chunky rounded-xl px-5 py-3 text-sm font-extrabold"
                style={PRIMARY_BUTTON}
              >
                다시 시도
              </button>
              <button
                type="button"
                onClick={restart}
                className="chunky rounded-xl border-2 px-5 py-3 text-sm font-extrabold"
                style={SECONDARY_BUTTON}
              >
                처음부터
              </button>
            </div>
          </div>
        </Panel>
      </>
    );
  }

  if (status === "done" && result) {
    return (
      <>
        <BrandBar onHome={restart} />
        <ResultView result={result} preferences={submitted} onRestart={restart} />
      </>
    );
  }

  return (
    <>
      <BrandBar onHome={restart} />
      <Panel>
        {step === 1 && (
          <>
            <StepHeader step={1} title="누구와 함께 가시나요?" />
            <OptionGrid
              options={COMPANIONS}
              selected={companion}
              onSelect={chooseCompanion}
            />
            <button
              type="button"
              onClick={restart}
              className="chunky mt-6 w-full rounded-xl border-2 px-4 py-3.5 text-sm font-extrabold"
              style={SECONDARY_BUTTON}
            >
              처음으로
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <StepHeader
              step={2}
              title="어떤 여행을 원하시나요?"
              hint={`${MIN_THEMES}~${MAX_THEMES}개를 고르세요. 먼저 고른 테마일수록 추천에 더 크게 반영됩니다.`}
            />
            <OptionGrid
              options={THEMES}
              selected={themes}
              onSelect={toggleTheme}
              multi
              disabledWhenUnselected={themes.length >= MAX_THEMES}
            />
            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="chunky rounded-xl border-2 px-5 py-3.5 text-sm font-extrabold"
                style={SECONDARY_BUTTON}
              >
                이전
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={themes.length < MIN_THEMES}
                className="chunky flex-1 rounded-xl px-4 py-3.5 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-45"
                style={PRIMARY_BUTTON}
              >
                {themes.length < MIN_THEMES
                  ? `${MIN_THEMES - themes.length}개 더 선택`
                  : "다음"}
              </button>
            </div>
          </>
        )}

        {step === 3 && detailStep && (
          <>
            <StepHeader
              step={3}
              title={detailStep.question}
              hint="건너뛰어도 추천을 받을 수 있습니다."
            />
            <OptionGrid
              options={detailStep.options}
              selected={null}
              onSelect={(value) => submit(value)}
              columns={detailStep.options.length > 2 ? 2 : 1}
            />
            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="chunky rounded-xl border-2 px-5 py-3.5 text-sm font-extrabold"
                style={SECONDARY_BUTTON}
              >
                이전
              </button>
              <button
                type="button"
                onClick={() => submit(null)}
                className="chunky flex-1 rounded-xl border-2 px-4 py-3.5 text-sm font-extrabold"
                style={SECONDARY_BUTTON}
              >
                건너뛰고 추천받기
              </button>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
