import { allCards, board, boardEdges, boardNodeById, characters } from "@mystery/shared";
import { useGame } from "../context/GameContext";
import { useBoardViewport } from "../hooks/useBoardViewport";

export function GameBoard() {
  const { room, session, movePlayer } = useGame();
  const { viewportRef, transform, reset, zoomBy, focusOn, handlers } = useBoardViewport();
  const canMove = Boolean(room && room.currentPlayerId === session?.playerId && room.turnPhase === "MOVE");
  const isReachable = (nodeId: string) => Boolean(canMove && room?.reachableNodeIds.includes(nodeId));
  const chooseDestination = (nodeId: string) => { if (isReachable(nodeId)) void movePlayer(nodeId); };
  const myPosition = room?.players.find((player) => player.playerId === session?.playerId)?.position;
  const focusMyPiece = () => { const node = myPosition ? boardNodeById.get(myPosition) : undefined; if (node) focusOn(node.x, node.y); };
  const activeSuggestion = room?.activeSuggestion;
  const suggestedCards = activeSuggestion ? [activeSuggestion.suspectId, activeSuggestion.locationId, activeSuggestion.itemId].map((id) => allCards.find((card) => card.id === id)?.name).filter(Boolean) : [];
  return <section className="board-panel" aria-label="흑야 저택 게임 보드">
    <div className="board-toolbar"><div><span className="eyebrow">INVESTIGATION MAP</span><strong>{board.name}</strong></div><div className="zoom-controls"><button onClick={() => zoomBy(.85)} aria-label="축소">−</button><button onClick={focusMyPiece} disabled={!myPosition} aria-label="내 위치 중심으로 이동">내 위치</button><button onClick={reset} aria-label="화면에 맞추기">맞춤</button><button onClick={() => zoomBy(1.18)} aria-label="확대">＋</button></div></div>
    <div className="board-viewport" ref={viewportRef} {...handlers}>
      <div className="board-stage" style={{ width: board.width, height: board.height, transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}>
        <div className="board-compass" aria-hidden="true"><span>N</span><i/></div>
        <svg className="board-connections" viewBox={`0 0 ${board.width} ${board.height}`} aria-hidden="true">
          {boardEdges.map(([fromId, toId]) => { const from = boardNodeById.get(fromId)!; const to = boardNodeById.get(toId)!; return <line key={`${fromId}-${toId}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}/>; })}
          <path className="secret-line" d="M100 80 C300 20, 780 690, 900 620"/><path className="secret-line" d="M900 80 C760 20, 240 680, 100 620"/>
        </svg>
        {board.nodes.map((node) => node.type === "ROOM" ? <button type="button" key={node.id} className={`board-room ${isReachable(node.id) ? "is-reachable" : ""}`} style={{ left: node.x, top: node.y }} disabled={!isReachable(node.id)} onPointerDown={(event) => event.stopPropagation()} onClick={() => chooseDestination(node.id)}><span className="room-corner">{node.locationId?.split("_")[1]?.slice(0, 2).toUpperCase()}</span><strong>{node.name}</strong>{node.secretPassage && <small>비밀 통로</small>}</button> : <button type="button" key={node.id} className={`corridor-node ${isReachable(node.id) ? "is-reachable" : ""}`} style={{ left: node.x, top: node.y }} disabled={!isReachable(node.id)} onPointerDown={(event) => event.stopPropagation()} onClick={() => chooseDestination(node.id)} aria-label={`이동 칸 ${node.id}`}><span/></button>)}
        {room?.players.map((player) => {
          const node = player.position ? boardNodeById.get(player.position) : undefined;
          const character = characters.find((candidate) => candidate.id === player.characterId);
          if (!node || !character) return null;
          const occupants = room.players.filter((candidate) => candidate.position === player.position);
          const offset = occupants.findIndex((candidate) => candidate.playerId === player.playerId) * 18 - (occupants.length - 1) * 9;
          return <div key={player.playerId} className={`player-piece ${player.playerId === session?.playerId ? "is-me" : ""}`} style={{ left: node.x + offset, top: node.y, "--piece-color": character.color } as React.CSSProperties} title={`${player.nickname} · ${character.name}`}><span>{character.initials}</span><small>{player.nickname}</small></div>;
        })}
        {activeSuggestion && <div className="suggestion-flash" role="status"><span>추리 제안</span><strong>{suggestedCards.join(" · ")}</strong></div>}
      </div>
      <div className="pan-hint">드래그하여 이동 · 휠 또는 두 손가락으로 확대</div>
    </div>
  </section>;
}
