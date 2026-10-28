#include "Trie.h"
#include <sstream>
#include <cctype>

// Initialize node state and clear character branch pointers
TrieNode::TrieNode() {
    isEndOfWord = false;
    for (int i = 0; i < ALPHABET_SIZE; i++) {
        children[i] = nullptr;
    }
}

// Recursively delete all descendant child nodes
TrieNode::~TrieNode() {
    for (int i = 0; i < ALPHABET_SIZE; i++) {
        if (children[i] != nullptr) {
            delete children[i];
        }
    }
}

// Initialize trie with an empty root node
Trie::Trie() {
    root = new TrieNode();
    nodesAccessed = 0;
}

// Clean up entire trie memory starting from root
Trie::~Trie() {
    delete root;
}

// Convert input string to lowercase for case-insensitive matching
void Trie::toLowerCase(std::string& str) {
    for (char& c : str) {
        c = std::tolower(static_cast<unsigned char>(c));
    }
}

// Insert individual token into trie and associate with log record
void Trie::insertWord(const std::string& word, LogRecord* record) {
    TrieNode* cursor = root;
    // Walk down or allocate trie path character by character
    for (char c : word) {
        int index = static_cast<unsigned char>(c);
        if (cursor->children[index] == nullptr) {
            cursor->children[index] = new TrieNode();
        }
        cursor = cursor->children[index];
    }
    
    // Prevent duplicate entries of the same log on repeating tokens
    bool alreadyAdded = false;
    for (LogRecord* rec : cursor->logs) {
        if (rec->id == record->id) {
            alreadyAdded = true;
            break;
        }
    }
    
    // Mark end of token and attach log reference
    if (!alreadyAdded) {
        cursor->logs.push_back(record);
        cursor->isEndOfWord = true;
    }
}

// Tokenize log message into words and index each word
void Trie::insertMessage(const std::string& message, LogRecord* record) {
    std::string lowerMessage = message;
    toLowerCase(lowerMessage);
    
    std::string word;
    // Extract alphanumeric tokens using delimiter separation
    for (char c : lowerMessage) {
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

// Search for exact keyword match and retrieve associated log records
std::vector<LogRecord*> Trie::search(const std::string& keyword) {
    nodesAccessed = 0;
    std::vector<LogRecord*> result;
    
    std::string lowerKey = keyword;
    toLowerCase(lowerKey);
    
    // Initialize search trace telemetry
    TrieKeywordTrace kwTrace;
    kwTrace.keyword = keyword;
    kwTrace.terminal_hit = false;
    kwTrace.matches_count = 0;

    TrieNode* cursor = root;
    nodesAccessed++;
    
    // Traverse down prefix path matching each character
    for (size_t i = 0; i < lowerKey.size(); i++) {
        char c = lowerKey[i];
        int index = static_cast<unsigned char>(c);

        TrieTraceStep step;
        step.character = c;
        step.depth = static_cast<int>(i + 1);

        // Terminate early if character transition does not exist
        if (cursor->children[index] == nullptr) {
            step.found = false;
            kwTrace.steps.push_back(step);
            traversalPath.keyword_traces.push_back(kwTrace);
            return result;
        }

        step.found = true;
        kwTrace.steps.push_back(step);
        cursor = cursor->children[index];
        nodesAccessed++;
    }
    
    // Collect log records if search ends on a completed token
    if (cursor != nullptr && cursor->isEndOfWord) {
        result = cursor->logs;
        kwTrace.terminal_hit = true;
        kwTrace.matches_count = static_cast<int>(cursor->logs.size());
    }

    traversalPath.keyword_traces.push_back(kwTrace);
    return result;
}

// Return number of trie nodes accessed during the last search
int Trie::getNodesAccessed() const {
    return nodesAccessed;
}

// Return keyword traversal trace for UI visualization
const TrieTraversalPath& Trie::getTraversalPath() const {
    return traversalPath;
}

