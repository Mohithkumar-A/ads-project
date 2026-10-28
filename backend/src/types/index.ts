// ─────────────────────────────────────────────────────────────
// Shared type definitions for the backend orchestrator
// ─────────────────────────────────────────────────────────────

/** Dynamic log severity tag (extracted via string slicing, no hardcoded enums) */
export type Severity = string;

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

/** B+ Tree traversal path from C++ engine */
export interface BPlusTraceNode {
  id: string;
  type: "root" | "internal" | "leaf";
  keys: string[];
  matched_keys: string[];
  chosen_branch: number;
}

export interface BPlusTraceEdge {
  from: string;
  to: string;
  label: string;
}

export interface BPlusRangeSearchTrace {
  start_time: string;
  end_time: string;
  nodes_accessed: number;
  results_count: number;
  nodes: BPlusTraceNode[];
  edges: BPlusTraceEdge[];
}

export interface BPlusTraversalPath {
  type: "bplus";
  nodes: BPlusTraceNode[];
  edges: BPlusTraceEdge[];
  searches?: BPlusRangeSearchTrace[];
}

/** Trie traversal path from C++ engine */
export interface TrieTraceStep {
  char: string;
  found: boolean;
  depth: number;
}

export interface TrieKeywordTrace {
  keyword: string;
  terminal_hit: boolean;
  matches_count: number;
  steps: TrieTraceStep[];
}

export interface TrieTraversalPath {
  type: "trie";
  keyword_traces: TrieKeywordTrace[];
}

/** Heap traversal path from C++ engine */
export interface HeapSiftStep {
  index: number;
  label: string;
  left_child_score: number;
  right_child_score: number;
  swapped: boolean;
  swapped_with: number;
}

export interface HeapExtractionTrace {
  rank: number;
  extracted_severity: string;
  extracted_server: string;
  extracted_score: number;
  sift_path: HeapSiftStep[];
}

export interface HeapNodeInfo {
  index: number;
  severity: string;
  server: string;
  score: number;
  message: string;
}

export interface HeapTraversalPath {
  type: "heap";
  total_heap_size: number;
  initial_nodes?: HeapNodeInfo[];
  extractions: HeapExtractionTrace[];
}

export type DSATraversalPath = BPlusTraversalPath | TrieTraversalPath | HeapTraversalPath;

/** Performance metrics returned by the C++ engine for each DSA */
export interface DSAMetrics {
  name: string;
  used: boolean;
  time_ms: number;
  nodes_accessed: number;
  results_count: number;
  traversal_path?: DSATraversalPath;
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
  root_cause: string;
  possible_fix: string;
  key_findings: string[];
  evidence: LogRecord[];
  dsa_metrics: DSAMetrics[];
  tool_call: AgentToolCall;
  processing_time_ms: number;
  // Enhanced dual-perspective fields
  non_technical_summary?: string;
  technical_root_cause?: string;
  immediate_mitigation?: string;
  permanent_fix?: string;
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
