import type { StaticImageData } from "next/image";

import shot01 from "@/public/images/background/01.webp";
import shot02 from "@/public/images/background/02.webp";
import shot03 from "@/public/images/background/03.webp";
import shot04 from "@/public/images/background/04.webp";
import shot05 from "@/public/images/background/05.webp";
import shot06 from "@/public/images/background/06.webp";
import shot07 from "@/public/images/background/07.webp";
import shot08 from "@/public/images/background/08.webp";
import shot09 from "@/public/images/background/09.webp";
import shot10 from "@/public/images/background/10.webp";
import subjects from "@/public/images/video/Two Men in White Shirts.png";

/** Camera position for one end of a shot's move. `x` / `y` are percentages of the frame. */
export type CameraFrame = { scale: number; x: number; y: number };

export type Shot = {
  id: string;
  src: StaticImageData;
  /** object-position: keeps the subject of each photograph inside portrait crops. */
  focus: string;
  /** Multiplies the beat length. Stronger, quieter frames are held longer. */
  weight: number;
  move: { from: CameraFrame; to: CameraFrame };
};

// Each photograph gets its own camera grammar so the edit never reads as one repeated move.
// Every move keeps |x|, |y| below (scale - 1) / 2 so a frame edge is never exposed.
export const openingShots: Shot[] = [
  // slow push-in
  { id: "01", src: shot01, focus: "50% 55%", weight: 1, move: { from: { scale: 1.06, x: 0, y: 0 }, to: { scale: 1.13, x: 0, y: -0.5 } } },
  // horizontal drift
  { id: "02", src: shot02, focus: "34% 60%", weight: 1.1, move: { from: { scale: 1.1, x: -2, y: 0 }, to: { scale: 1.1, x: 2, y: 0 } } },
  // slow pull-back
  { id: "03", src: shot03, focus: "56% 42%", weight: 0.9, move: { from: { scale: 1.16, x: 0, y: 0 }, to: { scale: 1.07, x: 0, y: 0 } } },
  // gentle rise
  { id: "04", src: shot04, focus: "52% 55%", weight: 0.9, move: { from: { scale: 1.1, x: 0, y: 2 }, to: { scale: 1.1, x: 0, y: -2 } } },
  // push-in toward the upper left
  { id: "05", src: shot05, focus: "40% 35%", weight: 0.85, move: { from: { scale: 1.06, x: 0, y: 0 }, to: { scale: 1.13, x: 2.5, y: 2 } } },
  // diagonal drift
  { id: "06", src: shot06, focus: "45% 40%", weight: 0.95, move: { from: { scale: 1.1, x: 1.5, y: -1 }, to: { scale: 1.1, x: -1.5, y: 1 } } },
  // pull-back with a slight sideways settle
  { id: "07", src: shot07, focus: "45% 50%", weight: 0.85, move: { from: { scale: 1.15, x: -1, y: 0 }, to: { scale: 1.08, x: 0.5, y: 0 } } },
  // slow push-in toward the man on the left
  { id: "08", src: shot08, focus: "38% 55%", weight: 1.2, move: { from: { scale: 1.06, x: 0, y: 0 }, to: { scale: 1.14, x: 2, y: -0.5 } } },
  // horizontal drift, the other way
  { id: "09", src: shot09, focus: "45% 40%", weight: 0.9, move: { from: { scale: 1.1, x: 2, y: 0 }, to: { scale: 1.1, x: -2, y: 0 } } },
  // push-in with a lift
  { id: "10", src: shot10, focus: "55% 50%", weight: 1.25, move: { from: { scale: 1.07, x: 0, y: 1 }, to: { scale: 1.13, x: 0, y: -1.5 } } },
];

/**
 * The supplied soundtrack and the moments in it the film is cut to (seconds of song time).
 * Measured from its loudness envelope: a short swell, a first audible lift at 0.8s, the impact
 * at 4.3s (where it reaches full level and stays), the loudest moment at 8.8s, and a fade-out
 * from 13.8s to the end (16.2s). Re-measure these whenever the song file is replaced.
 * The path is case-sensitive in production: it must match the file name exactly.
 */
export const soundtrack = {
  src: "/images/audio/song.mp3",
  cues: { firstLift: 0.8, impact: 4.3, peak: 8.8, release: 13.8 },
};

type ForegroundBase = {
  alt: string;
  width: number;
  height: number;
  /** Source rows to show, from the top. Anything below is clipped. */
  visibleHeight: number;
  /** Source row where the subjects' heads begin. Drives vertical placement per breakpoint. */
  headTop: number;
};

export type Foreground =
  | (ForegroundBase & { kind: "image"; src: StaticImageData })
  | (ForegroundBase & { kind: "video"; src: string; poster?: string });

// The supplied Layer 3 asset is a transparent cut-out still. Its bottom quarter is an opaque
// bokeh panel with card outlines (source row 708 onward), so only the rows above it are shown.
// To use a video instead, switch to { kind: "video", src: "/images/video/<file>.mp4", ... }.
export const foreground: Foreground = {
  kind: "image",
  src: subjects,
  alt: "Rajmohan and Vijay seated together in conversation",
  width: subjects.width,
  height: subjects.height,
  visibleHeight: 708,
  headTop: 300,
};
