import { useRef, useState, type FormEvent, type DragEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Upload,
  FileText,
  Trash2,
  Send,
  Database,
  Network,
  GitBranch,
  Layers,
  CircleCheck,
  Clock3,
  Cpu,
  AlertTriangle,
  Check,
  Loader2,
  Workflow,
  Code2,
  Sparkles,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AppShell,
  PageHeader,
  Panel,
  SectionHeading,
  Metric,
  Pipeline,
  SeverityBadge,
  LogTable,
} from "./components";
import {
  initialLogText,
  sampleLogs,
  parseLogs,
  mockApi,
  type InvestigationResult,
} from "./mock-api";
import { useInvestigationStore } from "./store";

const firstQuestion = "Why did the database fail between 2:30 PM and 2:35 PM?";
const steps = [
  "Query interpreted",
  "B+ Tree search completed",
  "Trie search completed",
  "Heap prioritization completed",
  "Evidence selected",
  "Analysis generated",
];

export function Dashboard() {
  const [store, setStore] = useInvestigationStore();
  const { text, sample, question, result, history, processing, step, asked } = store;

  const [isDragging, setIsDragging] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  const logs = parseLogs(text);

  const stats = sample
    ? ["100,000", "5", "12", "2,341", "184"]
    : [
        String(logs.length),
        String(new Set(logs.map((l) => l.server)).size),
        String(new Set(logs.map((l) => l.service)).size),
        String(logs.filter((l) => l.severity === "ERROR").length),
        String(logs.filter((l) => l.severity === "CRITICAL").length),
      ];

  async function investigate(q: string) {
    if (!q.trim() || processing) return;
    if (!logs.length) {
      toast.error("Add valid log records before investigating.");
      return;
    }

    setStore({ asked: q, question: "", processing: true, step: 0, result: null });

    for (let i = 1; i <= 5; i++) {
      await new Promise((r) => setTimeout(r, 280));
      setStore({ step: i });
    }

    const next = await mockApi.investigate(logs, q);
    setStore({ result: next, history: [...history, next], step: 6, processing: false });
    toast.success("Investigation complete · evidence selected");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void investigate(question);
  }

  function updateDataset(value: string, isSample = false) {
    setStore({ text: value, sample: isSample, result: null, history: [] });
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }
  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const content = await file.text();
    updateDataset(content);
    toast.success(`${file.name} loaded`);
  }

  return (
    <AppShell>
      <PageHeader
        title="AI-Powered System Log Investigation Engine"
        subtitle="Efficient log investigation using B+ Tree, Trie and Heap with local LLM-assisted analysis."
      >
        <span className="header-state">
          <span className="status-dot" /> Engine ready
        </span>
      </PageHeader>

      <div className="dashboard-input-grid">
        <Panel>
          <SectionHeading number="1" title="Log Input / Dataset">
            <span className="section-tag">
              <Database size={11} /> Dataset loaded
            </span>
          </SectionHeading>

          <div
            className="editor-wrap"
            style={{
              border: isDragging ? "2px dashed var(--primary)" : "1px solid var(--border)",
              position: "relative",
              transition: "all 0.2s",
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div
                className="drag-overlay"
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "oklch(0 0 0 / 70%)",
                  zIndex: 10,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  gap: "12px",
                  borderRadius: "8px",
                }}
              >
                <Inbox size={48} className="text-primary" />
                <h3>Drop log file here</h3>
              </div>
            )}

            <div className="editor-topbar">
              <span>
                <FileText size={10} /> system_logs.log
              </span>
              <span>PLAIN TEXT · UTF-8</span>
            </div>
            <div className="log-editor">
              <div className="line-numbers">
                {text
                  .split("\n")
                  .slice(0, 20)
                  .map((_, i) => (
                    <div key={i}>{String(i + 1).padStart(2, "0")}</div>
                  ))}
              </div>
              <textarea
                aria-label="Log dataset"
                value={text}
                onChange={(e) => updateDataset(e.target.value)}
                spellCheck={false}
                wrap="off"
                placeholder="Paste timestamped system logs, or drag and drop a log file here..."
              />
            </div>
          </div>

          <div className="dataset-controls">
            <Button
              variant="outline"
              size="sm"
              disabled={processing}
              onClick={() => upload.current?.click()}
            >
              <Upload />
              Upload Log
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={processing}
              onClick={() => {
                updateDataset(initialLogText, true);
                toast.success("Sample dataset loaded");
              }}
            >
              <Database />
              Load Sample Dataset
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="clear-button"
              disabled={processing}
              onClick={() => {
                updateDataset("");
                toast("Dataset cleared");
              }}
            >
              <Trash2 />
              Clear
            </Button>
            <input
              type="file"
              accept=".log,.txt,.csv"
              hidden
              ref={upload}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                updateDataset(await file.text());
                toast.success(`${file.name} loaded`);
                e.target.value = "";
              }}
            />
          </div>
          <div className="dataset-metrics">
            {["Total Logs", "Servers", "Services", "Errors", "Critical Events"].map((label, i) => (
              <Metric
                key={label}
                label={label}
                value={
                  <span className={i === 3 ? "text-warning" : i === 4 ? "text-destructive" : ""}>
                    {stats[i]}
                  </span>
                }
              />
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeading number="2" title="Ask Your Question">
            <span className="section-tag">
              <Cpu size={11} /> Local LLM-assisted
            </span>
          </SectionHeading>

          <div className="conversation">
            <div className="conversation-caption">
              <span className="status-dot" /> INVESTIGATION SESSION{" "}
              <span>
                · {history.length || 1} query{history.length > 1 ? "ies" : ""}
              </span>
            </div>
            {history.slice(-2, -1).map((h, i) => (
              <div className="conversation-caption" key={i}>
                {h.question} · {h.evidence.length} evidence records
              </div>
            ))}
            <div className="question-message">{asked || "Awaiting input..."}</div>
            <div className="response-row">
              <span className="response-icon">
                <Network size={14} />
              </span>
              <div className="response-content">
                <div className="response-label">
                  Investigation engine{" "}
                  <span>{processing ? "Processing query" : "Evidence-based response"}</span>
                </div>
                {processing ? (
                  <>
                    <div className="progress-list">
                      {steps.map((s, i) => (
                        <div key={s} className={step > i ? "complete" : ""}>
                          {step > i ? <Check size={10} /> : <Clock3 size={10} />} {s}
                        </div>
                      ))}
                    </div>
                    <div className="processing-text">
                      <Loader2 size={11} className="spin" />
                      {step >= 5
                        ? "Generating analysis…"
                        : "Retrieving and prioritizing log evidence…"}
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      {result
                        ? `I ${result.evidence.length ? "identified" : "found no"} ${result.evidence.length ? "a relevant event sequence" : "matching events"} using the selected algorithms. ${result.dsa_metrics.heap.used ? "The priority heap selected the most important evidence for analysis." : ""}`
                        : "Ready for a new investigation."}
                    </p>
                    {result && (
                      <div className="response-chips">
                        {result.dsa_metrics.bplus.used && <span>B+ Tree retrieval</span>}
                        {result.dsa_metrics.trie.used && <span>Trie matching</span>}
                        {result.dsa_metrics.heap.used && <span>Heap prioritization</span>}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="suggestions">
            <Button
              variant="outline"
              size="sm"
              disabled={processing}
              onClick={() => void investigate("Show me the most critical events from DB-01.")}
            >
              <Layers size={11} /> Critical DB-01 events
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={processing}
              onClick={() => void investigate("Find all connection timeout events.")}
            >
              <Clock3 size={11} /> Connection timeouts
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={processing}
              onClick={() => void investigate("What caused the authentication failures?")}
            >
              Auth failures
            </Button>
          </div>

          <div className="question-form-wrap">
            <form className="question-form" onSubmit={submit}>
              <input
                aria-label="Investigation question"
                placeholder="Ask a question about your logs..."
                value={question}
                onChange={(e) => setStore({ question: e.target.value })}
                disabled={processing}
              />
              <Button
                type="submit"
                aria-label="Send question"
                disabled={processing || !question.trim()}
                className="send-button"
              >
                {processing ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
              </Button>
            </form>
          </div>
        </Panel>
      </div>

      <div className="pipeline-section">
        <div className="pipeline-heading">
          <Workflow size={12} /> INVESTIGATION PIPELINE <span>ADS-POWERED · EVIDENCE-FIRST</span>
        </div>
        <Pipeline step={step} processing={processing} />
      </div>

      <section className="ads-section">
        <div className="standalone-heading">
          <h2>
            <span className="section-number">3</span>Data Structure Results
          </h2>
          <span>
            Core retrieval engine <span className="footer-divider">·</span>{" "}
            {processing ? "Processing…" : "All operations completed"}
          </span>
        </div>
        <div className="ads-grid">
          <StructureCard
            type="bplus"
            title="B+ Tree"
            subtitle="Time & Index Search"
            to="/bplustree"
            query={<>{result?.range.join(" → ") ?? "—"}</>}
            metrics={[
              ["Nodes accessed", result ? "7" : "—"],
              ["Logs retrieved", result ? String(result.dsa_metrics.bplus.logs_retrieved) : "—"],
              ["Search time", result ? result.dsa_metrics.bplus.time : "—"],
              ["Tree height", "4"],
            ]}
            active={Boolean(result && result.dsa_metrics.bplus.used)}
            processing={processing}
            used={!result || result.dsa_metrics.bplus.used}
          />
          <StructureCard
            type="trie"
            title="Trie"
            subtitle="Keyword & Pattern Search"
            to="/trie"
            query={
              result?.terms.map((t) => (
                <span key={t} className="term-chip">
                  {t}
                </span>
              )) ?? "—"
            }
            metrics={[
              ["Logs matched", result ? String(result.dsa_metrics.trie.logs_matched) : "—"],
              ["Matching patterns", result ? "8" : "—"],
              ["Search time", result ? result.dsa_metrics.trie.time : "—"],
              ["Indexed terms", "8,492"],
            ]}
            active={Boolean(result && result.dsa_metrics.trie.used)}
            processing={processing}
            used={!result || result.dsa_metrics.trie.used}
          />
          <StructureCard
            type="heap"
            title="Priority Heap"
            subtitle="Critical Event Prioritization"
            to="/heap"
            query={
              <span>
                Top K selection <span className="text-muted-foreground">· Max-heap</span>
              </span>
            }
            metrics={[
              [
                "Events considered",
                result ? String(result.dsa_metrics.heap.events_considered) : "—",
              ],
              ["Top K", result ? String(result.dsa_metrics.heap.top_k) : "10"],
              [
                "Highest severity",
                result?.evidence.length ? (
                  <SeverityBadge
                    severity={
                      result.evidence.some((l) => l.severity === "CRITICAL") ? "CRITICAL" : "ERROR"
                    }
                  />
                ) : (
                  "—"
                ),
              ],
              ["Processing time", result ? result.dsa_metrics.heap.time : "—"],
            ]}
            active={Boolean(result && result.dsa_metrics.heap.used)}
            processing={processing}
            used={!result || result.dsa_metrics.heap.used}
          />
        </div>
      </section>

      <Panel className="analysis-section">
        <SectionHeading number="4" title="AI Analysis & Final Results">
          <span className="analysis-heading-meta">
            <Sparkles size={11} /> Local LLM · Evidence-grounded
          </span>
        </SectionHeading>
        {result ? (
          <div className="analysis-main" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <div className="incident-label">INCIDENT SUMMARY</div>
              <h3 className="incident-title">
                <AlertTriangle />
                {result.summary}
              </h3>
              <p
                style={{
                  fontSize: "11px",
                  lineHeight: "1.7",
                  color: "var(--muted-foreground)",
                  marginTop: "10px",
                  marginBottom: "18px",
                }}
              >
                The system experienced a sudden spike in connection timeouts starting at{" "}
                {result.evidence[0]?.timestamp.slice(11) ?? "14:32:03"}, which rapidly escalated
                into full connection failures. Repeated retry attempts were unsuccessful, ultimately
                leading to the database becoming completely unavailable and cascading failures in
                API requests.
              </p>
              <div className="findings-title">Key findings</div>
              <ul className="findings-list">
                {result.findings.map((f) => (
                  <li key={f}>
                    <CircleCheck />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="idle-analysis">
            {processing ? <Loader2 size={23} className="spin" /> : <Network size={23} />}
            <p>{processing ? "Investigation in progress…" : "Awaiting investigation results"}</p>
          </div>
        )}
      </Panel>
    </AppShell>
  );
}

function StructureCard({
  type,
  title,
  subtitle,
  to,
  query,
  metrics,
  active,
  processing,
  used = true,
}: {
  type: "bplus" | "trie" | "heap";
  title: string;
  subtitle: string;
  to: string;
  query: React.ReactNode;
  metrics: [string, React.ReactNode][];
  active: boolean;
  processing: boolean;
  used?: boolean;
}) {
  const Icon = type === "bplus" ? Network : type === "trie" ? GitBranch : Layers;

  return (
    <Link
      to={to}
      className="panel ads-card"
      style={{ opacity: used ? 1 : 0.4, filter: used ? "none" : "grayscale(100%)" }}
    >
      <div className="ads-card-title">
        <span className={`structure-icon structure-${type}`}>
          <Icon size={17} />
        </span>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <ArrowUpRight className="card-arrow" />
      </div>
      <div className="ads-query">
        <span>
          {type === "bplus" ? "RANGE SEARCH" : type === "trie" ? "SEARCH TERMS" : "PRIORITY QUERY"}
        </span>
        {used ? query : <span style={{ color: "var(--muted-foreground)" }}>Bypassed by LLM</span>}
      </div>
      <div className="ads-metrics">
        {metrics.map(([label, value]) => (
          <Metric key={label} label={label} value={used ? value : "—"} />
        ))}
      </div>
      <div className="ads-card-footer">
        <span>
          {processing && used ? <Loader2 size={9} className="spin" /> : <CircleCheck size={9} />}{" "}
          {processing && used
            ? "Processing"
            : used
              ? active
                ? "Search completed"
                : "Ready"
              : "Not required"}
        </span>
        <span>Explore structure →</span>
      </div>
    </Link>
  );
}
