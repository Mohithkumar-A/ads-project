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
  const sevLower = (severity || "").toLowerCase();
  let colorClass = "severity-info";
  if (
    sevLower.includes("crit") ||
    sevLower.includes("fatal") ||
    sevLower.includes("emerg") ||
    sevLower.includes("alert")
  ) {
    colorClass = "severity-critical";
  } else if (sevLower.includes("err") || sevLower.includes("sever")) {
    colorClass = "severity-error";
  } else if (sevLower.includes("warn")) {
    colorClass = "severity-warning";
  }
  return <span className={`severity ${colorClass}`}>{severity}</span>;
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
  dsaMetrics,
}: {
  type?: "bplus" | "trie" | "heap" | undefined;
  large?: boolean | undefined;
  active?: boolean | undefined;
  term?: string | undefined;
  events?: LogRecord[] | undefined;
  range?: string[] | undefined;
  keywords?: string[] | undefined;
  dsaMetrics?: import("./mock-api").DSAMetrics | undefined;
}) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedHeapRank, setSelectedHeapRank] = useState<number>(1);

  const handleZoomIn = () =>
    setTransform((prev) => ({ ...prev, scale: Math.min(prev.scale + 0.2, 4) }));
  const handleZoomOut = () =>
    setTransform((prev) => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.5) }));

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

  const renderSvg = (content: ReactNode, viewBox: string, extraOverlay?: ReactNode) => (
    <div
      className="w-full h-full overflow-hidden touch-none relative"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      {extraOverlay}
      <div
        style={{
          position: "absolute",
          right: "10px",
          bottom: "10px",
          display: "flex",
          gap: "5px",
          zIndex: 10,
        }}
      >
        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            handleZoomOut();
          }}
          style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
            width: "30px",
            height: "30px",
            borderRadius: "4px",
            color: "var(--foreground)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          -
        </button>
        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            handleZoomIn();
          }}
          style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
            width: "30px",
            height: "30px",
            borderRadius: "4px",
            color: "var(--foreground)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          +
        </button>
      </div>
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        className={`tree-graphic ${large ? "tree-large" : ""}`}
        role="img"
      >
        <g
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "0 0",
          }}
        >
          {content}
        </g>
      </svg>
    </div>
  );

  const tp = dsaMetrics?.traversal_path;

  // ── B+ Tree: Traversed Path Rendering ────────────────────
  if (type === "bplus") {
    if (tp && tp.type === "bplus" && tp.nodes.length > 0) {
      const nodes = tp.nodes;
      const edges = tp.edges;

      // Layout: position nodes by type and index
      const positions = new Map<string, [number, number]>();
      const rootY = 35;
      const internalY = 110;
      const leafY = 200;

      const internalCount = 0;
      const leafCount = 0;
      const leafNodes = nodes.filter((n) => n.type === "leaf");
      const internalNodes = nodes.filter((n) => n.type === "internal");

      // Position leaves evenly
      const leafWidth = 130;
      const totalLeafWidth = Math.max(710, leafNodes.length * leafWidth);
      const leafStartX = 60;
      leafNodes.forEach((n, i) => {
        positions.set(n.id, [leafStartX + i * leafWidth, leafY]);
      });

      // Position internals centered above their leaf children
      internalNodes.forEach((n, i) => {
        // Find connected leaf children from edges
        const childEdges = edges.filter((e) => e.from === n.id);
        const childPositions = childEdges.map((e) => positions.get(e.to)).filter(Boolean) as [
          number,
          number,
        ][];
        if (childPositions.length > 0) {
          const avgX = childPositions.reduce((s, p) => s + p[0], 0) / childPositions.length;
          positions.set(n.id, [avgX, internalY]);
        } else {
          positions.set(n.id, [totalLeafWidth / 2 + i * 150, internalY]);
        }
      });

      // Position root centered above everything
      const rootNode = nodes.find((n) => n.type === "root");
      if (rootNode) {
        positions.set(rootNode.id, [totalLeafWidth / 2, rootY]);
      }

      const svgWidth = Math.max(710, leafNodes.length * leafWidth + 120);

      return renderSvg(
        <>
          {/* Edges */}
          {edges.map((e, i) => {
            const from = positions.get(e.from);
            const to = positions.get(e.to);
            if (!from || !to) return null;
            const isLeafLink = e.label.includes("next pointer");
            return (
              <g key={i}>
                <path
                  d={
                    isLeafLink
                      ? `M ${from[0] + 55} ${from[1]} L ${to[0] - 55} ${to[1]}`
                      : `M ${from[0]} ${from[1] + 18} L ${to[0]} ${to[1] - 18}`
                  }
                  className={active ? "tree-edge edge-active" : "tree-edge"}
                  strokeDasharray={isLeafLink ? "4,3" : undefined}
                  markerEnd={isLeafLink ? undefined : "url(#arrowhead)"}
                />
                {!isLeafLink && (
                  <text
                    x={(from[0] + to[0]) / 2 + 8}
                    y={(from[1] + to[1]) / 2}
                    fontSize="9"
                    fill="var(--muted-foreground)"
                    textAnchor="start"
                  >
                    {e.label.length > 20 ? e.label.slice(0, 20) + "…" : e.label}
                  </text>
                )}
              </g>
            );
          })}
          {/* Leaf sibling chain line */}
          {leafNodes.length > 1 && (
            <path
              d={`M ${leafStartX} ${leafY + 22} H ${leafStartX + (leafNodes.length - 1) * leafWidth}`}
              className="tree-leaf-link"
            />
          )}
          {/* Nodes */}
          {nodes.map((n) => {
            const pos = positions.get(n.id);
            if (!pos) return null;
            const [x, y] = pos;
            const hasMatches = n.matched_keys.length > 0;
            const label =
              n.type === "root" ? "Time Index Root" : n.keys.map((k) => k.slice(11, 19)).join(", ");
            const nodeWidth = Math.max(100, label.length * 7 + 20);
            return (
              <g
                key={n.id}
                className={`tree-node ${active ? "node-active" : ""} ${hasMatches ? "node-matched" : ""}`}
              >
                <rect
                  x={x - nodeWidth / 2}
                  y={y - 17}
                  width={nodeWidth}
                  height={large ? 44 : 34}
                  rx="5"
                />
                <text x={x} y={y + 4} textAnchor="middle" fontSize="11">
                  {label}
                </text>
                {hasMatches && large && (
                  <text x={x} y={y + 22} textAnchor="middle" className="node-subtext" fontSize="9">
                    {n.matched_keys.length} match{n.matched_keys.length > 1 ? "es" : ""}
                  </text>
                )}
                {n.type !== "root" && n.type !== "leaf" && n.chosen_branch >= 0 && (
                  <text x={x + nodeWidth / 2 + 4} y={y - 8} fontSize="8" fill="var(--primary)">
                    ↓{n.chosen_branch}
                  </text>
                )}
              </g>
            );
          })}
          {/* Arrow marker definition */}
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--primary)" />
            </marker>
          </defs>
        </>,
        `-50 -20 ${svgWidth} ${large ? 320 : 280}`,
      );
    }

    // Fallback: no traversal data yet
    return renderSvg(
      <text x="350" y="120" textAnchor="middle" fill="var(--muted-foreground)" fontSize="13">
        Awaiting traversal data from C++ engine
      </text>,
      "-50 -50 710 280",
    );
  }

  // ── Trie: Traversed Path Rendering ────────────────────────
  if (type === "trie") {
    if (tp && tp.type === "trie" && tp.keyword_traces.length > 0) {
      const traces = tp.keyword_traces;
      const nodesArr: {
        id: string;
        label: string;
        isRoot?: boolean | undefined;
        isMiss?: boolean | undefined;
        isTerminal?: boolean | undefined;
        matchCount?: number | undefined;
      }[] = [];
      const positionsMap = new Map<string, [number, number]>();
      const edgesArr: { from: string; to: string }[] = [];

      // Root node
      nodesArr.push({ id: "root", label: "ROOT", isRoot: true });
      positionsMap.set("root", [350, 35]);

      // Spread keyword branches evenly
      const branchXs = traces.map((_, i) => (700 / (traces.length + 1)) * (i + 1));

      traces.forEach((kt, kwIdx) => {
        let parentId = "root";
        const baseX = branchXs[kwIdx] ?? 350;

        kt.steps.forEach((step, depth) => {
          const nodeId = `kw${kwIdx}-d${depth}`;
          const isLast = depth === kt.steps.length - 1;
          const isTerminal = isLast && kt.terminal_hit;
          const isMiss = !step.found;

          nodesArr.push({
            id: nodeId,
            label: step.char,
            isMiss,
            isTerminal,
            matchCount: isTerminal ? kt.matches_count : undefined,
          });
          positionsMap.set(nodeId, [baseX, 90 + depth * 42]);
          edgesArr.push({ from: parentId, to: nodeId });
          parentId = nodeId;
        });
      });

      return renderSvg(
        <>
          {edgesArr.map((e, i) => {
            const from = positionsMap.get(e.from);
            const to = positionsMap.get(e.to);
            if (!from || !to) return null;
            return (
              <path
                key={i}
                d={`M ${from[0]} ${from[1] + 16} L ${to[0]} ${to[1] - 16}`}
                className={active ? "tree-edge edge-active" : "tree-edge"}
              />
            );
          })}
          {nodesArr.map((n) => {
            const pos = positionsMap.get(n.id);
            if (!pos) return null;
            const [x, y] = pos;
            const w = n.isRoot ? 80 : n.isTerminal ? 50 : 36;
            return (
              <g
                key={n.id}
                className={`tree-node ${active ? "node-active" : ""} ${n.isMiss ? "node-miss" : ""} ${n.isTerminal ? "node-terminal" : ""}`}
              >
                <rect x={x - w / 2} y={y - 15} width={w} height={30} rx={n.isRoot ? 5 : 15} />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fontSize={n.isRoot ? 12 : 13}
                  fontWeight={n.isTerminal ? "bold" : "normal"}
                >
                  {n.label}
                </text>
                {n.isTerminal && n.matchCount !== undefined && (
                  <text x={x} y={y + 24} textAnchor="middle" fontSize="9" fill="var(--primary)">
                    {n.matchCount} match{n.matchCount !== 1 ? "es" : ""}
                  </text>
                )}
              </g>
            );
          })}
        </>,
        `-50 -20 750 ${90 + Math.max(...traces.map((t) => t.steps.length)) * 42 + 40}`,
      );
    }

    // Fallback
    return renderSvg(
      <text x="350" y="120" textAnchor="middle" fill="var(--muted-foreground)" fontSize="13">
        Awaiting traversal data from C++ engine
      </text>,
      "-50 -50 710 280",
    );
  }

  // ── Heap: Complete Binary Tree with Sift-Down Traversal ────
  const heapControls =
    tp && tp.type === "heap" && tp.extractions.length > 0 ? (
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          right: "80px",
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setSelectedHeapRank(0)}
          style={{
            background: selectedHeapRank === 0 ? "var(--primary)" : "var(--card)",
            color: selectedHeapRank === 0 ? "#000" : "var(--foreground)",
            border: "1px solid var(--border)",
            padding: "3px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Full Tree Overview
        </button>
        {tp.extractions.slice(0, 6).map((ex) => (
          <button
            key={ex.rank}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setSelectedHeapRank(ex.rank)}
            style={{
              background: selectedHeapRank === ex.rank ? "var(--primary)" : "var(--card)",
              color: selectedHeapRank === ex.rank ? "#000" : "var(--foreground)",
              border: "1px solid var(--border)",
              padding: "3px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            #{ex.rank} Sift ({ex.extracted_server})
          </button>
        ))}
      </div>
    ) : null;

  // 1. Collect nodes to display (uncapped)
  const heapNodes: import("./mock-api").HeapNodeInfo[] = [];

  if (tp && tp.type === "heap" && tp.initial_nodes && tp.initial_nodes.length > 0) {
    heapNodes.push(...tp.initial_nodes);
  } else if (events && events.length > 0) {
    events.forEach((ev, idx) => {
      heapNodes.push({
        index: idx,
        severity: ev.severity,
        server: ev.server,
        score: ev.priorityScore ?? 0,
        message: ev.message,
      });
    });
  }

  const nodeCount = heapNodes.length;
  if (nodeCount === 0) {
    return renderSvg(
      <text x="360" y="120" textAnchor="middle" fill="var(--muted-foreground)" fontSize="13">
        Awaiting traversal data from C++ engine
      </text>,
      "-40 -20 800 300",
    );
  }

  // 2. Compute Tree Coordinates for Arbitrary Depth Binary Tree
  const maxLevel = Math.floor(Math.log2(nodeCount));
  const slotsAtBottom = Math.pow(2, maxLevel);
  const svgWidth = Math.max(800, slotsAtBottom * 85);
  const svgHeight = 90 + (maxLevel + 1) * 95;

  const positions: [number, number, number, number][] = []; // [centerX, centerY, width, height]

  for (let i = 0; i < nodeCount; i++) {
    const level = Math.floor(Math.log2(i + 1));
    const posInLevel = i - (Math.pow(2, level) - 1);
    const slotsInLevel = Math.pow(2, level);
    const slotWidth = svgWidth / slotsInLevel;

    const cx = (posInLevel + 0.5) * slotWidth;
    const cy = 75 + level * 95;
    const w = Math.max(54, Math.min(114, slotWidth - 10));
    const h = Math.max(36, Math.min(50, 52 - level * 2));

    positions.push([cx, cy, w, h]);
  }

  // 3. Parent-Child Edges in Binary Tree: child i -> parent floor((i-1)/2)
  const treeEdges: { from: number; to: number }[] = [];
  for (let i = 1; i < nodeCount; i++) {
    const parent = Math.floor((i - 1) / 2);
    if (parent < nodeCount) {
      treeEdges.push({ from: parent, to: i });
    }
  }

  // 4. Determine Active Sift Path for selected rank
  const extractions = tp && tp.type === "heap" ? tp.extractions : [];
  const activeExtraction =
    selectedHeapRank > 0
      ? extractions.find((e) => e.rank === selectedHeapRank) ||
        (selectedHeapRank <= extractions.length ? extractions[selectedHeapRank - 1] : null)
      : null;

  const siftNodesSet = new Set<number>();
  const siftEdgeSet = new Set<string>();
  const siftStepsMap = new Map<number, string>();

  if (activeExtraction) {
    activeExtraction.sift_path.forEach((sp, stepIdx) => {
      siftNodesSet.add(sp.index);
      siftStepsMap.set(sp.index, stepIdx === 0 ? "Root Sift" : `Step ${stepIdx + 1}`);
      if (sp.swapped && sp.swapped_with !== undefined && sp.swapped_with >= 0) {
        siftNodesSet.add(sp.swapped_with);
        siftEdgeSet.add(`${sp.index}-${sp.swapped_with}`);
        siftEdgeSet.add(`${sp.swapped_with}-${sp.index}`);
      }
    });
  }

  const viewBox = `-30 0 ${svgWidth + 60} ${svgHeight + 30}`;

  return renderSvg(
    <>
      <defs>
        <marker id="heap-sift-arrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="var(--primary)" />
        </marker>
      </defs>

      {/* Info Banner */}
      {activeExtraction && (
        <g>
          <rect
            x="20"
            y="12"
            width={Math.max(680, svgWidth - 40)}
            height="26"
            rx="5"
            fill="color-mix(in oklab, var(--primary) 12%, var(--card))"
            stroke="var(--primary)"
            strokeWidth="1"
          />
          <text
            x={svgWidth / 2}
            y="29"
            textAnchor="middle"
            fontSize="11"
            fill="var(--primary)"
            fontWeight="bold"
          >
            Rank #{activeExtraction.rank} Extracted: {activeExtraction.extracted_severity} · {activeExtraction.extracted_server} (Score: {activeExtraction.extracted_score}) — Sift: {activeExtraction.sift_path.map((s) => `[${s.index}]`).join(" ➔ ")}
          </text>
        </g>
      )}
      {!activeExtraction && (
        <text x="360" y="26" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
          Complete Binary Max-Heap Tree (Max at Root #0 with Score: {heapNodes[0]?.score ?? "—"})
        </text>
      )}

      {/* Tree Edges */}
      {treeEdges.map(({ from, to }) => {
        const pP = positions[from];
        const pC = positions[to];
        if (!pP || !pC) return null;

        const isSiftEdge = siftEdgeSet.has(`${from}-${to}`);
        const pY = pP[1] + pP[3] / 2;
        const cY = pC[1] - pC[3] / 2;

        return (
          <line
            key={`edge-${from}-${to}`}
            x1={pP[0]}
            y1={pY}
            x2={pC[0]}
            y2={cY}
            className={`tree-edge ${isSiftEdge ? "edge-sift-active edge-active" : active ? "tree-edge" : ""}`}
            stroke={isSiftEdge ? "var(--primary)" : "var(--border)"}
            strokeWidth={isSiftEdge ? 2.5 : 1.5}
            strokeDasharray={isSiftEdge ? "5 3" : undefined}
            markerEnd={isSiftEdge ? "url(#heap-sift-arrow)" : undefined}
          />
        );
      })}

      {/* Tree Nodes */}
      {heapNodes.slice(0, nodeCount).map((node, i) => {
        const pos = positions[i];
        if (!pos) return null;
        const [cx, cy, w, h] = pos;

        const isCritical = node.severity === "CRITICAL";
        const inSift = siftNodesSet.has(i);
        const stepLabel = siftStepsMap.get(i);

        return (
          <g
            key={`heap-node-${i}`}
            className={`tree-node ${active ? "node-active" : ""} ${isCritical ? "node-critical" : ""} ${inSift ? "node-sift-active" : ""}`}
          >
            <rect
              x={cx - w / 2}
              y={cy - h / 2}
              width={w}
              height={h}
              rx={6}
              stroke={inSift ? "var(--primary)" : undefined}
              strokeWidth={inSift ? 2.5 : undefined}
            />
            {/* Node index */}
            <text
              x={cx - w / 2 + 6}
              y={cy - h / 2 + 12}
              fontSize="8"
              fill="var(--muted-foreground)"
              fontWeight="bold"
            >
              #{node.index}
            </text>

            {/* Sift step label */}
            {stepLabel && (
              <text
                x={cx + w / 2 - 6}
                y={cy - h / 2 + 12}
                textAnchor="end"
                fontSize="8"
                fill="var(--primary)"
                fontWeight="bold"
              >
                {stepLabel}
              </text>
            )}

            {/* Severity */}
            <text
              x={cx}
              y={cy + 1}
              textAnchor="middle"
              fontSize={h < 48 ? "9" : "11"}
              fontWeight="700"
            >
              {node.severity}
            </text>

            {/* Server & Score */}
            <text
              x={cx}
              y={cy + 14}
              textAnchor="middle"
              fontSize="8"
              fill="var(--primary)"
              fontWeight="bold"
            >
              {node.server} · {node.score}
            </text>
          </g>
        );
      })}
    </>,
    viewBox,
    heapControls,
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

  const getIcon = (
    s: number,
    DefaultIcon: React.ComponentType<{ size?: number; className?: string }>,
  ) => {
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
