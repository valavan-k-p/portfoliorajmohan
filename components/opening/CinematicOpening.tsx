"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import { useRef, useState, type CSSProperties, type MouseEvent } from "react";

import { foreground, openingShots, soundtrack } from "@/lib/opening-assets";

import { createMontage } from "./montage";
import { OpeningGate } from "./OpeningGate";
import { useOpening } from "./OpeningProvider";
import { createSoundtrack, type Soundtrack } from "./soundtrack";

gsap.registerPlugin(useGSAP);

/** Photographs mounted ahead of the one on screen. The burst cuts every ~0.15s, so all ten load up front. */
const LOOKAHEAD = openingShots.length;
/** Seconds between the visitor's choice and song time 0, the door-opening transition. */
const FILM_START = 0.85;
/** How far the film may drift from the music before it is pulled back into sync. */
const SYNC_TOLERANCE = 0.08;

export function CinematicOpening() {
  const { entered, enter, prepareCurtain } = useOpening();
  if (entered) return null;
  return <OpeningScene onEntered={enter} onPrepareExit={prepareCurtain} />;
}

function OpeningScene({ onEntered, onPrepareExit }: { onEntered: () => void; onPrepareExit: () => void }) {
  const root = useRef<HTMLElement>(null);
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const choose = useRef<((withMusic: boolean) => void) | null>(null);
  const music = useRef<Soundtrack | null>(null);
  const exit = useRef<(() => void) | null>(null);
  const [mountedCount, setMountedCount] = useState(LOOKAHEAD);

  useGSAP(
    (_context, contextSafe) => {
      const scope = root.current;
      if (!scope || !contextSafe) return;
      const pick = (selector: string) => scope.querySelector<HTMLElement>(selector)!;
      const photos = pick(".op-photos");
      const atmosphere = pick(".op-atmosphere");
      const cursorGlow = pick(".op-cursor");
      const vignette = pick(".op-vignette");
      const bloom = pick(".op-bloom");
      const parallax = pick(".op-fg-parallax");
      const frame = pick(".op-fg-frame");
      const title = pick(".op-title");
      const subtitle = pick(".op-subtitle");
      const enterLink = pick(".op-enter");
      const meta = pick(".op-meta");
      const gate = pick(".op-gate");
      const gateGlow = pick(".gate-glow");
      const gateTop = pick(".gate-panel--top");
      const gateBottom = pick(".gate-panel--bottom");
      const gateLine = pick(".gate-line");
      const gateName = pick(".gate-name");
      const gateTagline = pick(".gate-tagline");
      const gateHeading = pick(".gate-heading");
      const gateHint = pick(".gate-hint");
      const musicOption = pick(".gate-option--music");
      const silentOption = pick(".gate-option:not(.gate-option--music)");
      const media = scope.querySelector<HTMLImageElement | HTMLVideoElement>(".op-fg-media");

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const cues = soundtrack.cues;

      // Tracking values live in CSS so each breakpoint can keep the names inside the frame.
      const trackOf = (el: HTMLElement, name: string, fallback: number) =>
        parseFloat(getComputedStyle(el).getPropertyValue(name)) || fallback;
      const trackEnd = trackOf(title, "--title-track", 0.32);
      const trackFrom = trackEnd + trackOf(title, "--title-track-delta", 0.3);
      const gateTrack = trackOf(gateName, "--gate-track", 0.42);
      const track = (em: number) => ({ letterSpacing: `${em}em`, textIndent: `${em}em` });

      if (media instanceof HTMLVideoElement) {
        media.muted = true;
        void media.play().catch(() => undefined);
      }

      const score = createSoundtrack(soundtrack.src);
      music.current = score;

      const montage = createMontage({
        slots: slots.current.filter((slot): slot is HTMLDivElement => slot !== null),
        shots: openingShots,
        reduced,
        onShow: (index) =>
          setMountedCount((count) => Math.max(count, Math.min(openingShots.length, index + 1 + LOOKAHEAD))),
      });

      // Desktop only: a faint maroon light follows the cursor; parallax joins once the film settles.
      let parallaxOn = false;
      let removePointer: (() => void) | undefined;
      if (finePointer && !reduced) {
        const glowX = gsap.quickTo(cursorGlow, "x", { duration: 1.6, ease: "power3.out" });
        const glowY = gsap.quickTo(cursorGlow, "y", { duration: 1.6, ease: "power3.out" });
        const fgX = gsap.quickTo(parallax, "x", { duration: 1.8, ease: "power3.out" });
        const fgY = gsap.quickTo(parallax, "y", { duration: 1.8, ease: "power3.out" });
        const bgX = gsap.quickTo(photos, "x", { duration: 2.4, ease: "power3.out" });
        const bgY = gsap.quickTo(photos, "y", { duration: 2.4, ease: "power3.out" });
        let glowShown = false;
        const onMove = contextSafe((event: PointerEvent) => {
          if (!glowShown) {
            glowShown = true;
            gsap.set(cursorGlow, { x: event.clientX, y: event.clientY });
            gsap.to(cursorGlow, { autoAlpha: 1, duration: 2, ease: "sine.inOut" });
          }
          glowX(event.clientX);
          glowY(event.clientY);
          if (!parallaxOn) return;
          // Near plane moves more than the far plane: depth without any visible "effect".
          const nx = event.clientX / window.innerWidth - 0.5;
          const ny = event.clientY / window.innerHeight - 0.5;
          fgX(nx * -12);
          fgY(ny * -6);
          bgX(nx * -5);
          bgY(ny * -3);
        });
        window.addEventListener("pointermove", onMove, { passive: true });
        removePointer = () => window.removeEventListener("pointermove", onMove);
      }

      // ---- The pause before the film ------------------------------------------------------
      const gateIn = gsap.timeline({ defaults: { ease: "power3.out" } });
      if (reduced) {
        gateIn
          .set(gateLine, { scaleX: 1 })
          .to([gateGlow, gateLine, gateName, gateTagline, gateHeading, gateHint, musicOption, silentOption], {
            autoAlpha: 1,
            duration: 0.8,
            ease: "sine.inOut",
          });
      } else {
        gateIn
          .to(gateGlow, { autoAlpha: 1, duration: 2.6, ease: "sine.inOut" }, 0.2)
          // The editorial line draws itself before any type appears.
          .fromTo(gateLine, { autoAlpha: 1, scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "power3.inOut" }, 0.7)
          .fromTo(
            gateName,
            { autoAlpha: 0, y: 10, ...track(gateTrack + 0.22) },
            { autoAlpha: 1, y: 0, ...track(gateTrack), duration: 2.2 },
            1.5,
          )
          .fromTo(gateTagline, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 1.4 }, 2.3)
          .fromTo([gateHeading, gateHint], { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.15 }, 3.1)
          .fromTo(
            [musicOption, silentOption],
            { autoAlpha: 0, y: 8 },
            { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.12 },
            3.4,
          );
      }
      // The song is small; have it decoded by the time a choice can be made.
      gateIn.call(() => void score.prepare(), [], reduced ? 0 : 3.4);

      // ---- Phase 6: the settled scene -----------------------------------------------------
      const settle = contextSafe(() => {
        // The film has settled: a calm moment to load the curtain without disturbing the motion.
        onPrepareExit();
        if (reduced) return;
        // The supplied plate is a still, so a slow breathing camera keeps it alive.
        gsap.to(frame, { scale: 1.016, y: -4, duration: 11, ease: "sine.inOut", repeat: -1, yoyo: true });
        parallaxOn = true;
      });

      // ---- The film, authored against the song (time 0 = first sound) ---------------------
      const film = gsap.timeline({ paused: true, defaults: { ease: "power2.out" }, onComplete: settle });
      if (reduced) {
        film
          .call(() => montage.start(), [], 0)
          .set(photos, { opacity: 0.86 }, 0)
          .set(frame, { "--fg-reveal": 1 }, 0)
          .to([atmosphere, vignette], { opacity: 1, duration: 1.2, ease: "sine.inOut" }, 0)
          .call(() => montage.burst(), [], cues.firstLift)
          .to(frame, { autoAlpha: 1, duration: 1.6, ease: "sine.inOut" }, cues.impact)
          .to(photos, { opacity: 0.6, duration: 1.2, ease: "sine.inOut" }, cues.impact + 2)
          .to([title, subtitle], { autoAlpha: 1, duration: 1 }, cues.peak)
          .to([enterLink, meta], { autoAlpha: 1, duration: 0.8 }, cues.peak + 1.5);
      } else {
        film
          // The first photograph surfaces in black and white under the swell.
          .call(() => montage.start(), [], 0)
          .fromTo(photos, { opacity: 0.5 }, { opacity: 0.62, duration: cues.firstLift, ease: "sine.inOut" }, 0)
          .to(atmosphere, { opacity: 0.55, duration: 2.2, ease: "sine.inOut" }, 0)
          .to(vignette, { opacity: 1, duration: 2.6, ease: "sine.inOut" }, 0)
          // First audible lift: the montage breaks into its burst and colour starts to bleed in.
          .call(() => montage.burst(), [], cues.firstLift)
          .to(photos, { opacity: 0.84, duration: 0.6 }, cues.firstLift)
          .fromTo(
            photos,
            { filter: "grayscale(1)" },
            {
              filter: "grayscale(0)",
              duration: cues.impact - cues.firstLift,
              ease: "power2.in",
              clearProps: "filter",
            },
            cues.firstLift,
          )
          // The impact: cut on the beat into full colour, the red deepens, a gentle lift. Never a flash.
          .call(() => montage.settle(), [], cues.impact)
          .to(atmosphere, { opacity: 1, duration: 1.2 }, cues.impact)
          .to(photos, { opacity: 1, duration: 0.22 }, cues.impact)
          .to(photos, { opacity: 0.86, duration: 1.6, ease: "sine.inOut" }, cues.impact + 0.22)
          // Rajmohan and Vijay, the centrepiece: low opacity, a soft widening mask, settling scale.
          .to(frame, { autoAlpha: 1, duration: 4, ease: "power1.inOut" }, cues.impact)
          .fromTo(frame, { "--fg-reveal": 0 }, { "--fg-reveal": 1, duration: 4.2, ease: "power2.inOut" }, cues.impact)
          .fromTo(frame, { scale: 1.035, y: 16 }, { scale: 1, y: 0, duration: 5.5, ease: "power3.out" }, cues.impact)
          // Once they are fully present, the background steps back and the cutting slows to a breath.
          .to(photos, { opacity: 0.6, duration: 2.2, ease: "sine.inOut" }, cues.impact + 4)
          .call(() => montage.setTempo(3), [], cues.impact + 4)
          // Identity on the loudest moment, one element at a time.
          .fromTo(
            title,
            { autoAlpha: 0, y: 18, ...track(trackFrom) },
            { autoAlpha: 1, y: 0, ...track(trackEnd), duration: 2.8, ease: "power3.out" },
            cues.peak,
          )
          .fromTo(subtitle, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 1.6 }, cues.peak + 1)
          .fromTo(enterLink, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 1.4 }, cues.peak + 2.2)
          .to(meta, { autoAlpha: 1, duration: 1.6, ease: "sine.inOut" }, cues.peak + 2.6)
          // As the music releases, the montage picks its pace back up underneath.
          .call(() => montage.setTempo(1), [], cues.release - 1);
      }

      // With music, the audio clock is the master: the film is nudged back whenever it drifts.
      let followingMusic = false;
      const followMusic = () => {
        if (!followingMusic || film.progress() === 1) return;
        const position = score.elapsed();
        if (position === null || position >= film.duration()) return;
        if (Math.abs(film.time() - position) > SYNC_TOLERANCE) film.time(position, false);
      };
      gsap.ticker.add(followMusic);

      // ---- The choice: the door opens -----------------------------------------------------
      let chosen = false;
      choose.current = contextSafe((withMusic: boolean) => {
        if (chosen) return;
        chosen = true;
        gateIn.kill();
        const picked = withMusic ? musicOption : silentOption;
        const other = withMusic ? silentOption : musicOption;
        picked.classList.add("is-chosen");
        gate.style.pointerEvents = "none";
        // Called inside the click, so audio is allowed to start.
        if (withMusic) {
          score.begin(FILM_START);
          followingMusic = true;
        }

        const door = gsap.timeline({ defaults: { ease: "power2.inOut" } });
        if (reduced) {
          door.to(gate, { autoAlpha: 0, duration: 0.5 }, 0).call(() => void film.play(0), [], FILM_START);
          return;
        }
        // The editorial line travels to the centre of the frame and becomes the seam the screen opens on.
        const line = gateLine.getBoundingClientRect();
        const toCentre = window.innerHeight / 2 - (line.top + line.height / 2);
        const fullWidth = (window.innerWidth / line.width) * 1.15;
        const SPLIT = 1.2;
        door
          .to(other, { autoAlpha: 0, duration: 0.35, ease: "power2.out" }, 0)
          .to([gateName, gateTagline, gateHeading, gateHint], { autoAlpha: 0, y: -6, duration: 0.45, stagger: 0.03, ease: "power2.in" }, 0.12)
          .to(picked, { autoAlpha: 0, duration: 0.4, ease: "power2.in" }, 0.45)
          // The screen darkens slightly while the line finds its place.
          .to(gateGlow, { autoAlpha: 0, duration: 0.6 }, 0.3)
          .to(gateLine, { y: toCentre, duration: 0.75, ease: "power3.inOut" }, 0.2)
          .to(gateLine, { scaleX: fullWidth, duration: 0.7, ease: "expo.inOut" }, 0.55)
          // The film (and the music) starts behind the closed frame...
          .call(() => void film.play(0), [], FILM_START)
          .fromTo(bloom, { autoAlpha: 0, scale: 0.15 }, { autoAlpha: 0.9, scale: 1.6, duration: 1.6, ease: "expo.out" }, 0.9)
          // ...and the frame opens along the line: the halves part, each carrying a gold edge away.
          .set(gateLine, { autoAlpha: 0 }, SPLIT)
          .set([gateTop, gateBottom], { "--edge": 1 }, SPLIT)
          .to(gateTop, { yPercent: -100, duration: 1.25, ease: "power4.inOut" }, SPLIT)
          .to(gateBottom, { yPercent: 100, duration: 1.25, ease: "power4.inOut" }, SPLIT)
          .to([gateTop, gateBottom], { "--edge": 0, duration: 0.9, ease: "power1.in" }, SPLIT + 0.25)
          .set(gate, { autoAlpha: 0 }, SPLIT + 1.3)
          .to(bloom, { autoAlpha: 0, duration: 1.6, ease: "sine.inOut" }, SPLIT + 0.8);
      });

      // ---- The opening credits end --------------------------------------------------------
      let exiting = false;
      exit.current = contextSafe(() => {
        if (exiting) return;
        exiting = true;
        followingMusic = false;
        film.pause();
        removePointer?.();
        gsap.killTweensOf([frame, parallax, photos]);
        enterLink.style.pointerEvents = "none";
        // The music carries on under the curtain and fades away as it opens.
        score.fadeOut(reduced ? 1.2 : 3.2);
        // The curtain (owned by the provider) closes over the frame; the site is swapped in behind it.
        onEntered();
        if (reduced) return;
        gsap
          .timeline({ defaults: { ease: "power2.inOut" } })
          .to([enterLink, subtitle, meta], { autoAlpha: 0, y: -8, duration: 0.6, stagger: 0.04, ease: "power2.in" }, 0)
          .to(title, { autoAlpha: 0, y: -12, ...track(trackEnd + 0.14), duration: 0.9, ease: "power2.in" }, 0.06)
          // The subjects step back and the photographs slow almost to a stop as the drapes draw in.
          .to(frame, { autoAlpha: 0, scale: 1.03, y: -10, duration: 1.2 }, 0.15)
          .call(() => montage.setTempo(5), [], 0.15)
          .to(photos, { opacity: 0.3, duration: 1.2, ease: "sine.inOut" }, 0.3);
      });

      // Nothing should keep animating, or playing, in a background tab.
      const onVisibility = () => {
        if (document.hidden) {
          gsap.globalTimeline.pause();
          score.suspend();
        } else {
          gsap.globalTimeline.resume();
          score.resume();
        }
        if (media instanceof HTMLVideoElement) {
          if (document.hidden) media.pause();
          else void media.play().catch(() => undefined);
        }
      };
      document.addEventListener("visibilitychange", onVisibility);

      return () => {
        choose.current = null;
        exit.current = null;
        music.current = null;
        gsap.ticker.remove(followMusic);
        score.dispose();
        montage.kill();
        removePointer?.();
        document.removeEventListener("visibilitychange", onVisibility);
        gsap.globalTimeline.resume();
      };
    },
    { scope: root },
  );

  const handleEnter = (event: MouseEvent<HTMLAnchorElement>) => {
    // Before hydration the link simply jumps to #main.
    if (!exit.current) return;
    event.preventDefault();
    exit.current();
  };

  const frameVars = {
    "--fg-aspect": foreground.width / foreground.visibleHeight,
    "--fg-head": foreground.headTop / foreground.visibleHeight,
  } as CSSProperties;

  return (
    <section ref={root} className="op-root" style={frameVars} aria-label="Opening">
      <div className="op-photos" aria-hidden="true">
        {openingShots.map((shot, index) => (
          <div
            key={shot.id}
            ref={(node) => {
              slots.current[index] = node;
            }}
            className="op-shot"
          >
            {index < mountedCount && (
              <Image
                src={shot.src}
                alt=""
                fill
                sizes="100vw"
                quality={65}
                placeholder="blur"
                preload={index === 0}
                loading={index === 0 ? undefined : "eager"}
                fetchPriority={index === 0 ? "high" : "low"}
                draggable={false}
                className="op-shot-img"
                style={{ objectPosition: shot.focus }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="op-atmosphere" aria-hidden="true" />
      <div className="op-cursor" aria-hidden="true" />
      <div className="op-bloom" aria-hidden="true" />

      <div className="op-fg-anchor">
        <div className="op-fg-parallax">
          <div className="op-fg-frame">
            <div className="op-fg-crop">
              {foreground.kind === "video" ? (
                <video
                  className="op-fg-media"
                  src={foreground.src}
                  poster={foreground.poster}
                  width={foreground.width}
                  height={foreground.height}
                  aria-label={foreground.alt}
                  muted
                  playsInline
                  loop
                  autoPlay
                  preload="auto"
                  disablePictureInPicture
                  disableRemotePlayback
                />
              ) : (
                <Image
                  src={foreground.src}
                  alt={foreground.alt}
                  sizes="(orientation: portrait) 142vw, 122vw"
                  quality={85}
                  preload
                  draggable={false}
                  className="op-fg-media"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="op-vignette" aria-hidden="true" />

      <div className="op-type">
        <div className="op-title-block">
          <h1 className="op-title">Rajmohan</h1>
          <p className="op-subtitle">Government of Tamil Nadu</p>
        </div>
        <div className="op-meta">
          <span>Tamil Nadu</span>
          <span>Public Service</span>
        </div>
        <div className="op-enter-row">
          <a
            href="#main"
            onClick={handleEnter}
            onPointerEnter={onPrepareExit}
            onFocus={onPrepareExit}
            className="op-enter film-link"
          >
            <span className="film-link-line" aria-hidden="true" />
            <span className="film-link-label">Enter</span>
            <span className="film-link-line" aria-hidden="true" />
          </a>
        </div>
      </div>

      <OpeningGate
        onChoose={(withMusic) => choose.current?.(withMusic)}
        onMusicIntent={() => void music.current?.prepare()}
      />

      <div className="op-grain" aria-hidden="true" />
    </section>
  );
}
