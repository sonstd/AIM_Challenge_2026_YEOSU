"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CONDITION_QUESTIONS, PERSONALITY_QUESTIONS } from "@/config/questions";
import { INTRO_CAST } from "@/config/intro";
import {
  guideQuestion,
  LOADING_LINES,
  STEP_LABELS,
} from "@/config/survey-copy";
import GuideAsk from "@/components/GuideAsk";
import GuideStage from "@/components/GuideStage";
import Intro from "@/components/Intro";
import OptionGrid from "@/components/OptionGrid";
import PersonalityStep from "@/components/PersonalityStep";
import ChatResultView from "@/components/ChatResultView";
import ExperienceFlow from "@/components/ExperienceFlow";
import TypeResultView from "@/components/TypeResultView";
import { cancelSpeech, prime, speak } from "@/lib/speech";
import {
  computeAxisScores,
  isPersonalityComplete,
  resolveTravelType,
} from "@/lib/personality";

/** 고른 선택지가 눈에 보이도록 아주 짧게 머문 뒤 다음 문항으로 넘긴다. */
const SELECT_ADVANCE_DELAY = 260;

/** 어느 화면이든 이만큼 조작이 없으면 시작 화면으로 되돌린다(전시 운영). */
const IDLE_RESET_MS = 60000;

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

/**
 * 화면마다 필요한 폭이 다르다. 문항 화면은 선택지가 짧아서 넓게 두면
 * 버튼 하나가 화면 폭을 다 쓰는 막대처럼 보인다. 유형·결과 화면만 넓게 쓴다.
 */
function Shell({ wide = false, children }) {
  // stage-fit 이 1280×720 좌표계를 잡아 주고, 실제 화면 크기에 맞춰 통째로 축소된다.
  return (
    <div className="stage-fit">
      <div className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-xl"}`}>
        {children}
      </div>
    </div>
  );
}

function Panel({ className = "", children }) {
  return (
    <div
      className={`rounded-3xl border-2 p-5 sm:p-6 ${className}`}
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

/**
 * 진행률 — 설문 **전체**를 점으로 보여준다.
 * 단계 안에서의 위치만 보여주면 끝이 가늠되지 않아 중간에 이탈한다.
 * 강조색(동백)은 지나온 점에만 쓴다.
 */
function Progress({ label, current, total }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <span className="text-sm font-bold" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <div className="flex items-center gap-1.5" aria-label={`${total}문항 중 ${current}번째`}>
        {Array.from({ length: total }, (_, i) => {
          const done = i < current;
          return (
            <span
              key={i}
              className="block rounded-full transition-colors"
              style={{
                width: i === current - 1 ? 18 : 8,
                height: 8,
                background: done ? "var(--camellia)" : "var(--border)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function LoadingPanel() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setMessageIndex((i) => (i + 1) % LOADING_LINES.length),
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
          {LOADING_LINES[messageIndex]}…
        </p>
      </div>
    </Panel>
  );
}

export default function Wizard() {
  // intro → conditions → personality → type → result → experience(미리 여행 체험)
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

  // 설문 전체 문항 수. 진행률 점은 이 값을 기준으로 끝이 보이게 그린다.
  const totalSteps = CONDITION_QUESTIONS.length + PERSONALITY_QUESTIONS.length;
  const stepIndex =
    phase === "personality"
      ? CONDITION_QUESTIONS.length + answerIndex + 1
      : conditionIndex + 1;

  /*
   * 장면 전환 플래시. 인트로에서 쓰던 번쩍임을 화면이 바뀔 때마다 재생한다.
   * 첫 화면(인트로)에서는 띄우지 않는다 — 인트로가 자기 연출을 갖고 있다.
   */
  const flashRef = useRef(null);
  const lastScene = useRef("intro");
  useEffect(() => {
    const scene = status === "loading" ? "loading" : phase;
    if (scene === lastScene.current) return;
    lastScene.current = scene;
    if (scene === "intro") return;
    flashRef.current?.animate(
      [{ opacity: 0 }, { opacity: 0.45, offset: 0.12 }, { opacity: 0.15, offset: 0.5 }, { opacity: 0 }],
      { duration: 700, easing: "ease-out" },
    );
  }, [phase, status]);

  /*
   * 질문을 읽어 준다. 글이 많아 지루하다는 피드백 때문에 넣었다.
   * 묻는 사람이 돌아본 뒤에 말하도록 조금 늦춘다.
   */
  useEffect(() => {
    // 질문 6개는 고정이라 앱이 뜨자마자 미리 받아 둔다. 설문에 닿을 때쯤이면 준비돼 있다.
    const questions = [
      ...CONDITION_QUESTIONS.map((q) => guideQuestion(q.id, q.question)),
      ...PERSONALITY_QUESTIONS.map((q) => guideQuestion(q.slot, q.question)),
    ];
    // 문항마다 묻는 사람이 다르므로 목소리도 사람별로 따로 받아 둔다.
    questions.forEach((text, i) => prime([text], INTRO_CAST[i]?.voice));
  }, []);

  useEffect(() => {
    if (phase !== "conditions" && phase !== "personality") return undefined;
    const question =
      phase === "conditions"
        ? guideQuestion(conditionQuestion.id, conditionQuestion.question)
        : guideQuestion(personalityQuestion.slot, personalityQuestion.question);

    const voice = INTRO_CAST[stepIndex - 1]?.voice;
    const timer = setTimeout(() => speak(question, { voice }), 650);
    return () => {
      clearTimeout(timer);
      cancelSpeech();
    };
    // 문항이 바뀔 때만 다시 읽는다. 같은 문항에서 답을 고쳐도 다시 읽지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepIndex]);

  const advanceTimer = useRef(null);
  const advanceAfterSelect = (move) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(move, SELECT_ADVANCE_DELAY);
  };
  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  // 성향 문항을 다 채우기 전에는 유형이 확정되지 않는다.
  const travelType = isPersonalityComplete(answers)
    ? (() => {
        const { x, y } = computeAxisScores(answers);
        return resolveTravelType(x, y);
      })()
    : null;

  /**
   * 전시장에서는 터치 수를 줄이는 쪽이 낫다. **고르면 바로 다음 문항으로 넘어간다.**
   * 고른 게 눈에 보이도록 아주 짧게 머문 뒤 넘긴다. 고친 답은 "이전"으로 되돌린다.
   */
  function selectCondition(value) {
    setConditions((current) => ({ ...current, [conditionQuestion.id]: value }));
    advanceAfterSelect(() => {
      if (conditionIndex < CONDITION_QUESTIONS.length - 1) {
        setConditionIndex((i) => i + 1);
      } else {
        setPhase("personality");
      }
    });
  }

  function selectAnswer(value) {
    setAnswers((current) => ({ ...current, [personalityQuestion.slot]: value }));
    advanceAfterSelect(() => {
      if (answerIndex < PERSONALITY_QUESTIONS.length - 1) {
        setAnswerIndex((i) => i + 1);
      } else {
        setPhase("type");
      }
    });
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

  const restart = useCallback(() => {
    setPhase("intro");
    setConditionIndex(0);
    setConditions({});
    setAnswerIndex(0);
    setAnswers({});
    setResult(null);
    setMatchScores({});
    setErrorMessage(null);
    setStatus("idle");
  }, []);

  /**
   * 유휴 복귀 — **어느 화면이든** 60초간 조작이 없으면 시작 화면으로 돌아간다.
   * 다음 관람객이 앞사람 결과를 보지 않게 하기 위함이다.
   * 시작 화면에서는 돌아갈 곳이 없으므로 타이머를 걸지 않는다.
   */
  useEffect(() => {
    if (phase === "intro") return undefined;

    let timer = null;
    const arm = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(restart, IDLE_RESET_MS);
    };

    arm();
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", arm);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [phase, restart]);

  /* 어떤 화면을 보여 줄지 고른다. 바깥은 늘 같은 무대다. */
  const screen = (() => {
  if (phase === "intro") {
    return <Intro onStart={() => setPhase("conditions")} />;
  }

  if (status === "loading") {
    return (
      <Shell>
        <LoadingPanel />
      </Shell>
    );
  }

  if (status === "error") {
    return (
      <Shell>
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

  if (phase === "experience" && result) {
    return (
      <Shell wide>
        <ExperienceFlow
          recommendations={result.recommendations}
          onBack={() => setPhase("result")}
          onHome={restart}
        />
      </Shell>
    );
  }

  if (phase === "result" && result) {
    return (
      <Shell wide>
        <ChatResultView
          result={result}
          matchScores={matchScores}
          travelType={travelType}
          onRestart={restart}
          onExperience={() => setPhase("experience")}
        />
      </Shell>
    );
  }

  if (phase === "type" && travelType) {
    return (
      <Shell wide>
        <Panel>
          <TypeResultView travelType={travelType} onContinue={submit} />
        </Panel>
      </Shell>
    );
  }

  const asking = INTRO_CAST[stepIndex - 1];

  return (
    // 설문은 무대를 넓게 쓴다 — 왼쪽에 묻는 사람이 서고 오른쪽에 질문이 놓인다.
    <Shell wide>
      <div className="flex items-end justify-center gap-5">
      <GuideStage character={asking} />
      <Panel className="guide-panel w-full max-w-2xl">
        {phase === "conditions" && (
          <>
            <Progress
              label={STEP_LABELS.conditions}
              current={stepIndex}
              total={totalSteps}
            />
            <GuideAsk
              question={guideQuestion(
                conditionQuestion.id,
                conditionQuestion.question,
              )}
              character={asking}
            />
            <div className="mt-4">
              <OptionGrid
                options={conditionQuestion.options}
                icons={conditionQuestion.icons}
                selected={conditions[conditionQuestion.id] ?? null}
                onSelect={selectCondition}
              />
            </div>
          </>
        )}

        {phase === "personality" && (
          <>
            <Progress
              label={STEP_LABELS.personality}
              current={stepIndex}
              total={totalSteps}
            />
            <GuideAsk
              question={guideQuestion(
                personalityQuestion.slot,
                personalityQuestion.question,
              )}
              character={asking}
            />
            <div className="mt-4">
              <PersonalityStep
                question={personalityQuestion}
                value={answers[personalityQuestion.slot] ?? null}
                onSelect={selectAnswer}
              />
            </div>
          </>
        )}

        {/* 되돌아가는 길은 작게 하나만 둔다. 앞으로 가는 건 선택지가 맡는다. */}
        <div className="mt-4 flex justify-start">
          <button
            type="button"
            onClick={goBack}
            className="min-h-[44px] rounded-xl px-3 text-sm font-bold"
            style={{ color: "var(--muted)" }}
          >
            ← 이전 질문
          </button>
        </div>
      </Panel>
      </div>
    </Shell>
  );
  })();

  return (
    <>
      {screen}
      {/* 장면이 바뀔 때 번쩍 — 인트로와 같은 연출이다. */}
      <div className="stage-flash" ref={flashRef} />
    </>
  );
}
