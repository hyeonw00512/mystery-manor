import { allCards, type Card, type CardType, type NoteMark } from "@mystery/shared";
import { useEffect, useMemo, useState } from "react";
import { useGame } from "../context/GameContext";

const groups: { type: CardType; label: string }[] = [
  { type: "SUSPECT", label: "용의자" },
  { type: "LOCATION", label: "장소" },
  { type: "ITEM", label: "도구" }
];
const markLabels: Record<NoteMark, string> = { UNKNOWN: "? 미정", LOW: "△ 가능성 낮음", CANDIDATE: "★ 정답 후보", ELIMINATED: "× 제외" };

export function NotebookPanel() {
  const { privateState, updateNote } = useGame();
  const [selectedId, setSelectedId] = useState(allCards[0]!.id);
  const [mark, setMark] = useState<NoteMark>("UNKNOWN");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const notes = privateState?.notes ?? [];
  const selected = useMemo<Card>(() => allCards.find((card) => card.id === selectedId) ?? allCards[0]!, [selectedId]);
  const selectedNote = notes.find((note) => note.cardId === selected.id);

  useEffect(() => {
    setMark(selectedNote?.mark ?? "UNKNOWN");
    setMemo(selectedNote?.memo ?? "");
  }, [selected.id, selectedNote?.mark, selectedNote?.memo]);

  const save = async () => {
    setBusy(true);
    try { await updateNote({ cardId: selected.id, mark, memo }); } finally { setBusy(false); }
  };

  return <section className="panel notebook-panel">
    <div className="section-heading compact"><div><span className="eyebrow">PRIVATE NOTEBOOK</span><h2>개인 추리 노트</h2></div><span className="step-count">{notes.filter((note) => note.automaticStatus).length.toString().padStart(2, "0")}</span></div>
    <p className="privacy-note">자동 기록은 내 카드와 직접 확인한 카드입니다. 이 노트는 본인에게만 보입니다.</p>
    <div className="note-card-list">
      {groups.map((group) => <div className="note-group" key={group.type}><span>{group.label}</span>{allCards.filter((card) => card.type === group.type).map((card) => {
        const note = notes.find((entry) => entry.cardId === card.id);
        const automatic = note?.automaticStatus;
        return <button key={card.id} className={`note-card ${selected.id === card.id ? "selected" : ""} ${automatic ? "automatic" : ""}`} onClick={() => setSelectedId(card.id)}><i>{card.icon}</i><b>{card.name}</b><small>{automatic === "OWNED" ? "내 카드" : automatic === "CONFIRMED" ? "확인됨" : markLabels[note?.mark ?? "UNKNOWN"].slice(2)}</small></button>;
      })}</div>)}
    </div>
    <div className="note-editor">
      <div className="note-editor-heading"><span>{selected.icon}</span><strong>{selected.name}</strong>{selectedNote?.automaticStatus && <em>{selectedNote.automaticStatus === "OWNED" ? "자동 · 내 카드" : "자동 · 직접 확인"}</em>}</div>
      <label>판단 상태<select value={mark} disabled={Boolean(selectedNote?.automaticStatus)} onChange={(event) => setMark(event.target.value as NoteMark)}>{Object.entries(markLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>개인 메모<textarea value={memo} maxLength={160} onChange={(event) => setMemo(event.target.value)} placeholder="예: 2번째 플레이어가 보유했을 가능성" /></label>
      <div className="note-save-row"><span>{memo.length}/160</span><button className="secondary-button" disabled={busy} onClick={() => void save()}>메모 저장</button></div>
    </div>
  </section>;
}
