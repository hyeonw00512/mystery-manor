import { GameRoom } from "./GameRoom.js";
import { createRoomCode, normalizeRoomCode } from "../utils.js";

export class GameManager {
  private readonly roomsByCode = new Map<string, GameRoom>();
  private readonly roomsById = new Map<string, GameRoom>();

  createRoom(nickname: string, socketId: string): GameRoom {
    let roomCode = createRoomCode();
    while (this.roomsByCode.has(roomCode)) roomCode = createRoomCode();
    const room = new GameRoom(roomCode, nickname, socketId);
    this.roomsByCode.set(roomCode, room);
    this.roomsById.set(room.roomId, room);
    return room;
  }

  getByCode(roomCode: string): GameRoom | undefined { return this.roomsByCode.get(normalizeRoomCode(roomCode)); }
  getById(roomId: string): GameRoom | undefined { return this.roomsById.get(roomId); }
  listRooms(): GameRoom[] { return [...this.roomsByCode.values()]; }
}
