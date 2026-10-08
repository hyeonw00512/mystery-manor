import { createApp } from "./app.js";
import { config } from "./config.js";

const { httpServer } = createApp();
httpServer.listen(config.port, "0.0.0.0", () => {
  console.log(`Manor Mystery (Clue) server listening on http://localhost:${config.port}`);
});
