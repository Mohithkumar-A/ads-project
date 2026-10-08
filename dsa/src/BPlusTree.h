#ifndef BPLUSTREE_H
#define BPLUSTREE_H

#include "LogRecord.h"
#include <vector>
#include <string>

// Maximum degree of the B+ tree
const int MAX = 4;

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

    void insertInternal(const std::string& key, BPlusNode* cursor, BPlusNode* child);
    BPlusNode* findParent(BPlusNode* cursor, BPlusNode* child);
    void destroyTree(BPlusNode* cursor);

public:
    BPlusTree();
    ~BPlusTree();
    void insert(LogRecord* record);
    std::vector<LogRecord*> searchRange(const std::string& start_time, const std::string& end_time);
    int getNodesAccessed() const;
};

#endif
