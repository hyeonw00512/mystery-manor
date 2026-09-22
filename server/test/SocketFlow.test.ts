import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { board, characters, CLIENT_EVENTS, items, SERVER_EVENTS, suspects, type Ack, type PrivatePlayerState, type PublicRoomState, type RevealedCardInfo, type SessionCredentials } from "@mystery/shared";
import { io as createClient, type Socket as ClientSocket } from "socket.io-client";
import { createApp } from "../src/app.js";

const emitAck = <T>(socket: ClientSocket, event: string, payload?: unknown) => new Promise<Ack<T>>((resolve) => socket.emit(event, payload, resolve));
const waitFor = <T>(socket: ClientSocket, event: string) => new Promise<T>((resolve) => socket.once(event, resolve));
const waitForState = (socket: ClientSocket, predicate: (state: PublicRoomState) => boolean) => new Promise<PublicRoomState>((resolve) => {
  const listener = (state: PublicRoomState) => { if (predicate(state)) { socket.off(SERVER_EVENTS.ROOM_STATE, listener); resolve(state); } };
  socket.on(SERVER_EVENTS.ROOM_STATE, listener);
});

test("Socket을 통해 개인 손패와 추리 카드가 허용된 플레이어에게만 전달된다", async (context) => {
  const { httpServer, io, games } = createApp();
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const port = (httpServer.address() as AddressInfo).port;
  const clients = Array.from({ length: 3 }, () => createClient(`http://127.0.0.1:${port}`, { transports: ["websocket"] }));
  context.after(async () => {
    clients.forEach((client) => client.disconnect());
    await io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });
  await Promise.all(clients.map((client) => client.connected ? Promise.resolve() : waitFor(client, "connect")));

  const created = await emitAck<SessionCredentials>(clients[0]!, CLIENT_EVENTS.CREATE_ROOM, { nickname: "방장" });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const joined = await Promise.all([
    emitAck<SessionCredentials>(clients[1]!, CLIENT_EVENTS.JOIN_ROOM, { nickname: "두번째", roomCode: created.data.roomCode }),
    emitAck<SessionCredentials>(clients[2]!, CLIENT_EVENTS.JOIN_ROOM, { nickname: "세번째", roomCode: created.data.roomCode })
  ]);
  assert.ok(joined.every((result) => result.ok));
  const sessions = [created.data, ...joined.map((result) => result.ok ? result.data : null)].filter((item): item is SessionCredentials => item !== null);

  for (let index = 0; index < clients.length; index += 1) {
    assert.equal((await emitAck(clients[index]!, CLIENT_EVENTS.SELECT_CHARACTER, characters[index]!.id)).ok, true);
    assert.equal((await emitAck(clients[index]!, CLIENT_EVENTS.PLAYER_READY, true)).ok, true);
  }

  const privateStatePromises = clients.map((client) => waitFor<PrivatePlayerState>(client, SERVER_EVENTS.PRIVATE_STATE));
  const publicStatePromise = waitFor<PublicRoomState>(clients[0]!, SERVER_EVENTS.ROOM_STATE);
  assert.equal((await emitAck(clients[0]!, CLIENT_EVENTS.START_GAME)).ok, true);
  const [publicState, privateStates] = await Promise.all([publicStatePromise, Promise.all(privateStatePromises)]);
  assert.equal(publicState.status, "IN_GAME");
  assert.ok(Array.isArray(publicState.chat));
  assert.equal("solution" in publicState, false);
  assert.ok(publicState.players.every((player) => !("cards" in player)));
  assert.deepEqual(new Set(privateStates.map((state) => state.playerId)), new Set(sessions.map((session) => session.playerId)));
  assert.equal(privateStates.reduce((sum, state) => sum + state.hand.length, 0), 18);

  const malformedSuggestion = await emitAck(clients[0]!, CLIENT_EVENTS.MAKE_SUGGESTION, null);
  assert.equal(malformedSuggestion.ok, false);
  if (!malformedSuggestion.ok) assert.match(malformedSuggestion.error, /요청 형식/);

  const otherPrivateUpdates = [0, 0];
  const countPrivateUpdate = () => { otherPrivateUpdates[0] = (otherPrivateUpdates[0] ?? 0) + 1; };
  const countThirdPrivateUpdate = () => { otherPrivateUpdates[1] = (otherPrivateUpdates[1] ?? 0) + 1; };
  clients[1]!.on(SERVER_EVENTS.PRIVATE_STATE, countPrivateUpdate);
  clients[2]!.on(SERVER_EVENTS.PRIVATE_STATE, countThirdPrivateUpdate);
  const ownNoteUpdate = waitFor<PrivatePlayerState>(clients[0]!, SERVER_EVENTS.PRIVATE_STATE);
  const noteCard = privateStates[0]!.hand[0]!;
  assert.equal((await emitAck(clients[0]!, CLIENT_EVENTS.UPDATE_NOTE, { cardId: noteCard.id, mark: "CANDIDATE", memo: "개인 가설" })).ok, true);
  const updatedNotes = await ownNoteUpdate;
  assert.equal(updatedNotes.notes.find((note) => note.cardId === noteCard.id)?.memo, "개인 가설");
  assert.deepEqual(otherPrivateUpdates, [0, 0]);
  clients[1]!.off(SERVER_EVENTS.PRIVATE_STATE, countPrivateUpdate);
  clients[2]!.off(SERVER_EVENTS.PRIVATE_STATE, countThirdPrivateUpdate);

  const unauthorizedRoll = await emitAck<number>(clients[1]!, CLIENT_EVENTS.ROLL_DICE);
  assert.equal(unauthorizedRoll.ok, false);
  const rolledStatePromise = waitFor<PublicRoomState>(clients[1]!, SERVER_EVENTS.ROOM_STATE);
  assert.equal((await emitAck<number>(clients[0]!, CLIENT_EVENTS.ROLL_DICE)).ok, true);
  const rolledState = await rolledStatePromise;
  assert.equal(rolledState.turnPhase, "MOVE");
  assert.ok(rolledState.reachableNodeIds.length > 0);

  const destination = rolledState.reachableNodeIds[0]!;
  const movedStatePromise = waitForState(clients[2]!, (state) => state.players.some((player) => player.playerId === created.data.playerId && player.position === destination));
  assert.equal((await emitAck(clients[0]!, CLIENT_EVENTS.MOVE_PLAYER, destination)).ok, true);
  const movedState = await movedStatePromise;
  assert.equal(movedState.players.find((player) => player.playerId === created.data.playerId)?.position, destination);
  assert.equal(movedState.reachableNodeIds.length, 0);

  const room = games.getById(created.data.roomId)!;
  const host = room.getPlayer(sessions[0]!.playerId)!;
  const responder = room.getPlayer(sessions[1]!.playerId)!;
  const targetCard = responder.cards[0]!;
  const selectedSuspect = targetCard.type === "SUSPECT" ? targetCard : suspects[0]!;
  const selectedItem = targetCard.type === "ITEM" ? targetCard : items[0]!;
  const locationId = targetCard.type === "LOCATION" ? targetCard.id : board.nodes.find((node) => node.type === "ROOM")!.locationId!;
  const roomNode = board.nodes.find((node) => node.locationId === locationId)!;
  host.position = roomNode.id;
  room.turnPhase = "ROOM_ACTION";

  const suggestionStatePromise = waitForState(clients[2]!, (state) => state.turnPhase === "CARD_RESPONSE");
  const suggestionPrivatePromises = clients.map((client) => waitFor<PrivatePlayerState>(client, SERVER_EVENTS.PRIVATE_STATE));
  assert.equal((await emitAck<string | null>(clients[0]!, CLIENT_EVENTS.MAKE_SUGGESTION, { suspectId: selectedSuspect.id, itemId: selectedItem.id })).ok, true);
  const [suggestionState, suggestionPrivateStates] = await Promise.all([suggestionStatePromise, Promise.all(suggestionPrivatePromises)]);
  assert.equal(suggestionState.activeSuggestion?.responderId, responder.playerId);
  assert.equal("eligibleCardIds" in suggestionState.activeSuggestion!, false);
  assert.equal(suggestionPrivateStates[0]!.pendingReveal, null);
  assert.equal(suggestionPrivateStates[2]!.pendingReveal, null);
  assert.ok(suggestionPrivateStates[1]!.pendingReveal?.cards.some((card) => card.id === targetCard.id));

  const received: RevealedCardInfo[][] = [[], [], []];
  clients.forEach((client, index) => client.on(SERVER_EVENTS.CARD_REVEALED, (value: RevealedCardInfo) => received[index]!.push(value)));
  const privateRevealPromise = waitFor<RevealedCardInfo>(clients[0]!, SERVER_EVENTS.CARD_REVEALED);
  const pending = suggestionPrivateStates[1]!.pendingReveal!;
  assert.equal((await emitAck(clients[1]!, CLIENT_EVENTS.REVEAL_CARD, { suggestionId: pending.suggestionId, cardId: targetCard.id })).ok, true);
  const privatelyRevealed = await privateRevealPromise;
  assert.equal(privatelyRevealed.card.id, targetCard.id);
  assert.deepEqual(received.map((events) => events.length), [1, 0, 0]);
  assert.equal("card" in room.getPublicState().activeSuggestion!, false);
});
