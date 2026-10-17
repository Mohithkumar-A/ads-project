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
Your job is to parse a user query and determine which C++ data structures should run to retrieve evidence.

SELECTIVE ROUTING RULES (CRITICAL: SKIP UNNEEDED DATA STRUCTURES):

1. B+ Tree ('bplus') - Temporal Index:
   - ONLY set "used": true if the query explicitly specifies a bounded time window, time range, or specific hour (e.g., "between 14:15 and 14:30", "at 2:30 PM", "around 14:18", "after 16:00", "between 2:30 PM and 2:35 PM").
   - If the query does NOT specify a time, or refers to the entire day / whole log / all time (e.g. "Find database errors", "Why did DB-01 crash?", "Why are Stripe webhooks failing?"), set "used": false and "ranges": [].
   - STRICT PROHIBITION: NEVER fabricate full-day "00:00:00" to "23:59:59" defaults when no time is mentioned. Skip B+ Tree instead.
   - TIME NORMALIZATION (Convert ALL times to 24-hour "HH:MM:SS" format):
     * 12-hour AM/PM: "2:30 PM" -> "14:30:00", "2:35 PM" -> "14:35:00", "9:15 AM" -> "09:15:00", "12:00 PM" -> "12:00:00", "12:30 AM" -> "00:30:00".
     * 24-hour: "14:15" -> "14:15:00", "14:30" -> "14:30:00".
     * Point in time: "at 14:18" or "around 2:18 PM" -> 5-min window: {"start_time": "14:15:00", "end_time": "14:20:00"}.
     * Open bounds: "after 14:00" -> {"start_time": "14:00:00", "end_time": "23:59:59"}. "before 11:30" -> {"start_time": "00:00:00", "end_time": "11:30:00"}.

2. Trie ('trie') - Keyword & Pattern Index:
   - ONLY set "used": true if the query specifies identifiable keywords, services, error codes, or domain terms (e.g., "stripe", "database", "deadlock", "timeout", "checkout", "auth", "500").
   - Extract lowercase strings into "keywords". Also include the service domain if relevant (e.g. for "stripe webhook", include "stripe" and "payment").
   - If the query contains NO specific keywords (e.g. "What happened between 14:15 and 14:30?", "Summarize events from 2 PM to 3 PM"), set "used": false and "keywords": [].
   - STRICT PROHIBITION: NEVER default to generic keywords like "error" or "log" when no keywords are requested. Skip Trie instead.

3. Priority Max-Heap ('heap') - Deterministic Ranking Engine:
   - Set "used": true for incident investigations, root cause discovery, critical failures, or ranking (default: true).
   - Set "used": false ONLY if the user explicitly asks for unranked raw logs (e.g. "List all logs between 14:00 and 14:10 without ranking").
   - DYNAMIC TAG WEIGHTS: Assign high priority scores to the primary subjects/entities of the query so they outrank unrelated events:
     * Primary subject/service: 2000 - 3000 (e.g. "stripe": 3000, "payment": 2000, "database": 3000, "auth": 3000, "deadlock": 2500)
     * Secondary symptoms: 500 - 1000 (e.g. "timeout": 500, "500": 500, "connection": 500)
     * Default "top_k": 10 (or 6 for focused queries).

User query: "${prompt}"

Output MUST be valid JSON matching this exact structure:

FEW-SHOT EXAMPLES:

Example 1 (Time + Subject):
Query: "Why did the database fail between 2:30 PM and 2:35 PM?"
{"bplus":{"used":true,"ranges":[{"start_time":"14:30:00","end_time":"14:35:00"}]},"trie":{"used":true,"keywords":["database"]},"heap":{"used":true,"top_k":10,"tags":{"database":3000,"deadlock":2000,"timeout":500}}}

Example 2 (Keyword only, no time):
Query: "Why are Stripe webhook requests failing with timeouts?"
{"bplus":{"used":false,"ranges":[]},"trie":{"used":true,"keywords":["stripe","payment","timeout"]},"heap":{"used":true,"top_k":10,"tags":{"stripe":3000,"payment":2000,"timeout":500}}}

Example 3 (Time only, no keywords):
Query: "What happened in the system between 14:15 and 14:30?"
{"bplus":{"used":true,"ranges":[{"start_time":"14:15:00","end_time":"14:30:00"}]},"trie":{"used":false,"keywords":[]},"heap":{"used":true,"top_k":10,"tags":{}}}

Example 4 (Specific error code across all logs):
Query: "Find all 500 internal server errors on API-01"
{"bplus":{"used":false,"ranges":[]},"trie":{"used":true,"keywords":["500","api-01"]},"heap":{"used":true,"top_k":10,"tags":{"500":2500,"api-01":2000}}}

Example 5 (Raw unranked request):
Query: "Show all logs between 11:20:00 and 11:30:00 without ranking"
{"bplus":{"used":true,"ranges":[{"start_time":"11:20:00","end_time":"11:30:00"}]},"trie":{"used":false,"keywords":[]},"heap":{"used":false,"top_k":0,"tags":{}}}`,
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
PROMPT-ALIGNMENT & RELEVANCE FILTER (MANDATORY):
═══════════════════════════════════════════════════

1. DIRECT ANSWER MANDATE: Your explanation MUST directly answer the specific question asked in USER QUERY: "${prompt}".

2. IRRELEVANT LOG EXCLUSION: Carefully read ALL logs in the evidence JSON. If the evidence contains unrelated logs from other systems, services, or different times of day (for example, a database or disk storage error when the user specifically asked about Stripe payment webhooks, or an authentication error when the user asked about checkout), you MUST IGNORE AND EXCLUDE those unrelated logs.

3. ESSENTIAL LOG SELECTION: From the provided evidence, isolate and reference ONLY the essential logs that directly pertain to the user's specific query. Base your technical root cause, non-technical summary, and key findings strictly on those relevant essential logs. Explain the exact failure of the system the user asked about.

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

If the evidence array is empty "[]" or contains no logs matching the user's topic, respond with:
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
  "key_findings": ["Chronologically ordered bullet points, each citing [timestamp server] from the relevant evidence."]
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

