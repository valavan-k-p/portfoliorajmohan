import Image from "next/image";
import Link from "next/link";

import type { SectorImage } from "@/lib/sector-images";
import type { Sector } from "@/lib/sectors";

import { composeScenes, Mask, Scene } from "./scenes";
import { StoryDirector } from "./StoryDirector";

type SectorStoryProps = {
  sector: Sector;
  images: { cover: SectorImage | null; frames: SectorImage[] };
  next: Sector;
};

/** One portfolio's page: a title card, its photographs as a scroll story, and the way onward. */
export function SectorStory({ sector, images, next }: SectorStoryProps) {
  const scenes = composeScenes(images.frames);

  return (
    <main id="main" tabIndex={-1} className="story outline-none">
      <StoryDirector />

      <header className="story-header story-header--links">
        <Link href="/" className="wordmark">
          Rajmohan
        </Link>
        <p className="story-chapter">
          <span className="story-chapter-numeral">{sector.numeral}</span>
          <span>{sector.title}</span>
        </p>
      </header>
      <div className="story-progress" aria-hidden="true" data-progress />
      <div className="story-grain" aria-hidden="true">
        <div className="op-grain" />
      </div>

      {/* The same picture the chooser panel grew into, so the hand-over is seamless. */}
      <section className="sector-hero" data-scene="hero" aria-label={sector.title}>
        <div className="sector-hero-bg" data-parallax>
          {images.cover ? (
            <Image
              src={images.cover.src}
              alt=""
              fill
              loading="eager"
              fetchPriority="high"
              sizes="100vw"
              quality={85}
              className="story-img"
            />
          ) : (
            <div className="image-slot" />
          )}
          <div className="story-grade" />
        </div>
        <div className="sector-hero-copy" data-hero-copy>
          <p className="sector-role">
            <span className="sector-numeral">{sector.numeral}</span>
            {sector.role}
          </p>
          <h1 className="sector-title">
            <Mask>{sector.title}</Mask>
          </h1>
          {sector.native && (
            <p className="sector-native" lang="ta">
              {sector.native}
            </p>
          )}
        </div>
        <span className="prologue-thread" data-thread aria-hidden="true" />
      </section>

      {scenes.map((spec, index) => (
        <Scene key={`${spec.kind}-${index}`} spec={spec} />
      ))}

      {/* Space held for this portfolio's photographs until its folder is filled. */}
      {scenes.length === 0 && (
        <section className="sector-reserved" aria-label="Photographs to come">
          <div className="sector-reserved-frames" aria-hidden="true">
            <div className="image-slot image-slot--framed" />
            <div className="image-slot image-slot--framed" />
            <div className="image-slot image-slot--framed" />
          </div>
          <p className="caption">Photographs from this portfolio will appear here.</p>
        </section>
      )}

      <footer className="sector-next" data-scene="next">
        <p className="sector-next-label">Next</p>
        <Link href={`/${next.slug}`} className="sector-next-link">
          <span className="sector-role">
            <span className="sector-numeral">{next.numeral}</span>
            {next.role}
          </span>
          <span className="sector-next-title">{next.title}</span>
        </Link>
        <Link href="/" className="film-link">
          <span className="film-link-line" aria-hidden="true" />
          <span className="film-link-label">All portfolios</span>
          <span className="film-link-line" aria-hidden="true" />
        </Link>
      </footer>
    </main>
  );
}
