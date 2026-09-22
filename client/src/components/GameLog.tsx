import { useGame } from "../context/GameContext";

export function GameLog() {
  const { room } = useGame();
  return <section className="panel game-log-panel"><div className="section-heading compact"><div><span className="eyebrow">CASE TIMELINE</span><h2>게임 기록</h2></div></div><div className="game-log-list">{[...(room?.logs ?? [])].reverse().map((entry, index) => <article key={entry.id}><span>{String((room?.logs.length ?? 0) - index).padStart(2, "0")}</span><div><p>{entry.message}</p><time>{new Date(entry.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</time></div></article>)}</div></section>;
}
