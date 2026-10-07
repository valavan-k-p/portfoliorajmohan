import gsap from "gsap";

import type { CameraFrame, Shot } from "@/lib/opening-assets";

/** Beat lengths (seconds) for the rapid burst. It cycles through the photographs until settle(). */
const BURST_RHYTHM = [0.18, 0.16, 0.15, 0.15, 0.15, 0.15, 0.16, 0.18, 0.22];
/** The first photograph surfaces slowly out of black, then holds until the burst is cued. */
const FIRST_FADE = 1.4;
const SETTLED = { fade: 0.45, hold: 1.1 };
const REDUCED = { fade: 2.4, hold: 7 };
const STILL: { from: CameraFrame; to: CameraFrame } = {
  from: { scale: 1.04, x: 0, y: 0 },
  to: { scale: 1.04, x: 0, y: 0 },
};
/** Upper bound on how long a cut waits for its photograph before falling back to the blur placeholder. */
const MAX_WAIT = 0.3;

type MontageOptions = {
  slots: HTMLElement[];
  shots: Shot[];
  reduced: boolean;
  /** Called as each shot starts, so the caller can mount the photographs coming up next. */
  onShow: (index: number) => void;
};

export type Montage = {
  /** Brings in the first photograph and holds it until burst() or settle() is cued. */
  start: () => void;
  /** Rapid cutting, cycling through the photographs until settle(). */
  burst: () => void;
  /** Cuts straight to the next photograph and continues at the settled pace. */
  settle: () => void;
  /** Stretches settled holds (and the camera move on screen) by this factor. 1 is normal pace. */
  setTempo: (multiplier: number) => void;
  kill: () => void;
};

function isReady(slot: HTMLElement) {
  const img = slot.querySelector("img");
  return !!img && img.complete && img.naturalWidth > 0;
}

/**
 * Overlapping cross-dissolves with a continuous camera move per photograph, driven by cues
 * from the film timeline. Only the outgoing and incoming shots are ever visible.
 */
export function createMontage({ slots, shots, reduced, onShow }: MontageOptions): Montage {
  const drift: (gsap.core.Tween | undefined)[] = [];
  let pending: gsap.core.Tween | undefined;
  let phase: "waiting" | "burst" | "settled" = "waiting";
  let current = -1;
  let cuts = 0;
  let tempo = 1;
  let alive = true;

  const timingFor = (index: number) => {
    if (reduced) return { hold: REDUCED.hold * tempo, fade: REDUCED.fade };
    if (phase === "burst") {
      const hold = BURST_RHYTHM[cuts % BURST_RHYTHM.length] * shots[index].weight;
      return { hold, fade: Math.min(0.1, hold * 0.5) };
    }
    return { hold: SETTLED.hold * shots[index].weight * tempo, fade: SETTLED.fade * Math.min(tempo, 2) };
  };

  const show = (index: number, fade: number, hold: number | null) => {
    const el = slots[index];
    const prev = current;
    const { from, to } = reduced ? STILL : shots[index].move;
    current = index;
    cuts += 1;
    onShow(index);

    drift[index]?.kill();
    gsap.set(el, { zIndex: 2, autoAlpha: 0, scale: from.scale, xPercent: from.x, yPercent: from.y });
    if (prev >= 0) gsap.set(slots[prev], { zIndex: 1 });

    // The camera keeps moving through the next cross-dissolve, so the cut never freezes.
    drift[index] = gsap.to(el, {
      scale: to.scale,
      xPercent: to.x,
      yPercent: to.y,
      duration: (hold ?? 3) + SETTLED.fade + 0.4,
      ease: "none",
    });
    gsap.to(el, {
      autoAlpha: 1,
      duration: fade,
      ease: "sine.inOut",
      overwrite: "auto",
      onComplete: () => {
        if (prev < 0 || prev === index) return;
        drift[prev]?.kill();
        gsap.set(slots[prev], { autoAlpha: 0, zIndex: 0 });
      },
    });

    if (hold !== null) pending = gsap.delayedCall(hold, () => advance(0));
  };

  const advance = (waited: number) => {
    if (!alive) return;
    const next = (current + 1) % shots.length;
    if (isReady(slots[next]) || waited >= MAX_WAIT) {
      const { hold, fade } = timingFor(next);
      show(next, fade, hold);
      return;
    }
    pending = gsap.delayedCall(0.15, () => advance(waited + 0.15));
  };

  const cutNow = (nextPhase: "burst" | "settled") => {
    if (!alive || current < 0) return;
    phase = reduced ? "settled" : nextPhase;
    pending?.kill();
    advance(0);
  };

  return {
    start: () => {
      if (!alive || current >= 0) return;
      show(0, reduced ? REDUCED.fade : FIRST_FADE, null);
    },
    burst: () => {
      if (phase === "waiting") cutNow("burst");
    },
    settle: () => {
      if (phase !== "settled") cutNow("settled");
    },
    setTempo: (multiplier) => {
      tempo = multiplier;
      drift[current]?.timeScale(1 / multiplier);
    },
    kill: () => {
      alive = false;
      pending?.kill();
      drift.forEach((tween) => tween?.kill());
      gsap.killTweensOf(slots);
    },
  };
}
