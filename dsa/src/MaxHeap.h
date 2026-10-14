#ifndef MAXHEAP_H
#define MAXHEAP_H

#include "LogRecord.h"
#include <vector>
#include <string>

// ── Traversal trace structures ──────────────────────────────
// Captures the sift-down path taken during each extractMax.

struct HeapSiftStep {
    int index;              // heap array index visited
    std::string label;      // e.g. severity + score
    int left_child_score;   // score of left child (-1 if none)
    int right_child_score;  // score of right child (-1 if none)
    bool swapped;           // whether a swap occurred at this step
    int swapped_with;       // index swapped with (-1 if no swap)
};

struct HeapExtractionTrace {
    int rank;               // 1-based extraction order (Top 1, Top 2, ...)
    std::string extracted_severity;
    std::string extracted_server;
    int extracted_score;
    std::vector<HeapSiftStep> sift_path;  // the sift-down path after extracting root
};

struct HeapTraversalPath {
    int total_heap_size;    // size of heap before extractions
    std::vector<HeapExtractionTrace> extractions;
};

class MaxHeap {
private:
    std::vector<LogRecord*> heap;
    int nodesAccessed;
    HeapTraversalPath traversalPath;

    int parent(int i) { return (i - 1) / 2; }
    int leftChild(int i) { return (2 * i) + 1; }
    int rightChild(int i) { return (2 * i) + 2; }

    void heapifyUp(int index);
    void heapifyDown(int index);
    
    // Traced version for getTopK recording
    void heapifyDownTraced(int index, HeapExtractionTrace& trace);
    
public:
    MaxHeap();
    ~MaxHeap() {} // Vector handles memory

    
    void insert(LogRecord* record);
    LogRecord* extractMax();
    LogRecord* extractMaxTraced(HeapExtractionTrace& trace);
    bool isEmpty() const;
    int size() const;
    
    // Retrieve top K logs
    // Retrieve top K logs without destroying the heap
    std::vector<LogRecord*> getTopK(int k);
    
    int getNodesAccessed() const;
    const HeapTraversalPath& getTraversalPath() const;
};

#endif
