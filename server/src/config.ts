import "dotenv/config";

const port = Number(process.env.PORT ?? 3001);
const nodeEnv = process.env.NODE_ENV ?? "development";
const publicUrl = process.env.RENDER_EXTERNAL_URL || process.env.CLIENT_URL || `http://localhost:${port}`;

export const config = {
  port,
  // Render provides this automatically. CLIENT_URL takes precedence for a custom domain.
  clientUrl: process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || (nodeEnv === "production" ? `http://localhost:${port}` : "http://localhost:5173"),
  nodeEnv,
  publicUrl,
  serveClient: process.env.SERVE_CLIENT !== "false"
};
