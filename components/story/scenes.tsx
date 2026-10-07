import Image from "next/image";
import type { ReactNode } from "react";

import type { SectorImage } from "@/lib/sector-images";

/**
 * The story's scene vocabulary. StoryDirector finds scenes by data-scene and choreographs them;
 * the markup here is complete without JavaScript.
 */
export type SceneKind = "wipe" | "spread" | "seam" | "pan" | "grow";
export type SceneSpec = { kind: SceneKind; frames: SectorImage[] };

/**
 * The order a story cycles through its scenes, how many photographs each takes, and the fewest
 * it can work with (used when the folder runs out part-way through a scene).
 */
const RHYTHM: { kind: SceneKind; take: number; min: number }[] = [
  { kind: "wipe", take: 2, min: 2 },
  { kind: "spread", take: 2, min: 1 },
  { kind: "seam", take: 1, min: 1 },
  { kind: "pan", take: 3, min: 2 },
  { kind: "grow", take: 2, min: 2 },
];

/** Deals a folder of photographs into a varied sequence of scenes. */
export function composeScenes(frames: SectorImage[]): SceneSpec[] {
  const scenes: SceneSpec[] = [];
  let index = 0;
  for (let step = 0; index < frames.length; step++) {
    const { kind, take, min } = RHYTHM[step % RHYTHM.length];
    const group = frames.slice(index, index + take);
    index += group.length;
    if (group.length >= min) scenes.push({ kind, frames: group });
    // Too few left for this kind: one photograph opens from the seam, two share a spread.
    else scenes.push({ kind: group.length === 1 ? "seam" : "spread", frames: group });
  }
  return scenes;
}

export function Mask({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`mask ${className}`}>
      <span className="mask-inner">{children}</span>
    </span>
  );
}

function Photo({ frame, sizes }: { frame: SectorImage; sizes: string }) {
  return <Image src={frame.src} alt={frame.caption ?? ""} fill sizes={sizes} quality={65} className="story-img" />;
}

function Caption({ frame, id, className = "caption" }: { frame?: SectorImage; id?: string; className?: string }) {
  if (!frame?.caption) return null;
  return (
    <p className={className} data-caption={id}>
      {frame.caption}
    </p>
  );
}

/** A full-bleed photograph; the next one wipes up over it. */
function WipeScene({ frames }: { frames: SectorImage[] }) {
  const [a, b] = frames;
  return (
    <section className="scene scene--wipe" data-scene="wipe">
      <div className="scene-stage">
        <div className="wipe-layer" data-layer="a">
          <Photo frame={a} sizes="100vw" />
        </div>
        <div className="wipe-layer" data-layer="b">
          <Photo frame={b} sizes="100vw" />
        </div>
        <div className="story-grade" />
        <div className="scene-shade" data-shade />
        <div className="wipe-copy">
          <div className="caption-stack">
            <Caption frame={a} id="a" />
            <Caption frame={b} id="b" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** An editorial spread: framed photographs drifting at different depths. */
function SpreadScene({ frames }: { frames: SectorImage[] }) {
  const [a, b] = frames;
  return (
    <section className="scene scene--spread" data-scene="spread">
      <figure className="spread-frame spread-frame--tall" data-frame>
        <div className="spread-photo">
          <div className="spread-inner" data-drift="-1">
            <Photo frame={a} sizes="(max-width: 767px) 88vw, 44vw" />
          </div>
        </div>
        {a.caption && <figcaption className="caption caption--small">{a.caption}</figcaption>}
      </figure>
      {b && (
        <figure className="spread-frame spread-frame--small" data-frame>
          <div className="spread-photo">
            <div className="spread-inner" data-drift="1">
              <Photo frame={b} sizes="(max-width: 767px) 70vw, 34vw" />
            </div>
          </div>
          {b.caption && <figcaption className="caption caption--small">{b.caption}</figcaption>}
        </figure>
      )}
    </section>
  );
}

/** The photograph opens out of a gold line, the motif of the opening. */
function SeamScene({ frames }: { frames: SectorImage[] }) {
  const [a] = frames;
  return (
    <section className="scene scene--seam" data-scene="seam">
      <div className="scene-stage">
        <div className="seam-frame" data-seam-frame>
          <Photo frame={a} sizes="100vw" />
          <div className="story-grade" />
        </div>
        <span className="seam-line" data-seam-line aria-hidden="true" />
        <div className="seam-copy">
          <Caption frame={a} id="a" />
        </div>
      </div>
    </section>
  );
}

/** A horizontal passage through several photographs. */
function PanScene({ frames }: { frames: SectorImage[] }) {
  return (
    <section className="scene scene--pan" data-scene="pan">
      <div className="pan-track" data-track>
        {frames.map((frame) => (
          <figure key={frame.src} className="pan-frame" data-pan-frame>
            <div className="pan-photo">
              <div className="pan-inner" data-pan-inner>
                <Photo frame={frame} sizes="(max-width: 767px) 82vw, 56vw" />
              </div>
            </div>
            {frame.caption && <figcaption className="caption">{frame.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  );
}

/** A small framed photograph grows to fill the screen, then gives way to the next. */
function GrowScene({ frames }: { frames: SectorImage[] }) {
  const [a, b] = frames;
  return (
    <section className="scene scene--grow" data-scene="grow">
      <div className="scene-stage">
        <div className="grow-frame" data-grow-frame>
          <div className="grow-layer" data-layer="a">
            <Photo frame={a} sizes="100vw" />
          </div>
          <div className="grow-layer" data-layer="b">
            <Photo frame={b} sizes="100vw" />
          </div>
          <div className="story-grade story-grade--soft" />
        </div>
        <div className="grow-copy">
          <div className="caption-stack caption-stack--center">
            <Caption frame={a} id="a" />
            <Caption frame={b} id="b" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Scene({ spec }: { spec: SceneSpec }) {
  switch (spec.kind) {
    case "wipe":
      return <WipeScene frames={spec.frames} />;
    case "spread":
      return <SpreadScene frames={spec.frames} />;
    case "seam":
      return <SeamScene frames={spec.frames} />;
    case "pan":
      return <PanScene frames={spec.frames} />;
    case "grow":
      return <GrowScene frames={spec.frames} />;
  }
}
