import { items, locations, suspects } from "@mystery/shared";
import { useState, type FormEvent } from "react";
import { useGame } from "../context/GameContext";

export function AccusationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { makeAccusation } = useGame();
  const [suspectId, setSuspectId] = useState(suspects[0]!.id);
  const [locationId, setLocationId] = useState(locations[0]!.id);
  const [itemId, setItemId] = useState(items[0]!.id);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try { if (await makeAccusation({ suspectId, locationId, itemId })) onClose(); } finally { setBusy(false); }
  };
  if (!open) return null;
  return <div className="modal-backdrop urgent" role="presentation"><section className="case-modal accusation-modal" role="dialog" aria-modal="true" aria-labelledby="accusation-title"><button className="modal-close" onClick={onClose} aria-label="닫기">×</button><span className="eyebrow">FINAL ACCUSATION</span><h2 id="accusation-title">최종 추리</h2><p>한 번 선언하면 되돌릴 수 없습니다. 틀리면 이동과 추리는 할 수 없지만, 다른 조사관에게 카드를 보여주는 역할은 유지합니다.</p><form onSubmit={submit}><label>용의자<select value={suspectId} onChange={(event) => setSuspectId(event.target.value)}>{suspects.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label><label>장소<select value={locationId} onChange={(event) => setLocationId(event.target.value)}>{locations.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label><label>도구<select value={itemId} onChange={(event) => setItemId(event.target.value)}>{items.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label><label className="confirmation-check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/><span>이 조합으로 최종 추리를 선언합니다.</span></label><button className="danger-button" disabled={!confirmed || busy}>최종 추리 선언</button></form></section></div>;
}
