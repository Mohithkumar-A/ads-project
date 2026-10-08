# ADS Project

# Build the UI for an AI-Powered System Log Investigation Engine

Create a polished, professional web application UI for an **AI-Powered System Log Investigation Engine**.

The application is an Advanced Data Structures project where system logs are efficiently investigated using:

- **B+ Tree** — indexed/range-based log retrieval
- **Trie** — keyword, error-code, service and pattern search
- **Heap** — prioritization of the most critical/relevant events
- **Local LLM** — interprets natural-language questions and explains the evidence retrieved by the data structures

The UI must make it very obvious that the **Advanced Data Structures are the core of the system**. The LLM is an assisting component, not the main feature.

---

# 1. Overall Design Language

Use a professional **developer/observability dashboard aesthetic**.

### Visual style

- Dark theme
- Deep navy / charcoal background
- Subtle borders
- Slightly rounded cards
- Clean typography
- High information density without looking cluttered
- Monospace typography for log data, code-like values and technical metrics
- Modern SaaS/developer-tool appearance
- Professional enough for a college project demonstration
- Avoid excessive gradients, glowing effects, glassmorphism and unnecessary animations

Use a restrained accent system:

- Blue/cyan for information and indexing
- Green for successful operations
- Amber/yellow for warnings
- Red for critical/error events
- Purple can be used sparingly for AI-related elements

The application should feel closer to a professional observability/developer tool than a generic AI chatbot.

---

# 2. Application Navigation

Use a persistent left sidebar.

Navigation should contain ONLY these four destinations:

### Investigation
Main dashboard and investigation workflow.

### B+ Tree
Dedicated B+ Tree visualization and operations.

### Trie
Dedicated Trie visualization and operations.

### Heap
Dedicated Heap visualization and operations.

Do NOT create additional pages such as:

- Settings
- Reports
- Dataset Management
- Analytics
- Profile
- Authentication
- About

Keep the project focused.

The sidebar should clearly indicate the currently active page.

At the top of the sidebar display the product name:

**LOG INVESTIGATOR**

Subtitle:

**Advanced Log Analysis Engine**

---

# 3. PAGE 1 — INVESTIGATION DASHBOARD

This is the primary page and should closely follow the previously designed dashboard concept.

Header:

**AI-Powered System Log Investigation Engine**

Subtitle:

**Efficient log investigation using B+ Tree, Trie and Heap with local LLM-assisted analysis.**

The page should be divided into four major areas.

---

## SECTION A — Log Input / Dataset

Create a large log input panel.

Header:

**1. Log Input / Dataset**

Provide:

- Multiple upload methods:
  - Drag-and-drop file support
  - File picker (Upload Log button)
  - Large textarea/code editor style area for directly copy-pasting logs
- Load Sample Dataset button
- Clear button

Example logs:

```text
2026-10-08 14:32:01 [INFO] WEB-01 Request received /api/users
2026-10-08 14:32:03 [ERROR] DB-01 Connection timeout
2026-10-08 14:32:05 [ERROR] DB-01 Connection failed
2026-10-08 14:32:08 [WARNING] DB-01 Retry attempt 1
2026-10-08 14:32:12 [ERROR] DB-01 Connection failed
2026-10-08 14:32:15 [CRITICAL] DB-01 Database unavailable
2026-10-08 14:32:18 [ERROR] API-01 Database request failed
```

Below the log area show compact dataset statistics:

- Total Logs
- Servers
- Services
- Errors
- Critical Events

Example:

```text
100,000 Logs    5 Servers    12 Services    2,341 Errors    184 Critical
```

These values should be mock data initially and structured so they can later be connected to the C++ backend.

---

# 4. SECTION B — Natural Language Investigation

Create a highly polished, ChatGPT-like investigation panel.

Header:

**2. Ask Your Question**

Include:

- A seamless chat interface (like ChatGPT)
- Conversation/history area with distinct user and AI bubbles
- System/AI response area
- Text input with a prominent Send button
- Support for multiline input

Example questions:

> Why did the database fail between 2:30 PM and 2:35 PM?

> Show me the most critical events from DB-01.

> What caused the authentication failures?

> Find all connection timeout events.

It should visually communicate:

**Question → Query Interpretation → ADS Retrieval → AI Explanation**

When a question is submitted, show a dynamic, step-by-step investigation progress pipeline. Use loading symbols (spinners/pulses) for active states, checkmarks for completed, and error icons if something fails:

```text
[✓] Query interpreted
[✓] B+ Tree search completed
[✓] Trie search completed
[✓] Heap prioritization completed
[↻] Generating analysis... (loading)
```
Any errors during the process should be clearly reported in this pipeline.

---

# 5. SECTION C — Data Structure Results

This is one of the most important sections.

Title:

**3. Data Structure Results**

Display three prominent cards side by side or in a responsive grid.

Each card should contain both metrics and a small visualization.

---

## B+ Tree Result Card

Title:

**B+ Tree**

Subtitle:

**Time & Index Search**

Display:

- Query type: Range Search
- Time range
- Nodes accessed
- Logs retrieved
- Search time
- Tree height

Example:

```text
Query
14:30:00 → 14:35:00

Nodes Accessed
7

Logs Retrieved
1,284

Search Time
3.8 ms
```

Include a miniature B+ Tree visualization.

Make the card clickable and navigate to the dedicated **B+ Tree page**.

---

## Trie Result Card

Title:

**Trie**

Subtitle:

**Keyword & Pattern Search**

Display:

- Search terms
- Matching patterns
- Logs matched
- Search time
- Number of indexed terms

Example:

```text
Search Terms
database
timeout
connection

Matches
342

Search Time
1.7 ms
```

Include a small Trie visualization.

Make the card clickable and navigate to the dedicated **Trie page**.

---

## Heap Result Card

Title:

**Priority Heap**

Subtitle:

**Critical Event Prioritization**

Display:

- Events considered
- Top K
- Highest severity
- Heap operations
- Processing time

Example:

```text
Events Considered
1,284

Top K
10

Highest Severity
CRITICAL

Processing
2.1 ms
```

Include a small heap/tree visualization.

Make the card clickable and navigate to the dedicated **Heap page**.

---

# 6. SECTION D — AI Analysis & Final Results

Create a large panel for the final investigation report.

Header:

**4. AI Analysis & Final Results**

This section should look like a cohesive, unified report rather than disjointed parts. Do not include explicit raw log evidence or timelines here.

Display:

### Incident Summary

A comprehensive paragraph explaining the incident.
Example:
**Database connectivity failure detected on DB-01.** The system experienced a sudden spike in connection timeouts starting at 14:32:03, which rapidly escalated into full connection failures. Repeated retry attempts were unsuccessful, ultimately leading to the database becoming completely unavailable and cascading failures in API requests.

### Key Findings

- Multiple connection failures occurred within a 15-second window.
- Retry attempts failed repeatedly.
- DB-01 became unavailable.
- API requests subsequently began failing.

---

# 7. Investigation Pipeline Visualization

Somewhere near the chat or results section, display a dynamic, step-by-step pipeline. Instead of a static visual, it should have active states, loading symbols, and error reporting.

```text
USER QUESTION
      ↓
[✓] QUERY INTERPRETATION
      ↓
┌────────────┬────────────┬────────────┐
│ [✓] B+ TREE│ [✓] TRIE   │ [✓] HEAP   │
│ Retrieval  │ Search     │ Prioritize │
└────────────┴────────────┴────────────┘
      ↓
[↻] LOCAL LLM (Analyzing...)
      ↓
INVESTIGATION RESULT
```

Use connecting lines/arrows, spinning loaders for active processing, and error states if a step fails.

This pipeline should be one of the visual highlights of the dashboard.

---

# 8. PAGE 2 — B+ TREE

Create a dedicated page for the B+ Tree.

Header:

**B+ Tree**

Subtitle:

**Ordered indexing and efficient range-based log retrieval**

This page must contextualize itself based on the *current investigation* from the dashboard. There are no manual operations here. It visualizes how the B+ Tree processed the last query.

---

## B+ Tree Visualization

Create a highly scalable B+ Tree visualization that supports large datasets (e.g., zoom/pan capabilities, summarized nodes). The frontend will solely handle rendering the graph based on data provided by the C++ backend.

Example:

```text
                         [14:30] [14:35]
                         /       |       \
                        /        |        \
                 [14:20]      [14:32]     [14:40]
                   /  \         /  \         /  \
                  ... ...      ... ...      ... ...
```

Highlight the nodes and the exact traversal path involved in answering the current investigation question.

---

## Data Structure Report & Findings

Display a report generated by the B+ Tree for the current investigation:

- **Traversal Process:** Explain how the tree was navigated for this specific query.
- **Key Findings:** What the B+ Tree specifically uncovered (e.g., "Found 1,284 logs in the 14:30-14:35 range. 7 nodes accessed.").

---

## B+ Tree Information

Show compact cards:

- Total Indexed Records
- Tree Height
- Number of Nodes
- Leaf Nodes
- Last Operation
- Operation Time

Include a small explanation:

**Why B+ Tree?**

"Logs are naturally ordered by timestamp. The B+ Tree enables efficient ordered and range-based retrieval without scanning the entire log collection."

Keep this concise.

---

# 9. PAGE 3 — TRIE

Header:

**Trie**

Subtitle:

**Fast keyword, prefix and pattern-based log search**

---

## Trie Visualization

Create a large visual Trie.

Example:

```text
                         ROOT
                    /      |       \
                 error   database   auth
                   |        |         |
                timeout   connection  failed
                   |
                failure
```

Use circular or rounded nodes connected by lines.

Highlight the path for the currently searched term.

---

## Data Structure Report & Findings

This page must contextualize itself based on the *current investigation* from the dashboard. There are no manual operations here.

Display a report generated by the Trie for the current investigation:

- **Traversal Process:** Explain how the Trie was navigated for the queried keywords.
- **Key Findings:** What the Trie specifically uncovered (e.g., "Matched 'database' and 'timeout' across 342 logs in 1.7ms.").

Note: Ensure the Trie visualization is scalable for large datasets (zoom/pan support) and driven by backend data.

---

## Trie Statistics

Cards:

- Indexed Terms
- Trie Nodes
- Maximum Depth
- Matching Patterns
- Last Search Time

---

## Why Trie?

Show:

"Log messages contain recurring event names, error codes, service names and keywords. The Trie provides efficient prefix and pattern-oriented lookup."

---

# 10. PAGE 4 — HEAP

Header:

**Priority Heap**

Subtitle:

**Prioritize the most critical and relevant log events**

---

## Heap Visualization

Create a large binary heap visualization.

Example:

```text
                         CRITICAL
                         /       \
                     CRITICAL    ERROR
                     /    \      /    \
                  ERROR  ERROR WARNING  ERROR
```

Each node should display:

- Severity
- Priority score
- Short event description

Example:

```text
CRITICAL
Score: 97
DB-01 unavailable
```

---

# 11. Priority Calculation

Clearly show how the heap priority is determined.

Do NOT make it look like an AI-generated score.

Show a deterministic scoring model.

Example:

```text
Severity Weight
CRITICAL    10
ERROR        7
WARNING      4
INFO         1

Priority Score =
Severity Weight
+ Frequency Factor
+ Recency Factor
```

The exact scoring formula should be displayed in a clean card and should be easy to change later in the C++ backend.

---

# 12. Heap Report & Findings

This page must contextualize itself based on the *current investigation* from the dashboard. There are no manual operations here.

Display a report generated by the Heap for the current investigation:

- **Prioritization Process:** Explain how the heap sifted the logs to find the most critical events.
- **Key Findings:** What the Heap specifically prioritized (e.g., "Elevated DB-01 unavailable to Priority 1 based on CRITICAL severity.").

Note: Ensure the Heap visualization is scalable for large datasets (zoom/pan support) and driven by backend data.

---

# 13. Heap Statistics

Display:

- Events in Heap
- Maximum Priority
- Top K
- Heap Operations
- Processing Time
- Current Heap Size

---

# 14. Common UI Components

Use reusable components throughout the application:

- Sidebar
- Top navigation/header
- Metric cards
- Data tables
- Status badges
- Code/log viewer
- Tree visualization components
- Search controls
- Operation panels
- Timeline
- Investigation pipeline
- Toast notifications
- Loading states
- Empty states

---

# 15. Important Interaction Requirements

The application should feel functional even before the C++ backend is connected.

Implement realistic mock data and interactions.

For example:

### Dashboard

Click:

**"Why did the database fail?"**

→ show processing state

→ B+ Tree result updates

→ Trie result updates

→ Heap result updates

→ evidence appears

→ AI explanation appears.

### B+ Tree

Changing the time range should visually change the highlighted nodes and result table using mock data.

### Trie

Searching `database` should highlight the corresponding Trie path and show matching terms.

### Heap

Changing Top-K from 5 to 10 should update the displayed priority events.

The architecture should make these mock interactions easy to replace later with API calls to the C++ backend.

---

# 16. Backend Integration Preparation

Do NOT implement the actual C++ backend or LLM integration yet.

However, structure the frontend as if it will communicate with a C++ REST API.

Use clean service/API abstraction such as:

```text
/api/logs
/api/investigation
/api/bplustree
/api/trie
/api/heap
```

Keep mock data in a separate layer so it can later be replaced with real API responses.

Expected future architecture:

```text
React + TypeScript Frontend
             │
             │ HTTP / REST
             ▼
     Node.js Backend (Orchestrator)
             │
             ├──► Ollama (Local LLM)
             │    1. Tool Selection (Router)
             │    2. Final Summary (Post-processor)
             │
             └──► C++ Engine (Executable via child_process)
                    │   Input: Temp log file + parameters
                    │   Output: JSON metrics + evidence
                    │
                    ├──► B+ Tree
                    ├──► Trie
                    └──► Heap
```

*Note on Architecture:* The LLM acts as an Agent. It is first invoked to determine the query parameters and which DSAs (Tools) to run. Node.js then passes a temporary file of the logs to the C++ binary. C++ handles all algorithmic heavy lifting and returns JSON to Node.js via stdout. Node.js then uses the LLM again to summarize the C++ output before sending the final package to React. In the UI, any DSAs that the LLM chose not to invoke will be visually grayed out.

The frontend should never contain the actual ADS implementation.

---

# 17. Responsive Design

The primary target is desktop/laptop because this is a technical investigation tool.

Optimize for:

- 1440×900
- 1920×1080
- MacBook-sized screens

Still make it responsive enough for smaller screens.

The dashboard should use a structured grid rather than stacking every card vertically on desktop.

---

# 18. Important Academic Presentation Requirement

The UI must make the project's technical contribution immediately visible.

A professor opening the application should immediately understand:

**"The user asks a question → the system uses B+ Tree and Trie to retrieve relevant logs → Heap prioritizes important events → the LLM explains the evidence."**

Do NOT make the UI look like:

> "ChatGPT + some log files."

Instead make it look like:

> **An Advanced Data Structure-based log investigation engine with an AI-assisted interface.**

The B+ Tree, Trie and Heap pages are first-class pages in the application and should be accessible directly from the sidebar.

---

# Final Page Structure

The final application should contain exactly:

```text
LOG INVESTIGATOR
│
├── Investigation
│   └── Main investigation dashboard
│
├── B+ Tree
│   └── Visualization + operations + results
│
├── Trie
│   └── Visualization + operations + results
│
└── Heap
    └── Visualization + operations + results
```

Do not add unnecessary pages or features.

Prioritize **visual clarity, technical credibility, realistic interactions, and clean architecture** over adding more functionality.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/677ee538-8a16-4e05-b09b-f7fee2618647).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
