// ─────────────────────────────────────────────────────────────
// C++ DSA Engine Service
//
// Spawns the compiled C++ binary (dsa/engine.out) as a child
// process, passing CLI arguments for the requested data
// structures. Parses the JSON output from stdout.
//
// Set ENGINE_AVAILABLE=true to enable the real engine.
// ─────────────────────────────────────────────────────────────

import { spawn } from "child_process";
import path from "path";
import type { AgentToolCall, EngineResult, LogRecord, DSAMetrics } from "../types";

// ── Configuration ────────────────────────────────────────────
// Path to the compiled C++ binary (relative to project root)
const ENGINE_PATH = path.resolve(__dirname, "../../../dsa/engine.out");

// Set to true via environment variable once the C++ binary is compiled
const ENGINE_AVAILABLE = process.env.ENGINE_AVAILABLE === "true";

// ─────────────────────────────────────────────────────────────
// Build CLI arguments from the LLM's tool call
// ─────────────────────────────────────────────────────────────

function buildArgs(filePath: string, params: AgentToolCall): string[] {
  const args: string[] = ["--file", filePath];

  if (params.bplus.used && params.bplus.ranges && params.bplus.ranges.length > 0) {
    const rangeString = params.bplus.ranges
      .map(r => `${r.start_time}-${r.end_time}`)
      .join(",");
    args.push("--bplus-ranges", rangeString);
  }

  if (params.trie.used && params.trie.keywords.length > 0) {
    args.push("--trie-keys", params.trie.keywords.join(","));
  }

  if (params.heap.used) {
    args.push("--heap-topk", String(params.heap.top_k));
    if (params.heap.tags && Object.keys(params.heap.tags).length > 0) {
      const tagString = Object.entries(params.heap.tags)
        .map(([tag, score]) => `${tag}:${score}`)
        .join(",");
      args.push("--heap-tags", tagString);
    }
  }

  return args;
}

// ─────────────────────────────────────────────────────────────
// Execute the C++ binary via child_process.spawn
//
// This is the REAL implementation — it will work as-is once
// engine.out exists at the expected path.
// ─────────────────────────────────────────────────────────────

function spawnEngine(filePath: string, params: AgentToolCall): Promise<EngineResult> {
  return new Promise((resolve, reject) => {
    const args = buildArgs(filePath, params);
    console.log(`[Engine] Spawning: ${ENGINE_PATH} ${args.join(" ")}`);

    const child = spawn(ENGINE_PATH, args, {
      timeout: 30_000, // 30 second hard limit
    });

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
// Public API — automatically switches between real / mock
// ─────────────────────────────────────────────────────────────

/**
 * Execute the DSA engine on a log file with the given parameters.
 *
 * When ENGINE_AVAILABLE is false, throws a clear error so the pipeline fails cleanly.
 *
 * @param filePath - Absolute path to the temp log file
 * @param params   - Tool call parameters from LLM Phase 1
 */
export async function executeDSA(
  filePath: string,
  params: AgentToolCall
): Promise<EngineResult> {
  if (ENGINE_AVAILABLE) {
    return spawnEngine(filePath, params);
  }
  
  throw new Error("C++ Engine is not connected or compiled. Set ENGINE_AVAILABLE=true and ensure engine.out exists.");
}
