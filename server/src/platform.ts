import crypto from "node:crypto";
import { config } from "./config.js";
export function verifyPlatformJoinToken(token: string): { gameId:string; roomCode:string; nickname:string; mode:string; exp:number } {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature || !config.platformJoinSecret) throw new Error("플랫폼 입장 정보를 확인할 수 없습니다.");
  const expected = crypto.createHmac("sha256", config.platformJoinSecret).update(body).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("플랫폼 입장 정보가 올바르지 않습니다.");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (payload.gameId !== "mystery-manor" || !payload.roomCode || !payload.nickname || Number(payload.exp) <= Date.now()) throw new Error("플랫폼 입장 정보가 만료되었습니다.");
  return payload;
}
