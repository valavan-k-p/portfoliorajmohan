import { CinematicOpening } from "@/components/opening/CinematicOpening";
import { MainGate, OpeningProvider } from "@/components/opening/OpeningProvider";
import { PortfolioChooser } from "@/components/portfolio/PortfolioChooser";
import { sectorImages } from "@/lib/sector-images";
import { sectors } from "@/lib/sectors";

export default function Home() {
  const items = sectors.map((sector) => ({ sector, cover: sectorImages(sector.slug).cover?.src ?? null }));

  return (
    <OpeningProvider>
      <CinematicOpening />
      <MainGate>
        <PortfolioChooser items={items} />
      </MainGate>
    </OpeningProvider>
  );
}
