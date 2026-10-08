// ─────────────────────────────────────────────────────────────
// Express Server Entry Point
// ─────────────────────────────────────────────────────────────

import express from "express";
import cors from "cors";
import investigateRouter from "./routes/investigate";
import { ensureTempDir } from "./utils/fileManager";

const PORT = parseInt(process.env.PORT || "3001", 10);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

async function main() {
  // Ensure the temp directory exists before accepting requests
  await ensureTempDir();

  const app = express();

  // ── Middleware ──────────────────────────────────────────────
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // ── Routes ─────────────────────────────────────────────────
  app.use("/api", investigateRouter);

  // ── 404 fallback ───────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // ── Global Error Handler ───────────────────────────────────
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled middleware error:", err.message);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  });

  // ── Start ──────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log("");
    console.log("═══════════════════════════════════════════════");
    console.log("  LOG INVESTIGATOR — Backend Orchestrator");
    console.log("═══════════════════════════════════════════════");
    console.log(`  Server:    http://localhost:${PORT}`);
    console.log(`  Health:    http://localhost:${PORT}/api/health`);
    console.log(`  Frontend:  ${FRONTEND_ORIGIN}`);
    console.log(`  Engine:    ${process.env.ENGINE_AVAILABLE === "true" ? "Active (C++ binary)" : "Mock (placeholder)"}`);
    console.log(`  LLM:       ${process.env.OLLAMA_URL ? "Active (" + process.env.OLLAMA_URL + ")" : "Mock/Fallback (http://127.0.0.1:11434)"}`);
    console.log("═══════════════════════════════════════════════");
    console.log("");
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
