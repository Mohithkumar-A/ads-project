# Comprehensive Backend Architecture Plan

This document outlines the complete technical plan for the backend of the **AI-Powered System Log Investigation Engine**.

The architecture is heavily modularized to decouple the computationally expensive algorithms (C++) from the asynchronous web routing and LLM management (Node.js).

---

## Module 1: The C++ DSA Engine (`/dsa`)

**Responsibility:** Perform lightning-fast, high-volume data processing. It acts strictly as a CLI tool that takes a log file and search parameters, runs the algorithms, and outputs a JSON string.

### Core Components
1. **`LogParser.h` / `LogParser.cpp`**
   - **Role:** Reads the temporary `.log` file line-by-line.
   - **Logic:** Uses Regex or string splitting to convert raw text like `2026-10-08 14:32:03 [ERROR] DB-01 Connection timeout` into a clean C++ `struct LogRecord`.

2. **`BPlusTree.h` / `BPlusTree.cpp`**
   - **Role:** The chronological index.
   - **Logic:** Keys are Unix timestamps (or string-comparable time strings). Values are vectors of pointers to `LogRecord`s. It exposes a `rangeSearch(start_time, end_time)` method to instantly grab all logs in a time window without scanning the whole file.

3. **`Trie.h` / `Trie.cpp`**
   - **Role:** The text search index.
   - **Logic:** A Prefix Tree where each node represents a character. It maps keywords (e.g., "timeout", "database", "API-01") to pointers of `LogRecord`s. It exposes a `search(keyword)` method for instantaneous `O(K)` lookup.

4. **`MaxHeap.h` / `MaxHeap.cpp`**
   - **Role:** The event prioratizer.
   - **Logic:** A priority queue that scores logs based on a deterministic formula: `(Severity Weight) + (Frequency) + (Recency)`. It exposes a `getTopK(int k)` method to bubble up the most critical root-cause events.

5. **`main.cpp` (The Engine Executable)**
   - **Role:** The entry point.
   - **Workflow:** 
     1. Parses command line arguments (e.g., `--file /tmp/123.log --bplus-start 14:00 --trie-keys timeout`).
     2. Instantiates the structures and populates them via the `LogParser`.
     3. Executes the requested searches.
     4. Passes the intersected results into the `MaxHeap`.
     5. Uses the `nlohmann/json` library to format the final logs and performance metrics (time taken, nodes accessed) into a JSON string and prints it to `std::cout`.

---

## Module 2: The Node.js Orchestrator (`/backend`)

**Responsibility:** Act as the traffic controller. It handles HTTP requests from the React frontend, manages files, talks to the local Ollama LLM, and spawns the C++ engine.

### Tech Stack
- **Framework:** Express.js (or Fastify) with TypeScript.
- **Middleware:** `multer` (for handling file uploads), `cors`, `express.json()`.

### Core Workflow (`POST /api/investigate`)
1. **Ingestion:** Receive the natural language query and the log data (either as a raw text payload or a file upload).
2. **File Management:** Write the log data to a temporary file: `/tmp/investigation_[id].log`.
3. **Phase 1 LLM Call:** Send the user's query to Ollama to determine which C++ tools to run.
4. **Child Process Execution:** 
   - Use Node's built-in `child_process.spawn()` or `exec()`.
   - Command: `./dsa/engine.out --file /tmp/investigation_[id].log --args [from LLM]`
   - Capture the `stdout` output and run `JSON.parse()`.
5. **Phase 2 LLM Call:** Send the JSON log evidence from C++ back to Ollama to generate the final human-readable summary.
6. **Cleanup & Response:** 
   - Delete the temporary log file.
   - Combine the LLM summary, the C++ metrics, and the raw evidence into one JSON payload and send it back to the React frontend.

---

## Module 3: The LLM Layer (Phased Implementation)

The LLM (Ollama running `llama3` or `mistral` locally) is utilized as a true AI Agent. Its implementation should be broken down into three phases to ensure stability.

### Phase 1: Tool Routing & Parameter Extraction (Pre-processing)
- **Goal:** Convert natural language into strict C++ arguments.
- **Implementation:** We will use Ollama's **JSON Mode** (enforcing JSON output).
- **System Prompt:**
  ```text
  You are a log investigation routing agent. 
  Extract the search parameters from the user's query.
  Available tools: 
  - BPlusTree (requires start_time and end_time)
  - Trie (requires an array of keywords)
  
  User: "Show me database timeouts between 14:00 and 15:00"
  
  Output MUST be strict JSON:
  {
    "bplus": { "used": true, "start": "14:00", "end": "15:00" },
    "trie": { "used": true, "keywords": ["database", "timeout"] },
    "heap": { "used": true, "top_k": 10 }
  }
  ```

### Phase 2: Evidence Synthesis (Post-processing)
- **Goal:** Turn raw log strings into a professional incident report.
- **Implementation:** Standard text generation.
- **System Prompt:**
  ```text
  You are a DevOps Incident Reporter. 
  The system's data structures have isolated the following critical logs:
  [Insert C++ Output Here]
  
  Write a 2-3 sentence incident summary, and a concise bulleted list of key findings based ONLY on the logs provided.
  ```

### Phase 3: Conversational Memory (Future Enhancement)
- **Goal:** Allow the user to ask follow-up questions without re-uploading or re-processing the entire dataset.
- **Implementation:** Node.js will store an array of previous messages in memory (or Redis). When calling Phase 1 or Phase 2, Node.js will inject the previous chat history so the LLM understands context like "What happened next?" or "Only show me the errors from the DB-02 server you just mentioned."
