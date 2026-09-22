export const CLIENT_EVENTS = {
  CREATE_ROOM: "room:create",
  JOIN_ROOM: "room:join",
  RECONNECT_ROOM: "room:reconnect",
  SELECT_CHARACTER: "lobby:select-character",
  PLAYER_READY: "lobby:set-ready",
  START_GAME: "game:start",
  ROLL_DICE: "game:roll-dice",
  MOVE_PLAYER: "game:move-player",
  END_TURN: "game:end-turn",
  MAKE_SUGGESTION: "game:make-suggestion",
  REVEAL_CARD: "game:reveal-card",
  MAKE_ACCUSATION: "game:make-accusation",
  SKIP_DISCONNECTED: "game:skip-disconnected",
  UPDATE_NOTE: "notes:update",
  CHAT_MESSAGE: "chat:send"
} as const;

export const SERVER_EVENTS = {
  ROOM_STATE: "room:state",
  PRIVATE_STATE: "player:private",
  CARD_REVEALED: "player:card-revealed",
  GAME_OVER: "game:over",
  CHAT_MESSAGE: "chat:message",
  ERROR: "server:error"
} as const;
