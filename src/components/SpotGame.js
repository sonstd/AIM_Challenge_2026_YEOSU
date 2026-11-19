"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { copulaFor, fill, GAME_COPY, INTERRUPT_COPY } from "@/config/game-copy";
import { playLoop, stopLoop } from "@/lib/audio";
import { getOverlay } from "@/config/game-overlays";
import {
  DIFF_COUNT,
  findHit,
  HINT_AFTER_MS,
  HINT_FLASH_MS,
  ROUND_DURATION_MS,
} from "@/lib/spot-game";

/** 영상 도착 토스트를 띄워 두는 시간. 이 동안 게임은 그대로 조작할 수 있다. */
const TOAST_HOLD_MS = 2000;
/** 토스트 뒤 카운트다운(초) */
const COUNTDOWN_SECONDS = 3;
/** 라운드 끝 멘트를 보여 주는 시간 */
const ROUND_OUTRO_MS = 2400;

/** 사진 위에 올리는 요소 한 개. 색은 CSS 변수로 넘겨 색 변경 변형을 한 곳에서 처리한다. */
function OverlayShape({ item, flipped, recolored }) {
  const overlay = getOverlay(item.overlayId);
  if (!overlay) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-full w-full"
      style={{
        "--item": recolored ? item.altColor : item.color,
        // 밝은 하늘 위의 흰 도형도 윤곽이 보이도록 테두리처럼 그림자를 두른다.
        filter:
          "drop-shadow(0 0 2px rgba(0, 0, 0, 0.6)) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.3))",
        transform: flipped ? "scaleX(-1)" : undefined,
      }}
      aria-hidden="true"
    >
      {overlay.elements.map((element, i) => {
        const { type, ...attrs } = element;
        if (type === "circle") return <circle key={i} {...attrs} />;
        if (type === "ellipse") return <ellipse key={i} {...attrs} />;
        return <path key={i} {...attrs} />;
      })}
    </svg>
  );
}

/**
 * 요소와 표식을 사진 위 같은 좌표계(%)에 올린다.
 * 두 그림이 같은 함수를 쓰므로 위아래 위치가 어긋나지 않는다.
 */
function spot(item, scale = 1) {
  return {
    position: "absolute",
    left: `${item.x}%`,
    top: `${item.y}%`,
    height: `${item.size * scale}%`,
    aspectRatio: "1 / 1",
    transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
  };
}

/**
 * 그림 한 장(위 또는 아래).
 *
 * variant 가 "right" 면 정답 요소에 변형을 적용한다.
 *   remove 그리지 않음 / flip 좌우 반전 / color 다른 색
 */
function Picture({ round, variant, found, hintKey, shaking, onTap }) {
  function handleClick(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    onTap({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    });
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <button
        type="button"
        onClick={handleClick}
        className={`relative aspect-[16/10] h-full max-w-full overflow-hidden rounded-2xl border-2 ${shaking ? "animate-shake" : ""}`}
        style={{ borderColor: "var(--border)", background: "var(--surface-sunken)" }}
        aria-label={`${round.placeName} 그림에서 다른 곳 찾기`}
      >
        {round.image && (
          <Image
            src={round.image}
            alt=""
            fill
            sizes="560px"
            className="object-cover"
            priority={variant === "left"}
          />
        )}

        {round.items.map((item) => {
          const altered = variant === "right" ? item.diff : null;
          if (altered === "remove") return null;
          return (
            <span key={item.key} style={spot(item)}>
              <OverlayShape
                item={item}
                flipped={altered === "flip"}
                recolored={altered === "color"}
              />
            </span>
          );
        })}

        {/* 찾은 곳 표식 — 두 그림에 똑같이 찍힌다. */}
        {round.items
          .filter((item) => found.includes(item.key))
          .map((item) => (
            <span
              key={`found-${item.key}`}
              style={{
                ...spot(item, 2),
                borderRadius: "9999px",
                border: "3px solid var(--camellia)",
                boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.75)",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}

        {/* 힌트 — 남은 정답 하나를 잠깐 반짝인다. */}
        {round.items
          .filter((item) => item.key === hintKey)
          .map((item) => (
            <span
              key={`hint-${item.key}`}
              className="animate-hint"
              style={{
                ...spot(item, 2.4),
                borderRadius: "9999px",
                border: "3px solid var(--sea)",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
      </button>
    </div>
  );
}

/**
 * 한 라운드. 라운드가 바뀌면 key 로 통째로 새로 마운트한다
 * (남은 시간, 힌트, 찾은 표식이 섞이지 않게 하기 위한 구조다).
 */
function Round({ round, onHit, onDone }) {
  const [found, setFound] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_DURATION_MS / 1000);
  const [hintReady, setHintReady] = useState(false);
  const [hintKey, setHintKey] = useState(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [shaking, setShaking] = useState(false);

  const foundRef = useRef([]);
  const endedRef = useRef(false);
  const shakeTimer = useRef(null);

  useEffect(() => () => clearTimeout(shakeTimer.current), []);

  const finish = useCallback(
    (reason) => {
      if (endedRef.current) return;
      endedRef.current = true;
      onDone({
        reason,
        found: foundRef.current.length,
        placeName: round.placeName,
      });
    },
    [onDone, round.placeName],
  );

  // 제한 시간이 지나면 다음 라운드로. 남은 시간 표시는 따로 1초마다 줄인다.
  useEffect(() => {
    const id = setTimeout(() => finish("timeout"), ROUND_DURATION_MS);
    return () => clearTimeout(id);
  }, [finish]);

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // 힌트는 한참 못 찾고 있을 때만 열어 준다.
  useEffect(() => {
    const id = setTimeout(() => setHintReady(true), HINT_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  function tap(tapInfo) {
    if (endedRef.current) return;

    const hit = findHit(round.items, tapInfo, foundRef.current);
    if (!hit) {
      // 오답은 점수를 깎지 않는다. 벌칙이 세면 소극적으로 변해서 시간이 안 간다.
      // 클래스만 잠깐 붙였다 뗀다. 여기서 그림을 다시 마운트하면 사진이 깜빡인다.
      setShaking(true);
      clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => setShaking(false), 340);
      return;
    }

    const next = [...foundRef.current, hit.key];
    foundRef.current = next;
    setFound(next);
    setHintKey(null);
    onHit();

    if (next.length >= round.answers.length) finish("clear");
  }

  function showHint() {
    const remaining = round.answers.filter((key) => !foundRef.current.includes(key));
    if (!remaining.length) return;
    setHintUsed(true);
    setHintKey(remaining[0]);
    setTimeout(() => setHintKey(null), HINT_FLASH_MS);
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold" style={{ color: "var(--muted)" }}>
            {fill(GAME_COPY.roundLabel, { round: round.index + 1 })}
          </span>
          <span className="text-base font-extrabold">
            {GAME_COPY.foundLabel} {found.length}/{DIFF_COUNT}
          </span>
          <span className="text-base font-extrabold" style={{ color: "var(--accent)" }}>
            {GAME_COPY.timeLabel} {minutes}:{seconds}
          </span>
        </div>

        <button
          type="button"
          onClick={showHint}
          disabled={!hintReady || hintUsed}
          className="min-h-[44px] rounded-xl border-2 px-4 text-sm font-extrabold disabled:opacity-55"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
          }}
        >
          {hintReady ? GAME_COPY.hintLabel : GAME_COPY.hintWaiting}
        </button>
      </div>

      {/* 두 그림은 세로로 쌓는다. 나란히 두면 태블릿에서 각 그림이 너무 작아진다. */}
      <Picture
        round={round}
        variant="left"
        found={found}
        hintKey={hintKey}
        shaking={shaking}
        onTap={tap}
      />
      <Picture
        round={round}
        variant="right"
        found={found}
        hintKey={hintKey}
        shaking={shaking}
        onTap={tap}
      />
    </>
  );
}

/**
 * 영상이 만들어지는 동안 하는 틀린 그림 찾기.
 *
 * - 라운드가 끝나면(다 찾거나 시간이 다 되면) 장소 멘트를 한 줄 띄우고 다음 라운드로 간다.
 * - 영상이 도착하면(videoReady) 라운드 중간이어도 토스트 → 카운트다운 → 자동 전환.
 * - 유휴 복귀(60초)는 화면 전체를 쥔 Wizard 가 관리한다. 여기서 또 재지 않는다.
 */
export default function SpotGame({ rounds, videoReady, onFinish, onBack }) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [totalFound, setTotalFound] = useState(0);
  const [outro, setOutro] = useState(null);
  const [interrupt, setInterrupt] = useState(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  const stage = interrupt ?? (videoReady ? "toast" : "play");

  const stageRef = useRef(stage);
  const totalRef = useRef(0);
  const outroTimer = useRef(null);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // 게임이 떠 있는 동안 브금을 반복해서 튼다.
  useEffect(() => {
    playLoop("game");
    return () => stopLoop("game");
  }, []);

  useEffect(() => () => clearTimeout(outroTimer.current), []);

  // 토스트를 잠깐 띄운 뒤 카운트다운으로 넘어간다.
  useEffect(() => {
    if (!videoReady) return undefined;
    const id = setTimeout(() => setInterrupt("countdown"), TOAST_HOLD_MS);
    return () => clearTimeout(id);
  }, [videoReady]);

  // 카운트다운이 끝나면 영상 화면으로.
  useEffect(() => {
    if (stage !== "countdown") return undefined;
    const tick = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    const go = setTimeout(() => onFinish(totalRef.current), COUNTDOWN_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(go);
    };
  }, [stage, onFinish]);

  const handleHit = useCallback(() => {
    totalRef.current += 1;
    setTotalFound(totalRef.current);
  }, []);

  const handleRoundDone = useCallback((summary) => {
    // 영상이 도착한 뒤에는 라운드를 더 넘기지 않는다. 곧 영상 화면으로 간다.
    if (stageRef.current !== "play") return;
    setOutro(summary);
    outroTimer.current = setTimeout(() => {
      setOutro(null);
      setRoundIndex((i) => i + 1);
    }, ROUND_OUTRO_MS);
  }, []);

  const round = rounds[roundIndex % rounds.length];
  if (!round) return null;

  return (
    <section className="relative flex flex-col gap-2 lg:h-[calc(var(--stage-h)-7.5rem)]">
      <div className="flex shrink-0 items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold sm:text-xl">{GAME_COPY.title}</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {GAME_COPY.lead}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] shrink-0 rounded-xl px-3 text-sm font-bold"
          style={{ color: "var(--muted)" }}
        >
          ← 추천 결과로
        </button>
      </div>

      <Round
        key={round.key}
        round={{ ...round, index: roundIndex }}
        onHit={handleHit}
        onDone={handleRoundDone}
      />

      {/* 라운드 끝 — 그 장소를 한 줄로 소개한다. 대기 시간을 관광지 노출 시간으로 바꾼다. */}
      {outro && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div
            className="animate-rise rounded-3xl border-2 px-6 py-5 text-center"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <p className="display text-2xl">
              {fill(GAME_COPY.roundOutro, {
                place: outro.placeName,
                copula: copulaFor(outro.placeName),
              })}
            </p>
            <p className="mt-1.5 text-base font-medium" style={{ color: "var(--muted)" }}>
              {fill(
                outro.reason === "clear"
                  ? GAME_COPY.roundOutroFound
                  : GAME_COPY.roundOutroTimeout,
                { found: outro.found },
              )}
            </p>
          </div>
        </div>
      )}

      {/* 1단계 토스트 — 아직 게임을 만질 수 있다(클릭을 가로채지 않는다). */}
      {stage === "toast" && (
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
          <p
            className="animate-rise rounded-full px-5 py-3 text-base font-extrabold"
            style={{
              background: "var(--cta)",
              color: "var(--cta-text)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            {INTERRUPT_COPY.toast}
          </p>
        </div>
      )}

      {/* 2단계 카운트다운 — 결과 한 줄을 보여 주고 자동 전환한다. */}
      {stage === "countdown" && (
        <div
          className="absolute inset-0 flex items-center justify-center p-6"
          style={{ background: "color-mix(in oklch, var(--paper) 78%, transparent)" }}
        >
          <div
            className="animate-rise w-full max-w-md rounded-3xl border-2 px-6 py-6 text-center"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <p className="display text-2xl">{INTERRUPT_COPY.toast}</p>
            <p className="mt-2 text-lg font-bold">
              {fill(INTERRUPT_COPY.score, { count: totalFound })}
            </p>
            <p className="mt-1 text-base" style={{ color: "var(--muted)" }}>
              {fill(INTERRUPT_COPY.countdown, { seconds: Math.max(1, countdown) })}
            </p>
            <button
              type="button"
              onClick={() => onFinish(totalRef.current)}
              className="retro-cta mt-4 w-full px-6 py-4 text-lg font-extrabold"
        >
              {INTERRUPT_COPY.goNow}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
