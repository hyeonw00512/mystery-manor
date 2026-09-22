import { useState } from "react";
import { useGame } from "../context/GameContext";
import { ConnectionBadge } from "../components/ConnectionBadge";
import { CharacterPicker } from "../components/CharacterPicker";
import { PlayerList } from "../components/PlayerList";
import { ChatPanel } from "../components/ChatPanel";
import { GameWorkspace } from "../components/GameWorkspace";

export function RoomPage() {
  const { room, session, setReady, startGame, leaveLocal } = useGame(); const [copied, setCopied] = useState(false);
  if (!room || !session) return null;
  const me = room.players.find((player) => player.playerId === session.playerId)!; const canStart = room.players.length >= room.rules.minPlayers && room.players.every((player) => player.ready && player.characterId && player.connected);
  const inviteUrl = `${window.location.origin}/room/${room.roomCode}`;
  const copyInvite = async () => { await navigator.clipboard.writeText(inviteUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1600); };
  return <main className={`room-shell ${room.status !== "LOBBY" ? "is-game" : ""}`}><header className="room-header"><a className="brand small" href="/" onClick={(event) => { event.preventDefault(); if (confirm("현재 방에서 나갈까요?")) leaveLocal(); }}><span className="brand-sigil">M</span><span>흑야 저택<small>MYSTERY MANOR</small></span></a><div className="room-identity"><span>{room.status === "LOBBY" ? "조사 준비실" : room.status === "GAME_OVER" ? "사건 종결" : "사건 조사 중"}</span><strong>{room.roomName}</strong></div><ConnectionBadge /></header>{room.status === "LOBBY" && <div className="case-strip"><span className="eyebrow">ROOM CODE</span><button className="room-code" onClick={() => void copyInvite()}>{room.roomCode}<small>{copied ? "링크 복사됨" : "눌러서 초대 링크 복사"}</small></button><div className="phase-indicator"><i className="active"/><span>입장</span><i className={room.players.every((player) => player.ready) ? "active" : ""}/><span>준비</span><i/><span>조사</span></div></div>}{room.status === "LOBBY" ? <div className="lobby-grid"><CharacterPicker/><PlayerList/><ChatPanel/><section className="action-dock"><div><span className="eyebrow">현재 상태</span><strong>{!me.characterId ? "캐릭터를 선택하세요" : me.ready ? "다른 조사관을 기다리는 중" : "준비되었다면 상태를 변경하세요"}</strong></div><div className="dock-actions"><button className={me.ready ? "secondary-button" : "primary-button"} disabled={!me.characterId} onClick={() => void setReady(!me.ready)}>{me.ready ? "준비 취소" : "준비 완료"}</button>{me.isHost && <button className="start-button" disabled={!canStart} onClick={() => void startGame()}>게임 시작 <span>→</span></button>}</div></section></div> : <GameWorkspace/>}</main>;
}
