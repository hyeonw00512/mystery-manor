import type { Server, Socket } from "socket.io";
import { CLIENT_EVENTS, SERVER_EVENTS, type AccusationSelection, type Ack, type ChatMessage, type SessionCredentials, type SuggestionSelection, type UpdateNotePayload } from "@mystery/shared";
import type { GameManager } from "../game/GameManager.js";
import { verifyPlatformJoinToken } from "../platform.js";

interface SocketSession { roomId?: string; playerId?: string; }
type AppSocket = Socket<Record<string, never>, Record<string, (...args: unknown[]) => void>, Record<string, never>, SocketSession>;

export function registerSocketHandlers(io: Server, socket: AppSocket, games: GameManager): void {
  const safe = <T>(ack: (result: Ack<T>) => void, action: () => T): void => {
    try { ack({ ok: true, data: action() }); }
    catch (error) { ack({ ok: false, error: error instanceof Error ? error.message : "요청 처리에 실패했습니다." }); }
  };

  const bind = (roomId: string, playerId: string): void => {
    socket.data.roomId = roomId;
    socket.data.playerId = playerId;
    void socket.join(roomId);
  };

  const emitState = (roomId: string): void => {
    const room = games.getById(roomId);
    if (!room) return;
    io.to(roomId).emit(SERVER_EVENTS.ROOM_STATE, room.getPublicState());
  };

  const emitPrivateStates = (roomId: string): void => {
    const room = games.getById(roomId);
    if (!room) return;
    for (const player of room.players.values()) {
      if (player.socketId) io.to(player.socketId).emit(SERVER_EVENTS.PRIVATE_STATE, room.getPrivateState(player.playerId));
    }
  };

  const ownRoom = () => {
    const { roomId, playerId } = socket.data;
    const room = roomId ? games.getById(roomId) : undefined;
    if (!room || !playerId || room.getPlayer(playerId)?.socketId !== socket.id) throw new Error("유효한 방 세션이 없습니다.");
    return { room, playerId };
  };
  const record = (value: unknown, label: string): Record<string, unknown> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} 요청 형식이 올바르지 않습니다.`);
    return value as Record<string, unknown>;
  };
  const text = (value: unknown, label: string): string => {
    if (typeof value !== "string") throw new Error(`${label} 값이 올바르지 않습니다.`);
    return value;
  };

  socket.on(CLIENT_EVENTS.CREATE_ROOM, (payload: { nickname: string }, ack: (result: Ack<SessionCredentials>) => void) => safe(ack, () => {
    const room = games.createRoom(text(record(payload, "방 생성").nickname, "닉네임"), socket.id);
    const player = [...room.players.values()][0]!;
    bind(room.roomId, player.playerId);
    queueMicrotask(() => emitState(room.roomId));
    return room.getSession(player.playerId);
  }));
  socket.on("platform:join", (payload: { joinToken: string }, ack: (result: Ack<SessionCredentials>) => void) => safe(ack, () => {
    const token = verifyPlatformJoinToken(text(record(payload, "플랫폼 입장").joinToken, "입장 토큰"));
    if (token.mode === "SPECTATOR") throw new Error("흑야 저택 관전 기능은 준비 중입니다.");
    const room = games.getByCode(token.roomCode); if (!room) throw new Error("존재하지 않는 방입니다.");
    const player = room.join(token.nickname, socket.id); bind(room.roomId, player.playerId); queueMicrotask(() => emitState(room.roomId)); return room.getSession(player.playerId);
  }));

  socket.on(CLIENT_EVENTS.JOIN_ROOM, (payload: { nickname: string; roomCode: string }, ack: (result: Ack<SessionCredentials>) => void) => safe(ack, () => {
    const body = record(payload, "방 참가");
    const room = games.getByCode(text(body.roomCode, "방 코드"));
    if (!room) throw new Error("존재하지 않는 방 코드입니다.");
    const player = room.join(text(body.nickname, "닉네임"), socket.id);
    bind(room.roomId, player.playerId);
    queueMicrotask(() => emitState(room.roomId));
    return room.getSession(player.playerId);
  }));

  socket.on(CLIENT_EVENTS.RECONNECT_ROOM, (payload: SessionCredentials, ack: (result: Ack<SessionCredentials>) => void) => safe(ack, () => {
    const body = record(payload, "재접속");
    const room = games.getById(text(body.roomId, "방 ID"));
    if (!room || room.roomCode !== text(body.roomCode, "방 코드")) throw new Error("기존 방을 찾을 수 없습니다.");
    const player = room.reconnect(text(body.playerId, "플레이어 ID"), text(body.sessionToken, "세션 토큰"), socket.id);
    bind(room.roomId, player.playerId);
    queueMicrotask(() => { emitState(room.roomId); io.to(socket.id).emit(SERVER_EVENTS.PRIVATE_STATE, room.getPrivateState(player.playerId)); });
    return room.getSession(player.playerId);
  }));

  socket.on(CLIENT_EVENTS.SELECT_CHARACTER, (characterId: string, ack: (result: Ack) => void) => safe(ack, () => {
    const { room, playerId } = ownRoom(); room.selectCharacter(playerId, text(characterId, "캐릭터")); emitState(room.roomId); return undefined;
  }));

  socket.on(CLIENT_EVENTS.PLAYER_READY, (ready: boolean, ack: (result: Ack) => void) => safe(ack, () => {
    if (typeof ready !== "boolean") throw new Error("준비 상태 값이 올바르지 않습니다.");
    const { room, playerId } = ownRoom(); room.setReady(playerId, ready); emitState(room.roomId); return undefined;
  }));

  socket.on(CLIENT_EVENTS.START_GAME, (_payload: undefined, ack: (result: Ack) => void) => safe(ack, () => {
    const { room, playerId } = ownRoom(); room.startGame(playerId); emitState(room.roomId); emitPrivateStates(room.roomId); return undefined;
  }));

  socket.on(CLIENT_EVENTS.ROLL_DICE, (_payload: undefined, ack: (result: Ack<number>) => void) => safe(ack, () => {
    const { room, playerId } = ownRoom(); const result = room.rollDice(playerId); emitState(room.roomId); return result;
  }));

  socket.on(CLIENT_EVENTS.MOVE_PLAYER, (destinationNodeId: string, ack: (result: Ack) => void) => safe(ack, () => {
    const { room, playerId } = ownRoom(); room.movePlayer(playerId, text(destinationNodeId, "목적지")); emitState(room.roomId); return undefined;
  }));

  socket.on(CLIENT_EVENTS.END_TURN, (_payload: undefined, ack: (result: Ack) => void) => safe(ack, () => {
    const { room, playerId } = ownRoom(); room.endTurn(playerId); emitState(room.roomId); return undefined;
  }));

  socket.on(CLIENT_EVENTS.MAKE_SUGGESTION, (selection: SuggestionSelection, ack: (result: Ack) => void) => safe(ack, () => {
    const body = record(selection, "추리");
    const { room, playerId } = ownRoom(); room.makeSuggestion(playerId, { suspectId: text(body.suspectId, "용의자"), itemId: text(body.itemId, "도구") }); emitState(room.roomId); emitPrivateStates(room.roomId); return undefined;
  }));

  socket.on(CLIENT_EVENTS.REVEAL_CARD, (payload: { suggestionId: string; cardId: string }, ack: (result: Ack) => void) => safe(ack, () => {
    const body = record(payload, "카드 공개");
    const { room, playerId } = ownRoom();
    const result = room.revealCard(playerId, text(body.suggestionId, "추리 ID"), text(body.cardId, "카드"));
    const suggester = room.getPlayer(result.suggesterId);
    if (suggester?.socketId) io.to(suggester.socketId).emit(SERVER_EVENTS.CARD_REVEALED, result.revealed);
    emitState(room.roomId); emitPrivateStates(room.roomId); return undefined;
  }));

  socket.on(CLIENT_EVENTS.UPDATE_NOTE, (payload: UpdateNotePayload, ack: (result: Ack) => void) => safe(ack, () => {
    const body = record(payload, "추리 노트");
    const { room, playerId } = ownRoom();
    room.updateNote(playerId, text(body.cardId, "카드"), text(body.mark, "노트 상태") as UpdateNotePayload["mark"], text(body.memo, "메모"));
    io.to(socket.id).emit(SERVER_EVENTS.PRIVATE_STATE, room.getPrivateState(playerId));
    return undefined;
  }));

  socket.on(CLIENT_EVENTS.MAKE_ACCUSATION, (selection: AccusationSelection, ack: (result: Ack<{ correct: boolean; gameOver: boolean }>) => void) => safe(ack, () => {
    const body = record(selection, "최종 추리");
    const { room, playerId } = ownRoom();
    const result = room.makeAccusation(playerId, { suspectId: text(body.suspectId, "용의자"), locationId: text(body.locationId, "장소"), itemId: text(body.itemId, "도구") });
    emitState(room.roomId);
    if (result.gameOver) io.to(room.roomId).emit(SERVER_EVENTS.GAME_OVER, room.getPublicState().gameOver);
    return result;
  }));

  socket.on(CLIENT_EVENTS.SKIP_DISCONNECTED, (targetPlayerId: string, ack: (result: Ack) => void) => safe(ack, () => {
    const { room, playerId } = ownRoom();
    room.skipDisconnectedPlayer(playerId, text(targetPlayerId, "플레이어"));
    emitState(room.roomId); emitPrivateStates(room.roomId);
    return undefined;
  }));

  socket.on(CLIENT_EVENTS.CHAT_MESSAGE, (message: string, ack: (result: Ack<ChatMessage>) => void) => safe(ack, () => {
    const { room, playerId } = ownRoom(); const chat = room.addChat(playerId, text(message, "메시지")); io.to(room.roomId).emit(SERVER_EVENTS.CHAT_MESSAGE, chat); return chat;
  }));

  socket.on("disconnect", () => {
    const { roomId, playerId } = socket.data;
    const room = roomId ? games.getById(roomId) : undefined;
    if (room && playerId && room.getPlayer(playerId)?.socketId === socket.id) { room.disconnect(playerId); emitState(room.roomId); }
  });
}
