import type { CSSProperties } from "react";

type PortraitArt = { column: number; row: number };

const PORTRAIT_ART: Record<string, PortraitArt> = {
  char_ember: { column: 0, row: 0 },
  char_noir: { column: 1, row: 0 },
  char_ivy: { column: 2, row: 0 },
  char_lumen: { column: 0, row: 1 },
  char_sable: { column: 1, row: 1 },
  char_frost: { column: 2, row: 1 }
};

export function CharacterPortrait({ characterId, initials, className = "" }: { characterId: string; initials: string; className?: string }) {
  const art = PORTRAIT_ART[characterId];
  if (!art) return <span className={`character-portrait ${className}`} aria-hidden="true">{initials}</span>;
  return <span className={`character-portrait has-art ${className}`} aria-hidden="true" style={{
    backgroundImage: "url(/card-art/suspects-sheet.png)",
    backgroundSize: "300% 200%",
    backgroundPosition: `${art.column * 50}% ${art.row * 100}%`
  } as CSSProperties}><span>{initials}</span></span>;
}
