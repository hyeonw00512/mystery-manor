import { io } from "socket.io-client";

const endpoint = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? "http://localhost:3001" : window.location.origin);

export const socket = io(endpoint, {
  autoConnect: false,
  transports: ["websocket", "polling"]
});
