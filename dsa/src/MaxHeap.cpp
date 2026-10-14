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

void MaxHeap::heapifyDownTraced(int index, HeapExtractionTrace& trace) {
    int maxIndex = index;
    int left = leftChild(index);
    int right = rightChild(index);

    HeapSiftStep step;
    step.index = index;
    step.label = heap[index]->severity + " (Score:" + std::to_string(heap[index]->priorityScore) + ")";
    step.left_child_score = (left < (int)heap.size()) ? heap[left]->priorityScore : -1;
    step.right_child_score = (right < (int)heap.size()) ? heap[right]->priorityScore : -1;
    step.swapped = false;
    step.swapped_with = -1;

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
        step.swapped = true;
        step.swapped_with = maxIndex;
        
        LogRecord* temp = heap[index];
        heap[index] = heap[maxIndex];
        heap[maxIndex] = temp;
        
        nodesAccessed++;
        trace.sift_path.push_back(step);
        heapifyDownTraced(maxIndex, trace);
    } else {
        trace.sift_path.push_back(step);
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

LogRecord* MaxHeap::extractMaxTraced(HeapExtractionTrace& trace) {
    if (heap.empty()) return nullptr;
    
    LogRecord* result = heap[0];
    trace.extracted_severity = result->severity;
    trace.extracted_server = result->server;
    trace.extracted_score = result->priorityScore;
    
    heap[0] = heap.back();
    heap.pop_back();
    
    if (!heap.empty()) {
        heapifyDownTraced(0, trace);
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
    traversalPath.extractions.clear();
    traversalPath.total_heap_size = static_cast<int>(heap.size());

    std::vector<LogRecord*> result;
    
    // Copy the vector to preserve the heap
    std::vector<LogRecord*> tempHeap = heap;
    
    int rank = 1;
    while (!heap.empty() && result.size() < (size_t)k) {
        HeapExtractionTrace trace;
        trace.rank = rank;
        LogRecord* extracted = extractMaxTraced(trace);
        result.push_back(extracted);
        traversalPath.extractions.push_back(trace);
        rank++;
    }
    
    // Restore
    heap = tempHeap;
    
    return result;
}

int MaxHeap::getNodesAccessed() const {
    return nodesAccessed;
}

const HeapTraversalPath& MaxHeap::getTraversalPath() const {
    return traversalPath;
}

