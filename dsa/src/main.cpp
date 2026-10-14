#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <chrono>
#include <unordered_map>
#include <algorithm>
#include "LogRecord.h"
#include "BPlusTree.h"
#include "Trie.h"
#include "MaxHeap.h"

using namespace std::chrono;

int getSeverityWeight(const std::string& severity) {
    if (severity == "CRITICAL") return 10;
    if (severity == "ERROR") return 7;
    if (severity == "WARNING") return 4;
    return 1;
}

std::string escapeJSONString(const std::string& s) {
    std::string res;
    for (char c : s) {
        if (c == '\"') res += "\\\"";
        else if (c == '\\') res += "\\\\";
        else res += c;
    }
    return res;
}

int main(int argc, char* argv[]) {
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
        if (line.empty()) continue;
        
        // Expected format: 2026-10-08 14:32:03 [ERROR] DB-01 Connection timeout
        std::stringstream ss(line);
        std::string date, time, sevRaw, server;
        ss >> date >> time >> sevRaw >> server;
        
        std::string message;
        std::getline(ss, message);
        if (!message.empty() && message[0] == ' ') message = message.substr(1);
        
        if (sevRaw.size() > 2) {
            sevRaw = sevRaw.substr(1, sevRaw.size() - 2); // strip brackets
        }

        // DROP NON-ERRORS IMMEDIATELY
        if (sevRaw != "ERROR" && sevRaw != "CRITICAL" && sevRaw != "FATAL") {
            continue;
        }
        
        LogRecord rec;
        rec.id = idCounter++;
        rec.timestamp = date + " " + time;
        rec.severity = sevRaw;
        rec.server = server;
        rec.message = message;
        rec.service = (server.rfind("DB", 0) == 0) ? "Database" :
                      (server.rfind("AUTH", 0) == 0) ? "Auth" :
                      (server.rfind("API", 0) == 0) ? "API" : "Web";
        
        serverFreq[server]++;
        rec.frequency = serverFreq[server];
        rec.recency = (idCounter % 10) + 1; // dummy recency based on recency order
        
        // Base priority score from severity (ties broken by recency)
        rec.priorityScore = getSeverityWeight(rec.severity) * 10 + rec.recency;
        allLogs.push_back(rec);
    }
    
    infile.close();
    
    // 2. Initialize DSAs
    std::vector<LogRecord*> currentEvidence;
    for (auto& log : allLogs) {
        currentEvidence.push_back(&log);
    }
    
    // Metrics variables
    double bplusTime = 0.0, trieTime = 0.0, heapTime = 0.0;
    int bplusNodes = 0, trieNodes = 0, heapNodes = 0;
    
    // Hoisted traversal path data (survives DSA scope destruction)
    BPlusTraversalPath bplusPath;
    TrieTraversalPath triePath;
    HeapTraversalPath heapPath;
    
    // Pipeline Step 1: B+ Tree
    if (useBPlus && !bplusRangesRaw.empty()) {
        auto start = high_resolution_clock::now();
        BPlusTree bpt;
        for (LogRecord* rec : currentEvidence) {
            bpt.insert(rec);
        }
        
        std::unordered_map<int, LogRecord*> uniqueLogs;
        
        // Parse ranges: "08:00:00-09:00:00,12:00:00-13:00:00"
        std::stringstream ssRanges(bplusRangesRaw);
        std::string rangeToken;
        while (std::getline(ssRanges, rangeToken, ',')) {
            size_t hyphenPos = rangeToken.find('-');
            if (hyphenPos != std::string::npos) {
                std::string bStart = rangeToken.substr(0, hyphenPos);
                std::string bEnd = rangeToken.substr(hyphenPos + 1);
                
                bStart = (bStart.length() <= 8) ? ("2026-10-08 " + bStart) : bStart;
                bEnd = (bEnd.length() <= 8) ? ("2026-10-08 " + bEnd) : bEnd;
                
                auto results = bpt.searchRange(bStart, bEnd);
                for (LogRecord* rec : results) {
                    uniqueLogs[rec->id] = rec;
                }
            }
        }
        
        currentEvidence.clear();
        for (auto& pair : uniqueLogs) {
            currentEvidence.push_back(pair.second);
        }
        
        auto end = high_resolution_clock::now();
        bplusTime = duration<double, std::milli>(end - start).count();
        bplusNodes = bpt.getNodesAccessed();
        bplusPath = bpt.getTraversalPath();
    }
    
    // Pipeline Step 2: Trie
    if (useTrie && !trieKeys.empty()) {
        auto start = high_resolution_clock::now();
        Trie trie;
        for (LogRecord* rec : currentEvidence) {
            trie.insertMessage(rec->message, rec);
            trie.insertMessage(rec->server, rec);
            trie.insertMessage(rec->severity, rec);
            trie.insertMessage(rec->service, rec);
        }
        
        // We'll just search for the first key for simplicity in this lab,
        // or union the results if multiple keys. Let's do union.
        std::vector<LogRecord*> trieResults;
        std::unordered_map<int, LogRecord*> uniqueResults;
        for (const std::string& key : trieKeys) {
            auto res = trie.search(key);
            for (LogRecord* r : res) {
                uniqueResults[r->id] = r;
            }
            trieNodes += trie.getNodesAccessed();
        }
        
        currentEvidence.clear();
        for (auto& pair : uniqueResults) {
            currentEvidence.push_back(pair.second);
        }
        
        auto end = high_resolution_clock::now();
        trieTime = duration<double, std::milli>(end - start).count();
        triePath = trie.getTraversalPath();
    }
    
    // Pipeline Step 3: Max Heap
    if (useHeap) {
        auto start = high_resolution_clock::now();
        
        // Parse heapTagsRaw into a map
        std::unordered_map<std::string, int> tagsMap;
        if (!heapTagsRaw.empty()) {
            std::stringstream ss(heapTagsRaw);
            std::string token;
            while (std::getline(ss, token, ',')) {
                size_t colonPos = token.find(':');
                if (colonPos != std::string::npos) {
                    std::string tag = token.substr(0, colonPos);
                    int score = std::stoi(token.substr(colonPos + 1));
                    tagsMap[tag] = score;
                }
            }
        }
        
        MaxHeap mh;
        for (LogRecord* rec : currentEvidence) {
            // Apply dynamic scores based on message contents
            std::string msgLower = rec->message;
            std::transform(msgLower.begin(), msgLower.end(), msgLower.begin(), ::tolower);
            for (const auto& tagPair : tagsMap) {
                std::string tagLower = tagPair.first;
                std::transform(tagLower.begin(), tagLower.end(), tagLower.begin(), ::tolower);
                if (msgLower.find(tagLower) != std::string::npos || rec->service == tagPair.first) {
                    rec->priorityScore += tagPair.second;
                }
            }
            mh.insert(rec);
        }
        
        currentEvidence = mh.getTopK(heapTopK);
        
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
        if (i < currentEvidence.size() - 1) std::cout << ",";
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
    std::cout << "      \"results_count\": " << (useBPlus ? currentEvidence.size() : 0) << ",\n";
    
    // B+ Tree traversal_path
    std::cout << "      \"traversal_path\": {\n";
    std::cout << "        \"type\": \"bplus\",\n";
    std::cout << "        \"nodes\": [\n";
    for (size_t i = 0; i < bplusPath.nodes.size(); i++) {
        const auto& n = bplusPath.nodes[i];
        std::cout << "          {\"id\":\"" << n.id << "\",\"type\":\"" << n.type << "\",\"keys\":[";
        for (size_t k = 0; k < n.keys.size(); k++) {
            std::cout << "\"" << escapeJSONString(n.keys[k]) << "\"";
            if (k < n.keys.size() - 1) std::cout << ",";
        }
        std::cout << "],\"matched_keys\":[";
        for (size_t k = 0; k < n.matched_keys.size(); k++) {
            std::cout << "\"" << escapeJSONString(n.matched_keys[k]) << "\"";
            if (k < n.matched_keys.size() - 1) std::cout << ",";
        }
        std::cout << "],\"chosen_branch\":" << n.chosen_branch << "}";
        if (i < bplusPath.nodes.size() - 1) std::cout << ",";
        std::cout << "\n";
    }
    std::cout << "        ],\n";
    std::cout << "        \"edges\": [\n";
    for (size_t i = 0; i < bplusPath.edges.size(); i++) {
        const auto& e = bplusPath.edges[i];
        std::cout << "          {\"from\":\"" << e.from << "\",\"to\":\"" << e.to << "\",\"label\":\"" << escapeJSONString(e.label) << "\"}";
        if (i < bplusPath.edges.size() - 1) std::cout << ",";
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
    std::cout << "      \"results_count\": " << (useTrie ? currentEvidence.size() : 0) << ",\n";
    
    // Trie traversal_path
    std::cout << "      \"traversal_path\": {\n";
    std::cout << "        \"type\": \"trie\",\n";
    std::cout << "        \"keyword_traces\": [\n";
    for (size_t i = 0; i < triePath.keyword_traces.size(); i++) {
        const auto& kt = triePath.keyword_traces[i];
        std::cout << "          {\"keyword\":\"" << escapeJSONString(kt.keyword) << "\",\"terminal_hit\":" 
                  << (kt.terminal_hit ? "true" : "false") << ",\"matches_count\":" << kt.matches_count << ",\"steps\":[";
        for (size_t j = 0; j < kt.steps.size(); j++) {
            const auto& s = kt.steps[j];
            std::cout << "{\"char\":\"" << escapeJSONString(std::string(1, s.character)) 
                      << "\",\"found\":" << (s.found ? "true" : "false") 
                      << ",\"depth\":" << s.depth << "}";
            if (j < kt.steps.size() - 1) std::cout << ",";
        }
        std::cout << "]}";
        if (i < triePath.keyword_traces.size() - 1) std::cout << ",";
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
    std::cout << "      \"results_count\": " << (useHeap ? currentEvidence.size() : 0) << ",\n";
    
    // Heap traversal_path
    std::cout << "      \"traversal_path\": {\n";
    std::cout << "        \"type\": \"heap\",\n";
    std::cout << "        \"total_heap_size\": " << heapPath.total_heap_size << ",\n";
    std::cout << "        \"extractions\": [\n";
    for (size_t i = 0; i < heapPath.extractions.size(); i++) {
        const auto& ex = heapPath.extractions[i];
        std::cout << "          {\"rank\":" << ex.rank 
                  << ",\"extracted_severity\":\"" << escapeJSONString(ex.extracted_severity) 
                  << "\",\"extracted_server\":\"" << escapeJSONString(ex.extracted_server)
                  << "\",\"extracted_score\":" << ex.extracted_score
                  << ",\"sift_path\":[";
        for (size_t j = 0; j < ex.sift_path.size(); j++) {
            const auto& sp = ex.sift_path[j];
            std::cout << "{\"index\":" << sp.index 
                      << ",\"label\":\"" << escapeJSONString(sp.label)
                      << "\",\"left_child_score\":" << sp.left_child_score
                      << ",\"right_child_score\":" << sp.right_child_score
                      << ",\"swapped\":" << (sp.swapped ? "true" : "false")
                      << ",\"swapped_with\":" << sp.swapped_with << "}";
            if (j < ex.sift_path.size() - 1) std::cout << ",";
        }
        std::cout << "]}";
        if (i < heapPath.extractions.size() - 1) std::cout << ",";
        std::cout << "\n";
    }
    std::cout << "        ]\n";
    std::cout << "      }\n";
    std::cout << "    }\n";
    
    std::cout << "  ]\n";
    std::cout << "}\n";
    
    return 0;
}

