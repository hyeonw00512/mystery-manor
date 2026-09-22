import { randomBytes, randomInt, randomUUID } from "node:crypto";

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const createId = (): string => randomUUID();
export const createSessionToken = (): string => randomBytes(32).toString("hex");
export const createRoomCode = (): string => Array.from({ length: 6 }, () => ROOM_ALPHABET[randomInt(ROOM_ALPHABET.length)]).join("");
export const rollDie = (): number => randomInt(1, 7);

export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

export const normalizeNickname = (value: string): string => value.trim().replace(/\s+/g, " ");
export const normalizeRoomCode = (value: string): string => value.trim().toUpperCase();
