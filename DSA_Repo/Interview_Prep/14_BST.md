# Chapter 14 — Binary Search Trees (BST)

> **Revision target:** 0.5 day  
> **Goal:** After reading this file, you need nothing else for this topic — no code files, no YouTube, no tutorials.

---

## Table of Contents

1. [BST Property — The Foundation](#1-bst-property--the-foundation)
2. [Insertion in BST — Your Code](#2-insertion-in-bst--your-code)
3. [Searching in BST — Your Code](#3-searching-in-bst--your-code)
4. [Min and Max in BST — Your Code](#4-min-and-max-in-bst--your-code)
5. [Deletion in BST — Your Code (with Bug Analysis)](#5-deletion-in-bst--your-code-with-bug-analysis)
6. [Validate BST — Range Approach (Critical!)](#6-validate-bst--range-approach-critical)
7. [Inorder Predecessor and Successor](#7-inorder-predecessor-and-successor)
8. [Kth Smallest and Kth Largest in BST](#8-kth-smallest-and-kth-largest-in-bst)
9. [LCA in BST — Exploiting BST Property](#9-lca-in-bst--exploiting-bst-property)
10. [BST to Balanced BST](#10-bst-to-balanced-bst)
11. [Convert BST to Greater Tree](#11-convert-bst-to-greater-tree)
12. [Largest BST Subtree](#12-largest-bst-subtree)
13. [Things Most People Forget](#13-things-most-people-forget)
14. [Practice Problems](#14-practice-problems)
15. [Final Revision Sheet](#15-final-revision-sheet)

---

## 1. BST Property — The Foundation

**BST Property:** For every node N:
- All values in the **left subtree** are **strictly less than** N's value.
- All values in the **right subtree** are **strictly greater than** N's value.
- Both subtrees are also valid BSTs.

**The killer property:** Inorder traversal of a BST gives a **sorted sequence** in ascending order.

This single property is the basis for:
- Kth smallest/largest → inorder counter
- Validate BST → inorder must be strictly increasing
- BST search → O(h) instead of O(n)
- Successor/predecessor → the neighbor in the inorder sequence

```
         50
        /  \
      30    70
     / \   / \
   20  40 60  80

Inorder: 20 30 40 50 60 70 80  ← sorted!
```

**Height matters critically:**

| Case | Height | Search/Insert/Delete |
|------|--------|---------------------|
| Balanced BST | O(log n) | O(log n) |
| Skewed BST (sorted input) | O(n) | O(n) |
| AVL/Red-Black Tree | O(log n) guaranteed | O(log n) guaranteed |

**When BST degrades to linked list:** Inserting already-sorted data into a BST (e.g., 1, 2, 3, 4, 5) produces a right-skewed tree — every node has only a right child. All operations become O(n).

---

## 2. Insertion in BST — Your Code

**Algorithm:** Compare with current node. If smaller, go left. If larger or equal, go right. When you hit NULL, insert.

```cpp
// From Creation_of_BST.cpp / Searching_in_BST.cpp / Deletion_in_BST.cpp
Node* insertIntoBST(Node* root, int data) {
    if (root == NULL) {
        root = new Node(data);
        return root;
    }
    if (root->data > data) {
        root->left = insertIntoBST(root->left, data);   // go left
    } else {
        root->right = insertIntoBST(root->right, data); // go right
    }
    return root;
}
```

**From your code (Creation_of_BST.cpp):** The `return root` at the end is essential — it propagates the pointer back up the recursion chain. Without it, only the local pointer changes and the tree doesn't update.

**Why return the root?** In C++, passing by value means the parameter `root` is a copy. Returning and reassigning (`root->left = insertIntoBST(...)`) updates the actual pointer in the parent node.

**Iterative insertion:**

```cpp
Node* insertIterative(Node* root, int data) {
    Node* newNode = new Node(data);
    if (!root) return newNode;

    Node* curr = root;
    while (true) {
        if (curr->data > data) {
            if (!curr->left) { curr->left = newNode; break; }
            curr = curr->left;
        } else {
            if (!curr->right) { curr->right = newNode; break; }
            curr = curr->right;
        }
    }
    return root;
}
```

**Complexity:** O(h) — height of the tree. O(log n) balanced, O(n) worst case.

---

## 3. Searching in BST — Your Code

**Key insight:** At each node, you can eliminate HALF the remaining search space (unlike binary search on arrays which eliminates half of n, BST eliminates the entire other subtree).

```cpp
// From Searching_in_BST.cpp
bool findNode(Node* root, int target) {
    if (root == NULL) return false;
    if (root->data == target) return true;
    else if (root->data > target) {
        return findNode(root->left, target);   // target is smaller → go left
    } else {
        return findNode(root->right, target);  // target is larger → go right
    }
}
```

**From your code (Searching_in_BST.cpp):** This is tail recursion — the recursive calls are the last operations. An iterative version is equally efficient and avoids stack overhead:

```cpp
bool findNodeIterative(Node* root, int target) {
    while (root != NULL) {
        if (root->data == target) return true;
        else if (root->data > target) root = root->left;
        else                          root = root->right;
    }
    return false;
}
```

**Pattern in Deletion_in_BST.cpp — returning a Node* instead of bool:**

```cpp
Node* findNode(Node* root, int target) {
    if (root == NULL) return NULL;
    if (root->data == target) return root;
    else if (root->data > target) return findNode(root->left, target);
    else                          return findNode(root->right, target);
}
```

This version is more useful when you need to do something with the found node.

**Complexity:** O(h) — O(log n) balanced, O(n) worst.

---

## 4. Min and Max in BST — Your Code

**Key insight:** In a BST, minimum is always the **leftmost** node, maximum is always the **rightmost** node.

```cpp
// From Maximum_and_Minimum_in_BST.cpp
int findMin(Node* root) {
    Node* temp = root;
    if (temp == NULL) return -1;
    while (temp->left != NULL) {
        temp = temp->left;
    }
    return temp->data;
}

int findMax(Node* root) {
    Node* temp = root;
    if (temp == NULL) return -1;
    while (temp->right != NULL) {
        temp = temp->right;
    }
    return temp->data;
}
```

**From your code (Maximum_and_Minimum_in_BST.cpp):** The iterative approach is preferred here — no recursion overhead and perfectly clear. `findMin` is essentially "find the inorder predecessor of the imaginary node after the root".

**Also appears in Deletion_in_BST.cpp:** `findMax(root->left)` is used to find the inorder predecessor during deletion. The max of the left subtree = the largest value smaller than the root = the inorder predecessor.

**Complexity:** O(h)

---

## 5. Deletion in BST — Your Code (with Bug Analysis)

Deletion is the hardest BST operation. There are three cases.

### Three Cases of Deletion

```
Case 1: Node to delete is a LEAF (no children)
         → Simply remove it (return NULL to parent)

Case 2: Node to delete has ONE child
         → Return the existing child to the parent (bypass the node)

Case 3: Node to delete has TWO children
         → Replace node's value with either:
            - Inorder predecessor (max of left subtree), OR
            - Inorder successor (min of right subtree)
           Then delete the predecessor/successor from its position
```

### Clean Implementation — `deleteNodeInBST` from your code

```cpp
// From Deletion_in_BST.cpp — the CORRECT implementation
Node* deleteNodeInBST(Node* root, int target) {
    if (root == NULL) return root;

    if (root->data == target) {
        // Case 1: Leaf
        if (root->left == NULL && root->right == NULL)
            return NULL;
        // Case 2a: No right child
        else if (root->left != NULL && root->right == NULL)
            return root->left;
        // Case 2b: No left child
        else if (root->left == NULL && root->right != NULL)
            return root->right;
        // Case 3: Two children — use inorder predecessor (max of left subtree)
        else {
            int inorderPred = findMax(root->left);   // max of left subtree
            root->data = inorderPred;                 // replace root's value
            root->left = deleteNodeInBST(root->left, inorderPred); // delete pred
            return root;
        }
    } else if (root->data < target) {
        root->right = deleteNodeInBST(root->right, target);
    } else {
        root->left = deleteNodeInBST(root->left, target);
    }
    return root;
}
```

### Bug in the OTHER delete function — `deleteInBST`

Your code also contains `deleteInBST` which has a critical bug:

```cpp
// From Deletion_in_BST.cpp — BUGGY implementation
// In Case 3 (two children):
Node *newNode = currNode->right;
while (!newNode->left) {      // BUG: !newNode->left means "while left is NULL"
    newNode = newNode->left;  //      → dereferences NULL → CRASH
}
```

**The bug:** `while (!newNode->left)` means "while left child IS NULL, keep going left". This immediately dereferences `newNode->left` which is NULL. It should be `while (newNode->left != NULL)` (go left until you can't).

**Also:** This function tries to find the **inorder successor** (min of right subtree) using `while(newNode->left)` but the correct implementation is in `deleteNodeInBST` which uses the **inorder predecessor** (max of left subtree) via `findMax(root->left)`. Both approaches are valid if implemented correctly.

**The correct inorder successor approach:**

```cpp
// Case 3 using inorder successor
Node* minRight = root->right;
while (minRight->left != NULL) minRight = minRight->left;  // find leftmost of right subtree
root->data = minRight->data;
root->right = deleteNodeInBST(root->right, minRight->data);
return root;
```

### Why return root?

Each level of recursion propagates the updated subtree pointer to the parent:

```cpp
root->left  = deleteNodeInBST(root->left,  target);
root->right = deleteNodeInBST(root->right, target);
return root;
```

This is the same pattern as insertion. The `return root` ensures the tree structure stays intact at every level.

**Complexity:** O(h) — O(log n) balanced, O(n) worst case.

---

## 6. Validate BST — Range Approach (Critical!)

**This is the most commonly missed BST concept in interviews.** Many people write the wrong solution.

### The Wrong Approach

```cpp
// WRONG — only checks local parent-child relationship
bool isValidBST_WRONG(Node* root) {
    if (!root) return true;
    if (root->left && root->left->data >= root->data) return false;
    if (root->right && root->right->data <= root->data) return false;
    return isValidBST_WRONG(root->left) && isValidBST_WRONG(root->right);
}
```

**Why wrong?** Consider this tree:

```
       5
      / \
     1   4
        / \
       3   6
```

The left child of 4 is 3. Locally, 3 < 4 ✓. But 3 < 5 (root), and 3 is in the RIGHT subtree of 5 → BST property violated! The wrong approach misses this.

### The Correct Approach — Pass Range [min, max] Down

```cpp
bool isValidBSTHelper(Node* root, long long minVal, long long maxVal) {
    if (root == NULL) return true;
    if (root->data <= minVal || root->data >= maxVal) return false;

    return isValidBSTHelper(root->left,  minVal,       root->data) &&
           isValidBSTHelper(root->right, root->data,   maxVal);
}

bool isValidBST(Node* root) {
    return isValidBSTHelper(root, LLONG_MIN, LLONG_MAX);
}
```

**How it works:** Each node must satisfy `minVal < node->data < maxVal`. When going left, the upper bound tightens to the parent's value (all values in the left subtree must be < parent). When going right, the lower bound tightens to the parent's value.

**Why `long long` for bounds?** If the tree contains `INT_MIN`, we can't use `INT_MIN` as the lower bound sentinel — comparisons break. Use `LLONG_MIN` and `LLONG_MAX`.

**Trace on the wrong example:**

```
isValid(5, -∞, +∞): 5 is in range ✓
  isValid(1, -∞, 5): 1 in range ✓
  isValid(4, 5, +∞): 4 <= 5 → FAIL ✓ (correctly detected!)
```

### Alternative — Inorder Must Be Strictly Increasing

```cpp
bool isValidBST_Inorder(Node* root) {
    long long prev = LLONG_MIN;

    function<bool(Node*)> inorder = [&](Node* node) -> bool {
        if (!node) return true;
        if (!inorder(node->left)) return false;
        if (node->data <= prev) return false;  // not strictly increasing
        prev = node->data;
        return inorder(node->right);
    };
    return inorder(root);
}
```

**Why this works:** Inorder traversal of a valid BST must produce a strictly increasing sequence. If any value is ≤ the previous value, the BST property is violated.

**Why strict inequality (`<=`):** A BST (standard definition) has NO duplicate values. If `current == prev`, that's a violation.

---

## 7. Inorder Predecessor and Successor

**Inorder predecessor of N:** The largest value smaller than N. In BST = the rightmost node of N's left subtree (if left subtree exists), OR the deepest ancestor from which we last turned right.

**Inorder successor of N:** The smallest value larger than N. In BST = the leftmost node of N's right subtree (if right subtree exists), OR the deepest ancestor from which we last turned left.

### Finding Predecessor and Successor with BST Property

```cpp
void findPredSucc(Node* root, Node*& pred, Node*& succ, int key) {
    if (!root) return;

    if (root->data == key) {
        // Predecessor: max of left subtree
        if (root->left) {
            Node* tmp = root->left;
            while (tmp->right) tmp = tmp->right;
            pred = tmp;
        }
        // Successor: min of right subtree
        if (root->right) {
            Node* tmp = root->right;
            while (tmp->left) tmp = tmp->left;
            succ = tmp;
        }
        return;
    }

    if (root->data > key) {
        succ = root;               // root could be successor (going left → root is potential successor)
        findPredSucc(root->left, pred, succ, key);
    } else {
        pred = root;               // root could be predecessor (going right → root is potential predecessor)
        findPredSucc(root->right, pred, succ, key);
    }
}
```

**The key insight about updating pred/succ during traversal:**
- When we go LEFT to find the key (because key < root), the current root is a potential SUCCESSOR (it's larger than key, and going left means the key is in the left subtree, so root comes after key in inorder).
- When we go RIGHT to find the key (because key > root), the current root is a potential PREDECESSOR.

### Inorder in BST — Used for Predecessor/Successor

```cpp
// Simple inorder approach: collect all, find neighbors
void inorder(Node* root, vector<int>& vals) {
    if (!root) return;
    inorder(root->left, vals);
    vals.push_back(root->data);
    inorder(root->right, vals);
}
// Then find k-1 and k+1 for key k. O(n).
// BST property approach above is O(h). Use that in interviews.
```

---

## 8. Kth Smallest and Kth Largest in BST

**The key:** Inorder of BST gives sorted ascending. Kth element in inorder = kth smallest.

### Kth Smallest — Inorder Counter

```cpp
int kthSmallest(Node* root, int k) {
    int count = 0, result = -1;

    function<void(Node*)> inorder = [&](Node* node) {
        if (!node || count >= k) return;
        inorder(node->left);
        count++;
        if (count == k) { result = node->data; return; }
        inorder(node->right);
    };

    inorder(root);
    return result;
}
// Time: O(k + h)   Space: O(h)
```

**The early termination:** Once `count == k`, we don't need to traverse further. The `count >= k` check in the base case prevents unnecessary recursion.

### Kth Largest — Reverse Inorder Counter

```cpp
int kthLargest(Node* root, int k) {
    int count = 0, result = -1;

    function<void(Node*)> reverseInorder = [&](Node* node) {
        if (!node || count >= k) return;
        reverseInorder(node->right);  // go RIGHT first for descending order
        count++;
        if (count == k) { result = node->data; return; }
        reverseInorder(node->left);
    };

    reverseInorder(root);
    return result;
}
```

**Why reverse inorder gives kth largest:** Inorder = ascending. Reverse inorder = descending. kth element in descending = kth largest.

**Iterative kth smallest:**

```cpp
int kthSmallestIterative(Node* root, int k) {
    stack<Node*> st;
    Node* curr = root;
    int count = 0;

    while (!st.empty() || curr) {
        while (curr) { st.push(curr); curr = curr->left; }
        curr = st.top(); st.pop();
        count++;
        if (count == k) return curr->data;
        curr = curr->right;
    }
    return -1;
}
```

This is just iterative inorder with a counter. Stops when count reaches k.

---

## 9. LCA in BST — Exploiting BST Property

For a general binary tree, LCA requires O(n). For a BST, we can use the BST property for O(h).

**Key insight:**

- If both p and q are less than root → LCA is in the LEFT subtree.
- If both p and q are greater than root → LCA is in the RIGHT subtree.
- Otherwise (one ≤ root ≤ other, or root == p or q) → ROOT is the LCA.

```cpp
Node* lcaBST(Node* root, int p, int q) {
    if (!root) return NULL;

    if (p < root->data && q < root->data)
        return lcaBST(root->left, p, q);   // both in left subtree
    if (p > root->data && q > root->data)
        return lcaBST(root->right, p, q);  // both in right subtree

    return root;  // they split here → root is LCA
}
// Time: O(h)   Space: O(h) for recursion
```

**Iterative version — O(h) time, O(1) space:**

```cpp
Node* lcaBSTIterative(Node* root, int p, int q) {
    while (root) {
        if (p < root->data && q < root->data)
            root = root->left;
        else if (p > root->data && q > root->data)
            root = root->right;
        else
            return root;
    }
    return NULL;
}
```

**Comparison with general tree LCA:**

| | General Binary Tree | BST |
|--|--------------------|----|
| Algorithm | DFS, checks all nodes | Directed search via BST property |
| Time | O(n) | O(h) |
| Space | O(h) | O(1) iterative |
| Works without knowing if nodes exist | Yes (returns NULL if not found) | Need to handle separately |

---

## 10. BST to Balanced BST

**Problem:** Given an unbalanced BST (e.g., right-skewed), convert to a balanced BST.

**Approach:**
1. Inorder traversal to extract sorted values. O(n)
2. Build balanced BST from sorted array. O(n)

```cpp
void inorderExtract(Node* root, vector<int>& vals) {
    if (!root) return;
    inorderExtract(root->left, vals);
    vals.push_back(root->data);
    inorderExtract(root->right, vals);
}

Node* buildBalanced(vector<int>& vals, int start, int end) {
    if (start > end) return NULL;
    int mid = (start + end) / 2;
    Node* root = new Node(vals[mid]);
    root->left  = buildBalanced(vals, start, mid - 1);
    root->right = buildBalanced(vals, mid + 1, end);
    return root;
}

Node* bstToBalanced(Node* root) {
    vector<int> vals;
    inorderExtract(root, vals);
    return buildBalanced(vals, 0, vals.size() - 1);
}
// Time: O(n)   Space: O(n)
```

**Why mid of sorted array = root?** Choosing the middle element as root guarantees that left and right subtrees have equal (or ±1) sizes → height = O(log n) → balanced.

**Why inorder gives sorted?** BST property. This is why BST-to-balanced is clean: the sorted extraction is "free" given the BST property.

**Variant — Balance any binary tree (not necessarily BST):** Same approach, but inorder won't be sorted. You'd need to sort first → O(n log n).

---

## 11. Convert BST to Greater Tree

**Problem:** Each node's value becomes the sum of all values greater than it (in the BST).

**Key insight:** Reverse inorder (right → root → left) gives values in descending order. Accumulate a running sum.

```cpp
int runningSum = 0;

Node* convertBST(Node* root) {
    if (!root) return NULL;
    convertBST(root->right);
    runningSum += root->data;
    root->data = runningSum;
    convertBST(root->left);
    return root;
}
```

**Why reverse inorder?** We process larger values first (they contribute to the running sum). When we reach a node, `runningSum` already has the sum of all values greater than it.

**From the BST property:** All values in the right subtree are greater. Process right subtree first → accumulate all larger values → then process current node.

---

## 12. Largest BST Subtree

**Problem:** Find the size of the largest subtree that is a valid BST.

**Approach:** Post-order DFS. Each node returns: (isBST, size of BST, min value in subtree, max value in subtree).

```cpp
struct Info {
    bool isBST;
    int size;
    int minVal;
    int maxVal;
};

Info largestBSTHelper(Node* root, int& maxSize) {
    if (!root) return {true, 0, INT_MAX, INT_MIN};

    Info left  = largestBSTHelper(root->left, maxSize);
    Info right = largestBSTHelper(root->right, maxSize);

    if (left.isBST && right.isBST &&
        root->data > left.maxVal && root->data < right.minVal) {
        int size = left.size + right.size + 1;
        maxSize = max(maxSize, size);
        return {true, size, min(left.minVal, root->data), max(right.maxVal, root->data)};
    }

    return {false, 0, 0, 0};  // not a BST, size doesn't matter
}

int largestBSTSubtree(Node* root) {
    int maxSize = 0;
    largestBSTHelper(root, maxSize);
    return maxSize;
}
// Time: O(n)   Space: O(h)
```

**Why track min and max?** To check the BST property at the parent level: `root->data > left.maxVal` (root is larger than everything in left subtree) and `root->data < right.minVal` (root is smaller than everything in right subtree).

**Why INT_MAX for empty node's min?** An empty subtree imposes no lower bound. Any root value is "greater than INT_MAX" would be false, but `root->data > INT_MAX` is always false... wait.

Actually: for a NULL left child, return `{true, 0, INT_MAX, INT_MIN}`. The check `root->data > left.maxVal` becomes `root->data > INT_MIN` which is always true (correct — left is empty, no constraint). The check `root->data < right.minVal` becomes `root->data < INT_MAX` which is also always true for the NULL right case. This elegantly handles leaf nodes.

---

## 13. Things Most People Forget

### 1. Validate BST — LOCAL check is WRONG

```cpp
// WRONG: only checks parent-child
if (root->left && root->left->data >= root->data) return false;

// CORRECT: pass down the valid range
bool valid(Node* r, long long lo, long long hi) {
    if (!r) return true;
    if (r->data <= lo || r->data >= hi) return false;
    return valid(r->left, lo, r->data) && valid(r->right, r->data, hi);
}
```

This is the most commonly tested BST concept. Practice explaining why the local check fails with a concrete counterexample.

### 2. Deletion — the `while(!newNode->left)` bug

In your code's `deleteInBST`, the condition should be `while(newNode->left != NULL)` (go left while left exists). `while(!newNode->left)` means "go left while left is NULL" → crashes immediately by dereferencing NULL.

### 3. Deletion must return root to update parent's pointer

```cpp
// Every recursive call updates the parent's pointer:
root->left  = deleteNodeInBST(root->left,  target);
root->right = deleteNodeInBST(root->right, target);
return root;
```

Without returning and reassigning, the deletion only affects a local copy.

### 4. Inorder predecessor vs successor in deletion

Both are valid for case 3 (two children):
- **Inorder predecessor** = max of left subtree → used in `deleteNodeInBST` in your code.
- **Inorder successor** = min of right subtree → the other common approach.

Know both. Your clean implementation (`deleteNodeInBST`) uses predecessor.

### 5. Kth largest = reverse inorder, NOT inorder

```cpp
// Kth SMALLEST → go left first (normal inorder)
// Kth LARGEST  → go right first (reverse inorder)
```

Confusing these gives kth smallest when asked for kth largest.

### 6. LCA in BST vs LCA in Binary Tree

| BST LCA | Binary Tree LCA |
|---------|----------------|
| O(h) | O(n) |
| Use BST property (compare with root) | Generic DFS (find from both subtrees) |
| No need to find nodes first | No need to know positions |

Using the O(n) general algorithm on a BST is correct but leaves performance on the table.

### 7. Use `long long` for BST validation bounds

```cpp
isValidBSTHelper(root, LLONG_MIN, LLONG_MAX);  // not INT_MIN, INT_MAX
```

If the tree contains `INT_MIN`, `lo = INT_MIN` and the comparison `r->data <= lo` becomes `INT_MIN <= INT_MIN = true` → incorrectly invalidates the node.

### 8. BST inorder is STRICTLY increasing

Two equal values → BST property violated. The predecessor check must be strict:

```cpp
if (node->data <= prev) return false;  // <= for strict, not just <
```

### 9. Sorted array to balanced BST — always take mid

```cpp
int mid = (start + end) / 2;
```

Always the middle element as root. Left half → left subtree, right half → right subtree. This gives minimum height.

### 10. Inserting sorted data into BST = O(n) tree

```
Insert: 1, 2, 3, 4, 5
Result: 1 → right → 2 → right → 3 → right → 4 → right → 5

This is a linked list, not a balanced tree.
```

Always ask: "Is the input sorted? If so, a self-balancing BST (AVL, Red-Black) should be used."

---

## 15. Final Revision Sheet

### Core Templates

```cpp
// 1. BST Insert
Node* insert(Node* root, int val) {
    if (!root) return new Node(val);
    if (val < root->data) root->left  = insert(root->left,  val);
    else                  root->right = insert(root->right, val);
    return root;
}

// 2. BST Search (iterative)
bool search(Node* root, int target) {
    while (root) {
        if (root->data == target) return true;
        root = target < root->data ? root->left : root->right;
    }
    return false;
}

// 3. BST Delete
Node* del(Node* root, int target) {
    if (!root) return NULL;
    if (root->data == target) {
        if (!root->left && !root->right) return NULL;
        if (!root->left)  return root->right;
        if (!root->right) return root->left;
        // Find max of left subtree (inorder predecessor)
        Node* pred = root->left;
        while (pred->right) pred = pred->right;
        root->data = pred->data;
        root->left = del(root->left, pred->data);
        return root;
    }
    if (target < root->data) root->left  = del(root->left,  target);
    else                     root->right = del(root->right, target);
    return root;
}

// 4. Validate BST (RANGE APPROACH)
bool valid(Node* r, long long lo, long long hi) {
    if (!r) return true;
    if (r->data <= lo || r->data >= hi) return false;
    return valid(r->left, lo, r->data) && valid(r->right, r->data, hi);
}
// Call: valid(root, LLONG_MIN, LLONG_MAX)

// 5. Kth Smallest
int count = 0, result = -1;
void kthSmall(Node* r, int k) {
    if (!r || count >= k) return;
    kthSmall(r->left, k);
    if (++count == k) { result = r->data; return; }
    kthSmall(r->right, k);
}

// 6. LCA in BST (iterative, O(1) space)
Node* lca(Node* root, int p, int q) {
    while (root) {
        if (p < root->data && q < root->data) root = root->left;
        else if (p > root->data && q > root->data) root = root->right;
        else return root;
    }
    return NULL;
}

// 7. BST to Balanced BST
// Step 1: extract inorder
// Step 2: buildBalanced(vals, 0, n-1)
Node* buildBalanced(vector<int>& v, int l, int r) {
    if (l > r) return NULL;
    int m = (l+r)/2;
    Node* node = new Node(v[m]);
    node->left  = buildBalanced(v, l, m-1);
    node->right = buildBalanced(v, m+1, r);
    return node;
}

// 8. Greater Tree (reverse inorder)
int runSum = 0;
void greater(Node* r) {
    if (!r) return;
    greater(r->right);
    runSum += r->data; r->data = runSum;
    greater(r->left);
}
```

### Complexity Table

| Operation | Average (balanced) | Worst (skewed) |
|-----------|-------------------|----------------|
| Insert | O(log n) | O(n) |
| Delete | O(log n) | O(n) |
| Search | O(log n) | O(n) |
| Min/Max | O(log n) | O(n) |
| Validate BST | O(n) | O(n) |
| Kth smallest | O(k + log n) | O(n) |
| LCA (BST) | O(log n) | O(n) |
| LCA (general) | O(n) | O(n) |
| BST to balanced | O(n) | O(n) |

### The Three Deletion Cases at a Glance

```
Case 1: Leaf               → return NULL
Case 2: One child          → return the existing child
Case 3: Two children       → find max(left) or min(right)
                             replace value
                             delete that node from its original position
```

### BST vs Binary Tree — What BST Gives You

| Operation | Binary Tree | BST |
|-----------|-------------|-----|
| Search | O(n) | O(h) |
| Insert | O(n) | O(h) |
| Delete | O(n) | O(h) |
| Min/Max | O(n) | O(h) |
| LCA | O(n) | O(h) |
| Sorted order | N/A | Inorder traversal O(n) |

### Interview Checklist

- [ ] Can I write the RANGE-based BST validation without looking it up?
- [ ] Can I give a counterexample for the WRONG (local) validation approach?
- [ ] Can I write BST deletion for all 3 cases cleanly?
- [ ] Do I know why `while(!newNode->left)` is a bug (should be `while(newNode->left != NULL)`)?
- [ ] Can I implement kth smallest AND kth largest (reverse inorder) in BST?
- [ ] Can I write iterative LCA in BST in O(1) space?
- [ ] Do I use `LLONG_MIN`/`LLONG_MAX` as bounds (not INT_MIN/INT_MAX) in validate?
- [ ] Can I convert a BST to a balanced BST in O(n)?
- [ ] Can I explain the "Info struct" approach for largest BST subtree?
- [ ] Can I explain why sorted input creates a skewed BST?

### Most Important Observations

1. **Inorder of BST = sorted sequence.** This single fact enables kth smallest, validate, successor/predecessor, and BST-to-balanced.
2. **Validate BST requires range [lo, hi] passed down to each node.** Local parent-child comparison is WRONG.
3. **Deletion case 3 (two children):** replace with inorder predecessor (max of left) OR successor (min of right), then delete that node from its subtree.
4. **LCA in BST is O(h) using BST property.** General LCA is O(n). Use the BST version when you have a BST.
5. **Kth smallest = inorder with counter. Kth largest = reverse inorder with counter.** Only one line changes between them.
6. **BST-to-balanced = inorder extract (sorted array) + build from mid.** O(n) total.
7. **Sorted input → O(n) height BST.** Always ask about input distribution when BST performance is discussed.
8. **`long long` bounds for validation.** `INT_MIN` and `INT_MAX` as sentinel values cause subtle bugs when the tree contains those values.

---

*Chapter 14 — Binary Search Trees | Part of DSA Interview Prep series*  
*Based on Striver's A2Z Sheet + Love Babbar lecture series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] Search in a Binary Search Tree — https://leetcode.com/problems/search-in-a-binary-search-tree/
- [ ] Find Min/Max in BST — https://www.geeksforgeeks.org/problems/minimum-element-in-bst/1
- [ ] Floor and Ceil in a BST — https://www.geeksforgeeks.org/problems/floor-in-bst/1
- [ ] Insert a given node in BST — https://leetcode.com/problems/insert-into-a-binary-search-tree/
- [ ] Delete a node in BST — https://leetcode.com/problems/delete-node-in-a-bst/
- [ ] Kth Smallest and Largest element in BST — https://leetcode.com/problems/kth-smallest-element-in-a-bst/
- [ ] Check if a tree is a BST or not — https://leetcode.com/problems/validate-binary-search-tree/
- [ ] LCA in BST — https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/
- [ ] Construct a BST from a preorder traversal — https://leetcode.com/problems/construct-binary-search-tree-from-preorder-traversal/
- [ ] Inorder Successor/Predecessor in BST — https://leetcode.com/problems/inorder-successor-in-bst/
- [ ] Merge 2 BSTs — https://www.geeksforgeeks.org/problems/merge-two-bst-s/1
- [ ] Two Sum In BST — https://leetcode.com/problems/two-sum-iv-input-is-a-bst/
- [ ] Correct BST with two nodes swapped — https://leetcode.com/problems/recover-binary-search-tree/
- [ ] Largest BST in Binary Tree — https://leetcode.com/problems/maximum-sum-bst-in-binary-tree/
- [ ] Normal BST to Balanced BST — https://www.geeksforgeeks.org/problems/normal-bst-to-balanced-bst/1
- [ ] Flatten BST to Sorted LL — https://www.geeksforgeeks.org/problems/flatten-bst-to-sorted-list/1

