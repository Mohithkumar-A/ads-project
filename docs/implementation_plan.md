# Node.js Orchestrator Implementation Plan

This document details the step-by-step technical implementation plan for the **Node.js backend** (Module 2). The backend acts as the bridge between the React frontend, the local Ollama LLM, and the C++ data structures engine.

---

## 1. Project Initialization & Tooling
The backend will be a robust, strictly typed Node.js application.
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Key Dependencies:** 
  - `express` (Routing)
  - `cors` (Cross-origin resource sharing for the frontend)
  - `multer` (Handling raw log file uploads)
  - `uuid` (Generating unique temporary file names)

---

## 2. Directory Structure

We will adopt a layered architecture to keep routing, business logic, and external processes strictly separated.

```text
backend/
├── src/
│   ├── index.ts              # Express application entry point & middleware config
│   ├── routes/
│   │   └── investigate.ts    # Defines the POST /api/investigate endpoint
│   ├── services/
│   │   ├── llm.ts            # API wrappers for Ollama (Phase 1 & Phase 2)
│   │   └── engine.ts         # child_process logic to execute the C++ binary
│   └── utils/
│       └── fileManager.ts    # Helpers for writing/deleting temp log files
├── temp/                     # Ephemeral storage for incoming logs (git-ignored)
├── package.json
└── tsconfig.json
```

---

## 3. Step-by-Step Implementation

### Step 1: Server Setup & Routing
1. Initialize the Express server in `src/index.ts`.
2. Configure `cors` to allow requests from the Vite frontend (port `5173`).
3. Setup global JSON parsing and URL encoding middleware.
4. Mount the primary router: `app.use('/api', investigateRouter)`.

### Step 2: File Handling (`utils/fileManager.ts`)
1. Implement a system to handle incoming logs. If the frontend sends a file, `multer` will catch it. If the frontend sends copy-pasted text, we must manually write it to a file.
2. Store the file in `backend/temp/[uuid].log`.
3. Provide an asynchronous `cleanupTempFile(filepath)` function to securely delete files after processing to prevent memory leaks.

### Step 3: LLM Phase 1 - Tool Routing (`services/llm.ts`)
1. Implement `determineSearchParameters(prompt: string)`.
2. Make a `fetch` request to the local Ollama instance (`http://127.0.0.1:11434/api/generate`).
3. Instruct Ollama to use `format: "json"`.
4. Parse the output into a strict TypeScript interface representing the C++ arguments (e.g., `{ bplus: { start: "...", end: "..." }, trie: { keywords: [...] } }`).

### Step 4: C++ Engine Orchestration (`services/engine.ts`)
1. Implement `executeDSA(filePath: string, params: AgentParams)`.
2. Map the JSON parameters into a CLI argument string.
3. Use Node's native `child_process.spawn()` to execute `../dsa/engine.out`.
4. Attach listeners to `stdout` and `stderr`.
5. Buffer the incoming `stdout` stream until the process exits (`close` event).
6. Run `JSON.parse(buffer)` to convert the C++ output back into a JavaScript object.

### Step 5: LLM Phase 2 - Synthesis (`services/llm.ts`)
1. Implement `generateSummary(prompt: string, cppEvidence: any)`.
2. Construct a prompt containing both the user's original question and the raw log evidence returned by the C++ engine.
3. Make a standard text-generation request to Ollama.

### Step 6: The Pipeline Controller (`routes/investigate.ts`)
Tie it all together in the main route handler:
```typescript
router.post('/investigate', upload.single('logFile'), async (req, res) => {
    // 1. Save File
    const filePath = await saveTempFile(req);
    
    try {
        // 2. Ask LLM what to search
        const params = await determineSearchParameters(req.body.prompt);
        
        // 3. Run C++ Engine
        const cppResult = await executeDSA(filePath, params);
        
        // 4. Ask LLM to summarize results
        const summary = await generateSummary(req.body.prompt, cppResult.evidence);
        
        // 5. Send payload back to Frontend
        res.json({
            summary,
            metrics: cppResult.metrics,
            evidence: cppResult.evidence
        });
    } finally {
        // 6. Cleanup
        await cleanupTempFile(filePath);
    }
});
```

---

## 4. Error Handling & Edge Cases
- **C++ Crashes:** If `spawn` exits with a non-zero status code (e.g. segmentation fault in C++), the Promise will reject and Express will return a `500 Internal Server Error`.
- **LLM Hallucinations:** Wrap `JSON.parse` around Phase 1 in a `try/catch`. If the LLM returns invalid JSON, implement a fallback default (e.g., tell the engine to just return the Top-K Heap events).
- **Orphaned Files:** The `finally` block in the router ensures the temporary file is deleted even if the LLM or C++ engine throws an exception.
