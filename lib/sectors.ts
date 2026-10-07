/**
 * The four portfolios offered after the curtain. Each one's photographs live in
 * public/images/image/<slug>/ (see lib/sector-images.ts for how that folder is read).
 */
export type Sector = {
  slug: string;
  numeral: string;
  /** The small line above the title. */
  role: string;
  title: string;
  /** Optional name in Tamil, shown under the title. */
  native?: string;
};

export const sectors: Sector[] = [
  { slug: "school-education", numeral: "I", role: "Minister for", title: "School Education" },
  { slug: "tamil-development", numeral: "II", role: "Minister for", title: "Tamil Development" },
  { slug: "information-publicity", numeral: "III", role: "Minister for", title: "Information and Publicity" },
  { slug: "egmore", numeral: "IV", role: "MLA for", title: "Egmore", native: "எழும்பூர்" },
];

export const sectorBySlug = (slug: string) => sectors.find((sector) => sector.slug === slug);

/** The portfolio after this one, wrapping round, for the "next" link at the end of each page. */
export const nextSector = (slug: string) => {
  const index = sectors.findIndex((sector) => sector.slug === slug);
  return sectors[(index + 1) % sectors.length];
};
