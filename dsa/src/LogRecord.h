#ifndef LOGRECORD_H
#define LOGRECORD_H

#include <string>

struct LogRecord {
    int id;
    std::string timestamp; // Format: "YYYY-MM-DD HH:MM:SS"
    std::string severity;  // INFO, WARNING, ERROR, CRITICAL
    std::string server;
    std::string message;
    std::string service;
    int frequency;
    int recency;

    // Computed score used by MaxHeap
    int priorityScore;

    // Helper to escape strings for JSON
    std::string escapeJSON(const std::string& s) const {
        std::string res;
        for (char c : s) {
            if (c == '\"') res += "\\\"";
            else if (c == '\\') res += "\\\\";
            else res += c;
        }
        return res;
    }

    std::string toJSON() const {
        return "{\"id\":" + std::to_string(id) + 
               ",\"timestamp\":\"" + timestamp + "\"" +
               ",\"severity\":\"" + severity + "\"" +
               ",\"server\":\"" + escapeJSON(server) + "\"" +
               ",\"message\":\"" + escapeJSON(message) + "\"" +
               ",\"service\":\"" + escapeJSON(service) + "\"" +
               ",\"frequency\":" + std::to_string(frequency) +
               ",\"recency\":" + std::to_string(recency) +
               ",\"priorityScore\":" + std::to_string(priorityScore) + "}";
    }
};

#endif
