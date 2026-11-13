
import express from "express";

const app = express();
const PORT = process.env.PORT ?? 3000;

// Middlewares
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "OK",
    message: "SysA+ API funcionando correctamente"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`SysA+ API running at http://localhost:${PORT}`);
});
