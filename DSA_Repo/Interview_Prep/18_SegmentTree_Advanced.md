# Chapter 18 — Segment Tree & Advanced Math

> **Revision target:** 1 day  
> **Goal:** After reading this file, you need nothing else — complete segment tree (build/query/update/lazy), merge sort tree, persistent segment tree, and all number theory. Google Doc reference: [Segment Tree Notes](https://docs.google.com/document/d/1sndIZ6lwH6jXT0SqXmNZYLPjbeRK6dGvBfybLWeItbc/)

---

## Table of Contents

1. [Segment Tree — Basics](#1-segment-tree--basics)
2. [Lazy Propagation — Range Updates](#2-lazy-propagation--range-updates)
3. [Binary Search on Segment Tree](#3-binary-search-on-segment-tree)
4. [Merge Sort Tree — K-th Order Statistics](#4-merge-sort-tree--k-th-order-statistics)
5. [Persistent Segment Tree](#5-persistent-segment-tree)
6. [Number Theory — GCD & LCM](#6-number-theory--gcd--lcm)
7. [Prime Numbers & Sieve](#7-prime-numbers--sieve)
8. [Fast Exponentiation (Binary Exponentiation)](#8-fast-exponentiation-binary-exponentiation)
9. [Modular Arithmetic & MMI](#9-modular-arithmetic--mmi)
10. [Things Most People Forget](#10-things-most-people-forget)
11. [Practice Problems](#11-practice-problems)
12. [Final Revision Sheet](#12-final-revision-sheet)

---

## 1. Segment Tree — Basics

### What problem does a segment tree solve?

You have an array. You need to:
1. **Query** an aggregate (sum, min, max, gcd...) over a range `[l, r]`
2. **Update** individual elements (or ranges with lazy propagation)

**Without segment tree:** Range query = O(n), point update = O(1). If you have Q queries, total O(Q×n).  
**With segment tree:** Range query = O(log n), point update = O(log n). Total O(Q×log n).

**When NOT to use segment tree:**
- Only queries, no updates → Use prefix sums (O(n) build, O(1) query)
- Only static range min/max queries → Use Sparse Table (O(n log n) build, O(1) query)
- Only prefix sum updates → Use Fenwick Tree / BIT (simpler code)

### The Array Representation

Segment tree is stored as an array of size `4*N`. This is because the tree has at most `4*N` nodes.

```
Original array:  [1, 3, 5, 7, 9]   (indices 0-4)
                                                    
                      [25]              ← root (index 0), covers [0,4]
                    /       \
                [9]           [16]      ← index 1 [0,2], index 2 [3,4]
               /   \         /   \
             [4]   [5]     [7]   [9]   ← leaves and internal nodes
            /  \
          [1]  [3]

segTree[0] = 25  (sum of [0,4])
segTree[1] = 9   (sum of [0,2])
segTree[2] = 16  (sum of [3,4])
...
```

**Node indexing:** If node is at index `ind`:
- Left child: `2*ind + 1`
- Right child: `2*ind + 2`
- Parent: `(ind-1)/2`

### Build, Query, Update — Complete Implementation

```cpp
const int MAXN = 100005;
int segTree[4 * MAXN];

// Build — O(n)
void build(int ind, int l, int r, vector<int> &arr) {
    if (l == r) {
        segTree[ind] = arr[l];  // leaf node stores array value
        return;
    }
    int mid = (l + r) / 2;
    build(2*ind+1, l, mid, arr);    // build left child
    build(2*ind+2, mid+1, r, arr);  // build right child
    segTree[ind] = segTree[2*ind+1] + segTree[2*ind+2];  // merge children
}

// Point Update — O(log n)
void update(int ind, int l, int r, int pos, int newVal) {
    if (l == r) {
        segTree[ind] = newVal;
        return;
    }
    int mid = (l + r) / 2;
    if (pos <= mid) update(2*ind+1, l, mid, pos, newVal);
    else            update(2*ind+2, mid+1, r, pos, newVal);
    segTree[ind] = segTree[2*ind+1] + segTree[2*ind+2];  // update on way back up
}

// Range Query — O(log n)
int query(int ind, int l, int r, int ql, int qr) {
    // Case 1: No overlap
    if (qr < l || r < ql) return 0;  // identity for sum; INT_MAX for min; INT_MIN for max

    // Case 2: Full overlap — current segment completely inside query
    if (ql <= l && r <= qr) return segTree[ind];

    // Case 3: Partial overlap — split and recurse
    int mid = (l + r) / 2;
    int left  = query(2*ind+1, l, mid, ql, qr);
    int right = query(2*ind+2, mid+1, r, ql, qr);
    return left + right;  // merge
}
```

**Three cases — this is the heart of every segment tree function:**
1. **No overlap:** Query range and node range don't intersect → return identity
2. **Full overlap:** Node range completely within query range → return node's stored value
3. **Partial overlap:** Split at midpoint, recurse on both children, merge results

**From your code (Baiscs.cpp):** Implements max segment tree. `build` stores `max(left, right)`, `query` returns max in range, `update` sets `arr[l] = max(arr[l], newVal)` (special max update, not just set). The identity for no-overlap case is `0` — be careful: for min queries, use `INT_MAX`.

### Calling convention

```cpp
// Always call with: ind=0, l=0, r=n-1
seg.build(0, 0, n-1, arr);
int result = seg.query(0, 0, n-1, ql, qr);
seg.update(0, 0, n-1, pos, newVal);
```

### Time and Space Complexity

| Operation | Time | Space |
|-----------|------|-------|
| Build | O(n) | O(4n) |
| Point Update | O(log n) | O(1) extra |
| Range Query | O(log n) | O(1) extra |

---

## 2. Lazy Propagation — Range Updates

### The problem lazy propagation solves

Without lazy propagation, a range update (add 5 to all elements in [l, r]) requires visiting all elements → O(n) per update.

With lazy propagation: propagate updates lazily — store the pending update at a node and only push it down when we actually need the children's values. This makes range update O(log n).

### How lazy works

Each node stores a `lazy` value = "pending update not yet propagated to children."

**When do we push down (pushDown)?**
Before we split at a node (entering case 3: partial overlap), we push the lazy value to both children. This ensures children have correct values before we recurse on them.

**For sum with range add:**
- Pushing to children: `lazy[child] += lazy[parent]`
- Updating parent's segment tree value: `segTree[ind] += lazy[ind] * (r - l + 1)`

### Complete Lazy Propagation Implementation (Range Add, Sum Query)

```cpp
const int MAXN = 200105;
long long segTree[4 * MAXN];
long long lazy[4 * MAXN];

// Push lazy update down to children
void pushDown(int ind, int l, int r) {
    if (lazy[ind] != 0) {
        int mid = (l + r) / 2;
        // Update left child
        lazy[2*ind+1]    += lazy[ind];
        segTree[2*ind+1] += lazy[ind] * (mid - l + 1);
        // Update right child
        lazy[2*ind+2]    += lazy[ind];
        segTree[2*ind+2] += lazy[ind] * (r - mid);
        // Clear parent's lazy
        lazy[ind] = 0;
    }
}

// Build — same as before
void build(int ind, int l, int r, vector<int> &arr) {
    lazy[ind] = 0;
    if (l == r) { segTree[ind] = arr[l]; return; }
    int mid = (l + r) / 2;
    build(2*ind+1, l, mid, arr);
    build(2*ind+2, mid+1, r, arr);
    segTree[ind] = segTree[2*ind+1] + segTree[2*ind+2];
}

// Range Update (add val to all elements in [ql, qr]) — O(log n)
void rangeUpdate(int ind, int l, int r, int ql, int qr, long long val) {
    // Case 1: No overlap
    if (qr < l || r < ql) return;

    // Case 2: Full overlap — store lazy, update this node
    if (ql <= l && r <= qr) {
        lazy[ind] += val;
        segTree[ind] += val * (r - l + 1);  // update aggregate
        return;
    }

    // Case 3: Partial overlap — push down FIRST, then recurse
    pushDown(ind, l, r);  // <-- CRITICAL: push before going deeper
    int mid = (l + r) / 2;
    rangeUpdate(2*ind+1, l, mid, ql, qr, val);
    rangeUpdate(2*ind+2, mid+1, r, ql, qr, val);
    segTree[ind] = segTree[2*ind+1] + segTree[2*ind+2];
}

// Range Query (sum of [ql, qr]) — O(log n)
long long rangeQuery(int ind, int l, int r, int ql, int qr) {
    // Case 1: No overlap
    if (qr < l || r < ql) return 0;

    // Case 2: Full overlap
    if (ql <= l && r <= qr) return segTree[ind];

    // Case 3: Partial overlap — push down FIRST, then recurse
    pushDown(ind, l, r);  // <-- CRITICAL: push before going deeper
    int mid = (l + r) / 2;
    return rangeQuery(2*ind+1, l, mid, ql, qr) +
           rangeQuery(2*ind+2, mid+1, r, ql, qr);
}
```

**From your code (lazy_propagation.cpp):** Your implementation has `pushDown` called at the beginning of both `update` and `query`. The `pushDown` function applies `lazy[ind]` to both children and clears it. The formula `lazy[ind] * (r - l + 1)` accounts for the segment length.

### The critical rule: pushDown before recursing

```cpp
// WRONG: recurse without pushDown
void update(...) {
    // ...
    // Case 3:
    update(2*ind+1, ...);  // child might have stale values!
    update(2*ind+2, ...);
}

// CORRECT: always pushDown first in case 3
void update(...) {
    // ...
    // Case 3:
    pushDown(ind, l, r);   // clear parent's lazy to children
    update(2*ind+1, ...);
    update(2*ind+2, ...);
    segTree[ind] = segTree[2*ind+1] + segTree[2*ind+2];
}
```

### Lazy for Range Set (not add)

```cpp
// For "set all elements in range to val" instead of "add val"
void pushDown(int ind, int l, int r) {
    if (lazy[ind] != -1) {  // -1 = no pending update
        int mid = (l + r) / 2;
        lazy[2*ind+1] = lazy[ind];
        segTree[2*ind+1] = lazy[ind] * (mid - l + 1);
        lazy[2*ind+2] = lazy[ind];
        segTree[2*ind+2] = lazy[ind] * (r - mid);
        lazy[ind] = -1;  // clear
    }
}
```

**Key insight for lazy set vs lazy add:**
- Add: `lazy[child] += parent_lazy` (accumulate)
- Set: `lazy[child] = parent_lazy` (overwrite) — if there's already a pending set, the new set replaces it

---

## 3. Binary Search on Segment Tree

**Problem:** Find the leftmost index in range [l, r] where prefix sum ≥ target.

**Key insight:** Instead of binary searching on prefix sum array (O(log²n) — binary search × segment tree query), we can do binary search directly on the segment tree in O(log n).

**Idea:** At each node, if the left child's subtree sum ≥ target, the answer is in the left subtree. Otherwise, subtract left sum from target and search right subtree.

```cpp
// Find smallest index i in [l, r] such that prefix sum from l to i >= target
int findFirst(int ind, int l, int r, int ql, int qr, long long target) {
    if (r < ql || l > qr || segTree[ind] < target) return -1;
    if (l == r) return l;

    int mid = (l + r) / 2;
    int leftResult = findFirst(2*ind+1, l, mid, ql, qr, target);
    if (leftResult != -1) return leftResult;
    // Left didn't have enough — search right with remaining target
    return findFirst(2*ind+2, mid+1, r, ql, qr, target - segTree[2*ind+1]);
}
```

**From your code (BinarySerach.cpp):** Explains the O(log n) vs O(log² n) tradeoff. The structure of the segment tree mirrors binary search — "curr_left_Sum >= target means go left; otherwise go right but reduce target by left sum." The problem it references is [Sliding Subarray Beauty](https://leetcode.com/problems/sliding-subarray-beauty/).

---

## 4. Merge Sort Tree — K-th Order Statistics

### What it stores

Instead of storing a single value per node, each node stores a **sorted array of all elements in its range**.

```
Original: [3, 1, 4, 1, 5]
Root:     [1, 1, 3, 4, 5]   ← sorted, all elements
Left:     [1, 3, 4]         ← sorted, left half
Right:    [1, 5]            ← sorted, right half
```

### Build

```cpp
vector<vector<int>> segTree(4 * MAXN);

void build(int ind, int l, int r, vector<int> &arr) {
    if (l == r) {
        segTree[ind] = {arr[l]};
        return;
    }
    int mid = (l + r) / 2;
    build(2*ind+1, l, mid, arr);
    build(2*ind+2, mid+1, r, arr);
    // Merge two sorted arrays
    merge(segTree[2*ind+1].begin(), segTree[2*ind+1].end(),
          segTree[2*ind+2].begin(), segTree[2*ind+2].end(),
          back_inserter(segTree[ind]));
}
```

**Time:** O(n log n) to build, O(n log n) total space.

### Query: count elements ≤ k in range [l, r]

```cpp
int countLessEqual(int ind, int l, int r, int ql, int qr, int k) {
    if (qr < l || r < ql) return 0;
    if (ql <= l && r <= qr) {
        // Binary search in sorted array at this node
        return upper_bound(segTree[ind].begin(), segTree[ind].end(), k)
               - segTree[ind].begin();
    }
    int mid = (l + r) / 2;
    return countLessEqual(2*ind+1, l, mid, ql, qr, k) +
           countLessEqual(2*ind+2, mid+1, r, ql, qr, k);
}
```

**Time per query:** O(log² n) — O(log n) nodes visited × O(log n) binary search per node.

### K-th smallest in range [l, r]

Binary search on value k: find smallest k such that `countLessEqual([l,r], k) >= rank`.

```cpp
// Binary search on value, count query for each check: O(log(maxVal) × log²n)
int kthSmallest(int l, int r, int rank) {
    int lo = minVal, hi = maxVal;
    while (lo < hi) {
        int mid = (lo + hi) / 2;
        if (countLessEqual(0, 0, n-1, l, r, mid) >= rank) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}
```

**From your code (mergeSort.cpp):** Full implementation for "count elements > k in range." Uses a `lastind[ind]` pointer optimization (doesn't restart binary search from beginning each time). The queries are sorted by k value, and the pointer is advanced monotonically.

---

## 5. Persistent Segment Tree

### The idea

Normal segment tree: each update modifies the tree in place — you lose the old version.

Persistent segment tree: each update creates a **new version** by only modifying the O(log n) nodes on the path to the updated leaf. Old nodes are shared (not copied) → space efficient.

```
Version 0: root_0 → ... (original tree)
Version 1: root_1 → shares most nodes with v0, only log(n) new nodes
Version 2: root_2 → shares with v1 and v0
```

### Node structure (pointer-based)

```cpp
struct Node {
    int val;
    Node *left, *right;
    Node(int v) : val(v), left(nullptr), right(nullptr) {}
    Node(Node *other) : val(other->val), left(other->left), right(other->right) {}
};
```

### Build and Update

```cpp
vector<Node*> roots;  // roots[t] = root of version t

// Build empty tree (all zeros) for range [l, r]
Node* buildEmpty(int l, int r) {
    if (l == r) return new Node(0);
    Node* node = new Node(0);
    int mid = (l + r) / 2;
    node->left  = buildEmpty(l, mid);
    node->right = buildEmpty(mid+1, r);
    return node;
}

// Update: create new version by updating position pos with val
Node* update(int l, int r, Node* prev, int pos, int val) {
    if (l == r) return new Node(val);  // new leaf
    Node* newNode = new Node(prev);    // copy previous node (shares children)
    int mid = (l + r) / 2;
    if (pos <= mid)
        newNode->left  = update(l, mid, prev->left, pos, val);
    else
        newNode->right = update(mid+1, r, prev->right, pos, val);
    newNode->val = newNode->left->val + newNode->right->val;
    return newNode;  // return new root for this version
}

// Query: sum in [ql, qr] in version t
int query(int l, int r, Node* root, int ql, int qr) {
    if (ql > r || qr < l) return 0;
    if (ql <= l && r <= qr) return root->val;
    int mid = (l + r) / 2;
    return query(l, mid, root->left, ql, qr) +
           query(mid+1, r, root->right, ql, qr);
}
```

### K-th smallest in range (offline, classic application)

**Trick:** Build a frequency segment tree over sorted values. Insert elements one by one (version i = first i elements inserted). Then for range [l, r], the "diff tree" = roots[r] - roots[l-1] represents frequencies of values in that range. Find k-th smallest by walking down this diff tree.

```cpp
// roots[i] = segment tree after inserting first i elements (by position in sorted order)
// Query: k-th smallest in original array range [l, r]
int kthSmallest(int l, int r, int k, int lo, int hi) {
    if (lo == hi) return lo;
    int mid = (lo + hi) / 2;
    // Count elements in left subtree for the range [l, r]
    int leftCount = roots[r]->left->val - roots[l-1]->left->val;
    if (k <= leftCount)
        return kthSmallest(l, r, k, lo, mid);  // answer in left half of values
    else
        return kthSmallest(l, r, k - leftCount, mid+1, hi);  // search right
}
```

**From your code (persisentST.cpp):** Uses `rootState` vector to track versions. `build(l, r, prev, ind, val)` creates new root. `queryTree(l, r, time, s, e)` queries at a specific version (time). The implementation applies insertions one by one and builds a version history.

**Time:** O(n log n) to build all versions, O(log n) per query  
**Space:** O(n log n) total (O(log n) new nodes per version)

---

## 6. Number Theory — GCD & LCM

### GCD — Greatest Common Divisor

**From your code (Math/gcd.cpp):** Subtraction-based GCD:
```cpp
int gcd(int a, int b) {
    if (a == 0) return b;
    if (b == 0) return a;
    while (a != b) {
        if (a > b) a = a - b;
        else b = b - a;
    }
    return a;
}
```

This is slow for large numbers. Use the Euclidean algorithm:

```cpp
// Euclidean algorithm — O(log(min(a,b)))
int gcd(int a, int b) {
    return b == 0 ? a : gcd(b, a % b);
}

// Or iterative:
int gcd(int a, int b) {
    while (b) { a %= b; swap(a, b); }
    return a;
}
```

**Why Euclidean algorithm works:** `gcd(a, b) = gcd(b, a % b)`. Every step, the larger number is reduced by at least half → O(log) steps.

**In C++17:** `__gcd(a, b)` or `gcd(a, b)` from `<numeric>`.

### LCM

```cpp
long long lcm(long long a, long long b) {
    return a / gcd(a, b) * b;  // divide first to avoid overflow
}
```

**Always divide before multiply** to avoid overflow: `a * b` can overflow even if `lcm` fits in `long long`.

### GCD properties

```
gcd(a, 0) = a
gcd(a, b) = gcd(b, a % b)
lcm(a, b) = a × b / gcd(a, b)
gcd(a, a) = a
```

---

## 7. Prime Numbers & Sieve

### Checking primality — O(√n)

**From your code (LuvMaths/Prime.cpp):** Loop from 2 to √n, check divisibility.

```cpp
bool isPrime(int n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 == 0 || n % 3 == 0) return false;
    for (int i = 5; i * i <= n; i += 6) {  // check 6k±1 forms
        if (n % i == 0 || n % (i+2) == 0) return false;
    }
    return true;
}
```

**Why √n?** If n = a×b, at least one of a, b ≤ √n. So if no factor found up to √n, n is prime.

### Sieve of Eratosthenes — O(n log log n)

**From your code (Math/sieve.cpp):** Marks multiples of each prime as composite.

```cpp
const int MAXN = 1e6 + 5;
vector<bool> isPrime(MAXN, true);

void sieve() {
    isPrime[0] = isPrime[1] = false;
    for (int i = 2; i * i < MAXN; i++) {
        if (isPrime[i]) {
            for (int j = i * i; j < MAXN; j += i) {
                isPrime[j] = false;  // mark multiples
            }
        }
    }
}
```

**Why start inner loop at `i*i`?** All multiples of i less than i² have already been marked by smaller primes. For example, when i=5, 2×5=10 was already marked by 2, 3×5=15 by 3. So we start at 5²=25.

**Time:** O(n log log n) — almost O(n)  
**Space:** O(n)

### Smallest Prime Factor (SPF) Sieve — for fast factorization

**From your code (LuvMaths/Seive.cpp):**

```cpp
const int N = 1e7 + 10;
vector<int> spf(N, 0);  // smallest prime factor

void buildSPF() {
    for (int i = 2; i < N; i++) {
        if (spf[i] == 0) {  // i is prime
            for (int j = i; j < N; j += i) {
                if (spf[j] == 0) spf[j] = i;  // first prime that divides j
            }
        }
    }
}

// Fast factorization using SPF — O(log n) per number
vector<int> factorize(int n) {
    vector<int> factors;
    while (n > 1) {
        int p = spf[n];
        while (n % p == 0) { factors.push_back(p); n /= p; }
    }
    return factors;
}
```

**From your code (LuvMaths/NumberTheory/Seive.cpp):** Also tracks `hpf` (highest prime factor). Combined with `spf`, you can factorize any number in O(log n) after O(n) preprocessing.

### Prime Factorization — O(√n) without sieve

**From your code (LuvMaths/Prime.cpp — findPrimeFactor):**

```cpp
vector<int> primeFactors(int n) {
    vector<int> factors;
    for (int i = 2; i * i <= n; i++) {
        while (n % i == 0) {
            factors.push_back(i);
            n /= i;
        }
    }
    if (n > 1) factors.push_back(n);  // remaining prime factor > √n
    return factors;
}
```

### Count divisors — two methods

**From your code (LuvMaths/Divisor.cpp):**

```cpp
// Method 1: O(n) — brute force
int cntDiv = 0;
for (int i = 1; i <= n; i++)
    if (n % i == 0) cntDiv++;

// Method 2: O(√n) — pair up divisors
int cntDiv = 0;
for (int i = 1; i * i <= n; i++) {
    if (n % i == 0) {
        cntDiv++;
        if (i != n / i) cntDiv++;  // don't count √n twice
    }
}
```

**Important:** For a perfect square (e.g., 36), `i = 6 = n/i`, so we add only 1. For others, we add 2 (both i and n/i).

---

## 8. Fast Exponentiation (Binary Exponentiation)

### Why it works

To compute a^b:
- If b is even: a^b = (a^(b/2))²
- If b is odd: a^b = a × (a^(b/2))²

This halves the problem each step → O(log b).

**From your code (Recursion/exponent.cpp):**
```cpp
int power(int a, int b) {
    if (b == 0) return 1;
    int ans = power(a, b/2);
    if (b % 2 == 0) return ans * ans;
    else return a * ans * ans;
}
```

### Iterative version (preferred — no recursion stack)

**From your code (Math/fastExpo.cpp, LuvMaths/IterativePower.cpp):**

```cpp
// Without modulo (small numbers)
long long fastPow(long long base, long long exp) {
    long long result = 1;
    while (exp > 0) {
        if (exp & 1) result *= base;  // if LSB set, multiply base into result
        base *= base;                  // square the base
        exp >>= 1;                     // right shift (divide by 2)
    }
    return result;
}
```

**With modulo (standard in competitive programming):**

```cpp
const long long MOD = 1e9 + 7;

long long modPow(long long base, long long exp, long long mod = MOD) {
    long long result = 1;
    base %= mod;
    while (exp > 0) {
        if (exp & 1) result = result * base % mod;
        base = base * base % mod;
        exp >>= 1;
    }
    return result;
}
```

**From your code (LuvMaths/IterativePower.cpp):** The line `a = (a * a * 1ll) % M` — the `1ll` cast prevents integer overflow during multiplication before taking modulo.

### Binary representation of exponent

The iterative approach works by processing bits of `exp` from LSB to MSB:

```
exp = 13 = 1101 in binary
result = 1
Bit 0 (set):   result *= base^1  = a
Bit 1 (unset): (skip)
Bit 2 (set):   result *= base^4  = a × a^4 = a^5
Bit 3 (set):   result *= base^8  = a^5 × a^8 = a^13
```

a^13 = a^1 × a^4 × a^8 (corresponding to set bits in 13=1101).

### Large exponentiation (preventing overflow in multiplication)

**From your code (LuvMaths/LargeExponation1.cpp):** When even `a*a` overflows (large moduli like 1e18+7), use binary multiplication:

```cpp
// Binary multiplication to avoid overflow
long long binaryMul(long long a, long long b, long long mod) {
    long long result = 0;
    a %= mod;
    while (b > 0) {
        if (b & 1) result = (result + a) % mod;
        a = (a + a) % mod;  // double a
        b >>= 1;
    }
    return result;
}
```

Use `binaryMul` instead of `a * b % mod` when a, b can be close to 1e18.

---

## 9. Modular Arithmetic & MMI

### Basic modular arithmetic

```cpp
// Modular operations
(a + b) % MOD
(a - b + MOD) % MOD  // +MOD to prevent negative
(a * b) % MOD
// Division: a/b mod M ≠ (a % M) / (b % M) — need Modular Multiplicative Inverse
```

**Why `(a - b + MOD) % MOD`?** In C++, `%` can return negative for negative operands. Adding MOD before taking % ensures the result is positive.

### Modular Multiplicative Inverse (MMI)

The inverse of `a` modulo `M` is a number `x` such that `(a × x) ≡ 1 (mod M)`.

**Only exists when `gcd(a, M) = 1`** (i.e., a and M are coprime).

**For prime M (like 1e9+7), by Fermat's Little Theorem:**
```
a^(M-1) ≡ 1 (mod M)
a^(M-2) ≡ a^(-1) (mod M)
```

So: `MMI(a) = modPow(a, M-2, M)`

**From your code (MMI.cpp):**
```cpp
const int M = 1e9 + 7;
int mmi(int a) {
    return modPow(a, M - 2, M);  // Fermat's little theorem
}
```

**Why 1e9+7?** It's the largest prime < 2^30. Two numbers < MOD can be multiplied without overflow if using `long long`: `(long long)a * b < 10^18 < 2^63`.

### Modular division

```cpp
// To compute (a / b) % MOD:
long long result = (1LL * a % MOD * mmi(b) % MOD) % MOD;
```

### nCr (Binomial Coefficient) with modulo

**From your code (Baiscs.cpp — the bnr/cnr functions):**

```cpp
const int MAXN = 100005;
vector<long long> fac(MAXN, 1);

void precompute() {
    for (int i = 1; i < MAXN; i++)
        fac[i] = fac[i-1] * i % MOD;
}

// nCr mod M = n! / (r! * (n-r)!) mod M
long long nCr(int n, int r) {
    if (r > n) return 0;
    return fac[n] % MOD * mmi(fac[r]) % MOD * mmi(fac[n-r]) % MOD;
}
```

Or precompute inverse factorials for faster queries:
```cpp
vector<long long> inv_fac(MAXN);
void precompute() {
    fac[0] = 1;
    for (int i = 1; i < MAXN; i++) fac[i] = fac[i-1] * i % MOD;
    inv_fac[MAXN-1] = modPow(fac[MAXN-1], MOD-2, MOD);
    for (int i = MAXN-2; i >= 0; i--) inv_fac[i] = inv_fac[i+1] * (i+1) % MOD;
}
long long nCr(int n, int r) {
    if (r > n || r < 0) return 0;
    return fac[n] * inv_fac[r] % MOD * inv_fac[n-r] % MOD;
}
```

---

## 10. Things Most People Forget

### 1. Segment tree size must be 4*N (not 2*N or 2*N+1)

```cpp
int segTree[4 * MAXN];  // 4*N is safe for any N
// 2*N is NOT enough for arbitrary N
```

### 2. Three cases in every segment tree function: no overlap, full overlap, partial

```
No overlap:   qr < l || r < ql  → return identity
Full overlap: ql <= l && r <= qr → return stored value
Partial:      recurse on both children + merge
```

### 3. Lazy: pushDown before recursing (in partial overlap case only)

```cpp
// Case 3 — always push down FIRST:
pushDown(ind, l, r);
int mid = (l + r) / 2;
// ... then recurse
```

### 4. For min queries, identity is INT_MAX (not 0)

```cpp
// Range SUM identity: 0 (no overlap → return 0)
// Range MIN identity: INT_MAX (no overlap → return INT_MAX)
// Range MAX identity: INT_MIN (no overlap → return INT_MIN)
// Range GCD identity: 0 (gcd(0, x) = x — acts as identity for GCD)
```

### 5. Always call segment tree with ind=0, l=0, r=n-1

```cpp
build(0, 0, n-1, arr);           // not build(1, 1, n, arr)
query(0, 0, n-1, ql, qr);
update(0, 0, n-1, pos, val);
```

### 6. Sieve inner loop starts at i*i, not 2*i

```cpp
for (int j = i * i; j < N; j += i)  // i*i is the optimization
// Starting at 2*i is correct but slower — marks already-marked numbers
```

### 7. Fast exponentiation: always take modulo after BOTH multiply AND square

```cpp
result = result * base % mod;  // both operations need mod
base   = base * base % mod;
```

### 8. MMI only works for prime moduli via Fermat's theorem

```cpp
// For non-prime moduli, use Extended Euclidean Algorithm instead
// For prime MOD = 1e9+7: mmi(a) = modPow(a, MOD-2, MOD)
```

### 9. LCM: divide before multiply to prevent overflow

```cpp
// WRONG: a * b / gcd(a, b) — overflow if a*b > long long
// CORRECT: a / gcd(a, b) * b — a/gcd is always integer
```

### 10. Persistent segment tree: update returns NEW root (doesn't modify in-place)

```cpp
// WRONG: update(l, r, root, pos, val);  (returns nothing)
// CORRECT:
Node* newRoot = update(l, r, prevRoot, pos, val);
roots.push_back(newRoot);
```

---

## 12. Final Revision Sheet

### Core Templates

```cpp
// 1. Segment tree (sum) — point update, range query
int seg[4*N];
void build(int ind, int l, int r, vector<int>& arr) {
    if(l==r) { seg[ind]=arr[l]; return; }
    int m=(l+r)/2;
    build(2*ind+1,l,m,arr); build(2*ind+2,m+1,r,arr);
    seg[ind]=seg[2*ind+1]+seg[2*ind+2];
}
int query(int ind, int l, int r, int ql, int qr) {
    if(qr<l||r<ql) return 0;
    if(ql<=l&&r<=qr) return seg[ind];
    int m=(l+r)/2;
    return query(2*ind+1,l,m,ql,qr)+query(2*ind+2,m+1,r,ql,qr);
}
void update(int ind, int l, int r, int pos, int val) {
    if(l==r) { seg[ind]=val; return; }
    int m=(l+r)/2;
    if(pos<=m) update(2*ind+1,l,m,pos,val);
    else update(2*ind+2,m+1,r,pos,val);
    seg[ind]=seg[2*ind+1]+seg[2*ind+2];
}

// 2. Lazy propagation (range add, sum query)
ll seg[4*N], lazy[4*N];
void pushDown(int ind, int l, int r) {
    if(!lazy[ind]) return;
    int m=(l+r)/2;
    lazy[2*ind+1]+=lazy[ind]; seg[2*ind+1]+=lazy[ind]*(m-l+1);
    lazy[2*ind+2]+=lazy[ind]; seg[2*ind+2]+=lazy[ind]*(r-m);
    lazy[ind]=0;
}
void rangeUpdate(int ind, int l, int r, int ql, int qr, ll val) {
    if(qr<l||r<ql) return;
    if(ql<=l&&r<=qr) { lazy[ind]+=val; seg[ind]+=val*(r-l+1); return; }
    pushDown(ind,l,r);
    int m=(l+r)/2;
    rangeUpdate(2*ind+1,l,m,ql,qr,val); rangeUpdate(2*ind+2,m+1,r,ql,qr,val);
    seg[ind]=seg[2*ind+1]+seg[2*ind+2];
}

// 3. GCD (Euclidean)
int gcd(int a, int b) { return b ? gcd(b, a%b) : a; }
ll lcm(ll a, ll b) { return a/gcd(a,b)*b; }

// 4. Sieve of Eratosthenes
vector<bool> sieve(int n) {
    vector<bool> isPrime(n+1, true);
    isPrime[0]=isPrime[1]=false;
    for(int i=2;i*i<=n;i++)
        if(isPrime[i])
            for(int j=i*i;j<=n;j+=i) isPrime[j]=false;
    return isPrime;
}

// 5. Modular fast power
ll modPow(ll base, ll exp, ll mod=1e9+7) {
    ll res=1; base%=mod;
    while(exp>0) {
        if(exp&1) res=res*base%mod;
        base=base*base%mod; exp>>=1;
    }
    return res;
}

// 6. MMI (Modular Multiplicative Inverse)
ll mmi(ll a, ll mod=1e9+7) { return modPow(a, mod-2, mod); }

// 7. nCr with precomputed factorials
ll fac[MAXN], inv_fac[MAXN];
void precompute(int n) {
    fac[0]=1; for(int i=1;i<=n;i++) fac[i]=fac[i-1]*i%MOD;
    inv_fac[n]=modPow(fac[n],MOD-2);
    for(int i=n-1;i>=0;i--) inv_fac[i]=inv_fac[i+1]*(i+1)%MOD;
}
ll nCr(int n, int r) {
    if(r>n||r<0) return 0;
    return fac[n]*inv_fac[r]%MOD*inv_fac[n-r]%MOD;
}
```

### Complexity Table

| Structure/Algorithm | Build/Precompute | Query | Update | Space |
|--------------------|-----------------|-------|--------|-------|
| Prefix Sum | O(n) | O(1) | Not supported | O(n) |
| Segment Tree | O(n) | O(log n) | O(log n) | O(4n) |
| Lazy Seg Tree | O(n) | O(log n) | O(log n) range | O(4n) |
| Merge Sort Tree | O(n log n) | O(log² n) | Not supported | O(n log n) |
| Persistent ST | O(n log n) | O(log n) | O(log n) | O(n log n) |
| Sparse Table | O(n log n) | O(1) | Not supported | O(n log n) |
| Sieve | O(n log log n) | O(1) | — | O(n) |
| SPF Sieve | O(n log log n) | O(log n) factor | — | O(n) |
| Fast Exponentiation | — | — | O(log exp) | O(1) |
| GCD (Euclidean) | — | — | O(log min) | O(1) |

### Interview Checklist

- [ ] Can I write all 3 segment tree functions (build, query, update) with correct 3-case logic?
- [ ] Do I call segment tree with ind=0, l=0, r=n-1?
- [ ] Can I write lazy propagation pushDown correctly (propagate to both children, clear parent)?
- [ ] Do I call pushDown BEFORE recursing in partial overlap case?
- [ ] Do I know the identity values: sum→0, min→INT_MAX, max→INT_MIN?
- [ ] Can I write Euclidean GCD from memory?
- [ ] Can I write Sieve with inner loop starting at i*i?
- [ ] Can I write iterative modular fast exponentiation?
- [ ] Do I know MMI = modPow(a, MOD-2, MOD) for prime MOD?
- [ ] Do I divide before multiply in LCM to prevent overflow?

---

*Chapter 18 — Segment Tree & Advanced Math | Part of DSA Interview Prep series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] Edit#Heading=H.Eyhi824Bfdgg — https://docs.google.com/document/d/1sndIZ6lwH6jXT0SqXmNZYLPjbeRK6dGvBfybLWeItbc/edit#heading=h.eyhi824bfdgg

