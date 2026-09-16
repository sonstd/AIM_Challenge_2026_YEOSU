"use client";

import { useEffect, useState } from "react";

import { CONDITION_QUESTIONS, PERSONALITY_QUESTIONS } from "@/config/questions";
import Intro from "@/components/Intro";
import OptionGrid from "@/components/OptionGrid";
import PersonalityStep from "@/components/PersonalityStep";
import ResultView from "@/components/ResultView";
import TypeResultView from "@/components/TypeResultView";
import {
  computeAxisScores,
  isPersonalityComplete,
  resolveTravelType,
} from "@/lib/personality";

const LOADING_MESSAGES = [
  "여수 관광지 20곳을 살펴보는 중",
  "성향에 맞는 후보를 추리는 중",
  "추천 이유를 근거와 맞춰보는 중",
];

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

/**
 * 화면마다 필요한 폭이 다르다. 문항 화면은 선택지가 짧아서 넓게 두면
 * 버튼 하나가 화면 폭을 다 쓰는 막대처럼 보인다. 유형·결과 화면만 넓게 쓴다.
 */
function Shell({ wide = false, children }) {
  return (
    <div className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-xl"}`}>
      {children}
    </div>
  );
}

function Panel({ children }) {
  return (
    <div
      className="rounded-3xl border-2 p-5 sm:p-6"
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

/** 상단 진행률 — 현재 단계 안에서의 위치를 보여준다. */
function Progress({ label, current, total }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <span
          className="display text-xs tracking-wide"
          style={{ color: "var(--accent)" }}
        >
          {label}
        </span>
        <span
          className="display text-xs"
          style={{ color: "var(--muted)" }}
        >
          {current} / {total}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ background: "var(--border)" }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${(current / total) * 100}%`,
            background: "var(--accent)",
          }}
        />
      </div>
    </div>
  );
}

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
  // intro → conditions → personality → type → result
  const [phase, setPhase] = useState("intro");
  const [conditionIndex, setConditionIndex] = useState(0);
  const [conditions, setConditions] = useState({});
  const [answerIndex, setAnswerIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  // 매칭도는 제출 규격을 지키려고 본문이 아니라 X-Match-Scores 헤더로 온다.
  const [matchScores, setMatchScores] = useState({});
  const [errorMessage, setErrorMessage] = useState(null);

  const conditionQuestion = CONDITION_QUESTIONS[conditionIndex];
  const personalityQuestion = PERSONALITY_QUESTIONS[answerIndex];

  // 8문항을 다 채우기 전에는 유형이 확정되지 않는다.
  const travelType = isPersonalityComplete(answers)
    ? (() => {
        const { x, y } = computeAxisScores(answers);
        return resolveTravelType(x, y);
      })()
    : null;

  /** 조건 문항도 선택만 기록한다. 넘어가는 건 "다음" 버튼이 맡는다. */
  function selectCondition(value) {
    setConditions((current) => ({ ...current, [conditionQuestion.id]: value }));
  }

  function nextCondition() {
    if (!conditions[conditionQuestion.id]) return;
    if (conditionIndex < CONDITION_QUESTIONS.length - 1) {
      setConditionIndex((i) => i + 1);
    } else {
      setPhase("personality");
    }
  }

  /** 성향 문항은 선택만 기록한다. 넘어가는 건 "다음" 버튼이 맡는다. */
  function selectAnswer(value) {
    setAnswers((current) => ({ ...current, [personalityQuestion.slot]: value }));
  }

  function nextAnswer() {
    if (answers[personalityQuestion.slot] == null) return;
    if (answerIndex < PERSONALITY_QUESTIONS.length - 1) {
      setAnswerIndex((i) => i + 1);
    } else {
      setPhase("type");
    }
  }

  function goBack() {
    if (phase === "conditions") {
      if (conditionIndex > 0) setConditionIndex((i) => i - 1);
      else setPhase("intro");
      return;
    }
    if (phase === "personality") {
      if (answerIndex > 0) setAnswerIndex((i) => i - 1);
      else {
        setPhase("conditions");
        setConditionIndex(CONDITION_QUESTIONS.length - 1);
      }
    }
  }

  async function submit() {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conditions, answers }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "추천을 생성하지 못했습니다.");
      }
      let scores = {};
      try {
        scores = JSON.parse(response.headers.get("X-Match-Scores") ?? "{}");
      } catch {
        // 헤더가 없거나 깨져도 추천 자체는 보여준다. 매칭도만 숨겨진다.
      }
      setResult(data);
      setMatchScores(scores);
      setPhase("result");
      setStatus("idle");
    } catch (error) {
      setErrorMessage(error.message ?? "알 수 없는 오류가 발생했습니다.");
      setStatus("error");
    }
  }

  function restart() {
    setPhase("intro");
    setConditionIndex(0);
    setConditions({});
    setAnswerIndex(0);
    setAnswers({});
    setResult(null);
    setMatchScores({});
    setErrorMessage(null);
    setStatus("idle");
  }

  if (phase === "intro") {
    return <Intro onStart={() => setPhase("conditions")} />;
  }

  if (status === "loading") {
    return (
      <Shell>
        <BrandBar onHome={restart} />
        <LoadingPanel />
      </Shell>
    );
  }

  if (status === "error") {
    return (
      <Shell>
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
                onClick={submit}
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
      </Shell>
    );
  }

  if (phase === "result" && result) {
    return (
      <Shell wide>
        <BrandBar onHome={restart} />
        <ResultView
          result={result}
          matchScores={matchScores}
          travelType={travelType}
          onRestart={restart}
        />
      </Shell>
    );
  }

  if (phase === "type" && travelType) {
    return (
      <Shell wide>
        <BrandBar onHome={restart} />
        <Panel>
          <TypeResultView travelType={travelType} onContinue={submit} />
        </Panel>
      </Shell>
    );
  }

  return (
    <Shell>
      <BrandBar onHome={restart} />
      <Panel>
        {phase === "conditions" && (
          <>
            <Progress
              label="여행 조건"
              current={conditionIndex + 1}
              total={CONDITION_QUESTIONS.length}
            />
            <h2 className="display mb-4 text-2xl leading-snug sm:text-3xl">
              {conditionQuestion.question}
            </h2>
            <OptionGrid
              options={conditionQuestion.options}
              selected={conditions[conditionQuestion.id] ?? null}
              onSelect={selectCondition}
            />
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={goBack}
                className="chunky rounded-xl border-2 px-5 py-3.5 text-sm font-extrabold"
                style={SECONDARY_BUTTON}
              >
                이전
              </button>
              <button
                type="button"
                onClick={nextCondition}
                disabled={!conditions[conditionQuestion.id]}
                className="chunky flex-1 rounded-xl px-4 py-3.5 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-45"
                style={PRIMARY_BUTTON}
              >
                다음
              </button>
            </div>
          </>
        )}

        {phase === "personality" && (
          <>
            <Progress
              label="여행 성향 검사"
              current={answerIndex + 1}
              total={PERSONALITY_QUESTIONS.length}
            />
            <h2 className="display mb-4 text-2xl leading-snug sm:text-3xl">
              {personalityQuestion.question}
            </h2>
            <PersonalityStep
              question={personalityQuestion}
              value={answers[personalityQuestion.slot] ?? null}
              onSelect={selectAnswer}
            />
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={goBack}
                className="chunky rounded-xl border-2 px-5 py-3.5 text-sm font-extrabold"
                style={SECONDARY_BUTTON}
              >
                이전
              </button>
              <button
                type="button"
                onClick={nextAnswer}
                disabled={answers[personalityQuestion.slot] == null}
                className="chunky flex-1 rounded-xl px-4 py-3.5 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-45"
                style={PRIMARY_BUTTON}
              >
                다음
              </button>
            </div>
          </>
        )}
      </Panel>
    </Shell>
  );
}
