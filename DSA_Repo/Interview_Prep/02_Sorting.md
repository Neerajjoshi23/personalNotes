# Chapter 02 — Sorting Algorithms

> **Revision target:** 0.5 day  
> **Goal:** After reading this file, you need nothing else for this topic — no code files, no YouTube, no tutorials.

---

## Table of Contents

1. [Why Sorting Matters in Interviews](#1-why-sorting-matters-in-interviews)
2. [Bubble Sort — Iterative](#2-bubble-sort--iterative)
3. [Bubble Sort — Recursive](#3-bubble-sort--recursive)
4. [Selection Sort](#4-selection-sort)
5. [Insertion Sort — Iterative](#5-insertion-sort--iterative)
6. [Insertion Sort — Recursive](#6-insertion-sort--recursive)
7. [Merge Sort](#7-merge-sort)
8. [Quick Sort](#8-quick-sort)
9. [Dutch National Flag (3-Way Partition)](#9-dutch-national-flag-3-way-partition)
10. [Count Inversions](#10-count-inversions)
11. [Comparison: When to Use Which](#11-comparison-when-to-use-which)
12. [Things Most People Forget](#12-things-most-people-forget)
13. [Practice Problems](#13-practice-problems)
14. [Final Revision Sheet](#14-final-revision-sheet)

---

## 1. Why Sorting Matters in Interviews

Sorting is a **prerequisite skill**, not just a standalone topic. Here's where it shows up:

- Two-pointer problems require a sorted array to work
- Binary search requires sorted input
- Greedy algorithms often sort by some custom key
- Merge Sort's merge step is the basis for counting inversions
- Quick Sort's partition is the basis for Kth-largest/smallest
- Dutch National Flag solves "Sort Colors" but also underpins 3-way partition in Quick Sort

**Pattern recognition:** If you see a problem involving pairs, intervals, or finding duplicates — sorting is likely the first step.

---

## 2. Bubble Sort — Iterative

### What problem it solves

Sort an array in-place by repeatedly bubbling the largest unsorted element to its correct position at the end.

### How it works

In each "round" `i` (from 1 to n-1), you scan the array from index 0 to `n-i-1` and swap adjacent elements whenever they're in the wrong order. After round `i`, the last `i` elements are sorted.

**Mental model:** Think of heavy bubbles rising — in each pass, the heaviest bubble floats to the top (end).

```cpp
void bubbleSort(vector<int>& arr, int n) {
    for(int i = 1; i < n; i++) {
        bool swapped = false;
        for(int j = 0; j < n-i; j++) {
            if(arr[j] > arr[j+1]) {
                swap(arr[j], arr[j+1]);
                swapped = true;
            }
        }
        if(swapped == false) break;  // already sorted — early exit
    }
}
```

**From your code (SortingAlgo/BubbleSort.cpp):** The `swapped` flag is the key optimization. Without it, you'd always do O(n²) operations even on an already-sorted array. With it, a sorted array terminates in O(n) — just one pass with zero swaps. This is the ONLY scenario where Bubble Sort beats Merge/Quick Sort.

### Why this approach works

After pass `i`, the element at position `n-i` is guaranteed to be in its final sorted position. Proof: In each pass, the max of the unsorted part propagates all the way to the end via adjacent swaps. So after k passes, the k largest elements are in their correct final positions.

### Complexity Analysis

| Case | Time | Space |
|------|------|-------|
| Best (sorted array) | O(n) | O(1) |
| Average | O(n²) | O(1) |
| Worst (reverse sorted) | O(n²) | O(1) |

- **Stable:** YES — equal elements never swap, so their original order is preserved
- **In-place:** YES — only O(1) extra space

### Common Mistakes

1. **Loop bound wrong:** Inner loop must go to `n-i`, not `n-1`. If you go to `n-1`, you'll access `arr[j+1]` at `j = n-1` → out of bounds.
2. **Forgetting the optimization:** Always include the `swapped` flag. Without it, you lose best-case O(n).
3. **Outer loop starts at 1, not 0** — this is intentional. The outer loop counts rounds, and in round 1, we process elements up to index `n-1`.

### When to use in interviews

Almost never for actual sorting. BUT:
- Asked to demonstrate understanding of in-place, stable sorting
- Best-case O(n) question — "what sorting algo is O(n) on sorted input?"
- Shows understanding of "passes" concept used in radix sort

---

## 3. Bubble Sort — Recursive

### What problem it solves

Same as iterative bubble sort, but implemented using recursion to demonstrate recursion thinking.

```cpp
void sortArray(int *arr, int n) {
    if(n == 0 || n == 1) return;  // base case: 0 or 1 element already sorted

    // One pass: bubble largest to end
    for(int i = 0; i < n-1; i++) {
        if(arr[i] > arr[i+1]) {
            swap(arr[i], arr[i+1]);
        }
    }

    // Recursively sort the first n-1 elements
    sortArray(arr, n-1);
}
```

**From your code (Recursion/bubbleSort.cpp):** The insight here is the recursion pattern — "solve one case, then recursively handle the rest." After one pass, the largest element is at position n-1 (solved). Recursion then handles n-1 elements. Base case: 0 or 1 elements need no sorting.

### Why recursion here?

Understanding recursive bubble sort trains you to think:
1. What is ONE step I can handle deterministically?
2. What remains after that step?
3. What's my base case?

This pattern transfers directly to Merge Sort and Quick Sort thinking.

### Complexity

Same as iterative — O(n²) time, but O(n) **space** now (recursion stack depth = n).

---

## 4. Selection Sort

### What problem it solves

Sort by repeatedly selecting the minimum element from the unsorted portion and placing it at the correct position.

### How it works

In round `i`, scan the subarray `arr[i..n-1]`, find the index of the minimum element, and swap it with `arr[i]`. After round i, position i holds the (i+1)-th smallest element.

**Mental model:** You're "selecting" the smallest remaining element each time. Like picking cards from a pile in ascending order.

```cpp
void selectionSort(vector<int>& arr, int n) {
    for(int i = 0; i < n-1; i++) {
        int minIndex = i;
        for(int j = i+1; j < n; j++) {
            if(arr[j] < arr[minIndex])
                minIndex = j;
        }
        swap(arr[minIndex], arr[i]);
    }
}
```

**From your code (SortingAlgo/SelectionSort.cpp):** Note there's no early-exit optimization possible here — you MUST scan the full remaining array to find the minimum. You can't stop early even if already sorted. This is fundamentally different from Bubble Sort.

### Why this approach works

After iteration `i`, `arr[0..i]` is sorted and contains the `i+1` smallest elements. Proof: In each iteration, we find the true minimum of `arr[i..n-1]` and place it at `arr[i]`. This is the smallest element that belongs at position `i`.

### Complexity Analysis

| Case | Time | Space |
|------|------|-------|
| Best | O(n²) | O(1) |
| Average | O(n²) | O(1) |
| Worst | O(n²) | O(1) |

- **Stable:** NO — swapping can change relative order of equal elements (e.g., `[2a, 2b, 1]` → `[1, 2b, 2a]`)
- **In-place:** YES
- **Number of swaps:** Exactly O(n) swaps (one per outer iteration). **This is its only advantage** — minimum number of writes to memory.

### When is selection sort useful?

When writing to memory is expensive (e.g., flash storage, EEPROM) and comparisons are cheap. Otherwise, never.

### Common Mistake

Selection Sort is **not stable** — this surprises people. It can break equal elements' order via long-distance swaps.

---

## 5. Insertion Sort — Iterative

### What problem it solves

Sort by building the sorted portion one element at a time. Each new element is "inserted" into the correct position within the already-sorted portion.

### How it works

For each element `arr[i]`, save it as `temp`. Scan backwards through the sorted portion (indices 0 to i-1), shifting elements right until you find where `temp` belongs. Insert it there.

**Mental model:** Sorting playing cards. You pick up card i and slide it leftward into the right spot among the already-sorted cards in your hand.

```cpp
void insertionSort(int n, vector<int>& arr) {
    for(int i = 1; i < n; i++) {
        int temp = arr[i];
        int j = i-1;
        for(; j >= 0; j--) {
            if(arr[j] > temp) {
                arr[j+1] = arr[j];   // shift right to make space
            } else {
                break;   // found the position — stop
            }
        }
        arr[j+1] = temp;   // insert at the right position
    }
}
```

**From your code (SortingAlgo/InserstionSort.cpp):** The `break` is crucial — once `arr[j] <= temp`, we've found the insertion point. Without break, you'd overwrite values to the left of the correct position. Also notice `arr[j+1] = temp` after the loop — when the loop ends (either via break or j < 0), j+1 is the correct insertion index.

### Why this approach works

**Invariant:** Before iteration i, `arr[0..i-1]` is sorted. After iteration i, `arr[0..i]` is sorted. This invariant holds throughout.

The backwards scan with shifting is essentially doing a binary-search-like insert into the sorted prefix — except we shift instead of using extra space.

### Complexity Analysis

| Case | Time | Space |
|------|------|-------|
| Best (sorted) | O(n) | O(1) |
| Average | O(n²) | O(1) |
| Worst (reverse sorted) | O(n²) | O(1) |

- **Stable:** YES — the `>` comparison means equal elements never swap
- **In-place:** YES
- **Adaptive:** YES — O(n) on nearly sorted arrays (best practical case)

### When Insertion Sort wins

1. Nearly-sorted data — O(nk) where k is the max displacement of any element
2. Small arrays (n < 20) — constant factor is lower than merge/quick sort
3. **Online sorting** — you can sort as elements arrive (no need to have all elements upfront)
4. Tim Sort (Python's built-in, Java's Arrays.sort) uses insertion sort for small subarrays

---

## 6. Insertion Sort — Recursive

### Code and insight

```cpp
void insertionSort(int *arr, int ind, int n) {
    if(ind == n || n == 0) return;  // base case
    int j = ind - 1;
    int val = arr[ind];
    while(j >= 0) {
        if(arr[j] > val) {
            arr[j+1] = arr[j];
            j--;
        } else break;
    }
    arr[j+1] = val;

    return insertionSort(arr, ind+1, n);  // tail recursion: sort rest
}

// Call: insertionSort(arr, 1, n);
```

**From your code (Recursion/insertionSort.cpp):** The recursive version starts `ind` at 1 (first unsorted element) and increments towards n. Each call inserts `arr[ind]` into `arr[0..ind-1]`. This is **tail recursion** — the recursive call is the last statement, so a smart compiler can optimize it to a loop.

### Recursion pattern

"At each call, I insert element at index `ind` into the already-sorted prefix, then recurse on `ind+1`." The base case is when `ind == n` — all elements processed.

### Complexity

O(n²) time, O(n) space (recursion stack). Same as iterative for time, worse for space.

---

## 7. Merge Sort

### What problem it solves

Sort an array using the divide-and-conquer paradigm. Divide into halves, sort each half recursively, then merge the sorted halves.

### The Big Picture — WHY divide and conquer?

Merging two **sorted** arrays is O(n). If you could guarantee both halves are sorted, merge is trivial. The trick: recursively guarantee sorting of each half. Base case: an array of size 1 is trivially sorted.

```
mergeSort([3,7,0,1,5,8]):
    mergeSort([3,7,0])       → mergeSort([3]) + mergeSort([7,0]) → [3] + [0,7] → merge → [0,3,7]
    mergeSort([1,5,8])       → mergeSort([1]) + mergeSort([5,8]) → [1] + [5,8] → merge → [1,5,8]
    merge([0,3,7], [1,5,8]) → [0,1,3,5,7,8]
```

### Full Implementation

```cpp
void merge(int *arr, int s, int e) {
    int mid = (s + e) / 2;

    int len1 = mid - s + 1;   // size of left half
    int len2 = e - mid;       // size of right half

    // Allocate temporary arrays
    int *first = new int[len1];
    int *second = new int[len2];

    // Copy data
    int mainIdx = s;
    for(int i = 0; i < len1; i++) first[i] = arr[mainIdx++];
    mainIdx = mid + 1;
    for(int i = 0; i < len2; i++) second[i] = arr[mainIdx++];

    // Merge two sorted arrays back into arr[s..e]
    int i = 0, j = 0;
    mainIdx = s;
    while(i < len1 && j < len2) {
        if(first[i] <= second[j]) arr[mainIdx++] = first[i++];
        else                      arr[mainIdx++] = second[j++];
    }
    while(i < len1) arr[mainIdx++] = first[i++];
    while(j < len2) arr[mainIdx++] = second[j++];

    delete[] first;
    delete[] second;
}

void mergeSort(int *arr, int s, int e) {
    if(s >= e) return;        // base case: single element or empty range
    int mid = (s + e) / 2;
    mergeSort(arr, s, mid);   // sort left half
    mergeSort(arr, mid+1, e); // sort right half
    merge(arr, s, e);         // merge sorted halves
}
```

**From your code (Recursion/mergeSort.cpp):** Several things to notice:

1. **`mid = (s+e)/2`** — uses `s` and `e` indices (not lengths). Left half is `[s, mid]`, right half is `[mid+1, e]`. For `s=0, e=5`: mid=2, left=[0,1,2], right=[3,4,5].
2. **Temporary arrays are heap-allocated** (`new`). This is fine for correctness but remember to `delete[]` to avoid memory leaks.
3. **Base case is `s >= e`** — both `s == e` (single element) and `s > e` (invalid range) are handled.
4. **The merge uses `<=` not `<`** — this makes merge sort **stable** (equal elements from left come first).

### Why merge uses `<=` for stability

```
first = [1, 3]
second = [1, 5]
// If we use <: when first[i] == second[j], we take second[j] first → NOT stable
// If we use <=: when first[i] == second[j], we take first[i] first → STABLE
```

### Complexity Analysis

| Case | Time | Space |
|------|------|-------|
| Best | O(n log n) | O(n) |
| Average | O(n log n) | O(n) |
| Worst | O(n log n) | O(n) |

**Why O(n log n)?** There are log n levels of recursion (each level halves the problem). At each level, merging all subarrays of that level takes O(n) total work. So: O(n) × O(log n) = O(n log n).

**Why O(n) space?** At any point, the merge step creates temporary arrays. The maximum total size of all temporary arrays in use at any time is O(n). Plus O(log n) recursion stack — dominated by O(n).

- **Stable:** YES
- **In-place:** NO (requires O(n) extra space)
- **Parallelizable:** YES (the two halves can be sorted independently)

### When to use Merge Sort

1. **Linked lists** — merge sort is the go-to for linked lists (quick sort needs random access)
2. **Stable sort required** — when you need to preserve original order of equal elements
3. **Counting inversions** — merge step can count inversions in O(n log n)
4. **External sorting** — when data doesn't fit in memory (merge naturally works with sequential access)
5. **Guaranteed O(n log n)** — quick sort has O(n²) worst case; merge sort doesn't

### Common Mistakes

```cpp
// MISTAKE 1: Wrong mid calculation
int mid = (s + e) / 2;       // OK for small indices
int mid = s + (e - s) / 2;   // SAFE — avoids integer overflow when s+e > INT_MAX

// MISTAKE 2: Wrong base case
if(s == e) return;  // WRONG — misses s > e case (can happen on empty right half)
if(s >= e) return;  // CORRECT

// MISTAKE 3: Not deleting temp arrays → memory leak
delete[] first;    // REQUIRED in this implementation
delete[] second;

// MISTAKE 4: Using < instead of <= in merge → unstable sort
if(first[i] <= second[j])   // <= keeps left elements first = stable
```

---

## 8. Quick Sort

### What problem it solves

Sort an array in-place using divide-and-conquer with a pivot element.

### The Big Picture — partition idea

Pick a pivot element. Rearrange the array so that:
- All elements ≤ pivot are on the left
- All elements > pivot are on the right
- Pivot is at its final sorted position

Then recursively sort left and right portions. The magic: after partitioning, the pivot is **permanently in place** — it never moves again.

### The Partition Algorithm (from your code)

```cpp
int partition(int arr[], int s, int e) {
    int pivot = arr[s];   // always pick first element as pivot

    // Count elements ≤ pivot (to find pivot's final position)
    int cnt = 0;
    for(int i = s+1; i <= e; i++) {
        if(arr[i] <= pivot) cnt++;
    }

    // Move pivot to its correct final position
    int pivotIndex = s + cnt;
    swap(arr[pivotIndex], arr[s]);

    // Fix left partition (elements ≤ pivot) and right partition (elements > pivot)
    int i = s, j = e;
    while(i < pivotIndex && j > pivotIndex) {
        while(arr[i] <= pivot && i < pivotIndex) i++;  // find out-of-place on left
        while(arr[j] > pivot && j > pivotIndex) j--;   // find out-of-place on right
        if(i < pivotIndex && j > pivotIndex) {
            swap(arr[i++], arr[j--]);
        }
    }
    return pivotIndex;
}

void quickSort(int arr[], int s, int e) {
    if(s >= e) return;  // base case
    int p = partition(arr, s, e);
    quickSort(arr, s, p-1);   // sort left portion
    quickSort(arr, p+1, e);   // sort right portion
}
```

**From your code (Recursion/quickSort.cpp):** This implements a specific partition variant:

1. **Count-based pivot placement:** Count elements ≤ pivot to determine pivot's final index directly. Then swap pivot to that index. This is not the standard Lomuto or Hoare partition — it's a custom "place pivot first, fix rest" approach.
2. **Two-pointer fix-up:** After placing pivot, scan from both ends and swap misplaced elements.
3. **Handles duplicates:** The condition `arr[i] <= pivot` on the left (not `<`) means equal elements go left of pivot.

### Standard Lomuto Partition (the one most interviewers expect)

```cpp
// Lomuto partition — simpler, easier to remember
int partitionLomuto(int arr[], int s, int e) {
    int pivot = arr[e];   // pick LAST element as pivot
    int i = s - 1;       // i tracks boundary of "≤ pivot" region
    for(int j = s; j < e; j++) {
        if(arr[j] <= pivot) {
            i++;
            swap(arr[i], arr[j]);
        }
    }
    swap(arr[i+1], arr[e]);   // place pivot at i+1
    return i+1;
}
```

**Intuition for Lomuto:** `i` is the last index where we've placed an element ≤ pivot. When we find `arr[j] <= pivot`, we expand this region by incrementing `i` and swapping `arr[j]` there.

### Standard Hoare Partition (more efficient, fewer swaps)

```cpp
// Hoare partition — pivot doesn't reach its final position after partition
int partitionHoare(int arr[], int s, int e) {
    int pivot = arr[s];   // pick FIRST element as pivot
    int i = s - 1;
    int j = e + 1;
    while(true) {
        do { i++; } while(arr[i] < pivot);
        do { j--; } while(arr[j] > pivot);
        if(i >= j) return j;
        swap(arr[i], arr[j]);
    }
}
// Note: with Hoare, call quickSort(arr, s, p) and quickSort(arr, p+1, e)
// (not p-1 for left — p itself may not be at its final position)
```

### Complexity Analysis

| Case | Time | Space (stack) |
|------|------|---------------|
| Best (balanced splits) | O(n log n) | O(log n) |
| Average (random pivot) | O(n log n) | O(log n) |
| Worst (already sorted, pivot=first) | O(n²) | O(n) |

**Why O(n²) worst case?** If pivot is always min or max, partition creates partitions of size 0 and n-1 → n levels of recursion each doing O(n) work.

**Why O(n log n) average?** On average, pivot splits array roughly in half → log n levels, O(n) work per level.

- **Stable:** NO — long-distance swaps can change relative order of equal elements
- **In-place:** YES (no temp arrays, only stack space)
- **Cache-friendly:** YES — contiguous memory access

### Pivot Selection Strategies

```cpp
// 1. First element — BAD on sorted/nearly sorted arrays (your code does this)
int pivot = arr[s];

// 2. Last element — BAD on sorted/nearly sorted arrays (Lomuto default)
int pivot = arr[e];

// 3. Random pivot — GOOD, defeats adversarial inputs
int randIdx = s + rand() % (e - s + 1);
swap(arr[randIdx], arr[s]);
int pivot = arr[s];

// 4. Median of three — BEST in practice
// Take arr[s], arr[mid], arr[e], use their median as pivot
int mid = s + (e - s) / 2;
if(arr[s] > arr[mid]) swap(arr[s], arr[mid]);
if(arr[s] > arr[e])  swap(arr[s], arr[e]);
if(arr[mid] > arr[e]) swap(arr[mid], arr[e]);
// arr[mid] is now the median — swap to front as pivot
swap(arr[mid], arr[s]);
```

### When to use Quick Sort

1. **General-purpose in-place sorting** — best constant factor in practice for random data
2. **Space-sensitive** — only O(log n) extra stack space
3. **Kth smallest/largest** — quick select (partition-based, O(n) average without full sort)
4. **Cache performance matters** — contiguous memory access pattern

### Common Mistakes

```cpp
// MISTAKE 1: Wrong base case
if(s == e) return;   // WRONG — misses case when s > e after partition
if(s >= e) return;   // CORRECT

// MISTAKE 2: Wrong recursive calls with Hoare partition
quickSort(arr, s, p-1);   // WRONG for Hoare
quickSort(arr, p+1, e);
// Correct for Hoare:
quickSort(arr, s, p);
quickSort(arr, p+1, e);

// MISTAKE 3: Forgetting worst case
// Always mention O(n²) worst case and how to mitigate (random pivot)
```

---

## 9. Dutch National Flag (3-Way Partition)

**Your codebase has no Dutch National Flag code** — complete explanation written here.

### What problem it solves

Given an array with 3 distinct values (classically 0, 1, 2), sort it in O(n) time and O(1) space. Named after Dijkstra's Dutch national flag problem.

### Why not just use sort()?

Sort is O(n log n). For a 3-value array, we can do better: O(n) single pass using 3 pointers.

### The Algorithm

Maintain three regions using pointers `lo`, `mid`, `hi`:
- `arr[0..lo-1]` = all 0s (done)
- `arr[lo..mid-1]` = all 1s (done)  
- `arr[mid..hi]` = unexplored
- `arr[hi+1..n-1]` = all 2s (done)

```cpp
void dutchNationalFlag(vector<int>& arr) {
    int lo = 0, mid = 0, hi = arr.size() - 1;

    while(mid <= hi) {
        if(arr[mid] == 0) {
            swap(arr[lo], arr[mid]);
            lo++;
            mid++;
        } else if(arr[mid] == 1) {
            mid++;        // 1 is in correct region, just advance
        } else {          // arr[mid] == 2
            swap(arr[mid], arr[hi]);
            hi--;
            // DO NOT increment mid — swapped element from hi is unexplored
        }
    }
}
```

### Why mid doesn't increment when swapping with hi

When you swap `arr[mid]` with `arr[hi]`:
- You move `arr[hi]` (a 2) to the end — correctly placed
- You bring `arr[hi]` (unknown value) to position `mid`
- That new `arr[mid]` is unexplored — you MUST check it next iteration
- So `mid` stays, `hi` decrements

When you swap `arr[lo]` with `arr[mid]`:
- `arr[lo]` was a 1 (in the "1s done" region)
- After swap, `arr[mid]` = 1, `arr[lo]` = 0
- Position `lo` now has 0 (correct), `mid` has 1 (correct) — advance both

### Pattern Identification

> If you see: "sort array with limited distinct values," "partition into 3 parts," "separate elements into groups"
> → Think Dutch National Flag

### Complexity

- **Time:** O(n) — each element is visited at most twice
- **Space:** O(1) — three pointers only
- **In-place:** YES
- **Stable:** NO

### Generalization

For more than 3 values — Dutch National Flag generalizes to **3-way quick sort** (fat partition), which handles duplicates efficiently:

```cpp
// 3-way partition around pivot
void threeWayPartition(int arr[], int s, int e, int pivot) {
    int lo = s, mid = s, hi = e;
    while(mid <= hi) {
        if(arr[mid] < pivot)       { swap(arr[lo++], arr[mid++]); }
        else if(arr[mid] == pivot) { mid++; }
        else                       { swap(arr[mid], arr[hi--]); }
    }
    // After: arr[s..lo-1] < pivot, arr[lo..mid-1] == pivot, arr[mid..e] > pivot
}
```

### Common Mistakes

```cpp
// MISTAKE 1: Incrementing mid after swap with hi
swap(arr[mid], arr[hi]);
hi--;
mid++;   // WRONG — you haven't checked the new arr[mid] yet

// MISTAKE 2: Wrong initial pointer values
lo = 0; mid = 0; hi = n;   // WRONG — hi should be n-1
lo = 0; mid = 0; hi = n-1; // CORRECT

// MISTAKE 3: Wrong loop condition
while(mid < hi)   // WRONG — misses case when mid == hi (that element unprocessed)
while(mid <= hi)  // CORRECT
```

---

## 10. Count Inversions

### What problem it solves

An **inversion** is a pair (i, j) where `i < j` but `arr[i] > arr[j]`. Count the total number of inversions in an array.

**Why it matters:** Inversions measure "how far from sorted" an array is. 0 inversions = fully sorted. n*(n-1)/2 inversions = reverse sorted.

### Brute force — O(n²)

```cpp
int countInversions_brute(vector<int>& arr, int n) {
    int count = 0;
    for(int i = 0; i < n; i++)
        for(int j = i+1; j < n; j++)
            if(arr[i] > arr[j]) count++;
    return count;
}
```

### Efficient approach — Merge Sort O(n log n)

**Key insight:** During the merge step of merge sort, when you pick an element from the **right** array, all remaining elements in the **left** array form inversions with it (they're all larger and come earlier in the original array).

```cpp
long long mergeAndCount(int *arr, int s, int e) {
    if(s >= e) return 0;

    long long count = 0;
    int mid = (s + e) / 2;

    count += mergeAndCount(arr, s, mid);      // inversions in left half
    count += mergeAndCount(arr, mid+1, e);    // inversions in right half

    // Count split inversions during merge
    int len1 = mid - s + 1, len2 = e - mid;
    int *L = new int[len1], *R = new int[len2];
    for(int i = 0; i < len1; i++) L[i] = arr[s+i];
    for(int i = 0; i < len2; i++) R[i] = arr[mid+1+i];

    int i = 0, j = 0, k = s;
    while(i < len1 && j < len2) {
        if(L[i] <= R[j]) {
            arr[k++] = L[i++];
        } else {
            // L[i], L[i+1], ..., L[len1-1] are all > R[j]
            count += (len1 - i);   // all remaining left elements form inversions
            arr[k++] = R[j++];
        }
    }
    while(i < len1) arr[k++] = L[i++];
    while(j < len2) arr[k++] = R[j++];

    delete[] L;
    delete[] R;
    return count;
}
```

**From your mergeSort.cpp comment:** The file has a direct link to the GFG inversion count problem — `//https://www.geeksforgeeks.org/inversion-count-in-array-using-merge-sort/`. This confirms merge sort's merge step is the right tool.

### Why it works

When merging left `[...L[i]...]` and right `[...R[j]...]`, if `L[i] > R[j]`, then ALL elements from L[i] onwards are > R[j] (left array is sorted). Each of them paired with R[j] is an inversion where the left element appears before the right in the original array. So `count += len1 - i`.

### Common Mistake

Use `long long` for the count — for n = 10^5, max inversions = n*(n-1)/2 ≈ 5×10^9, which overflows `int`.

---

## 11. Comparison: When to Use Which

### Complexity Summary

| Algorithm | Best | Average | Worst | Space | Stable | In-place |
|-----------|------|---------|-------|-------|--------|----------|
| Bubble Sort | O(n) | O(n²) | O(n²) | O(1) | ✅ | ✅ |
| Selection Sort | O(n²) | O(n²) | O(n²) | O(1) | ❌ | ✅ |
| Insertion Sort | O(n) | O(n²) | O(n²) | O(1) | ✅ | ✅ |
| Merge Sort | O(n log n) | O(n log n) | O(n log n) | O(n) | ✅ | ❌ |
| Quick Sort | O(n log n) | O(n log n) | O(n²) | O(log n) | ❌ | ✅ |

### Decision Guide

```
Need guaranteed O(n log n)?          → Merge Sort
Have memory constraint (O(1) space)? → Quick Sort (with random pivot)
Input is already nearly sorted?      → Insertion Sort
Sorting a linked list?               → Merge Sort (no random access needed)
Need stable sort?                    → Merge Sort or Insertion Sort
Need to count inversions?            → Merge Sort
Kth smallest/largest in O(n) avg?   → Quick Select (partition-based)
Array has only 3 distinct values?   → Dutch National Flag O(n)
```

### In practice (C++ STL `std::sort`)

`std::sort` is **introsort** — a hybrid algorithm:
1. Quick sort by default (fast average case)
2. If recursion depth exceeds threshold, switch to heap sort (prevents O(n²) worst case)
3. For small subarrays (< ~16 elements), switch to insertion sort (better constants)

This gives: O(n log n) guaranteed, in-place, not stable.

`std::stable_sort` uses merge sort — O(n log n), O(n) space, stable.

---

## 12. Things Most People Forget

### 1. Quick Sort worst case is O(n²)

```
Sorted array [1,2,3,4,5] with first-element pivot:
Partition: pivot=1, left=[], right=[2,3,4,5] → n-1 size subproblem every time
Total: O(n) + O(n-1) + ... = O(n²)
Fix: Use random pivot or median-of-three
```

### 2. Merge Sort is NOT in-place

Students often claim merge sort is O(1) space. It's O(n) — the temporary arrays used during merge. This is the primary reason quick sort is preferred when space matters.

### 3. Selection Sort is NOT stable

```
arr = [2a, 2b, 1]   (2a and 2b are equal values, 'a'/'b' track original position)
Round 0: min is 1 at index 2. Swap arr[0] and arr[2]: [1, 2b, 2a]
Result: 2a comes after 2b — original order reversed → NOT stable
```

### 4. Insertion Sort is online — it can sort as data arrives

Unlike merge/quick sort, insertion sort can process one element at a time. You don't need the full array upfront.

### 5. Bubble Sort with swapped flag = O(n) best case

Without the flag: even on sorted array, you do n² comparisons.
With the flag: if no swaps in a pass → already sorted → exit immediately.

### 6. After partition in Quick Sort, pivot is in its FINAL position

This is why Quick Select works — do one partition, if pivot lands at index k, you're done. No need to sort.

### 7. Dutch National Flag — don't increment mid after swap with hi

```cpp
swap(arr[mid], arr[hi]);
hi--;         // correct
// mid stays — the brought-in element is unexplored
```

### 8. Merge Sort's merge uses ≤ not < for stability

```cpp
if(first[i] <= second[j])   // when equal, take from left first = stable
```

### 9. Count Inversions needs long long

Max inversions for n=10^5: ~5×10^9 → exceeds INT_MAX (~2.1×10^9)

### 10. Lomuto vs Hoare: different recursive call structure

```cpp
// Lomuto: pivot IS at its final position p
quickSort(arr, s, p-1);
quickSort(arr, p+1, e);

// Hoare: pivot is NOT at its final position — p is just a split point
quickSort(arr, s, p);
quickSort(arr, p+1, e);
```

---

## 14. Final Revision Sheet

### All Templates — Quick Reference

```cpp
// ===== BUBBLE SORT =====
void bubbleSort(vector<int>& arr, int n) {
    for(int i = 1; i < n; i++) {
        bool swapped = false;
        for(int j = 0; j < n-i; j++) {
            if(arr[j] > arr[j+1]) { swap(arr[j], arr[j+1]); swapped = true; }
        }
        if(!swapped) break;
    }
}

// ===== SELECTION SORT =====
void selectionSort(vector<int>& arr, int n) {
    for(int i = 0; i < n-1; i++) {
        int minIdx = i;
        for(int j = i+1; j < n; j++)
            if(arr[j] < arr[minIdx]) minIdx = j;
        swap(arr[minIdx], arr[i]);
    }
}

// ===== INSERTION SORT =====
void insertionSort(vector<int>& arr, int n) {
    for(int i = 1; i < n; i++) {
        int temp = arr[i], j = i-1;
        while(j >= 0 && arr[j] > temp) { arr[j+1] = arr[j]; j--; }
        arr[j+1] = temp;
    }
}

// ===== MERGE SORT =====
void merge(vector<int>& arr, int s, int e) {
    int mid = s + (e-s)/2;
    vector<int> left(arr.begin()+s, arr.begin()+mid+1);
    vector<int> right(arr.begin()+mid+1, arr.begin()+e+1);
    int i = 0, j = 0, k = s;
    while(i < left.size() && j < right.size())
        arr[k++] = (left[i] <= right[j]) ? left[i++] : right[j++];
    while(i < left.size()) arr[k++] = left[i++];
    while(j < right.size()) arr[k++] = right[j++];
}
void mergeSort(vector<int>& arr, int s, int e) {
    if(s >= e) return;
    int mid = s + (e-s)/2;
    mergeSort(arr, s, mid);
    mergeSort(arr, mid+1, e);
    merge(arr, s, e);
}

// ===== QUICK SORT (Lomuto) =====
int partition(vector<int>& arr, int s, int e) {
    int pivot = arr[e], i = s-1;
    for(int j = s; j < e; j++)
        if(arr[j] <= pivot) swap(arr[++i], arr[j]);
    swap(arr[i+1], arr[e]);
    return i+1;
}
void quickSort(vector<int>& arr, int s, int e) {
    if(s >= e) return;
    int p = partition(arr, s, e);
    quickSort(arr, s, p-1);
    quickSort(arr, p+1, e);
}

// ===== DUTCH NATIONAL FLAG =====
void dnf(vector<int>& arr) {
    int lo = 0, mid = 0, hi = arr.size()-1;
    while(mid <= hi) {
        if(arr[mid] == 0)      swap(arr[lo++], arr[mid++]);
        else if(arr[mid] == 1) mid++;
        else                   swap(arr[mid], arr[hi--]);
    }
}

// ===== COUNT INVERSIONS (Merge Sort) =====
long long mergeCount(vector<int>& arr, int s, int e) {
    if(s >= e) return 0;
    int mid = s + (e-s)/2;
    long long cnt = mergeCount(arr, s, mid) + mergeCount(arr, mid+1, e);
    vector<int> L(arr.begin()+s, arr.begin()+mid+1);
    vector<int> R(arr.begin()+mid+1, arr.begin()+e+1);
    int i = 0, j = 0, k = s;
    while(i < L.size() && j < R.size()) {
        if(L[i] <= R[j]) arr[k++] = L[i++];
        else { cnt += L.size()-i; arr[k++] = R[j++]; }
    }
    while(i < L.size()) arr[k++] = L[i++];
    while(j < R.size()) arr[k++] = R[j++];
    return cnt;
}
```

### Complexity Cheatsheet

| Algorithm | Best | Avg | Worst | Space | Stable |
|-----------|------|-----|-------|-------|--------|
| Bubble | O(n) | O(n²) | O(n²) | O(1) | ✅ |
| Selection | O(n²) | O(n²) | O(n²) | O(1) | ❌ |
| Insertion | O(n) | O(n²) | O(n²) | O(1) | ✅ |
| Merge | O(n log n) | O(n log n) | O(n log n) | O(n) | ✅ |
| Quick | O(n log n) | O(n log n) | O(n²) | O(log n) | ❌ |
| DNF | O(n) | O(n) | O(n) | O(1) | ❌ |

### Interview Checklist

- [ ] Can I code bubble sort with the `swapped` optimization?
- [ ] Can I explain WHY selection sort is not stable with an example?
- [ ] Can I code insertion sort (the shift-and-insert approach, not swap)?
- [ ] Can I code merge sort's `merge` function without bugs (boundary indices, ≤ for stability)?
- [ ] Do I know both Lomuto and Hoare partition? Can I state the difference in recursive calls?
- [ ] Can I state Quick Sort worst case and its cause?
- [ ] Can I code Dutch National Flag in one pass?
- [ ] Do I know WHY `mid` doesn't increment when swapping with `hi` in DNF?
- [ ] Can I explain how merge sort counts inversions?
- [ ] Do I use `long long` for inversion count?

### Key Insights for Interviews

1. **Merge Sort is preferred for linked lists** — no random access needed; merge step works naturally
2. **Quick Sort in-place is preferred for arrays** — cache-friendly, O(log n) space
3. **For nearly sorted data** — insertion sort is O(n), beating merge/quick in practice
4. **std::sort is introsort** — quick sort + heap sort fallback + insertion sort for small ranges
5. **Stability matters when sorting objects with multiple keys** — e.g., first by age, then by name
6. **Quick Select** — same partition logic as quick sort, finds kth element in O(n) average

---

*Chapter 02 — Sorting Algorithms | Part of DSA Interview Prep series*  
*Based on Striver's A2Z Sheet + Love Babbar lecture series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] Selection Sort — https://www.geeksforgeeks.org/problems/selection-sort/1
- [ ] Bubble Sort — https://www.geeksforgeeks.org/problems/bubble-sort/1
- [ ] Insertion Sort — https://www.geeksforgeeks.org/problems/insertion-sort/1
- [ ] Merge Sort — https://www.geeksforgeeks.org/problems/merge-sort/1
- [ ] Recursive Bubble Sort — https://www.geeksforgeeks.org/problems/bubble-sort/1
- [ ] Recursive Insertion Sort — https://www.geeksforgeeks.org/problems/insertion-sort/1
- [ ] Quick Sort — https://www.geeksforgeeks.org/problems/quick-sort/1

