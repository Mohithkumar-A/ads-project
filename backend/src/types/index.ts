// ─────────────────────────────────────────────────────────────
// Shared type definitions for the backend orchestrator
// ─────────────────────────────────────────────────────────────

/** Severity levels matching the log format */
export type Severity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

/** A single parsed log record (mirrors the frontend LogRecord) */
export interface LogRecord {
  id: number;
  timestamp: string;
  severity: Severity;
  server: string;
  message: string;
  service: string;
  frequency: number;
  recency: number;
}

// ─────────────────────────────────────────────────────────────
// LLM Agent Types (Phase 1 — Tool Routing)
// ─────────────────────────────────────────────────────────────

/** Parameters the LLM extracts for B+ Tree range search */
export interface BPlusParams {
  used: boolean;
  ranges: Array<{
    start_time: string;
    end_time: string;
  }>;
}

/** Parameters the LLM extracts for Trie keyword search */
export interface TrieParams {
  used: boolean;
  keywords: string[];
}

/** Parameters the LLM extracts for Heap priority ranking */
export interface HeapParams {
  used: boolean;
  top_k: number;
  tags: Record<string, number>;
}

/** The complete tool-call schema that Phase 1 LLM returns */
export interface AgentToolCall {
  bplus: BPlusParams;
  trie: TrieParams;
  heap: HeapParams;
}

// ─────────────────────────────────────────────────────────────
// C++ Engine Types (Input / Output)
// ─────────────────────────────────────────────────────────────

/** Performance metrics returned by the C++ engine for each DSA */
export interface DSAMetrics {
  name: string;
  used: boolean;
  time_ms: number;
  nodes_accessed: number;
  results_count: number;
}

/** The full JSON output schema from the C++ engine's stdout */
export interface EngineResult {
  evidence: LogRecord[];
  dsa_metrics: DSAMetrics[];
}

// ─────────────────────────────────────────────────────────────
// API Response (sent back to the React frontend)
// ─────────────────────────────────────────────────────────────

/** The final payload the frontend receives */
export interface InvestigationResponse {
  summary: string;
  key_findings: string[];
  evidence: LogRecord[];
  dsa_metrics: DSAMetrics[];
  tool_call: AgentToolCall;
  processing_time_ms: number;
}

/** Shape of the request body from the frontend */
export interface InvestigateRequestBody {
  prompt: string;
  logText?: string; // raw pasted text
}

/** Error response shape */
export interface ErrorResponse {
  error: string;
  details?: string;
}
