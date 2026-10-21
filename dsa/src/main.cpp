#include "BPlusTree.h"
#include "LogRecord.h"
#include "MaxHeap.h"
#include "Trie.h"
#include <algorithm>
#include <chrono>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>

using namespace std::chrono;


std::string escapeJSONString(const std::string &s) {
  std::string res;
  for (char c : s) {
    if (c == '\"')
      res += "\\\"";
    else if (c == '\\')
      res += "\\\\";
    else
      res += c;
  }
  return res;
}

int main(int argc, char *argv[]) {
  std::string filePath;
  bool useBPlus = false;
  std::string bplusRangesRaw;

  bool useTrie = false;
  std::vector<std::string> trieKeys;

  bool useHeap = false;
  int heapTopK = 10;
  std::string heapTagsRaw;

  // Parse arguments
  for (int i = 1; i < argc; i++) {
    std::string arg = argv[i];
    if (arg == "--file" && i + 1 < argc) {
      filePath = argv[++i];
    } else if (arg == "--bplus-ranges" && i + 1 < argc) {
      useBPlus = true;
      bplusRangesRaw = argv[++i];
    } else if (arg == "--bplus-start" && i + 1 < argc) {
      useBPlus = true;
      std::string bStart = argv[++i];
      std::string bEnd = (i + 2 < argc && std::string(argv[i + 1]) == "--bplus-end") ? argv[i + 2] : "23:59:59";
      if (!bplusRangesRaw.empty()) bplusRangesRaw += ",";
      bplusRangesRaw += bStart + "-" + bEnd;
    } else if (arg == "--bplus-end" && i + 1 < argc) {
      // If --bplus-end appeared after --bplus-start, it's already handled
      i++;
    } else if (arg == "--trie-keys" && i + 1 < argc) {
      useTrie = true;
      std::string keysRaw = argv[++i];
      std::stringstream ss(keysRaw);
      std::string item;
      while (std::getline(ss, item, ',')) {
        trieKeys.push_back(item);
      }
    } else if (arg == "--heap-topk" && i + 1 < argc) {
      useHeap = true;
      heapTopK = std::stoi(argv[++i]);
    } else if (arg == "--heap-tags" && i + 1 < argc) {
      heapTagsRaw = argv[++i];
    }
  }

  if (filePath.empty()) {
    std::cerr << "Error: --file argument is required." << std::endl;
    return 1;
  }

  // 1. Ingest Data
  std::vector<LogRecord> allLogs;
  std::ifstream infile(filePath);
  if (!infile.is_open()) {
    std::cerr << "Error: Cannot open file " << filePath << std::endl;
    return 1;
  }

  std::string line;
  int idCounter = 1;
  std::unordered_map<std::string, int> serverFreq; // simple frequency map

  while (std::getline(infile, line)) {
    if (line.empty())
      continue;

    // String slicing: locate opening and closing delimiters '[' and ']' near the time
    size_t bracketOpen = line.find('[');
    size_t bracketClose = (bracketOpen != std::string::npos) ? line.find(']', bracketOpen) : std::string::npos;

    std::string timestamp;
    std::string sevRaw;
    std::string server;
    std::string message;

    if (bracketOpen != std::string::npos && bracketClose != std::string::npos) {
      // 1. Timestamp is preceding '['
      timestamp = line.substr(0, bracketOpen);
      size_t tsEnd = timestamp.find_last_not_of(" \t");
      if (tsEnd != std::string::npos) timestamp = timestamp.substr(0, tsEnd + 1);

      // 2. Tag is strictly sliced between '[' and ']'
      sevRaw = line.substr(bracketOpen + 1, bracketClose - bracketOpen - 1);
      size_t tStart = sevRaw.find_first_not_of(" \t");
      size_t tEnd = sevRaw.find_last_not_of(" \t");
      if (tStart != std::string::npos) sevRaw = sevRaw.substr(tStart, tEnd - tStart + 1);

      // 3. Server and message are after ']'
      size_t serverStart = line.find_first_not_of(" \t", bracketClose + 1);
      if (serverStart != std::string::npos) {
        size_t serverEnd = line.find_first_of(" \t", serverStart);
        if (serverEnd != std::string::npos) {
          server = line.substr(serverStart, serverEnd - serverStart);
          size_t msgStart = line.find_first_not_of(" \t", serverEnd);
          if (msgStart != std::string::npos) {
            message = line.substr(msgStart);
          }
        } else {
          server = line.substr(serverStart);
        }
      }
    } else {
      // Fallback if line does not contain bracketed tags
      std::stringstream ss(line);
      std::string date, time;
      ss >> date >> time >> sevRaw >> server;
      timestamp = date + " " + time;
      std::getline(ss, message);
      if (!message.empty() && message[0] == ' ')
        message = message.substr(1);
      if (sevRaw.size() > 2 && sevRaw.front() == '[' && sevRaw.back() == ']') {
        sevRaw = sevRaw.substr(1, sevRaw.size() - 2);
      }
    }

    LogRecord rec;
    rec.id = idCounter++;
    rec.timestamp = timestamp;
    rec.severity = sevRaw;
    rec.server = server;
    rec.message = message;

    // Dynamic service derivation: extract prefix before '-' or '_'
    size_t delimPos = server.find_first_of("-_");
    std::string rawPrefix = (delimPos != std::string::npos) ? server.substr(0, delimPos) : server;
    std::string service;
    if (rawPrefix == "DB" || rawPrefix == "db") {
      service = "Database";
    } else if (!rawPrefix.empty()) {
      service = rawPrefix;
      service[0] = std::toupper(service[0]);
      for (size_t s = 1; s < service.size(); s++) {
        service[s] = std::tolower(service[s]);
      }
    } else {
      service = "General";
    }
    rec.service = service;

    serverFreq[server]++;
    rec.frequency = serverFreq[server];
    rec.recency = rec.id; // Chronological sequence index
    rec.priorityScore = 0; // Evaluated dynamically during MaxHeap pipeline
    allLogs.push_back(rec);
  }

  infile.close();

  // 2. Initialize DSAs
  std::vector<LogRecord *> currentEvidence;
  for (auto &log : allLogs) {
    currentEvidence.push_back(&log);
  }

  // Metrics variables
  double bplusTime = 0.0, trieTime = 0.0, heapTime = 0.0;
  int bplusNodes = 0, trieNodes = 0, heapNodes = 0;
  int bplusResultsCount = 0, trieResultsCount = 0, heapResultsCount = 0;

  // Hoisted traversal path data (survives DSA scope destruction)
  BPlusTraversalPath bplusPath;
  TrieTraversalPath triePath;
  HeapTraversalPath heapPath;
  std::unordered_map<int, int> logMatchDensity;

  // Pipeline Step 1: B+ Tree
  if (useBPlus && !bplusRangesRaw.empty()) {
    auto start = high_resolution_clock::now();
    BPlusTree bpt;
    for (LogRecord *rec : currentEvidence) {
      bpt.insert(rec);
    }

    std::unordered_map<int, LogRecord *> uniqueLogs;

    std::string logDatePrefix = (!allLogs.empty() && allLogs[0].timestamp.length() >= 10)
                                    ? allLogs[0].timestamp.substr(0, 10)
                                    : "2026-10-08";

    // Parse ranges: "08:00:00-09:00:00,12:00:00-13:00:00"
    std::stringstream ssRanges(bplusRangesRaw);
    std::string rangeToken;
    while (std::getline(ssRanges, rangeToken, ',')) {
      size_t hyphenPos = rangeToken.find('-');
      if (hyphenPos != std::string::npos) {
        std::string bStart = rangeToken.substr(0, hyphenPos);
        std::string bEnd = rangeToken.substr(hyphenPos + 1);

        bStart = (bStart.length() <= 8) ? (logDatePrefix + " " + bStart) : bStart;
        bEnd = (bEnd.length() <= 8) ? (logDatePrefix + " " + bEnd) : bEnd;

        auto results = bpt.searchRange(bStart, bEnd);
        for (LogRecord *rec : results) {
          uniqueLogs[rec->id] = rec;
        }
      }
    }

    currentEvidence.clear();
    for (auto &pair : uniqueLogs) {
      currentEvidence.push_back(pair.second);
    }
    bplusResultsCount = static_cast<int>(currentEvidence.size());

    auto end = high_resolution_clock::now();
    bplusTime = duration<double, std::milli>(end - start).count();
    bplusNodes = bpt.getNodesAccessed();
    bplusPath = bpt.getTraversalPath();
  }

  // Pipeline Step 2: Trie
  if (useTrie && !trieKeys.empty()) {
    auto start = high_resolution_clock::now();
    Trie trie;
    for (LogRecord *rec : currentEvidence) {
      trie.insertMessage(rec->message, rec);
      trie.insertMessage(rec->server, rec);
      trie.insertMessage(rec->severity, rec);
      trie.insertMessage(rec->service, rec);
    }

    std::unordered_map<int, LogRecord *> uniqueResults;
    for (const std::string &key : trieKeys) {
      auto res = trie.search(key);
      for (LogRecord *r : res) {
        uniqueResults[r->id] = r;
        logMatchDensity[r->id]++;
      }
      trieNodes += trie.getNodesAccessed();
    }

    currentEvidence.clear();
    for (auto &pair : uniqueResults) {
      currentEvidence.push_back(pair.second);
    }
    trieResultsCount = static_cast<int>(currentEvidence.size());

    auto end = high_resolution_clock::now();
    trieTime = duration<double, std::milli>(end - start).count();
    triePath = trie.getTraversalPath();
  }

  // Pipeline Step 3: Max Heap
  if (useHeap) {
    auto start = high_resolution_clock::now();

    // Parse heapTagsRaw into a map (e.g. CRITICAL:1000,ERROR:500,WARNING:100)
    std::unordered_map<std::string, int> tagsMap;
    if (!heapTagsRaw.empty()) {
      std::stringstream ss(heapTagsRaw);
      std::string token;
      while (std::getline(ss, token, ',')) {
        size_t colonPos = token.find(':');
        if (colonPos != std::string::npos) {
          std::string tag = token.substr(0, colonPos);
          size_t tStart = tag.find_first_not_of(" \t");
          size_t tEnd = tag.find_last_not_of(" \t");
          if (tStart != std::string::npos) tag = tag.substr(tStart, tEnd - tStart + 1);
          std::string tagUpper = tag;
          std::transform(tagUpper.begin(), tagUpper.end(), tagUpper.begin(), ::toupper);
          int score = std::stoi(token.substr(colonPos + 1));
          tagsMap[tagUpper] = score;
        }
      }
    }

    MaxHeap mh;
    for (LogRecord *rec : currentEvidence) {
      // 1. Dynamic base score from LLM severity tag weights
      int baseScore = 0;
      std::string sevUpper = rec->severity;
      std::transform(sevUpper.begin(), sevUpper.end(), sevUpper.begin(), ::toupper);
      auto it = tagsMap.find(sevUpper);
      if (it != tagsMap.end()) {
        baseScore = it->second;
      } else {
        baseScore = 50; // default baseline for unlisted tags
      }

      rec->priorityScore = baseScore + rec->recency;

      // 2. Keyword match density bonus
      int density = logMatchDensity[rec->id];
      if (density > 1) {
        rec->priorityScore += (density - 1) * 200;
      }

      mh.insert(rec);
    }

    currentEvidence = mh.getTopK(heapTopK);
    heapResultsCount = static_cast<int>(currentEvidence.size());

    auto end = high_resolution_clock::now();
    heapTime = duration<double, std::milli>(end - start).count();
    heapNodes = mh.getNodesAccessed();
    heapPath = mh.getTraversalPath();
  }

  // 3. Serialize to JSON
  std::cout << "{\n";
  std::cout << "  \"evidence\": [\n";
  for (size_t i = 0; i < currentEvidence.size(); i++) {
    std::cout << "    " << currentEvidence[i]->toJSON();
    if (i < currentEvidence.size() - 1)
      std::cout << ",";
    std::cout << "\n";
  }
  std::cout << "  ],\n";
  std::cout << "  \"dsa_metrics\": [\n";

  // ── BPlus Metric ──────────────────────────────────────────
  std::cout << "    {\n";
  std::cout << "      \"name\": \"B+ Tree\",\n";
  std::cout << "      \"used\": " << (useBPlus ? "true" : "false") << ",\n";
  std::cout << "      \"time_ms\": " << bplusTime << ",\n";
  std::cout << "      \"nodes_accessed\": " << bplusNodes << ",\n";
  std::cout << "      \"results_count\": " << (useBPlus ? bplusResultsCount : 0)
            << ",\n";

  // B+ Tree traversal_path
  std::cout << "      \"traversal_path\": {\n";
  std::cout << "        \"type\": \"bplus\",\n";
  std::cout << "        \"nodes\": [\n";
  for (size_t i = 0; i < bplusPath.nodes.size(); i++) {
    const auto &n = bplusPath.nodes[i];
    std::cout << "          {\"id\":\"" << n.id << "\",\"type\":\"" << n.type
              << "\",\"keys\":[";
    for (size_t k = 0; k < n.keys.size(); k++) {
      std::cout << "\"" << escapeJSONString(n.keys[k]) << "\"";
      if (k < n.keys.size() - 1)
        std::cout << ",";
    }
    std::cout << "],\"matched_keys\":[";
    for (size_t k = 0; k < n.matched_keys.size(); k++) {
      std::cout << "\"" << escapeJSONString(n.matched_keys[k]) << "\"";
      if (k < n.matched_keys.size() - 1)
        std::cout << ",";
    }
    std::cout << "],\"chosen_branch\":" << n.chosen_branch << "}";
    if (i < bplusPath.nodes.size() - 1)
      std::cout << ",";
    std::cout << "\n";
  }
  std::cout << "        ],\n";
  std::cout << "        \"edges\": [\n";
  for (size_t i = 0; i < bplusPath.edges.size(); i++) {
    const auto &e = bplusPath.edges[i];
    std::cout << "          {\"from\":\"" << e.from << "\",\"to\":\"" << e.to
              << "\",\"label\":\"" << escapeJSONString(e.label) << "\"}";
    if (i < bplusPath.edges.size() - 1)
      std::cout << ",";
    std::cout << "\n";
  }
  std::cout << "        ]\n";
  std::cout << "      }\n";
  std::cout << "    },\n";

  // ── Trie Metric ───────────────────────────────────────────
  std::cout << "    {\n";
  std::cout << "      \"name\": \"Trie\",\n";
  std::cout << "      \"used\": " << (useTrie ? "true" : "false") << ",\n";
  std::cout << "      \"time_ms\": " << trieTime << ",\n";
  std::cout << "      \"nodes_accessed\": " << trieNodes << ",\n";
  std::cout << "      \"results_count\": " << (useTrie ? trieResultsCount : 0)
            << ",\n";

  // Trie traversal_path
  std::cout << "      \"traversal_path\": {\n";
  std::cout << "        \"type\": \"trie\",\n";
  std::cout << "        \"keyword_traces\": [\n";
  for (size_t i = 0; i < triePath.keyword_traces.size(); i++) {
    const auto &kt = triePath.keyword_traces[i];
    std::cout << "          {\"keyword\":\"" << escapeJSONString(kt.keyword)
              << "\",\"terminal_hit\":" << (kt.terminal_hit ? "true" : "false")
              << ",\"matches_count\":" << kt.matches_count << ",\"steps\":[";
    for (size_t j = 0; j < kt.steps.size(); j++) {
      const auto &s = kt.steps[j];
      std::cout << "{\"char\":\""
                << escapeJSONString(std::string(1, s.character))
                << "\",\"found\":" << (s.found ? "true" : "false")
                << ",\"depth\":" << s.depth << "}";
      if (j < kt.steps.size() - 1)
        std::cout << ",";
    }
    std::cout << "]}";
    if (i < triePath.keyword_traces.size() - 1)
      std::cout << ",";
    std::cout << "\n";
  }
  std::cout << "        ]\n";
  std::cout << "      }\n";
  std::cout << "    },\n";

  // ── Heap Metric ───────────────────────────────────────────
  std::cout << "    {\n";
  std::cout << "      \"name\": \"Heap\",\n";
  std::cout << "      \"used\": " << (useHeap ? "true" : "false") << ",\n";
  std::cout << "      \"time_ms\": " << heapTime << ",\n";
  std::cout << "      \"nodes_accessed\": " << heapNodes << ",\n";
  std::cout << "      \"results_count\": " << (useHeap ? heapResultsCount : 0)
            << ",\n";

  // Heap traversal_path
  std::cout << "      \"traversal_path\": {\n";
  std::cout << "        \"type\": \"heap\",\n";
  std::cout << "        \"total_heap_size\": " << heapPath.total_heap_size
            << ",\n";
  std::cout << "        \"initial_nodes\": [\n";
  for (size_t i = 0; i < heapPath.initial_nodes.size(); i++) {
    const auto &n = heapPath.initial_nodes[i];
    std::cout << "          {\"index\":" << n.index << ",\"severity\":\""
              << escapeJSONString(n.severity) << "\""
              << ",\"server\":\"" << escapeJSONString(n.server) << "\""
              << ",\"score\":" << n.score << ",\"message\":\""
              << escapeJSONString(n.message) << "\"}";
    if (i < heapPath.initial_nodes.size() - 1)
      std::cout << ",";
    std::cout << "\n";
  }
  std::cout << "        ],\n";
  std::cout << "        \"extractions\": [\n";
  for (size_t i = 0; i < heapPath.extractions.size(); i++) {
    const auto &ex = heapPath.extractions[i];
    std::cout << "          {\"rank\":" << ex.rank
              << ",\"extracted_severity\":\""
              << escapeJSONString(ex.extracted_severity)
              << "\",\"extracted_server\":\""
              << escapeJSONString(ex.extracted_server)
              << "\",\"extracted_score\":" << ex.extracted_score
              << ",\"sift_path\":[";
    for (size_t j = 0; j < ex.sift_path.size(); j++) {
      const auto &sp = ex.sift_path[j];
      std::cout << "{\"index\":" << sp.index << ",\"label\":\""
                << escapeJSONString(sp.label)
                << "\",\"left_child_score\":" << sp.left_child_score
                << ",\"right_child_score\":" << sp.right_child_score
                << ",\"swapped\":" << (sp.swapped ? "true" : "false")
                << ",\"swapped_with\":" << sp.swapped_with << "}";
      if (j < ex.sift_path.size() - 1)
        std::cout << ",";
    }
    std::cout << "]}";
    if (i < heapPath.extractions.size() - 1)
      std::cout << ",";
    std::cout << "\n";
  }
  std::cout << "        ]\n";
  std::cout << "      }\n";
  std::cout << "    }\n";

  std::cout << "  ]\n";
  std::cout << "}\n";

  return 0;
}
