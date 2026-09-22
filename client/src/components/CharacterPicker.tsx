import { characters } from "@mystery/shared";
import { useGame } from "../context/GameContext";

export function CharacterPicker() {
  const { room, session, selectCharacter } = useGame();
  const me = room?.players.find((player) => player.playerId === session?.playerId);
  const taken = new Set(room?.players.filter((player) => player.playerId !== me?.playerId).map((player) => player.characterId));
  return <section className="panel character-panel"><div className="section-heading"><div><span className="eyebrow">조사관 배정</span><h2>캐릭터 선택</h2></div><span className="step-count">01</span></div><div className="character-grid">{characters.map((character) => {
    const disabled = taken.has(character.id); const selected = me?.characterId === character.id;
    return <button key={character.id} type="button" className={`character-card ${selected ? "selected" : ""}`} disabled={disabled || me?.ready} onClick={() => void selectCharacter(character.id)} style={{ "--character-color": character.color } as React.CSSProperties}>
      <span className="portrait">{character.initials}</span><span className="character-copy"><strong>{character.name}</strong><small>{disabled ? "선택됨" : character.role}</small></span>{selected && <span className="selected-mark">✓</span>}
    </button>;
  })}</div></section>;
}
