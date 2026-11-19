"use client";

import { useEffect, useRef, useState } from "react";

import { isMuted, setMuted } from "@/lib/audio";
import { cancelSpeech } from "@/lib/speech";

/**
 * 모든 화면이 들어가는 **무대**. 인트로에서 쓰던 16:9 틀을 앱 전체로 올렸다.
 *
 * 바깥은 어두운 매트, 안쪽은 둥근 모서리의 무대다. 화면이 바뀌어도 같은 무대
 * 안이라 한 편의 방송처럼 이어진다.
 *
 * 무대 **안쪽은 1280×720 고정 좌표계**(--stage-w/--stage-h)이고, 실제 화면 크기에
 * 맞춰 통째로 축소한다. 그래서 어느 해상도에서든 구성이 똑같고, 화면마다 높이를
 * 다시 맞출 필요가 없다. 전시 기준인 1280×800 에서는 배율이 1 이다.
 *
 * CSS 로는 길이를 길이로 나눌 수 없어 배율만 여기서 계산해 --stage-scale 에 넣는다.
 */
export default function Stage({ children }) {
  const frameRef = useRef(null);
  const [soundOff, setSoundOff] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    const design = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--stage-w"),
    );
    if (!design) return undefined;

    const apply = () => {
      frame.style.setProperty("--stage-scale", frame.clientWidth / design);
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  function toggleSound() {
    const next = !isMuted();
    setMuted(next);
    if (next) cancelSpeech();
    setSoundOff(next);
  }

  return (
    <div className="stage-matte">
      <div className="stage-frame" ref={frameRef}>
        {children}

        {/* 소리 끄기 — 전시장에서 조용히 해야 할 때 쓴다. 눈에 띄지 않게 구석에 둔다. */}
        <button
          type="button"
          onClick={toggleSound}
          className="stage-sound"
          aria-label={soundOff ? "소리 켜기" : "소리 끄기"}
          aria-pressed={soundOff}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6.5 9H3v6h3.5L11 19z" />
            {soundOff ? (
              <path d="M16 9.5l4 5M20 9.5l-4 5" />
            ) : (
              <>
                <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
                <path d="M18 6.8a7.5 7.5 0 0 1 0 10.4" />
              </>
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}
