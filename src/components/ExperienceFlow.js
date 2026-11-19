"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { buildFortune } from "@/config/fortune";
import { FAILED_COPY } from "@/config/game-copy";
import { buildRounds, ROUND_DURATION_MS } from "@/lib/spot-game";
import {
  isVideoExpired,
  pollVideo,
  releaseVideo,
  requestVideo,
  VIDEO_TIMEOUT_MS,
} from "@/lib/video";
import ExperienceSelect from "@/components/ExperienceSelect";
import SpotGame from "@/components/SpotGame";
import FortuneScreen from "@/components/FortuneScreen";
import VideoScreen from "@/components/VideoScreen";

/** 완성됐는지 묻는 주기 */
const POLL_INTERVAL_MS = 1000;

/**
 * 안전장치 시간까지 버틸 만큼 라운드를 미리 만들어 둔다.
 * 게임이 중간에 바닥나면 전시장에서 빈 화면이 뜬다.
 */
const ROUND_SUPPLY = Math.ceil(VIDEO_TIMEOUT_MS / ROUND_DURATION_MS) + 1;

/**
 * 미리 여행 체험 — 선택 → 대기 게임 → 영상.
 *
 * 영상 생성은 **선택 화면에서 시작하기를 누른 직후** 요청한다(게임이 끝난 뒤가 아니다).
 * 관람객이 게임을 하는 동안 영상이 만들어지도록 하는 게 이 화면의 존재 이유다.
 */
export default function ExperienceFlow({ recommendations, onBack, onHome }) {
  const [stage, setStage] = useState("select");
  const [choice, setChoice] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [foundCount, setFoundCount] = useState(0);
  // 운영자가 원인을 알 수 있게 실패 사유를 들고 있는다(프롬프트 미비 등).
  const [failReason, setFailReason] = useState(null);
  // 마지막 운세. 무작위가 들어 있어 버튼을 누른 순간에 한 번만 뽑는다.
  const [fortune, setFortune] = useState(null);

  const jobRef = useRef(null);

  // 화면을 벗어나면 생성 요청을 정리한다.
  useEffect(
    () => () => {
      releaseVideo(jobRef.current);
      jobRef.current = null;
    },
    [],
  );

  function start(place, character) {
    setChoice({ place, character });
    setRounds(buildRounds(recommendations, place.place_id, ROUND_SUPPLY));
    setStage("game");

    // 누른 직후 바로 요청한다. 요청이 오가는 동안에도 게임은 이미 돌아가고 있다.
    requestVideo({ placeId: place.place_id, characterId: character.id })
      .then((job) => {
        jobRef.current = job.jobId;
        setJobId(job.jobId);
      })
      .catch((error) => {
        setFailReason(error.message);
        setStage("failed");
      });
  }

  // 완성됐는지 주기적으로 묻는다. 대기 시간 계산은 전부 video.js 안에 있다.
  // jobId 가 아직 없으면(요청이 오가는 중) 묻지 않는다.
  useEffect(() => {
    if (stage !== "game" || !jobId) return undefined;

    let cancelled = false;
    const id = setInterval(async () => {
      const result = await pollVideo(jobId);
      if (cancelled) return;
      if (result) {
        setVideoUrl(result.url);
        return;
      }
      if (isVideoExpired(jobId)) setStage("failed");
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [stage, jobId]);

  const finishGame = useCallback((score) => {
    setFoundCount(score);
    setStage("video");
  }, []);

  if (stage === "select") {
    return (
      <ExperienceSelect
        recommendations={recommendations}
        onStart={start}
        onBack={onBack}
      />
    );
  }

  if (stage === "game" && rounds.length > 0) {
    return (
      <SpotGame
        rounds={rounds}
        videoReady={Boolean(videoUrl)}
        onFinish={finishGame}
        onBack={onBack}
      />
    );
  }

  if (stage === "video" && choice) {
    return (
      <VideoScreen
        place={choice.place}
        character={choice.character}
        videoUrl={videoUrl}
        foundCount={foundCount}
        onFortune={() => {
          setFortune(null);
          setStage("fortune");
        }}
        onHome={onHome}
      />
    );
  }

  if (stage === "fortune" && choice) {
    return (
      <FortuneScreen
        fortune={fortune}
        character={choice.character}
        // 무엇이 나올지는 카드를 고른 순간에 정해진다.
        onDraw={() =>
          setFortune(
            buildFortune({ recommendations, excludePlaceId: choice.place.place_id }),
          )
        }
        onHome={onHome}
      />
    );
  }

  // 안전장치 — 영상을 끝내 못 만든 경우.
  return (
    <section className="flex flex-col items-center gap-4 py-8 text-center">
      <h2 className="display text-2xl">{FAILED_COPY.title}</h2>
      <p className="max-w-lg break-keep text-base" style={{ color: "var(--muted)" }}>
        {FAILED_COPY.lead}
      </p>
      {/* 관람객용 안내는 위 한 줄이면 되고, 아래는 운영자가 원인을 알아보는 용도다. */}
      {failReason && (
        <p className="max-w-lg break-keep text-xs" style={{ color: "var(--muted)" }}>
          {failReason}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="chunky rounded-xl px-5 py-3.5 text-base font-extrabold"
          style={{
            background: "var(--accent)",
            color: "var(--accent-contrast)",
            "--chunk": "var(--accent-strong)",
          }}
        >
          {FAILED_COPY.backLabel}
        </button>
        <button
          type="button"
          onClick={onHome}
          className="chunky rounded-xl border-2 px-5 py-3.5 text-base font-extrabold"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            "--chunk": "var(--chunk-soft)",
          }}
        >
          {FAILED_COPY.homeLabel}
        </button>
      </div>
    </section>
  );
}
