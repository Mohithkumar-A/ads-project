#include "BPlusTree.h"
#include <iostream>

BPlusNode::BPlusNode(bool leaf) {
    isLeaf = leaf;
    size = 0;
    next = nullptr;
    for (int i = 0; i < MAX + 1; ++i) {
        ptrs[i] = nullptr;
    }
}

BPlusTree::BPlusTree() {
    root = nullptr;
    nodesAccessed = 0;
}

void BPlusTree::insert(LogRecord* record) {
    std::string key = record->timestamp;

    if (root == nullptr) {
        root = new BPlusNode(true);
        root->keys[0] = key;
        root->dataPtrs[0].push_back(record);
        root->size = 1;
        return;
    }

    BPlusNode* cursor = root;
    BPlusNode* parent = nullptr;

    // Traverse down to leaf
    while (!cursor->isLeaf) {
        parent = cursor;
        int i = 0;
        while (i < cursor->size && key >= cursor->keys[i]) {
            i++;
        }
        cursor = cursor->ptrs[i];
    }

    // Check if key already exists in leaf
    for (int i = 0; i < cursor->size; i++) {
        if (cursor->keys[i] == key) {
            cursor->dataPtrs[i].push_back(record);
            return;
        }
    }

    // Insert key into leaf
    if (cursor->size < MAX) {
        int i = 0;
        while (i < cursor->size && key > cursor->keys[i]) {
            i++;
        }
        for (int j = cursor->size; j > i; j--) {
            cursor->keys[j] = cursor->keys[j - 1];
            cursor->dataPtrs[j] = cursor->dataPtrs[j - 1];
        }
        cursor->keys[i] = key;
        cursor->dataPtrs[i].clear();
        cursor->dataPtrs[i].push_back(record);
        cursor->size++;
    } else {
        // Split leaf
        BPlusNode* newLeaf = new BPlusNode(true);
        std::string virtualKeys[MAX + 1];
        std::vector<LogRecord*> virtualData[MAX + 1];

        for (int i = 0; i < MAX; i++) {
            virtualKeys[i] = cursor->keys[i];
            virtualData[i] = cursor->dataPtrs[i];
        }

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

        newLeaf->next = cursor->next;
        cursor->next = newLeaf;

        if (cursor == root) {
            BPlusNode* newRoot = new BPlusNode(false);
            newRoot->keys[0] = newLeaf->keys[0];
            newRoot->ptrs[0] = cursor;
            newRoot->ptrs[1] = newLeaf;
            newRoot->size = 1;
            root = newRoot;
        } else {
            insertInternal(newLeaf->keys[0], parent, newLeaf);
        }
    }
}

void BPlusTree::insertInternal(const std::string& key, BPlusNode* cursor, BPlusNode* child) {
    if (cursor->size < MAX) {
        int i = 0;
        while (i < cursor->size && key > cursor->keys[i]) {
            i++;
        }
        for (int j = cursor->size; j > i; j--) {
            cursor->keys[j] = cursor->keys[j - 1];
            cursor->ptrs[j + 1] = cursor->ptrs[j];
        }
        cursor->keys[i] = key;
        cursor->ptrs[i + 1] = child;
        cursor->size++;
    } else {
        // Split internal node
        BPlusNode* newInternal = new BPlusNode(false);
        std::string virtualKeys[MAX + 1];
        BPlusNode* virtualPtrs[MAX + 2];

        for (int i = 0; i < MAX; i++) {
            virtualKeys[i] = cursor->keys[i];
        }
        for (int i = 0; i < MAX + 1; i++) {
            virtualPtrs[i] = cursor->ptrs[i];
        }

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

        cursor->size = (MAX + 1) / 2;
        newInternal->size = MAX - cursor->size;

        for (i = 0, j = cursor->size + 1; i < newInternal->size; i++, j++) {
            newInternal->keys[i] = virtualKeys[j];
        }
        for (i = 0, j = cursor->size + 1; i < newInternal->size + 1; i++, j++) {
            newInternal->ptrs[i] = virtualPtrs[j];
        }

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

std::vector<LogRecord*> BPlusTree::searchRange(const std::string& start_time, const std::string& end_time) {
    std::vector<LogRecord*> result;
    nodesAccessed = 0;

    if (root == nullptr) return result;

    BPlusNode* cursor = root;
    nodesAccessed++;

    // Traverse to leaf
    while (!cursor->isLeaf) {
        int i = 0;
        while (i < cursor->size && start_time > cursor->keys[i]) {
            i++;
        }
        cursor = cursor->ptrs[i];
        nodesAccessed++;
    }

    // Traverse linked list
    while (cursor != nullptr) {
        nodesAccessed++;
        bool done = false;
        for (int i = 0; i < cursor->size; i++) {
            if (cursor->keys[i] > end_time) {
                done = true;
                break;
            }
            if (cursor->keys[i] >= start_time) {
                // Add all records with this timestamp
                for (LogRecord* rec : cursor->dataPtrs[i]) {
                    result.push_back(rec);
                }
            }
        }
        if (done) break;
        cursor = cursor->next;
    }

    return result;
}

int BPlusTree::getNodesAccessed() const {
    return nodesAccessed;
}
