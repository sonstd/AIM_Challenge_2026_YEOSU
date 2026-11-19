"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CARD_INTRO,
  CHAT_QUESTIONS,
  CHAT_TIMING,
  GREETING_TEMPLATE,
  LOCAL_GUIDE,
  PHOTO_LABEL,
  SWITCH_TEMPLATE,
} from "@/config/chat-questions";
import PlaceCard from "@/components/PlaceCard";
import { buildTurns } from "@/lib/chat-script";
import { cancelSpeech, prime, speak } from "@/lib/speech";
import { NARRATOR_VOICE } from "@/config/chat-questions";

const randomTypingDelay = () =>
  CHAT_TIMING.typingMin +
  Math.random() * (CHAT_TIMING.typingMax - CHAT_TIMING.typingMin);

function Avatar({ hidden = false }) {
  if (hidden) return <span className="h-9 w-9 shrink-0" aria-hidden="true" />;
  return (
    <span
      className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-full"
      style={{
        background: "color-mix(in oklch, var(--accent) 16%, var(--surface))",
        border: "2px solid var(--border)",
      }}
      aria-hidden="true"
    >
      {/* 전신 사진이라 동그란 틀에서는 얼굴만 보이게 확대해 자른다. */}
      <Image
        src={LOCAL_GUIDE.image}
        alt=""
        fill
        sizes="36px"
        className="object-cover"
        style={{ objectPosition: "50% 0%", transform: "scale(1.7)", transformOrigin: "50% 6%" }}
      />
    </span>
  );
}

/** 토박이 말풍선(왼쪽). 추천 이유 문장을 **가공 없이 그대로** 넣는다. */
function GuideBubble({ children }) {
  return (
    <div className="animate-rise flex items-end gap-2">
      <Avatar />
      <p
        className="max-w-[min(32rem,78%)] rounded-3xl rounded-bl-lg px-4 py-3 text-base leading-relaxed"
        style={{
          background: "var(--surface)",
          border: "2px solid var(--border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {children}
      </p>
    </div>
  );
}

/** 여행객 말풍선(오른쪽). 칩을 누르면 이 모양으로 올라간다. */
function UserBubble({ children }) {
  return (
    <div className="animate-rise flex justify-end">
      <p
        className="max-w-[min(28rem,78%)] rounded-3xl rounded-br-lg px-4 py-3 text-base font-medium leading-relaxed"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
      >
        {children}
      </p>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2" role="status" aria-label="답변을 쓰는 중">
      <Avatar />
      <span
        className="flex items-center gap-1.5 rounded-3xl rounded-bl-lg px-5 py-4"
        style={{
          background: "var(--surface)",
          border: "2px solid var(--border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full"
            style={{ background: "var(--muted)", animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
    </div>
  );
}

/**
 * Q1 답변 뒤에 붙는 사진 버튼.
 *
 * 사진을 말풍선으로 바로 깔면 대화 영역을 많이 차지하고, 좁은 틀에 맞추느라
 * 잘려 보인다. 버튼으로 두고 누르면 **잘리지 않은 사진**을 크게 띄운다.
 */
function PhotoChip({ onOpen, label }) {
  return (
    <div className="animate-rise flex items-end gap-2">
      <Avatar hidden />
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-[44px] items-center gap-2 rounded-3xl rounded-bl-lg border-2 px-4 text-base font-bold"
        style={{
          borderColor: "var(--accent)",
          background: "var(--surface)",
          color: "var(--accent)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
          <circle cx="8.5" cy="9.5" r="1.6" />
          <path d="M4 16.5l4.5-4 3.5 3 3.5-3.5 4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {label}
      </button>
    </div>
  );
}

/** 사진을 무대 가득 띄운다. 아무 데나 누르면 닫힌다. */
function PhotoViewer({ src, alt, onClose }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="사진 닫기"
      className="animate-rise absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 p-6"
      style={{ background: "color-mix(in oklch, var(--matte) 82%, transparent)" }}
    >
      <span className="relative block h-[70%] w-full max-w-3xl">
        <Image src={src} alt={alt} fill sizes="768px" className="object-contain" />
      </span>
      <span className="text-base font-bold" style={{ color: "#fff" }}>
        {alt} · 아무 데나 누르면 닫혀라우
      </span>
    </button>
  );
}

/**
 * 한 장소의 대화. **장소가 바뀌면 key로 통째로 새로 마운트**한다.
 * 이전 장소의 타이머나 말풍선이 남아 섞이지 않게 하기 위한 구조다.
 */
function Conversation({ place, isTop, onPhoto }) {
  const [asked, setAsked] = useState([]);
  const [chipsReady, setChipsReady] = useState(false);

  const timers = useRef([]);
  const bottomRef = useRef(null);

  const turns = useMemo(
    () => buildTurns(place.recommend_reason),
    [place.recommend_reason],
  );

  const later = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  // 추천 근거를 미리 받아 둔다. 관람객이 칩을 누를 때쯤이면 바로 들린다.
  useEffect(() => {
    prime(turns.flatMap((turn) => turn.sentences), NARRATOR_VOICE);
  }, [turns]);

  // 마운트되면 잠깐 뒤에 첫 질문 칩을 띄운다.
  useEffect(() => {
    const scheduled = timers.current;
    const id = setTimeout(() => setChipsReady(true), CHAT_TIMING.nextChipDelay);
    scheduled.push(id);
    return () => {
      scheduled.forEach(clearTimeout);
      scheduled.length = 0;
      cancelSpeech();
    };
  }, []);

  const remaining = turns.filter(
    (turn) => !asked.some((entry) => entry.id === turn.id),
  );
  const finished = turns.length > 0 && remaining.length === 0;
  const allRevealed = asked.every((entry) => entry.revealed);
  const done = finished && allRevealed;

  const ask = useCallback(
    (turnId) => {
      setChipsReady(false);
      setAsked((current) =>
        current.some((entry) => entry.id === turnId)
          ? current
          : [...current, { id: turnId, revealed: false }],
      );

      later(() => {
        setAsked((current) =>
          current.map((entry) =>
            entry.id === turnId ? { ...entry, revealed: true } : entry,
          ),
        );
        /*
         * 말풍선이 뜨는 순간 추천 근거를 읽어 준다. 글자는 손대지 않고 그대로 읽는다.
         * **다 읽은 뒤에** 다음 질문 칩을 띄운다 — 읽는 도중에 칩이 떠서 자동으로
         * 넘어가 버리면 말이 중간에 끊긴다.
         */
        const turn = turns.find((item) => item.id === turnId);
        if (turn) {
          speak(turn.sentences.join(" "), {
            voice: NARRATOR_VOICE,
            onEnd: () => later(() => setChipsReady(true), CHAT_TIMING.nextChipDelay),
          });
        } else {
          later(() => setChipsReady(true), CHAT_TIMING.nextChipDelay);
        }
      }, randomTypingDelay());
    },
    [later, turns],
  );

  // 전시장에서 가장 나쁜 건 멈춰 있는 화면이다.
  // 칩을 띄워 둔 채 8초가 지나면 첫 번째 칩을 대신 눌러 준다.
  useEffect(() => {
    if (!chipsReady || !remaining.length) return undefined;
    const first = remaining[0].id;
    const id = setTimeout(() => ask(first), CHAT_TIMING.autoAdvance);
    return () => clearTimeout(id);
  }, [chipsReady, remaining, ask]);

  // 새 말풍선이 생기면 대화 영역을 부드럽게 맨 아래로 내린다.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [asked, chipsReady]);

  const greeting = (isTop ? GREETING_TEMPLATE : SWITCH_TEMPLATE).replace(
    "{place}",
    place.place_name,
  );

  return (
    <div
      className="flex min-h-0 flex-1 max-h-[min(58vh,30rem)] flex-col gap-3 overflow-y-auto rounded-3xl border-2 p-4 sm:p-5 lg:max-h-none"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in oklch, var(--accent) 6%, var(--surface))",
      }}
    >
      <GuideBubble>{greeting}</GuideBubble>

      {asked.map((entry) => {
        const turn = turns.find((item) => item.id === entry.id);
        if (!turn) return null;
        return (
          <div key={entry.id} className="flex flex-col gap-3">
            <UserBubble>{turn.text}</UserBubble>
            {entry.revealed ? (
              <>
                {turn.sentences.map((sentence, i) => (
                  <GuideBubble key={i}>{sentence}</GuideBubble>
                ))}
                {/* 사진은 객관 설명(Q1) 바로 뒤에 한 장만 붙인다. */}
                {turn.id === CHAT_QUESTIONS[0].id && place.images?.[0] && (
                  <PhotoChip onOpen={onPhoto} label={PHOTO_LABEL} />
                )}
              </>
            ) : (
              <TypingBubble />
            )}
          </div>
        );
      })}

      {/* 남은 질문 칩 — 오른쪽 정렬. 터치 영역 44px 이상. */}
      {chipsReady && remaining.length > 0 && (
        <div className="animate-rise flex flex-wrap justify-end gap-2">
          {remaining.map((turn) => (
            <button
              key={turn.id}
              type="button"
              onClick={() => ask(turn.id)}
              className="min-h-[44px] rounded-full border-2 px-4 text-base font-bold"
              style={{
                borderColor: "var(--accent)",
                background: "var(--surface)",
                color: "var(--accent)",
              }}
            >
              {turn.text}
            </button>
          ))}
        </div>
      )}

      {/* 영상은 아래 미리 여행 체험해보기 버튼에서 시작한다(장소·캐릭터 선택 뒤). */}
      {done && <GuideBubble>{CARD_INTRO}</GuideBubble>}

      <div ref={bottomRef} />
    </div>
  );
}

export default function ChatResultView({
  result,
  matchScores = {},
  travelType,
  onRestart,
  onExperience,
}) {
  const recommendations = result.recommendations;
  // 지금 대화 중인 장소. 카드를 누르면 바뀐다.
  const [activeIndex, setActiveIndex] = useState(0);
  // 사진을 크게 띄워 둔 상태인지. 장소가 바뀌면 닫는다.
  const [photoOpen, setPhotoOpen] = useState(false);

  // 유휴 복귀(60초)는 화면 전체를 감싸는 Wizard 가 한 곳에서 관리한다.
  // 영상 생성은 여기서 미리 띄우지 않는다. 캐릭터를 고른 뒤에야 요청할 수 있으므로
  // 체험 선택 화면에서 시작하기를 누른 직후 requestVideo 가 호출된다.

  const active = recommendations[activeIndex];
  if (!active) return null;

  // 대화 중인 곳을 뺀 나머지를 카드로 보여준다. 1순위로 돌아올 수도 있어야 한다.
  const others = recommendations
    .map((recommendation, index) => ({ recommendation, index }))
    .filter((entry) => entry.index !== activeIndex);

  return (
    // 전시용 태블릿에서는 페이지를 스크롤하지 않는다. 높이를 화면에 맞추고
    // 남는 공간은 대화 영역이 가져가며, 스크롤은 그 안에서만 일어난다.
    <section className="flex flex-col lg:h-[calc(var(--stage-h)-7.5rem)]">
      {/* 헤더 — 매칭도는 여기에만 둔다. 대화 중에 숫자를 띄우면 말투 톤이 깨진다. */}
      <div
        className="mb-3 shrink-0 rounded-3xl border-2 px-5 py-3.5"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <p className="text-sm font-bold" style={{ color: "var(--muted)" }}>
          {travelType
            ? `${travelType.name} 님께 딱 맞는 곳`
            : "맞춤 추천"}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="display text-2xl sm:text-3xl">{active.place_name}</h2>
          {typeof matchScores[active.place_id] === "number" && (
            <span className="text-base font-extrabold" style={{ color: "var(--accent)" }}>
              매칭도 {matchScores[active.place_id]}%
            </span>
          )}
        </div>
      </div>

      {/*
        무대가 가로로 넓고 세로가 짧다. 대화와 카드 목록을 **나란히** 두면
        대화가 화면 높이를 거의 다 쓸 수 있다(세로로 쌓으면 둘 다 답답해진다).
      */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <Conversation
          key={active.place_id}
          place={active}
          isTop={activeIndex === 0}
          onPhoto={() => setPhotoOpen(true)}
        />

        {/* 나머지 추천 — 카드를 누르면 그 장소 대화로 바뀐다. */}
        <div className="flex min-h-0 shrink-0 flex-col lg:w-[23rem]">
          <p className="mb-1 shrink-0 text-xs font-bold" style={{ color: "var(--muted)" }}>
            다른 추천지도 눌러서 물어보세요
          </p>
          <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto overflow-y-hidden pb-1 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto">
          {others.map(({ recommendation, index }) => (
            <div
              key={recommendation.place_id}
              className="flex w-[19rem] shrink-0 sm:w-[26rem] lg:w-full"
            >
              <PlaceCard
                recommendation={recommendation}
                matchScore={matchScores[recommendation.place_id]}
                index={index}
                maxSentences={1}
                compact
                onSelect={() => {
                  setPhotoOpen(false);
                  setActiveIndex(index);
                }}
              />
            </div>
          ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex shrink-0 flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
        {/* 미리 여행 체험 — 장소·캐릭터를 고르면 영상을 만들기 시작한다. */}
        {onExperience && (
          <button
            type="button"
            onClick={onExperience}
            className="retro-cta w-full px-6 py-3 text-base font-extrabold sm:w-auto"
        >
            미리 여행 체험해보기
          </button>
        )}
        <button
          type="button"
          onClick={onRestart}
          className="chunky w-full rounded-xl border-2 px-6 py-3 text-base font-extrabold sm:w-auto"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            "--chunk": "var(--chunk-soft)",
          }}
        >
          다시 검사하기
        </button>
      </div>
      {photoOpen && active.images?.[0] && (
        <PhotoViewer
          src={active.images[0]}
          alt={active.place_name}
          onClose={() => setPhotoOpen(false)}
        />
      )}
    </section>
  );
}
