"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { INTRO_CAST, introPhoto } from "@/config/intro";

/** 한 장 → 다음 장 넘어가는 시간. 인트로보다 조금 느리게 둔다(한 명만 도니까). */
const FRAME_MS = 200;

/**
 * 질문을 던지는 출연자가 선 무대.
 *
 * 문항이 바뀌면 다음 사람이 **뒤돌아 있다가 고개를 돌려** 정면을 본다.
 * 인트로와 같은 사진(back → side → front)과 같은 연출이라 화면이 이어진다.
 * 뒤쪽에는 나머지 출연진이 차례를 기다리며 희미하게 서 있다.
 */
export default function GuideStage({ character }) {
  const framesRef = useRef([]);
  const glareRef = useRef(null);
  const bodyRef = useRef(null);

  const frames = character.frames; // back, side, front

  useEffect(() => {
    const imgs = framesRef.current.filter(Boolean);
    const glare = glareRef.current;
    const body = bodyRef.current;
    if (imgs.length < 2) return undefined;

    // 처음엔 뒷모습만 보인다.
    imgs.forEach((img, i) => {
      img.style.opacity = i === 0 ? "1" : "0";
    });

    const timers = [];
    const animations = [];

    // 돌아보는 동안 몸이 살짝 들썩인다.
    animations.push(
      body?.animate(
        [
          { translate: "0 0", scale: "1 1" },
          { translate: "-0.6% -0.8%", scale: "0.99 1.012", offset: 0.45 },
          { translate: "0 0", scale: "1 1" },
        ],
        { duration: FRAME_MS * (imgs.length - 1) + 420, easing: "cubic-bezier(.45,0,.25,1)" },
      ),
    );

    for (let step = 1; step < imgs.length; step += 1) {
      timers.push(
        setTimeout(() => {
          const next = imgs[step];
          const prev = imgs[step - 1];
          next.style.opacity = "1";
          animations.push(
            next.animate([{ opacity: 0 }, { opacity: 1 }], {
              duration: FRAME_MS * 1.1,
              easing: "cubic-bezier(.4,0,.2,1)",
            }),
          );
          animations.push(
            prev.animate([{ opacity: 1 }, { opacity: 0 }], {
              duration: FRAME_MS * 0.7,
              delay: FRAME_MS * 0.3,
              easing: "ease-in",
              fill: "forwards",
            }),
          );
          // 정면을 보는 순간 얼굴 쪽에서 빛이 피어오른다.
          if (step === imgs.length - 1 && glare) {
            animations.push(
              glare.animate(
                [
                  { opacity: 0, scale: 0.6 },
                  { opacity: 0.65, scale: 1, offset: 0.2 },
                  { opacity: 0, scale: 1.25 },
                ],
                { duration: 900, easing: "cubic-bezier(.25,.6,.3,1)" },
              ),
            );
          }
        }, FRAME_MS * step),
      );
    }

    return () => {
      timers.forEach(clearTimeout);
      animations.forEach((animation) => animation?.cancel());
    };
  }, [character.id, frames.length]);

  const waiting = INTRO_CAST.filter((member) => member.id !== character.id);

  return (
    <>
      {/*
        차례를 기다리는 나머지 출연진. 무대 뒤에 희미하게 선다.
        장식이라 클릭을 가로채지 않고, 글이 놓이는 가운데는 패널이 덮는다.
      */}
      <div className="guide-crowd" aria-hidden="true">
        {waiting.map((member) => (
          <span key={member.id} className="guide-crowd-member">
            <Image
              src={introPhoto(member.id, "back")}
              alt=""
              fill
              sizes="200px"
              className="object-contain object-bottom"
            />
          </span>
        ))}
      </div>

      {/* 지금 묻는 사람 */}
      <div className="guide-focus" ref={bodyRef}>
        {frames.map((frame, i) => (
          <span
            key={frame}
            className="guide-frame"
            ref={(node) => {
              framesRef.current[i] = node;
            }}
          >
            <Image
              src={introPhoto(character.id, frame)}
              alt={i === frames.length - 1 ? character.name : ""}
              fill
              sizes="320px"
              priority={i === 0}
              className="object-contain object-bottom"
            />
          </span>
        ))}
        <span className="guide-glare" ref={glareRef} aria-hidden="true" />
      </div>
    </>
  );
}
