import type { CardType } from "@mystery/shared";
import { useGame } from "../context/GameContext";
import { CardIllustration } from "./CardIllustration";

const labels: Record<CardType, string> = { SUSPECT: "용의자", LOCATION: "장소", ITEM: "도구" };
export function GameOverModal() {
  const { room } = useGame();
  if (room?.status !== "GAME_OVER" || !room.gameOver) return null;
  const winner = room.gameOver.winnerPlayerId ? room.players.find((player) => player.playerId === room.gameOver?.winnerPlayerId) : null;
  return <div className="modal-backdrop game-over-backdrop" role="presentation"><section className="case-modal game-over-modal" role="dialog" aria-modal="true" aria-labelledby="game-over-title"><div className="case-closed-mark" aria-hidden="true">해결</div><span className="eyebrow">CASE CLOSED</span><h2 id="game-over-title">사건 기록 공개</h2><p>{winner ? <><strong>{winner.nickname}</strong>님이 사건을 해결했습니다.</> : "모든 조사관이 최종 추리에서 탈락했습니다."}</p><div className="solution-row">{room.gameOver.solution.map((card) => <article key={card.id}><CardIllustration card={card} /><small>{labels[card.type]}</small><strong>{card.name}</strong></article>)}</div><h3>조사관별 보유 카드</h3><div className="final-hands">{room.gameOver.playerCards.map((entry) => <article key={entry.playerId}><strong>{entry.nickname}</strong><p>{entry.cards.map((card) => card.name).join(" · ") || "보유 카드 없음"}</p></article>)}</div><p className="game-over-note">정답과 모든 손패는 게임이 종료된 뒤에만 공개되었습니다.</p></section></div>;
}
