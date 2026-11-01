# Chapter 11 — Heaps

> **Revision target:** 0.5 day  
> **Goal:** After reading this file, you need nothing else for this topic — no code files, no YouTube, no tutorials.

---

## Table of Contents

1. [What Is a Heap?](#1-what-is-a-heap)
2. [Heap Representation — 1-based Array](#2-heap-representation--1-based-array)
3. [Insert — Sift Up](#3-insert--sift-up)
4. [Delete Root — Sift Down](#4-delete-root--sift-down)
5. [Heapify and Build Heap — O(n) vs O(n log n)](#5-heapify-and-build-heap--on-vs-on-log-n)
6. [Heap Sort](#6-heap-sort)
7. [STL Priority Queue — Min/Max Heap](#7-stl-priority-queue--minmax-heap)
8. [K-th Largest / Smallest (Top-K Problems)](#8-k-th-largest--smallest-top-k-problems)
9. [Median in a Stream — Two Heaps](#9-median-in-a-stream--two-heaps)
10. [Merge K Sorted Lists/Arrays](#10-merge-k-sorted-listsarrays)
11. [Things Most People Forget](#11-things-most-people-forget)
12. [Practice Problems](#12-practice-problems)
13. [Final Revision Sheet](#13-final-revision-sheet)

---

## 1. What Is a Heap?

A **heap** is a complete binary tree (all levels full except possibly the last, filled left to right) that satisfies the **heap property**:

- **Max-heap:** Every parent ≥ its children. Root is the maximum.
- **Min-heap:** Every parent ≤ its children. Root is the minimum.

**Why use a heap?**

| Operation | Array (unsorted) | Sorted Array | Heap |
|-----------|-----------------|--------------|------|
| Insert | O(1) | O(n) | **O(log n)** |
| Get max/min | O(n) | O(1) | **O(1)** |
| Delete max/min | O(n) | O(1) | **O(log n)** |

Heaps are the go-to structure whenever you need repeated access to the maximum or minimum element efficiently.

**Pattern recognition — when to reach for a heap:**
- "Find kth largest/smallest" → heap of size k
- "Running median" → two heaps
- "Merge K sorted lists" → min-heap with (value, list_index)
- "Minimum cost to combine elements" → min-heap
- "Schedule jobs by priority" → max or min heap
- "Top K frequent elements" → frequency map + heap

---

## 2. Heap Representation — 1-based Array

Heaps are stored in arrays — no pointers needed. The tree structure is implicit via index arithmetic.

```cpp
// arr[0] = -1 (sentinel, unused)
// arr[1] = root
// For any node at index i:
//   Left child  = 2*i
//   Right child = 2*i + 1
//   Parent      = i/2
```

**Example — max-heap stored in array:**

```
Tree:        100
            /   \
           50    60
          / \   /
         40  45 (none)

Array: [-1, 100, 50, 60, 40, 45]
Index:   0    1   2   3   4   5
```

**From your code (Heaps_Basics.cpp):** The array is declared `arr[101]` and `arr[0] = -1` is set manually. This is because the `while(index > 1)` loop terminates when index reaches 1 (the root). If arr[0] were valid, the parent of index=1 would be index=0, causing a spurious comparison.

**Why 1-based indexing?** The parent formula `i/2` only works cleanly with 1-based indexing. With 0-based, formulas become `(i-1)/2`, `2*i+1`, `2*i+2` — more error-prone.

---

## 3. Insert — Sift Up

**Algorithm:**
1. Place the new element at the **end** (index = ++size).
2. Compare with parent. If larger (max-heap), swap.
3. Repeat until heap property holds or we reach root.

```cpp
void insert(int value) {
    size++;
    int index = size;
    arr[index] = value;

    while (index > 1) {
        int parentIndex = index / 2;
        if (arr[parentIndex] < arr[index]) {  // parent smaller → violation
            swap(arr[parentIndex], arr[index]);
            index = parentIndex;
        } else {
            break;  // heap property satisfied — stop
        }
    }
}
```

**Why it works:** A complete binary tree has height O(log n). Sift-up can traverse at most O(log n) levels → **O(log n) per insert**.

**From your code (Heaps_Basics.cpp):** The key insight is the `break` — once parent ≥ inserted value, ALL ancestors are already ≥ parent (heap was valid before insert), so no further swaps are needed.

**Trace — inserting 110 into the example heap:**
```
Before: [-1, 100, 50, 60, 40, 45]
Step 1: Place 110 at index 6 → [-1, 100, 50, 60, 40, 45, 110]
Step 2: parent of 6 = 3, arr[3]=60 < 110 → swap
        → [-1, 100, 50, 110, 40, 45, 60]
Step 3: parent of 3 = 1, arr[1]=100 < 110 → swap
        → [-1, 110, 50, 100, 40, 45, 60]
Step 4: index = 1, loop exits (1 > 1 is false)
```

---

## 4. Delete Root — Sift Down

You can only delete the **root** from a heap (that's the whole point — efficient max/min extraction).

**Algorithm:**
1. Save the root value (this is the answer).
2. Move the **last element** to the root position.
3. Reduce size by 1.
4. Sift down: compare with both children, swap with the **larger child** (max-heap), repeat.

```cpp
int deleteValue() {
    int ans = arr[1];      // save root
    arr[1] = arr[size];    // last element to root
    size--;

    int index = 1;
    while (index < size) {
        int left  = 2 * index;
        int right = 2 * index + 1;
        int largest = index;

        if (left <= size && arr[largest] < arr[left])
            largest = left;
        if (right <= size && arr[largest] < arr[right])
            largest = right;

        if (largest == index) break;  // heap property holds
        swap(arr[index], arr[largest]);
        index = largest;
    }
    return ans;
}
```

**Why swap with the LARGER child?** In a max-heap, after placing the last element at the root, it may be smaller than one or both children. We must swap with the **larger** child. If we swapped with the smaller child, the larger child would still violate the heap property with its new parent.

**Common mistake:** `while(index < size)` not `while(index <= size)`. We need to check children exist — left child is `2*index`, which must be `<= size` to exist.

**Complexity:** O(log n) — same reasoning as insert.

---

## 5. Heapify and Build Heap — O(n) vs O(n log n)

### What is heapify?

`heapify(arr, n, i)` assumes both subtrees of node `i` are already valid heaps, and **pushes `arr[i]` down** to its correct position.

```cpp
void heapify(int arr[], int n, int i) {
    int largest = i;
    int left    = 2 * i;
    int right   = 2 * i + 1;

    if (left <= n && arr[largest] < arr[left])
        largest = left;
    if (right <= n && arr[largest] < arr[right])
        largest = right;

    if (largest != i) {
        swap(arr[largest], arr[i]);
        heapify(arr, n, largest);  // recurse down
    }
}
```

**From your code (Heapify_and_BuildHeap.cpp + Heap_Sort.cpp):** The recursive call `heapify(arr, n, largest)` is critical — after swapping, the subtree rooted at `largest` may now violate the heap property. We keep sifting down until no swap is needed.

### Build Heap — O(n)

**Approach:** Call heapify on every non-leaf node, **starting from the last non-leaf down to the root**.

```cpp
void buildHeap(int arr[], int n) {
    // last non-leaf = n/2 (since n/2+1 ... n are all leaves)
    for (int i = n/2; i > 0; i--) {
        heapify(arr, n, i);
    }
}
```

**Why start from n/2?** In a 1-indexed complete binary tree with n nodes, indices `n/2+1` through `n` are all leaves (they have no children). Calling heapify on a leaf does nothing. So we start at `n/2` — the last non-leaf node.

**Why O(n) and not O(n log n)?**

This is the most misunderstood complexity in heaps. Intuition says: n/2 nodes × O(log n) each = O(n log n). But this is wrong.

The key: nodes near the bottom have very short sift-down paths:
- Nodes at height 0 (leaves): 0 work. There are ~n/2 of them.
- Nodes at height 1: at most 1 swap. There are ~n/4 of them.
- Nodes at height 2: at most 2 swaps. There are ~n/8 of them.
- ...
- Root at height log n: at most log n swaps. There is 1.

Total work = Σ (height h) × (n/2^(h+1)) = O(n) [geometric series].

**Contrast — Inserting one-by-one: O(n log n)**

If you insert n elements one at a time using the `insert` function (sift-up), each takes O(log n) → total O(n log n).

**Interview question:** "Why is buildHeap O(n) when heapify is O(log n)?" — The answer above. Most sift-down operations are short because most nodes are near the leaves.

---

## 6. Heap Sort

**Algorithm:**
1. Build a max-heap from the array. O(n)
2. Repeatedly:
   a. Swap root (max element) with last element.
   b. Reduce heap size by 1.
   c. Heapify the root. O(log n)
3. After n-1 steps, array is sorted in ascending order.

```cpp
void heapSort(int arr[], int n) {
    buildHeap(arr, n);

    int index = n;
    while (n != 1) {
        swap(arr[1], arr[index]);  // put max at end
        index--;
        n--;
        heapify(arr, n, 1);        // restore heap for reduced range
    }
}
```

**From your code (Heap_Sort.cpp):** Note the two variables: `index` tracks the current last position (for swap), `n` is decremented to shrink the heap range passed to heapify. The arr[0] = -1 sentinel stays untouched throughout.

**Why does this sort in ascending order?** Each iteration extracts the maximum and places it at the rightmost unsorted position. After k iterations, the k largest elements are in their final sorted positions at the right end.

**Complexity:**
- Build heap: O(n)
- n-1 extractions, each O(log n): O(n log n)
- **Total: O(n log n)**
- **Space: O(1)** — in-place sort (unlike merge sort which needs O(n))

**Why heap sort isn't used in practice (despite O(n log n) and O(1) space)?**
Cache performance. Heap sort accesses memory non-sequentially — jumping between indices 1, 2, 4, 8, etc. This causes many cache misses. Quicksort accesses memory sequentially → much better cache behavior in practice.

---

## 7. STL Priority Queue — Min/Max Heap

The STL `priority_queue` gives you a heap without manual implementation. **Know this cold.**

```cpp
#include <queue>

// MAX-HEAP (default)
priority_queue<int> maxPQ;
maxPQ.push(5);
maxPQ.push(1);
maxPQ.push(3);
maxPQ.top();    // 5 — largest, O(1)
maxPQ.pop();    // removes 5, O(log n)
maxPQ.size();
maxPQ.empty();

// MIN-HEAP — memorize this syntax
priority_queue<int, vector<int>, greater<int>> minPQ;
minPQ.push(5);
minPQ.push(1);
minPQ.top();    // 1 — smallest, O(1)
```

**The critical difference:**
```
Max-heap: priority_queue<int>                               ← default
Min-heap: priority_queue<int, vector<int>, greater<int>>    ← must specify
```

### Custom Comparator for Priority Queue

```cpp
// Min-heap on pairs by first element (same as default pair comparison, but min)
priority_queue<pair<int,int>, vector<pair<int,int>>, greater<pair<int,int>>> pq;

// Custom: min-heap on second element of pair
auto cmp = [](pair<int,int>& a, pair<int,int>& b) {
    return a.second > b.second;  // NOTE: > gives min-heap behavior
};
priority_queue<pair<int,int>, vector<pair<int,int>>, decltype(cmp)> pq(cmp);
```

**Why `>` in comparator gives min-heap?** In `priority_queue`, the comparator defines "lower priority". If `cmp(a, b)` returns true, `a` has lower priority (gets popped later, so `b` comes out first). Using `a > b` means larger elements have lower priority → smaller elements come out first = min-heap.

**Trap:** `priority_queue` has NO `decrease-key`. In Dijkstra, you push duplicate (distance, node) pairs. Use a visited/processed array to skip stale entries.

### When to use what

| Problem | Heap Type | Reason |
|---------|-----------|--------|
| Kth largest | Min-heap of size k | Keep k largest, top is kth largest |
| Kth smallest | Max-heap of size k | Keep k smallest, top is kth smallest |
| Dijkstra | Min-heap on distance | Always process closest unvisited node |
| Merge K sorted | Min-heap | Always pick globally minimum next element |
| Running median | Two heaps | Max-heap for lower half, min-heap for upper half |

---

## 8. K-th Largest / Smallest (Top-K Problems)

### Kth Largest Element

**Pattern:** Maintain a **min-heap of size k**. The top of the heap is always the kth largest.

**Why min-heap for kth LARGEST?** You want to keep the k largest elements. When a new element comes in larger than the current kth largest (= heap top), pop the top and push the new one. The smallest of the top-k is always at the top of the min-heap.

```cpp
int findKthLargest(vector<int>& nums, int k) {
    priority_queue<int, vector<int>, greater<int>> minPQ;  // min-heap

    for (int x : nums) {
        minPQ.push(x);
        if ((int)minPQ.size() > k)
            minPQ.pop();  // remove smallest — it's not in top-k
    }

    return minPQ.top();  // kth largest
}
// Time: O(n log k)   Space: O(k)
```

**Contrast — O(n log n) approach:** Sort descending, return index k-1. Works but wastes time when k << n.

**Contrast — QuickSelect:** O(n) average, O(n²) worst. Not worth the complexity in interviews unless specifically asked.

### Top K Frequent Elements

```cpp
vector<int> topKFrequent(vector<int>& nums, int k) {
    unordered_map<int,int> freq;
    for (int x : nums) freq[x]++;

    // min-heap on frequency
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> minPQ;

    for (auto& [val, cnt] : freq) {
        minPQ.push({cnt, val});
        if ((int)minPQ.size() > k) minPQ.pop();
    }

    vector<int> result;
    while (!minPQ.empty()) {
        result.push_back(minPQ.top().second);
        minPQ.pop();
    }
    return result;
}
// Time: O(n log k)   Space: O(n)
```

**Follow-up interviewers love:** "Can you do O(n)?" → Bucket sort: create buckets[i] = list of elements with frequency i. Since frequency ≤ n, create n+1 buckets. Iterate from n down to 1, collect elements.

### Kth Smallest in a stream / array

**Pattern:** Maintain a **max-heap of size k**. The top is the kth smallest.

```cpp
// For kth smallest: max-heap of size k
priority_queue<int> maxPQ;  // max-heap
for (int x : nums) {
    maxPQ.push(x);
    if ((int)maxPQ.size() > k) maxPQ.pop();
}
return maxPQ.top();  // kth smallest
```

**Memory trick:**
- Kth largest → keep top-k → need to evict when too big → min-heap (evict smallest)
- Kth smallest → keep bottom-k → need to evict when too large → max-heap (evict largest)

---

## 9. Median in a Stream — Two Heaps

This is the most complex heap pattern. Interviewers test this specifically.

**Problem:** Given a stream of numbers, find the median after each insertion.

**Key insight:** Maintain two heaps that together hold all numbers:
- **Max-heap (lower half):** contains the smaller half of all numbers. Top = max of lower half.
- **Min-heap (upper half):** contains the larger half of all numbers. Top = min of upper half.

**Invariant:** `maxHeap.size() == minHeap.size()` OR `maxHeap.size() == minHeap.size() + 1` (max-heap has one extra when total count is odd).

**Median:**
- If sizes equal: `(maxHeap.top() + minHeap.top()) / 2.0`
- If max-heap is larger: `maxHeap.top()`

```cpp
class MedianFinder {
    priority_queue<int> maxH;                               // lower half, max-heap
    priority_queue<int, vector<int>, greater<int>> minH;    // upper half, min-heap

public:
    void addNum(int num) {
        // Step 1: Push to max-heap (lower half)
        maxH.push(num);

        // Step 2: Balance — max of lower half must be <= min of upper half
        if (!minH.empty() && maxH.top() > minH.top()) {
            minH.push(maxH.top());
            maxH.pop();
        }

        // Step 3: Balance sizes — max-heap can have at most 1 extra
        if (maxH.size() > minH.size() + 1) {
            minH.push(maxH.top());
            maxH.pop();
        } else if (minH.size() > maxH.size()) {
            maxH.push(minH.top());
            minH.pop();
        }
    }

    double findMedian() {
        if (maxH.size() == minH.size())
            return (maxH.top() + minH.top()) / 2.0;
        return maxH.top();
    }
};
// addNum: O(log n)   findMedian: O(1)
```

**Why push to max-heap first?** This ensures the new number goes to the right partition. Then we fix any violation of the ordering invariant, then fix sizes.

**Things that fade:** The ORDER of the three steps. Push to max-heap → fix order between heaps → fix sizes. Doing size-balancing before order-balancing is wrong.

**Trace with [1, 2, 3]:**
```
Add 1: maxH=[1], minH=[]       → median = 1
Add 2: push 2 to maxH → [2,1]; 2>empty → push 2 to minH → maxH=[1], minH=[2]
       sizes equal → median = (1+2)/2 = 1.5
Add 3: push 3 to maxH → [3,1]; 3>2 → push 3 to minH, pop from maxH
       maxH=[1], minH=[2,3]; sizes: 1 < 2 → push 2 to maxH, pop from minH
       maxH=[2,1], minH=[3] → median = 2
```

---

## 10. Merge K Sorted Lists/Arrays

**Pattern:** Use a min-heap. Push the first element of each list. Always extract the minimum, then push the next element from that list.

```cpp
// Merge K sorted linked lists
struct ListNode { int val; ListNode* next; };

ListNode* mergeKLists(vector<ListNode*>& lists) {
    // min-heap: (value, node_pointer)
    auto cmp = [](ListNode* a, ListNode* b) { return a->val > b->val; };
    priority_queue<ListNode*, vector<ListNode*>, decltype(cmp)> pq(cmp);

    for (auto head : lists)
        if (head) pq.push(head);

    ListNode dummy(0);
    ListNode* curr = &dummy;

    while (!pq.empty()) {
        ListNode* node = pq.top(); pq.pop();
        curr->next = node;
        curr = curr->next;
        if (node->next) pq.push(node->next);
    }
    return dummy.next;
}
// Time: O(N log k) where N = total elements, k = number of lists
// Space: O(k) for the heap
```

**For K sorted arrays:**

```cpp
vector<int> mergeKArrays(vector<vector<int>>& arrays) {
    // (value, array_idx, element_idx)
    priority_queue<tuple<int,int,int>, vector<tuple<int,int,int>>, greater<>> pq;

    for (int i = 0; i < arrays.size(); i++)
        if (!arrays[i].empty())
            pq.push({arrays[i][0], i, 0});

    vector<int> result;
    while (!pq.empty()) {
        auto [val, i, j] = pq.top(); pq.pop();
        result.push_back(val);
        if (j + 1 < arrays[i].size())
            pq.push({arrays[i][j+1], i, j+1});
    }
    return result;
}
```

**Why this works:** The heap always contains exactly one "candidate" from each list — the current smallest unprocessed element. Extracting the global minimum and replacing it with the next from the same list guarantees correctness.

### Min Cost of Ropes

Always combine the two smallest ropes first (greedy). Use a min-heap.

```cpp
long long minCostRopes(vector<int>& arr) {
    priority_queue<long long, vector<long long>, greater<long long>> pq;
    for (int x : arr) pq.push(x);

    long long cost = 0;
    while (pq.size() > 1) {
        long long a = pq.top(); pq.pop();
        long long b = pq.top(); pq.pop();
        cost += a + b;
        pq.push(a + b);
    }
    return cost;
}
// Time: O(n log n)
```

This is essentially Huffman coding — always merge the two smallest to minimize total cost.

### Re-Organise String (Rearrange Characters)

Task-scheduler / "place characters so no two adjacent are the same".

```cpp
string reorganizeString(string s) {
    unordered_map<char, int> freq;
    for (char c : s) freq[c]++;

    priority_queue<pair<int,char>> maxPQ;
    for (auto& [c, cnt] : freq) maxPQ.push({cnt, c});

    string result;
    while (maxPQ.size() >= 2) {
        auto [c1, ch1] = maxPQ.top(); maxPQ.pop();
        auto [c2, ch2] = maxPQ.top(); maxPQ.pop();
        result += ch1;
        result += ch2;
        if (c1 - 1 > 0) maxPQ.push({c1 - 1, ch1});
        if (c2 - 1 > 0) maxPQ.push({c2 - 1, ch2});
    }
    if (!maxPQ.empty()) {
        if (maxPQ.top().first > 1) return "";  // impossible
        result += maxPQ.top().second;
    }
    return result;
}
```

---

## 11. Things Most People Forget

### 1. Min-heap syntax — muscle memory required

```cpp
// WRONG — this is max-heap
priority_queue<int> pq;

// CORRECT — min-heap
priority_queue<int, vector<int>, greater<int>> pq;
```

### 2. Custom comparator direction in priority_queue vs sort

```cpp
// sort:  return a < b → ascending (a comes before b)
// sort:  return a > b → descending

// priority_queue: return a > b → MIN-heap (a has lower priority, comes out last)
// priority_queue: return a < b → MAX-heap (default behavior)
```

The reversal trips everyone. In `sort`, `<` means ascending. In `priority_queue`, `>` also means ascending order of extraction (min comes out first) — SAME direction, different operator meaning.

### 3. Build heap is O(n), not O(n log n)

Insert n elements one by one = O(n log n). Call `buildHeap` = O(n). Always prefer `buildHeap` when you have all elements upfront.

### 4. Heap sort is in-place but not stable

Heap sort doesn't preserve relative order of equal elements. This matters for some problems.

### 5. Two-heap median — push to max-heap FIRST

Don't push directly to the appropriate half based on value comparison. Always push to max-heap first, then rebalance. This keeps the invariant logic clean.

### 6. Size comparison requires cast

```cpp
if (pq.size() > k)    // size() returns size_t (unsigned)
// If k is int and negative, this comparison is always true
// Safe pattern:
if ((int)pq.size() > k)
```

### 7. After popping from priority_queue, the internal heap is rearranged

You cannot iterate over a `priority_queue`. If you need both iteration AND priority access, use a `multiset` instead.

### 8. Heap sort uses max-heap for ascending order — counterintuitive

Max-heap sorts ascending because you repeatedly extract the max and put it at the end. Min-heap would sort descending.

### 9. Heapify assumes subtrees are already heaps

`heapify(arr, n, i)` only works if the subtrees rooted at `2i` and `2i+1` are already valid heaps. This is why `buildHeap` goes from `n/2` DOWN to 1 — bottom-up ensures this precondition.

### 10. The merge-K pattern requires tracking (value, source_index)

You can't just push values — you need to know which list/array to pull the next element from.

---

## 13. Final Revision Sheet

### Core Templates

```cpp
// 1. Max-heap
priority_queue<int> maxPQ;

// 2. Min-heap
priority_queue<int, vector<int>, greater<int>> minPQ;

// 3. Min-heap of pairs (sorted by first element)
priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;

// 4. Kth largest
priority_queue<int, vector<int>, greater<int>> pq;
for (int x : nums) { pq.push(x); if ((int)pq.size() > k) pq.pop(); }
return pq.top();

// 5. Kth smallest
priority_queue<int> pq;  // max-heap
for (int x : nums) { pq.push(x); if ((int)pq.size() > k) pq.pop(); }
return pq.top();

// 6. Build heap from array (1-based, O(n))
for (int i = n/2; i >= 1; i--) heapify(arr, n, i);

// 7. Heapify (sift down, assumes subtrees are valid heaps)
void heapify(int arr[], int n, int i) {
    int largest = i, l = 2*i, r = 2*i+1;
    if (l <= n && arr[l] > arr[largest]) largest = l;
    if (r <= n && arr[r] > arr[largest]) largest = r;
    if (largest != i) { swap(arr[i], arr[largest]); heapify(arr, n, largest); }
}

// 8. Two-heap running median
priority_queue<int> maxH;
priority_queue<int, vector<int>, greater<int>> minH;
// addNum: push to maxH → fix order → fix sizes
// findMedian: sizes equal? avg of tops : maxH.top()
```

### Complexity Table

| Operation | Time | Notes |
|-----------|------|-------|
| Insert (sift-up) | O(log n) | Push to end, compare with parent |
| Delete root (sift-down) | O(log n) | Replace with last, push down |
| Get max/min | O(1) | Just peek at root |
| Build heap | O(n) | Not O(n log n)! |
| Heap sort | O(n log n) | O(1) space, not cache-friendly |
| Top-K with heap | O(n log k) | Better than O(n log n) sort |
| Merge K lists | O(N log k) | N=total elements, k=lists |

### Interview Checklist

- [ ] Can I write min-heap syntax from memory without looking it up?
- [ ] Can I explain why buildHeap is O(n)?
- [ ] Do I know which heap type (min/max) to use for kth largest vs kth smallest?
- [ ] Can I implement the two-heap running median with the steps in correct order?
- [ ] Do I know the merge-K pattern (store source index in heap, not just value)?
- [ ] Can I write heapify (sift-down) from scratch?
- [ ] Do I know why heap sort uses max-heap for ascending order?
- [ ] Can I cast `pq.size()` to int before comparing with a signed int?

### Most Important Observations

1. Heap gives **O(1) access to max/min** and **O(log n) insertion/deletion** — this trade-off is why it beats sorted arrays for streaming problems.
2. **Min-heap for top-K largest, max-heap for top-K smallest** — the heap holds the K candidates, the top is the weakest candidate (first to be evicted).
3. **buildHeap is O(n)** because most sift-down operations are short (most nodes are near the leaves).
4. **Two heaps for median** — max-heap lower half, min-heap upper half. Max-heap can have at most one extra.
5. **Merge-K pattern** — always push `{value, source_info}`. The source_info tells you which list/array to advance.
6. **Heap sort = in-place O(n log n)** but has poor cache performance. In practice, quicksort or introsort is faster.

---

*Chapter 11 — Heaps | Part of DSA Interview Prep series*  
*Based on Striver's A2Z Sheet + Love Babbar lecture series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] Implement Min Heap — https://www.geeksforgeeks.org/problems/operations-on-binary-min-heap/1
- [ ] Check if an array represents a min heap — https://www.geeksforgeeks.org/problems/does-array-represent-heap4345/1
- [ ] Convert Min Heap to Max Heap — https://www.geeksforgeeks.org/problems/convert-min-heap-to-max-heap-1612571105/1
- [ ] K-th Largest element in an array — https://leetcode.com/problems/kth-largest-element-in-an-array/
- [ ] Kth Smallest element in an array — https://www.geeksforgeeks.org/problems/kth-smallest-element5635/1
- [ ] Sort K sorted array — https://www.geeksforgeeks.org/problems/nearly-sorted-1587115620/1
- [ ] Merge K sorted Lists — https://leetcode.com/problems/merge-k-sorted-lists/
- [ ] Replace Elements by Their Rank — https://www.geeksforgeeks.org/problems/replace-elements-by-their-rank-in-an-array/1
- [ ] Task Scheduler — https://leetcode.com/problems/task-scheduler/
- [ ] Hand of Straights — https://leetcode.com/problems/hand-of-straights/
- [ ] Design Twitter — https://leetcode.com/problems/design-twitter/
- [ ] Minimum Cost to Connect Sticks — https://leetcode.com/problems/minimum-cost-to-connect-sticks/
- [ ] Kth largest element in a stream — https://leetcode.com/problems/kth-largest-element-in-a-stream/
- [ ] Maximum Sum Combination — https://www.geeksforgeeks.org/problems/maximum-sum-combination/1
- [ ] Find Median from Data Stream — https://leetcode.com/problems/find-median-from-data-stream/
- [ ] Top K Frequent Elements — https://leetcode.com/problems/top-k-frequent-elements/
- [ ] Merge 2 Heaps — https://www.geeksforgeeks.org/problems/merge-two-binary-max-heap0144/1
- [ ] Is Tree a Heap — https://www.geeksforgeeks.org/problems/is-binary-tree-heap/1
- [ ] Min Cost of N ropes — https://www.geeksforgeeks.org/problems/minimum-cost-of-ropes-1587115620/1
- [ ] Median in a Stream — https://www.geeksforgeeks.org/problems/find-median-in-a-stream-1587115620/1
- [ ] Smallest Range Covering Elements from K Lists — https://leetcode.com/problems/smallest-range-covering-elements-from-k-lists/
- [ ] Reorganize String — https://leetcode.com/problems/reorganize-string/
- [ ] Kth Largest Sum Subarray — https://www.geeksforgeeks.org/problems/k-th-largest-sum-contiguous-subarray/1
- [ ] Merge K sorted Arrays — https://www.geeksforgeeks.org/problems/merge-k-sorted-arrays4305/1

