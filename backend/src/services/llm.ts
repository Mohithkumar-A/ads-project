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
Your job is to parse a user query and output a strict JSON routing configuration.

RULES FOR DATA STRUCTURES:
1. B+ Tree ('bplus'):
   - Use ONLY IF the user explicitly asks for a strict time window (e.g., "between 14:00 and 15:00", "after 09:15", "from 10:00 to 11:30").
   - If they ask for "today" or don't mention times, set "used": false.
   - If used, extract times into "HH:MM:SS" format.

2. Trie ('trie'):
   - Use ONLY IF the user is looking for specific concepts, keywords, or services (e.g., "authentication", "database", "timeout", "errors").
   - Extract those concepts into the "keywords" array as simple lowercase strings.
   - If the user asks a completely generic question like "what happened?", set "used": false and let the Heap rank everything.

3. Priority Heap ('heap'):
   - ALMOST ALWAYS set "used": true to rank the resulting logs by severity.
   - Set "top_k" to 10 by default, unless the user explicitly asks for a different number (e.g., "top 5 errors").

User query: "${prompt}"

Output MUST be valid JSON exactly matching this structure. 
Example (when time and keywords are specified):
{"bplus":{"used":true,"start_time":"14:00:00","end_time":"15:00:00"},"trie":{"used":true,"keywords":["database","timeout"]},"heap":{"used":true,"top_k":10}}

Example (when only keywords are specified):
{"bplus":{"used":false,"start_time":"00:00:00","end_time":"23:59:59"},"trie":{"used":true,"keywords":["login","failed"]},"heap":{"used":true,"top_k":5}}`,
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
        prompt: `You are an expert DevOps Incident Reporter.
The user asked: "${prompt}"

The C++ data structures have isolated the following high-priority log events (in JSON format):
${evidenceJson}

RULES:
1. If the log events array is empty "[]", respond strictly with:
   {"summary": "No logs matched your search criteria.", "key_findings": []}
2. Otherwise, write a clear, concise 2-3 sentence summary explaining what happened based ONLY on the provided logs.
3. Provide a list of key findings (e.g., "Authentication service crashed at 12:01:22 on AUTH-01").

Output MUST be strictly JSON format with keys 'summary' (string) and 'key_findings' (array of strings). Do NOT include markdown blocks.`,
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
