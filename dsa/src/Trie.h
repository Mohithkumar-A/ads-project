#ifndef TRIE_H
#define TRIE_H

#include "LogRecord.h"
#include <vector>
#include <string>

// We use 256 for all standard ASCII characters
const int ALPHABET_SIZE = 256;

// ── Traversal trace structures ──────────────────────────────
// Captures the character-by-character path taken during search.

struct TrieTraceStep {
    char character;         // the character traversed at this step
    bool found;             // true if the child existed
    int depth;              // depth in the trie (0 = root)
};

struct TrieKeywordTrace {
    std::string keyword;
    std::vector<TrieTraceStep> steps;
    bool terminal_hit;      // true if full keyword was found
    int matches_count;      // number of log records at terminal node
};

struct TrieTraversalPath {
    std::vector<TrieKeywordTrace> keyword_traces;
};

struct TrieNode {
    TrieNode* children[ALPHABET_SIZE];
    bool isEndOfWord;
    
    // Stores pointers to logs that contain this exact word
    std::vector<LogRecord*> logs;

    TrieNode();
    ~TrieNode();
};

class Trie {
private:
    TrieNode* root;
    int nodesAccessed;
    TrieTraversalPath traversalPath;
    
    void toLowerCase(std::string& str);

public:
    Trie();
    ~Trie();
    
    // Insert a single word from a log record
    void insertWord(const std::string& word, LogRecord* record);
    
    // Tokenize a full message and insert all words
    void insertMessage(const std::string& message, LogRecord* record);
    
    // Search for a keyword and return logs containing it
    std::vector<LogRecord*> search(const std::string& keyword);
    
    int getNodesAccessed() const;
    const TrieTraversalPath& getTraversalPath() const;
};

#endif
