# Chapter 13 — Binary Trees

> **Revision target:** 1 day  
> **Goal:** After reading this file, you need nothing else for this topic — no code files, no YouTube, no tutorials.

---

## Table of Contents

1. [Tree Fundamentals](#1-tree-fundamentals)
2. [Building a Tree — Your Code](#2-building-a-tree--your-code)
3. [Recursive Traversals — Inorder, Preorder, Postorder](#3-recursive-traversals--inorder-preorder-postorder)
4. [Iterative Traversals — The Tricky Ones](#4-iterative-traversals--the-tricky-ones)
5. [Level Order Traversal (BFS)](#5-level-order-traversal-bfs)
6. [Height, Diameter, and Balance Check](#6-height-diameter-and-balance-check)
7. [Advanced Traversals — Zigzag, Boundary, Vertical, Top View](#7-advanced-traversals--zigzag-boundary-vertical-top-view)
8. [Lowest Common Ancestor (LCA)](#8-lowest-common-ancestor-lca)
9. [Binary Lifting (K-th Ancestor)](#9-binary-lifting-k-th-ancestor)
10. [Morris Traversal — O(1) Space Inorder](#10-morris-traversal--o1-space-inorder)
11. [Serialize and Deserialize](#11-serialize-and-deserialize)
12. [Build Tree from Traversals](#12-build-tree-from-traversals)
13. [Flatten Binary Tree to Linked List](#13-flatten-binary-tree-to-linked-list)
14. [Tree DP (Max Path Sum, Rob Houses on Tree)](#14-tree-dp-max-path-sum-rob-houses-on-tree)
15. [Things Most People Forget](#15-things-most-people-forget)
16. [Practice Problems](#16-practice-problems)
17. [Final Revision Sheet](#17-final-revision-sheet)

---

## 1. Tree Fundamentals

### Key Definitions

```
Root     — top node, no parent
Leaf     — node with no children
Height   — longest path from node to any leaf (leaf height = 0, or 1 depending on definition)
Depth    — distance from root to node (root depth = 0)
Level    — depth + 1 (root = level 1) — some books vary
Diameter — longest path between any two nodes (may not pass through root)
Ancestors — all nodes on path from root to a given node
```

**Height conventions — know which one the problem uses:**
```
Definition A: height = edges on longest root-to-leaf path. Leaf = 0, empty = -1.
Definition B: height = nodes on longest root-to-leaf path. Leaf = 1, empty = 0.
```

LeetCode typically uses Definition B (number of nodes).

### Node Structure

```cpp
class Node {
public:
    int data;
    Node* left;
    Node* right;

    Node(int d) {
        this->data = d;
        this->left = NULL;
        this->right = NULL;
    }
};
```

**From your code (binaryTree.cpp):** The constructor sets both children to NULL. Always initialize — forgetting to initialize left/right causes dangling pointers that crash on traversal.

### Tree properties

```
Complete binary tree: all levels full except last, last filled left-to-right
Full binary tree: every node has 0 or 2 children
Perfect binary tree: all leaves at same level, all internal nodes have 2 children
Balanced binary tree: height difference of left and right subtrees ≤ 1 for every node
```

---

## 2. Building a Tree — Your Code

### Method 1: Recursive Input (Pre-order style)

```cpp
// From binaryTree.cpp
Node* buildTree(Node* root) {
    int data;
    cin >> data;
    root = new Node(data);

    if (data == -1) return NULL;  // -1 signals NULL node

    cout << "Enter data for left of " << data << endl;
    root->left = buildTree(root->left);
    cout << "Enter data for right of " << data << endl;
    root->right = buildTree(root->right);
    return root;
}
// Input: "1 3 7 -1 -1 11 -1 -1 5 17 -1 -1 -1"
// This builds: 1 → left=3, right=5; 3 → left=7, right=11; 5 → left=17
```

**How it works:** This is pre-order construction. You give the root value, then recursively give left subtree, then right subtree. `-1` means "no node here".

### Method 2: Build from Level Order (BFS style)

```cpp
// From binaryTree.cpp
void buildFromLevelOrder(Node* &root) {
    queue<Node*> q;
    int data;
    cin >> data;
    root = new Node(data);
    q.push(root);

    while (!q.empty()) {
        Node* temp = q.front(); q.pop();

        int leftData; cin >> leftData;
        if (leftData != -1) {
            temp->left = new Node(leftData);
            q.push(temp->left);
        }

        int rightData; cin >> rightData;
        if (rightData != -1) {
            temp->right = new Node(rightData);
            q.push(temp->right);
        }
    }
}
// Input: "1 3 5 7 11 17 -1 -1 -1 -1 -1 -1 -1"
```

**How it works:** Level-by-level. For each dequeued node, read its left and right children. Push non-null children. The `-1` for children don't get pushed (no further children to assign).

---

## 3. Recursive Traversals — Inorder, Preorder, Postorder

The three fundamental traversals. Know these cold.

```
Inorder   (L → Node → R): gives sorted order for BST
Preorder  (Node → L → R): root first; used to create copy of tree, serialize
Postorder (L → R → Node): children processed before parent; used to delete tree
```

```cpp
void inorder(Node* root) {
    if (root == NULL) return;
    inorder(root->left);
    cout << root->data << " ";
    inorder(root->right);
}

void preorder(Node* root) {
    if (root == NULL) return;
    cout << root->data << " ";
    preorder(root->left);
    preorder(root->right);
}

void postorder(Node* root) {
    if (root == NULL) return;
    postorder(root->left);
    postorder(root->right);
    cout << root->data << " ";
}
```

**From your code (binaryTree.cpp + Inorder_PreOrder_and_Postorder_Traversals.cpp):** All three follow the same pattern: base case (NULL returns), then the three calls in different orders. The only thing that changes is WHERE `cout << root->data` sits.

**Mental model:**
```
       1
      / \
     2   3
    / \
   4   5

Inorder:   4 2 5 1 3   (Left subtree done, then root, then right)
Preorder:  1 2 4 5 3   (Root printed first, then recurse)
Postorder: 4 5 2 3 1   (Both subtrees fully done before root)
```

**Complexity:** All traversals: **O(n) time, O(h) space** for recursion stack (h = height; O(log n) for balanced, O(n) for skewed).

---

## 4. Iterative Traversals — The Tricky Ones

These are what interviewers ask when they want to see real understanding. Know all three.

### Iterative Inorder — The Classic

```cpp
// From Iteratveways.cpp
void iterativeInorder(Node* root) {
    stack<Node*> st;
    Node* curr = root;

    while (!st.empty() || curr != NULL) {
        // Go as far left as possible
        while (curr != NULL) {
            st.push(curr);
            curr = curr->left;
        }
        // curr is now NULL; backtrack
        curr = st.top(); st.pop();
        cout << curr->data << " ";  // process node
        curr = curr->right;          // go right
    }
}
```

**How to think about it:** The stack simulates the recursion call stack. We push nodes as we go left (like "calling left subtree"). When we can't go left, we pop (like "returning from left subtree"), process the node, then go right (like "calling right subtree").

**The crucial condition: `!st.empty() || curr != NULL`**

Both conditions must be checked:
- `curr != NULL` → there's a node we haven't explored yet
- `!st.empty()` → there are nodes we've been to but haven't processed yet (their left subtree was explored, now we backtrack)

If you write only `!st.empty()`, you'll miss processing the root's initial descent.

### Iterative Preorder

```cpp
// From Iteratveways.cpp
void iterativePreorder(Node* root) {
    stack<Node*> st;
    Node* curr = root;

    while (!st.empty() || curr != NULL) {
        while (curr != NULL) {
            cout << curr->data << " ";  // process BEFORE going left
            st.push(curr);
            curr = curr->left;
        }
        curr = st.top(); st.pop();
        curr = curr->right;
    }
}
```

**Difference from inorder:** Just move the `cout` before pushing. In preorder, we process the node immediately upon visiting, then go left.

**Alternative preorder using explicit stack (more common in interviews):**

```cpp
void iterativePreorderAlt(Node* root) {
    if (!root) return;
    stack<Node*> st;
    st.push(root);

    while (!st.empty()) {
        Node* node = st.top(); st.pop();
        cout << node->data << " ";
        if (node->right) st.push(node->right);  // push right FIRST
        if (node->left)  st.push(node->left);   // push left SECOND (popped first)
    }
}
```

**Why push right before left?** Stack is LIFO. We want left processed first (preorder = root, left, right). So push right first so left is on top and gets processed next.

### Iterative Postorder — The Hard One

**Method 1: Two Stacks (easier to understand)**

```cpp
// From Iteratveways.cpp
void iterativePostorder2Stacks(Node* root) {
    stack<Node*> s1, s2;
    s1.push(root);

    while (!s1.empty()) {
        Node* curr = s1.top(); s1.pop();
        if (curr->left)  s1.push(curr->left);
        if (curr->right) s1.push(curr->right);
        s2.push(curr);  // defer processing to s2
    }

    while (!s2.empty()) {
        cout << s2.top()->data << " ";
        s2.pop();
    }
}
```

**Why this works:** s1 processes in "root, right, left" order (push left before right, so right is processed first from stack). s2 reverses this to get "left, right, root" = postorder.

**Method 2: One Stack (the tricky interview version)**

```cpp
// From Iteratveways.cpp — cleaned up version
void iterativePostorder1Stack(Node* root) {
    stack<Node*> st;
    Node* curr = root;

    while (!st.empty() || curr != NULL) {
        if (curr) {
            st.push(curr);
            curr = curr->left;
        } else {
            Node* temp = st.top()->right;
            if (temp) {
                curr = temp;  // right child exists, explore it
            } else {
                // No right child — process nodes going up
                temp = st.top(); st.pop();
                cout << temp->data << " ";
                // Keep popping while current is the right child of stack top
                while (!st.empty() && st.top()->right == temp) {
                    temp = st.top(); st.pop();
                    cout << temp->data << " ";
                }
            }
        }
    }
}
```

**How the one-stack version thinks:**
- Go left as far as possible (push everything).
- When stuck (curr == NULL), peek at stack top's right child.
  - If right child exists: go right (it hasn't been processed yet).
  - If right child doesn't exist: process the top node. Then keep processing ancestors that are "done" (i.e., we just finished their right subtree — identified by `st.top()->right == temp`).

**Why the `st.top()->right == temp` check?** When we process a node and pop it as `temp`, the node below it on the stack is its parent. The parent can be processed only if `temp` was its RIGHT child (both subtrees done). If `temp` was its left child, we still need to go to parent's right subtree.

**Interview advice:** Two-stack method is much easier to explain and remember. Unless specifically asked for O(1) space, use two stacks.

---

## 5. Level Order Traversal (BFS)

### Standard Level Order

```cpp
// From binaryTree.cpp — the NULL sentinel technique
void levelOrderTraversal(Node* root) {
    queue<Node*> q;
    q.push(root);
    q.push(NULL);  // NULL marks end of a level

    while (!q.empty()) {
        Node* temp = q.front(); q.pop();

        if (temp == NULL) {
            cout << endl;                          // level done → newline
            if (!q.empty()) q.push(NULL);          // mark next level's end
        } else {
            cout << temp->data << " ";
            if (temp->left)  q.push(temp->left);
            if (temp->right) q.push(temp->right);
        }
    }
}
```

**The NULL sentinel trick:** Push NULL after each level's nodes. When you pop NULL, all current level nodes' children are already in the queue (representing the next level) → push another NULL to mark the next level's end. Guard with `!q.empty()` to avoid infinite NULL loop.

**Alternative — size-based approach (often cleaner for LeetCode):**

```cpp
vector<vector<int>> levelOrder(Node* root) {
    vector<vector<int>> result;
    if (!root) return result;
    queue<Node*> q;
    q.push(root);

    while (!q.empty()) {
        int size = q.size();  // number of nodes at current level
        vector<int> level;

        for (int i = 0; i < size; i++) {
            Node* node = q.front(); q.pop();
            level.push_back(node->data);
            if (node->left)  q.push(node->left);
            if (node->right) q.push(node->right);
        }
        result.push_back(level);
    }
    return result;
}
```

**Complexity:** O(n) time, O(n) space (at most n/2 nodes at a level in a perfect tree).

---

## 6. Height, Diameter, and Balance Check

### Height

```cpp
int height(Node* root) {
    if (root == NULL) return 0;
    return 1 + max(height(root->left), height(root->right));
}
// Time: O(n)   Space: O(h)
```

### Diameter

**Diameter = longest path between any two nodes.** It may or may not pass through the root.

**Naive approach — O(n²):** For each node, diameter = height(left) + height(right). Compute height separately. But height itself is O(n) per node → O(n²) total.

**Optimized — O(n):** Compute height and diameter together in one DFS.

```cpp
int diameterHelper(Node* root, int& diameter) {
    if (root == NULL) return 0;

    int leftHeight  = diameterHelper(root->left,  diameter);
    int rightHeight = diameterHelper(root->right, diameter);

    // Update diameter: longest path through this node
    diameter = max(diameter, leftHeight + rightHeight);

    return 1 + max(leftHeight, rightHeight);  // return height
}

int diameter(Node* root) {
    int diameter = 0;
    diameterHelper(root, diameter);
    return diameter;
}
```

**Why O(n)?** Each node is visited exactly once. We compute height bottom-up and update the diameter at each node simultaneously.

**The key insight:** The diameter at any node = height(left subtree) + height(right subtree). We track the global maximum across all nodes.

### Balance Check

A tree is balanced if for every node: `|height(left) - height(right)| <= 1`.

**Naive — O(n²):** Call height for each node separately.

**Optimized — O(n):** Return -1 from height if subtree is unbalanced (early termination).

```cpp
int checkBalanced(Node* root) {
    if (root == NULL) return 0;

    int leftH  = checkBalanced(root->left);
    int rightH = checkBalanced(root->right);

    if (leftH == -1 || rightH == -1) return -1;  // already unbalanced below
    if (abs(leftH - rightH) > 1)    return -1;   // unbalanced at this node

    return 1 + max(leftH, rightH);
}

bool isBalanced(Node* root) {
    return checkBalanced(root) != -1;
}
```

**The -1 sentinel:** Using -1 as "unbalanced" lets us short-circuit. As soon as any subtree is unbalanced, we propagate -1 up without doing further work.

---

## 7. Advanced Traversals — Zigzag, Boundary, Vertical, Top View

### Zigzag (Spiral) Traversal

Level order but alternating left-to-right and right-to-left.

```cpp
vector<vector<int>> zigzagLevelOrder(Node* root) {
    vector<vector<int>> result;
    if (!root) return result;
    queue<Node*> q;
    q.push(root);
    bool leftToRight = true;

    while (!q.empty()) {
        int size = q.size();
        vector<int> level(size);

        for (int i = 0; i < size; i++) {
            Node* node = q.front(); q.pop();
            int idx = leftToRight ? i : (size - 1 - i);
            level[idx] = node->data;
            if (node->left)  q.push(node->left);
            if (node->right) q.push(node->right);
        }
        result.push_back(level);
        leftToRight = !leftToRight;
    }
    return result;
}
```

**Key trick:** Allocate the level vector with `size` slots. Use index `i` or `size-1-i` depending on direction. This avoids reversing.

### Boundary Traversal

Boundary = left boundary + all leaves (left-to-right) + right boundary (bottom-to-top, excluding root).

```cpp
void leftBoundary(Node* root, vector<int>& res) {
    if (!root || (!root->left && !root->right)) return;  // skip leaves
    res.push_back(root->data);
    if (root->left) leftBoundary(root->left, res);
    else            leftBoundary(root->right, res);
}

void leaves(Node* root, vector<int>& res) {
    if (!root) return;
    if (!root->left && !root->right) { res.push_back(root->data); return; }
    leaves(root->left, res);
    leaves(root->right, res);
}

void rightBoundary(Node* root, vector<int>& res) {
    if (!root || (!root->left && !root->right)) return;  // skip leaves
    if (root->right) rightBoundary(root->right, res);
    else             rightBoundary(root->left, res);
    res.push_back(root->data);  // add AFTER recursion = bottom-to-top
}

vector<int> boundaryTraversal(Node* root) {
    vector<int> res;
    if (!root) return res;
    res.push_back(root->data);
    leftBoundary(root->left, res);
    leaves(root->left, res);   // leaves of left subtree
    leaves(root->right, res);  // leaves of right subtree
    rightBoundary(root->right, res);
    return res;
}
```

**Traps:**
- Left boundary: if left child doesn't exist, go right (following the leftmost path).
- Right boundary: add AFTER recursion (anti-clockwise direction = bottom-to-top).
- Don't double-count the root or leaves in boundary.

### Vertical Order Traversal

Group nodes by horizontal distance from root (root = distance 0, left child = -1, right child = +1).

```cpp
map<int, map<int, multiset<int>>> nodes;  // hd -> level -> {values}

void dfs(Node* root, int hd, int level, map<int,map<int,multiset<int>>>& nodes) {
    if (!root) return;
    nodes[hd][level].insert(root->data);
    dfs(root->left,  hd-1, level+1, nodes);
    dfs(root->right, hd+1, level+1, nodes);
}

vector<vector<int>> verticalOrder(Node* root) {
    map<int, map<int, multiset<int>>> nodes;
    dfs(root, 0, 0, nodes);
    vector<vector<int>> result;
    for (auto& [hd, levels] : nodes) {
        vector<int> col;
        for (auto& [level, vals] : levels)
            for (int v : vals) col.push_back(v);
        result.push_back(col);
    }
    return result;
}
```

**Why `map<int, map<int, multiset<int>>>`?**
- Outer map: sorted by horizontal distance (column).
- Inner map: sorted by level (row) within same column.
- multiset: handles multiple nodes at same (column, row) with sorted values.

### Top View

For each horizontal distance, only the first node encountered (topmost) is in the top view.

```cpp
map<int, int> topView(Node* root) {
    map<int, int> result;
    queue<pair<Node*, int>> q;  // (node, horizontal_distance)
    q.push({root, 0});

    while (!q.empty()) {
        auto [node, hd] = q.front(); q.pop();
        if (result.find(hd) == result.end())
            result[hd] = node->data;  // first = topmost at this hd
        if (node->left)  q.push({node->left,  hd-1});
        if (node->right) q.push({node->right, hd+1});
    }
    return result;
}
```

**Why BFS for top view?** BFS visits nodes level by level. The first node at each horizontal distance is the topmost one. DFS would not guarantee this.

**Bottom view:** Same as top view but keep overwriting (last node at each hd = bottommost).

---

## 8. Lowest Common Ancestor (LCA)

### LCA — Brute Force

Find path from root to p and root to q. Find the last common node.

```cpp
bool findPath(Node* root, int target, vector<Node*>& path) {
    if (!root) return false;
    path.push_back(root);
    if (root->data == target) return true;
    if (findPath(root->left, target, path) || findPath(root->right, target, path))
        return true;
    path.pop_back();
    return false;
}

Node* lcaBrute(Node* root, int p, int q) {
    vector<Node*> pathP, pathQ;
    findPath(root, p, pathP);
    findPath(root, q, pathQ);
    Node* lca = root;
    for (int i = 0; i < min(pathP.size(), pathQ.size()); i++) {
        if (pathP[i] == pathQ[i]) lca = pathP[i];
        else break;
    }
    return lca;
}
// Time: O(n)   Space: O(n) for paths
```

### LCA — Optimized O(n)

The elegant single-DFS approach. The key observation:

> If a node is the LCA of p and q, then p appears in one subtree and q appears in the other (or one of them IS the node).

```cpp
Node* lca(Node* root, int p, int q) {
    if (root == NULL) return NULL;
    if (root->data == p || root->data == q) return root;

    Node* leftLCA  = lca(root->left,  p, q);
    Node* rightLCA = lca(root->right, p, q);

    if (leftLCA  && rightLCA)  return root;       // p in left, q in right → root is LCA
    if (leftLCA)               return leftLCA;    // both in left subtree
    return rightLCA;                              // both in right subtree (or NULL)
}
// Time: O(n)   Space: O(h)
```

**Why this works — the core insight:**
- If we find p in the left subtree and q in the right subtree, the current node is the LCA.
- If both are in one subtree, propagate that subtree's result upward.
- The first node where we see "returns from both sides" is the LCA.

**Edge case:** If one of p/q is an ancestor of the other, the ancestor is returned early (line 2) and propagated up. The other subtree returns NULL. The non-NULL result is the LCA. This is correct because the ancestor IS the LCA in this case.

---

## 9. Binary Lifting (K-th Ancestor)

Binary lifting preprocesses a table `up[node][i]` = 2^i-th ancestor of `node`. Then any k-th ancestor query is answered in O(log n) by decomposing k in binary.

**From your code (binarylifting.cpp):** This is competitive-programming level but asked in top-tier interviews for tree problems with ancestor queries.

### Preprocessing

```cpp
const int N = 200001, LOG = 20;
int up[N][LOG];

void dfs(int node, int par, unordered_map<int,vector<int>>& adj) {
    up[node][0] = par;  // direct parent
    for (int i = 1; i < LOG; i++) {
        if (up[node][i-1] == -1)
            up[node][i] = -1;  // ancestor doesn't exist
        else
            up[node][i] = up[up[node][i-1]][i-1];  // 2^i = two jumps of 2^(i-1)
    }
    for (int child : adj[node])
        if (child != par)
            dfs(child, node, adj);
}
// Call: dfs(root, -1, adj)
// Time: O(n log n) preprocessing
```

**The recurrence: `up[node][i] = up[up[node][i-1]][i-1]`**

To jump 2^i steps: first jump 2^(i-1) steps to an intermediate ancestor, then jump another 2^(i-1) steps from there. Total = 2^i steps.

### Answering k-th Ancestor Queries

```cpp
int kthAncestor(int node, int k) {
    for (int i = LOG-1; i >= 0; i--) {
        if (node == -1 || k == 0) break;
        if ((k & (1 << i)) != 0) {
            node = up[node][i];
            k = k & (~(1 << i));  // clear bit i from k
        }
    }
    return node;  // -1 if doesn't exist
}
// Time: O(log n) per query
```

**How it works:** Decompose k in binary. For each set bit i, jump 2^i levels. Process from high bits to low bits.

**Example:** k=5 = binary 101. Jump 2^2=4 levels, then 2^0=1 level. Total = 5 levels.

**From your code (binarylifting.cpp):** The condition `k=k&(~(1<<i))` clears bit i after using it. The loop goes from `i=19` down to 0 (high bits first). The `-1` check handles the case where the ancestor doesn't exist (went above root).

### LCA using Binary Lifting

1. Find the deeper node. Bring it up to the same depth as the shallower node (using kthAncestor).
2. If they're the same → done (one was ancestor of other).
3. Otherwise, binary lift both simultaneously until their ancestors diverge. Stop when `up[u][i] == up[v][i]`.
4. The parent of the stopped position is the LCA.

---

## 10. Morris Traversal — O(1) Space Inorder

This is the most intellectually complex tree traversal. Interviewers ask it specifically. The key: **no stack, no recursion**, O(1) extra space.

**Core idea:** Use the right pointers of leaf nodes (which are NULL) as temporary "thread" pointers back to inorder successors. After using a thread, restore the original NULL.

```cpp
void morrisInorder(Node* root) {
    Node* curr = root;

    while (curr != NULL) {
        if (curr->left == NULL) {
            // No left child — process current node and go right
            cout << curr->data << " ";
            curr = curr->right;
        } else {
            // Find inorder predecessor (rightmost node in left subtree)
            Node* pred = curr->left;
            while (pred->right != NULL && pred->right != curr) {
                pred = pred->right;
            }

            if (pred->right == NULL) {
                // First visit: create thread, go left
                pred->right = curr;   // thread: predecessor → curr
                curr = curr->left;
            } else {
                // Second visit: thread already exists → remove it, process curr
                pred->right = NULL;   // restore original NULL
                cout << curr->data << " ";
                curr = curr->right;
            }
        }
    }
}
// Time: O(n)   Space: O(1)
```

**Step-by-step logic:**

1. Start at root (curr = root).
2. If curr has no left child: print curr, move right.
3. If curr has a left child:
   - Find the **inorder predecessor** (rightmost node of left subtree).
   - **If predecessor's right is NULL:** This is first visit. Create thread (`pred->right = curr`). Go left.
   - **If predecessor's right is curr:** This is second visit (we came back via the thread). Remove thread. Print curr. Go right.

**Why O(n) despite the inner loop?** Each thread is created and destroyed exactly once. The inner `while` traverses each edge at most twice — total O(n).

**The "thread" insight:** Normally we'd need a stack to remember where to return after traversing the left subtree. Morris Traversal stores this "return address" in the tree itself using otherwise-unused `right` pointers of predecessor nodes.

**Trace with tree `[1 → left=2, right=3; 2 → left=4, right=5]`:**

```
curr=1: has left. pred of 1 = 5 (rightmost of {2,4,5}). pred->right = NULL → set thread 5→1, go to 2.
curr=2: has left. pred of 2 = 4 (rightmost of {4}). pred->right = NULL → set thread 4→2, go to 4.
curr=4: no left. print 4. go right → curr = 2 (via thread!).
curr=2: has left. pred of 2 = 4. pred->right = 2 (thread found) → remove thread, print 2, go right → curr=5.
curr=5: no left. print 5. go right → curr = 1 (via thread!).
curr=1: has left. pred of 1 = 5. pred->right = 1 (thread found) → remove thread, print 1, go right → curr=3.
curr=3: no left. print 3. go right → curr=NULL. Done.
Output: 4 2 5 1 3  ✓
```

---

## 11. Serialize and Deserialize

**Problem:** Convert a binary tree to a string and back. The reconstructed tree must be identical.

### Serialize — Preorder with NULL markers

```cpp
string serialize(Node* root) {
    if (!root) return "N,";
    return to_string(root->data) + "," + serialize(root->left) + serialize(root->right);
}
```

### Deserialize — Rebuild from serialized string

```cpp
Node* deserializeHelper(queue<string>& tokens) {
    string token = tokens.front(); tokens.pop();
    if (token == "N") return NULL;
    Node* node = new Node(stoi(token));
    node->left  = deserializeHelper(tokens);
    node->right = deserializeHelper(tokens);
    return node;
}

Node* deserialize(string data) {
    queue<string> tokens;
    stringstream ss(data);
    string token;
    while (getline(ss, token, ',')) tokens.push(token);
    return deserializeHelper(tokens);
}
```

**Why preorder for serialization?** Preorder encodes the root first. During deserialization, we reconstruct in the same preorder — root first, then left subtree, then right subtree. The NULL markers tell us when subtrees end.

**Why postorder or inorder alone doesn't work for reconstruction?** Without markers, inorder alone is ambiguous (many trees can have same inorder). Preorder + NULL markers is unambiguous.

---

## 12. Build Tree from Traversals

**Problem:** Given inorder + preorder (or inorder + postorder), build the unique binary tree.

### From Inorder + Preorder

```cpp
Node* build(vector<int>& pre, vector<int>& in, int preStart, int preEnd,
            int inStart, int inEnd, map<int,int>& inPos) {
    if (preStart > preEnd || inStart > inEnd) return NULL;

    int rootVal = pre[preStart];        // first element of preorder = root
    int rootIdx = inPos[rootVal];       // find root in inorder
    int leftSize = rootIdx - inStart;   // size of left subtree

    Node* root = new Node(rootVal);
    root->left  = build(pre, in, preStart+1,         preStart+leftSize,
                                 inStart,             rootIdx-1, inPos);
    root->right = build(pre, in, preStart+leftSize+1, preEnd,
                                 rootIdx+1,           inEnd, inPos);
    return root;
}

Node* buildTree(vector<int>& preorder, vector<int>& inorder) {
    map<int,int> inPos;
    for (int i = 0; i < inorder.size(); i++) inPos[inorder[i]] = i;
    return build(preorder, inorder, 0, preorder.size()-1, 0, inorder.size()-1, inPos);
}
// Time: O(n) with map   Space: O(n)
```

**The key reasoning:**
1. First element of preorder = root.
2. Find root in inorder → splits into left and right subtrees.
3. Left subtree has `rootIdx - inStart` elements. Same count in preorder.
4. Recursively build both subtrees.

**From inorder + postorder:** Last element of postorder = root. Mirror the same logic.

**Things that fade:** The index arithmetic — `preStart+1` to `preStart+leftSize` for the left subtree in preorder. Derive it, don't memorize: leftSize nodes → they occupy positions `preStart+1` through `preStart+leftSize` in preorder.

---

## 13. Flatten Binary Tree to Linked List

**Problem:** Flatten binary tree into a right-skewed linked list in preorder.

### Approach: Reverse Postorder (right → left → root)

```cpp
void flatten(Node* root) {
    if (!root) return;
    Node* prev = NULL;  // global or captured by reference

    function<void(Node*)> dfs = [&](Node* node) {
        if (!node) return;
        dfs(node->right);
        dfs(node->left);
        node->right = prev;
        node->left  = NULL;
        prev = node;
    };
    dfs(root);
}
// Time: O(n)   Space: O(h)
```

**Why reverse postorder (right, left, root)?** We build the list from back to front. The last node in preorder has no right child → we set it up first (prev = NULL). Moving backwards, each node's right points to the next node in preorder.

### Alternative: Morris-based (O(1) space)

```cpp
void flattenMorris(Node* root) {
    Node* curr = root;
    while (curr) {
        if (curr->left) {
            Node* pred = curr->left;
            while (pred->right) pred = pred->right;  // rightmost of left subtree
            pred->right = curr->right;   // attach current right subtree
            curr->right = curr->left;    // make left subtree the right
            curr->left = NULL;
        }
        curr = curr->right;
    }
}
```

---

## 14. Tree DP (Max Path Sum, Rob Houses on Tree)

Tree DP = recursion where each node returns information to its parent, and the answer can appear at any node.

### Maximum Path Sum

**Problem:** Find maximum sum path between any two nodes. Path can go up-down through any node.

```cpp
int maxPathSum(Node* root) {
    int maxSum = INT_MIN;

    function<int(Node*)> dfs = [&](Node* node) -> int {
        if (!node) return 0;

        int leftGain  = max(0, dfs(node->left));   // take 0 if subtree is negative
        int rightGain = max(0, dfs(node->right));

        maxSum = max(maxSum, node->data + leftGain + rightGain);  // path through this node

        return node->data + max(leftGain, rightGain);  // return best single path upward
    };

    dfs(root);
    return maxSum;
}
// Time: O(n)   Space: O(h)
```

**Two things happening per node:**
1. **Update global answer:** path through this node = node + leftGain + rightGain.
2. **Return to parent:** only ONE direction (left OR right) can be chosen — return `node + max(leftGain, rightGain)`.

**Why `max(0, ...)` for gains?** If a subtree path is negative, it's better to not include it (contribute 0). This handles trees with all negative values correctly.

### House Robber on Tree

**Problem:** Cannot rob two adjacent nodes. Maximize sum of robbed nodes.

```cpp
pair<int,int> robHelper(Node* node) {
    // returns {rob this node, don't rob this node}
    if (!node) return {0, 0};

    auto [leftRob,   leftSkip]  = robHelper(node->left);
    auto [rightRob,  rightSkip] = robHelper(node->right);

    int rob  = node->data + leftSkip + rightSkip;   // rob this → skip children
    int skip = max(leftRob, leftSkip) + max(rightRob, rightSkip);  // skip this → children choose

    return {rob, skip};
}

int rob(Node* root) {
    auto [r, s] = robHelper(root);
    return max(r, s);
}
```

---

## 15. Things Most People Forget

### 1. Iterative postorder — the 1-stack logic

The condition for processing nodes going upward: `st.top()->right == temp` means "the node we just processed is the right child of the stack top" → stack top is now done with both subtrees → process it.

### 2. Morris traversal — the thread check

First visit to a node: `pred->right == NULL` → create thread.  
Second visit: `pred->right == curr` → remove thread, process node.

Forgetting to check `pred->right != curr` in the predecessor-finding while loop causes infinite cycles.

```cpp
// CRITICAL inner condition
while (pred->right != NULL && pred->right != curr) {
    pred = pred->right;
}
// Both conditions needed. Missing second → infinite loop.
```

### 3. LCA — the two-subtree case

If both `leftLCA` and `rightLCA` are non-NULL, the current node is the LCA. This is the case where p is in one subtree and q is in the other.

```cpp
if (leftLCA && rightLCA) return root;  // DON'T forget this case
```

### 4. Build tree from preorder+inorder — leftSize index math

```cpp
int leftSize = rootIdx - inStart;
// Left subtree in preorder: [preStart+1, preStart+leftSize]
// Right subtree in preorder: [preStart+leftSize+1, preEnd]
```

Getting these ranges wrong produces incorrect trees that pass small tests.

### 5. Diameter — update global max, return height

```cpp
// WRONG — updating diameter with absolute height values
diameter = max(diameter, height(root->left) + height(root->right));

// RIGHT — pass diameter by reference, update inside DFS
diameter = max(diameter, leftH + rightH);
return 1 + max(leftH, rightH);  // return height, not diameter
```

### 6. Balance check — return -1 early

Forgetting to propagate -1 upward means you check the whole tree even after finding imbalance → O(n²) instead of O(n).

### 7. Zigzag — use index, not reverse

Allocating `vector<int> level(size)` and placing at index `i` or `size-1-i` is faster than reversing alternate rows. Both are correct; the index approach avoids O(n) reversal per level.

### 8. Top view uses BFS (not DFS)

DFS doesn't guarantee visiting the topmost node first for each horizontal distance. BFS visits level by level, so the first node at each hd IS the topmost.

### 9. Height of NULL is 0 (or -1 depending on definition)

```cpp
// Returning 0 for NULL → leaf height = 1 (most LeetCode problems)
if (root == NULL) return 0;

// Returning -1 for NULL → leaf height = 0 (edge-based height)
if (root == NULL) return -1;
```

Mixing these within a problem causes off-by-one errors.

### 10. Iterative preorder — push RIGHT before LEFT

```cpp
if (node->right) st.push(node->right);  // pushed first, popped last
if (node->left)  st.push(node->left);   // pushed last, popped first
```

---

## 17. Final Revision Sheet

### Core Templates

```cpp
// Node structure
struct Node { int data; Node *left, *right; Node(int d) : data(d), left(NULL), right(NULL) {} };

// Inorder recursive
void inorder(Node* r) { if(!r) return; inorder(r->left); visit(r); inorder(r->right); }

// Iterative inorder
stack<Node*> st; Node* curr = root;
while(!st.empty() || curr) {
    while(curr) { st.push(curr); curr = curr->left; }
    curr = st.top(); st.pop(); visit(curr); curr = curr->right;
}

// Level order (size-based)
queue<Node*> q; q.push(root);
while(!q.empty()) {
    int sz = q.size();
    for(int i=0;i<sz;i++) {
        auto node = q.front(); q.pop(); visit(node);
        if(node->left) q.push(node->left);
        if(node->right) q.push(node->right);
    }
}

// Height
int height(Node* r) { return r ? 1+max(height(r->left),height(r->right)) : 0; }

// Diameter (O(n))
int diam = 0;
int dfs(Node* r) {
    if(!r) return 0;
    int l = dfs(r->left), ri = dfs(r->right);
    diam = max(diam, l+ri); return 1+max(l,ri);
}

// LCA
Node* lca(Node* r, int p, int q) {
    if(!r || r->data==p || r->data==q) return r;
    Node* L = lca(r->left,p,q), *R = lca(r->right,p,q);
    return L&&R ? r : L?L:R;
}

// Morris Inorder
Node* curr = root;
while(curr) {
    if(!curr->left) { visit(curr); curr = curr->right; }
    else {
        Node* pred = curr->left;
        while(pred->right && pred->right != curr) pred = pred->right;
        if(!pred->right) { pred->right = curr; curr = curr->left; }
        else { pred->right = NULL; visit(curr); curr = curr->right; }
    }
}
```

### Complexity Table

| Operation | Time | Space | Notes |
|-----------|------|-------|-------|
| Recursive traversal | O(n) | O(h) | h=height; O(n) worst (skewed) |
| Iterative inorder | O(n) | O(h) | Stack ≤ height deep |
| Iterative postorder (2-stack) | O(n) | O(n) | s2 holds all nodes |
| Level order | O(n) | O(n) | Queue ≤ n/2 at a time |
| Height | O(n) | O(h) | |
| Diameter (optimized) | O(n) | O(h) | |
| LCA (single DFS) | O(n) | O(h) | |
| Morris inorder | O(n) | O(1) | In-place threading |
| Binary lifting preprocess | O(n log n) | O(n log n) | |
| Binary lifting query | O(log n) | O(1) | Per query |

### Interview Checklist

- [ ] Can I write iterative inorder from scratch (the `while(!st.empty() || curr)` pattern)?
- [ ] Can I write iterative postorder with 2 stacks?
- [ ] Can I explain Morris traversal (create thread, detect thread, destroy thread)?
- [ ] Can I write LCA in a single DFS?
- [ ] Do I know the "return height but update diameter" pattern?
- [ ] Can I explain why top view needs BFS (not DFS)?
- [ ] Can I build tree from preorder + inorder and get the index math right?
- [ ] Can I explain why iterative preorder pushes right before left?
- [ ] Do I handle the `max(0, gain)` in max path sum?
- [ ] Can I explain the Morris inner loop condition `pred->right != curr`?

### Most Important Observations

1. **Tree recursion = base case (NULL) + left call + right call + current node work.** The order of these three determines the traversal type.
2. **Global answer vs return value can differ.** In diameter and max path sum, what you update globally (through both children) differs from what you return upward (only one child direction).
3. **LCA: returns from both left and right subtrees → current node is LCA.** This single pattern handles all cases.
4. **Morris traversal = use NULL right pointers as thread pointers.** Create and destroy threads in-place for O(1) space.
5. **Top view needs BFS; vertical order needs DFS with (hd, level) tracking.**
6. **Iterative inorder: `!st.empty() || curr != NULL`.** Both conditions needed.
7. **Two-stack postorder is much easier to explain than one-stack.** Use it unless O(n) space is forbidden.
8. **Binary lifting: `up[v][i] = up[up[v][i-1]][i-1]`.** Two half-jumps = one full jump.

---

*Chapter 13 — Binary Trees | Part of DSA Interview Prep series*  
*Based on Striver's A2Z Sheet + Love Babbar lecture series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] Preorder Traversal — https://leetcode.com/problems/binary-tree-preorder-traversal/
- [ ] Inorder Traversal — https://leetcode.com/problems/binary-tree-inorder-traversal/
- [ ] Postorder Traversal — https://leetcode.com/problems/binary-tree-postorder-traversal/
- [ ] Level Order Traversal — https://leetcode.com/problems/binary-tree-level-order-traversal/
- [ ] Iterative Preorder Traversal — https://leetcode.com/problems/binary-tree-preorder-traversal/
- [ ] Iterative Inorder Traversal — https://leetcode.com/problems/binary-tree-inorder-traversal/
- [ ] Post-order Traversal using 2 stacks — https://leetcode.com/problems/binary-tree-postorder-traversal/
- [ ] Maximum Depth in BT — https://leetcode.com/problems/maximum-depth-of-binary-tree/
- [ ] Check for balanced binary tree — https://leetcode.com/problems/balanced-binary-tree/
- [ ] Diameter of Binary Tree — https://leetcode.com/problems/diameter-of-binary-tree/
- [ ] Maximum path sum — https://leetcode.com/problems/binary-tree-maximum-path-sum/
- [ ] Check if two trees are identical or not — https://leetcode.com/problems/same-tree/
- [ ] Zig Zag Traversal — https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal/
- [ ] Boundary Traversal — https://leetcode.com/problems/boundary-of-binary-tree/
- [ ] Vertical Order Traversal — https://leetcode.com/problems/vertical-order-traversal-of-a-binary-tree/
- [ ] Top View of BT — https://www.geeksforgeeks.org/problems/top-view-of-binary-tree/1
- [ ] Bottom View of BT — https://www.geeksforgeeks.org/problems/bottom-view-of-binary-tree/1
- [ ] Right/Left View of Binary Tree — https://leetcode.com/problems/binary-tree-right-side-view/
- [ ] Symmetric Binary Tree — https://leetcode.com/problems/symmetric-tree/
- [ ] Print root to leaf path in BT — https://www.geeksforgeeks.org/problems/root-to-leaf-paths/1
- [ ] LCA in BT — https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/
- [ ] Maximum Width of BT — https://leetcode.com/problems/maximum-width-of-binary-tree/
- [ ] Children Sum Property in Binary Tree — https://www.geeksforgeeks.org/problems/children-sum-parent/1
- [ ] Print all nodes at a distance of K in BT — https://leetcode.com/problems/all-nodes-distance-k-in-binary-tree/
- [ ] Minimum time to burn BT from a given Node — https://www.geeksforgeeks.org/problems/burning-tree/1
- [ ] Count total nodes in a complete BT — https://leetcode.com/problems/count-complete-tree-nodes/
- [ ] Construct a BT from Preorder and Inorder — https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/
- [ ] Construct a BT from Postorder and Inorder — https://leetcode.com/problems/construct-binary-tree-from-inorder-and-postorder-traversal/
- [ ] Serialize and De-serialize BT — https://leetcode.com/problems/serialize-and-deserialize-binary-tree/
- [ ] Morris Inorder Traversal — https://leetcode.com/problems/binary-tree-inorder-traversal/
- [ ] Flatten Binary Tree to Linked List — https://leetcode.com/problems/flatten-binary-tree-to-linked-list/
- [ ] Sum Tree or Not — https://www.geeksforgeeks.org/problems/sum-tree/1
- [ ] Diagonal Traversal — https://www.geeksforgeeks.org/problems/diagonal-traversal-of-binary-tree/1
- [ ] Sum of Longest BloodLine — https://www.geeksforgeeks.org/problems/sum-of-the-longest-bloodline-of-a-tree/1
- [ ] K Sum paths — https://www.geeksforgeeks.org/problems/k-sum-paths/1
- [ ] Kth Ancestor — https://www.geeksforgeeks.org/problems/kth-ancestor-in-a-tree/1
- [ ] Max Sum of Non-Adjacent Nodes (House Robber on Tree) — https://www.geeksforgeeks.org/problems/maximum-sum-of-non-adjacent-nodes/1

