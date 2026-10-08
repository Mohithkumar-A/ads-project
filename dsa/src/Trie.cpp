#include "Trie.h"
#include <sstream>
#include <cctype>

TrieNode::TrieNode() {
    isEndOfWord = false;
    for (int i = 0; i < ALPHABET_SIZE; i++) {
        children[i] = nullptr;
    }
}

TrieNode::~TrieNode() {
    for (int i = 0; i < ALPHABET_SIZE; i++) {
        if (children[i] != nullptr) {
            delete children[i];
        }
    }
}

Trie::Trie() {
    root = new TrieNode();
    nodesAccessed = 0;
}

Trie::~Trie() {
    delete root;
}

void Trie::toLowerCase(std::string& str) {
    for (char& c : str) {
        c = std::tolower(static_cast<unsigned char>(c));
    }
}

void Trie::insertWord(const std::string& word, LogRecord* record) {
    TrieNode* cursor = root;
    for (char c : word) {
        int index = static_cast<unsigned char>(c);
        if (cursor->children[index] == nullptr) {
            cursor->children[index] = new TrieNode();
        }
        cursor = cursor->children[index];
    }
    
    // Check if record is already added to avoid duplicates from the same message
    bool alreadyAdded = false;
    for (LogRecord* rec : cursor->logs) {
        if (rec->id == record->id) {
            alreadyAdded = true;
            break;
        }
    }
    
    if (!alreadyAdded) {
        cursor->logs.push_back(record);
        cursor->isEndOfWord = true;
    }
}

void Trie::insertMessage(const std::string& message, LogRecord* record) {
    std::string lowerMessage = message;
    toLowerCase(lowerMessage);
    
    std::string word;
    for (char c : lowerMessage) {
        // Simple tokenization: keep alphanumerics, treat others as spaces
        if (std::isalnum(static_cast<unsigned char>(c)) || c == '_' || c == '-') {
            word += c;
        } else {
            if (!word.empty()) {
                insertWord(word, record);
                word.clear();
            }
        }
    }
    if (!word.empty()) {
        insertWord(word, record);
    }
}

std::vector<LogRecord*> Trie::search(const std::string& keyword) {
    nodesAccessed = 0;
    std::vector<LogRecord*> result;
    
    std::string lowerKey = keyword;
    toLowerCase(lowerKey);
    
    TrieNode* cursor = root;
    nodesAccessed++;
    
    for (char c : lowerKey) {
        int index = static_cast<unsigned char>(c);
        if (cursor->children[index] == nullptr) {
            return result; // Word not found
        }
        cursor = cursor->children[index];
        nodesAccessed++;
    }
    
    if (cursor != nullptr && cursor->isEndOfWord) {
        result = cursor->logs;
    }
    
    return result;
}

int Trie::getNodesAccessed() const {
    return nodesAccessed;
}
