"use client";

import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type CSSProperties, type MouseEvent } from "react";

import { ReplayOpening } from "@/components/opening/OpeningProvider";
import type { Sector } from "@/lib/sectors";

export type ChooserItem = { sector: Sector; cover: string | null };

const delay = (seconds: number) => ({ "--reveal-delay": `${seconds}s` }) as CSSProperties;

/**
 * The four portfolios, offered after the curtain. Each panel holds its cover photograph (or a
 * reserved frame until one is added). Choosing one grows its picture to fill the screen and
 * hands over to that portfolio's page, which opens on the same picture.
 */
export function PortfolioChooser({ items }: { items: ChooserItem[] }) {
  const router = useRouter();
  const takeover = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);

  const choose = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    // Let new-tab and modified clicks behave as normal links.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const layer = takeover.current;
    const art = event.currentTarget.querySelector(".chooser-art");
    if (!layer || !art || leaving.current) return;
    event.preventDefault();
    leaving.current = true;

    const rect = event.currentTarget.getBoundingClientRect();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const picture = art.cloneNode(true) as HTMLElement;
    picture.classList.add("is-lit");
    layer.replaceChildren(picture);
    gsap.set(layer, { autoAlpha: 1, left: rect.left, top: rect.top, width: rect.width, height: rect.height });

    const go = () => router.push(href);
    if (reduced) {
      gsap.to(layer, { left: 0, top: 0, width: "100vw", height: "100dvh", duration: 0.01, onComplete: go });
      return;
    }
    gsap
      .timeline({ onComplete: go })
      .to(".chooser-panel", { opacity: 0.2, duration: 0.45, ease: "power2.out" }, 0)
      .to(".chooser-head, .chooser-header", { opacity: 0, duration: 0.35 }, 0)
      .to(layer, { left: 0, top: 0, width: "100vw", height: "100dvh", duration: 1.05, ease: "expo.inOut" }, 0.08);
  };

  return (
    <main id="main" tabIndex={-1} className="chooser-page outline-none">
      <header className="chooser-header main-reveal" style={delay(0.3)}>
        <p className="wordmark">Rajmohan</p>
        <ReplayOpening />
      </header>

      <p className="chooser-head main-reveal" style={delay(0.55)}>
        Where would you like to begin?
      </p>

      <nav className="chooser" aria-label="Portfolios">
        {items.map(({ sector, cover }, index) => (
          <Link
            key={sector.slug}
            href={`/${sector.slug}`}
            className="chooser-panel"
            onClick={(event) => choose(event, `/${sector.slug}`)}
          >
            <span className="chooser-inner main-reveal" style={delay(0.75 + index * 0.14)}>
              <span className="chooser-art">
                {cover ? (
                  <Image
                    src={cover}
                    alt=""
                    fill
                    sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 45vw"
                    quality={65}
                    loading="eager"
                    className="chooser-img"
                  />
                ) : (
                  <span className="image-slot image-slot--framed" />
                )}
                <span className="chooser-grade" />
              </span>
              <span className="chooser-copy">
                <span className="chooser-role">
                  <span className="sector-numeral">{sector.numeral}</span>
                  {sector.role}
                </span>
                <span className="chooser-title">{sector.title}</span>
                {sector.native && (
                  <span className="chooser-native" lang="ta">
                    {sector.native}
                  </span>
                )}
                <span className="chooser-cta" aria-hidden="true">
                  <span className="chooser-cta-line" />
                  Explore
                </span>
              </span>
            </span>
          </Link>
        ))}
      </nav>

      <div ref={takeover} className="chooser-takeover" aria-hidden="true" />
    </main>
  );
}
