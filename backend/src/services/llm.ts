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
Your job is to parse a user query and output a strict JSON routing configuration for our C++ data structures.

RULES FOR DATA STRUCTURES:
1. B+ Tree ('bplus'):
   - Use ONLY IF the user explicitly asks for a strict time window (e.g., "between 14:00 and 15:00", "after 09:15").
   - If they ask for generic times like "today" or "24x7", set "used": false.
   - If used, output an array of "ranges" with "start_time" and "end_time" in "HH:MM:SS" format.

2. Trie ('trie'):
   - Use ONLY IF the user is looking for specific concepts, keywords, or services (e.g., "database", "stripe").
   - Extract those concepts into the "keywords" array as simple lowercase strings.

3. Priority Heap ('heap'):
   - ALMOST ALWAYS set "used": true to rank the resulting logs.
   - You must select relevant error tags from this list: [timeout, auth, database, connection, panic, crash, deadlock, latency, 500, 404].
   - Assign a priority score to each chosen tag based on how relevant it is to the user's query (e.g., if they ask about databases, assign {"database": 1000, "timeout": 500}).
   - Set "top_k" to 10 by default.

User query: "\${prompt}"

Output MUST be valid JSON exactly matching this structure. 
Example (when time and keywords are specified):
{"bplus":{"used":true,"ranges":[{"start_time":"14:00:00","end_time":"15:00:00"}]},"trie":{"used":true,"keywords":["database"]},"heap":{"used":true,"top_k":10,"tags":{"database":1000,"timeout":500}}}

Example (generic search):
{"bplus":{"used":false,"ranges":[]},"trie":{"used":false,"keywords":[]},"heap":{"used":true,"top_k":5,"tags":{"auth":1000,"404":800}}}`,
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
  root_cause: string;
  possible_fix: string;
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
        prompt: `You are an expert Senior DevOps Engineer analyzing an incident.
The user asked: "\${prompt}"

The C++ data structures have isolated the Top K most critical log events (in JSON format):
\${evidenceJson}

RULES:
1. If the log events array is empty "[]", respond strictly with:
   {"summary": "No logs matched your search criteria.", "root_cause": "N/A", "possible_fix": "N/A", "key_findings": []}
2. Otherwise, synthesize a highly structured incident report. Output MUST be valid JSON exactly matching this structure:
{
  "summary": "Brief 1-sentence overview of the incident.",
  "root_cause": "Detailed technical explanation of what caused the issue based on the logs.",
  "possible_fix": "Actionable step to resolve the issue.",
  "key_findings": ["Bullet point 1", "Bullet point 2"]
}

Output MUST be strictly JSON format. Do NOT include markdown blocks.`,
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
