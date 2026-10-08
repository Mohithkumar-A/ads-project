// ─────────────────────────────────────────────────────────────
// Standalone DSA Routes — POST /api/bplustree, /api/trie, /api/heap
//
// These endpoints let the frontend explorer views query a single
// data structure directly, bypassing the LLM entirely.
// The C++ engine is spawned with only the relevant CLI flags.
// ─────────────────────────────────────────────────────────────

import { Router, Request, Response } from "express";
import { spawn } from "child_process";
import path from "path";
import {
  saveTempFile,
  cleanupTempFile,
} from "../utils/fileManager";
import type { EngineResult, ErrorResponse } from "../types";

const ENGINE_PATH = path.resolve(__dirname, "../../../dsa/engine.out");
const ENGINE_AVAILABLE = process.env.ENGINE_AVAILABLE === "true";

const router = Router();

// ─────────────────────────────────────────────────────────────
// Helper: spawn the C++ engine with raw CLI args
// ─────────────────────────────────────────────────────────────

function spawnEngineRaw(args: string[]): Promise<EngineResult> {
  return new Promise((resolve, reject) => {
    console.log(`[DSA] Spawning: ${ENGINE_PATH} ${args.join(" ")}`);

    const child = spawn(ENGINE_PATH, args, { timeout: 30_000 });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to start C++ engine: ${err.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `C++ engine exited with code ${code}.\nStderr: ${stderr || "(empty)"}`
          )
        );
        return;
      }

      try {
        const result: EngineResult = JSON.parse(stdout);
        resolve(result);
      } catch {
        reject(
          new Error(
            `C++ engine returned invalid JSON.\nRaw stdout: ${stdout.slice(0, 500)}`
          )
        );
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────
// Helper: validate that log text was provided and engine exists
// ─────────────────────────────────────────────────────────────

function validateRequest(
  logText: unknown,
  res: Response
): logText is string {
  if (!ENGINE_AVAILABLE) {
    res.status(503).json({
      error: "C++ Engine not available",
      details:
        "Set ENGINE_AVAILABLE=true and ensure engine.out is compiled.",
    } satisfies ErrorResponse);
    return false;
  }

  if (typeof logText !== "string" || logText.trim().length === 0) {
    res.status(400).json({
      error: "Missing log data",
      details: "Send raw log text in the 'logText' field.",
    } satisfies ErrorResponse);
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────
// POST /api/bplustree
// Body: { logText, start_time, end_time }
// ─────────────────────────────────────────────────────────────

router.post("/bplustree", async (req: Request, res: Response): Promise<void> => {
  const { logText, start_time, end_time } = req.body ?? {};
  if (!validateRequest(logText, res)) return;

  if (!start_time || !end_time) {
    res.status(400).json({
      error: "Missing parameters",
      details: "Provide 'start_time' and 'end_time' for B+ Tree range query.",
    } satisfies ErrorResponse);
    return;
  }

  let tempFilePath: string | undefined;
  try {
    tempFilePath = await saveTempFile(logText.trim());
    const result = await spawnEngineRaw([
      "--file", tempFilePath,
      "--bplus-start", start_time,
      "--bplus-end", end_time,
    ]);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[DSA /bplustree] ERROR:", message);
    res.status(500).json({ error: "B+ Tree query failed", details: message } satisfies ErrorResponse);
  } finally {
    if (tempFilePath) await cleanupTempFile(tempFilePath);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/trie
// Body: { logText, keyword }
// ─────────────────────────────────────────────────────────────

router.post("/trie", async (req: Request, res: Response): Promise<void> => {
  const { logText, keyword } = req.body ?? {};
  if (!validateRequest(logText, res)) return;

  if (!keyword || typeof keyword !== "string" || keyword.trim().length === 0) {
    res.status(400).json({
      error: "Missing parameters",
      details: "Provide a 'keyword' string for Trie search.",
    } satisfies ErrorResponse);
    return;
  }

  let tempFilePath: string | undefined;
  try {
    tempFilePath = await saveTempFile(logText.trim());
    const result = await spawnEngineRaw([
      "--file", tempFilePath,
      "--trie-keys", keyword.trim(),
    ]);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[DSA /trie] ERROR:", message);
    res.status(500).json({ error: "Trie search failed", details: message } satisfies ErrorResponse);
  } finally {
    if (tempFilePath) await cleanupTempFile(tempFilePath);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/heap
// Body: { logText, k }
// ─────────────────────────────────────────────────────────────

router.post("/heap", async (req: Request, res: Response): Promise<void> => {
  const { logText, k } = req.body ?? {};
  if (!validateRequest(logText, res)) return;

  const topK = parseInt(String(k || "10"), 10);
  if (isNaN(topK) || topK < 1) {
    res.status(400).json({
      error: "Invalid parameter",
      details: "'k' must be a positive integer.",
    } satisfies ErrorResponse);
    return;
  }

  let tempFilePath: string | undefined;
  try {
    tempFilePath = await saveTempFile(logText.trim());
    const result = await spawnEngineRaw([
      "--file", tempFilePath,
      "--heap-topk", String(topK),
    ]);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[DSA /heap] ERROR:", message);
    res.status(500).json({ error: "Heap query failed", details: message } satisfies ErrorResponse);
  } finally {
    if (tempFilePath) await cleanupTempFile(tempFilePath);
  }
});

export default router;
