"use client";

import { useEffect, useRef } from "react";

import { retroTextSvg, waitForRetroFont } from "@/lib/retro-text";

/**
 * 인트로와 같은 무지개 레트로 글자. 화면 제목에만 쓴다(본문 금지).
 *
 * 글자 폭을 재서 SVG 를 만들기 때문에 **브라우저에서 마운트된 뒤에** 그린다.
 * 그 전에는 같은 글자를 평범한 서체로 보여 줘서, 폰트가 늦게 와도 화면이 비지 않는다.
 *
 * @param {string|string[]} children 한 줄 또는 줄 단위 배열
 */
export default function RetroText({ children, className = "", options }) {
  const holderRef = useRef(null);
  const lines = Array.isArray(children) ? children : [String(children ?? "")];
  const key = lines.join("\n");

  useEffect(() => {
    let cancelled = false;
    const holder = holderRef.current;
    if (!holder) return undefined;

    waitForRetroFont()
      .catch(() => {})
      .then(() => {
        if (cancelled) return;
        holder.innerHTML = retroTextSvg(key.split("\n"), options);
        holder.dataset.ready = "true";
      });

    return () => {
      cancelled = true;
    };
    // options 는 호출부에서 상수로 넘긴다. 글자가 바뀔 때만 다시 그린다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <span
      className={`retro-text ${className}`}
      ref={holderRef}
      role="img"
      aria-label={key}
    >
      {/* SVG 가 그려지기 전까지 보여 줄 대체 글자 */}
      <span className="retro-text-fallback">{key}</span>
    </span>
  );
}
