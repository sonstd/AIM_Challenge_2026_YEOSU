"use client";

import HeroArt from "@/components/HeroArt";

/** 위저드 진입 전 랜딩 화면. 여기서 시작 버튼을 눌러야 1단계로 들어간다. */
export default function Intro({ onStart }) {
  return (
    // 페이지가 세로 가운데 정렬을 맡으므로 여기서 높이를 강제하지 않는다.
    <section className="flex flex-col items-center justify-center text-center">

      <h1 className="display mt-5 text-[2.6rem] leading-[1.15] sm:text-6xl">
        나에게 딱 맞는
        <br />
        여수 관광지는?
      </h1>

      <p
        className="mt-4 max-w-md text-sm font-['NexonMaplestory'] leading-relaxed sm:text-base"
        style={{ color: "var(--muted)" }}
      >
        간단한 질문에 답하면 AI가 나의 여행 유형을 찾아내고,
        <br className="hidden sm:block" /> 여수 관광지 20곳 중 딱 맞는 3곳을
        이유와 함께 추천해드려요!
      </p>

      <HeroArt className="animate-float mt-8 h-44 w-44 sm:h-52 sm:w-52" />

      {/* 20px 이상 굵은 글씨여야 --cta(3.54:1)가 WCAG AA large 기준을 만족한다. */}
      <button
        type="button"
        onClick={onStart}
        className="chunky mt-9 w-full max-w-sm rounded-2xl px-8 py-4 text-xl font-extrabold sm:text-2xl"
        style={{
          background: "var(--cta)",
          color: "var(--cta-text)",
          "--chunk": "var(--cta-shadow)",
        }}
      >
        관광지 찾기 시작!
      </button>
    </section>
  );
}
