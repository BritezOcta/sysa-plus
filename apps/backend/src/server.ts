import cluster from "node:cluster";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

// Con WEB_CONCURRENCY > 1 el proceso principal reparte las conexiones entre varios workers,
// así Node usa más de un núcleo. Medido con loadtest/ (Fase 2): con un solo proceso, el pico
// de inscripción saturaba un núcleo. El estado compartido (límite de login por IP) vive en la base.
if (env.WEB_CONCURRENCY > 1 && cluster.isPrimary) {
  let shuttingDown = false;
  console.log(`SysA+ API: iniciando ${env.WEB_CONCURRENCY} workers...`);
  for (let i = 0; i < env.WEB_CONCURRENCY; i++) cluster.fork();

  cluster.on("exit", (worker, code, signal) => {
    if (shuttingDown) return;
    console.error(`Worker ${worker.process.pid} terminó (${signal ?? code}); se reinicia.`);
    cluster.fork();
  });

  const shutdownPrimary = (signal: string) => {
    shuttingDown = true;
    console.log(`${signal} received, shutting down workers...`);
    for (const worker of Object.values(cluster.workers ?? {})) worker?.process.kill(signal as NodeJS.Signals);
  };
  process.on("SIGINT", () => shutdownPrimary("SIGINT"));
  process.on("SIGTERM", () => shutdownPrimary("SIGTERM"));
} else {
  const server = createApp().listen(env.PORT, () => {
    const who = cluster.isWorker ? ` (worker ${process.pid})` : "";
    console.log(`SysA+ API running at http://localhost:${env.PORT}${who}`);
  });

  async function shutdown(signal: string) {
    console.log(`${signal} received, shutting down...`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}
