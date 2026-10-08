#ifndef TRIE_H
#define TRIE_H

#include "LogRecord.h"
#include <vector>
#include <string>

// We use 256 for all standard ASCII characters
const int ALPHABET_SIZE = 256;

struct TrieNode {
    TrieNode* children[ALPHABET_SIZE];
    bool isEndOfWord;
    
    // Stores pointers to logs that contain this exact word
    std::vector<LogRecord*> logs;

    TrieNode();
};

class Trie {
private:
    TrieNode* root;
    int nodesAccessed;
    
    void toLowerCase(std::string& str);

public:
    Trie();
    
    // Insert a single word from a log record
    void insertWord(const std::string& word, LogRecord* record);
    
    // Tokenize a full message and insert all words
    void insertMessage(const std::string& message, LogRecord* record);
    
    // Search for a keyword and return logs containing it
    std::vector<LogRecord*> search(const std::string& keyword);
    
    int getNodesAccessed() const;
};

#endif
