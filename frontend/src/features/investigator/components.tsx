import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  Network,
  GitBranch,
  Layers,
  Terminal,
  CircleCheck,
  Cpu,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { LogRecord } from "./mock-api";
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const nav = [
    { to: "/", name: "Investigation", icon: Activity },
    { to: "/bplustree", name: "B+ Tree", icon: Network },
    { to: "/trie", name: "Trie", icon: GitBranch },
    { to: "/heap", name: "Heap", icon: Layers },
  ] as const;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <Link to="/" className="brand">
          <span className="brand-icon">
            <Terminal size={21} />
          </span>
          <span>
            <strong>LOG INVESTIGATOR</strong>
            <small>Advanced Log Analysis Engine</small>
          </span>
        </Link>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className={`nav-item ${pathname === n.to ? "nav-active" : ""}`}
            >
              <n.icon size={18} />
              {n.name}
              {pathname === n.to && <span className="active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-core">
          <span className="eyebrow">BUILT ON DATA STRUCTURES</span>
          <div>
            <Network size={14} /> B+ Tree <span>Indexed retrieval</span>
          </div>
          <div>
            <GitBranch size={14} /> Trie <span>Pattern search</span>
          </div>
          <div>
            <Layers size={14} /> Heap <span>Event priority</span>
          </div>
        </div>
        <div className="sidebar-footer">
          <span className="status-dot" /> System operational{" "}
          <small>v1.0.0 · Local environment</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <PanelLeftClose /> : <PanelLeftOpen />}
            </Button>
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{nav.find((n) => n.to === pathname)?.name ?? "Investigation"}</strong>
          </div>
          <div className="topbar-status">
            <span className="local-badge">
              <span className="status-dot" /> Local engine
            </span>
          </div>
        </header>
        <main className="page-content">{children}</main>
        <footer className="workspace-footer">
          <span>
            <span className="status-dot" /> All systems ready
          </span>
          <span>
            Advanced Data Structures Project <span className="footer-divider">/</span> 2026
          </span>
        </footer>
      </div>
    </div>
  );
}
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">ADVANCED DATA STRUCTURES · LOG INTELLIGENCE</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
export function SectionHeading({
  number,
  title,
  children,
}: {
  number?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <h2>
        {number && <span className="section-number">{number}</span>}
        {title}
      </h2>
      {children}
    </div>
  );
}
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}
export function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
export function SeverityBadge({ severity }: { severity: string }) {
  return <span className={`severity severity-${severity.toLowerCase()}`}>{severity}</span>;
}
export function LogTable({ logs, priority = false }: { logs: LogRecord[]; priority?: boolean }) {
  return (
    <div className="table-scroll">
      <table className="log-table">
        <thead>
          <tr>
            {priority && <th>Rank</th>}
            <th>Timestamp</th>
            <th>Server</th>
            <th>Severity</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l, i) => (
            <tr key={l.id}>
              {priority && <td>{String(i + 1).padStart(2, "0")}</td>}
              <td>{l.timestamp.slice(11)}</td>
              <td>{l.server}</td>
              <td>
                <SeverityBadge severity={l.severity} />
              </td>
              <td>{l.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!logs.length && <div className="empty-state">No matching log records</div>}
    </div>
  );
}
export function TreeGraphic({
  type = "bplus",
  large = false,
  active = true,
  term = "",
  events = [],
  range = [],
  keywords = [],
}: {
  type?: "bplus" | "trie" | "heap";
  large?: boolean;
  active?: boolean;
  term?: string;
  events?: LogRecord[];
  range?: string[];
  keywords?: string[];
}) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.002;
    const newScale = Math.min(Math.max(0.5, transform.scale + scaleAmount), 4);
    setTransform({ ...transform, scale: newScale });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setTransform({ ...transform, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const renderSvg = (content: ReactNode, viewBox: string) => (
    <div 
      className="w-full h-full overflow-hidden touch-none"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <svg 
        viewBox={viewBox} 
        className={`tree-graphic ${large ? "tree-large" : ""}`} 
        role="img"
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0' }}
      >
        {content}
      </svg>
    </div>
  );

  // ── Dynamic B+ Tree ──────────────────────────────────────
  if (type === "bplus") {
    const hasData = range.length === 2 && range[0] !== "—";
    const startMin = hasData && range[0] ? range[0].slice(0, 5) : "";
    const endMin = hasData && range[1] ? range[1].slice(0, 5) : "";

    const leafTimes: string[] = [];
    if (hasData && events.length > 0) {
      // Sort chronologically to satisfy B+ tree properties
      const sortedEvents = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const seen = new Set<string>();
      for (const e of sortedEvents) {
        const t = e.timestamp.slice(11, 16);
        if (!seen.has(t)) { seen.add(t); leafTimes.push(t); }
        if (leafTimes.length >= 6) break;
      }
    }
    
    const validLeaves = leafTimes.length;
    
    // We only need the root if we have data
    const nodes = hasData ? [`${startMin} | ${endMin}`] : [];
    if (hasData) {
      // Internal nodes as proper boundary markers
      nodes.push(leafTimes[0] ? `≤ ${leafTimes[Math.min(1, validLeaves - 1)]}` : "");
      nodes.push(leafTimes[2] ? `≤ ${leafTimes[Math.min(3, validLeaves - 1)]}` : "");
      nodes.push(leafTimes[4] ? `≤ ${leafTimes[Math.min(5, validLeaves - 1)]}` : "");
      
      for (let i = 0; i < 6; i++) {
        nodes.push(i < validLeaves ? leafTimes[i] : "");
      }
    }

    const positions: [number, number][] = [
      [300, 35], [110, 110], [300, 110], [490, 110],
      [30, 185], [130, 185], [230, 185], [330, 185], [430, 185], [530, 185],
    ];
    const edges: [number, number][] = [
      [0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 6], [2, 7], [3, 8], [3, 9],
    ];

    return renderSvg(
      <>
        {edges.map(([a, b]) => {
          if (!nodes[a] || !nodes[b]) return null;
          const pA = positions[a]; const pB = positions[b];
          return <path key={`${a}-${b}`} d={`M ${pA[0]} ${pA[1] + 16} L ${pB[0]} ${pB[1] - 16}`}
            className={active ? "tree-edge edge-active" : "tree-edge"} />;
        })}
        {nodes.map((node, i) => {
          if (!node) return null;
          const [x, y] = positions[i];
          return (
            <g key={i} className={`tree-node ${active ? "node-active" : ""}`}>
              <rect x={x - (i === 0 ? 65 : 44)} y={y - 17} width={i === 0 ? 130 : 88} height={34} rx="5" />
              <text x={x} y={y + 4} textAnchor="middle">{node}</text>
            </g>
          );
        })}
        {validLeaves > 1 && <path d={`M30 218 H${30 + ((validLeaves - 1) * 100)}`} className="tree-leaf-link" />}
      </>,
      "-50 -50 710 335"
    );
        {nodes.map((node, i) => {
          if (!node) return null;
          const [x, y] = positions[i];
          return (
            <g key={i} className={`tree-node ${active ? "node-active" : ""}`}>
              <rect x={x - (i === 0 ? 65 : 44)} y={y - 17} width={i === 0 ? 130 : 88} height={34} rx="5" />
              <text x={x} y={y + 4} textAnchor="middle">{node}</text>
            })}
            {validLeaves > 1 && <path d={`M30 218 H${30 + ((validLeaves - 1) * 100)}`} className="tree-leaf-link" />}
          </svg>
        </TransformComponent>
      </TransformWrapper>
    );
  }

  // ── Dynamic Trie ─────────────────────────────────────────
  if (type === "trie") {
    const kws = keywords.length > 0 ? keywords.slice(0, 3) : (term ? [term] : []);
    const hasData = kws.length > 0 && kws[0] !== "";

    const nodes: string[] = hasData ? ["ROOT"] : [];
    const positions: [number, number][] = hasData ? [[300, 35]] : [];
    const edges: [number, number][] = [];

    if (hasData) {
      // For 1, 2, or 3 keywords, center them
      let startXs = [300];
      if (kws.length === 2) startXs = [200, 400];
      if (kws.length === 3) startXs = [120, 300, 480];

      kws.forEach((kw, kwIdx) => {
        if (!kw) return;
        
        let parentIdx = 0; // ROOT
        const currentX = startXs[kwIdx];
        
        // Break into: char 1, char 2, remainder (creates the prefix depth effect)
        const parts = [
          kw.slice(0, 1),
          kw.slice(1, 2),
          kw.slice(2)
        ].filter(Boolean);
        
        parts.forEach((part, depth) => {
           nodes.push(part);
           const myIdx = nodes.length - 1;
           positions.push([currentX, 95 + (depth * 50)]);
           edges.push([parentIdx, myIdx]);
           parentIdx = myIdx;
        });
      });
    }

    return renderSvg(
      <>
        {edges.map(([a, b]) => {
          if (!nodes[a] || !nodes[b]) return null;
          const pA = positions[a]; const pB = positions[b];
          return <path key={`${a}-${b}`} d={`M ${pA[0]} ${pA[1] + 16} L ${pB[0]} ${pB[1] - 16}`}
            className={active ? "tree-edge edge-active" : "tree-edge"} />;
        })}
        {nodes.map((node, i) => {
          if (!node) return null;
          const [x, y] = positions[i];
          return (
            <g key={i} className={`tree-node ${active ? "node-active" : ""}`}>
              <rect x={x - (node.length > 8 ? 60 : 44)} y={y - 17} width={node.length > 8 ? 120 : 88} height={34} rx="5" />
              <text x={x} y={y + 4} textAnchor="middle">{node}</text>
            </g>
          );
        })}
      </>,
      "-50 -50 710 360"
    );
          if (!nodes[a] || !nodes[b]) return null;
          const pA = positions[a]; const pB = positions[b];
          return <path key={`${a}-${b}`} d={`M ${pA[0]} ${pA[1] + 16} L ${pB[0]} ${pB[1] - 16}`}
            className={active ? "tree-edge edge-active" : "tree-edge"} />;
        })}
        {nodes.map((node, i) => {
          if (!node) return null;
          const [x, y] = positions[i];
          return (
            <g key={i} className={`tree-node ${active ? "node-active" : ""}`}>
              <rect x={x - (node.length > 8 ? 60 : 44)} y={y - 17} width={node.length > 8 ? 120 : 88} height={34} rx="5" />
              <text x={x} y={y + 4} textAnchor="middle">{node}</text>
            </g>
          );
        })}
          </svg>
        </TransformComponent>
      </TransformWrapper>
    );
  }

  // ── Dynamic Heap ─────────────────────────────────────────
  const heapItems = events.slice(0, 7);
  const hasHeapData = heapItems.length > 0;
  const nodeCount = hasHeapData ? heapItems.length : 0;
  
  const positions: [number, number][] = [
    [300, 35], [155, 110], [445, 110], [80, 190], [230, 190], [370, 190], [520, 190],
  ];
  const edges: [number, number][] = [
    [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6],
  ];

  return renderSvg(
    <>
      {edges.filter(([, b]) => b < nodeCount).map(([a, b]) => {
        const pA = positions[a]; const pB = positions[b];
        return <path key={`${a}-${b}`} d={`M ${pA[0]} ${pA[1] + 16} L ${pB[0]} ${pB[1] - 16}`}
          className={active ? "tree-edge edge-active" : "tree-edge"} />;
      })}
      {Array.from({ length: nodeCount }).map((_, i) => {
        const [x, y] = positions[i];
        const item = heapItems[i];
        return (
          <g key={i} className={`tree-node ${active ? "node-active" : ""} ${item && (item.severity === "CRITICAL") ? "node-critical" : ""}`}>
            <rect x={x - 44} y={y - 17} width={88} height={large ? 59 : 34} rx="5" />
            <text x={x} y={y + 4} textAnchor="middle">{item?.severity}</text>
            {large && (
              <>
                <text x={x} y={y + 20} textAnchor="middle" className="node-subtext">
                  Score: {item?.priorityScore ?? "—"}
                </text>
                <text x={x} y={y + 34} textAnchor="middle" className="node-subtext">
                  {item?.server ?? "—"}
                </text>
              </>
            )}
          </g>
        );
      })}
    </>,
    `-50 -50 710 ${large ? 380 : 335}`
  );
}
export function Pipeline({
  step = 6,
  error = false,
  processing = false,
}: {
  step?: number;
  error?: boolean;
  processing?: boolean;
}) {
  const isDone = (s: number) => step > s || (!processing && !error);
  const isActive = (s: number) => step === s && processing;

  const getIcon = (s: number, DefaultIcon: any) => {
    if (error && step === s) return <AlertTriangle size={15} className="text-destructive" />;
    if (isActive(s)) return <Loader2 size={15} className="spin text-primary" />;
    if (isDone(s)) return <CircleCheck size={15} className="text-success" />;
    return <DefaultIcon size={15} />;
  };

  return (
    <div className={`pipeline ${processing ? "pipeline-running" : ""}`}>
      <div className="pipeline-stage">
        <Activity size={15} />
        <span>User question</span>
      </div>
      <span className="pipeline-arrow">→</span>
      <div className="pipeline-stage">
        {getIcon(0, Cpu)}
        <span>Query interpretation</span>
      </div>
      <span className="pipeline-arrow">→</span>
      <div className="pipeline-ads">
        <span>{getIcon(1, Network)} B+ Tree</span>
        <span>{getIcon(2, GitBranch)} Trie</span>
        <span>{getIcon(3, Layers)} Heap</span>
      </div>
      <span className="pipeline-arrow">→</span>
      <div className="pipeline-stage pipeline-ai">
        {getIcon(5, Cpu)}
        <span>Local LLM</span>
      </div>
      <span className="pipeline-arrow">→</span>
      <div className="pipeline-stage">
        {isDone(6) ? (
          <CircleCheck size={15} className="text-success" />
        ) : (
          <ArrowUpRight size={15} />
        )}
        <span>Result</span>
      </div>
    </div>
  );
}
export function pageMeta(title: string, description: string) {
  return {
    meta: [
      { title: `${title} — Log Investigator` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — Log Investigator` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}
