#include "BPlusTree.h"
#include <iostream>

// Initialize node state and clear child pointers
BPlusNode::BPlusNode(bool leaf) {
    isLeaf = leaf;
    size = 0;
    next = nullptr;
    for (int i = 0; i < MAX + 1; ++i) {
        ptrs[i] = nullptr;
    }
}

// Initialize empty tree and reset access counter
BPlusTree::BPlusTree() {
    root = nullptr;
    nodesAccessed = 0;
}

// Clean up all allocated nodes on destruction
BPlusTree::~BPlusTree() {
    destroyTree(root);
}

// Recursively delete nodes in post-order traversal
void BPlusTree::destroyTree(BPlusNode* cursor) {
    if (cursor != nullptr) {
        if (!cursor->isLeaf) {
            for (int i = 0; i <= cursor->size; i++) {
                destroyTree(cursor->ptrs[i]);
            }
        }
        delete cursor;
    }
}

// Insert a log record into the B+ tree using its timestamp as key
void BPlusTree::insert(LogRecord* record) {
    std::string key = record->timestamp;

    // Create a new leaf root if tree is empty
    if (root == nullptr) {
        root = new BPlusNode(true);
        root->keys[0] = key;
        root->dataPtrs[0].push_back(record);
        root->size = 1;
        return;
    }

    BPlusNode* cursor = root;
    BPlusNode* parent = nullptr;

    // Traverse down the internal routing nodes to find the target leaf
    while (!cursor->isLeaf) {
        parent = cursor;
        int i = 0;
        while (i < cursor->size && key >= cursor->keys[i]) {
            i++;
        }
        cursor = cursor->ptrs[i];
    }

    // Append record if identical timestamp already exists in leaf
    for (int i = 0; i < cursor->size; i++) {
        if (cursor->keys[i] == key) {
            cursor->dataPtrs[i].push_back(record);
            return;
        }
    }

    // Insert key directly if leaf has available capacity
    if (cursor->size < MAX) {
        int i = 0;
        while (i < cursor->size && key > cursor->keys[i]) {
            i++;
        }
        // Shift existing keys and pointers right to make space
        for (int j = cursor->size; j > i; j--) {
            cursor->keys[j] = cursor->keys[j - 1];
            cursor->dataPtrs[j] = cursor->dataPtrs[j - 1];
        }
        cursor->keys[i] = key;
        cursor->dataPtrs[i].clear();
        cursor->dataPtrs[i].push_back(record);
        cursor->size++;
    } else {
        // Split saturated leaf node when size reaches MAX
        BPlusNode* newLeaf = new BPlusNode(true);
        std::string virtualKeys[MAX + 1];
        std::vector<LogRecord*> virtualData[MAX + 1];

        // Copy existing leaf entries into temporary buffers
        for (int i = 0; i < MAX; i++) {
            virtualKeys[i] = cursor->keys[i];
            virtualData[i] = cursor->dataPtrs[i];
        }

        // Insert new entry into sorted position in temporary buffers
        int i = 0, j;
        while (i < MAX && key > virtualKeys[i]) {
            i++;
        }
        for (j = MAX; j > i; j--) {
            virtualKeys[j] = virtualKeys[j - 1];
            virtualData[j] = virtualData[j - 1];
        }
        virtualKeys[i] = key;
        virtualData[i].clear();
        virtualData[i].push_back(record);

        // Distribute entries evenly between original leaf and new sibling
        cursor->size = (MAX + 1) / 2;
        newLeaf->size = (MAX + 1) - cursor->size;

        for (i = 0; i < cursor->size; i++) {
            cursor->keys[i] = virtualKeys[i];
            cursor->dataPtrs[i] = virtualData[i];
        }
        for (i = 0, j = cursor->size; i < newLeaf->size; i++, j++) {
            newLeaf->keys[i] = virtualKeys[j];
            newLeaf->dataPtrs[i] = virtualData[j];
        }

        // Maintain linked list pointers between adjacent leaves
        newLeaf->next = cursor->next;
        cursor->next = newLeaf;

        // Create new internal root if original root was split
        if (cursor == root) {
            BPlusNode* newRoot = new BPlusNode(false);
            newRoot->keys[0] = newLeaf->keys[0];
            newRoot->ptrs[0] = cursor;
            newRoot->ptrs[1] = newLeaf;
            newRoot->size = 1;
            root = newRoot;
        } else {
            // Push split key up into parent internal node
            insertInternal(newLeaf->keys[0], parent, newLeaf);
        }
    }
}

// Insert separator key and child pointer into an internal node
void BPlusTree::insertInternal(const std::string& key, BPlusNode* cursor, BPlusNode* child) {
    // Insert directly if internal node has capacity
    if (cursor->size < MAX) {
        int i = 0;
        while (i < cursor->size && key > cursor->keys[i]) {
            i++;
        }
        // Shift keys and pointers right to maintain ordering
        for (int j = cursor->size; j > i; j--) {
            cursor->keys[j] = cursor->keys[j - 1];
            cursor->ptrs[j + 1] = cursor->ptrs[j];
        }
        cursor->keys[i] = key;
        cursor->ptrs[i + 1] = child;
        cursor->size++;
    } else {
        // Split saturated internal node
        BPlusNode* newInternal = new BPlusNode(false);
        std::string virtualKeys[MAX + 1];
        BPlusNode* virtualPtrs[MAX + 2];

        // Copy current keys and child pointers to temporary buffers
        for (int i = 0; i < MAX; i++) {
            virtualKeys[i] = cursor->keys[i];
        }
        for (int i = 0; i < MAX + 1; i++) {
            virtualPtrs[i] = cursor->ptrs[i];
        }

        // Insert new key and child pointer into sorted positions
        int i = 0, j;
        while (i < MAX && key > virtualKeys[i]) {
            i++;
        }
        for (j = MAX; j > i; j--) {
            virtualKeys[j] = virtualKeys[j - 1];
        }
        virtualKeys[i] = key;

        for (j = MAX + 1; j > i + 1; j--) {
            virtualPtrs[j] = virtualPtrs[j - 1];
        }
        virtualPtrs[i + 1] = child;

        // Partition keys and child pointers between split internal nodes
        cursor->size = (MAX + 1) / 2;
        newInternal->size = MAX - cursor->size;

        for (i = 0, j = cursor->size + 1; i < newInternal->size; i++, j++) {
            newInternal->keys[i] = virtualKeys[j];
        }
        for (i = 0, j = cursor->size + 1; i < newInternal->size + 1; i++, j++) {
            newInternal->ptrs[i] = virtualPtrs[j];
        }

        // Create new root if current node was root, otherwise propagate upward
        if (cursor == root) {
            BPlusNode* newRoot = new BPlusNode(false);
            newRoot->keys[0] = virtualKeys[cursor->size];
            newRoot->ptrs[0] = cursor;
            newRoot->ptrs[1] = newInternal;
            newRoot->size = 1;
            root = newRoot;
        } else {
            insertInternal(virtualKeys[cursor->size], findParent(root, cursor), newInternal);
        }
    }
}

// Locate parent node of a given child via recursive tree search
BPlusNode* BPlusTree::findParent(BPlusNode* cursor, BPlusNode* child) {
    if (cursor->isLeaf || cursor->ptrs[0]->isLeaf) {
        return nullptr;
    }
    for (int i = 0; i < cursor->size + 1; i++) {
        if (cursor->ptrs[i] == child) {
            return cursor;
        } else {
            BPlusNode* p = findParent(cursor->ptrs[i], child);
            if (p != nullptr) return p;
        }
    }
    return nullptr;
}

// Perform range search for logs between start_time and end_time
std::vector<LogRecord*> BPlusTree::searchRange(const std::string& start_time, const std::string& end_time) {
    std::vector<LogRecord*> result;
    nodesAccessed = 0;
    traversalPath.nodes.clear();
    traversalPath.edges.clear();

    if (root == nullptr) return result;

    BPlusNode* cursor = root;
    nodesAccessed++;

    // Track root state for search path telemetry
    BPlusTraceNode rootTrace;
    rootTrace.id = "root";
    rootTrace.type = "root";
    for (int i = 0; i < cursor->size; i++) {
        rootTrace.keys.push_back(cursor->keys[i]);
    }
    rootTrace.chosen_branch = -1;

    // Descend through internal routing nodes to locate start leaf
    int internalIdx = 0;
    std::string prevId = "root";

    while (!cursor->isLeaf) {
        int i = 0;
        while (i < cursor->size && start_time >= cursor->keys[i]) {
            i++;
        }

        // Store selected branch on parent node trace
        if (prevId == "root") {
            rootTrace.chosen_branch = i;
        }

        cursor = cursor->ptrs[i];
        nodesAccessed++;

        if (!cursor->isLeaf) {
            // Track intermediate internal node visit
            std::string nodeId = "internal-" + std::to_string(internalIdx);
            BPlusTraceNode internalTrace;
            internalTrace.id = nodeId;
            internalTrace.type = "internal";
            for (int k = 0; k < cursor->size; k++) {
                internalTrace.keys.push_back(cursor->keys[k]);
            }

            // Determine next child pointer to follow
            int nextI = 0;
            while (nextI < cursor->size && start_time >= cursor->keys[nextI]) {
                nextI++;
            }
            internalTrace.chosen_branch = nextI;

            traversalPath.edges.push_back({prevId, nodeId,
                "branch " + std::to_string(i) + " (>= " + start_time + ")"});
            traversalPath.nodes.push_back(internalTrace);
            prevId = nodeId;
            internalIdx++;
        }
    }

    // Add root entry to the traversal trace list
    traversalPath.nodes.insert(traversalPath.nodes.begin(), rootTrace);

    // Sequentially scan leaf linked list across the query range
    int leafIdx = 0;
    bool firstLeafVisit = true;
    while (cursor != nullptr) {
        // The starting leaf was already counted while descending from its
        // parent (or as the root for a one-node tree). Count only linked
        // leaves visited after that first leaf here.
        if (!firstLeafVisit) nodesAccessed++;
        firstLeafVisit = false;
        std::string leafId = "leaf-" + std::to_string(leafIdx);

        BPlusTraceNode leafTrace;
        leafTrace.id = leafId;
        leafTrace.type = "leaf";
        leafTrace.chosen_branch = -1;

        bool done = false;
        // Check keys in current leaf against query bounds
        for (int i = 0; i < cursor->size; i++) {
            leafTrace.keys.push_back(cursor->keys[i]);
            // Terminate search early once keys exceed end timestamp
            if (cursor->keys[i] > end_time) {
                done = true;
                break;
            }
            // Collect matching log records within the time interval
            if (cursor->keys[i] >= start_time) {
                leafTrace.matched_keys.push_back(cursor->keys[i]);
                for (LogRecord* rec : cursor->dataPtrs[i]) {
                    result.push_back(rec);
                }
            }
        }

        // A one-node tree is itself a leaf; update its root trace instead of
        // drawing/counting a second, imaginary leaf below it.
        if (leafIdx == 0 && cursor == root && root->isLeaf) {
            traversalPath.nodes.front().type = "leaf";
            traversalPath.nodes.front().matched_keys = leafTrace.matched_keys;
        } else {
            // Record traversal edges between parent and leaves or across leaves.
            if (leafIdx == 0) {
                traversalPath.edges.push_back({prevId, leafId, "match start"});
            } else {
                std::string prevLeafId = "leaf-" + std::to_string(leafIdx - 1);
                traversalPath.edges.push_back({prevLeafId, leafId, "next pointer (range scan)"});
            }
            traversalPath.nodes.push_back(leafTrace);
        }

        if (done) break;
        // Advance to next leaf node via leaf chaining pointer
        cursor = cursor->next;
        leafIdx++;
    }

    BPlusRangeSearchTrace searchTrace;
    searchTrace.start_time = start_time;
    searchTrace.end_time = end_time;
    searchTrace.nodes_accessed = nodesAccessed;
    searchTrace.results_count = static_cast<int>(result.size());
    searchTrace.nodes = traversalPath.nodes;
    searchTrace.edges = traversalPath.edges;
    traversalPath.searches.push_back(searchTrace);

    return result;
}

// Return number of tree nodes visited during the last query
int BPlusTree::getNodesAccessed() const {
    return nodesAccessed;
}

// Return structured traversal path for frontend rendering
const BPlusTraversalPath& BPlusTree::getTraversalPath() const {
    return traversalPath;
}

