import type { GameRules } from "../types.js";

export const defaultRules: GameRules = {
  minPlayers: 3,
  maxPlayers: 6,
  diceCount: 1,
  secretPassages: true,
  accusationElimination: true,
  autoNotes: true,
  turnTimeLimitSeconds: 0,
  reconnectGraceSeconds: 300
};
