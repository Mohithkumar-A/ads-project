#ifndef MAXHEAP_H
#define MAXHEAP_H

#include "LogRecord.h"
#include <vector>

class MaxHeap {
private:
    std::vector<LogRecord*> heap;
    int nodesAccessed;

    int parent(int i) { return (i - 1) / 2; }
    int leftChild(int i) { return (2 * i) + 1; }
    int rightChild(int i) { return (2 * i) + 2; }

    void heapifyUp(int index);
    void heapifyDown(int index);
    
public:
    MaxHeap();
    ~MaxHeap() {} // Vector handles memory

    
    void insert(LogRecord* record);
    LogRecord* extractMax();
    bool isEmpty() const;
    int size() const;
    
    // Retrieve top K logs
    // Retrieve top K logs without destroying the heap
    std::vector<LogRecord*> getTopK(int k);
    
    int getNodesAccessed() const;
};

#endif
