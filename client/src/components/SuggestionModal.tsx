import { boardNodeById, items, locations, suspects } from "@mystery/shared";
import { useState, type FormEvent } from "react";
import { useGame } from "../context/GameContext";

export function SuggestionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { room, session, makeSuggestion } = useGame();
  const [suspectId, setSuspectId] = useState(suspects[0]!.id);
  const [itemId, setItemId] = useState(items[0]!.id);
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const me = room?.players.find((player) => player.playerId === session?.playerId);
  const node = me?.position ? boardNodeById.get(me.position) : undefined;
  const location = locations.find((card) => card.id === node?.locationId);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try { if (await makeSuggestion({ suspectId, itemId })) onClose(); } finally { setBusy(false); }
  };
  return <div className="modal-backdrop" role="presentation"><section className="case-modal" role="dialog" aria-modal="true" aria-labelledby="suggestion-title"><button className="modal-close" onClick={onClose} aria-label="닫기">×</button><span className="eyebrow">MAKE A SUGGESTION</span><h2 id="suggestion-title">추리 제안</h2><p>현재 장소와 용의자, 도구를 조합해 다른 조사관의 카드를 확인합니다.</p><form onSubmit={submit}><label>용의자<select value={suspectId} onChange={(event) => setSuspectId(event.target.value)}>{suspects.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label><label>장소<div className="fixed-selection">{location?.name ?? "현재 장소 없음"}<small>현재 위치로 자동 지정</small></div></label><label>도구<select value={itemId} onChange={(event) => setItemId(event.target.value)}>{items.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label><button className="primary-button" disabled={busy || !location}>추리 시작</button></form></section></div>;
}

export function CardResponseModal() {
  const { privateState, revealCard } = useGame(); const [busy, setBusy] = useState(false);
  const pending = privateState?.pendingReveal;
  if (!pending) return null;
  const choose = async (cardId: string) => { setBusy(true); try { await revealCard(pending.suggestionId, cardId); } finally { setBusy(false); } };
  return <div className="modal-backdrop urgent" role="presentation"><section className="case-modal reveal-choice" role="dialog" aria-modal="true" aria-labelledby="reveal-title"><span className="eyebrow">PRIVATE RESPONSE</span><h2 id="reveal-title">보여줄 카드를 선택하세요</h2><p><strong>{pending.suggesterNickname}</strong>님에게만 선택한 카드 한 장이 공개됩니다.</p><div className="reveal-options">{pending.cards.map((card) => <button key={card.id} disabled={busy} onClick={() => void choose(card.id)}><span>{card.icon}</span><small>{card.type === "SUSPECT" ? "용의자" : card.type === "LOCATION" ? "장소" : "도구"}</small><strong>{card.name}</strong></button>)}</div></section></div>;
}

export function RevealedCardModal() {
  const { revealedCard, dismissRevealedCard } = useGame();
  if (!revealedCard) return null;
  const { card } = revealedCard;
  return <div className="modal-backdrop private-result" role="presentation"><section className="case-modal revealed-result" role="dialog" aria-modal="true" aria-labelledby="revealed-title"><span className="eyebrow">CONFIDENTIAL EVIDENCE</span><h2 id="revealed-title">카드 한 장을 확인했습니다</h2><p><strong>{revealedCard.fromNickname}</strong>님이 보여준 카드입니다. 이 내용은 다른 플레이어에게 공개되지 않습니다.</p><article className={`revealed-card ${card.type.toLowerCase()}`}><span className="card-icon">{card.icon}</span><small>{card.type === "SUSPECT" ? "용의자" : card.type === "LOCATION" ? "장소" : "도구"}</small><strong>{card.name}</strong></article><button className="primary-button" onClick={dismissRevealedCard}>확인 완료</button></section></div>;
}
