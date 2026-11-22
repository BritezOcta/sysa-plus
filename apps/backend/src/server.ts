import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const server = createApp().listen(env.PORT, () => {
  console.log(`SysA+ API running at http://localhost:${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
