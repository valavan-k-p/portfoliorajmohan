"use client";

import gsap from "gsap";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

import type { CurtainGL } from "./curtain-gl";

export type CurtainHandle = {
  /** Loads and compiles the 3D curtain ahead of time. Safe to call repeatedly. */
  prepare: () => void;
  /** Draws the curtain closed, calls onClosed behind it, then opens it on whatever is there now. */
  play: (onClosed: () => void) => void;
};

/** How long a click waits for the 3D curtain to finish loading before using the CSS one. */
const GL_WAIT_MS = 1500;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The red stage curtain between the opening film and the story. A Three.js satin cloth when
 * WebGL is available, with a CSS velvet drape as the fallback and for reduced motion.
 */
export function Curtain({ ref }: { ref: Ref<CurtainHandle> }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scope = useRef<gsap.Context | null>(null);
  const playing = useRef(false);
  const gl = useRef<CurtainGL | null>(null);
  const loading = useRef<Promise<CurtainGL | null> | null>(null);

  const prepare = () => {
    if (loading.current || reducedMotion()) return loading.current;
    loading.current = import("./curtain-gl")
      .then(({ createCurtainGL }) => {
        if (!canvas.current) return null;
        gl.current = createCurtainGL(canvas.current);
        return gl.current;
      })
      .catch(() => null);
    return loading.current;
  };

  const runCss = (node: HTMLElement, onClosed: () => void) => {
    const left = node.querySelector<HTMLElement>(".curtain-panel--left")!;
    const right = node.querySelector<HTMLElement>(".curtain-panel--right")!;
    const valance = node.querySelector<HTMLElement>(".curtain-valance")!;
    const light = node.querySelector<HTMLElement>(".curtain-light")!;

    gsap.set(node, { autoAlpha: 1 });
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(node, { autoAlpha: 0 });
        playing.current = false;
      },
    });

    if (reducedMotion()) {
      gsap.set([left, right], { scaleX: 1, xPercent: 0 });
      gsap.set(valance, { yPercent: 0 });
      gsap.set(light, { opacity: 0 });
      tl.fromTo(node, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "sine.inOut" })
        .call(onClosed)
        .to(node, { opacity: 0, duration: 0.6, ease: "sine.inOut" }, "+=0.3");
      return;
    }

    gsap.set([left, right], { scaleX: 0, xPercent: 0 });
    gsap.set(valance, { yPercent: -100 });
    gsap.set(light, { opacity: 0 });
    const OPEN = 1.85;
    tl.to(valance, { yPercent: 0, duration: 0.9, ease: "power3.out" }, 0)
      .to([left, right], { scaleX: 1, duration: 1.25, ease: "power3.inOut" }, 0.1)
      .to(light, { opacity: 1, duration: 0.7, ease: "sine.inOut" }, 1.0)
      .call(onClosed, [], 1.4)
      .to(light, { opacity: 0, duration: 0.9, ease: "sine.inOut" }, OPEN - 0.1)
      .to([left, right], { scaleX: 0.13, duration: 1.6, ease: "power3.inOut" }, OPEN)
      .to(left, { xPercent: -100, duration: 0.8, ease: "power2.in" }, OPEN + 1.45)
      .to(right, { xPercent: 100, duration: 0.8, ease: "power2.in" }, OPEN + 1.45)
      .to(valance, { yPercent: -100, duration: 0.8, ease: "power2.in" }, OPEN + 1.45);
  };

  useImperativeHandle(
    ref,
    () => ({
      prepare: () => void prepare(),
      play: (onClosed) => {
        const node = root.current;
        if (!node) {
          onClosed();
          return;
        }
        if (playing.current) return;
        playing.current = true;
        // Started on a microtask so the curtain is never recorded in the caller's GSAP context:
        // the opening calls this, then unmounts behind the curtain and reverts its own animations.
        queueMicrotask(async () => {
          const pending = reducedMotion() ? null : gl.current ? Promise.resolve(gl.current) : prepare();
          const ready = pending
            ? await Promise.race([pending, new Promise<null>((r) => setTimeout(() => r(null), GL_WAIT_MS))])
            : null;
          if (ready) {
            node.classList.add("curtain--gl");
            gsap.set(node, { autoAlpha: 1 });
            await ready.play(onClosed);
            gsap.set(node, { autoAlpha: 0 });
            node.classList.remove("curtain--gl");
            playing.current = false;
            return;
          }
          scope.current?.kill();
          scope.current = gsap.context(() => runCss(node, onClosed));
        });
      },
    }),
    [],
  );

  useEffect(
    () => () => {
      scope.current?.kill();
      gl.current?.dispose();
    },
    [],
  );

  return (
    <div ref={root} className="curtain" aria-hidden="true">
      <canvas ref={canvas} className="curtain-canvas" />
      <div className="curtain-panel curtain-panel--left" />
      <div className="curtain-panel curtain-panel--right" />
      <div className="curtain-light" />
      <div className="curtain-valance" />
      <div className="op-grain" />
    </div>
  );
}
