import assert from "node:assert/strict";
import test from "node:test";
import { allCards, board, characters, defaultRules, items, suspects } from "@mystery/shared";
import { GameRoom } from "../src/game/GameRoom.js";

function readyThreePlayers() {
  const room = new GameRoom("ABC234", "방장", "socket-1");
  const host = [...room.players.values()][0]!;
  const second = room.join("두번째", "socket-2");
  const third = room.join("세번째", "socket-3");
  [host, second, third].forEach((player, index) => {
    room.selectCharacter(player.playerId, characters[index]!.id);
    room.setReady(player.playerId, true);
  });
  return { room, host, second, third };
}

test("게임 시작 시 정답 3장을 제외한 카드가 균등하게 비공개 분배된다", () => {
  const { room, host } = readyThreePlayers();
  room.startGame(host.playerId);
  const publicState = room.getPublicState();
  assert.equal(publicState.status, "IN_GAME");
  assert.equal(publicState.turnPhase, "ROLL");
  assert.ok(publicState.players.every((player) => player.position?.startsWith("corridor_")));
  assert.equal(publicState.players.reduce((sum, player) => sum + player.cardCount, 0), allCards.length - 3);
  assert.ok(Math.max(...publicState.players.map((player) => player.cardCount)) - Math.min(...publicState.players.map((player) => player.cardCount)) <= 1);
  assert.equal("solution" in publicState, false);
  assert.equal("cards" in publicState.players[0]!, false);
  assert.equal(room.getPrivateState(host.playerId).hand.length, publicState.players[0]!.cardCount);
});

test("추리 노트는 자동 카드 상태와 수동 메모를 개인 상태에만 저장한다", () => {
  const { room, host, second } = readyThreePlayers();
  room.startGame(host.playerId);
  const ownCard = host.cards[0]!;
  const otherCard = allCards.find((card) => !host.cards.some((owned) => owned.id === card.id))!;
  room.updateNote(host.playerId, ownCard.id, "CANDIDATE", "이미 내 손패로 확인함");
  room.updateNote(host.playerId, otherCard.id, "ELIMINATED", "다른 단서와 맞지 않음");
  const notes = room.getPrivateState(host.playerId).notes;
  assert.deepEqual(notes.find((note) => note.cardId === ownCard.id), { cardId: ownCard.id, mark: "CANDIDATE", memo: "이미 내 손패로 확인함", automaticStatus: "OWNED" });
  assert.deepEqual(notes.find((note) => note.cardId === otherCard.id), { cardId: otherCard.id, mark: "ELIMINATED", memo: "다른 단서와 맞지 않음", automaticStatus: null });
  assert.equal(room.getPrivateState(second.playerId).notes.find((note) => note.cardId === otherCard.id)?.memo, "");
  assert.equal("notes" in room.getPublicState(), false);
  assert.throws(() => room.updateNote(host.playerId, "not-a-card", "UNKNOWN", ""), /존재하지 않는 카드/);
});

test("자동 메모 규칙을 끄면 개인 카드와 확인 카드도 자동 상태로 표시하지 않는다", () => {
  const room = new GameRoom("ABC234", "방장", "socket-1", { ...defaultRules, autoNotes: false });
  const host = [...room.players.values()][0]!;
  const second = room.join("두번째", "socket-2");
  const third = room.join("세번째", "socket-3");
  [host, second, third].forEach((player, index) => { room.selectCharacter(player.playerId, characters[index]!.id); room.setReady(player.playerId, true); });
  room.startGame(host.playerId);
  assert.equal(room.getPrivateState(host.playerId).notes.find((note) => note.cardId === host.cards[0]!.id)?.automaticStatus, null);
});

test("방장이 아니거나 준비가 완료되지 않으면 게임을 시작할 수 없다", () => {
  const { room, host, second } = readyThreePlayers();
  assert.throws(() => room.startGame(second.playerId), /방장/);
  room.setReady(host.playerId, false);
  assert.throws(() => room.startGame(host.playerId), /준비/);
});

test("같은 캐릭터와 같은 닉네임을 중복 선택할 수 없다", () => {
  const room = new GameRoom("ABC234", "방장", "socket-1");
  const host = [...room.players.values()][0]!;
  const second = room.join("두번째", "socket-2");
  room.selectCharacter(host.playerId, characters[0]!.id);
  assert.throws(() => room.selectCharacter(second.playerId, characters[0]!.id), /선택/);
  assert.throws(() => room.join("두번째", "socket-3"), /닉네임/);
});

test("올바른 세션 토큰으로 새 소켓에 재접속한다", () => {
  const room = new GameRoom("ABC234", "방장", "socket-1");
  const host = [...room.players.values()][0]!;
  const session = room.getSession(host.playerId);
  room.disconnect(host.playerId);
  const restored = room.reconnect(session.playerId, session.sessionToken, "socket-new");
  assert.equal(restored.connected, true);
  assert.equal(restored.socketId, "socket-new");
  assert.throws(() => room.reconnect(session.playerId, "wrong", "socket-x"), /재접속/);
});

test("연결이 끊긴 플레이어는 재접속 유예 시각을 받고 재접속하면 해제된다", () => {
  const { room, host } = readyThreePlayers();
  const session = room.getSession(host.playerId);
  room.disconnect(host.playerId);
  assert.equal(room.getPublicState().players.find((player) => player.playerId === host.playerId)?.connected, false);
  assert.ok(room.getPublicState().players.find((player) => player.playerId === host.playerId)?.reconnectDeadlineAt);
  room.reconnect(session.playerId, session.sessionToken, "socket-new");
  assert.equal(room.getPublicState().players.find((player) => player.playerId === host.playerId)?.reconnectDeadlineAt, null);
});

test("재접속 후 공개 상태에 최근 채팅 기록이 복구된다", () => {
  const { room, host } = readyThreePlayers();
  room.addChat(host.playerId, "기록을 남깁니다.");
  assert.equal(room.getPublicState().chat.at(-1)?.message, "기록을 남깁니다.");
});

test("현재 플레이어만 주사위를 굴리고 서버가 허용한 칸으로 이동한다", () => {
  const { room, host, second } = readyThreePlayers();
  room.startGame(host.playerId);
  assert.throws(() => room.rollDice(second.playerId), /본인의 턴/);
  const dice = room.rollDice(host.playerId);
  assert.ok(dice >= 1 && dice <= 6);
  assert.equal(room.turnPhase, "MOVE");
  assert.ok(room.reachableNodeIds.length > 0);
  assert.throws(() => room.movePlayer(host.playerId, "room_dining"), /이동할 수 없는/);
  const destination = room.reachableNodeIds[0]!;
  room.movePlayer(host.playerId, destination);
  assert.equal(room.getPlayer(host.playerId)?.position, destination);
  assert.match(room.turnPhase as string, /^(END_TURN|ROOM_ACTION)$/);
  room.endTurn(host.playerId);
  assert.equal(room.currentPlayerId, second.playerId);
  assert.equal(room.turnPhase, "ROLL");
  assert.equal(room.diceResult, null);
});

test("방장은 재접속 대기 중인 현재 플레이어의 턴을 건너뛸 수 있다", () => {
  const { room, host, second, third } = readyThreePlayers();
  room.startGame(host.playerId);
  room.currentPlayerId = second.playerId;
  room.turnPhase = "ROLL";
  room.disconnect(second.playerId);
  assert.throws(() => room.skipDisconnectedPlayer(third.playerId, second.playerId), /방장/);
  room.skipDisconnectedPlayer(host.playerId, second.playerId);
  assert.equal(room.currentPlayerId, third.playerId);
  assert.equal(room.turnPhase, "ROLL");
  assert.match(room.logs.at(-2)!.message, /건너뛰었/);
});

test("방장이 재접속 대기 중이면 연결된 다른 플레이어가 진행을 대행할 수 있다", () => {
  const { room, host, second, third } = readyThreePlayers();
  room.startGame(host.playerId);
  room.currentPlayerId = second.playerId;
  room.turnPhase = "ROLL";
  room.disconnect(host.playerId);
  room.disconnect(second.playerId);
  room.skipDisconnectedPlayer(third.playerId, second.playerId);
  assert.equal(room.currentPlayerId, third.playerId);
});

test("다음 순서의 카드 보유자만 한 장을 선택하고 추리자에게 비공개 공개한다", () => {
  const { room, host, second, third } = readyThreePlayers();
  room.startGame(host.playerId);
  const target = second.cards[0]!;
  const roomNode = target.type === "LOCATION"
    ? board.nodes.find((node) => node.locationId === target.id)!
    : board.nodes.find((node) => node.id === "room_archive")!;
  host.position = roomNode.id;
  room.turnPhase = "ROOM_ACTION";
  const suspectId = target.type === "SUSPECT" ? target.id : suspects[0]!.id;
  const itemId = target.type === "ITEM" ? target.id : items[0]!.id;
  assert.equal(room.makeSuggestion(host.playerId, { suspectId, itemId }), second.playerId);
  assert.equal(room.turnPhase, "CARD_RESPONSE");
  const pending = room.getPrivateState(second.playerId).pendingReveal;
  assert.ok(pending && pending.cards.length >= 1);
  assert.equal(room.getPrivateState(third.playerId).pendingReveal, null);
  assert.equal("eligibleCardIds" in room.getPublicState().activeSuggestion!, false);
  assert.throws(() => room.revealCard(third.playerId, pending!.suggestionId, pending!.cards[0]!.id), /차례/);
  const result = room.revealCard(second.playerId, pending!.suggestionId, pending!.cards[0]!.id);
  assert.equal(result.suggesterId, host.playerId);
  assert.equal(room.turnPhase, "END_TURN");
  assert.equal(room.getPrivateState(host.playerId).revealedCards.at(-1)?.card.id, pending!.cards[0]!.id);
  assert.equal(room.getPrivateState(host.playerId).notes.find((note) => note.cardId === pending!.cards[0]!.id)?.automaticStatus, "CONFIRMED");
  assert.equal(room.getPrivateState(third.playerId).revealedCards.length, 0);
  assert.equal("card" in room.getPublicState().activeSuggestion!, false);
});

test("방장은 재접속 대기 중인 카드 응답자를 넘기고 다음 응답자를 찾는다", () => {
  const { room, host, second, third } = readyThreePlayers();
  room.startGame(host.playerId);
  const target = suspects[0]!;
  second.cards = [target]; third.cards = [target];
  host.position = board.nodes.find((node) => node.id === "room_archive")!.id;
  room.turnPhase = "ROOM_ACTION";
  assert.equal(room.makeSuggestion(host.playerId, { suspectId: target.id, itemId: items[0]!.id }), second.playerId);
  room.disconnect(second.playerId);
  room.skipDisconnectedPlayer(host.playerId, second.playerId);
  assert.equal(room.getPublicState().activeSuggestion?.responderId, third.playerId);
  assert.equal(room.turnPhase, "CARD_RESPONSE");
  assert.ok(room.getPrivateState(third.playerId).pendingReveal?.cards.some((card) => card.id === target.id));
});

test("정답 조합을 추리하면 아무도 카드를 보여주지 못한다", () => {
  const { room, host } = readyThreePlayers();
  room.startGame(host.playerId);
  const solution = room.debugGetSolution()!;
  host.position = board.nodes.find((node) => node.locationId === solution.locationId)!.id;
  room.turnPhase = "ROOM_ACTION";
  assert.equal(room.makeSuggestion(host.playerId, { suspectId: solution.suspectId, itemId: solution.itemId }), null);
  assert.equal(room.turnPhase, "END_TURN");
  assert.equal(room.getPublicState().activeSuggestion?.status, "NO_MATCH");
  assert.match(room.logs.at(-1)!.message, /아무도/);
});

test("정답 최종 추리는 게임을 끝내고 그때만 정답과 모든 손패를 공개한다", () => {
  const { room, host } = readyThreePlayers();
  room.startGame(host.playerId);
  const solution = room.debugGetSolution()!;
  assert.equal(room.getPublicState().gameOver, null);
  const result = room.makeAccusation(host.playerId, solution);
  assert.deepEqual(result, { correct: true, gameOver: true });
  const publicState = room.getPublicState();
  assert.equal(publicState.status, "GAME_OVER");
  assert.equal(publicState.turnPhase, "GAME_OVER");
  assert.equal(publicState.currentPlayerId, null);
  assert.equal(publicState.gameOver?.winnerPlayerId, host.playerId);
  assert.deepEqual(new Set(publicState.gameOver?.solution.map((card) => card.id)), new Set(Object.values(solution)));
  assert.equal(publicState.gameOver?.playerCards.length, 3);
  assert.equal(publicState.gameOver?.playerCards.reduce((total, entry) => total + entry.cards.length, 0), allCards.length - 3);
});

test("틀린 최종 추리자는 행동에서 탈락하지만 카드 공개 대상에는 남는다", () => {
  const { room, host, second, third } = readyThreePlayers();
  room.startGame(host.playerId);
  const solution = room.debugGetSolution()!;
  const wrongSuspect = suspects.find((card) => card.id !== solution.suspectId)!;
  const result = room.makeAccusation(host.playerId, { suspectId: wrongSuspect.id, locationId: solution.locationId, itemId: solution.itemId });
  assert.deepEqual(result, { correct: false, gameOver: false });
  assert.equal(room.status, "IN_GAME");
  assert.equal(room.getPlayer(host.playerId)?.eliminated, true);
  assert.equal(room.currentPlayerId, second.playerId);
  assert.equal(room.turnPhase, "ROLL");
  host.cards = [suspects[0]!]; second.cards = []; third.cards = [];
  second.position = board.nodes.find((node) => node.id === "room_archive")!.id;
  room.turnPhase = "ROOM_ACTION";
  assert.equal(room.makeSuggestion(second.playerId, { suspectId: suspects[0]!.id, itemId: items[0]!.id }), host.playerId);
});

test("모든 조사관이 틀린 최종 추리를 하면 승자 없이 게임이 종료된다", () => {
  const { room, host, second, third } = readyThreePlayers();
  room.startGame(host.playerId);
  const solution = room.debugGetSolution()!;
  const wrongSuspect = suspects.find((card) => card.id !== solution.suspectId)!;
  const wrong = { suspectId: wrongSuspect.id, locationId: solution.locationId, itemId: solution.itemId };
  room.makeAccusation(host.playerId, wrong);
  room.makeAccusation(second.playerId, wrong);
  const final = room.makeAccusation(third.playerId, wrong);
  assert.deepEqual(final, { correct: false, gameOver: true });
  assert.equal(room.getPublicState().gameOver?.winnerPlayerId, null);
});

test("관전자는 별도 세션으로 재접속하고 개인 게임 정보는 받을 수 없다", () => {
  const { room } = readyThreePlayers();
  const spectator = room.spectate("관전자", "spectator-socket");
  const session = room.getSession(spectator.playerId);
  assert.equal(session.isSpectator, true);
  assert.equal(room.spectators.size, 1);
  room.disconnectSpectator(spectator.playerId);
  assert.equal(room.getSpectator(spectator.playerId)?.socketId, null);
  room.reconnectSpectator(spectator.playerId, spectator.sessionToken, "new-spectator-socket");
  assert.equal(room.getSpectator(spectator.playerId)?.socketId, "new-spectator-socket");
  assert.throws(() => room.getPrivateState(spectator.playerId), /플레이어/);
});
