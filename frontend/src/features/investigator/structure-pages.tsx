import { Network, GitBranch, Layers, CircleCheck } from "lucide-react";
import {
  AppShell,
  PageHeader,
  Panel,
  SectionHeading,
  TreeGraphic,
  Metric,
  LogTable,
  SeverityBadge,
} from "./components";
import { useInvestigationStore } from "./store";

export function BPlusPage() {
  const [store] = useInvestigationStore();
  const { result } = store;

  const used = result?.tool_call?.bplus?.used ?? false;
  const range = used && result?.tool_call?.bplus ? [result.tool_call.bplus.start_time, result.tool_call.bplus.end_time] : ["—", "—"];
  const metrics = result?.dsa_metrics?.find(m => m.name === "B+ Tree");
  const evidence = used && result?.evidence ? result.evidence : [];

  return (
    <AppShell>
      <PageHeader
        title="B+ Tree"
        subtitle="Ordered indexing and efficient range-based log retrieval"
      >
        <span className="header-state">
          <Network size={12} /> Timestamp index ready
        </span>
      </PageHeader>

      <div className="operation-grid mb-5" style={{ gridTemplateColumns: "1fr" }}>
        <Panel>
          <SectionHeading title="Timestamp index visualization">
            <span className="section-tag">SCALABLE · ZOOM/PAN SUPPORTED</span>
          </SectionHeading>
          <div className="visualization-body relative overflow-hidden cursor-move">
            <TreeGraphic type="bplus" large active={true} />
          </div>
          <div className="visualization-legend">
            <span className="legend-key">
              <span className="legend-square" /> Active retrieval path for current query
            </span>
            <span>{range.join(" → ")}</span>
          </div>
        </Panel>
      </div>

      <Stats
        items={[
          ["Search Performed", used ? "Yes" : "No"],
          ["Search Time", metrics ? `${metrics.time_ms.toFixed(3)} ms` : "—"],
          ["Nodes Accessed", metrics ? metrics.nodes_accessed : "—"],
          ["Results Found", metrics ? metrics.results_count : "—"],
        ]}
      />

      <div className="heap-bottom-grid mt-5">
        <Panel>
          <SectionHeading title="Data Structure Report & Findings">
            <Network size={14} className="text-primary" />
          </SectionHeading>
          <div className="operation-body">
            <div className="findings-title">Traversal Process</div>
            <p className="small-note mb-4">
              Navigated from root node down to leaf nodes covering the time range{" "}
              {range.join(" to ")}. {metrics?.nodes_accessed ?? "—"} nodes were accessed during this traversal.
            </p>
            <div className="findings-title">Key Findings</div>
            <ul className="findings-list">
              <li>
                <CircleCheck /> Found {metrics?.results_count ?? 0} logs in the specified range.
              </li>
              <li>
                <CircleCheck /> {used ? "Dynamically queried by C++ engine." : "Awaiting investigation."}
              </li>
            </ul>
          </div>
        </Panel>
        <Panel className="results-panel !mt-0">
          <SectionHeading title="Retrieved Logs">
            <span className="section-tag">
              {evidence.length} records · Retrieved by B+ Tree
            </span>
          </SectionHeading>
          <LogTable logs={evidence} />
        </Panel>
      </div>

      <Why title="Why B+ Tree?">
        Logs are naturally ordered by timestamp. The B+ Tree enables efficient ordered and
        range-based retrieval without scanning the entire log collection.
      </Why>
    </AppShell>
  );
}

export function TriePage() {
  const [store] = useInvestigationStore();
  const { result } = store;

  const used = result?.tool_call?.trie?.used ?? false;
  const terms = used && result?.tool_call?.trie ? result.tool_call.trie.keywords : [];
  const metrics = result?.dsa_metrics?.find(m => m.name === "Trie");
  const evidence = used && result?.evidence ? result.evidence : [];

  return (
    <AppShell>
      <PageHeader title="Trie" subtitle="Fast keyword, prefix and pattern-based log search">
        <span className="header-state">
          <GitBranch size={12} /> Pattern index ready
        </span>
      </PageHeader>

      <div className="operation-grid mb-5" style={{ gridTemplateColumns: "1fr" }}>
        <Panel>
          <SectionHeading title="Keyword index visualization">
            <span className="section-tag">SCALABLE · ZOOM/PAN SUPPORTED</span>
          </SectionHeading>
          <div className="visualization-body relative overflow-hidden cursor-move">
            <TreeGraphic type="trie" large active={true} term={terms[0] || "database"} />
          </div>
          <div className="visualization-legend">
            <span className="legend-key">
              <span className="legend-square" /> Matched search path for current query
            </span>
            <span>{terms.length > 0 ? terms.join(", ") : "—"}</span>
          </div>
        </Panel>
      </div>

      <Stats
        items={[
          ["Search Performed", used ? "Yes" : "No"],
          ["Search Time", metrics ? `${metrics.time_ms.toFixed(3)} ms` : "—"],
          ["Nodes Traversed", metrics ? metrics.nodes_accessed : "—"],
          ["Results Found", metrics ? metrics.results_count : "—"],
        ]}
      />

      <div className="heap-bottom-grid mt-5">
        <Panel>
          <SectionHeading title="Data Structure Report & Findings">
            <GitBranch size={14} className="text-primary" />
          </SectionHeading>
          <div className="operation-body">
            <div className="findings-title">Traversal Process</div>
            <p className="small-note mb-4">
              Traversed Trie paths for keywords: {terms.length > 0 ? terms.join(", ") : "—"}. {metrics?.nodes_accessed ?? "—"} nodes were accessed.
            </p>
            <div className="findings-title">Key Findings</div>
            <ul className="findings-list">
              <li>
                <CircleCheck /> Matched {terms.length} keywords across {metrics?.results_count ?? 0} logs in {metrics?.time_ms.toFixed(3) ?? "—"}ms.
              </li>
              <li>
                <CircleCheck /> {used ? "Dynamically queried by C++ engine." : "Awaiting investigation."}
              </li>
            </ul>
          </div>
        </Panel>
        <Panel className="results-panel !mt-0">
          <SectionHeading title="Matching log records">
            <span className="section-tag">
              {evidence.length} records · Matched by Trie
            </span>
          </SectionHeading>
          <LogTable logs={evidence} />
        </Panel>
      </div>

      <Why title="Why Trie?">
        Log messages contain recurring event names, error codes, service names and keywords. The
        Trie provides efficient prefix and pattern-oriented lookup.
      </Why>
    </AppShell>
  );
}

export function HeapPage() {
  const [store] = useInvestigationStore();
  const { result } = store;

  const used = result?.tool_call?.heap?.used ?? false;
  const k = used && result?.tool_call?.heap ? result.tool_call.heap.top_k : "—";
  const metrics = result?.dsa_metrics?.find(m => m.name === "Heap");
  const evidence = used && result?.evidence ? result.evidence : [];

  return (
    <AppShell>
      <PageHeader
        title="Priority Heap"
        subtitle="Prioritize the most critical and relevant log events"
      >
        <span className="header-state">
          <Layers size={12} /> Deterministic priority engine
        </span>
      </PageHeader>

      <div className="operation-grid mb-5" style={{ gridTemplateColumns: "1fr" }}>
        <Panel>
          <SectionHeading title="Max-heap visualization">
            <span className="section-tag">SCALABLE · ZOOM/PAN SUPPORTED</span>
          </SectionHeading>
          <div className="visualization-body relative overflow-hidden cursor-move">
            <TreeGraphic type="heap" large events={evidence.slice(0, 7)} />
          </div>
          <div className="visualization-legend">
            <span className="legend-key">
              <span className="legend-square" /> Severity + frequency + recency
            </span>
            <span>{metrics?.results_count ?? "—"} events processed in heap</span>
          </div>
        </Panel>
      </div>

      <Stats
        items={[
          ["Search Performed", used ? "Yes" : "No"],
          ["Processing Time", metrics ? `${metrics.time_ms.toFixed(3)} ms` : "—"],
          ["Nodes Sifted", metrics ? metrics.nodes_accessed : "—"],
          ["Top K Extracted", k],
        ]}
      />

      <div className="heap-bottom-grid mt-5">
        <Panel>
          <SectionHeading title="Heap Report & Findings">
            <Layers size={14} className="text-warning" />
          </SectionHeading>
          <div className="operation-body">
            <div className="findings-title">Prioritization Process</div>
            <p className="small-note mb-4">
              Sifted logs through the priority max-heap based on severity, frequency, and
              recency using deterministic scoring rules. {metrics?.nodes_accessed ?? "—"} heap sift operations performed.
            </p>
            <div className="findings-title">Key Findings</div>
            <ul className="findings-list">
              <li>
                <CircleCheck /> Extracted Top {evidence.length} most critical events in {metrics?.time_ms.toFixed(3) ?? "—"}ms.
              </li>
              <li>
                <CircleCheck /> {used ? "Dynamically queried by C++ engine." : "Awaiting investigation."}
              </li>
            </ul>
          </div>
        </Panel>
        <Panel className="results-panel !mt-0">
          <SectionHeading title="Top priority events">
            <span className="section-tag">Prioritized by Heap</span>
          </SectionHeading>
          <div className="top-events">
            {evidence.map((event, i) => (
              <div className="event-row" key={event.id}>
                <span className="event-rank">{String(i + 1).padStart(2, "0")}</span>
                <SeverityBadge severity={event.severity} />
                <div className="event-description">
                  {event.message}
                  <small>
                    {event.server} · {event.timestamp.slice(11)}
                  </small>
                </div>
                <span className="event-score">{event.priorityScore ?? "—"}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Why title="Why Heap?">
        A max-heap selects the most important events first using explicit, deterministic priority
        scores. Top-K retrieval focuses the investigation on the strongest evidence.
      </Why>
    </AppShell>
  );
}

function Stats({ items }: { items: [string, string | number][] }) {
  return (
    <div className="statistics-strip">
      {items.map(([label, value]) => (
        <Metric key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function Why({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="why-section">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
