import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
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
  io.on("connection", (socket) => registerSocketHandlers(io, socket, games));
  // Resolve from this module, not process.cwd(): npm workspaces start the server from /server.
  const clientDist = fileURLToPath(new URL("../../client/dist", import.meta.url));
  if (config.serveClient && existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // React routes such as /room/AB12CD must return the Vite entry document.
    app.use((request, response, next) => {
      if (request.method === "GET" && request.accepts("html")) response.sendFile(resolve(clientDist, "index.html"));
      else next();
    });
  }
  return { app, httpServer, io, games };
}
