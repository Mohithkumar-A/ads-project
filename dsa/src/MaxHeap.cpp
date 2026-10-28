#include "MaxHeap.h"

// Initialize empty heap and reset comparison counters
MaxHeap::MaxHeap() {
    nodesAccessed = 0;
}

// Restore max-heap property upwards after an insertion
void MaxHeap::heapifyUp(int index) {
    while (index > 0) {
        LogRecord* curr = heap[index];
        LogRecord* p = heap[parent(index)];
        bool swapNeeded = false;
        // Compare by priority score, breaking ties using newer timestamps
        if (curr->priorityScore > p->priorityScore) {
            swapNeeded = true;
        } else if (curr->priorityScore == p->priorityScore && curr->timestamp > p->timestamp) {
            swapNeeded = true;
        }
        
        if (!swapNeeded) break;
        
        // Swap current node with parent
        heap[index] = p;
        heap[parent(index)] = curr;
        
        index = parent(index);
        nodesAccessed++;
    }
}

// Restore max-heap property downwards from given index
void MaxHeap::heapifyDown(int index) {
    int maxIndex = index;
    int left = leftChild(index);
    int right = rightChild(index);

    // Check if left child has higher priority
    if (left < (int)heap.size()) {
        if (heap[left]->priorityScore > heap[maxIndex]->priorityScore ||
           (heap[left]->priorityScore == heap[maxIndex]->priorityScore && heap[left]->timestamp > heap[maxIndex]->timestamp)) {
            maxIndex = left;
        }
    }
    
    // Check if right child has higher priority than current maximum
    if (right < (int)heap.size()) {
        if (heap[right]->priorityScore > heap[maxIndex]->priorityScore ||
           (heap[right]->priorityScore == heap[maxIndex]->priorityScore && heap[right]->timestamp > heap[maxIndex]->timestamp)) {
            maxIndex = right;
        }
    }

    // Swap and continue sifting down if heap property is violated
    if (index != maxIndex) {
        LogRecord* temp = heap[index];
        heap[index] = heap[maxIndex];
        heap[maxIndex] = temp;
        
        nodesAccessed++;
        heapifyDown(maxIndex);
    }
}

// Sift down while recording each step for visualization
void MaxHeap::heapifyDownTraced(int index, HeapExtractionTrace& trace) {
    int maxIndex = index;
    int left = leftChild(index);
    int right = rightChild(index);

    // Capture current sifting step details
    HeapSiftStep step;
    step.index = index;
    step.label = heap[index]->severity + " (Score:" + std::to_string(heap[index]->priorityScore) + ")";
    step.left_child_score = (left < (int)heap.size()) ? heap[left]->priorityScore : -1;
    step.right_child_score = (right < (int)heap.size()) ? heap[right]->priorityScore : -1;
    step.swapped = false;
    step.swapped_with = -1;

    // Check left child priority
    if (left < (int)heap.size()) {
        if (heap[left]->priorityScore > heap[maxIndex]->priorityScore ||
           (heap[left]->priorityScore == heap[maxIndex]->priorityScore && heap[left]->timestamp > heap[maxIndex]->timestamp)) {
            maxIndex = left;
        }
    }
    
    // Check right child priority
    if (right < (int)heap.size()) {
        if (heap[right]->priorityScore > heap[maxIndex]->priorityScore ||
           (heap[right]->priorityScore == heap[maxIndex]->priorityScore && heap[right]->timestamp > heap[maxIndex]->timestamp)) {
            maxIndex = right;
        }
    }

    // Perform swap if child has higher priority
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

// Insert log record at the end and bubble it up
void MaxHeap::insert(LogRecord* record) {
    heap.push_back(record);
    int index = heap.size() - 1;
    heapifyUp(index);
}

// Remove and return highest priority log record
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

// Extract highest priority record while recording extraction trace
LogRecord* MaxHeap::extractMaxTraced(HeapExtractionTrace& trace) {
    if (heap.empty()) return nullptr;
    
    LogRecord* result = heap[0];
    trace.extracted_severity = result->severity;
    trace.extracted_server = result->server;
    trace.extracted_score = result->priorityScore;
    
    // Replace root with last element and restore heap order
    heap[0] = heap.back();
    heap.pop_back();
    
    if (!heap.empty()) {
        heapifyDownTraced(0, trace);
    }
    
    return result;
}

// Check if heap contains any elements
bool MaxHeap::isEmpty() const {
    return heap.empty();
}

// Return total number of elements in heap
int MaxHeap::size() const {
    return heap.size();
}

// Retrieve the top K highest priority logs without destroying original heap
std::vector<LogRecord*> MaxHeap::getTopK(int k) {
    nodesAccessed = 0;
    traversalPath.extractions.clear();
    traversalPath.initial_nodes.clear();
    traversalPath.total_heap_size = static_cast<int>(heap.size());

    // Record initial heap state for telemetry
    int nodeLimit = static_cast<int>(heap.size());
    for (int i = 0; i < nodeLimit; i++) {
        HeapNodeInfo info;
        info.index = i;
        info.severity = heap[i]->severity;
        info.server = heap[i]->server;
        info.score = heap[i]->priorityScore;
        info.message = heap[i]->message;
        traversalPath.initial_nodes.push_back(info);
    }

    std::vector<LogRecord*> result;
    
    // Make a backup copy to preserve original heap structure
    std::vector<LogRecord*> tempHeap = heap;
    
    // Extract top K elements one by one
    int rank = 1;
    while (!heap.empty() && result.size() < (size_t)k) {
        HeapExtractionTrace trace;
        trace.rank = rank;
        LogRecord* extracted = extractMaxTraced(trace);
        result.push_back(extracted);
        traversalPath.extractions.push_back(trace);
        rank++;
    }
    
    // Restore original heap contents from backup
    heap = tempHeap;
    
    return result;
}

// Return total comparison count
int MaxHeap::getNodesAccessed() const {
    return nodesAccessed;
}

// Return extraction trace telemetry for UI visualization
const HeapTraversalPath& MaxHeap::getTraversalPath() const {
    return traversalPath;
}

