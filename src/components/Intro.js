"use client";

import { useEffect, useRef } from "react";

import {
  INTRO_CHARACTERS,
  INTRO_LAYOUT,
  INTRO_LOOP,
  INTRO_ORDER,
  INTRO_SIDE_FACES,
  INTRO_TEXT,
  INTRO_TIMING,
} from "@/config/intro";
import { playLoop, stopLoop } from "@/lib/audio";
import { retroTextSvg } from "@/lib/retro-text";

/**
 * 인트로(어트랙트) 화면.
 *
 * 여섯 명이 뒤돌아 서 있다가 앞에서부터 차례로 고개를 돌린다. 돌아보는 순간
 * 조명이 켜지고 뒤에서 역광이 번지며 타이틀과 시작 버튼이 뜬다. 그대로 반복된다.
 *
 * 연출은 전부 **이 effect 안에서 DOM 을 직접 다룬다.** 프레임마다 React 를 거치면
 * 사람 여섯 × 사진 세 장이 매번 다시 그려져 움직임이 끊긴다.
 * 값(사람·대열·타이밍·문구)은 src/config/intro.js 에 있다.
 */
export default function Intro({ onStart }) {
  const stageRef = useRef(null);
  const lineupRef = useRef(null);
  const raysRef = useRef(null);
  const titleRef = useRef(null);
  const titleTextRef = useRef(null);
  const startRef = useRef(null);
  const flashRef = useRef(null);

  // 인트로가 떠 있는 동안 주제가를 반복해서 튼다.
  useEffect(() => {
    playLoop("start");
    return () => stopLoop("start");
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const lineup = lineupRef.current;
    const rayCv = raysRef.current;
    if (!stage || !lineup || !rayCv) return undefined;

    const T = INTRO_TIMING;
    let runId = 0; // 정리될 때 올려서 진행 중인 연출을 끊는다
    let haloRun = 0;
    let z = 1;

    /* ── 대열 세우기 ─────────────────────────────────────────────── */
    const chars = INTRO_CHARACTERS.map((character, i) => {
      const el = document.createElement("div");
      el.className = "char";
      const height = INTRO_LAYOUT.h0 * INTRO_LAYOUT.depth ** i;
      el.style.cssText =
        `--cx:${INTRO_LAYOUT.cx0 + INTRO_LAYOUT.dx * i};` +
        `--t:${INTRO_LAYOUT.top0 - INTRO_LAYOUT.rise * i};` +
        `--h:${height};--ar:${character.ar};--z:${20 - i}`;

      const light = document.createElement("div");
      light.className = "light";
      const imgs = character.frames.map((frame) => {
        const img = document.createElement("img");
        img.alt = "";
        img.src = `/images/intro/${character.id}_${frame}.webp`;
        light.appendChild(img);
        return img;
      });

      const glare = document.createElement("div");
      glare.className = "glare";
      el.append(light, glare);
      lineup.appendChild(el);

      return { el, light, glare, imgs, pos: 0 };
    });

    /* ── 한 장 → 다음 장. 새 사진이 흐릿하게 겹쳐 들어오며 잔상을 남긴다 ── */
    const crossTo = (c, k, dur) => {
      const prev = c.imgs[c.pos];
      const next = c.imgs[k];
      next.getAnimations().forEach((a) => a.cancel());
      next.style.zIndex = ++z;
      next.style.opacity = 1;
      next.animate(
        [
          { opacity: 0, filter: "blur(.35cqw)" },
          { opacity: 1, filter: "blur(.12cqw)", offset: 0.6 },
          { opacity: 1, filter: "blur(0)" },
        ],
        { duration: dur * 1.15, easing: "cubic-bezier(.4,0,.2,1)" },
      );
      const out = prev.animate(
        [
          { opacity: 1, filter: "blur(0)" },
          { opacity: 0, filter: "blur(.35cqw)" },
        ],
        { duration: dur * 0.6, delay: dur * 0.4, easing: "ease-in", fill: "forwards" },
      );
      out.finished
        .then(() => {
          if (c.imgs[c.pos] !== prev) {
            prev.style.opacity = 0;
            out.cancel();
          }
        })
        .catch(() => {});
      c.pos = k;
    };

    const sleep = (ms, id) =>
      new Promise((resolve, reject) => {
        setTimeout(() => (id === runId ? resolve() : reject(new Error("stale"))), ms);
      });

    /** 앞을 보는 순간 얼굴 쪽에서 빛이 피어올랐다 사라진다. */
    const glow = (c) => {
      c.glare.animate(
        [
          { opacity: 0, scale: 0.5 },
          { opacity: 0.7, scale: 1, offset: 0.18 },
          { opacity: 0.32, scale: 1.15, offset: 0.5 },
          { opacity: 0, scale: 1.3 },
        ],
        { duration: 1300, easing: "cubic-bezier(.25,.6,.3,1)" },
      );
      c.el.animate(
        [
          { filter: "brightness(1)" },
          { filter: "brightness(1.35)", offset: 0.15 },
          { filter: "brightness(1.1)", offset: 0.5 },
          { filter: "brightness(1)" },
        ],
        { duration: 1200, easing: "ease-out" },
      );
    };

    /** 고개 돌리기. dir = +1 (뒤→앞) / -1 (앞→뒤) */
    const turn = async (c, id, dir, { speed = 1, flash = true } = {}) => {
      const n = c.imgs.length;
      const dur = T.frame * speed;
      const total = dur * (n - 1);
      const lean = dir * INTRO_SIDE_FACES;

      // 몸 전체: 돌기 직전 살짝 웅크렸다가 들썩이고 다시 자리를 잡는다
      c.el.animate(
        [
          { translate: "-50% 0", scale: "1 1" },
          { translate: `${-50 - 0.3 * lean}% 0.35%`, scale: "1.004 .994", offset: 0.12 },
          { translate: `${-50 + 0.7 * lean}% -0.7%`, scale: ".985 1.012", offset: 0.45 },
          { translate: "-50% 0.2%", scale: "1.006 .996", offset: 0.75 },
          { translate: "-50% 0", scale: "1 1" },
        ],
        { duration: total + 520, easing: "cubic-bezier(.45,0,.25,1)" },
      );

      await sleep(60 * speed, id);
      const keys = [...Array(n).keys()];
      const order = dir > 0 ? keys : keys.reverse();
      for (let s = 1; s < n; s += 1) {
        crossTo(c, order[s], dur);
        if (s === n - 1 && flash && dir > 0) setTimeout(() => glow(c), dur * 0.5);
        await sleep(dur, id);
      }
    };

    /* ── 후광: 뒤쪽 광원을 사람 실루엣이 가려 빛줄기가 뻗는다 ──────── */
    const rctx = rayCv.getContext("2d");
    const LB = document.createElement("canvas");
    const ZB = document.createElement("canvas");
    const lctx = LB.getContext("2d");
    const zctx = ZB.getContext("2d");
    LB.width = ZB.width = 384;
    LB.height = ZB.height = 216;
    const HALO = { x: 0.5, y: 0.32, dur: 4600, rise: 900, fall: 2000 };

    const drawRays = (I, t) => {
      const W = LB.width;
      const H = LB.height;
      const sx = W * (HALO.x + Math.sin(t / 1300) * 0.006);
      const sy = H * (HALO.y + Math.cos(t / 1700) * 0.006);

      // ① 광원
      lctx.globalCompositeOperation = "source-over";
      lctx.clearRect(0, 0, W, H);
      const R = W * (0.2 + 0.22 * I);
      const g = lctx.createRadialGradient(sx, sy, 0, sx, sy, R);
      g.addColorStop(0, `rgba(255,252,240,${I})`);
      g.addColorStop(0.25, `rgba(255,238,200,${0.85 * I})`);
      g.addColorStop(0.6, `rgba(255,220,160,${0.3 * I})`);
      g.addColorStop(1, "rgba(255,210,140,0)");
      lctx.fillStyle = g;
      lctx.fillRect(0, 0, W, H);

      // ② 사람 실루엣으로 빛 가리기
      lctx.globalCompositeOperation = "destination-out";
      const sr = stage.getBoundingClientRect();
      for (const c of chars) {
        const r = c.el.getBoundingClientRect();
        lctx.drawImage(
          c.imgs[c.pos],
          ((r.left - sr.left) / sr.width) * W,
          ((r.top - sr.top) / sr.height) * H,
          (r.width / sr.width) * W,
          (r.height / sr.height) * H,
        );
      }

      // ③ 광원 쪽으로 방사형 블러 → 빛줄기
      zctx.globalCompositeOperation = "source-over";
      zctx.clearRect(0, 0, W, H);
      zctx.globalCompositeOperation = "lighter";
      const N = 26;
      const reach = 0.055 + 0.03 * I;
      for (let i = 0; i < N; i += 1) {
        const s = 1 + i * reach;
        zctx.globalAlpha = 0.155 * 0.905 ** i;
        zctx.drawImage(LB, sx - sx * s, sy - sy * s, W * s, H * s);
      }
      zctx.globalAlpha = 1;

      // ④ 화면에 그리기
      const cw = Math.round(sr.width * 0.6);
      const ch = Math.round(sr.height * 0.6);
      if (rayCv.width !== cw || rayCv.height !== ch) {
        rayCv.width = cw;
        rayCv.height = ch;
      }
      rctx.clearRect(0, 0, cw, ch);
      rctx.drawImage(ZB, 0, 0, cw, ch);
    };

    const haloBurst = (id) => {
      const run = ++haloRun;
      const t0 = performance.now();
      const ease = (x) => 1 - (1 - x) ** 3;
      const smooth = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);

      const frame = (now) => {
        if (run !== haloRun || id !== runId) return;
        const t = now - t0;
        let I;
        if (t < HALO.rise) I = ease(t / HALO.rise);
        else if (t < HALO.dur - HALO.fall)
          I = 1 - 0.08 * Math.sin((t - HALO.rise) / 420) ** 2; // 은은하게 숨쉬듯
        else
          I =
            (1 - smooth(Math.min(1, (t - (HALO.dur - HALO.fall)) / HALO.fall))) * 0.92;
        drawRays(I, t);
        if (t < HALO.dur) requestAnimationFrame(frame);
        else rctx.clearRect(0, 0, rayCv.width, rayCv.height);
      };
      requestAnimationFrame(frame);

      // 역광을 받은 사람들 테두리가 은은하게 빛난다
      chars.forEach((c, i) => {
        c.light.animate(
          [
            { filter: "brightness(1) saturate(1) drop-shadow(0 0 0 rgba(255,236,190,0))" },
            {
              filter:
                "brightness(1.04) saturate(1.02) drop-shadow(0 0 1.1cqw rgba(255,238,195,.75))",
              offset: 0.22,
            },
            {
              filter:
                "brightness(1.03) saturate(1.02) drop-shadow(0 0 .9cqw rgba(255,238,195,.6))",
              offset: 0.55,
            },
            { filter: "brightness(1) saturate(1) drop-shadow(0 0 0 rgba(255,236,190,0))" },
          ],
          { duration: HALO.dur - 200, delay: 40 * i, easing: "cubic-bezier(.3,0,.3,1)" },
        );
      });
    };

    const clearHalo = () => {
      haloRun += 1;
      rctx.clearRect(0, 0, rayCv.width, rayCv.height);
    };

    const screenFlash = () => {
      flashRef.current?.animate(
        [{ opacity: 0 }, { opacity: 0.5, offset: 0.12 }, { opacity: 0.2, offset: 0.45 }, { opacity: 0 }],
        { duration: 1100, easing: "ease-out" },
      );
    };

    const showUI = () => {
      titleRef.current?.animate(
        [
          { opacity: 0, scale: 1.3 },
          { opacity: 1, scale: 0.96, offset: 0.6 },
          { opacity: 1, scale: 1 },
        ],
        { duration: 520, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" },
      );
      const button = startRef.current;
      if (!button) return;
      button.classList.add("show");
      button.animate(
        [
          { opacity: 0, translate: "-50% 40%" },
          { opacity: 1, translate: "-50% 0" },
        ],
        { duration: 450, delay: 200, easing: "cubic-bezier(.2,.9,.3,1.3)", fill: "forwards" },
      );
    };

    const reset = () => {
      clearHalo();
      stage.querySelectorAll("*").forEach((node) => {
        node.getAnimations().forEach((a) => a.cancel());
      });
      stage.getAnimations().forEach((a) => a.cancel());
      stage.classList.remove("lit");
      chars.forEach((c) => {
        c.imgs.forEach((img, k) => {
          img.style.opacity = k === 0 ? 1 : 0;
        });
        c.pos = 0;
      });
      startRef.current?.classList.remove("show");
    };

    const turnGroup = async (id, dir, skip = -1) => {
      const indexes = chars.map((_, i) => i);
      const order = INTRO_ORDER === "backToFront" ? indexes.reverse() : indexes;
      const jobs = [];
      for (const i of order) {
        if (i === skip) continue;
        const wait = INTRO_ORDER === "together" ? Math.random() * T.jitter : 0;
        const job = sleep(wait, id).then(() =>
          turn(chars[i], id, dir, { speed: dir > 0 ? 1 : 1.25 }),
        );
        job.catch(() => {});
        jobs.push(job);
        if (INTRO_ORDER !== "together") {
          await sleep(dir > 0 ? T.stagger : T.stagger * 1.3, id);
        }
      }
      return Promise.all(jobs);
    };

    /** 모션을 줄인 사용자에게는 돌리지 않고 앞을 본 장면만 보여 준다. */
    const showStill = () => {
      stage.classList.add("lit");
      chars.forEach((c) => {
        c.imgs.forEach((img, k) => {
          img.style.opacity = k === c.imgs.length - 1 ? 1 : 0;
        });
        c.pos = c.imgs.length - 1;
      });
      titleRef.current?.style.setProperty("opacity", "1");
      startRef.current?.classList.add("show");
      startRef.current?.style.setProperty("opacity", "1");
    };

    const play = async () => {
      const id = ++runId;
      reset();
      let cycle = 0;
      const waveTime =
        INTRO_ORDER === "together" ? T.jitter : T.stagger * (chars.length - 1);
      try {
        await sleep(T.firstHold, id);
        for (;;) {
          // ① 파도처럼 차례로 돌아본다 — 첫 사람이 돌 때 조명이 켜지고 마지막에 번쩍
          const wave = turnGroup(id, +1);
          await sleep(T.frame * 0.9, id);
          stage.classList.add("lit");
          await sleep(waveTime + T.frame * 0.6, id);
          screenFlash();
          await wave;

          // ② 다 돌고 나서 후광
          await sleep(550, id);
          haloBurst(id);

          // ③ 타이틀과 버튼은 처음 한 번만 등장하고 이후 계속 떠 있다
          if (cycle === 0) showUI();
          if (!INTRO_LOOP) break;

          // ④ 잠시 유지 → 다시 스르륵 뒤돌아섬 → 반복
          await sleep(T.frontHold, id);
          stage.classList.remove("lit");
          await turnGroup(id, -1);
          await sleep(T.backHold, id);
          cycle += 1;
        }
      } catch {
        // 화면을 벗어나 연출이 끊긴 것이다. 그대로 끝낸다.
      }
    };

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;

    Promise.all([
      document.fonts?.load("900 100px IntroBlack") ?? Promise.resolve(),
      ...chars.flatMap((c) => c.imgs.map((img) => img.decode().catch(() => {}))),
    ])
      .catch(() => {})
      .then(() => {
        if (cancelled) return;
        titleTextRef.current.innerHTML = retroTextSvg(INTRO_TEXT.title);
        startRef.current.innerHTML = retroTextSvg([INTRO_TEXT.start], { spacing: 4 });
        if (reduced) showStill();
        else play();
      });

    return () => {
      cancelled = true;
      runId += 1;
      haloRun += 1;
      stage.querySelectorAll("*").forEach((node) => {
        node.getAnimations().forEach((a) => a.cancel());
      });
      lineup.replaceChildren();
    };
  }, []);

  return (
    <div className="intro-screen">
      <div className="stage" ref={stageRef}>
        <div className="shade" />
        <canvas className="rays" ref={raysRef} />
        <div className="lineup" ref={lineupRef} />
        <div className="title" ref={titleRef}>
          <div ref={titleTextRef} />
          <p>{INTRO_TEXT.sub}</p>
        </div>
        <button
          type="button"
          className="start"
          ref={startRef}
          onClick={onStart}
          aria-label={INTRO_TEXT.start}
        />
        <div className="flash" ref={flashRef} />
      </div>
    </div>
  );
}
