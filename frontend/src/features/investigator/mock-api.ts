export type Severity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";
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
export const severityWeights: Record<Severity, number> = {
  CRITICAL: 10,
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
  severity: row[3] as Severity,
  message: String(row[4]),
  frequency: Number(row[5]),
  recency: Number(row[6]),
}));
export const logText = (logs: LogRecord[]) =>
  logs.map((l) => `${l.timestamp} [${l.severity}] ${l.server} ${l.message}`).join("\n");
export const initialLogText = logText(sampleLogs.slice(1, 8));
export function parseLogs(text: string): LogRecord[] {
  return text.split("\n").flatMap((line, i) => {
    const m = line.match(
      /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+\[(INFO|WARNING|ERROR|CRITICAL)\]\s+(\S+)\s+(.+)$/,
    );
    if (!m) return [];
    const [, timestamp, severityStr, server, message] = m as unknown as [
      string,
      string,
      Severity,
      string,
      string,
    ];
    return [
      {
        id: i + 1,
        timestamp,
        severity: severityStr,
        server,
        message,
        service: server.startsWith("DB")
          ? "Database"
          : server.startsWith("AUTH")
            ? "Auth"
            : server.startsWith("API")
              ? "API"
              : "Web",
        frequency: Math.min(i + 1, 8),
        recency: Math.min(i + 1, 7),
      },
    ];
  });
}
export function rangeRecords(logs: LogRecord[], start: string, end: string) {
  return logs.filter((l) => l.timestamp.slice(11) >= start && l.timestamp.slice(11) <= end);
}
export function searchRecords(logs: LogRecord[], term: string) {
  const q = term.toLowerCase().trim();
  return q
    ? logs.filter((l) =>
        `${l.message} ${l.service} ${l.server} ${l.severity}`.toLowerCase().includes(q),
      )
    : [];
}
export function priorityScore(log: LogRecord) {
  return severityWeights[log.severity] + log.frequency + log.recency;
}
export function topEvents(logs: LogRecord[], k: number) {
  return [...logs].sort((a, b) => priorityScore(b) - priorityScore(a)).slice(0, Math.max(0, k));
}
export const indexedTerms = [
  "database",
  "database_timeout",
  "database_connection",
  "database_failed",
  "database_unavailable",
  "authentication",
  "authentication_failure",
  "connection",
  "connection_timeout",
  "connection_failed",
  "error",
  "error_timeout",
  "request",
  "request_failed",
];
export interface BPlusParams {
  used: boolean;
  start_time: string;
  end_time: string;
}

export interface TrieParams {
  used: boolean;
  keywords: string[];
}

export interface HeapParams {
  used: boolean;
  top_k: number;
}

export interface AgentToolCall {
  bplus: BPlusParams;
  trie: TrieParams;
  heap: HeapParams;
}

export interface DSAMetrics {
  name: string;
  used: boolean;
  time_ms: number;
  nodes_accessed: number;
  results_count: number;
}

export type InvestigationResult = {
  question: string;
  summary: string;
  key_findings: string[];
  evidence: LogRecord[];
  dsa_metrics: DSAMetrics[];
  tool_call: AgentToolCall;
  processing_time_ms: number;
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
  async range(logs: LogRecord[], start: string, end: string) {
    try {
      const response = await fetch(`${API_BASE}/api/bplustree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logText: logText(logs),
          start_time: start,
          end_time: end,
        }),
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      return (data.evidence ?? []) as LogRecord[];
    } catch {
      // Fallback to local JS if backend is unreachable
      return rangeRecords(logs, start, end);
    }
  },
  async trie(logs: LogRecord[], term: string, _prefix = false) {
    try {
      const response = await fetch(`${API_BASE}/api/trie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logText: logText(logs),
          keyword: term,
        }),
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      return {
        logs: (data.evidence ?? []) as LogRecord[],
        patterns: indexedTerms.filter((t) =>
          t.includes(term.toLowerCase()),
        ),
      };
    } catch {
      // Fallback to local JS if backend is unreachable
      return {
        logs: searchRecords(logs, term),
        patterns: indexedTerms.filter((t) =>
          t.includes(term.toLowerCase()),
        ),
      };
    }
  },
  async heap(logs: LogRecord[], k: number) {
    try {
      const response = await fetch(`${API_BASE}/api/heap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logText: logText(logs),
          k,
        }),
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      return (data.evidence ?? []) as LogRecord[];
    } catch {
      // Fallback to local JS if backend is unreachable
      return topEvents(logs, k);
    }
  },
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
      
      const bplusMetric = data.dsa_metrics?.find((m: any) => m.name === "B+ Tree") || {};
      const trieMetric = data.dsa_metrics?.find((m: any) => m.name === "Trie") || {};
      const heapMetric = data.dsa_metrics?.find((m: any) => m.name === "Heap") || {};
      
      return {
        question,
        tool_call: data.tool_call,
        evidence: data.evidence || [],
        summary: data.summary || "No summary provided.",
        key_findings: data.key_findings || [],
        dsa_metrics: data.dsa_metrics || [],
        processing_time_ms: data.processing_time_ms || 0,
      };
    } catch (err) {
      console.error("Investigation failed:", err);
      throw err; // Re-throw to be caught by the Dashboard toast
    }
  },
};
