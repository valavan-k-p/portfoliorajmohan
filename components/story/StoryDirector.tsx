"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect } from "react";

gsap.registerPlugin(ScrollTrigger);

const all = <T extends Element = HTMLElement>(root: ParentNode, selector: string) =>
  Array.from(root.querySelectorAll<T>(selector));
const maybe = (root: ParentNode, selector: string) => root.querySelector<HTMLElement>(selector);

/**
 * Scroll choreography for a story page: smooth scrolling, and a pinned, scrubbed treatment for
 * every scene (any number of each kind). Scenes and captions are optional; only what is on the
 * page is animated.
 */
export function StoryDirector() {
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Smooth, weighted scrolling on wheel and trackpad; touch keeps native momentum.
    let lenis: Lenis | null = null;
    const raf = (time: number) => lenis?.raf(time * 1000);
    if (!reduced) {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    }

    let mm: gsap.MatchMedia | undefined;
    const ctx = gsap.context(() => {
      // Created after the scenes: their pins add scroll length, and triggers refresh in creation order.
      const progress = () => {
        const bar = maybe(main, "[data-progress]");
        if (!bar) return;
        gsap.fromTo(
          bar,
          { scaleX: 0 },
          { scaleX: 1, ease: "none", scrollTrigger: { trigger: main, start: "top top", end: "bottom bottom", scrub: 0.3 } },
        );
      };

      if (reduced) {
        // Reduced motion: no pinning or scrubbing; each element simply fades in once.
        for (const el of all(main, ".caption, [data-frame], [data-pan-frame], [data-scene='next'] > *")) {
          gsap.from(el, { opacity: 0, duration: 0.8, scrollTrigger: { trigger: el, start: "top 85%", once: true } });
        }
        progress();
        return;
      }

      mm = gsap.matchMedia();
      mm.add({ wide: "(min-width: 768px)", narrow: "(max-width: 767px)" }, (context) => {
        const { wide } = context.conditions as { wide: boolean };

        // ---- Hero: the title lifts away as the story begins ------------------------------
        for (const hero of all(main, "[data-scene='hero']")) {
          const tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
          const bg = maybe(hero, "[data-parallax]");
          const copy = maybe(hero, "[data-hero-copy]");
          const thread = maybe(hero, "[data-thread]");
          if (bg) tl.to(bg, { yPercent: 18, scale: 1.08, ease: "none" }, 0);
          if (copy) tl.to(copy, { yPercent: -40, opacity: 0, ease: "none" }, 0);
          if (thread) tl.to(thread, { scaleY: 2.2, opacity: 0, ease: "none" }, 0);
        }

        // ---- Wipe: one photograph rises over another -------------------------------------
        for (const scene of all(main, "[data-scene='wipe']")) {
          const capA = maybe(scene, "[data-caption='a']");
          const capB = maybe(scene, "[data-caption='b']");
          const tl = gsap
            .timeline({
              defaults: { ease: "none" },
              scrollTrigger: { trigger: scene, start: "top top", end: "+=200%", pin: true, scrub: 0.6 },
            })
            .fromTo(scene.querySelector("[data-layer='a'] img"), { scale: 1.2 }, { scale: 1, duration: 1.2 }, 0)
            .fromTo(
              scene.querySelector("[data-layer='b']"),
              { clipPath: "inset(100% 0% 0% 0%)" },
              { clipPath: "inset(0% 0% 0% 0%)", duration: 0.55, ease: "power2.inOut" },
              0.5,
            )
            .fromTo(scene.querySelector("[data-layer='b'] img"), { scale: 1.3 }, { scale: 1.04, duration: 0.8 }, 0.5)
            .to(scene.querySelector("[data-shade]"), { opacity: 0.75, duration: 0.25 }, 1.2);
          if (capA) tl.from(capA, { y: 24, opacity: 0, duration: 0.18 }, 0.12).to(capA, { y: -16, opacity: 0, duration: 0.15 }, 0.58);
          if (capB) tl.from(capB, { y: 24, opacity: 0, duration: 0.2 }, 0.9);
        }

        // ---- Spread: framed photographs open and drift at different depths ---------------
        for (const scene of all(main, "[data-scene='spread']")) {
          for (const frame of all(scene, "[data-frame]")) {
            gsap.fromTo(
              frame,
              { clipPath: "inset(0% 0% 101% 0%)" },
              {
                clipPath: "inset(0% 0% 0% 0%)",
                ease: "power2.inOut",
                scrollTrigger: { trigger: frame, start: "top 90%", end: "top 35%", scrub: 0.6 },
              },
            );
          }
          for (const inner of all(scene, "[data-drift]")) {
            const dir = Number(inner.dataset.drift);
            gsap.fromTo(
              inner,
              { yPercent: -9 * dir },
              { yPercent: 9 * dir, ease: "none", scrollTrigger: { trigger: scene, start: "top bottom", end: "bottom top", scrub: true } },
            );
          }
        }

        // ---- Seam: the photograph opens out of the gold line ----------------------------
        for (const scene of all(main, "[data-scene='seam']")) {
          const line = scene.querySelector("[data-seam-line]");
          const cap = maybe(scene, "[data-caption='a']");
          const tl = gsap
            .timeline({
              defaults: { ease: "none" },
              scrollTrigger: { trigger: scene, start: "top top", end: "+=170%", pin: true, scrub: 0.6 },
            })
            .fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.12, ease: "power2.out" }, 0)
            .fromTo(
              scene.querySelector("[data-seam-frame]"),
              { clipPath: "inset(50% 0% 50% 0%)" },
              { clipPath: "inset(0% 0% 0% 0%)", duration: 0.5, ease: "power3.inOut" },
              0.1,
            )
            .to(line, { opacity: 0, duration: 0.12 }, 0.22)
            .fromTo(scene.querySelector("[data-seam-frame] img"), { scale: 1.25 }, { scale: 1, duration: 1.1 }, 0.1);
          if (cap) tl.from(cap, { y: 24, opacity: 0, duration: 0.2 }, 0.55);
        }

        // ---- Pan: a horizontal passage through several photographs -----------------------
        for (const scene of all(main, "[data-scene='pan']")) {
          const track = maybe(scene, "[data-track]");
          if (!track) continue;
          const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
          const panTween = gsap.to(track, {
            x: () => -distance(),
            ease: "none",
            scrollTrigger: {
              trigger: scene,
              start: "top top",
              end: () => `+=${distance()}`,
              pin: true,
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          });
          for (const frame of all(scene, "[data-pan-frame]")) {
            gsap.fromTo(
              frame.querySelector("[data-pan-inner]"),
              { xPercent: wide ? -8 : -4 },
              {
                xPercent: wide ? 8 : 4,
                ease: "none",
                scrollTrigger: { trigger: frame, containerAnimation: panTween, start: "left right", end: "right left", scrub: true },
              },
            );
            const cap = frame.querySelector("figcaption");
            if (cap) {
              gsap.from(cap, {
                y: 16,
                opacity: 0,
                ease: "power2.out",
                scrollTrigger: { trigger: frame, containerAnimation: panTween, start: "left 70%", end: "left 40%", scrub: true },
              });
            }
          }
        }

        // ---- Grow: a small framed photograph becomes the whole frame ----------------------
        for (const scene of all(main, "[data-scene='grow']")) {
          const capA = maybe(scene, "[data-caption='a']");
          const capB = maybe(scene, "[data-caption='b']");
          const tl = gsap
            .timeline({
              defaults: { ease: "none" },
              scrollTrigger: { trigger: scene, start: "top top", end: "+=230%", pin: true, scrub: 0.6 },
            })
            .fromTo(
              scene.querySelector("[data-grow-frame]"),
              { clipPath: wide ? "inset(24% 34% 24% 34%)" : "inset(26% 14% 26% 14%)" },
              { clipPath: "inset(0% 0% 0% 0%)", duration: 0.65, ease: "power2.inOut" },
              0,
            )
            .fromTo(scene.querySelector("[data-layer='a'] img"), { scale: 1.35 }, { scale: 1, duration: 0.9 }, 0)
            .fromTo(scene.querySelector("[data-layer='b']"), { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "sine.inOut" }, 1.0)
            .fromTo(scene.querySelector("[data-layer='b'] img"), { scale: 1.12 }, { scale: 1, duration: 0.7 }, 1.0);
          if (capA) tl.from(capA, { y: 24, opacity: 0, duration: 0.2 }, 0.55).to(capA, { y: -16, opacity: 0, duration: 0.15 }, 1.0);
          if (capB) tl.from(capB, { y: 24, opacity: 0, duration: 0.2 }, 1.2);
        }

        // ---- The way onward -------------------------------------------------------------
        for (const next of all(main, "[data-scene='next']")) {
          gsap.from(next.children, {
            y: 26,
            opacity: 0,
            duration: 1.1,
            stagger: 0.12,
            ease: "power3.out",
            scrollTrigger: { trigger: next, start: "top 75%" },
          });
        }

        progress();
      });
    }, main);

    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 120);

    return () => {
      window.clearTimeout(refresh);
      mm?.revert();
      ctx.revert();
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      lenis?.destroy();
    };
  }, []);

  return null;
}
