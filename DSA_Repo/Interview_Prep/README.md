# DSA Interview Prep — Revision Guide

> **Goal:** Structured topic-by-topic revision after a gap. Each topic has concept notes, links to existing code, and warm-up problems.
> **Strategy:** Your public profile showed 838 distinct LC problems solved and 1,565 accepted submissions on 18 November 2026. Revise 10 selected questions per topic instead of restarting every question.

## How to use this revision guide

**Each of the 19 topic files has exactly 10 required questions, also listed under that topic below: 190 questions in total.** Follow their order; once those 10 are done, move on rather than completing an entire sheet.

At **1 hour/day**, spend about 10 minutes recalling earlier mistakes, 40 minutes attempting today's question, and 10 minutes testing and recording what went wrong. Two short questions may fit in an hour; a hard question can take two sessions. After the first five questions in a topic, use a session to revisit mistakes, then complete the next five. Do not force a ten-question topic into one day.

Use the notes only when recall fails. Keep the chapter checklist as the source of truth for completion; the README repeats the same selection for navigation. Segments/advanced range-query questions can wait until the interview-first topics are revised.

**[Extra Practice - mixed question bank](EXTRA_PRACTICE.md)** contains the remaining questions and your 241 previously accepted Codeforces problems, without topic groupings, tags, or approach hints. Pick from it whenever you want an extra or blind practice problem; it is not additional daily homework. The LC solved history is not fully public, so an extra question is not necessarily new to you.

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

| # | Topic file | Required | Status |
|---|---|---|---|
| 01 | [C++ Basics & STL](01_Cpp_STL.md#practice-problems) | 10 | ⬜ Not Started |
| 02 | [Sorting Algorithms](02_Sorting.md#practice-problems) | 10 | ⬜ Not Started |
| 03 | [Arrays](03_Arrays.md#practice-problems) | 10 | ⬜ Not Started |
| 04 | [Binary Search](04_BinarySearch.md#practice-problems) | 10 | ⬜ Not Started |
| 05 | [Strings](05_Strings.md#practice-problems) | 10 | ⬜ Not Started |
| 06 | [Linked List](06_LinkedList.md#practice-problems) | 10 | ⬜ Not Started |
| 07 | [Recursion & Backtracking](07_Recursion_Backtracking.md#practice-problems) | 10 | ⬜ Not Started |
| 08 | [Bit Manipulation](08_BitManipulation.md#practice-problems) | 10 | ⬜ Not Started |
| 09 | [Stack & Queue](09_Stack_Queue.md#practice-problems) | 10 | ⬜ Not Started |
| 10 | [Sliding Window & Two Pointer](10_SlidingWindow_TwoPointer.md#practice-problems) | 10 | ⬜ Not Started |
| 11 | [Heaps](11_Heaps.md#practice-problems) | 10 | ⬜ Not Started |
| 12 | [Greedy](12_Greedy.md#practice-problems) | 10 | ⬜ Not Started |
| 13 | [Binary Trees](13_BinaryTrees.md#practice-problems) | 10 | ⬜ Not Started |
| 14 | [Binary Search Trees](14_BST.md#practice-problems) | 10 | ⬜ Not Started |
| 15 | [Graphs](15_Graphs.md#practice-problems) | 10 | ⬜ Not Started |
| 16 | [Dynamic Programming](16_DP.md#practice-problems) | 10 | ⬜ Not Started |
| 17 | [Tries](17_Tries.md#practice-problems) | 10 | ⬜ Not Started |
| 18 | [Segment Tree & Advanced](18_SegmentTree_Advanced.md#practice-problems) | 10 | ⬜ Not Started |
| 19 | [Maths for DSA](19_Maths.md#14-practice-problems) | 10 | ⬜ Not Started |

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

**Required: these 10 questions, in order.** [Open chapter checklist](01_Cpp_STL.md#practice-problems)

- [ ] [LC 7 - Reverse Integer](https://leetcode.com/problems/reverse-integer/)
- [ ] [LC 9 - Palindrome Number](https://leetcode.com/problems/palindrome-number/)
- [ ] [LC 125 - Valid Palindrome](https://leetcode.com/problems/valid-palindrome/)
- [ ] [LC 509 - Fibonacci Number](https://leetcode.com/problems/fibonacci-number/)
- [ ] [LC 1636 - Sort Array by Increasing Frequency](https://leetcode.com/problems/sort-array-by-increasing-frequency/)
- [ ] [LC 1207 - Unique Number of Occurrences](https://leetcode.com/problems/unique-number-of-occurrences/)
- [ ] [LC 1 - Two Sum](https://leetcode.com/problems/two-sum/)
- [ ] [LC 242 - Valid Anagram](https://leetcode.com/problems/valid-anagram/)
- [ ] [LC 349 - Intersection of Two Arrays](https://leetcode.com/problems/intersection-of-two-arrays/)
- [ ] [LC 49 - Group Anagrams](https://leetcode.com/problems/group-anagrams/)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

---

## 02. Sorting Algorithms

**Your Code:** [`DSA_Codes/SortingAlgo/`](../DSA_Codes/SortingAlgo/) · [`DSA_Codes/Recursion/mergeSort.cpp`](../DSA_Codes/Recursion/mergeSort.cpp) · [`DSA_Codes/Recursion/quickSort.cpp`](../DSA_Codes/Recursion/quickSort.cpp)

**Key things to revise:**
- Merge Sort — divide, conquer, merge (stable, O(n log n), O(n) space)
- Quick Sort — partition logic, pivot selection (in-place, O(n log n) avg, O(n²) worst)
- When to use which: merge sort for linked lists / counting inversions; quick sort for arrays

**Things that fade:** The exact partition logic in Quick Sort (Lomuto vs Hoare)

**Required: these 10 questions, in order.** [Open chapter checklist](02_Sorting.md#practice-problems)

- [ ] [LC 912 - Sort an Array](https://leetcode.com/problems/sort-an-array/)
- [ ] [LC 75 - Sort Colors](https://leetcode.com/problems/sort-colors/)
- [ ] [LC 88 - Merge Sorted Array](https://leetcode.com/problems/merge-sorted-array/)
- [ ] [LC 1122 - Relative Sort Array](https://leetcode.com/problems/relative-sort-array/)
- [ ] [LC 179 - Largest Number](https://leetcode.com/problems/largest-number/)
- [ ] [LC 56 - Merge Intervals](https://leetcode.com/problems/merge-intervals/)
- [ ] [LC 215 - Kth Largest Element in an Array](https://leetcode.com/problems/kth-largest-element-in-an-array/)
- [ ] [LC 493 - Reverse Pairs](https://leetcode.com/problems/reverse-pairs/)
- [ ] [LC 164 - Maximum Gap](https://leetcode.com/problems/maximum-gap/)
- [ ] [GFG - Count Inversions](https://www.geeksforgeeks.org/problems/inversion-of-array-1587115620/1)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

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

**Required: these 10 questions, in order.** [Open chapter checklist](03_Arrays.md#practice-problems)

- [ ] [LC 238 - Product of Array Except Self](https://leetcode.com/problems/product-of-array-except-self/)
- [ ] [LC 53 - Maximum Subarray](https://leetcode.com/problems/maximum-subarray/)
- [ ] [LC 121 - Best Time to Buy and Sell Stock](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/)
- [ ] [LC 560 - Subarray Sum Equals K](https://leetcode.com/problems/subarray-sum-equals-k/)
- [ ] [LC 128 - Longest Consecutive Sequence](https://leetcode.com/problems/longest-consecutive-sequence/)
- [ ] [LC 169 - Majority Element](https://leetcode.com/problems/majority-element/)
- [ ] [LC 189 - Rotate Array](https://leetcode.com/problems/rotate-array/)
- [ ] [LC 73 - Set Matrix Zeroes](https://leetcode.com/problems/set-matrix-zeroes/)
- [ ] [LC 48 - Rotate Image](https://leetcode.com/problems/rotate-image/)
- [ ] [LC 54 - Spiral Matrix](https://leetcode.com/problems/spiral-matrix/)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

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

**Required: these 10 questions, in order.** [Open chapter checklist](04_BinarySearch.md#practice-problems)

- [ ] [LC 704 - Binary Search](https://leetcode.com/problems/binary-search/)
- [ ] [LC 34 - Find First and Last Position of Element in Sorted Array](https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/)
- [ ] [LC 33 - Search in Rotated Sorted Array](https://leetcode.com/problems/search-in-rotated-sorted-array/)
- [ ] [LC 153 - Find Minimum in Rotated Sorted Array](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/)
- [ ] [LC 540 - Single Element in a Sorted Array](https://leetcode.com/problems/single-element-in-a-sorted-array/)
- [ ] [LC 162 - Find Peak Element](https://leetcode.com/problems/find-peak-element/)
- [ ] [LC 875 - Koko Eating Bananas](https://leetcode.com/problems/koko-eating-bananas/)
- [ ] [LC 1011 - Capacity To Ship Packages Within D Days](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/)
- [ ] [LC 410 - Split Array Largest Sum](https://leetcode.com/problems/split-array-largest-sum/)
- [ ] [LC 1552 - Magnetic Force Between Two Balls](https://leetcode.com/problems/magnetic-force-between-two-balls/)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

---

## 05. Strings

**Your Code:** [`DSA_Codes/charArrayAndString/intro.cpp`](../DSA_Codes/charArrayAndString/intro.cpp)

**Key things to revise:**
- `string` vs `char[]` operations
- Palindrome checks, anagram checks
- String hashing basics
- KMP / Z-algorithm (pattern matching) — often asked

**Things that fade:** KMP failure function construction

**Required: these 10 questions, in order.** [Open chapter checklist](05_Strings.md#practice-problems)

- [ ] [LC 151 - Reverse Words in a String](https://leetcode.com/problems/reverse-words-in-a-string/)
- [ ] [LC 14 - Longest Common Prefix](https://leetcode.com/problems/longest-common-prefix/)
- [ ] [LC 205 - Isomorphic Strings](https://leetcode.com/problems/isomorphic-strings/)
- [ ] [LC 796 - Rotate String](https://leetcode.com/problems/rotate-string/)
- [ ] [LC 451 - Sort Characters By Frequency](https://leetcode.com/problems/sort-characters-by-frequency/)
- [ ] [LC 8 - String to Integer (atoi)](https://leetcode.com/problems/string-to-integer-atoi/)
- [ ] [LC 5 - Longest Palindromic Substring](https://leetcode.com/problems/longest-palindromic-substring/)
- [ ] [LC 28 - Find the Index of the First Occurrence in a String](https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/)
- [ ] [LC 1910 - Remove All Occurrences of a Substring](https://leetcode.com/problems/remove-all-occurrences-of-a-substring/)
- [ ] [LC 443 - String Compression](https://leetcode.com/problems/string-compression/)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

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

**Required: these 10 questions, in order.** [Open chapter checklist](06_LinkedList.md#practice-problems)

- [ ] [LC 206 - Reverse Linked List](https://leetcode.com/problems/reverse-linked-list/)
- [ ] [LC 876 - Middle of the Linked List](https://leetcode.com/problems/middle-of-the-linked-list/)
- [ ] [LC 142 - Linked List Cycle II](https://leetcode.com/problems/linked-list-cycle-ii/)
- [ ] [LC 234 - Palindrome Linked List](https://leetcode.com/problems/palindrome-linked-list/)
- [ ] [LC 19 - Remove Nth Node From End of List](https://leetcode.com/problems/remove-nth-node-from-end-of-list/)
- [ ] [LC 21 - Merge Two Sorted Lists](https://leetcode.com/problems/merge-two-sorted-lists/)
- [ ] [LC 148 - Sort List](https://leetcode.com/problems/sort-list/)
- [ ] [LC 445 - Add Two Numbers II](https://leetcode.com/problems/add-two-numbers-ii/)
- [ ] [LC 25 - Reverse Nodes in k-Group](https://leetcode.com/problems/reverse-nodes-in-k-group/)
- [ ] [LC 138 - Copy List with Random Pointer](https://leetcode.com/problems/copy-list-with-random-pointer/)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

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

**Required: these 10 questions, in order.** [Open chapter checklist](07_Recursion_Backtracking.md#practice-problems)

- [ ] [LC 78 - Subsets](https://leetcode.com/problems/subsets/)
- [ ] [LC 90 - Subsets II](https://leetcode.com/problems/subsets-ii/)
- [ ] [LC 46 - Permutations](https://leetcode.com/problems/permutations/)
- [ ] [LC 47 - Permutations II](https://leetcode.com/problems/permutations-ii/)
- [ ] [LC 39 - Combination Sum](https://leetcode.com/problems/combination-sum/)
- [ ] [LC 40 - Combination Sum II](https://leetcode.com/problems/combination-sum-ii/)
- [ ] [LC 22 - Generate Parentheses](https://leetcode.com/problems/generate-parentheses/)
- [ ] [LC 131 - Palindrome Partitioning](https://leetcode.com/problems/palindrome-partitioning/)
- [ ] [LC 79 - Word Search](https://leetcode.com/problems/word-search/)
- [ ] [LC 51 - N-Queens](https://leetcode.com/problems/n-queens/)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

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

**Required: these 10 questions, in order.** [Open chapter checklist](08_BitManipulation.md#practice-problems)

- [ ] [LC 231 - Power of Two](https://leetcode.com/problems/power-of-two/)
- [ ] [LC 191 - Number of 1 Bits](https://leetcode.com/problems/number-of-1-bits/)
- [ ] [LC 338 - Counting Bits](https://leetcode.com/problems/counting-bits/)
- [ ] [LC 136 - Single Number](https://leetcode.com/problems/single-number/)
- [ ] [LC 137 - Single Number II](https://leetcode.com/problems/single-number-ii/)
- [ ] [LC 260 - Single Number III](https://leetcode.com/problems/single-number-iii/)
- [ ] [LC 2220 - Minimum Bit Flips to Convert Number](https://leetcode.com/problems/minimum-bit-flips-to-convert-number/)
- [ ] [LC 29 - Divide Two Integers](https://leetcode.com/problems/divide-two-integers/)
- [ ] [LC 201 - Bitwise AND of Numbers Range](https://leetcode.com/problems/bitwise-and-of-numbers-range/)
- [ ] [LC 268 - Missing Number](https://leetcode.com/problems/missing-number/)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

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

**Required: these 10 questions, in order.** [Open chapter checklist](09_Stack_Queue.md#practice-problems)

- [ ] [LC 225 - Implement Stack using Queues](https://leetcode.com/problems/implement-stack-using-queues/)
- [ ] [LC 232 - Implement Queue using Stacks](https://leetcode.com/problems/implement-queue-using-stacks/)
- [ ] [LC 20 - Valid Parentheses](https://leetcode.com/problems/valid-parentheses/)
- [ ] [LC 155 - Min Stack](https://leetcode.com/problems/min-stack/)
- [ ] [LC 496 - Next Greater Element I](https://leetcode.com/problems/next-greater-element-i/)
- [ ] [LC 503 - Next Greater Element II](https://leetcode.com/problems/next-greater-element-ii/)
- [ ] [LC 739 - Daily Temperatures](https://leetcode.com/problems/daily-temperatures/)
- [ ] [LC 907 - Sum of Subarray Minimums](https://leetcode.com/problems/sum-of-subarray-minimums/)
- [ ] [LC 84 - Largest Rectangle in Histogram](https://leetcode.com/problems/largest-rectangle-in-histogram/)
- [ ] [LC 85 - Maximal Rectangle](https://leetcode.com/problems/maximal-rectangle/)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

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

**Required: these 10 questions, in order.** [Open chapter checklist](10_SlidingWindow_TwoPointer.md#practice-problems)

- [ ] [LC 3 - Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/)
- [ ] [LC 1004 - Max Consecutive Ones III](https://leetcode.com/problems/max-consecutive-ones-iii/)
- [ ] [LC 904 - Fruit Into Baskets](https://leetcode.com/problems/fruit-into-baskets/)
- [ ] [LC 424 - Longest Repeating Character Replacement](https://leetcode.com/problems/longest-repeating-character-replacement/)
- [ ] [LC 930 - Binary Subarrays With Sum](https://leetcode.com/problems/binary-subarrays-with-sum/)
- [ ] [LC 1248 - Count Number of Nice Subarrays](https://leetcode.com/problems/count-number-of-nice-subarrays/)
- [ ] [LC 1358 - Number of Substrings Containing All Three Characters](https://leetcode.com/problems/number-of-substrings-containing-all-three-characters/)
- [ ] [LC 1423 - Maximum Points You Can Obtain from Cards](https://leetcode.com/problems/maximum-points-you-can-obtain-from-cards/)
- [ ] [LC 992 - Subarrays with K Different Integers](https://leetcode.com/problems/subarrays-with-k-different-integers/)
- [ ] [LC 76 - Minimum Window Substring](https://leetcode.com/problems/minimum-window-substring/)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

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

**Required: these 10 questions, in order.** [Open chapter checklist](11_Heaps.md#practice-problems)

- [ ] [LC 347 - Top K Frequent Elements](https://leetcode.com/problems/top-k-frequent-elements/)
- [ ] [LC 703 - Kth Largest Element in a Stream](https://leetcode.com/problems/kth-largest-element-in-a-stream/)
- [ ] [LC 23 - Merge k Sorted Lists](https://leetcode.com/problems/merge-k-sorted-lists/)
- [ ] [LC 295 - Find Median from Data Stream](https://leetcode.com/problems/find-median-from-data-stream/)
- [ ] [LC 621 - Task Scheduler](https://leetcode.com/problems/task-scheduler/)
- [ ] [LC 846 - Hand of Straights](https://leetcode.com/problems/hand-of-straights/)
- [ ] [LC 355 - Design Twitter](https://leetcode.com/problems/design-twitter/)
- [ ] [LC 632 - Smallest Range Covering Elements from K Lists](https://leetcode.com/problems/smallest-range-covering-elements-from-k-lists/)
- [ ] [LC 767 - Reorganize String](https://leetcode.com/problems/reorganize-string/)
- [ ] [LC 973 - K Closest Points to Origin](https://leetcode.com/problems/k-closest-points-to-origin/)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

---

## 12. Greedy

**Key things to revise:**
- Activity selection / interval scheduling
- Fractional knapsack
- Huffman coding idea
- Job sequencing

**Things that fade:** Proving greedy choice works — "why greedy and not DP here?"

**Required: these 10 questions, in order.** [Open chapter checklist](12_Greedy.md#practice-problems)

- [ ] [LC 455 - Assign Cookies](https://leetcode.com/problems/assign-cookies/)
- [ ] [LC 860 - Lemonade Change](https://leetcode.com/problems/lemonade-change/)
- [ ] [LC 678 - Valid Parenthesis String](https://leetcode.com/problems/valid-parenthesis-string/)
- [ ] [LC 55 - Jump Game](https://leetcode.com/problems/jump-game/)
- [ ] [LC 45 - Jump Game II](https://leetcode.com/problems/jump-game-ii/)
- [ ] [LC 135 - Candy](https://leetcode.com/problems/candy/)
- [ ] [LC 57 - Insert Interval](https://leetcode.com/problems/insert-interval/)
- [ ] [LC 435 - Non-overlapping Intervals](https://leetcode.com/problems/non-overlapping-intervals/)
- [ ] [LC 134 - Gas Station](https://leetcode.com/problems/gas-station/)
- [ ] [LC 763 - Partition Labels](https://leetcode.com/problems/partition-labels/)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

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

**Required: these 10 questions, in order.** [Open chapter checklist](13_BinaryTrees.md#practice-problems)

- [ ] [LC 144 - Binary Tree Preorder Traversal](https://leetcode.com/problems/binary-tree-preorder-traversal/)
- [ ] [LC 94 - Binary Tree Inorder Traversal](https://leetcode.com/problems/binary-tree-inorder-traversal/)
- [ ] [LC 145 - Binary Tree Postorder Traversal](https://leetcode.com/problems/binary-tree-postorder-traversal/)
- [ ] [LC 102 - Binary Tree Level Order Traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/)
- [ ] [LC 104 - Maximum Depth of Binary Tree](https://leetcode.com/problems/maximum-depth-of-binary-tree/)
- [ ] [LC 543 - Diameter of Binary Tree](https://leetcode.com/problems/diameter-of-binary-tree/)
- [ ] [LC 110 - Balanced Binary Tree](https://leetcode.com/problems/balanced-binary-tree/)
- [ ] [LC 236 - Lowest Common Ancestor of a Binary Tree](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/)
- [ ] [LC 105 - Construct Binary Tree from Preorder and Inorder Traversal](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/)
- [ ] [LC 124 - Binary Tree Maximum Path Sum](https://leetcode.com/problems/binary-tree-maximum-path-sum/)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

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

**Required: these 10 questions, in order.** [Open chapter checklist](14_BST.md#practice-problems)

- [ ] [LC 700 - Search in a Binary Search Tree](https://leetcode.com/problems/search-in-a-binary-search-tree/)
- [ ] [LC 701 - Insert into a Binary Search Tree](https://leetcode.com/problems/insert-into-a-binary-search-tree/)
- [ ] [LC 450 - Delete Node in a BST](https://leetcode.com/problems/delete-node-in-a-bst/)
- [ ] [LC 230 - Kth Smallest Element in a BST](https://leetcode.com/problems/kth-smallest-element-in-a-bst/)
- [ ] [LC 98 - Validate Binary Search Tree](https://leetcode.com/problems/validate-binary-search-tree/)
- [ ] [LC 235 - Lowest Common Ancestor of a Binary Search Tree](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/)
- [ ] [LC 1008 - Construct Binary Search Tree from Preorder Traversal](https://leetcode.com/problems/construct-binary-search-tree-from-preorder-traversal/)
- [ ] [LC 653 - Two Sum IV - Input is a BST](https://leetcode.com/problems/two-sum-iv-input-is-a-bst/)
- [ ] [LC 99 - Recover Binary Search Tree](https://leetcode.com/problems/recover-binary-search-tree/)
- [ ] [LC 1382 - Balance a Binary Search Tree](https://leetcode.com/problems/balance-a-binary-search-tree/)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

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

**Required: these 10 questions, in order.** [Open chapter checklist](15_Graphs.md#practice-problems)

- [ ] [LC 200 - Number of Islands](https://leetcode.com/problems/number-of-islands/)
- [ ] [LC 994 - Rotting Oranges](https://leetcode.com/problems/rotting-oranges/)
- [ ] [LC 542 - 01 Matrix](https://leetcode.com/problems/01-matrix/)
- [ ] [LC 785 - Is Graph Bipartite?](https://leetcode.com/problems/is-graph-bipartite/)
- [ ] [LC 207 - Course Schedule](https://leetcode.com/problems/course-schedule/)
- [ ] [LC 127 - Word Ladder](https://leetcode.com/problems/word-ladder/)
- [ ] [LC 743 - Network Delay Time](https://leetcode.com/problems/network-delay-time/)
- [ ] [LC 787 - Cheapest Flights Within K Stops](https://leetcode.com/problems/cheapest-flights-within-k-stops/)
- [ ] [LC 721 - Accounts Merge](https://leetcode.com/problems/accounts-merge/)
- [ ] [LC 1368 - Minimum Cost to Make at Least One Valid Path in a Grid](https://leetcode.com/problems/minimum-cost-to-make-at-least-one-valid-path-in-a-grid/)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

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

**Required: these 10 questions, in order.** [Open chapter checklist](16_DP.md#practice-problems)

- [ ] [LC 198 - House Robber](https://leetcode.com/problems/house-robber/)
- [ ] [LC 64 - Minimum Path Sum](https://leetcode.com/problems/minimum-path-sum/)
- [ ] [LC 416 - Partition Equal Subset Sum](https://leetcode.com/problems/partition-equal-subset-sum/)
- [ ] [LC 322 - Coin Change](https://leetcode.com/problems/coin-change/)
- [ ] [LC 518 - Coin Change II](https://leetcode.com/problems/coin-change-ii/)
- [ ] [LC 1143 - Longest Common Subsequence](https://leetcode.com/problems/longest-common-subsequence/)
- [ ] [LC 72 - Edit Distance](https://leetcode.com/problems/edit-distance/)
- [ ] [LC 300 - Longest Increasing Subsequence](https://leetcode.com/problems/longest-increasing-subsequence/)
- [ ] [LC 309 - Best Time to Buy and Sell Stock with Cooldown](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/)
- [ ] [LC 312 - Burst Balloons](https://leetcode.com/problems/burst-balloons/)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

---

## 17. Tries

**Your Code:** [`DSA_Codes/Trie/Into.cpp`](../DSA_Codes/Trie/Into.cpp)

**Key things to revise:**
- Trie insert / search / startsWith
- Count words with given prefix
- XOR maximum in array (XOR trie)

**Required: these 10 questions, in order.** [Open chapter checklist](17_Tries.md#practice-problems)

- [ ] [LC 208 - Implement Trie (Prefix Tree)](https://leetcode.com/problems/implement-trie-prefix-tree/)
- [ ] [LC 211 - Design Add and Search Words Data Structure](https://leetcode.com/problems/design-add-and-search-words-data-structure/)
- [ ] [LC 648 - Replace Words](https://leetcode.com/problems/replace-words/)
- [ ] [LC 720 - Longest Word in Dictionary](https://leetcode.com/problems/longest-word-in-dictionary/)
- [ ] [LC 1268 - Search Suggestions System](https://leetcode.com/problems/search-suggestions-system/)
- [ ] [LC 2416 - Sum of Prefix Scores of Strings](https://leetcode.com/problems/sum-of-prefix-scores-of-strings/)
- [ ] [LC 212 - Word Search II](https://leetcode.com/problems/word-search-ii/)
- [ ] [LC 421 - Maximum XOR of Two Numbers in an Array](https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/)
- [ ] [LC 1707 - Maximum XOR With an Element From Array](https://leetcode.com/problems/maximum-xor-with-an-element-from-array/)
- [ ] [GFG - Number of Distinct Substrings](https://www.geeksforgeeks.org/problems/number-of-distinct-substrings-in-a-string/1)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

---

## 18. Segment Tree & Advanced

**Your Code:** [`DSA_Codes/SegmentTree/`](../DSA_Codes/SegmentTree/) · [`DSA_Codes/Math/`](../DSA_Codes/Math/) · [`DSA_Codes/LuvMaths/NumberTheory/`](../DSA_Codes/LuvMaths/NumberTheory/)

**Key things to revise:**
- Segment tree — build, query, point update, range update with lazy propagation
- Number theory — GCD/LCM, Sieve of Eratosthenes, modular exponentiation, MMI
- Sparse table for range minimum queries

**Required: these 10 questions, in order.** [Open chapter checklist](18_SegmentTree_Advanced.md#practice-problems)

- [ ] [LC 307 - Range Sum Query - Mutable](https://leetcode.com/problems/range-sum-query-mutable/)
- [ ] [LC 315 - Count of Smaller Numbers After Self](https://leetcode.com/problems/count-of-smaller-numbers-after-self/)
- [ ] [LC 327 - Count of Range Sum](https://leetcode.com/problems/count-of-range-sum/)
- [ ] [LC 1649 - Create Sorted Array through Instructions](https://leetcode.com/problems/create-sorted-array-through-instructions/)
- [ ] [LC 2407 - Longest Increasing Subsequence II](https://leetcode.com/problems/longest-increasing-subsequence-ii/)
- [ ] [LC 2736 - Maximum Sum Queries](https://leetcode.com/problems/maximum-sum-queries/)
- [ ] [CF 339D - Xenia and Bit Operations](https://codeforces.com/problemset/problem/339/D)
- [ ] [CF 380C - Sereja and Brackets](https://codeforces.com/problemset/problem/380/C)
- [ ] [CF 52C - Circular RMQ](https://codeforces.com/problemset/problem/52/C)
- [ ] [CF 459D - Pashmak and Parmida's problem](https://codeforces.com/problemset/problem/459/D)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

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

**Required: these 10 questions, in order.** [Open chapter checklist](19_Maths.md#14-practice-problems)

- [ ] [GFG - GCD of Two Numbers](https://www.geeksforgeeks.org/problems/gcd-of-two-numbers3459/1)
- [ ] [GFG - Prime Factors](https://www.geeksforgeeks.org/problems/prime-factors5052/1)
- [ ] [LC 204 - Count Primes](https://leetcode.com/problems/count-primes/)
- [ ] [LC 50 - Pow(x, n)](https://leetcode.com/problems/powx-n/)
- [ ] [LC 372 - Super Pow](https://leetcode.com/problems/super-pow/)
- [ ] [LC 118 - Pascal's Triangle](https://leetcode.com/problems/pascals-triangle/)
- [ ] [LC 119 - Pascal's Triangle II](https://leetcode.com/problems/pascals-triangle-ii/)
- [ ] [LC 507 - Perfect Number](https://leetcode.com/problems/perfect-number/)
- [ ] [LC 172 - Factorial Trailing Zeroes](https://leetcode.com/problems/factorial-trailing-zeroes/)
- [ ] [LC 1492 - The kth Factor of n](https://leetcode.com/problems/the-kth-factor-of-n/)

Remaining questions: [Extra Practice](EXTRA_PRACTICE.md).

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

*Created: May 2026 | Practice selection revised: November 2026 | Based on Striver's A2Z DSA Sheet*
