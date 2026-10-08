// ─────────────────────────────────────────────────────────────
// Investigation Route — POST /api/investigate
//
// The main pipeline controller. Orchestrates:
//   1. File ingestion (upload or pasted text)
//   2. LLM Phase 1 (tool routing)
//   3. C++ engine execution
//   4. LLM Phase 2 (evidence synthesis)
//   5. Cleanup & response
// ─────────────────────────────────────────────────────────────

import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import {
  saveTempFile,
  readUploadedFile,
  cleanupTempFile,
  cleanupUpload,
} from "../utils/fileManager";
import { determineSearchParameters, generateSummary } from "../services/llm";
import { executeDSA } from "../services/engine";
import type { InvestigationResponse, ErrorResponse } from "../types";

// ── Multer config for file uploads ───────────────────────────
const upload = multer({
  dest: path.resolve(__dirname, "../../temp/uploads"),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max
  },
  fileFilter: (_req, file, cb) => {
    // Only accept text-based log files
    const allowed = [".log", ".txt", ".csv"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.startsWith("text/")) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Use .log, .txt, or .csv`));
    }
  },
});

const router = Router();

// ─────────────────────────────────────────────────────────────
// POST /api/investigate
// ─────────────────────────────────────────────────────────────

router.post(
  "/investigate",
  upload.single("logFile"),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    let tempFilePath: string | undefined;
    const uploadPath = req.file?.path;

    try {
      // ── 1. Extract the prompt ──────────────────────────────
      const prompt: string | undefined = req.body?.prompt;
      if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        res.status(400).json({
          error: "Missing required field: prompt",
          details: "Send a natural language query describing what to investigate.",
        } satisfies ErrorResponse);
        return;
      }

      // ── 2. Extract log data (file upload OR pasted text) ───
      let logText: string;

      if (req.file) {
        // User uploaded a file via drag-and-drop or file picker
        logText = await readUploadedFile(req.file.path);
        console.log(
          `[Investigate] Received uploaded file: ${req.file.originalname} (${req.file.size} bytes)`
        );
      } else if (typeof req.body?.logText === "string") {
        // User pasted text directly
        logText = req.body.logText;
        console.log(
          `[Investigate] Received pasted log text (${logText.length} chars)`
        );
      } else {
        res.status(400).json({
          error: "Missing log data",
          details:
            "Either upload a .log/.txt file as 'logFile' or send raw text in the 'logText' field.",
        } satisfies ErrorResponse);
        return;
      }

      // Validate that there is actual content
      const trimmed = logText.trim();
      if (trimmed.length === 0) {
        res.status(400).json({
          error: "Empty log data",
          details: "The provided log file or text is empty.",
        } satisfies ErrorResponse);
        return;
      }

      // ── 3. Write log data to a temp file for C++ ───────────
      tempFilePath = await saveTempFile(trimmed);
      console.log(`[Investigate] Saved temp file: ${tempFilePath}`);

      // ── 4. LLM Phase 1 — Determine search parameters ──────
      console.log(`[Investigate] Phase 1: Routing prompt to LLM...`);
      const toolCall = await determineSearchParameters(prompt);
      console.log(`[Investigate] Tool call:`, JSON.stringify(toolCall));

      // ── 5. Execute C++ DSA engine ──────────────────────────
      console.log(`[Investigate] Executing DSA engine...`);
      const engineResult = await executeDSA(tempFilePath, toolCall);
      console.log(
        `[Investigate] Engine returned ${engineResult.evidence.length} evidence records`
      );

      // ── 6. LLM Phase 2 — Synthesize summary ───────────────
      console.log(`[Investigate] Phase 2: Generating summary...`);
      const synthesis = await generateSummary(
        prompt,
        JSON.stringify(engineResult.evidence)
      );

      // ── 7. Build final response ────────────────────────────
      const response: InvestigationResponse = {
        summary: synthesis.summary,
        key_findings: synthesis.key_findings,
        evidence: engineResult.evidence,
        dsa_metrics: engineResult.dsa_metrics,
        tool_call: toolCall,
        processing_time_ms: Date.now() - startTime,
      };

      console.log(
        `[Investigate] Complete in ${response.processing_time_ms}ms`
      );

      res.json(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown internal error";

      console.error(`[Investigate] ERROR:`, message);

      res.status(500).json({
        error: "Investigation failed",
        details: message,
      } satisfies ErrorResponse);
    } finally {
      // ── 8. Cleanup temp files ──────────────────────────────
      if (tempFilePath) await cleanupTempFile(tempFilePath);
      await cleanupUpload(uploadPath);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET /api/health — simple health check
// ─────────────────────────────────────────────────────────────

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    engine_available: process.env.ENGINE_AVAILABLE === "true",
    llm_available: Boolean(process.env.OLLAMA_URL),
    timestamp: new Date().toISOString(),
  });
});

export default router;
