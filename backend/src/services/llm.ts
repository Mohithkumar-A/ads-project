// ─────────────────────────────────────────────────────────────
// LLM Service — Ollama Integration
// ─────────────────────────────────────────────────────────────

import type { AgentToolCall } from "../types";

// ── Configuration ────────────────────────────────────────────
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";

// No default fallback anymore - we want to fail explicitly if LLM is down.
// const DEFAULT_TOOL_CALL: AgentToolCall = { ... };

// ─────────────────────────────────────────────────────────────
// Phase 1 — Tool Routing (Pre-processing)
//
// Takes the user's natural language prompt and returns a
// structured AgentToolCall telling the C++ engine what to run.
// ─────────────────────────────────────────────────────────────

export async function determineSearchParameters(
  prompt: string
): Promise<AgentToolCall> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `You are a log investigation routing agent.
                 User query: "${prompt}"
                 Output MUST be strict JSON with exactly three keys: 'bplus', 'trie', and 'heap'.
                 Example: {"bplus":{"used":true,"start_time":"14:00:00","end_time":"15:00:00"},"trie":{"used":false,"keywords":[]},"heap":{"used":true,"top_k":10}}`,
        format: "json",
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { response: string };
    return JSON.parse(data.response) as AgentToolCall;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[LLM Phase 1] Connection failed. (${message})`);
    throw new Error(`LLM is not connected (Ollama at ${OLLAMA_BASE_URL} is unreachable). Please ensure Ollama is running before starting an investigation.`);
  }
}

// ─────────────────────────────────────────────────────────────
// Phase 2 — Evidence Synthesis (Post-processing)
//
// Takes the user's original prompt + the raw evidence found by
// the C++ engine and produces a human-readable summary.
// ─────────────────────────────────────────────────────────────

export interface SynthesisResult {
  summary: string;
  key_findings: string[];
}

export async function generateSummary(
  prompt: string,
  evidenceJson: string
): Promise<SynthesisResult> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `You are a DevOps Incident Reporter.
                 The user asked: "${prompt}"
                 The data structures isolated these logs:
                 ${evidenceJson}
                 Write a 2-3 sentence summary and a list of key findings.
                 Format the output strictly as JSON with keys 'summary' (string) and 'key_findings' (array of strings).`,
        format: "json",
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { response: string };
    return JSON.parse(data.response) as SynthesisResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[LLM Phase 2] Connection failed. (${message})`);
    throw new Error(`LLM is not connected (Ollama at ${OLLAMA_BASE_URL} is unreachable). Cannot generate summary.`);
  }
}
