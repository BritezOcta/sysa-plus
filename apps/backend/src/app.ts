import cookieParser from "cookie-parser";
import express from "express";
import { apiRouter } from "./routes/index.js";
import { notFound } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  // Detrás de nginx (Docker) o del proxy de Vite: req.ip toma la IP que agrega el proxy
  // en X-Forwarded-For, no la del contenedor. Lo usan la auditoría y el límite de login por IP.
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
