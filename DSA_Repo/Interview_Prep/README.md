# DSA Interview Prep — Revision Guide

> **Goal:** Structured topic-by-topic revision after a gap. Each topic has concept notes, links to existing code, and warm-up problems.
> **Strategy:** You've solved 1500+ LC problems. This is about warming up fast, not relearning. Aim for 1–2 days per topic.

---

## Primary Resources

### Striver's A2Z DSA Sheet *(Primary Focus)*

> **[takeuforward.org — Striver's A2Z Sheet](https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z)**
> 474 problems structured from basics to advanced. The entire revision plan below is aligned to this sheet.
> Topics: Basics → Sorting → Arrays → Binary Search → Strings → Linked List → Recursion → Bit Manipulation → Stack & Queue → Sliding Window → Heaps → Greedy → Binary Trees → BST → Graphs → DP → Tries → Strings (Advanced)

| Difficulty | Count |
|------------|-------|
| Easy | 152 |
| Medium | 186 |
| Hard | 136 |
| **Total** | **474** |

---

### Personal Question Bank *(Topic-wise)*

> **[`DSA_Codes/Questions_Of_Lectures/Question.txt`](../DSA_Codes/Questions_Of_Lectures/Question.txt)**
> Your own curated question list collected topic-by-topic during lecture series (Love Babbar + Striver combined). Use this alongside the A2Z sheet for extra coverage.

| Topic | Source |
|-------|--------|
| 1D Array | FindUnique, PairSum, TripletSum, Sort 0s/1s/2s, Duplicates |
| Binary Search | First/Last Occurrence, Peak Element, Book Allocation, Aggressive Cows |
| Strings | Palindrome, Reverse Words, Permutation, Compression |
| 2D Matrix | Wave Print, Spiral, Rotate 90°, Search in 2D Matrix |
| Recursion | Fibonacci, Climb Stairs, Subsets, Phone Keypad, Rat in Maze |
| Linked List | Reverse, Middle, K-Group Reverse, Floyd's Cycle, Flatten, Clone |
| Stack & Queue | Valid Parentheses, Celebrity Problem, Monotonic Stack, Histogram |
| Binary Tree + BST | All traversals, LCA, Morris, Validate BST, Kth Smallest |
| Heap | Kth Smallest, Median in Stream, Merge K Sorted, Reorganise String |
| Graph | Islands, Rotten Oranges, Word Ladder, Course Schedule, Dijkstra |
| Sliding Window | Max Sum K-window, Longest Substring, Min Window Substring |
| Segment Tree | Range queries — [Google Doc notes](https://docs.google.com/document/d/1sndIZ6lwH6jXT0SqXmNZYLPjbeRK6dGvBfybLWeItbc/edit#heading=h.eyhi824bfdgg) |

---

## Progress Tracker

| # | Topic | Status | Est. Time |
|---|-------|--------|-----------|
| 01 | [C++ Basics & STL](#01-c-basics--stl) | ⬜ Not Started | 0.5 day |
| 02 | [Sorting Algorithms](#02-sorting-algorithms) | ⬜ Not Started | 0.5 day |
| 03 | [Arrays](#03-arrays) | ⬜ Not Started | 1 day |
| 04 | [Binary Search](#04-binary-search) | ⬜ Not Started | 1 day |
| 05 | [Strings](#05-strings) | ⬜ Not Started | 1 day |
| 06 | [Linked List](#06-linked-list) | ⬜ Not Started | 1 day |
| 07 | [Recursion & Backtracking](#07-recursion--backtracking) | ⬜ Not Started | 1 day |
| 08 | [Bit Manipulation](#08-bit-manipulation) | ⬜ Not Started | 0.5 day |
| 09 | [Stack & Queue](#09-stack--queue) | ⬜ Not Started | 1 day |
| 10 | [Sliding Window & Two Pointer](#10-sliding-window--two-pointer) | ⬜ Not Started | 1 day |
| 11 | [Heaps](#11-heaps) | ⬜ Not Started | 1 day |
| 12 | [Greedy](#12-greedy) | ⬜ Not Started | 0.5 day |
| 13 | [Binary Trees](#13-binary-trees) | ⬜ Not Started | 1.5 days |
| 14 | [Binary Search Trees](#14-binary-search-trees) | ⬜ Not Started | 1 day |
| 15 | [Graphs](#15-graphs) | ⬜ Not Started | 2 days |
| 16 | [Dynamic Programming](#16-dynamic-programming) | ⬜ Not Started | 2 days |
| 17 | [Tries](#17-tries) | ⬜ Not Started | 0.5 day |
| 18 | [Segment Tree & Advanced](#18-segment-tree--advanced) | ⬜ Not Started | 1 day |
| 19 | [Maths for DSA](#19-maths-for-dsa) | ⬜ Not Started | 1 day |

> Update status to: ⬜ Not Started → 🔄 In Progress → ✅ Done

---

## 01. C++ Basics & STL

**Your Code:** [`DSA_Codes/Basic_Patterns_Loops/`](../DSA_Codes/Basic_Patterns_Loops/) · [`DSA_Codes/Pointer/`](../DSA_Codes/Pointer/) · [`DSA_Codes/dynamicAllocation/`](../DSA_Codes/dynamicAllocation/) · [`DSA_Codes/STL/`](../DSA_Codes/STL/) · [`DSA_Codes/Functions/`](../DSA_Codes/Functions/) · [`DSA_Codes/HahMap/`](../DSA_Codes/HahMap/)

**Key things to revise:**
- Pass by value vs pass by reference vs pointer
- `vector`, `map`, `unordered_map`, `set`, `multiset`, `priority_queue` — all operations + time complexities
- `lower_bound` / `upper_bound` on sorted containers
- Pair, sorting with custom comparator
- `auto`, range-based for loop, lambda functions

**Things that fade:** Custom comparator syntax for `sort()` and `priority_queue`

```cpp
// Min-heap using priority_queue
priority_queue<int, vector<int>, greater<int>> minHeap;

// Custom sort
sort(v.begin(), v.end(), [](auto& a, auto& b){ return a.second < b.second; });

// lower_bound usage
auto it = lower_bound(v.begin(), v.end(), target);
```

**Warm-up Problems:**
- [Sort Array by Frequency](https://leetcode.com/problems/sort-array-by-increasing-frequency/)
- [Top K Frequent Elements](https://leetcode.com/problems/top-k-frequent-elements/)
- [Find All Anagrams](https://leetcode.com/problems/find-all-anagrams-in-a-string/)

---

## 02. Sorting Algorithms

**Your Code:** [`DSA_Codes/SortingAlgo/`](../DSA_Codes/SortingAlgo/) · [`DSA_Codes/Recursion/mergeSort.cpp`](../DSA_Codes/Recursion/mergeSort.cpp) · [`DSA_Codes/Recursion/quickSort.cpp`](../DSA_Codes/Recursion/quickSort.cpp)

**Key things to revise:**
- Merge Sort — divide, conquer, merge (stable, O(n log n), O(n) space)
- Quick Sort — partition logic, pivot selection (in-place, O(n log n) avg, O(n²) worst)
- When to use which: merge sort for linked lists / counting inversions; quick sort for arrays

**Things that fade:** The exact partition logic in Quick Sort (Lomuto vs Hoare)

**Warm-up Problems:**
- [Sort Colors (Dutch National Flag)](https://leetcode.com/problems/sort-colors/)
- [Merge Intervals](https://leetcode.com/problems/merge-intervals/)
- [Count Inversions](https://practice.geeksforgeeks.org/problems/inversion-of-array-1587115620/1)

---

## 03. Arrays

**Your Code:** [`DSA_Codes/1DArray/`](../DSA_Codes/1DArray/) · [`DSA_Codes/2dArray/`](../DSA_Codes/2dArray/) · [`DSA_Codes/Questions_Of_Lectures/`](../DSA_Codes/Questions_Of_Lectures/)

**Key things to revise:**
- Prefix sum, difference array
- Kadane's algorithm (max subarray sum)
- Two pointer techniques
- Dutch National Flag (3-way partition)
- Spiral matrix, rotation

**Things that fade:** Difference array for range-update queries; in-place rotation trick

**Warm-up Problems:**
- [Maximum Subarray (Kadane's)](https://leetcode.com/problems/maximum-subarray/)
- [Rotate Image](https://leetcode.com/problems/rotate-image/)
- [Spiral Matrix](https://leetcode.com/problems/spiral-matrix/)
- [Find Duplicate Number](https://leetcode.com/problems/find-the-duplicate-number/)
- [Trapping Rain Water](https://leetcode.com/problems/trapping-rain-water/)

---

## 04. Binary Search

**Your Code:** [`DSA_Codes/BinarySearch/BinarySearch.cpp`](../DSA_Codes/BinarySearch/BinarySearch.cpp) · [`DSA_Codes/Recursion/binarySearch.cpp`](../DSA_Codes/Recursion/binarySearch.cpp)

**Key things to revise:**
- Standard template — `lo`, `hi`, `mid`, boundary conditions
- Binary search on answer (search space problems)
- Finding first/last occurrence
- Peak element, rotated sorted array

**Things that fade:** Search space problems — how to define `lo`, `hi`, and the feasibility check function

```cpp
// Binary search on answer template
int lo = minPossible, hi = maxPossible;
while (lo < hi) {
    int mid = lo + (hi - lo) / 2;
    if (feasible(mid)) hi = mid;
    else lo = mid + 1;
}
```

**Warm-up Problems:**
- [Search in Rotated Sorted Array](https://leetcode.com/problems/search-in-rotated-sorted-array/)
- [Find First and Last Position](https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/)
- [Book Allocation / Painter's Partition](https://www.codingninjas.com/codestudio/problems/ayush-and-ninja-test_1097574)
- [Aggressive Cows](https://www.codingninjas.com/codestudio/problems/aggressive-cows_1082559)
- [Koko Eating Bananas](https://leetcode.com/problems/koko-eating-bananas/)

---

## 05. Strings

**Your Code:** [`DSA_Codes/charArrayAndString/intro.cpp`](../DSA_Codes/charArrayAndString/intro.cpp)

**Key things to revise:**
- `string` vs `char[]` operations
- Palindrome checks, anagram checks
- String hashing basics
- KMP / Z-algorithm (pattern matching) — often asked

**Things that fade:** KMP failure function construction

**Warm-up Problems:**
- [Valid Palindrome](https://leetcode.com/problems/valid-palindrome/)
- [Longest Palindromic Substring](https://leetcode.com/problems/longest-palindromic-substring/)
- [Permutation in String](https://leetcode.com/problems/permutation-in-string/)
- [Minimum Window Substring](https://leetcode.com/problems/minimum-window-substring/)

---

## 06. Linked List

**Your Code:** [`DSA_Codes/Linked_List/singlyLinkedList.cpp`](../DSA_Codes/Linked_List/singlyLinkedList.cpp) · [`DSA_Codes/Linked_List/doublyLinkedList.cpp`](../DSA_Codes/Linked_List/doublyLinkedList.cpp) · [`DSA_Codes/Linked_List/circularLinkedList.cpp`](../DSA_Codes/Linked_List/circularLinkedList.cpp)

**Key things to revise:**
- Reversal (iterative + recursive)
- Floyd's cycle detection (fast/slow pointers)
- Finding middle node
- Merge two sorted lists
- Reverse in K groups

**Things that fade:** Reverse in K groups — the pointer bookkeeping; Clone with random pointer

**Warm-up Problems:**
- [Reverse Linked List](https://leetcode.com/problems/reverse-linked-list/)
- [Linked List Cycle II](https://leetcode.com/problems/linked-list-cycle-ii/)
- [Merge Two Sorted Lists](https://leetcode.com/problems/merge-two-sorted-lists/)
- [Reverse Nodes in k-Group](https://leetcode.com/problems/reverse-nodes-in-k-group/)
- [LRU Cache](https://leetcode.com/problems/lru-cache/)

---

## 07. Recursion & Backtracking

**Your Code:** [`DSA_Codes/Recursion/`](../DSA_Codes/Recursion/)

**Key things to revise:**
- Recursion tree thinking — trust the base case and recursive call
- Backtracking template: choose → recurse → unchoose
- Subsets, permutations, combinations
- N-Queens, Sudoku solver, Rat in a Maze

**Things that fade:** The exact "include/exclude" pattern for subsets with duplicates; when to pass by value vs by reference in backtracking

```cpp
// Backtracking template
void solve(int idx, vector<int>& current, vector<vector<int>>& result, ...) {
    // base case
    if (idx == n) { result.push_back(current); return; }
    // choose
    current.push_back(nums[idx]);
    solve(idx + 1, current, result, ...);
    // unchoose
    current.pop_back();
    solve(idx + 1, current, result, ...);
}
```

**Warm-up Problems:**
- [Subsets II (with duplicates)](https://leetcode.com/problems/subsets-ii/)
- [Permutations II](https://leetcode.com/problems/permutations-ii/)
- [Combination Sum](https://leetcode.com/problems/combination-sum/)
- [N-Queens](https://leetcode.com/problems/n-queens/)
- [Word Search](https://leetcode.com/problems/word-search/)

---

## 08. Bit Manipulation

**Your Code:** [`DSA_Codes/LuvMaths/Bits/`](../DSA_Codes/LuvMaths/Bits/) · [`DSA_Codes/Conversion/`](../DSA_Codes/Conversion/)

**Key things to revise:**
- Set / clear / toggle / check a bit
- XOR tricks (find single number, missing number)
- Count set bits (`__builtin_popcount`)
- Power of 2 check: `n & (n-1) == 0`
- Subset enumeration using bitmask

**Things that fade:** Bitmask DP setup; Brian Kernighan's algorithm for counting bits

```cpp
// Common bit tricks
bool isSet(int n, int i)    { return (n >> i) & 1; }
int  setBit(int n, int i)   { return n | (1 << i); }
int  clearBit(int n, int i) { return n & ~(1 << i); }
int  toggleBit(int n, int i){ return n ^ (1 << i); }
```

**Warm-up Problems:**
- [Single Number](https://leetcode.com/problems/single-number/)
- [Number of 1 Bits](https://leetcode.com/problems/number-of-1-bits/)
- [Counting Bits](https://leetcode.com/problems/counting-bits/)
- [Single Number III](https://leetcode.com/problems/single-number-iii/)

---

## 09. Stack & Queue

**Your Code:** [`DSA_Codes/StackAndQueue/`](../DSA_Codes/StackAndQueue/)

**Key things to revise:**
- Monotonic stack — Next Greater Element, histogram problems
- Sliding window maximum (deque)
- Valid parentheses, min-stack
- Queue using two stacks, stack using two queues

**Things that fade:** Monotonic stack direction — when to use increasing vs decreasing stack; the histogram max-rectangle approach

```cpp
// Monotonic stack — Next Greater Element
stack<int> st;
for (int i = n-1; i >= 0; i--) {
    while (!st.empty() && st.top() <= arr[i]) st.pop();
    nge[i] = st.empty() ? -1 : st.top();
    st.push(arr[i]);
}
```

**Warm-up Problems:**
- [Daily Temperatures (NGE)](https://leetcode.com/problems/daily-temperatures/)
- [Largest Rectangle in Histogram](https://leetcode.com/problems/largest-rectangle-in-histogram/)
- [Min Stack](https://leetcode.com/problems/min-stack/)
- [Sliding Window Maximum](https://leetcode.com/problems/sliding-window-maximum/)
- [Celebrity Problem](https://practice.geeksforgeeks.org/problems/the-celebrity-problem/1)

---

## 10. Sliding Window & Two Pointer

**Your Code:** Problem links in [`DSA_Codes/Questions_Of_Lectures/Question.txt`](../DSA_Codes/Questions_Of_Lectures/Question.txt) (SlidingWindow section)

**Key things to revise:**
- Fixed window vs variable window
- Two pointer for sorted arrays (pair sum, 3-sum)
- Variable window template: expand right, shrink left when condition violated

```cpp
// Variable window template
int l = 0, maxLen = 0;
unordered_map<char, int> freq;
for (int r = 0; r < n; r++) {
    freq[s[r]]++;
    while (/* window invalid */) { freq[s[l]]--; l++; }
    maxLen = max(maxLen, r - l + 1);
}
```

**Warm-up Problems:**
- [Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/)
- [Minimum Window Substring](https://leetcode.com/problems/minimum-window-substring/)
- [3Sum](https://leetcode.com/problems/3sum/)
- [Container With Most Water](https://leetcode.com/problems/container-with-most-water/)

---

## 11. Heaps

**Your Code:** [`DSA_Codes/HeapLectureNotes/Heaps_Basics.cpp`](../DSA_Codes/HeapLectureNotes/Heaps_Basics.cpp) · [`DSA_Codes/HeapLectureNotes/Heap_Sort.cpp`](../DSA_Codes/HeapLectureNotes/Heap_Sort.cpp) · [`DSA_Codes/HeapLectureNotes/Heapify_and_BuildHeap.cpp`](../DSA_Codes/HeapLectureNotes/Heapify_and_BuildHeap.cpp)

**Key things to revise:**
- Max-heap vs min-heap (STL `priority_queue`)
- Heapify — O(n) build vs O(n log n) insert-one-by-one
- Heap sort
- K-th largest/smallest, top-K problems
- Median in a stream (two heaps)

**Things that fade:** Two-heap approach for running median; merge K sorted lists/arrays with heap

**Warm-up Problems:**
- [Kth Largest Element](https://leetcode.com/problems/kth-largest-element-in-an-array/)
- [Top K Frequent Elements](https://leetcode.com/problems/top-k-frequent-elements/)
- [Find Median from Data Stream](https://leetcode.com/problems/find-median-from-data-stream/)
- [Merge K Sorted Lists](https://leetcode.com/problems/merge-k-sorted-lists/)

---

## 12. Greedy

**Key things to revise:**
- Activity selection / interval scheduling
- Fractional knapsack
- Huffman coding idea
- Job sequencing

**Things that fade:** Proving greedy choice works — "why greedy and not DP here?"

**Warm-up Problems:**
- [Jump Game](https://leetcode.com/problems/jump-game/)
- [Jump Game II](https://leetcode.com/problems/jump-game-ii/)
- [Interval Scheduling (Non-overlapping Intervals)](https://leetcode.com/problems/non-overlapping-intervals/)
- [Gas Station](https://leetcode.com/problems/gas-station/)
- [Candy](https://leetcode.com/problems/candy/)

---

## 13. Binary Trees

**Your Code:** [`DSA_Codes/Tree/binaryTree.cpp`](../DSA_Codes/Tree/binaryTree.cpp) · [`DSA_Codes/Tree/Inorder_PreOrder_and_Postorder_Traversals.cpp`](../DSA_Codes/Tree/Inorder_PreOrder_and_Postorder_Traversals.cpp) · [`DSA_Codes/Tree/Iteratveways.cpp`](../DSA_Codes/Tree/Iteratveways.cpp) · [`DSA_Codes/Tree/binarylifting.cpp`](../DSA_Codes/Tree/binarylifting.cpp)

**Key things to revise:**
- All traversals — recursive + iterative (iterative post-order is tricky)
- Height, diameter, balanced check
- Level order, zigzag, boundary, vertical order
- LCA — both brute and binary lifting
- Morris traversal (O(1) space inorder)
- Serialize / deserialize
- Tree DP (max sum, rob houses on tree)

**Things that fade:** Iterative post-order; building tree from inorder + preorder; Morris traversal

**Warm-up Problems:**
- [Binary Tree Level Order](https://leetcode.com/problems/binary-tree-level-order-traversal/)
- [Diameter of Binary Tree](https://leetcode.com/problems/diameter-of-binary-tree/)
- [Lowest Common Ancestor](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/)
- [Binary Tree Maximum Path Sum](https://leetcode.com/problems/binary-tree-maximum-path-sum/)
- [Serialize and Deserialize Binary Tree](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/)

---

## 14. Binary Search Trees

**Your Code:** [`DSA_Codes/Tree/Creation_of_BST.cpp`](../DSA_Codes/Tree/Creation_of_BST.cpp) · [`DSA_Codes/Tree/Deletion_in_BST.cpp`](../DSA_Codes/Tree/Deletion_in_BST.cpp) · [`DSA_Codes/Tree/Searching_in_BST.cpp`](../DSA_Codes/Tree/Searching_in_BST.cpp) · [`DSA_Codes/Tree/Maximum_and_Minimum_in_BST.cpp`](../DSA_Codes/Tree/Maximum_and_Minimum_in_BST.cpp)

**Key things to revise:**
- BST property: inorder gives sorted sequence
- Deletion — three cases (leaf, one child, two children)
- Kth smallest/largest (inorder counter)
- Validate BST (range approach, not just left < root < right)
- BST to balanced BST

**Things that fade:** The range-based validation (passing `[min, max]` bounds down); inorder predecessor/successor logic

**Warm-up Problems:**
- [Validate Binary Search Tree](https://leetcode.com/problems/validate-binary-search-tree/)
- [Kth Smallest in BST](https://leetcode.com/problems/kth-smallest-element-in-a-bst/)
- [LCA of BST](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/)
- [Convert BST to Greater Tree](https://leetcode.com/problems/convert-bst-to-greater-tree/)

---

## 15. Graphs

**Your Code:** [`DSA_Codes/Graph/`](../DSA_Codes/Graph/) — BFS, DFS, Dijkstra, Bellman-Ford, Floyd-Warshall, Kruskal, Prim, Topo Sort, DSU, Bridges, Articulation Points, Kosaraju

**Key things to revise:**
- BFS / DFS templates (adjacency list)
- Topological sort — Kahn's (BFS) + DFS approach
- Dijkstra — priority queue version
- Bellman-Ford — when to use over Dijkstra (negative edges)
- DSU with path compression + union by rank/size
- Kruskal's MST (uses DSU), Prim's MST (uses priority queue)
- Bridges & Articulation Points (Tarjan's algorithm — low/disc arrays)
- Kosaraju's SCC (2 DFS passes)
- Multi-source BFS (Rotten Oranges, 01-Matrix)

**Things that fade:** Tarjan's low/disc logic; Kosaraju's 2-pass idea; DSU path compression code

**Warm-up Problems (from your list):**
- [Number of Islands](https://leetcode.com/problems/number-of-islands/)
- [Rotting Oranges](https://leetcode.com/problems/rotting-oranges/)
- [Course Schedule](https://leetcode.com/problems/course-schedule/)
- [Word Ladder](https://leetcode.com/problems/word-ladder/)
- [Network Delay Time](https://leetcode.com/problems/network-delay-time/)
- [Number of Provinces](https://leetcode.com/problems/number-of-provinces/)

---

## 16. Dynamic Programming

> DP = Recursion + Memoization. If you can write the recursion, the rest follows.

**Your Code:** [`DSA_Codes/DpSeries/`](../DSA_Codes/DpSeries/) · Foundation in [`DSA_Codes/Recursion/`](../DSA_Codes/Recursion/)

**Patterns to revise (Striver's A2Z DP — 55 problems):**

| Pattern | Key Problem |
|---------|-------------|
| 1D DP | Climbing Stairs, Frog Jump |
| Grid DP | Unique Paths, Min Path Sum |
| DP on Subsequences | 0/1 Knapsack, Subset Sum, Coin Change |
| DP on Strings | LCS, Edit Distance, Wildcard Matching |
| DP on Stocks | Buy & Sell Stock series (I to VI) |
| DP on LIS | LIS, Russian Doll Envelopes |
| DP on Partitions | Matrix Chain Multiplication, Burst Balloons |
| DP on Trees | Max sum independent set |

**Things that fade:** Tabulation direction (bottom-up fill order); space optimization from 2D → 1D dp array

**Warm-up Problems:**
- [Climbing Stairs](https://leetcode.com/problems/climbing-stairs/)
- [0/1 Knapsack](https://practice.geeksforgeeks.org/problems/0-1-knapsack-problem/0)
- [Longest Common Subsequence](https://leetcode.com/problems/longest-common-subsequence/)
- [Edit Distance](https://leetcode.com/problems/edit-distance/)
- [Best Time to Buy and Sell Stock III](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-iii/)
- [Longest Increasing Subsequence](https://leetcode.com/problems/longest-increasing-subsequence/)

---

## 17. Tries

**Your Code:** [`DSA_Codes/Trie/Into.cpp`](../DSA_Codes/Trie/Into.cpp)

**Key things to revise:**
- Trie insert / search / startsWith
- Count words with given prefix
- XOR maximum in array (XOR trie)

**Warm-up Problems:**
- [Implement Trie](https://leetcode.com/problems/implement-trie-prefix-tree/)
- [Word Search II](https://leetcode.com/problems/word-search-ii/)
- [Maximum XOR of Two Numbers](https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/)

---

## 18. Segment Tree & Advanced

**Your Code:** [`DSA_Codes/SegmentTree/`](../DSA_Codes/SegmentTree/) · [`DSA_Codes/Math/`](../DSA_Codes/Math/) · [`DSA_Codes/LuvMaths/NumberTheory/`](../DSA_Codes/LuvMaths/NumberTheory/)

**Key things to revise:**
- Segment tree — build, query, point update, range update with lazy propagation
- Number theory — GCD/LCM, Sieve of Eratosthenes, modular exponentiation, MMI
- Sparse table for range minimum queries

**Warm-up Problems:**
- [Range Sum Query (Segment Tree)](https://leetcode.com/problems/range-sum-query-mutable/)
- [Count of Smaller Numbers After Self](https://leetcode.com/problems/count-of-smaller-numbers-after-self/)

---

## 19. Maths for DSA

**Full chapter:** [19_Maths.md](19_Maths.md)

**Your Code:** [`DSA_Codes/Math/`](../DSA_Codes/Math/) · [`DSA_Codes/LuvMaths/NumberTheory/`](../DSA_Codes/LuvMaths/NumberTheory/)

**Key things to revise:**
- Primality check (O(√n)), Sieve of Eratosthenes (O(n log log n))
- Prime factorization (trial division + leftover factor check; SPF sieve for many queries)
- GCD (Euclidean) and LCM (`a / gcd(a,b) * b`)
- Fast modular exponentiation — O(log b)
- Modular inverse via Fermat's Little Theorem (requires prime modulus)
- nCr % MOD using precomputed factorial + inverse factorial arrays

**Things that fade:** Modular inverse derivation (why `b^(MOD-2)`); negative-mod normalization (`(a - b + MOD) % MOD`); leftover prime factor after trial division

**Warm-up Problems:**
- [Count Primes](https://leetcode.com/problems/count-primes/)
- [Pow(x, n)](https://leetcode.com/problems/powx-n/)
- [Pascal's Triangle](https://leetcode.com/problems/pascals-triangle/)
- [Super Pow](https://leetcode.com/problems/super-pow/)

---

## Quick Reference — Complexity Cheatsheet

| DS / Algorithm | Time | Space |
|----------------|------|-------|
| Binary Search | O(log n) | O(1) |
| Merge Sort | O(n log n) | O(n) |
| Quick Sort | O(n log n) avg | O(log n) |
| BFS / DFS | O(V + E) | O(V) |
| Dijkstra (PQ) | O(E log V) | O(V) |
| Kruskal's MST | O(E log E) | O(V) |
| Heap insert/delete | O(log n) | — |
| Build Heap | O(n) | — |
| Trie insert/search | O(L) | O(ALPHABET × N × L) |
| Segment Tree build | O(n) | O(4n) |
| Segment Tree query | O(log n) | — |

---

*Created: May 2026 | Based on Striver's A2Z DSA Sheet*
