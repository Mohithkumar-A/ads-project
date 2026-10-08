#include "MaxHeap.h"

MaxHeap::MaxHeap() {
    nodesAccessed = 0;
}

void MaxHeap::heapifyUp(int index) {
    while (index > 0) {
        LogRecord* curr = heap[index];
        LogRecord* p = heap[parent(index)];
        bool swapNeeded = false;
        if (curr->priorityScore > p->priorityScore) {
            swapNeeded = true;
        } else if (curr->priorityScore == p->priorityScore && curr->timestamp > p->timestamp) {
            swapNeeded = true;
        }
        
        if (!swapNeeded) break;
        
        // Swap
        heap[index] = p;
        heap[parent(index)] = curr;
        
        index = parent(index);
        nodesAccessed++;
    }
}

void MaxHeap::heapifyDown(int index) {
    int maxIndex = index;
    int left = leftChild(index);
    int right = rightChild(index);

    if (left < (int)heap.size()) {
        if (heap[left]->priorityScore > heap[maxIndex]->priorityScore ||
           (heap[left]->priorityScore == heap[maxIndex]->priorityScore && heap[left]->timestamp > heap[maxIndex]->timestamp)) {
            maxIndex = left;
        }
    }
    
    if (right < (int)heap.size()) {
        if (heap[right]->priorityScore > heap[maxIndex]->priorityScore ||
           (heap[right]->priorityScore == heap[maxIndex]->priorityScore && heap[right]->timestamp > heap[maxIndex]->timestamp)) {
            maxIndex = right;
        }
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
    
    // Copy the vector to preserve the heap
    std::vector<LogRecord*> tempHeap = heap;
    
    while (!heap.empty() && result.size() < (size_t)k) {
        result.push_back(extractMax());
    }
    
    // Restore
    heap = tempHeap;
    
    return result;
}

int MaxHeap::getNodesAccessed() const {
    return nodesAccessed;
}
