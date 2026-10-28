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
import { useState, useRef, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { BPlusRangeSearchTrace, LogRecord } from "./mock-api";
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

export function BPlusRangeSearches({ searches }: { searches: BPlusRangeSearchTrace[] }) {
  const displayTime = (value: string) => value.slice(11, 19) || value;
  const dayPosition = (value: string) => {
    const [hours = 0, minutes = 0, seconds = 0] = value.slice(-8).split(":").map(Number);
    return ((hours * 3600 + minutes * 60 + seconds) / 86400) * 100;
  };

  return (
    <div className="bplus-search-list" aria-label="B+ Tree searches by requested range">
      {searches.map((search, searchIndex) => (
        <article
          className="bplus-search-row"
          key={`${search.start_time}-${search.end_time}-${searchIndex}`}
        >
          <header className="bplus-search-head">
            <strong>Range {searchIndex + 1}</strong>
            <span className="bplus-search-range">
              {displayTime(search.start_time)} → {displayTime(search.end_time)}
            </span>
            <span>{search.nodes_accessed} nodes visited</span>
            <span>{search.results_count} logs matched</span>
          </header>
          <div
            className="bplus-time-band"
            aria-label={`Searched range ${displayTime(search.start_time)} to ${displayTime(search.end_time)}`}
          >
            <span>00:00</span>
            <div className="bplus-time-track">
              <span
                className="bplus-time-selection"
                style={{
                  left: `${dayPosition(search.start_time)}%`,
                  width: `${Math.max(0.7, dayPosition(search.end_time) - dayPosition(search.start_time))}%`,
                }}
              />
              <span
                className="bplus-time-marker bplus-time-marker-start"
                style={{ left: `${dayPosition(search.start_time)}%` }}
              />
              <span
                className="bplus-time-marker bplus-time-marker-end"
                style={{ left: `${dayPosition(search.end_time)}%` }}
              />
            </div>
            <span>24:00</span>
          </div>
          <div className="bplus-search-path">
            {search.nodes.map((node, nodeIndex) => {
              const nodeKind = node.type === "root" ? "Root" : node.type === "leaf" ? "Leaf" : "Index";
              const keys = node.keys.map(displayTime).join(" · ");
              return (
                <div className="bplus-search-step" key={`${node.id}-${nodeIndex}`}>
                  <div
                    className={`bplus-trace-node ${nodeKind === "Leaf" && node.matched_keys.length ? "bplus-trace-match" : ""}`}
                  >
                    <small>
                      {nodeKind}
                      {node.chosen_branch >= 0 ? ` · branch ${node.chosen_branch + 1}` : ""}
                    </small>
                    <strong>{keys || (nodeKind === "Root" ? "Time index" : "—")}</strong>
                    {nodeKind === "Leaf" && (
                      <small>
                        {node.matched_keys.length} matching timestamp key
                        {node.matched_keys.length === 1 ? "" : "s"}
                      </small>
                    )}
                  </div>
                  {nodeIndex < search.nodes.length - 1 && (
                    <span className="bplus-trace-arrow" aria-hidden="true">
                      →
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </article>
      ))}
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 900,
    height: 420,
  });
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dragMovedRef = useRef(false);
  const hasInitializedRef = useRef<string | null>(null);
  const [selectedHeapNodeIndex, setSelectedHeapNodeIndex] = useState<number | null>(0);

  // Measure container dimensions responsively
  useEffect(() => {
    if (!containerRef.current) return undefined;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setContainerSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
        }
      }
    };
    updateSize();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(updateSize);
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    }
    return undefined;
  }, []);

  const tp = dsaMetrics?.traversal_path;

  // Compute Heap geometry if needed for initial centering and fit
  const heapNodeCount =
    tp && tp.type === "heap" && tp.initial_nodes && tp.initial_nodes.length > 0
      ? tp.initial_nodes.length
      : events && events.length > 0
        ? events.length
        : 0;
  const heapMaxLevel = Math.max(0, Math.floor(Math.log2(Math.max(1, heapNodeCount))));
  const heapSlotsAtBottom = Math.pow(2, heapMaxLevel);
  const heapSvgWidth = Math.max(920, heapSlotsAtBottom * 154);
  const heapSvgHeight = 90 + (heapMaxLevel + 1) * 118;

  // Initialize at true 100% zoom with Root centered at top
  useEffect(() => {
    if (containerSize.width > 0 && hasInitializedRef.current !== `${type}-${heapNodeCount}`) {
      hasInitializedRef.current = `${type}-${heapNodeCount}`;
      if (type === "heap") {
        setTransform({
          x: Math.round(containerSize.width / 2 - heapSvgWidth / 2),
          y: 20,
          scale: 1,
        });
      } else {
        setTransform({ x: 0, y: 0, scale: 1 });
      }
    }
  }, [type, heapNodeCount, containerSize.width, heapSvgWidth]);

  // Zoom and pan handlers
  const handleZoomIn = () => {
    setTransform((prev) => {
      const newScale = Math.min(prev.scale + 0.2, 3);
      const ratio = newScale / prev.scale;
      const cX = containerSize.width / 2;
      const cY = containerSize.height / 2;
      return {
        x: Math.round(cX - (cX - prev.x) * ratio),
        y: Math.round(cY - (cY - prev.y) * ratio),
        scale: Math.round(newScale * 100) / 100,
      };
    });
  };

  const handleZoomOut = () => {
    setTransform((prev) => {
      const newScale = Math.max(prev.scale - 0.2, 0.2);
      const ratio = newScale / prev.scale;
      const cX = containerSize.width / 2;
      const cY = containerSize.height / 2;
      return {
        x: Math.round(cX - (cX - prev.x) * ratio),
        y: Math.round(cY - (cY - prev.y) * ratio),
        scale: Math.round(newScale * 100) / 100,
      };
    });
  };

  const handleReset100 = () => {
    if (type === "heap") {
      setTransform({
        x: Math.round(containerSize.width / 2 - heapSvgWidth / 2),
        y: 20,
        scale: 1,
      });
    } else {
      setTransform({ x: 0, y: 0, scale: 1 });
    }
  };

  const handleFitView = () => {
    if (type === "heap") {
      const scaleX = (containerSize.width - 60) / heapSvgWidth;
      const scaleY = (containerSize.height - 60) / heapSvgHeight;
      const fitScale = Math.min(scaleX, scaleY, 1);
      setTransform({
        x: Math.round((containerSize.width - heapSvgWidth * fitScale) / 2),
        y: 20,
        scale: Math.max(0.18, Math.round(fitScale * 100) / 100),
      });
    } else {
      setTransform({ x: 0, y: 0, scale: 1 });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setTransform((prev) => {
      const newScale = Math.min(Math.max(prev.scale * zoomFactor, 0.2), 3);
      const ratio = newScale / prev.scale;
      const rect = containerRef.current?.getBoundingClientRect();
      const mouseX = rect ? e.clientX - rect.left : containerSize.width / 2;
      const mouseY = rect ? e.clientY - rect.top : containerSize.height / 2;
      return {
        x: Math.round(mouseX - (mouseX - prev.x) * ratio),
        y: Math.round(mouseY - (mouseY - prev.y) * ratio),
        scale: Math.round(newScale * 1000) / 1000,
      };
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement)?.closest?.("button, input, select, a")) return;
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    dragMovedRef.current = false;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    dragMovedRef.current = true;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const renderSvg = (content: ReactNode, viewBox: string, extraOverlay?: ReactNode) => (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden touch-none relative select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      style={{
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
      }}
    >
      {extraOverlay}
      <div
        style={{
          position: "absolute",
          right: "12px",
          bottom: "12px",
          display: "flex",
          gap: "5px",
          alignItems: "center",
          zIndex: 10,
          background: "var(--card)",
          padding: "4px 6px",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.3)",
        }}
      >
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            handleZoomOut();
          }}
          title="Zoom out"
          style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
            width: "28px",
            height: "28px",
            borderRadius: "5px",
            color: "var(--foreground)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          −
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            handleReset100();
          }}
          title="Reset to 100% zoom"
          style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
            padding: "0 8px",
            height: "28px",
            borderRadius: "5px",
            color:
              Math.round(transform.scale * 100) === 100 ? "var(--primary)" : "var(--foreground)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            fontWeight: "bold",
          }}
        >
          {Math.round(transform.scale * 100)}%
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            handleZoomIn();
          }}
          title="Zoom in"
          style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
            width: "28px",
            height: "28px",
            borderRadius: "5px",
            color: "var(--foreground)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          +
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            handleFitView();
          }}
          title="Fit entire tree into view"
          style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
            padding: "0 8px",
            height: "28px",
            borderRadius: "5px",
            color: "var(--muted-foreground)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
          }}
        >
          Fit
        </button>
      </div>
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        className={`tree-graphic ${large ? "tree-large" : ""}`}
        role="img"
        style={{ userSelect: "none", WebkitUserSelect: "none" }}
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

  // 1. Collect nodes to display (uncapped)
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

  // 2. Compute Priority Rank for each node (Root #0 is Rank #1)
  const rankMap = new Map<number, number>();
  const sortedIndices = [...heapNodes.keys()].sort((a, b) => {
    const sA = heapNodes[a]?.score ?? 0;
    const sB = heapNodes[b]?.score ?? 0;
    if (sB !== sA) return sB - sA;
    return a - b;
  });
  sortedIndices.forEach((nodeIdx, rankZero) => {
    rankMap.set(nodeIdx, rankZero + 1);
  });

  // Severity color helper
  const getSeverityColor = (sev: string) => {
    const s = sev.toUpperCase();
    if (s.includes("CRIT") || s.includes("FATAL")) return "#ef4444";
    if (s.includes("ERR")) return "#f97316";
    if (s.includes("WARN")) return "#eab308";
    if (s.includes("INFO")) return "#38bdf8";
    return "var(--foreground)";
  };

  // 3. Compute Tree Coordinates for Arbitrary Depth Binary Tree
  const maxLevel = Math.floor(Math.log2(nodeCount));
  const slotsAtBottom = Math.pow(2, maxLevel);
  const cardW = 126;
  const cardH = 56;
  const leafSlotWidth = 154; // Guarantees 28px breathing room between adjacent leaf nodes
  const levelSpacing = 118;  // Vertical space for edges and floating badges
  const svgWidth = Math.max(920, slotsAtBottom * leafSlotWidth);
  const svgHeight = 90 + (maxLevel + 1) * levelSpacing;

  const positions: [number, number, number, number][] = []; // [centerX, centerY, width, height]

  for (let i = 0; i < nodeCount; i++) {
    const level = Math.floor(Math.log2(i + 1));
    const posInLevel = i - (Math.pow(2, level) - 1);
    const slotsInLevel = Math.pow(2, level);
    const slotWidth = svgWidth / slotsInLevel;

    const cx = (posInLevel + 0.5) * slotWidth;
    const cy = 85 + level * levelSpacing;

    positions.push([cx, cy, cardW, cardH]);
  }

  // 4. Parent-Child Edges in Binary Tree: child i -> parent floor((i-1)/2)
  const treeEdges: { from: number; to: number }[] = [];
  for (let i = 1; i < nodeCount; i++) {
    const parent = Math.floor((i - 1) / 2);
    if (parent < nodeCount) {
      treeEdges.push({ from: parent, to: i });
    }
  }

  // 5. Active selection & lineage tracing
  const ancestorEdges = new Set<string>();
  const ancestorNodes = new Set<number>();
  if (selectedHeapNodeIndex !== null && selectedHeapNodeIndex >= 0) {
    let curr = selectedHeapNodeIndex;
    ancestorNodes.add(curr);
    while (curr > 0) {
      const p = Math.floor((curr - 1) / 2);
      ancestorEdges.add(`${p}-${curr}`);
      ancestorNodes.add(p);
      curr = p;
    }
  }

  const selectedNode = selectedHeapNodeIndex !== null ? heapNodes[selectedHeapNodeIndex] : null;
  const viewBox = `0 0 ${containerSize.width} ${containerSize.height}`;

  const infoBannerOverlay = (
    <div
      style={{
        position: "absolute",
        top: "12px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        pointerEvents: "none",
        maxWidth: "92%",
      }}
    >
      {selectedNode && selectedHeapNodeIndex !== null ? (
        <div
          style={{
            background: "color-mix(in oklab, var(--primary) 14%, var(--card))",
            border: "1px solid var(--primary)",
            borderRadius: "8px",
            padding: "6px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(10px)",
            pointerEvents: "auto",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: "#f59e0b", fontWeight: "bold" }}>
            {rankMap.get(selectedHeapNodeIndex) === 1
              ? "👑 #1 TOP PRIORITY"
              : `Rank #${rankMap.get(selectedHeapNodeIndex)} Priority`}
          </span>
          <span style={{ color: "var(--border)" }}>·</span>
          <span style={{ color: getSeverityColor(selectedNode.severity), fontWeight: "bold" }}>
            [{selectedNode.severity}]
          </span>
          <span style={{ color: "var(--foreground)", fontWeight: 600 }}>
            {selectedNode.server}
          </span>
          <span style={{ color: "var(--border)" }}>·</span>
          <span style={{ color: "var(--primary)", fontWeight: "bold" }}>
            Score {selectedNode.score}
          </span>
          {selectedNode.message && (
            <>
              <span style={{ color: "var(--border)" }}>·</span>
              <span style={{ color: "var(--muted-foreground)" }}>
                "{selectedNode.message.length > 70 ? selectedNode.message.slice(0, 70) + "…" : selectedNode.message}"
              </span>
            </>
          )}
        </div>
      ) : (
        <div
          style={{
            background: "color-mix(in oklab, var(--card) 90%, transparent)",
            border: "1px solid var(--border)",
            borderRadius: "20px",
            padding: "5px 16px",
            fontFamily: "var(--font-mono)",
            fontSize: "10.5px",
            color: "var(--muted-foreground)",
            display: "flex",
            gap: "8px",
            alignItems: "center",
            backdropFilter: "blur(6px)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
          }}
        >
          <span style={{ color: "#f59e0b" }}>👑 Root is #1 Priority</span>
          <span style={{ color: "var(--border)" }}>·</span>
          <span>Rank Badges indicate Priority Order</span>
          <span style={{ color: "var(--border)" }}>·</span>
          <span style={{ color: "var(--primary)" }}>Click node to inspect</span>
        </div>
      )}
    </div>
  );

  return renderSvg(
    <>
      <defs>
        <marker id="heap-sift-arrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="var(--primary)" />
        </marker>
      </defs>

      {/* Tree Edges */}
      {treeEdges.map(({ from, to }) => {
        const pP = positions[from];
        const pC = positions[to];
        if (!pP || !pC) return null;

        const isHighlighted = ancestorEdges.has(`${from}-${to}`);
        // Parent card bottom
        const pY = pP[1] + cardH / 2;
        // Child floating badge top
        const cY = pC[1] - cardH / 2 - 8;

        return (
          <line
            key={`edge-${from}-${to}`}
            x1={pP[0]}
            y1={pY}
            x2={pC[0]}
            y2={cY}
            stroke={isHighlighted ? "var(--primary)" : "var(--border)"}
            strokeWidth={isHighlighted ? 2.5 : 1.2}
            strokeDasharray={isHighlighted ? "5 3" : undefined}
            opacity={isHighlighted ? 1 : 0.6}
            markerEnd={isHighlighted ? "url(#heap-sift-arrow)" : undefined}
          />
        );
      })}

      {/* Tree Nodes with Floating Badges */}
      {heapNodes.slice(0, nodeCount).map((node, i) => {
        const pos = positions[i];
        if (!pos) return null;
        const [cx, cy, w, h] = pos;

        const rank = rankMap.get(i) ?? (i + 1);
        const isRank1 = rank === 1;
        const isTop3 = rank <= 3;
        const isSelected = selectedHeapNodeIndex === i;
        const isCritical =
          node.severity.toUpperCase().includes("CRIT") ||
          node.severity.toUpperCase().includes("FATAL");
        const isError = node.severity.toUpperCase().includes("ERR");
        const isWarning = node.severity.toUpperCase().includes("WARN");
        const isAncestor = ancestorNodes.has(i);

        // Compute Card Styling
        let cardStroke = "var(--border)";
        let cardStrokeWidth = 1;
        let cardFill = "var(--card)";
        let cardFilter: string | undefined = undefined;

        if (isSelected) {
          cardStroke = "var(--primary)";
          cardStrokeWidth = 2.5;
          cardFill = "color-mix(in oklab, var(--primary) 16%, var(--card))";
          cardFilter = "drop-shadow(0 0 10px rgba(6, 182, 212, 0.45))";
        } else if (isRank1) {
          cardStroke = "#f59e0b";
          cardStrokeWidth = 2;
          cardFill = "color-mix(in oklab, #f59e0b 10%, var(--card))";
          cardFilter = "drop-shadow(0 0 8px rgba(245, 158, 11, 0.25))";
        } else if (isAncestor) {
          cardStroke = "color-mix(in oklab, var(--primary) 70%, var(--border))";
          cardStrokeWidth = 1.8;
          cardFill = "color-mix(in oklab, var(--primary) 8%, var(--card))";
        } else if (isCritical) {
          cardStroke = "rgba(239, 68, 68, 0.6)";
          cardStrokeWidth = 1.5;
          cardFill = "color-mix(in oklab, #ef4444 8%, var(--card))";
        } else if (isError) {
          cardStroke = "rgba(249, 115, 22, 0.5)";
          cardStrokeWidth = 1.2;
          cardFill = "color-mix(in oklab, #f97316 6%, var(--card))";
        } else if (isWarning) {
          cardStroke = "rgba(234, 179, 8, 0.4)";
          cardStrokeWidth = 1.2;
          cardFill = "color-mix(in oklab, #eab308 5%, var(--card))";
        }

        // Floating Rank Badge metrics
        const badgeW = isRank1 ? 84 : isTop3 ? 40 : 36;
        const badgeH = 18;
        const badgeY = cy - h / 2 - 9;
        const badgeX = cx - badgeW / 2;

        return (
          <g
            key={`heap-node-${i}`}
            className="heap-node-group"
            onClick={(e) => {
              e.stopPropagation();
              if (dragMovedRef.current) return;
              setSelectedHeapNodeIndex(selectedHeapNodeIndex === i ? null : i);
            }}
          >
            {/* Main Card */}
            <rect
              className="heap-card-rect"
              x={cx - w / 2}
              y={cy - h / 2}
              width={w}
              height={h}
              rx={8}
              fill={cardFill}
              stroke={cardStroke}
              strokeWidth={cardStrokeWidth}
              style={{ filter: cardFilter }}
            />

            {/* Floating Priority Rank Badge centered on top edge */}
            <rect
              className="heap-badge-rect"
              x={badgeX}
              y={badgeY}
              width={badgeW}
              height={badgeH}
              rx={9}
              fill={
                isRank1
                  ? "#f59e0b"
                  : isTop3
                    ? "color-mix(in oklab, var(--primary) 22%, var(--card))"
                    : "var(--card)"
              }
              stroke={isRank1 ? "#d97706" : isTop3 ? "var(--primary)" : "var(--border)"}
              strokeWidth={isRank1 ? 1 : isTop3 ? 1.2 : 1}
              style={
                isRank1 ? { filter: "drop-shadow(0 2px 4px rgba(245, 158, 11, 0.4))" } : undefined
              }
            />
            <text
              className="heap-badge-text"
              x={cx}
              y={cy - h / 2 + 3.5}
              textAnchor="middle"
              fontSize={isRank1 ? "9" : "8.5"}
              fill={isRank1 ? "#090d16" : isTop3 ? "var(--primary)" : "var(--muted-foreground)"}
              fontWeight={isRank1 ? "800" : isTop3 ? "700" : "600"}
            >
              {isRank1 ? "👑 #1 TOP" : `#${rank}`}
            </text>

            {/* Severity Tag */}
            <text
              className="heap-severity-text"
              x={cx}
              y={cy + 2}
              textAnchor="middle"
              fontSize="11"
              fontWeight="800"
              letterSpacing="0.06em"
              fill={getSeverityColor(node.severity)}
            >
              {node.severity}
            </text>

            {/* Server & Priority Score */}
            <text
              className="heap-meta-text"
              x={cx}
              y={cy + 18}
              textAnchor="middle"
              fontSize="8.5"
            >
              <tspan fill="var(--muted-foreground)">{node.server}</tspan>
              <tspan fill="var(--border)"> · </tspan>
              <tspan fill="var(--primary)" fontWeight="bold">
                {node.score} pts
              </tspan>
            </text>
          </g>
        );
      })}
    </>,
    viewBox,
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
