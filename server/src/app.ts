import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { basename, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { config } from "./config.js";
import { GameManager } from "./game/GameManager.js";
import { registerSocketHandlers } from "./socket/registerHandlers.js";

export function createApp() {
  const app = express();
  const httpServer = createServer(app);
  const allowedOrigins = config.clientUrl.split(",").map((origin) => origin.trim());
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json());
  app.get("/api/health", (_request, response) => response.json({ ok: true, service: "mystery-manor", timestamp: new Date().toISOString() }));
  const io = new Server(httpServer, { cors: { origin: allowedOrigins, credentials: true } });
  const games = new GameManager();
  app.get("/api/platform/rooms", (_request, response) => response.json({
    version: 1,
    gameId: "mystery-manor",
    updatedAt: new Date().toISOString(),
    capabilities: { canSpectate: true, canReserveNextRound: false },
    rooms: games.listRooms().map((room) => ({
      roomCode: room.roomCode,
      hostNickname: room.players.get(room.hostPlayerId)?.nickname ?? "알 수 없음",
      playerCount: room.players.size,
      maxPlayers: room.rules.maxPlayers,
      spectatorCount: room.connectedSpectatorCount,
      status: room.status === "LOBBY" ? "WAITING" : room.status === "GAME_OVER" ? "FINISHED" : "PLAYING",
      visibility: "PUBLIC",
      requiresPassword: false,
      canJoin: room.status === "LOBBY" && room.players.size < room.rules.maxPlayers,
      canSpectate: true,
      canReserveNextRound: false,
      joinUrl: `${config.publicUrl}/?room=${encodeURIComponent(room.roomCode)}`
    }))
  }));
  io.on("connection", (socket) => registerSocketHandlers(io, socket, games));
  // Resolve from this module, not process.cwd(): npm workspaces start the server from /server.
  const clientDist = fileURLToPath(new URL("../../client/dist", import.meta.url));
  if (config.serveClient && existsSync(clientDist)) {
    app.use(express.static(clientDist, {
      setHeaders(response, filePath) {
        if (filePath.includes(`${sep}assets${sep}`)) {
          response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (basename(filePath) === "index.html") {
          response.setHeader("Cache-Control", "no-cache");
        }
      }
    }));
    // React routes such as /room/AB12CD must return the Vite entry document.
    app.use((request, response, next) => {
      if (request.method === "GET" && request.accepts("html")) response.sendFile(resolve(clientDist, "index.html"), {
        headers: { "Cache-Control": "no-cache" }
      });
      else next();
    });
  }
  return { app, httpServer, io, games };
}
