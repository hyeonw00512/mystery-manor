import {
  allCards,
  characters,
  defaultRules,
  items,
  locations,
  suspects,
  type Card,
  type AccusationSelection,
  type ChatMessage,
  type GameLogEntry,
  type GameOverSummary,
  type GameRules,
  type NoteMark,
  type PlayerCardNote,
  type PrivatePlayerState,
  type PublicPlayer,
  type PublicRoomState,
  type PublicSuggestionState,
  type RevealedCardInfo,
  type RoomStatus,
  type SessionCredentials,
  type SuggestionSelection,
  type TurnPhase
} from "@mystery/shared";
import { createId, createSessionToken, normalizeNickname, rollDie, shuffle } from "../utils.js";
import { boardManager } from "./BoardManager.js";

export interface ServerPlayer {
  playerId: string;
  sessionToken: string;
  socketId: string | null;
  nickname: string;
  characterId: string | null;
  connected: boolean;
  reconnectDeadlineAt: string | null;
  eliminated: boolean;
  ready: boolean;
  cards: Card[];
  position: string | null;
  revealedCards: RevealedCardInfo[];
  notes: Map<string, { mark: NoteMark; memo: string }>;
}

interface SpectatorSession {
  playerId: string;
  sessionToken: string;
  socketId: string | null;
  nickname: string;
}

interface Solution { suspectId: string; locationId: string; itemId: string; }
interface ActiveSuggestion extends PublicSuggestionState { eligibleCardIds: string[]; }

export class GameRoom {
  readonly roomId: string;
  readonly roomCode: string;
  readonly roomName: string;
  readonly rules: GameRules;
  readonly players = new Map<string, ServerPlayer>();
  readonly spectators = new Map<string, SpectatorSession>();
  readonly chat: ChatMessage[] = [];
  readonly logs: GameLogEntry[] = [];
  hostPlayerId: string;
  status: RoomStatus = "LOBBY";
  currentPlayerId: string | null = null;
  turnPhase: TurnPhase = "WAITING";
  diceResult: number | null = null;
  reachableNodeIds: string[] = [];
  activeSuggestion: ActiveSuggestion | null = null;
  private solution: Solution | null = null;
  private gameOver: GameOverSummary | null = null;

  constructor(roomCode: string, nickname: string, socketId: string, rules: GameRules = defaultRules) {
    this.roomId = createId();
    this.roomCode = roomCode;
    this.roomName = `${normalizeNickname(nickname)}의 사건 기록`;
    this.rules = { ...rules };
    const host = this.createPlayer(nickname, socketId);
    this.players.set(host.playerId, host);
    this.hostPlayerId = host.playerId;
    this.addLog(`${host.nickname}님이 조사실을 열었습니다.`);
  }

  private createPlayer(nickname: string, socketId: string): ServerPlayer {
    const cleaned = normalizeNickname(nickname);
    if (cleaned.length < 2 || cleaned.length > 16) throw new Error("닉네임은 2~16자로 입력해 주세요.");
    return { playerId: createId(), sessionToken: createSessionToken(), socketId, nickname: cleaned, characterId: null, connected: true, reconnectDeadlineAt: null, eliminated: false, ready: false, cards: [], position: null, revealedCards: [], notes: new Map() };
  }

  join(nickname: string, socketId: string): ServerPlayer {
    if (this.status !== "LOBBY") throw new Error("이미 게임이 시작된 방입니다.");
    if (this.players.size >= this.rules.maxPlayers) throw new Error("방의 정원이 가득 찼습니다.");
    const cleaned = normalizeNickname(nickname);
    if ([...this.players.values()].some((player) => player.nickname.toLocaleLowerCase() === cleaned.toLocaleLowerCase())) throw new Error("이미 사용 중인 닉네임입니다.");
    const player = this.createPlayer(cleaned, socketId);
    this.players.set(player.playerId, player);
    this.addLog(`${player.nickname}님이 조사에 합류했습니다.`);
    return player;
  }
  spectate(nickname: string, socketId: string): SpectatorSession {
    const cleaned = normalizeNickname(nickname);
    if (cleaned.length < 2 || cleaned.length > 16) throw new Error("닉네임은 2~16자로 입력해 주세요.");
    const spectator = { playerId: createId(), sessionToken: createSessionToken(), socketId, nickname: cleaned };
    this.spectators.set(spectator.playerId, spectator);
    this.addLog(`${spectator.nickname}님이 관전을 시작했습니다.`);
    return spectator;
  }

  reconnectSpectator(playerId: string, sessionToken: string, socketId: string): SpectatorSession {
    const spectator = this.spectators.get(playerId);
    if (!spectator || spectator.sessionToken !== sessionToken) throw new Error("관전 재접속 정보가 올바르지 않습니다.");
    spectator.socketId = socketId;
    return spectator;
  }

  disconnectSpectator(playerId: string): void {
    const spectator = this.spectators.get(playerId);
    if (spectator) spectator.socketId = null;
  }

  getSpectator(playerId: string): SpectatorSession | undefined { return this.spectators.get(playerId); }

  reconnect(playerId: string, sessionToken: string, socketId: string): ServerPlayer {
    const player = this.players.get(playerId);
    if (!player || player.sessionToken !== sessionToken) throw new Error("재접속 정보가 올바르지 않습니다.");
    player.socketId = socketId;
    player.connected = true;
    player.reconnectDeadlineAt = null;
    this.addLog(`${player.nickname}님이 다시 연결되었습니다.`);
    return player;
  }

  disconnect(playerId: string): void {
    const player = this.requirePlayer(playerId);
    player.connected = false;
    player.socketId = null;
    player.reconnectDeadlineAt = new Date(Date.now() + this.rules.reconnectGraceSeconds * 1000).toISOString();
    this.addLog(`${player.nickname}님의 연결이 끊어졌습니다.`);
  }

  selectCharacter(playerId: string, characterId: string): void {
    this.assertLobby();
    if (!characters.some((character) => character.id === characterId)) throw new Error("존재하지 않는 캐릭터입니다.");
    if ([...this.players.values()].some((player) => player.playerId !== playerId && player.characterId === characterId)) throw new Error("다른 플레이어가 선택한 캐릭터입니다.");
    const player = this.requirePlayer(playerId);
    player.characterId = characterId;
    player.ready = false;
  }

  setReady(playerId: string, ready: boolean): void {
    this.assertLobby();
    const player = this.requirePlayer(playerId);
    if (!player.characterId) throw new Error("먼저 캐릭터를 선택해 주세요.");
    player.ready = ready;
  }

  startGame(requesterId: string): void {
    this.assertLobby();
    if (requesterId !== this.hostPlayerId) throw new Error("방장만 게임을 시작할 수 있습니다.");
    if (this.players.size < this.rules.minPlayers) throw new Error(`최소 ${this.rules.minPlayers}명이 필요합니다.`);
    const players = [...this.players.values()];
    if (players.some((player) => !player.connected)) throw new Error("연결이 끊긴 플레이어가 있습니다.");
    if (players.some((player) => !player.characterId)) throw new Error("모든 플레이어가 캐릭터를 선택해야 합니다.");
    if (players.some((player) => !player.ready)) throw new Error("모든 플레이어가 준비해야 합니다.");

    const suspect = shuffle(suspects)[0]!;
    const location = shuffle(locations)[0]!;
    const item = shuffle(items)[0]!;
    this.solution = { suspectId: suspect.id, locationId: location.id, itemId: item.id };
    const solutionIds = new Set(Object.values(this.solution));
    const deck = shuffle(allCards.filter((card) => !solutionIds.has(card.id)));
    players.forEach((player) => {
      player.cards = [];
      player.position = boardManager.getStartingNode(player.characterId!).id;
      player.revealedCards = [];
      player.notes.clear();
      player.reconnectDeadlineAt = null;
    });
    deck.forEach((card, index) => players[index % players.length]!.cards.push(card));

    this.status = "IN_GAME";
    this.gameOver = null;
    this.currentPlayerId = players[0]!.playerId;
    this.turnPhase = "ROLL";
    this.addLog("사건 봉투가 봉인되고 카드가 비공개로 배분되었습니다.");
    this.addLog(`${players[0]!.nickname}님의 차례로 조사가 시작됩니다.`);
  }

  rollDice(playerId: string): number {
    const player = this.assertCurrentTurn(playerId, "ROLL");
    const result = Array.from({ length: this.rules.diceCount }, rollDie).reduce((sum, value) => sum + value, 0);
    this.diceResult = result;
    this.reachableNodeIds = boardManager.getReachableNodeIds(player.position!, result, this.rules.secretPassages);
    this.turnPhase = this.reachableNodeIds.length > 0 ? "MOVE" : "END_TURN";
    this.addLog(`${player.nickname}님이 주사위 ${result}을(를) 굴렸습니다.`);
    return result;
  }

  movePlayer(playerId: string, destinationNodeId: string): void {
    const player = this.assertCurrentTurn(playerId, "MOVE");
    const allowed = boardManager.getReachableNodeIds(player.position!, this.diceResult!, this.rules.secretPassages);
    if (!allowed.includes(destinationNodeId) || !this.reachableNodeIds.includes(destinationNodeId)) throw new Error("주사위 결과로 이동할 수 없는 칸입니다.");
    const destination = boardManager.getNode(destinationNodeId);
    player.position = destination.id;
    this.reachableNodeIds = [];
    this.turnPhase = destination.type === "ROOM" ? "ROOM_ACTION" : "END_TURN";
    this.addLog(`${player.nickname}님이 ${destination.name ?? "복도"}(으)로 이동했습니다.`);
  }

  makeSuggestion(playerId: string, selection: SuggestionSelection): string | null {
    const player = this.assertCurrentTurn(playerId, "ROOM_ACTION");
    const currentNode = boardManager.getNode(player.position!);
    if (currentNode.type !== "ROOM" || !currentNode.locationId) throw new Error("장소 안에서만 추리할 수 있습니다.");
    const suspect = suspects.find((card) => card.id === selection.suspectId);
    const item = items.find((card) => card.id === selection.itemId);
    const location = locations.find((card) => card.id === currentNode.locationId);
    if (!suspect || !item || !location) throw new Error("추리 카드 선택이 올바르지 않습니다.");

    const suggestedIds = new Set([suspect.id, location.id, item.id]);
    const players = [...this.players.values()];
    const suggesterIndex = players.findIndex((candidate) => candidate.playerId === playerId);
    let responder: ServerPlayer | null = null;
    let eligibleCardIds: string[] = [];
    for (let offset = 1; offset < players.length; offset += 1) {
      const candidate = players[(suggesterIndex + offset) % players.length]!;
      const matching = candidate.cards.filter((card) => suggestedIds.has(card.id)).map((card) => card.id);
      if (matching.length > 0) { responder = candidate; eligibleCardIds = matching; break; }
    }

    const suggestionId = createId();
    this.addLog(`${player.nickname}님이 ${suspect.name} · ${location.name} · ${item.name}(으)로 추리했습니다.`);
    if (!responder) {
      this.activeSuggestion = { suggestionId, suggesterId: playerId, suspectId: suspect.id, locationId: location.id, itemId: item.id, responderId: null, status: "NO_MATCH", eligibleCardIds: [] };
      this.turnPhase = "END_TURN";
      this.addLog("아무도 해당 카드를 보여주지 못했습니다.");
      return null;
    }

    this.activeSuggestion = { suggestionId, suggesterId: playerId, suspectId: suspect.id, locationId: location.id, itemId: item.id, responderId: responder.playerId, status: "AWAITING_CARD", eligibleCardIds };
    this.turnPhase = "CARD_RESPONSE";
    this.addLog(`${responder.nickname}님이 보여줄 카드를 선택하고 있습니다.`);
    return responder.playerId;
  }

  revealCard(playerId: string, suggestionId: string, cardId: string): { suggesterId: string; revealed: RevealedCardInfo } {
    const suggestion = this.activeSuggestion;
    if (this.status !== "IN_GAME" || this.turnPhase !== "CARD_RESPONSE" || !suggestion || suggestion.status !== "AWAITING_CARD") throw new Error("응답할 추리가 없습니다.");
    if (suggestion.suggestionId !== suggestionId) throw new Error("추리 요청이 만료되었습니다.");
    if (suggestion.responderId !== playerId) throw new Error("카드를 보여줄 차례가 아닙니다.");
    const responder = this.requirePlayer(playerId);
    if (!suggestion.eligibleCardIds.includes(cardId)) throw new Error("이번 추리에 보여줄 수 없는 카드입니다.");
    const card = responder.cards.find((candidate) => candidate.id === cardId);
    if (!card) throw new Error("보유하지 않은 카드입니다.");
    const suggester = this.requirePlayer(suggestion.suggesterId);
    const revealed = { suggestionId, card, fromPlayerId: responder.playerId, fromNickname: responder.nickname, shownAt: new Date().toISOString() };
    suggester.revealedCards.push(revealed);
    suggestion.status = "RESOLVED";
    suggestion.eligibleCardIds = [];
    this.turnPhase = "END_TURN";
    this.addLog(`${responder.nickname}님이 ${suggester.nickname}님에게 카드 한 장을 보여주었습니다.`);
    return { suggesterId: suggester.playerId, revealed };
  }

  endTurn(playerId: string): void {
    const player = this.requirePlayer(playerId);
    if (player.playerId !== this.currentPlayerId) throw new Error("본인의 턴이 아닙니다.");
    if (this.turnPhase !== "END_TURN" && this.turnPhase !== "ROOM_ACTION") throw new Error("지금은 턴을 종료할 수 없습니다.");
    const players = [...this.players.values()];
    const currentIndex = players.findIndex((candidate) => candidate.playerId === playerId);
    let next = player;
    for (let offset = 1; offset <= players.length; offset += 1) {
      const candidate = players[(currentIndex + offset) % players.length]!;
      if (!candidate.eliminated) { next = candidate; break; }
    }
    this.currentPlayerId = next.playerId;
    this.turnPhase = "ROLL";
    this.diceResult = null;
    this.reachableNodeIds = [];
    this.activeSuggestion = null;
    this.addLog(`${next.nickname}님의 차례입니다.`);
  }

  makeAccusation(playerId: string, selection: AccusationSelection): { correct: boolean; gameOver: boolean } {
    if (this.status !== "IN_GAME") throw new Error("게임이 진행 중이 아닙니다.");
    const player = this.requirePlayer(playerId);
    if (player.eliminated) throw new Error("탈락한 플레이어는 최종 추리를 할 수 없습니다.");
    if (this.currentPlayerId !== playerId) throw new Error("본인의 턴이 아닙니다.");
    if (this.turnPhase === "CARD_RESPONSE") throw new Error("카드 공개가 끝난 뒤에 최종 추리를 할 수 있습니다.");
    if (!this.solution) throw new Error("사건 봉투를 찾을 수 없습니다.");
    const suspect = suspects.find((card) => card.id === selection.suspectId);
    const location = locations.find((card) => card.id === selection.locationId);
    const item = items.find((card) => card.id === selection.itemId);
    if (!suspect || !location || !item) throw new Error("최종 추리 카드 선택이 올바르지 않습니다.");

    const correct = selection.suspectId === this.solution.suspectId && selection.locationId === this.solution.locationId && selection.itemId === this.solution.itemId;
    this.addLog(`${player.nickname}님이 최종 추리를 선언했습니다.`);
    if (correct) {
      this.addLog(`${player.nickname}님의 최종 추리가 정답입니다. 사건이 해결되었습니다.`);
      this.finishGame(player.playerId);
      return { correct: true, gameOver: true };
    }

    player.eliminated = this.rules.accusationElimination;
    this.addLog(player.eliminated
      ? `${player.nickname}님의 최종 추리가 틀렸습니다. 조사 행동에서 탈락하지만 카드 공개는 계속합니다.`
      : `${player.nickname}님의 최종 추리가 틀렸습니다.`);
    if (!player.eliminated) {
      this.turnPhase = "END_TURN";
      return { correct: false, gameOver: false };
    }
    const next = this.findNextActivePlayer(playerId);
    if (!next) {
      this.addLog("더 이상 최종 추리를 할 수 있는 조사관이 없습니다.");
      this.finishGame(null);
      return { correct: false, gameOver: true };
    }
    this.currentPlayerId = next.playerId;
    this.turnPhase = "ROLL";
    this.diceResult = null;
    this.reachableNodeIds = [];
    this.activeSuggestion = null;
    this.addLog(`${next.nickname}님의 차례입니다.`);
    return { correct: false, gameOver: false };
  }

  skipDisconnectedPlayer(requesterId: string, targetPlayerId: string): void {
    if (this.status !== "IN_GAME") throw new Error("게임이 진행 중이 아닙니다.");
    const requester = this.requirePlayer(requesterId);
    const host = this.requirePlayer(this.hostPlayerId);
    if (requesterId !== this.hostPlayerId && host.connected) throw new Error("방장만 오프라인 플레이어를 건너뛸 수 있습니다.");
    if (!requester.connected) throw new Error("연결된 플레이어만 진행을 대행할 수 있습니다.");
    const target = this.requirePlayer(targetPlayerId);
    if (target.connected) throw new Error("연결된 플레이어는 건너뛸 수 없습니다.");

    if (this.activeSuggestion?.status === "AWAITING_CARD" && this.activeSuggestion.responderId === targetPlayerId) {
      this.skipSuggestionResponse(target);
      return;
    }
    if (this.currentPlayerId !== targetPlayerId) throw new Error("현재 턴 또는 카드 응답 중인 오프라인 플레이어만 건너뛸 수 있습니다.");
    const next = this.findNextActivePlayer(targetPlayerId);
    if (!next) throw new Error("넘길 다음 조사관이 없습니다.");
    this.currentPlayerId = next.playerId;
    this.turnPhase = "ROLL";
    this.diceResult = null;
    this.reachableNodeIds = [];
    this.activeSuggestion = null;
    this.addLog(`방장이 재접속 대기 중인 ${target.nickname}님의 턴을 건너뛰었습니다.`);
    this.addLog(`${next.nickname}님의 차례입니다.`);
  }

  updateNote(playerId: string, cardId: string, mark: NoteMark, memo: string): void {
    if (this.status !== "IN_GAME") throw new Error("게임이 시작된 뒤에만 추리 노트를 작성할 수 있습니다.");
    if (!allCards.some((card) => card.id === cardId)) throw new Error("존재하지 않는 카드입니다.");
    if (!(["UNKNOWN", "LOW", "CANDIDATE", "ELIMINATED"] as NoteMark[]).includes(mark)) throw new Error("추리 노트 상태가 올바르지 않습니다.");
    const cleanedMemo = memo.trim();
    if (cleanedMemo.length > 160) throw new Error("메모는 160자 이내로 입력해 주세요.");
    this.requirePlayer(playerId).notes.set(cardId, { mark, memo: cleanedMemo });
  }

  addChat(playerId: string, message: string): ChatMessage {
    const player = this.requirePlayer(playerId);
    const cleaned = message.trim();
    if (!cleaned || cleaned.length > 300) throw new Error("메시지는 1~300자로 입력해 주세요.");
    const chatMessage = { id: createId(), playerId, nickname: player.nickname, message: cleaned, createdAt: new Date().toISOString() };
    this.chat.push(chatMessage);
    if (this.chat.length > 100) this.chat.shift();
    return chatMessage;
  }

  addSpectatorChat(playerId: string, message: string): ChatMessage {
    const spectator = this.spectators.get(playerId);
    if (!spectator) throw new Error("유효한 관전 세션이 아닙니다.");
    const cleaned = message.trim();
    if (!cleaned || cleaned.length > 300) throw new Error("메시지는 1~300자로 입력해 주세요.");
    const chatMessage = { id: createId(), playerId, nickname: `${spectator.nickname} (관전)`, message: cleaned, createdAt: new Date().toISOString() };
    this.chat.push(chatMessage);
    if (this.chat.length > 100) this.chat.shift();
    return chatMessage;
  }

  getSession(playerId: string): SessionCredentials {
    const spectator=this.spectators.get(playerId); if(spectator) return { roomId:this.roomId, roomCode:this.roomCode, playerId, sessionToken:spectator.sessionToken, isSpectator:true };
    const player = this.requirePlayer(playerId);
    return { roomId: this.roomId, roomCode: this.roomCode, playerId, sessionToken: player.sessionToken };
  }

  getPublicState(): PublicRoomState {
    const publicPlayers: PublicPlayer[] = [...this.players.values()].map((player) => ({
      playerId: player.playerId,
      nickname: player.nickname,
      characterId: player.characterId,
      connected: player.connected,
      reconnectDeadlineAt: player.reconnectDeadlineAt,
      eliminated: player.eliminated,
      ready: player.ready,
      isHost: player.playerId === this.hostPlayerId,
      cardCount: player.cards.length,
      position: player.position
    }));
    const activeSuggestion = this.activeSuggestion ? { suggestionId: this.activeSuggestion.suggestionId, suggesterId: this.activeSuggestion.suggesterId, suspectId: this.activeSuggestion.suspectId, locationId: this.activeSuggestion.locationId, itemId: this.activeSuggestion.itemId, responderId: this.activeSuggestion.responderId, status: this.activeSuggestion.status } : null;
    return { roomId: this.roomId, roomCode: this.roomCode, roomName: this.roomName, status: this.status, hostPlayerId: this.hostPlayerId, players: publicPlayers, currentPlayerId: this.currentPlayerId, turnPhase: this.turnPhase, diceResult: this.diceResult, reachableNodeIds: [...this.reachableNodeIds], activeSuggestion, gameOver: this.gameOver ? { ...this.gameOver, solution: [...this.gameOver.solution], playerCards: this.gameOver.playerCards.map((entry) => ({ ...entry, cards: [...entry.cards] })) } : null, rules: this.rules, logs: this.logs.slice(-100), chat: this.chat.slice(-100) };
  }

  getPrivateState(playerId: string): PrivatePlayerState {
    const player = this.requirePlayer(playerId);
    const suggestion = this.activeSuggestion;
    const pendingReveal = suggestion?.status === "AWAITING_CARD" && suggestion.responderId === playerId ? {
      suggestionId: suggestion.suggestionId,
      suggesterNickname: this.requirePlayer(suggestion.suggesterId).nickname,
      cards: player.cards.filter((card) => suggestion.eligibleCardIds.includes(card.id))
    } : null;
    const handIds = new Set(player.cards.map((card) => card.id));
    const confirmedIds = new Set(player.revealedCards.map((revealed) => revealed.card.id));
    const notes: PlayerCardNote[] = allCards.map((card) => {
      const stored = player.notes.get(card.id);
      return {
        cardId: card.id,
        mark: stored?.mark ?? "UNKNOWN",
        memo: stored?.memo ?? "",
        automaticStatus: this.rules.autoNotes ? handIds.has(card.id) ? "OWNED" : confirmedIds.has(card.id) ? "CONFIRMED" : null : null
      };
    });
    return { playerId, hand: [...player.cards], pendingReveal, revealedCards: [...player.revealedCards], notes };
  }

  getPlayer(playerId: string): ServerPlayer | undefined { return this.players.get(playerId); }
  debugGetSolution(): Solution | null { return this.solution ? { ...this.solution } : null; }

  private requirePlayer(playerId: string): ServerPlayer {
    const player = this.players.get(playerId);
    if (!player) throw new Error("플레이어를 찾을 수 없습니다.");
    return player;
  }

  private assertLobby(): void { if (this.status !== "LOBBY") throw new Error("로비에서만 가능한 행동입니다."); }
  private findNextActivePlayer(afterPlayerId: string): ServerPlayer | null {
    const players = [...this.players.values()];
    const currentIndex = players.findIndex((candidate) => candidate.playerId === afterPlayerId);
    for (let offset = 1; offset < players.length; offset += 1) {
      const candidate = players[(currentIndex + offset) % players.length]!;
      if (!candidate.eliminated) return candidate;
    }
    return null;
  }
  private skipSuggestionResponse(target: ServerPlayer): void {
    const suggestion = this.activeSuggestion!;
    const players = [...this.players.values()];
    const responderIndex = players.findIndex((player) => player.playerId === target.playerId);
    const suggestedIds = new Set([suggestion.suspectId, suggestion.locationId, suggestion.itemId]);
    let nextResponder: ServerPlayer | null = null;
    let eligibleCardIds: string[] = [];
    for (let offset = 1; offset < players.length; offset += 1) {
      const candidate = players[(responderIndex + offset) % players.length]!;
      if (candidate.playerId === suggestion.suggesterId) break;
      const matches = candidate.cards.filter((card) => suggestedIds.has(card.id)).map((card) => card.id);
      if (matches.length > 0) { nextResponder = candidate; eligibleCardIds = matches; break; }
    }
    this.addLog(`방장이 재접속 대기 중인 ${target.nickname}님의 카드 응답을 건너뛰었습니다.`);
    if (!nextResponder) {
      suggestion.responderId = null;
      suggestion.eligibleCardIds = [];
      suggestion.status = "NO_MATCH";
      this.turnPhase = "END_TURN";
      this.addLog("응답 가능한 다른 조사관이 없습니다.");
      return;
    }
    suggestion.responderId = nextResponder.playerId;
    suggestion.eligibleCardIds = eligibleCardIds;
    this.addLog(`${nextResponder.nickname}님이 보여줄 카드를 선택하고 있습니다.`);
  }
  private finishGame(winnerPlayerId: string | null): void {
    if (!this.solution) throw new Error("사건 봉투를 찾을 수 없습니다.");
    const solutionCards = [this.solution.suspectId, this.solution.locationId, this.solution.itemId].map((cardId) => allCards.find((card) => card.id === cardId)!);
    this.status = "GAME_OVER";
    this.turnPhase = "GAME_OVER";
    this.currentPlayerId = null;
    this.diceResult = null;
    this.reachableNodeIds = [];
    this.activeSuggestion = null;
    this.gameOver = { winnerPlayerId, solution: solutionCards, playerCards: [...this.players.values()].map((player) => ({ playerId: player.playerId, nickname: player.nickname, cards: [...player.cards] })), endedAt: new Date().toISOString() };
  }
  private assertCurrentTurn(playerId: string, phase: TurnPhase): ServerPlayer {
    if (this.status !== "IN_GAME") throw new Error("게임이 진행 중이 아닙니다.");
    const player = this.requirePlayer(playerId);
    if (player.eliminated) throw new Error("탈락한 플레이어는 행동할 수 없습니다.");
    if (this.currentPlayerId !== playerId) throw new Error("본인의 턴이 아닙니다.");
    if (this.turnPhase !== phase) throw new Error("현재 단계에서 허용되지 않는 행동입니다.");
    return player;
  }
  private addLog(message: string): void {
    this.logs.push({ id: createId(), message, createdAt: new Date().toISOString() });
    if (this.logs.length > 100) this.logs.shift();
  }
}
