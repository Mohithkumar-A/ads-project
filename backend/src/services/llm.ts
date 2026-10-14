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
   - ALWAYS set "used": true.
   - If the user explicitly asks for a strict time window (e.g., "between 14:00 and 15:00"), extract those into "ranges" with "start_time" and "end_time" in "HH:MM:SS" format.
   - If they ask for generic times or no time is specified, use a default range of "00:00:00" to "23:59:59".

2. Trie ('trie'):
   - ALWAYS set "used": true.
   - Extract specific concepts, keywords, or services into the "keywords" array as lowercase strings.
   - If no specific keywords are requested, use a default keyword "error".

3. Priority Heap ('heap'):
   - ALMOST ALWAYS set "used": true to rank the resulting logs.
   - You must select relevant error tags from this list: [timeout, auth, database, connection, panic, crash, deadlock, latency, 500, 404].
   - Assign a priority score to each chosen tag based on how relevant it is to the user's query.
   - Set "top_k" to 10 by default.

User query: "${prompt}"

Output MUST be valid JSON exactly matching this structure.
Always output bplus used=true and trie used=true. Provide default range and keywords if none exist in the query.

Example structure (DO NOT copy these values unless relevant, only use the structure):
{"bplus":{"used":true,"ranges":[{"start_time":"14:00:00","end_time":"15:00:00"}]},"trie":{"used":true,"keywords":["database"]},"heap":{"used":true,"top_k":10,"tags":{"database":1000,"timeout":500}}}`,
        format: "json",
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { response: string };
    
    // Robust parsing
    let rawText = data.response.trim();
    if (rawText.startsWith("```json")) {
      rawText = rawText.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```/, "").replace(/```$/, "").trim();
    }
    
    const parsed = JSON.parse(rawText);
    
    return {
      bplus: {
        used: parsed?.bplus?.used ?? false,
        ranges: Array.isArray(parsed?.bplus?.ranges) ? parsed.bplus.ranges : []
      },
      trie: {
        used: parsed?.trie?.used ?? false,
        keywords: Array.isArray(parsed?.trie?.keywords) ? parsed.trie.keywords : []
      },
      heap: {
        used: parsed?.heap?.used ?? true,
        top_k: parsed?.heap?.top_k ?? 10,
        tags: parsed?.heap?.tags || {}
      }
    } as AgentToolCall;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[LLM Phase 1] Connection failed. (${message})`);
    throw new Error(`LLM parsing failed: ${message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Phase 2 — Evidence Synthesis (Post-processing)
//
// Takes the user's original prompt + the raw evidence found by
// the C++ engine and produces a human-readable summary with
// dual-perspective explanations and two-tier remediation.
// ─────────────────────────────────────────────────────────────

export interface SynthesisResult {
  summary: string;
  root_cause: string;
  possible_fix: string;
  key_findings: string[];
  // Enhanced dual-perspective fields
  non_technical_summary: string;
  technical_root_cause: string;
  immediate_mitigation: string;
  permanent_fix: string;
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
        prompt: `You are an Evidence-Grounded Site Reliability Engineering Assessor analyzing an incident.

IDENTITY & ROLE:
You are a senior SRE with 15 years of production systems experience. You diagnose infrastructure failures by examining ONLY the log evidence provided. You never speculate or invent details.

USER QUERY: "${prompt}"

VERIFIED LOG EVIDENCE (from C++ DSA engine — these are the ONLY facts you may reference):
${evidenceJson}

═══════════════════════════════════════════════════
STRICT ANTI-HALLUCINATION RULES (MANDATORY):
═══════════════════════════════════════════════════

1. EVIDENCE BOUNDARY: Base ALL analysis strictly and exclusively on the log evidence JSON above. DO NOT infer, assume, or invent ANY servers, services, IP addresses, error codes, metrics, percentages, or technical details that do not appear VERBATIM in the evidence.

2. CITATION RULE: Every factual claim in root_cause, technical_root_cause, and key_findings MUST cite the exact timestamp and server from the evidence in brackets, e.g. "[2026-10-08 14:18:05 DB-01]". Uncited claims are FORBIDDEN.

3. TEMPORAL CAUSALITY: Ensure the root cause event timestamp occurs BEFORE any downstream cascading failures. Events cannot cause failures that happened before them.

4. MISSING INFORMATION: If the evidence does not contain sufficient details to determine a specific metric or cause, state "Not observed in retrieved logs" instead of guessing.

═══════════════════════════════════════════════════
OUTPUT REQUIREMENTS:
═══════════════════════════════════════════════════

If the evidence array is empty "[]", respond with:
{"summary":"No logs matched your search criteria.","root_cause":"N/A","possible_fix":"N/A","key_findings":[],"non_technical_summary":"No relevant events were found matching your query.","technical_root_cause":"N/A","immediate_mitigation":"N/A","permanent_fix":"N/A"}

Otherwise produce VALID JSON matching this EXACT structure:

{
  "summary": "One-sentence incident title describing what failed and the impact.",
  "non_technical_summary": "Plain-English explanation for non-technical stakeholders: What broke? Who was affected? What did users experience? Avoid all jargon.",
  "root_cause": "Concise root cause (backward-compatible field).",
  "technical_root_cause": "Detailed technical systems diagnosis for senior engineers. Explain the causal chain: what resource was exhausted or what failure occurred, how it propagated, and what downstream systems were affected. Cite timestamps and servers.",
  "possible_fix": "Combined remediation summary (backward-compatible field).",
  "immediate_mitigation": "Direct, actionable operational commands or steps to stop this incident RIGHT NOW. Be specific: mention exact processes to restart, configurations to change, or queries to run.",
  "permanent_fix": "Structural architectural and code-level changes to prevent this class of incident from recurring. Reference specific technologies, patterns, or configurations.",
  "key_findings": ["Chronologically ordered bullet points, each citing [timestamp server] from the evidence."]
}

Output MUST be strictly valid JSON. No markdown blocks, no extra text.`,
        format: "json",
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { response: string };
    
    let rawText = data.response.trim();
    if (rawText.startsWith("```json")) {
      rawText = rawText.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```/, "").replace(/```$/, "").trim();
    }
    
    const parsed = JSON.parse(rawText);
    
    return {
      summary: parsed?.summary || "No summary generated.",
      root_cause: parsed?.root_cause || parsed?.technical_root_cause || "No root cause identified.",
      possible_fix: parsed?.possible_fix || parsed?.immediate_mitigation || "No fix provided.",
      key_findings: Array.isArray(parsed?.key_findings) ? parsed.key_findings : [],
      non_technical_summary: parsed?.non_technical_summary || parsed?.summary || "No summary available.",
      technical_root_cause: parsed?.technical_root_cause || parsed?.root_cause || "No technical analysis available.",
      immediate_mitigation: parsed?.immediate_mitigation || "No immediate steps provided.",
      permanent_fix: parsed?.permanent_fix || parsed?.possible_fix || "No permanent fix provided.",
    } as SynthesisResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[LLM Phase 2] Connection failed. (${message})`);
    throw new Error(`LLM parsing failed: ${message}`);
  }
}

