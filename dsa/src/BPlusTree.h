#ifndef BPLUSTREE_H
#define BPLUSTREE_H

#include "LogRecord.h"
#include <vector>
#include <string>

// Maximum degree of the B+ tree
const int MAX = 4;

// ── Traversal trace structures ──────────────────────────────
// Captures the exact path taken during a searchRange query.

struct BPlusTraceNode {
    std::string id;         // e.g. "root", "internal-0", "leaf-2"
    std::string type;       // "root", "internal", or "leaf"
    std::vector<std::string> keys;          // keys stored in this node
    std::vector<std::string> matched_keys;  // keys that fell within the query range
    int chosen_branch;      // index of the child pointer followed (-1 for leaves)
};

struct BPlusTraceEdge {
    std::string from;
    std::string to;
    std::string label;      // e.g. ">= 14:10:00", "next pointer"
};

struct BPlusRangeSearchTrace {
    std::string start_time;
    std::string end_time;
    int nodes_accessed;
    int results_count;
    std::vector<BPlusTraceNode> nodes;
    std::vector<BPlusTraceEdge> edges;
};

struct BPlusTraversalPath {
    std::vector<BPlusTraceNode> nodes;
    std::vector<BPlusTraceEdge> edges;
    std::vector<BPlusRangeSearchTrace> searches;
};

struct BPlusNode {
    bool isLeaf;
    int size;
    std::string keys[MAX];
    
    // For leaf nodes: holds pointers to logs with the matching timestamp.
    // Since multiple logs can occur at the same timestamp, we use a vector.
    std::vector<LogRecord*> dataPtrs[MAX]; 
    
    // For internal nodes
    BPlusNode* ptrs[MAX + 1];
    
    // For leaf node chaining
    BPlusNode* next;

    BPlusNode(bool leaf = false);
};

class BPlusTree {
private:
    BPlusNode* root;
    int nodesAccessed;
    BPlusTraversalPath traversalPath;

    void insertInternal(const std::string& key, BPlusNode* cursor, BPlusNode* child);
    BPlusNode* findParent(BPlusNode* cursor, BPlusNode* child);
    void destroyTree(BPlusNode* cursor);

public:
    BPlusTree();
    ~BPlusTree();
    void insert(LogRecord* record);
    std::vector<LogRecord*> searchRange(const std::string& start_time, const std::string& end_time);
    int getNodesAccessed() const;
    const BPlusTraversalPath& getTraversalPath() const;
};

#endif
