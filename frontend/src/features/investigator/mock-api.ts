export type Severity = string;
export type LogRecord = {
  id: number;
  timestamp: string;
  server: string;
  service: string;
  severity: Severity;
  message: string;
  frequency: number;
  recency: number;
  priorityScore?: number;
};
export const severityWeights: Record<string, number> = {
  CRITICAL: 10,
  FATAL: 10,
  ERROR: 7,
  WARNING: 4,
  INFO: 1,
};
export const sampleLogs: LogRecord[] = [
  ["14:29:42", "AUTH-01", "Auth", "WARNING", "Authentication retry threshold reached", 2, 1],
  ["14:32:01", "WEB-01", "Web", "INFO", "Request received /api/users", 1, 1],
  ["14:32:03", "DB-01", "Database", "ERROR", "Connection timeout", 5, 2],
  ["14:32:05", "DB-01", "Database", "ERROR", "Connection failed", 6, 3],
  ["14:32:08", "DB-01", "Database", "WARNING", "Retry attempt 1", 4, 4],
  ["14:32:12", "DB-01", "Database", "ERROR", "Connection failed", 7, 5],
  ["14:32:15", "DB-01", "Database", "CRITICAL", "Database unavailable", 8, 6],
  ["14:32:18", "API-01", "API", "ERROR", "Database request failed", 5, 7],
  ["14:33:02", "AUTH-01", "Auth", "ERROR", "Authentication failure: token expired", 3, 4],
  ["14:34:10", "DB-02", "Database", "CRITICAL", "Database connection pool exhausted", 6, 5],
  ["14:36:11", "WEB-02", "Web", "INFO", "Health check succeeded", 1, 3],
  ["14:37:00", "API-02", "API", "WARNING", "Response latency exceeded 500ms", 3, 2],
].map((row, i) => ({
  id: i + 1,
  timestamp: `2026-10-08 ${row[0]}`,
  server: String(row[1]),
  service: String(row[2]),
  severity: String(row[3]),
  message: String(row[4]),
  frequency: Number(row[5]),
  recency: Number(row[6]),
}));
export const logText = (logs: LogRecord[]) =>
  logs.map((l) => `${l.timestamp} [${l.severity}] ${l.server} ${l.message}`).join("\n");
export const initialLogText = logText(sampleLogs.slice(1, 8));
export function parseLogs(text: string): LogRecord[] {
  return text.split("\n").flatMap((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return [];

    // String slicing: locate opening and closing delimiters '[' and ']' near timestamp
    const bracketOpen = trimmed.indexOf("[");
    const bracketClose = bracketOpen !== -1 ? trimmed.indexOf("]", bracketOpen) : -1;
    if (bracketOpen === -1 || bracketClose === -1) return [];

    const timestamp = trimmed.substring(0, bracketOpen).trim();
    const severityStr = trimmed.substring(bracketOpen + 1, bracketClose).trim();
    const afterBracket = trimmed.substring(bracketClose + 1).trim();
    if (!afterBracket) return [];

    const spaceIndex = afterBracket.search(/\s/);
    const server = spaceIndex !== -1 ? afterBracket.substring(0, spaceIndex).trim() : afterBracket;
    const message = spaceIndex !== -1 ? afterBracket.substring(spaceIndex + 1).trim() : "";

    // Dynamic service derivation from server token prefix
    const delimIndex = server.search(/[-_]/);
    const rawPrefix = delimIndex !== -1 ? server.substring(0, delimIndex) : server;
    const service = rawPrefix.toUpperCase() === "DB"
      ? "Database"
      : rawPrefix.charAt(0).toUpperCase() + rawPrefix.slice(1).toLowerCase();

    return [
      {
        id: i + 1,
        timestamp,
        severity: severityStr,
        server,
        message,
        service,
        frequency: Math.min(i + 1, 8),
        recency: i + 1,
      },
    ];
  });
}

export interface BPlusParams {
  used: boolean;
  ranges: Array<{
    start_time: string;
    end_time: string;
  }>;
}

export interface TrieParams {
  used: boolean;
  keywords: string[];
}

export interface HeapParams {
  used: boolean;
  top_k: number;
  tags: Record<string, number>;
}

export interface AgentToolCall {
  bplus: BPlusParams;
  trie: TrieParams;
  heap: HeapParams;
}

// ── Traversal path types (from C++ engine) ──────────────────

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

export interface BPlusTraversalPath {
  type: "bplus";
  nodes: BPlusTraceNode[];
  edges: BPlusTraceEdge[];
}

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

export interface DSAMetrics {
  name: string;
  used: boolean;
  time_ms: number;
  nodes_accessed: number;
  results_count: number;
  traversal_path?: DSATraversalPath;
}

export type InvestigationResult = {
  question: string;
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
};
// REST adapter: methods call the backend C++ engine, with local JS fallbacks.
export const endpoints = {
  logs: "/api/logs",
  investigation: "/api/investigation",
  bplustree: "/api/bplustree",
  trie: "/api/trie",
  heap: "/api/heap",
};
const API_BASE = "http://localhost:3001";
export const mockApi = {
  async investigate(logs: LogRecord[], question: string): Promise<InvestigationResult> {
    try {
      const response = await fetch("http://localhost:3001/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: question,
          logText: logText(logs),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      return {
        question,
        tool_call: data.tool_call,
        evidence: data.evidence || [],
        summary: data.summary || "No summary provided.",
        root_cause: data.root_cause || "Not identified.",
        possible_fix: data.possible_fix || "No fix suggested.",
        key_findings: data.key_findings || [],
        dsa_metrics: data.dsa_metrics || [],
        processing_time_ms: data.processing_time_ms || 0,
        non_technical_summary: data.non_technical_summary,
        technical_root_cause: data.technical_root_cause,
        immediate_mitigation: data.immediate_mitigation,
        permanent_fix: data.permanent_fix,
      };
    } catch (err) {
      console.error("Investigation failed:", err);
      throw err; // Re-throw to be caught by the Dashboard toast
    }
  },
};
