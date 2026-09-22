export type CardType = "SUSPECT" | "LOCATION" | "ITEM";
export type RoomStatus = "LOBBY" | "IN_GAME" | "GAME_OVER";
export type TurnPhase = "WAITING" | "ROLL" | "MOVE" | "ROOM_ACTION" | "SUGGESTION" | "CARD_RESPONSE" | "END_TURN" | "GAME_OVER";

export interface Card { id: string; type: CardType; name: string; icon: string; }
export type BoardNodeType = "ROOM" | "CORRIDOR";
export interface BoardNode { id: string; type: BoardNodeType; name?: string; locationId?: string; x: number; y: number; connections: string[]; secretPassage?: string; }
export interface BoardDefinition { id: string; name: string; width: number; height: number; nodes: BoardNode[]; }
export interface Character { id: string; name: string; role: string; color: string; initials: string; startNodeId: string; }
export interface GameRules { minPlayers: number; maxPlayers: number; diceCount: number; secretPassages: boolean; accusationElimination: boolean; autoNotes: boolean; turnTimeLimitSeconds: number; reconnectGraceSeconds: number; }
export interface SessionCredentials { roomId: string; roomCode: string; playerId: string; sessionToken: string; isSpectator?: boolean; }
export interface PublicPlayer { playerId: string; nickname: string; characterId: string | null; connected: boolean; reconnectDeadlineAt: string | null; eliminated: boolean; ready: boolean; isHost: boolean; cardCount: number; position: string | null; }
export interface ChatMessage { id: string; playerId: string; nickname: string; message: string; createdAt: string; }
export interface GameLogEntry { id: string; message: string; createdAt: string; }
export interface SuggestionSelection { suspectId: string; itemId: string; }
export interface AccusationSelection { suspectId: string; locationId: string; itemId: string; }
export interface PublicSuggestionState { suggestionId: string; suggesterId: string; suspectId: string; locationId: string; itemId: string; responderId: string | null; status: "AWAITING_CARD" | "RESOLVED" | "NO_MATCH"; }
export interface PendingCardReveal { suggestionId: string; suggesterNickname: string; cards: Card[]; }
export interface RevealedCardInfo { suggestionId: string; card: Card; fromPlayerId: string; fromNickname: string; shownAt: string; }
export type NoteMark = "UNKNOWN" | "LOW" | "CANDIDATE" | "ELIMINATED";
export type AutomaticNoteStatus = "OWNED" | "CONFIRMED" | null;
export interface PlayerCardNote { cardId: string; mark: NoteMark; memo: string; automaticStatus: AutomaticNoteStatus; }
export interface UpdateNotePayload { cardId: string; mark: NoteMark; memo: string; }
export interface GameOverSummary { winnerPlayerId: string | null; solution: Card[]; playerCards: { playerId: string; nickname: string; cards: Card[] }[]; endedAt: string; }
export interface PublicRoomState { roomId: string; roomCode: string; roomName: string; status: RoomStatus; hostPlayerId: string; players: PublicPlayer[]; currentPlayerId: string | null; turnPhase: TurnPhase; diceResult: number | null; reachableNodeIds: string[]; activeSuggestion: PublicSuggestionState | null; gameOver: GameOverSummary | null; rules: GameRules; logs: GameLogEntry[]; chat: ChatMessage[]; }
export interface PrivatePlayerState { playerId: string; hand: Card[]; pendingReveal: PendingCardReveal | null; revealedCards: RevealedCardInfo[]; notes: PlayerCardNote[]; }
export interface AckSuccess<T = undefined> { ok: true; data: T; }
export interface AckFailure { ok: false; error: string; }
export type Ack<T = undefined> = AckSuccess<T> | AckFailure;
