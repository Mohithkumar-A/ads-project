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
   - Use ONLY IF the user explicitly asks for a strict time window (e.g., "between 14:00 and 15:00", "after 09:15").
   - If they ask for generic times like "today" or "24x7", set "used": false.
   - If used, output an array of "ranges" with "start_time" and "end_time" in "HH:MM:SS" format.

2. Trie ('trie'):
   - Use ONLY IF the user is looking for specific concepts, keywords, or services (e.g., "database", "stripe").
   - Extract those concepts into the "keywords" array as simple lowercase strings.

3. Priority Heap ('heap'):
   - ALMOST ALWAYS set "used": true to rank the resulting logs.
   - You must select relevant error tags from this list: [timeout, auth, database, connection, panic, crash, deadlock, latency, 500, 404].
   - Assign a priority score to each chosen tag based on how relevant it is to the user's query (e.g., if they ask about databases, assign {"database": 1000, "timeout": 500}).
   - Set "top_k" to 10 by default.

User query: "${prompt}"

Output MUST be valid JSON exactly matching this structure. 
Example (when time and keywords are specified):
{"bplus":{"used":true,"ranges":[{"start_time":"14:00:00","end_time":"15:00:00"}]},"trie":{"used":true,"keywords":["database"]},"heap":{"used":true,"top_k":10,"tags":{"database":1000,"timeout":500}}}

Example (generic search):
{"bplus":{"used":false,"ranges":[]},"trie":{"used":false,"keywords":[]},"heap":{"used":true,"top_k":5,"tags":{"auth":1000,"404":800}}}`,
    format: "json",
    stream: false,
  })
}).then(r => r.json()).then(console.log).catch(console.error);
