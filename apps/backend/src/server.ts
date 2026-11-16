
import express from "express";
import { prisma } from "./lib/prisma.js";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "OK",
    message: "SysA+ API funcionando correctamente",
  });
});

// Database health check
app.get("/api/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "OK",
      database: "connected",
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      status: "ERROR",
      database: "disconnected",
    });
  }
});

app.listen(PORT, () => {
  console.log(`SysA+ API running at http://localhost:${PORT}`);
});


app.get("/api/health/db/details", async (_req, res) => {
  try {
    const result = await prisma.$queryRaw<
      {
        net_transport: string;
        auth_scheme: string;
        local_tcp_port: string;
      }[]
    >`
      SELECT
        CAST(CONNECTIONPROPERTY('net_transport') AS NVARCHAR(50)) AS net_transport,
        CAST(CONNECTIONPROPERTY('auth_scheme') AS NVARCHAR(50)) AS auth_scheme,
        CAST(CONNECTIONPROPERTY('local_tcp_port') AS NVARCHAR(50)) AS local_tcp_port
    `;

    res.json(result);
  } catch (error) {
    console.error("Database details error:", error);

    res.status(500).json({ status: "ERROR" });
  }
});