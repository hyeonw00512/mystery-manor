import type { CardType } from "@mystery/shared";
import { useState } from "react";
import { useGame } from "../context/GameContext";
import { CardIllustration } from "./CardIllustration";

const labels: Record<CardType, string> = { SUSPECT: "용의자", LOCATION: "장소", ITEM: "도구" };
export function HandPanel() {
  const { privateState } = useGame();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const selectedCard = privateState?.hand.find((card) => card.id === selectedCardId) ?? null;

  return <>
    <section className="panel hand-panel"><div className="section-heading"><div><span className="eyebrow">개인 기밀</span><h2>내가 가진 카드</h2></div><span className="step-count">{String(privateState?.hand.length ?? 0).padStart(2, "0")}</span></div><p className="privacy-note">카드를 눌러 크게 확인할 수 있으며, 이 정보는 현재 접속한 본인에게만 전달됩니다.</p><div className="hand-grid">{privateState?.hand.map((card) => <button type="button" className={`evidence-card ${card.type.toLowerCase()}`} key={card.id} onClick={() => setSelectedCardId(card.id)} aria-label={`${card.name} 카드 크게 보기`}><CardIllustration card={card} /><span className="card-type">{labels[card.type]}</span><strong>{card.name}</strong><span className="card-code">{card.id.toUpperCase()}</span></button>)}</div></section>
    {selectedCard && <div className="modal-backdrop card-inspect-backdrop" role="presentation" onClick={() => setSelectedCardId(null)}><section className={`case-modal card-inspect-modal ${selectedCard.type.toLowerCase()}`} role="dialog" aria-modal="true" aria-labelledby="card-inspect-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setSelectedCardId(null)} aria-label="카드 상세 보기 닫기">×</button><span className="eyebrow">CONFIDENTIAL EVIDENCE</span><CardIllustration card={selectedCard} className="card-inspect-art" /><span className="card-type">{labels[selectedCard.type]}</span><h2 id="card-inspect-title">{selectedCard.name}</h2><p>이 단서는 내 손패에만 기록됩니다. 다른 조사관에게는 공개되지 않습니다.</p><span className="card-code">{selectedCard.id.toUpperCase()}</span><button className="primary-button" type="button" onClick={() => setSelectedCardId(null)}>확인 완료</button></section></div>}
  </>;
}
