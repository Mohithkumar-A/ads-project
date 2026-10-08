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
import { sampleLogs, topEvents, severityWeights, priorityScore } from "./mock-api";

const mockResult = {
  range: ["14:30:00", "14:35:00"],
  terms: ["database", "timeout", "connection"],
  retrieved: sampleLogs.slice(1, 10),
  matched: sampleLogs.slice(2, 8),
  evidence: sampleLogs.slice(2, 8),
};

export function BPlusPage() {
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
            <span>{mockResult.range.join(" → ")}</span>
          </div>
        </Panel>
      </div>

      <Stats
        items={[
          ["Total Indexed Records", "100,000"],
          ["Tree Height", 4],
          ["Number of Nodes", 128],
          ["Leaf Nodes", 96],
          ["Search Time", "3.8 ms"],
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
              {mockResult.range.join(" to ")}. 7 nodes were accessed during this traversal.
            </p>
            <div className="findings-title">Key Findings</div>
            <ul className="findings-list">
              <li>
                <CircleCheck /> Found 1,284 logs in the specified range.
              </li>
              <li>
                <CircleCheck /> Identified a cluster of critical errors at 14:32.
              </li>
            </ul>
          </div>
        </Panel>
        <Panel className="results-panel !mt-0">
          <SectionHeading title="Retrieved Logs">
            <span className="section-tag">
              {mockResult.retrieved.length} records · Retrieved by B+ Tree
            </span>
          </SectionHeading>
          <LogTable logs={mockResult.retrieved} />
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
            <TreeGraphic type="trie" large active={true} term="database" />
          </div>
          <div className="visualization-legend">
            <span className="legend-key">
              <span className="legend-square" /> Matched search path for current query
            </span>
            <span>database, timeout, connection</span>
          </div>
        </Panel>
      </div>

      <Stats
        items={[
          ["Indexed Terms", "8,492"],
          ["Trie Nodes", "24,108"],
          ["Maximum Depth", 18],
          ["Matching Patterns", 8],
          ["Search Time", "1.7 ms"],
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
              Traversed Trie paths for keywords: 'database', 'timeout', 'connection'. Matched 8
              unique patterns.
            </p>
            <div className="findings-title">Key Findings</div>
            <ul className="findings-list">
              <li>
                <CircleCheck /> Matched 'database' and 'timeout' across 342 logs in 1.7ms.
              </li>
              <li>
                <CircleCheck /> Most frequent pattern matched: 'database_unavailable'.
              </li>
            </ul>
          </div>
        </Panel>
        <Panel className="results-panel !mt-0">
          <SectionHeading title="Matching log records">
            <span className="section-tag">
              {mockResult.matched.length} records · Matched by Trie
            </span>
          </SectionHeading>
          <LogTable logs={mockResult.matched} />
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
  const topK = topEvents(sampleLogs, 10);

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
            <TreeGraphic type="heap" large events={topEvents(sampleLogs, 7)} />
          </div>
          <div className="visualization-legend">
            <span className="legend-key">
              <span className="legend-square" /> Severity + frequency + recency
            </span>
            <span>1,284 events in heap</span>
          </div>
        </Panel>
      </div>

      <Stats
        items={[
          ["Events in Heap", "1,284"],
          ["Maximum Priority", 97],
          ["Top K", 10],
          ["Processing Time", "2.1 ms"],
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
              Sifted 1,284 logs through the priority max-heap based on severity, frequency, and
              recency using deterministic scoring rules.
            </p>
            <div className="findings-title">Key Findings</div>
            <ul className="findings-list">
              <li>
                <CircleCheck /> Elevated DB-01 unavailable to Priority 1 based on CRITICAL severity.
              </li>
              <li>
                <CircleCheck /> Identified 3 CRITICAL events in the Top 10.
              </li>
            </ul>
          </div>
        </Panel>
        <Panel className="results-panel !mt-0">
          <SectionHeading title="Top priority events">
            <span className="section-tag">Prioritized by Heap</span>
          </SectionHeading>
          <div className="top-events">
            {topK.map((event, i) => (
              <div className="event-row" key={event.id}>
                <span className="event-rank">{String(i + 1).padStart(2, "0")}</span>
                <SeverityBadge severity={event.severity} />
                <div className="event-description">
                  {event.message}
                  <small>
                    {event.server} · {event.timestamp.slice(11)}
                  </small>
                </div>
                <span className="event-score">{priorityScore(event)}</span>
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
