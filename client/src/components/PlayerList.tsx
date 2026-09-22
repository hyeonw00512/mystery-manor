import { characters } from "@mystery/shared";
import { useGame } from "../context/GameContext";

export function PlayerList() {
  const { room, session } = useGame();
  return <section className="panel player-panel"><div className="section-heading"><div><span className="eyebrow">참가 현황</span><h2>조사관 {room?.players.length}/{room?.rules.maxPlayers}</h2></div><span className="step-count">02</span></div><div className="player-list">{room?.players.map((player, index) => {
    const character = characters.find((item) => item.id === player.characterId);
    return <article className={`player-row ${!player.connected ? "disconnected" : ""}`} key={player.playerId}>
      <span className="player-number">{String(index + 1).padStart(2, "0")}</span><span className="mini-avatar" style={{ background: character?.color ?? "#343b45" }}>{character?.initials ?? "?"}</span>
      <span className="player-copy"><strong>{player.nickname}{player.playerId === session?.playerId ? " (나)" : ""}</strong><small>{character?.role ?? "캐릭터 미선택"}</small></span>
      <span className={`status-pill ${player.ready ? "ready" : ""}`} title={!player.connected && player.reconnectDeadlineAt ? `재접속 유예: ${new Date(player.reconnectDeadlineAt).toLocaleTimeString()}` : undefined}>{!player.connected ? "재접속 대기" : player.eliminated ? "행동 탈락" : player.ready ? "준비 완료" : "대기"}</span>{player.isHost && <span className="host-mark" title="방장">◆</span>}
    </article>;
  })}</div></section>;
}
