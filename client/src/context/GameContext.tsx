import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CLIENT_EVENTS, SERVER_EVENTS, type AccusationSelection, type Ack, type ChatMessage, type PrivatePlayerState, type PublicRoomState, type RevealedCardInfo, type SessionCredentials, type SuggestionSelection, type UpdateNotePayload } from "@mystery/shared";
import { socket } from "../socket";
import { clearSession, loadSession, saveSession } from "../session";
const activityToken = new URLSearchParams(location.search).get("platformActivityToken");
const platformUrl = new URLSearchParams(location.search).get("platformUrl");
let lastActivity = "";
const reportActivity = (status: "LOBBY" | "PLAYING", force = false) => {
  if (!activityToken || !platformUrl || (!force && lastActivity === status)) return;
  lastActivity = status;
  fetch(new URL("/api/activity", platformUrl), { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ token:activityToken, status }), keepalive:true }).catch(() => { lastActivity = ""; });
};

interface GameContextValue {
  connected: boolean; restoring: boolean; room: PublicRoomState | null; privateState: PrivatePlayerState | null; session: SessionCredentials | null;
  chat: ChatMessage[]; error: string | null; revealedCard: RevealedCardInfo | null; dismissError: () => void; dismissRevealedCard: () => void;
  createRoom: (nickname: string) => Promise<boolean>; joinRoom: (nickname: string, roomCode: string) => Promise<boolean>;
  selectCharacter: (characterId: string) => Promise<boolean>; setReady: (ready: boolean) => Promise<boolean>;
  startGame: () => Promise<boolean>; rollDice: () => Promise<boolean>; movePlayer: (nodeId: string) => Promise<boolean>; endTurn: () => Promise<boolean>;
  makeSuggestion: (selection: SuggestionSelection) => Promise<boolean>; revealCard: (suggestionId: string, cardId: string) => Promise<boolean>;
  makeAccusation: (selection: AccusationSelection) => Promise<boolean>;
  skipDisconnectedPlayer: (playerId: string) => Promise<boolean>;
  updateNote: (note: UpdateNotePayload) => Promise<boolean>;
  sendChat: (message: string) => Promise<boolean>; leaveLocal: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const platformJoinToken = new URLSearchParams(location.search).get("joinToken");
  const [connected, setConnected] = useState(socket.connected);
  const [restoring, setRestoring] = useState(true);
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [privateState, setPrivateState] = useState<PrivatePlayerState | null>(null);
  const [session, setSession] = useState<SessionCredentials | null>(loadSession);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [revealedCard, setRevealedCard] = useState<RevealedCardInfo | null>(null);
  useEffect(() => { const status = !room || room.status === "LOBBY" ? "LOBBY" : "PLAYING"; reportActivity(status); const timer = window.setInterval(() => reportActivity(status, true), 45_000); return () => window.clearInterval(timer); }, [room?.status]);

  const emitAck = useCallback(<T,>(event: string, ...args: unknown[]): Promise<Ack<T>> => new Promise((resolve) => socket.emit(event, ...args, resolve)), []);

  useEffect(() => {
    const onConnect = async () => {
      setConnected(true);
      if (platformJoinToken) { const result = await emitAck<SessionCredentials>("platform:join", { joinToken: platformJoinToken }); if (result.ok) { saveSession(result.data); setSession(result.data); history.replaceState(null, "", `/room/${result.data.roomCode}`); setRestoring(false); return; } setError(result.error); }
      const stored = loadSession();
      if (stored) {
        const result = await emitAck<SessionCredentials>(CLIENT_EVENTS.RECONNECT_ROOM, stored);
        if (result.ok) { setSession(result.data); saveSession(result.data); }
        else { clearSession(); setSession(null); setRoom(null); setPrivateState(null); }
      }
      setRestoring(false);
    };
    const onDisconnect = () => { setConnected(false); setRestoring(true); };
    const onRoom = (state: PublicRoomState) => { setRoom(state); setChat(state.chat); };
    const onPrivate = (state: PrivatePlayerState) => setPrivateState(state);
    const onChat = (message: ChatMessage) => setChat((current) => [...current.slice(-99), message]);
    const onCardRevealed = (info: RevealedCardInfo) => setRevealedCard(info);
    socket.on("connect", onConnect); socket.on("disconnect", onDisconnect);
    socket.on(SERVER_EVENTS.ROOM_STATE, onRoom); socket.on(SERVER_EVENTS.PRIVATE_STATE, onPrivate); socket.on(SERVER_EVENTS.CHAT_MESSAGE, onChat); socket.on(SERVER_EVENTS.CARD_REVEALED, onCardRevealed);
    socket.connect();
    return () => { socket.off("connect", onConnect); socket.off("disconnect", onDisconnect); socket.off(SERVER_EVENTS.ROOM_STATE, onRoom); socket.off(SERVER_EVENTS.PRIVATE_STATE, onPrivate); socket.off(SERVER_EVENTS.CHAT_MESSAGE, onChat); socket.off(SERVER_EVENTS.CARD_REVEALED, onCardRevealed); socket.disconnect(); };
  }, [emitAck]);

  const enter = useCallback(async (event: string, payload: unknown) => {
    const result = await emitAck<SessionCredentials>(event, payload);
    if (!result.ok) { setError(result.error); return false; }
    saveSession(result.data); setSession(result.data); history.replaceState(null, "", `/room/${result.data.roomCode}`); return true;
  }, [emitAck]);

  const simple = useCallback(async (event: string, payload?: unknown) => {
    const result = await emitAck(event, payload);
    if (!result.ok) { setError(result.error); return false; }
    return true;
  }, [emitAck]);

  const value = useMemo<GameContextValue>(() => ({
    connected, restoring, room, privateState, session, chat, error, revealedCard, dismissError: () => setError(null), dismissRevealedCard: () => setRevealedCard(null),
    createRoom: (nickname) => enter(CLIENT_EVENTS.CREATE_ROOM, { nickname }),
    joinRoom: (nickname, roomCode) => enter(CLIENT_EVENTS.JOIN_ROOM, { nickname, roomCode }),
    selectCharacter: (id) => simple(CLIENT_EVENTS.SELECT_CHARACTER, id), setReady: (ready) => simple(CLIENT_EVENTS.PLAYER_READY, ready),
    startGame: () => simple(CLIENT_EVENTS.START_GAME), rollDice: () => simple(CLIENT_EVENTS.ROLL_DICE),
    movePlayer: (nodeId) => simple(CLIENT_EVENTS.MOVE_PLAYER, nodeId), endTurn: () => simple(CLIENT_EVENTS.END_TURN),
    makeSuggestion: (selection) => simple(CLIENT_EVENTS.MAKE_SUGGESTION, selection), revealCard: (suggestionId, cardId) => simple(CLIENT_EVENTS.REVEAL_CARD, { suggestionId, cardId }),
    makeAccusation: (selection) => simple(CLIENT_EVENTS.MAKE_ACCUSATION, selection),
    skipDisconnectedPlayer: (playerId) => simple(CLIENT_EVENTS.SKIP_DISCONNECTED, playerId),
    updateNote: (note) => simple(CLIENT_EVENTS.UPDATE_NOTE, note),
    sendChat: (message) => simple(CLIENT_EVENTS.CHAT_MESSAGE, message),
    leaveLocal: () => { clearSession(); setSession(null); setRoom(null); setPrivateState(null); setChat([]); history.replaceState(null, "", "/"); window.location.reload(); }
  }), [connected, restoring, room, privateState, session, chat, error, revealedCard, enter, simple]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export const useGame = (): GameContextValue => { const value = useContext(GameContext); if (!value) throw new Error("GameProvider가 필요합니다."); return value; };
