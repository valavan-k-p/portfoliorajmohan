import fs from "node:fs";
import path from "node:path";

/**
 * Reads a portfolio's photographs from public/images/image/<slug>/ (server only).
 *
 * - cover.jpg / cover.webp / cover.png (any supported type) is the chooser panel and the page's
 *   opening image. Without one, the first photograph is used.
 * - Every other photograph becomes part of the page's story, in file-name order
 *   (01-..., 02-... sorts naturally).
 * - A descriptive file name becomes the caption: "03-Classroom visit in Chennai.jpg" reads
 *   "Classroom visit in Chennai". Camera-style names (IMG_1234, WhatsApp Image ...) get none.
 *
 * Pages are generated at build time, so new photographs appear after the next deploy
 * (immediately on refresh while running `npm run dev`).
 */
export type SectorImage = { src: string; caption: string | null };

const PHOTO = /\.(jpe?g|png|webp|avif)$/i;
const CAMERA_NAME = /^(img|dsc|dcim|pxl|whatsapp|image|photo|screenshot|screen shot|untitled)[\s_-]*\d*/i;

function captionFrom(file: string) {
  const name = file
    .replace(PHOTO, "")
    .replace(/^\d+[\s._-]*/, "")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!name || CAMERA_NAME.test(name) || !/[a-z஀-௿]/i.test(name)) return null;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function sectorImages(slug: string): { cover: SectorImage | null; frames: SectorImage[] } {
  const dir = path.join(process.cwd(), "public", "images", "image", slug);
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(dir)
      .filter((file) => PHOTO.test(file))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  } catch {
    // The folder does not exist yet: the page shows its reserved spaces.
  }
  const toImage = (file: string): SectorImage => ({
    src: `/images/image/${slug}/${encodeURIComponent(file)}`,
    caption: captionFrom(file),
  });
  const coverFile = files.find((file) => /^cover\./i.test(file)) ?? files[0];
  return {
    cover: coverFile ? toImage(coverFile) : null,
    frames: files.filter((file) => file !== coverFile).map(toImage),
  };
}
