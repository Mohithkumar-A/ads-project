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
  prompt: string,
  availableSeverityTags: string[] = []
): Promise<AgentToolCall> {
  const candidateTagsStr = availableSeverityTags.length > 0
    ? availableSeverityTags.join(", ")
    : "CRITICAL, ERROR, WARNING, INFO, FATAL, SEVERE, ALERT";

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `You are a log investigation routing agent.
Your ONLY job: parse the user query and decide which C++ data structures to activate.

════════════════════════════════════════════════════
MANDATORY DECISION PROCESS (follow these steps IN ORDER):
════════════════════════════════════════════════════

STEP 1 — SCAN FOR EXPLICIT TIME REFERENCES:
Read the query word by word. Does it contain a concrete clock time, time range, or time-bounding phrase?

Concrete time examples: "14:15", "2:30 PM", "at 09:00", "around 3 AM", "after 16:00", "before noon", "between 06:20 and 06:35", "from 21:10 to 21:25".

NOT time references (do NOT treat these as times):
- General words: "when", "during", "recent", "latest", "last", "today", "yesterday"
- Durations without anchors: "past hour", "last 5 minutes"
- No time mentioned at all

DECISION:
  → If YES (concrete time found): set bplus.used = true, convert to 24h "HH:MM:SS" ranges.
  → If NO concrete time found: set bplus.used = false, ranges = []. STOP considering B+ Tree.

STEP 2 — SCAN FOR KEYWORDS / DOMAIN TERMS:
Does the query mention specific services, error types, codes, protocols, or technical terms?

Keyword examples: "database", "timeout", "connection", "deadlock", "auth", "payment", "500", "404", "webhook", "stripe", "nginx", "OOM", "disk", "memory", "CPU", "SSL", "DNS", "socket", "crash", "reboot", "failover".

NOT keywords (too generic — do NOT extract these):
- "error", "log", "issue", "problem", "event", "failure" used alone as the only term without a specific domain qualifier
- Exception: If "error" or "failure" appears WITH a specific service/domain term (e.g., "database error", "auth failure"), extract ONLY the specific term ("database", "auth"), not "error"/"failure".

DECISION:
  → If specific keywords found: set trie.used = true, extract them lowercase into keywords[].
  → If NO specific keywords: set trie.used = false, keywords = [].

STEP 3 — HEAP (almost always on):
  → Set heap.used = true UNLESS the user explicitly says "without ranking", "unranked", or "raw logs".
  → Assign severity tag weights from [${candidateTagsStr}] based on intent:
    * Crash/outage/critical investigation: CRITICAL:1000, FATAL:1000, ERROR:500, WARNING:100, INFO:10
    * Warning/degradation/retry focus: WARNING:1000, ERROR:500, CRITICAL:300, INFO:10
    * General/broad investigation: CRITICAL:1000, ERROR:800, WARNING:400, INFO:50
  → "heap.tags" contain ONLY severity labels (CRITICAL, ERROR, etc.), NEVER domain terms.
  → Default top_k: 10.

════════════════════════════════════════════════════
ABSOLUTE PROHIBITIONS (violating these = WRONG answer):
════════════════════════════════════════════════════

❌ NEVER set bplus.used = true when no clock time appears in the query.
❌ NEVER fabricate ranges like "00:00:00"-"23:59:59" or "12:00:00"-"12:00:00" as defaults.
❌ NEVER put domain keywords (database, timeout, etc.) into heap.tags — those go in trie.keywords.
❌ NEVER put severity tags (CRITICAL, ERROR, etc.) into trie.keywords — those go in heap.tags.
❌ NEVER extract generic words "error", "log", "issue", "event" as trie keywords unless paired with a domain term.

════════════════════════════════════════════════════
TIME NORMALIZATION (only when bplus.used = true):
════════════════════════════════════════════════════

- 12h→24h: "2:30 PM"→"14:30:00", "9:15 AM"→"09:15:00", "12:00 PM"→"12:00:00", "12:30 AM"→"00:30:00"
- 24h: "14:15"→"14:15:00"
- Point-in-time ("at X" / "around X"): create ±2.5 min window → e.g. "at 14:18" → {"start_time":"14:15:30","end_time":"14:20:30"}
- Open start ("after X"): {"start_time":"X","end_time":"23:59:59"}
- Open end ("before X"): {"start_time":"00:00:00","end_time":"X"}
- Multiple ranges supported: list each as separate object in ranges[].

════════════════════════════════════════════════════
FEW-SHOT EXAMPLES (study these carefully):
════════════════════════════════════════════════════

Example 1 — Time + keyword:
Q: "Why did the database fail between 2:30 PM and 2:35 PM?"
A: {"bplus":{"used":true,"ranges":[{"start_time":"14:30:00","end_time":"14:35:00"}]},"trie":{"used":true,"keywords":["database"]},"heap":{"used":true,"top_k":10,"tags":{"CRITICAL":1000,"ERROR":500,"WARNING":100}}}

Example 2 — Multiple time ranges:
Q: "Compare errors between 06:20 and 06:35 and between 21:10 and 21:25"
A: {"bplus":{"used":true,"ranges":[{"start_time":"06:20:00","end_time":"06:35:00"},{"start_time":"21:10:00","end_time":"21:25:00"}]},"trie":{"used":false,"keywords":[]},"heap":{"used":true,"top_k":10,"tags":{"CRITICAL":1000,"ERROR":500,"WARNING":100}}}

Example 3 — Keyword only, NO time (B+ Tree OFF):
Q: "Find all connection timeout events"
A: {"bplus":{"used":false,"ranges":[]},"trie":{"used":true,"keywords":["connection","timeout"]},"heap":{"used":true,"top_k":10,"tags":{"CRITICAL":1000,"ERROR":800,"WARNING":400,"INFO":50}}}

Example 4 — Point in time:
Q: "What happened at 14:18?"
A: {"bplus":{"used":true,"ranges":[{"start_time":"14:15:30","end_time":"14:20:30"}]},"trie":{"used":false,"keywords":[]},"heap":{"used":true,"top_k":10,"tags":{"CRITICAL":1000,"ERROR":500,"WARNING":100,"INFO":50}}}

Example 5 — Service investigation, NO time (B+ Tree OFF):
Q: "Why did DB-01 crash?"
A: {"bplus":{"used":false,"ranges":[]},"trie":{"used":true,"keywords":["db-01","crash"]},"heap":{"used":true,"top_k":10,"tags":{"CRITICAL":1000,"FATAL":1000,"ERROR":500,"WARNING":100}}}

Example 6 — Generic broad question, NO time, NO specific keyword (only Heap):
Q: "What are the most critical issues?"
A: {"bplus":{"used":false,"ranges":[]},"trie":{"used":false,"keywords":[]},"heap":{"used":true,"top_k":10,"tags":{"CRITICAL":1000,"FATAL":1000,"ERROR":500,"WARNING":100,"INFO":10}}}

Example 7 — Keyword with "error" context (extract domain, not "error"):
Q: "Show me all database errors"
A: {"bplus":{"used":false,"ranges":[]},"trie":{"used":true,"keywords":["database"]},"heap":{"used":true,"top_k":10,"tags":{"CRITICAL":1000,"ERROR":800,"WARNING":200}}}

Example 8 — Open-ended time bound:
Q: "What failed after 4 PM?"
A: {"bplus":{"used":true,"ranges":[{"start_time":"16:00:00","end_time":"23:59:59"}]},"trie":{"used":false,"keywords":[]},"heap":{"used":true,"top_k":10,"tags":{"CRITICAL":1000,"ERROR":500,"WARNING":100}}}

Example 9 — Raw unranked request:
Q: "List all logs between 11:20 and 11:30 without ranking"
A: {"bplus":{"used":true,"ranges":[{"start_time":"11:20:00","end_time":"11:30:00"}]},"trie":{"used":false,"keywords":[]},"heap":{"used":false,"top_k":0,"tags":{}}}

Example 10 — Multiple keywords, NO time (B+ Tree OFF):
Q: "Find authentication failures related to OAuth tokens"
A: {"bplus":{"used":false,"ranges":[]},"trie":{"used":true,"keywords":["authentication","oauth","token"]},"heap":{"used":true,"top_k":10,"tags":{"CRITICAL":1000,"ERROR":800,"WARNING":300}}}

════════════════════════════════════════════════════
SELF-CHECK (do this before outputting):
════════════════════════════════════════════════════
1. Did I set bplus.used=true? → Re-read the query: is there an actual clock time (HH:MM, H:MM AM/PM)? If not, change to false.
2. Did I set trie.used=true? → Are the keywords specific domain/service terms (not just "error"/"log")? If not, change to false.
3. Did I put domain terms in heap.tags? → Move them to trie.keywords.

User query: "${prompt}"

Output strictly valid JSON, no markdown, no explanation:`,
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

