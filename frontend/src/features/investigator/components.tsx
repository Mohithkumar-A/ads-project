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

  const renderSvg = (content: ReactNode, viewBox: string) => (
    <div
      className="w-full h-full overflow-hidden touch-none relative"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
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

  // ── Heap: Extraction Cascade Rendering ───────────────────
  if (tp && tp.type === "heap" && tp.extractions.length > 0) {
    const extractions = tp.extractions;
    // Render as a vertical cascade: each extraction is a row showing extracted item + sift path
    const rowHeight = large ? 65 : 50;
    const startY = 30;
    const svgHeight = startY + extractions.length * rowHeight + 40;

    return renderSvg(
      <>
        {/* Header labels */}
        <text x="60" y="18" fontSize="10" fill="var(--muted-foreground)" fontWeight="bold">
          RANK
        </text>
        <text x="160" y="18" fontSize="10" fill="var(--muted-foreground)" fontWeight="bold">
          EXTRACTED
        </text>
        <text x="380" y="18" fontSize="10" fill="var(--muted-foreground)" fontWeight="bold">
          SCORE
        </text>
        <text x="480" y="18" fontSize="10" fill="var(--muted-foreground)" fontWeight="bold">
          SIFT-DOWN PATH
        </text>

        {extractions.map((ex, i) => {
          const y = startY + i * rowHeight + 20;
          const isCritical = ex.extracted_severity === "CRITICAL";

          return (
            <g key={i}>
              {/* Rank */}
              <g className={`tree-node ${active ? "node-active" : ""}`}>
                <rect x="35" y={y - 14} width="50" height="28" rx="14" />
                <text x="60" y={y + 4} textAnchor="middle" fontSize="12" fontWeight="bold">
                  #{ex.rank}
                </text>
              </g>

              {/* Extracted item */}
              <g
                className={`tree-node ${active ? "node-active" : ""} ${isCritical ? "node-critical" : ""}`}
              >
                <rect x="110" y={y - 14} width="140" height={large ? 42 : 28} rx="5" />
                <text x="180" y={y + 4} textAnchor="middle" fontSize="11">
                  {ex.extracted_severity} · {ex.extracted_server}
                </text>
                {large && (
                  <text
                    x="180"
                    y={y + 20}
                    textAnchor="middle"
                    className="node-subtext"
                    fontSize="9"
                  >
                    Score: {ex.extracted_score}
                  </text>
                )}
              </g>

              {/* Score badge */}
              <text
                x="380"
                y={y + 4}
                textAnchor="middle"
                fontSize="13"
                fontWeight="bold"
                fill="var(--primary)"
              >
                {ex.extracted_score}
              </text>

              {/* Sift-down mini visualization */}
              {ex.sift_path.map((sp, j) => {
                const sx = 460 + j * 55;
                const swapColor = sp.swapped ? "var(--primary)" : "var(--muted-foreground)";
                return (
                  <g key={j}>
                    {j > 0 && (
                      <path
                        d={`M ${sx - 20} ${y} L ${sx - 8} ${y}`}
                        stroke={swapColor}
                        strokeWidth="1.5"
                        markerEnd="url(#sift-arrow)"
                      />
                    )}
                    <rect
                      x={sx - 8}
                      y={y - 10}
                      width="36"
                      height="20"
                      rx="3"
                      fill={sp.swapped ? "var(--primary)" : "var(--muted)"}
                      opacity={sp.swapped ? 0.25 : 0.15}
                      stroke={swapColor}
                      strokeWidth="1"
                    />
                    <text x={sx + 10} y={y + 4} textAnchor="middle" fontSize="8" fill={swapColor}>
                      [{sp.index}]
                    </text>
                  </g>
                );
              })}

              {/* Row separator */}
              {i < extractions.length - 1 && (
                <line
                  x1="35"
                  y1={y + rowHeight / 2 + 4}
                  x2="700"
                  y2={y + rowHeight / 2 + 4}
                  stroke="var(--border)"
                  strokeWidth="0.5"
                  strokeDasharray="3,3"
                />
              )}
            </g>
          );
        })}

        <defs>
          <marker id="sift-arrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="var(--primary)" />
          </marker>
        </defs>
      </>,
      `-10 -10 ${460 + Math.max(...extractions.map((e) => e.sift_path.length)) * 55 + 60} ${svgHeight}`,
    );
  }

  // Heap fallback: render evidence as simple binary tree (backward compat)
  const heapItems = events;
  const hasHeapData = heapItems.length > 0;
  const nodeCount = hasHeapData ? heapItems.length : 0;

  const fallbackPositions: [number, number][] = [];
  const fallbackEdges: [number, number][] = [];

  if (hasHeapData) {
    for (let i = 0; i < nodeCount; i++) {
      const level = Math.floor(Math.log2(i + 1));
      const positionInLevel = i - (Math.pow(2, level) - 1);
      const levelWidth = Math.pow(2, level);

      const x = 300 + (positionInLevel - (levelWidth - 1) / 2) * (500 / levelWidth);
      const y = 35 + level * 85;

      fallbackPositions.push([x, y]);

      if (i > 0) {
        fallbackEdges.push([Math.floor((i - 1) / 2), i]);
      }
    }
  }

  return renderSvg(
    <>
      {fallbackEdges
        .filter(([, b]) => b < nodeCount)
        .map(([a, b]) => {
          if (!fallbackPositions[a] || !fallbackPositions[b]) return null;
          const pA = fallbackPositions[a]!;
          const pB = fallbackPositions[b]!;
          return (
            <path
              key={`${a}-${b}`}
              d={`M ${pA[0]} ${pA[1] + 16} L ${pB[0]} ${pB[1] - 16}`}
              className={active ? "tree-edge edge-active" : "tree-edge"}
            />
          );
        })}
      {Array.from({ length: nodeCount }).map((_, i) => {
        if (!fallbackPositions[i]) return null;
        const [x, y] = fallbackPositions[i]!;
        const item = heapItems[i];
        return (
          <g
            key={i}
            className={`tree-node ${active ? "node-active" : ""} ${item && item.severity === "CRITICAL" ? "node-critical" : ""}`}
          >
            <rect x={x - 44} y={y - 17} width={88} height={large ? 59 : 34} rx="5" />
            <text x={x} y={y + 4} textAnchor="middle">
              {item?.severity}
            </text>
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
      {!hasHeapData && (
        <text x="350" y="120" textAnchor="middle" fill="var(--muted-foreground)" fontSize="13">
          Awaiting traversal data from C++ engine
        </text>
      )}
    </>,
    `-50 -50 710 ${large ? 380 : 335}`,
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
