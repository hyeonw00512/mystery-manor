import type { Card } from "@mystery/shared";

type ArtPosition = { sheet: "suspects" | "locations" | "items"; column: number; row: number; rows: number };

const ART: Record<string, ArtPosition> = {
  suspect_archivist: { sheet: "suspects", column: 0, row: 0, rows: 2 }, suspect_cartographer: { sheet: "suspects", column: 1, row: 0, rows: 2 }, suspect_botanist: { sheet: "suspects", column: 2, row: 0, rows: 2 },
  suspect_watchmaker: { sheet: "suspects", column: 0, row: 1, rows: 2 }, suspect_reporter: { sheet: "suspects", column: 1, row: 1, rows: 2 }, suspect_curator: { sheet: "suspects", column: 2, row: 1, rows: 2 },
  location_archive: { sheet: "locations", column: 0, row: 0, rows: 3 }, location_greenhouse: { sheet: "locations", column: 1, row: 0, rows: 3 }, location_gallery: { sheet: "locations", column: 2, row: 0, rows: 3 },
  location_observatory: { sheet: "locations", column: 0, row: 1, rows: 3 }, location_courtyard: { sheet: "locations", column: 1, row: 1, rows: 3 }, location_workshop: { sheet: "locations", column: 2, row: 1, rows: 3 },
  location_library: { sheet: "locations", column: 0, row: 2, rows: 3 }, location_conservatory: { sheet: "locations", column: 1, row: 2, rows: 3 }, location_dining: { sheet: "locations", column: 2, row: 2, rows: 3 },
  item_compass: { sheet: "items", column: 0, row: 0, rows: 2 }, item_key: { sheet: "items", column: 1, row: 0, rows: 2 }, item_lens: { sheet: "items", column: 2, row: 0, rows: 2 },
  item_cane: { sheet: "items", column: 0, row: 1, rows: 2 }, item_letter: { sheet: "items", column: 1, row: 1, rows: 2 }, item_gear: { sheet: "items", column: 2, row: 1, rows: 2 }
};

export function CardIllustration({ card, className = "" }: { card: Card; className?: string }) {
  const art = ART[card.id];
  if (!art) return <span className={`card-illustration fallback ${className}`} aria-hidden="true">{card.icon}</span>;
  return <span className={`card-illustration ${className}`} aria-hidden="true" style={{
    backgroundImage: `url(/card-art/${art.sheet}-sheet.png)`,
    backgroundSize: `300% ${art.rows * 100}%`,
    backgroundPosition: `${art.column * 50}% ${art.row * (100 / (art.rows - 1))}%`
  }} />;
}
