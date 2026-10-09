const prompt = "Find all timeout and database errors strictly between 08:00:00 and 13:30:00";
fetch("http://127.0.0.1:11434/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "llama3.1",
    prompt: `You are a log investigation routing agent.
Your job is to parse a user query and output a strict JSON routing configuration for our C++ data structures.

RULES FOR DATA STRUCTURES:
1. B+ Tree ('bplus'):
   - ALWAYS set "used": true.
   - If the user explicitly asks for a strict time window (e.g., "between 14:00 and 15:00"), extract those into "ranges" with "start_time" and "end_time" in "HH:MM:SS" format.
   - If they ask for generic times or no time is specified, use a default range of "00:00:00" to "23:59:59".

2. Trie ('trie'):
   - ALWAYS set "used": true.
   - Extract specific concepts, keywords, or services into the "keywords" array as lowercase strings.
   - If no specific keywords are requested, use a default keyword "error".

3. Priority Heap ('heap'):
   - ALMOST ALWAYS set "used": true to rank the resulting logs.
   - You must select relevant error tags from this list: [timeout, auth, database, connection, panic, crash, deadlock, latency, 500, 404].
   - Assign a priority score to each chosen tag based on how relevant it is to the user's query.
   - Set "top_k" to 10 by default.

User query: "${prompt}"

Output MUST be valid JSON exactly matching this structure.
Always output bplus used=true and trie used=true. Provide default range and keywords if none exist in the query.

Example structure (DO NOT copy these values unless relevant, only use the structure):
{"bplus":{"used":true,"ranges":[{"start_time":"14:00:00","end_time":"15:00:00"}]},"trie":{"used":true,"keywords":["database"]},"heap":{"used":true,"top_k":10,"tags":{"database":1000,"timeout":500}}}`,
    format: "json",
    stream: false,
  })
}).then(r => r.json()).then(console.log).catch(console.error);
