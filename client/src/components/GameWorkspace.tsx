import { useEffect, useRef, useState } from "react";
import { useGame } from "../context/GameContext";
import { ChatPanel } from "./ChatPanel";
import { GameBoard } from "./GameBoard";
import { GameLog } from "./GameLog";
import { HandPanel } from "./HandPanel";
import { NotebookPanel } from "./NotebookPanel";
import { PlayerList } from "./PlayerList";
import { CardResponseModal, RevealedCardModal, SuggestionModal } from "./SuggestionModal";
import { AccusationModal } from "./AccusationModal";
import { GameOverModal } from "./GameOverModal";
import { useGameEffects } from "../hooks/useGameEffects";

type MobileTab = "BOARD" | "CARDS" | "NOTES" | "LOG" | "CHAT";
export function GameWorkspace() {
  const { room, session, rollDice, endTurn, skipDisconnectedPlayer } = useGame(); const [mobileTab, setMobileTab] = useState<MobileTab>("BOARD"); const [busy, setBusy] = useState(false); const [suggestionOpen, setSuggestionOpen] = useState(false); const [accusationOpen, setAccusationOpen] = useState(false);
  const { revealedCard } = useGame();
  const { soundEnabled, toggleSound } = useGameEffects(room, revealedCard);
  const current = room?.players.find((player) => player.playerId === room.currentPlayerId);
  const isMyTurn = room?.currentPlayerId === session?.playerId;
  const me = room?.players.find((player) => player.playerId === session?.playerId);
  const host = room?.players.find((player) => player.playerId === room.hostPlayerId);
  const disconnectedResponder = room?.activeSuggestion?.responderId ? room.players.find((player) => player.playerId === room.activeSuggestion?.responderId && !player.connected) : undefined;
  const disconnectedCurrent = current && !current.connected ? current : undefined;
  const skipTarget = disconnectedResponder ?? disconnectedCurrent;
  const instruction = room?.status === "GAME_OVER" ? "사건 기록이 공개되었습니다." : skipTarget ? `${skipTarget.nickname}님이 재접속을 기다리고 있습니다.` : room?.turnPhase === "ROLL" ? "주사위를 굴려주세요." : room?.turnPhase === "MOVE" ? `강조된 칸 중 목적지를 선택하세요. (${room.reachableNodeIds.length}곳)` : room?.turnPhase === "ROOM_ACTION" ? "장소에 도착했습니다. 추리하거나 턴을 종료할 수 있습니다." : room?.turnPhase === "CARD_RESPONSE" ? "해당 조사관이 보여줄 카드를 선택하고 있습니다." : "이동을 마쳤습니다. 턴을 종료해 주세요.";
  const runAction = async (action: () => Promise<boolean>) => { setBusy(true); try { await action(); } finally { setBusy(false); } };
  const canAccuse = Boolean(isMyTurn && room?.turnPhase !== "CARD_RESPONSE" && room?.status === "IN_GAME" && !busy);
  const canSkip = Boolean((me?.isHost || !host?.connected) && skipTarget && !busy);
  const mobilePrimary = room?.turnPhase === "ROLL" && isMyTurn ? <button className="roll-button" disabled={busy} onClick={() => void runAction(rollDice)}>주사위 굴리기</button>
    : room?.turnPhase === "ROOM_ACTION" && isMyTurn ? <button className="suggest-button" disabled={busy} onClick={() => setSuggestionOpen(true)}>추리하기</button>
      : room?.turnPhase === "END_TURN" && isMyTurn ? <button className="end-turn-button" disabled={busy} onClick={() => void runAction(endTurn)}>턴 종료</button>
        : canSkip ? <button className="skip-button" onClick={() => void runAction(() => skipDisconnectedPlayer(skipTarget!.playerId))}>오프라인 건너뛰기</button>
          : <span className="mobile-waiting">{room?.turnPhase === "MOVE" && isMyTurn ? "보드에서 이동 칸을 선택하세요" : "다른 조사관의 행동을 기다리는 중"}</span>;
  return <div className="game-workspace">
    <TurnTransition playerId={room?.currentPlayerId ?? undefined} nickname={current?.nickname ?? undefined} isMine={Boolean(isMyTurn)} />
    <div className="turn-status"><div><span className="eyebrow">CURRENT TURN</span><strong>{current?.nickname ?? (room?.status === "GAME_OVER" ? "사건 종결" : "조사 준비")}{isMyTurn ? " · 내 차례" : ""}</strong></div><p><b>{instruction}</b><span>{skipTarget ? host?.connected ? "방장은 오프라인 플레이어의 행동을 건너뛸 수 있습니다." : "방장이 재접속 대기 중이므로 연결된 플레이어가 진행을 대행할 수 있습니다." : isMyTurn ? "서버가 행동을 검증합니다." : "현재 조사관의 행동을 기다리고 있습니다."}</span></p><div className="turn-actions">{room?.diceResult != null && <DiceDisplay value={room.diceResult}/>}<button className="roll-button" disabled={!isMyTurn || room?.turnPhase !== "ROLL" || busy} onClick={() => void runAction(rollDice)}>주사위 굴리기</button><button className="suggest-button" disabled={!isMyTurn || room?.turnPhase !== "ROOM_ACTION" || busy} onClick={() => setSuggestionOpen(true)}>추리하기</button><button className="accusation-button" disabled={!isMyTurn || room?.turnPhase === "CARD_RESPONSE" || room?.status !== "IN_GAME" || busy} onClick={() => setAccusationOpen(true)}>최종 추리</button><button className="skip-button" disabled={!(me?.isHost || !host?.connected) || !skipTarget || busy} onClick={() => void runAction(() => skipDisconnectedPlayer(skipTarget!.playerId))}>오프라인 건너뛰기</button><button className="end-turn-button" disabled={!isMyTurn || (room?.turnPhase !== "END_TURN" && room?.turnPhase !== "ROOM_ACTION") || busy} onClick={() => void runAction(endTurn)}>턴 종료</button><button className="sound-toggle" onClick={toggleSound} aria-pressed={soundEnabled} title={soundEnabled ? "효과음 끄기" : "효과음 켜기"}>{soundEnabled ? "♬" : "♩"}</button></div></div>
    <nav className="mobile-game-tabs" aria-label="게임 화면 탭">{([['BOARD','보드'],['CARDS','카드'],['NOTES','노트'],['LOG','기록'],['CHAT','채팅']] as const).map(([id,label]) => <button key={id} className={mobileTab === id ? "active" : ""} onClick={() => setMobileTab(id)}>{label}</button>)}</nav>
    <aside className="game-left"><PlayerList/></aside>
    <div className={`game-center mobile-${mobileTab.toLowerCase()}`}><GameBoard/></div>
    <aside className="game-right">
      <div className={mobileTab === "CARDS" ? "mobile-visible" : ""}><HandPanel/></div>
      <div className={mobileTab === "NOTES" ? "mobile-visible" : ""}><NotebookPanel/></div>
      <div className={mobileTab === "LOG" ? "mobile-visible" : ""}><GameLog/></div>
      <div className={mobileTab === "CHAT" ? "mobile-visible" : ""}><ChatPanel/></div>
    </aside>
    <div className="mobile-action-dock" aria-label="게임 행동">{mobilePrimary}{canAccuse && <button className="accusation-button" onClick={() => setAccusationOpen(true)}>최종 추리</button>}{room?.turnPhase === "ROOM_ACTION" && isMyTurn && <button className="end-turn-button subtle" disabled={busy} onClick={() => void runAction(endTurn)}>턴 종료</button>}<button className="sound-toggle" onClick={toggleSound} aria-pressed={soundEnabled} title={soundEnabled ? "효과음 끄기" : "효과음 켜기"}>{soundEnabled ? "♬" : "♩"}</button></div>
    <SuggestionModal open={suggestionOpen && room?.turnPhase === "ROOM_ACTION"} onClose={() => setSuggestionOpen(false)}/><AccusationModal open={accusationOpen && room?.status === "IN_GAME" && isMyTurn && room?.turnPhase !== "CARD_RESPONSE"} onClose={() => setAccusationOpen(false)}/><CardResponseModal/><RevealedCardModal/><GameOverModal/>
  </div>;
}

function TurnTransition({ playerId, nickname, isMine }: { playerId?: string; nickname?: string; isMine: boolean }) {
  const previousPlayerId = useRef<string | undefined>(undefined);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const previous = previousPlayerId.current;
    previousPlayerId.current = playerId;
    if (!previous || !playerId || previous === playerId) return;
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [playerId]);
  if (!visible || !nickname) return null;
  return <div className={`turn-transition ${isMine ? "is-mine" : ""}`} role="status"><span>TURN CHANGED</span><strong>{isMine ? "내 차례입니다" : `${nickname}님의 차례`}</strong><small>{isMine ? "주사위를 굴려 조사를 시작하세요." : "조사관의 행동을 지켜보고 있습니다."}</small></div>;
}

function DiceDisplay({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    setShown(value);
    setRolling(true);
    const timeout = window.setTimeout(() => setRolling(false), 480);
    return () => window.clearTimeout(timeout);
  }, [value]);
  return <span className={`dice-result ${rolling ? "is-rolling" : ""}`} aria-label={`주사위 결과 ${value}`}>{shown}</span>;
}
