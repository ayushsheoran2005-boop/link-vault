import { createApp } from "./app.js";
import { createRedirectCache } from "./cache.js";
import { getConfig } from "./config.js";

const config = getConfig();
const { app, prisma } = createApp({ cache: createRedirectCache(config.REDIS_URL || undefined) });
const server = app.listen(config.PORT, () => console.info(`LinkVault API listening on port ${config.PORT}`));

async function shutdown(signal: string) {
  console.info(`Received ${signal}; shutting down.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
