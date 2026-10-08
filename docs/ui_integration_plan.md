# UI & C++ Engine Integration Plan

Now that the C++ Engine is compiled and outputting strict JSON, we need to completely wire it up to the frontend. The main `/api/investigate` pipeline is already prepared, but the frontend also has standalone "Explorer" views (`/bplustree`, `/trie`, `/heap`) that allow the user to manually traverse the data structures. 

Currently, these standalone views use pure Javascript mock functions in the frontend. We need to route them to the C++ engine.

## Step 1: Enable the Engine
- Update `backend/.env` (or set the environment variable) to `ENGINE_AVAILABLE=true`.

## Step 2: Create Standalone Backend DSA Routes
We will create a new router in the backend (e.g., `backend/src/routes/dsa.ts`) to handle direct queries to specific data structures without involving the LLM.

- **`POST /api/bplustree`**: 
  - Receives `logText`, `start_time`, `end_time`.
  - Spawns C++ engine bypassing LLM: `engine.out --file <tmp> --bplus-start <start> --bplus-end <end>`
- **`POST /api/trie`**: 
  - Receives `logText`, `keyword`.
  - Spawns C++ engine bypassing LLM: `engine.out --file <tmp> --trie-keys <keyword>`
- **`POST /api/heap`**: 
  - Receives `logText`, `k`.
  - Spawns C++ engine bypassing LLM: `engine.out --file <tmp> --heap-topk <k>`

## Step 3: Wire the Frontend Explorer Views
Update `frontend/src/features/investigator/mock-api.ts` to replace the Javascript fallbacks with real network calls to our new endpoints:

- Rewrite `mockApi.range()` to `fetch('/api/bplustree')`
- Rewrite `mockApi.trie()` to `fetch('/api/trie')`
- Rewrite `mockApi.heap()` to `fetch('/api/heap')`

## Conclusion
Once these 3 steps are complete, the React frontend will be 100% powered by your C++ Engine for both the main dashboard and the explorer views. At that point, the system is fully functional end-to-end, and the **only** missing piece will be spinning up Ollama to replace the LLM mock!
