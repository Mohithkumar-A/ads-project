#include "MaxHeap.h"

MaxHeap::MaxHeap() {
    nodesAccessed = 0;
}

void MaxHeap::heapifyUp(int index) {
    while (index > 0 && heap[parent(index)]->priorityScore < heap[index]->priorityScore) {
        // Swap
        LogRecord* temp = heap[parent(index)];
        heap[parent(index)] = heap[index];
        heap[index] = temp;
        
        index = parent(index);
        nodesAccessed++;
    }
}

void MaxHeap::heapifyDown(int index) {
    int maxIndex = index;
    int left = leftChild(index);
    int right = rightChild(index);

    if (left < (int)heap.size() && heap[left]->priorityScore > heap[maxIndex]->priorityScore) {
        maxIndex = left;
    }
    
    if (right < (int)heap.size() && heap[right]->priorityScore > heap[maxIndex]->priorityScore) {
        maxIndex = right;
    }

    if (index != maxIndex) {
        // Swap
        LogRecord* temp = heap[index];
        heap[index] = heap[maxIndex];
        heap[maxIndex] = temp;
        
        nodesAccessed++;
        heapifyDown(maxIndex);
    }
}

void MaxHeap::insert(LogRecord* record) {
    heap.push_back(record);
    int index = heap.size() - 1;
    heapifyUp(index);
}

LogRecord* MaxHeap::extractMax() {
    if (heap.empty()) return nullptr;
    
    LogRecord* result = heap[0];
    heap[0] = heap.back();
    heap.pop_back();
    
    if (!heap.empty()) {
        heapifyDown(0);
    }
    
    return result;
}

bool MaxHeap::isEmpty() const {
    return heap.empty();
}

int MaxHeap::size() const {
    return heap.size();
}

std::vector<LogRecord*> MaxHeap::getTopK(int k) {
    nodesAccessed = 0;
    std::vector<LogRecord*> result;
    
    // We modify the heap during extractMax, so if we want to preserve it,
    // we would need a copy. For our pipeline, we only extract once.
    while (!heap.empty() && result.size() < (size_t)k) {
        result.push_back(extractMax());
    }
    
    return result;
}

int MaxHeap::getNodesAccessed() const {
    return nodesAccessed;
}
