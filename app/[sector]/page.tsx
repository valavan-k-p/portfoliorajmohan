import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SectorStory } from "@/components/story/SectorStory";
import { sectorImages } from "@/lib/sector-images";
import { nextSector, sectorBySlug, sectors } from "@/lib/sectors";

type Params = { params: Promise<{ sector: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return sectors.map((sector) => ({ sector: sector.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const sector = sectorBySlug((await params).sector);
  if (!sector) return {};
  return {
    title: `${sector.title} | Rajmohan`,
    description: `Rajmohan, ${sector.role} ${sector.title}.`,
  };
}

export default async function SectorPage({ params }: Params) {
  const sector = sectorBySlug((await params).sector);
  if (!sector) notFound();
  return <SectorStory sector={sector} images={sectorImages(sector.slug)} next={nextSector(sector.slug)} />;
}
