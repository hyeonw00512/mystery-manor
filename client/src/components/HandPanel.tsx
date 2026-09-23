import type { CardType } from "@mystery/shared";
import { useGame } from "../context/GameContext";
import { CardIllustration } from "./CardIllustration";

const labels: Record<CardType, string> = { SUSPECT: "용의자", LOCATION: "장소", ITEM: "도구" };
export function HandPanel() {
  const { privateState } = useGame();
  return <section className="panel hand-panel"><div className="section-heading"><div><span className="eyebrow">개인 기밀</span><h2>내가 가진 카드</h2></div><span className="step-count">{String(privateState?.hand.length ?? 0).padStart(2, "0")}</span></div><p className="privacy-note">이 카드 정보는 현재 접속한 본인에게만 전달됩니다.</p><div className="hand-grid">{privateState?.hand.map((card) => <article className={`evidence-card ${card.type.toLowerCase()}`} key={card.id}><CardIllustration card={card} /><span className="card-type">{labels[card.type]}</span><strong>{card.name}</strong><span className="card-code">{card.id.toUpperCase()}</span></article>)}</div></section>;
}
