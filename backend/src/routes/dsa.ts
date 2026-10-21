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

// ─────────────────────────────────────────────────────────────
// POST /api/bplustree
// Body: { logText, ranges?: [{start_time, end_time}], start_time?: string, end_time?: string, time?: string }
// ─────────────────────────────────────────────────────────────

router.post("/bplustree", async (req: Request, res: Response): Promise<void> => {
  const { logText, ranges, start_time, end_time, time } = req.body ?? {};
  if (!validateRequest(logText, res)) return;

  const resolvedRanges: Array<{ start_time: string; end_time: string }> = [];

  if (Array.isArray(ranges) && ranges.length > 0) {
    for (const r of ranges) {
      if (r?.start_time && r?.end_time) {
        resolvedRanges.push({ start_time: String(r.start_time), end_time: String(r.end_time) });
      }
    }
  } else if (start_time && end_time) {
    resolvedRanges.push({ start_time: String(start_time), end_time: String(end_time) });
  } else if (time && typeof time === "string") {
    // Single point in time: normalize to +/- 2.5 min window
    const cleanTime = time.trim();
    const parts = cleanTime.split(":").map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const h = parts[0];
      const m = parts[1];
      const s = parts[2] || 0;
      const totalSeconds = h * 3600 + m * 60 + s;
      const startSec = Math.max(0, totalSeconds - 150);
      const endSec = Math.min(86399, totalSeconds + 150);

      const fmt = (sec: number) => {
        const hh = String(Math.floor(sec / 3600)).padStart(2, "0");
        const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
        const ss = String(sec % 60).padStart(2, "0");
        return `${hh}:${mm}:${ss}`;
      };
      resolvedRanges.push({ start_time: fmt(startSec), end_time: fmt(endSec) });
    }
  }

  if (resolvedRanges.length === 0) {
    res.status(400).json({
      error: "Missing parameters",
      details: "Provide 'ranges', 'start_time' and 'end_time', or a specific 'time' for B+ Tree query.",
    } satisfies ErrorResponse);
    return;
  }

  let tempFilePath: string | undefined;
  try {
    tempFilePath = await saveTempFile(logText.trim());
    const rangeString = resolvedRanges
      .map((r) => `${r.start_time}-${r.end_time}`)
      .join(",");

    const result = await spawnEngineRaw([
      "--file", tempFilePath,
      "--bplus-ranges", rangeString,
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
// Body: { logText, keyword?: string, keywords?: string[] }
// ─────────────────────────────────────────────────────────────

router.post("/trie", async (req: Request, res: Response): Promise<void> => {
  const { logText, keyword, keywords } = req.body ?? {};
  if (!validateRequest(logText, res)) return;

  const keys: string[] = [];
  if (Array.isArray(keywords)) {
    keys.push(...keywords.map(String).filter((k) => k.trim().length > 0));
  } else if (typeof keyword === "string" && keyword.trim().length > 0) {
    keys.push(keyword.trim());
  }

  if (keys.length === 0) {
    res.status(400).json({
      error: "Missing parameters",
      details: "Provide a 'keyword' string or 'keywords' array for Trie search.",
    } satisfies ErrorResponse);
    return;
  }

  let tempFilePath: string | undefined;
  try {
    tempFilePath = await saveTempFile(logText.trim());
    const result = await spawnEngineRaw([
      "--file", tempFilePath,
      "--trie-keys", keys.join(","),
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
// Body: { logText, k?: number, tags?: Record<string, number> }
// ─────────────────────────────────────────────────────────────

router.post("/heap", async (req: Request, res: Response): Promise<void> => {
  const { logText, k, tags } = req.body ?? {};
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
    const args = ["--file", tempFilePath, "--heap-topk", String(topK)];

    if (tags && typeof tags === "object" && Object.keys(tags).length > 0) {
      const tagString = Object.entries(tags)
        .map(([t, s]) => `${t}:${s}`)
        .join(",");
      args.push("--heap-tags", tagString);
    }

    const result = await spawnEngineRaw(args);
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
