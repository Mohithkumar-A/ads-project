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
export type InvestigationResult = {
  question: string;
  terms: string[];
  retrieved: LogRecord[];
  matched: LogRecord[];
  evidence: LogRecord[];
  summary: string;
  findings: string[];
  range: [string, string];
  dsa_metrics: {
    bplus: { used: boolean; time: string; logs_retrieved: number };
    trie: { used: boolean; time: string; logs_matched: number };
    heap: { used: boolean; time: string; events_considered: number; top_k: number };
  };
};
const delay = (ms = 350) => new Promise<void>((resolve) => setTimeout(resolve, ms));
// Mock REST adapter: replace these method bodies with fetch calls to the endpoint map.
export const endpoints = {
  logs: "/api/logs",
  investigation: "/api/investigation",
  bplustree: "/api/bplustree",
  trie: "/api/trie",
  heap: "/api/heap",
};
export const mockApi = {
  async range(logs: LogRecord[], start: string, end: string) {
    await delay();
    return rangeRecords(logs, start, end);
  },
  async trie(logs: LogRecord[], term: string, prefix = false) {
    await delay();
    return {
      logs: searchRecords(logs, term),
      patterns: indexedTerms.filter((t) =>
        prefix ? t.startsWith(term.toLowerCase()) : t.includes(term.toLowerCase()),
      ),
    };
  },
  async heap(logs: LogRecord[], k: number) {
    await delay();
    return topEvents(logs, k);
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
        terms: data.tool_call?.trie?.keywords || [],
        retrieved: data.evidence || [],
        matched: data.evidence || [],
        evidence: data.evidence || [],
        summary: data.summary || "No summary provided.",
        findings: data.key_findings || [],
        range: [
          data.tool_call?.bplus?.start_time || "00:00:00", 
          data.tool_call?.bplus?.end_time || "23:59:59"
        ],
        dsa_metrics: {
          bplus: { 
            used: Boolean(bplusMetric.used), 
            time: `${bplusMetric.time_ms || 0} ms`, 
            logs_retrieved: bplusMetric.results_count || 0 
          },
          trie: { 
            used: Boolean(trieMetric.used), 
            time: `${trieMetric.time_ms || 0} ms`, 
            logs_matched: trieMetric.results_count || 0 
          },
          heap: { 
            used: Boolean(heapMetric.used), 
            time: `${heapMetric.time_ms || 0} ms`, 
            events_considered: heapMetric.nodes_accessed || 0, 
            top_k: data.tool_call?.heap?.top_k || 10 
          },
        },
      };
    } catch (err) {
      console.error("Investigation failed:", err);
      throw err; // Re-throw to be caught by the Dashboard toast
    }
  },
};
