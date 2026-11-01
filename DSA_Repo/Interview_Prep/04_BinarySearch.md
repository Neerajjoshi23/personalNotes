# Chapter 04 — Binary Search

> **Revision target:** 0.5 day  
> **Goal:** After reading this file, you need nothing else for this topic — no code files, no YouTube, no tutorials.

---

## Table of Contents

1. [Why Binary Search Is a Superpower](#1-why-binary-search-is-a-superpower)
2. [The Standard Template — Iterative](#2-the-standard-template--iterative)
3. [Binary Search — Recursive](#3-binary-search--recursive)
4. [Finding First and Last Occurrence](#4-finding-first-and-last-occurrence)
5. [Binary Search on Answer — Search Space](#5-binary-search-on-answer--search-space)
6. [Rotated Sorted Array](#6-rotated-sorted-array)
7. [Peak Element](#7-peak-element)
8. [Koko Eating Bananas — Classic Search Space](#8-koko-eating-bananas--classic-search-space)
9. [Book Allocation / Painter's Partition](#9-book-allocation--painters-partition)
10. [Aggressive Cows](#10-aggressive-cows)
11. [Things Most People Forget](#11-things-most-people-forget)
12. [Practice Problems](#12-practice-problems)
13. [Final Revision Sheet](#13-final-revision-sheet)

---

## 1. Why Binary Search Is a Superpower

Binary search isn't just "find element in sorted array." That's the simplest use case. The real power is:

**Binary search on the answer space** — when you can define a feasibility function and the feasible/infeasible boundary is monotonic, you can binary search on the answer directly without ever searching in an explicit array.

The pattern appears everywhere:
- "Find the minimum/maximum value such that [condition holds]"
- "Find the minimum number of days/speed/size to complete a task"
- "Minimize the maximum" or "Maximize the minimum"

If you see these phrasings, think binary search on answer.

---

## 2. The Standard Template — Iterative

### Your code (BinarySearch/BinarySearch.cpp) — analyzed

```cpp
int binarySearch(int arr[], int size, int key) {
    int start = 0;
    int end = size - 1;
    int mid = start + (end - start) / 2;   // compute mid before loop

    while(start <= end) {
        if(arr[mid] == key) return mid;
        if(key > arr[mid]) start = mid + 1;
        else               end = mid - 1;
        mid = start + (end - start) / 2;   // recompute mid at end of loop
    }
    return -1;
}
```

**This works but has a minor style issue** — `mid` is computed twice (before loop and at end of loop). The cleaner canonical template computes mid inside the loop:

### Canonical Template (commit this to memory)

```cpp
int binarySearch(vector<int>& arr, int target) {
    int lo = 0, hi = arr.size() - 1;
    while(lo <= hi) {
        int mid = lo + (hi - lo) / 2;   // ALWAYS use this, not (lo+hi)/2
        if(arr[mid] == target)      return mid;
        else if(arr[mid] < target)  lo = mid + 1;
        else                        hi = mid - 1;
    }
    return -1;
}
```

### Why `lo + (hi - lo) / 2` and NOT `(lo + hi) / 2`

```cpp
int lo = 1e9, hi = 2e9;
(lo + hi) / 2   // lo + hi = 3e9 → overflows INT_MAX (~2.1e9)! Gives wrong answer.
lo + (hi-lo)/2  // hi - lo = 1e9, within range → correct
```

This is the **integer overflow bug** that affects production code and competitive problems with large search spaces.

### Why `lo <= hi` (not `lo < hi`)

```cpp
// lo < hi stops before checking a single remaining element
// Example: target = arr[0] in a 1-element array
lo = 0, hi = 0, lo < hi is FALSE → loop never runs → return -1 (WRONG)
lo <= hi is TRUE → mid=0 → arr[0] == target → return 0 (CORRECT)
```

### The three decisions and their invariants

```
arr[mid] == target → found, return mid

arr[mid] < target  → target is in right half (arr[mid+1..hi])
                    → set lo = mid + 1
                    (NOT lo = mid — would infinite loop when lo == hi)

arr[mid] > target  → target is in left half (arr[lo..mid-1])
                    → set hi = mid - 1
                    (NOT hi = mid — same infinite loop risk)
```

**The ±1 rule:** Always set `lo = mid + 1` and `hi = mid - 1`. Never `lo = mid` or `hi = mid` in the standard template. Forgetting the +1/-1 causes infinite loops.

### Boundary Conditions Checklist

```cpp
// Empty array
if(arr.empty()) return -1;

// Single element
// [0, 0] → mid = 0 → check arr[0] → works fine

// Target smaller than all elements
// lo goes past hi after hi = mid - 1 → return -1 ✓

// Target larger than all elements
// lo goes past hi after lo = mid + 1 → return -1 ✓

// Duplicate elements — standard BS returns SOME occurrence (not first/last)
// For first/last, use lower_bound/upper_bound approach (Section 4)
```

---

## 3. Binary Search — Recursive

### Your code (Recursion/binarySearch.cpp) — analyzed

```cpp
bool binarySearch(int *arr, int s, int e, int k) {
    if(s > e) return false;   // base case: not found

    int mid = s + (e - s) / 2;

    if(arr[mid] == k) return true;

    if(arr[mid] < k)
        return binarySearch(arr, mid+1, e, k);   // search right
    else
        return binarySearch(arr, s, mid-1, k);   // search left
}
```

**Key observations from your code:**
1. Base case is `s > e` (not `s >= e`) — when `s == e`, there's still one element to check. This is correct.
2. Returns `bool`, not index — works for existence check only. Modify to return `mid` for index.
3. Uses `s + (e-s)/2` — overflow-safe. Good practice.

### Returning index in recursive version

```cpp
int binarySearch(int *arr, int s, int e, int key) {
    if(s > e) return -1;
    int mid = s + (e-s)/2;
    if(arr[mid] == key) return mid;
    if(arr[mid] < key)  return binarySearch(arr, mid+1, e, key);
    else                return binarySearch(arr, s, mid-1, key);
}
```

### Recursion complexity

- **Time:** O(log n) — same as iterative
- **Space:** O(log n) — recursion stack (log n levels deep)
- **Iterative is preferred** for binary search — O(1) space

### When recursive binary search is useful

Recursive form is more natural when you need to pass the range to sub-problems, as in:
- Merge sort (recursion with index ranges)
- Quick sort (partition then recurse on sub-ranges)
- Problems where you recurse on different "search spaces" at each level

---

## 4. Finding First and Last Occurrence

### What problem it solves

In an array with duplicates, standard binary search returns an arbitrary occurrence. You often need:
- First occurrence (leftmost index where element appears)
- Last occurrence (rightmost index where element appears)
- Count of occurrences = `last - first + 1`

### Method 1: Using STL (cleanest in interviews)

```cpp
vector<int> searchRange(vector<int>& arr, int target) {
    auto first = lower_bound(arr.begin(), arr.end(), target);
    auto last  = upper_bound(arr.begin(), arr.end(), target);

    if(first == arr.end() || *first != target) return {-1, -1};

    return {(int)(first - arr.begin()), (int)(last - arr.begin()) - 1};
}
// lower_bound: first index where arr[i] >= target
// upper_bound: first index where arr[i] > target
// last element of target is at upper_bound - 1
```

### Method 2: Manual binary search (what interviewers want to see)

```cpp
int findFirst(vector<int>& arr, int target) {
    int lo = 0, hi = arr.size()-1, result = -1;
    while(lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if(arr[mid] == target) {
            result = mid;    // record this as a candidate
            hi = mid - 1;   // but keep searching LEFT for earlier occurrence
        } else if(arr[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return result;
}

int findLast(vector<int>& arr, int target) {
    int lo = 0, hi = arr.size()-1, result = -1;
    while(lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if(arr[mid] == target) {
            result = mid;    // record this as a candidate
            lo = mid + 1;   // but keep searching RIGHT for later occurrence
        } else if(arr[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return result;
}

vector<int> searchRange(vector<int>& arr, int target) {
    return {findFirst(arr, target), findLast(arr, target)};
}
```

### The key insight

When `arr[mid] == target`, don't immediately return. Record it as a candidate, then:
- For first occurrence: search LEFT (`hi = mid - 1`)
- For last occurrence: search RIGHT (`lo = mid + 1`)

The `result` variable tracks the best candidate found so far.

### How lower_bound and upper_bound work internally

```cpp
// lower_bound: find first index where arr[i] >= target
int lower_bound(vector<int>& arr, int target) {
    int lo = 0, hi = arr.size();  // hi = n (one past last)
    while(lo < hi) {             // note: lo < hi (not <=)
        int mid = lo + (hi-lo)/2;
        if(arr[mid] < target) lo = mid + 1;
        else                  hi = mid;      // note: hi = mid (not mid-1)
    }
    return lo;   // lo == hi == first position where arr[i] >= target
}
// If no element >= target, returns arr.size()

// upper_bound: find first index where arr[i] > target
int upper_bound(vector<int>& arr, int target) {
    int lo = 0, hi = arr.size();
    while(lo < hi) {
        int mid = lo + (hi-lo)/2;
        if(arr[mid] <= target) lo = mid + 1;
        else                   hi = mid;
    }
    return lo;
}
```

**Key difference from standard binary search:**
- Loop condition: `lo < hi` (not `lo <= hi`)
- hi = n (not n-1) — can return n if target is larger than all elements
- When matching: set `hi = mid` (not `hi = mid-1`) — don't exclude mid, narrow from right

### lower_bound vs upper_bound visual

```
arr = [1, 2, 2, 2, 3, 4]
idx =  0  1  2  3  4  5

lower_bound(2) = 1   (first index with value >= 2)
upper_bound(2) = 4   (first index with value > 2)

Count of 2s = upper_bound(2) - lower_bound(2) = 4 - 1 = 3 ✓
Last index of 2 = upper_bound(2) - 1 = 3 ✓
```

---

## 5. Binary Search on Answer — Search Space

### The Core Idea

Sometimes there's no array to binary search in. Instead, you binary search on the ANSWER itself.

**Template:**

```
1. Define: what range can the answer be? → [lo, hi]
2. Define: feasibility check — given a candidate answer x, is it possible?
3. The feasibility check must be monotonic:
   - All values < threshold → infeasible
   - All values ≥ threshold → feasible
   (or vice versa)
4. Binary search for the exact threshold
```

### The universal template

```cpp
// Find minimum value such that feasible(value) = true
int binarySearchOnAnswer(/* problem params */) {
    int lo = minPossibleAnswer;
    int hi = maxPossibleAnswer;
    int result = hi;   // worst case is hi

    while(lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if(feasible(mid, /* params */)) {
            result = mid;    // mid works, try smaller
            hi = mid - 1;
        } else {
            lo = mid + 1;    // mid doesn't work, need larger
        }
    }
    return result;
}
```

### How to set lo and hi

```
lo = minimum possible answer (often 1 or the minimum element)
hi = maximum possible answer (often sum of all elements, or max element)

For "minimize maximum allocation": lo = max(arr), hi = sum(arr)
For "minimum speed": lo = 1, hi = max(piles)
For "minimum days": lo = 1, hi = sum(arr) or similar
```

### How to design the feasibility function

```
feasible(x) answers: "Given this candidate value x as the answer, can we achieve the goal?"

For minimization ("find min x such that feasible(x)"): 
  → feasible(x) = true means x is achievable → try smaller (hi = mid - 1)

For maximization ("find max x such that feasible(x)"):
  → feasible(x) = true means x is achievable → try larger (lo = mid + 1)
```

---

## 6. Rotated Sorted Array

### What problem it solves

An originally sorted array has been rotated at some unknown pivot. Find a target in it.

```
Original: [1, 2, 3, 4, 5, 6, 7]
Rotated:  [4, 5, 6, 7, 1, 2, 3]  (rotated at index 3)
```

### Key insight — one half is always sorted

After computing `mid`, at least one of the two halves `[lo, mid]` or `[mid, hi]` is guaranteed to be sorted. Why? Because rotation creates exactly one "break point." If mid is on one side of the break, that half is clean.

```cpp
int search(vector<int>& arr, int target) {
    int lo = 0, hi = arr.size()-1;
    while(lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if(arr[mid] == target) return mid;

        // Which half is sorted?
        if(arr[lo] <= arr[mid]) {
            // Left half [lo..mid] is sorted
            if(arr[lo] <= target && target < arr[mid]) {
                hi = mid - 1;   // target is in sorted left half
            } else {
                lo = mid + 1;   // target must be in right half
            }
        } else {
            // Right half [mid..hi] is sorted
            if(arr[mid] < target && target <= arr[hi]) {
                lo = mid + 1;   // target is in sorted right half
            } else {
                hi = mid - 1;   // target must be in left half
            }
        }
    }
    return -1;
}
```

### Explanation step by step

```
arr = [4, 5, 6, 7, 1, 2, 3], target = 1

Step 1: lo=0, hi=6, mid=3
  arr[mid] = 7 ≠ 1
  arr[lo]=4 <= arr[mid]=7 → left half [4,5,6,7] is sorted
  Is target=1 in [4..7)? No (1 < 4) → search right: lo = 4

Step 2: lo=4, hi=6, mid=5
  arr[mid] = 2 ≠ 1
  arr[lo]=1 <= arr[mid]=2? YES → left half [1,2] is sorted
  Is target=1 in [1..2)? Yes (1 == arr[lo]=1) → search left: hi = 4

Step 3: lo=4, hi=4, mid=4
  arr[mid] = 1 == target → return 4 ✓
```

### Why `arr[lo] <= arr[mid]` and not `arr[lo] < arr[mid]`

When `arr[lo] == arr[mid]`, the array `[lo..mid]` has repeated values. We still treat it as "left half is sorted" (technically it's sorted for our purposes). With strict `<`, we might fail on `[lo] == [mid]` edge cases.

### With duplicates (LC 81)

When duplicates exist, `arr[lo] == arr[mid]` could mean the pivot is anywhere. Handle by incrementing lo:

```cpp
if(arr[lo] == arr[mid] && arr[mid] == arr[hi]) {
    lo++; hi--;  // can't determine which half is sorted
} else if(arr[lo] <= arr[mid]) {
    // left half sorted
    ...
} else {
    // right half sorted
    ...
}
// Time: O(n) worst case with all duplicates, O(log n) average
```

### Find minimum in rotated sorted array

```cpp
int findMin(vector<int>& arr) {
    int lo = 0, hi = arr.size()-1;
    int result = arr[0];
    while(lo <= hi) {
        if(arr[lo] <= arr[hi]) {
            // This segment is sorted — minimum is arr[lo]
            result = min(result, arr[lo]);
            break;
        }
        int mid = lo + (hi-lo)/2;
        result = min(result, arr[mid]);
        if(arr[lo] <= arr[mid]) {
            lo = mid + 1;   // left is sorted, min is in right
        } else {
            hi = mid - 1;   // right is sorted, min is in left
        }
    }
    return result;
}
```

---

## 7. Peak Element

### What problem it solves

Find any peak element — an element greater than its neighbors. A peak always exists in any array with distinct elements (elements at boundaries only have one neighbor).

**Example:** `[1, 2, 3, 1]` → peak is 3 at index 2.

### Why binary search works

If `arr[mid] < arr[mid+1]`, then a peak exists in the right half. Why? Because arr[mid+1] > arr[mid], so moving right, either:
- We keep increasing and hit the right boundary (right boundary is trivially a peak since it has no right neighbor)
- We start decreasing at some point — that turning point is a peak

This monotonicity guarantee allows binary search.

```cpp
int findPeakElement(vector<int>& arr) {
    int lo = 0, hi = arr.size()-1;
    while(lo < hi) {    // note: lo < hi (not <=) to avoid mid+1 out of bounds
        int mid = lo + (hi-lo)/2;
        if(arr[mid] < arr[mid+1]) {
            lo = mid + 1;   // ascending slope → peak is to the right
        } else {
            hi = mid;       // descending slope → peak is at mid or to the left
            // note: hi = mid, NOT mid-1 (mid itself might be the peak)
        }
    }
    return lo;  // lo == hi == peak index
}
```

### Why `lo < hi` here (not `lo <= hi`)

We access `arr[mid+1]`. When `lo == hi`, `mid == lo == hi`, and `mid+1` could be out of bounds. Using `lo < hi` ensures at least two elements when loop runs.

### Why `hi = mid` (not `mid - 1`) in the else branch

`arr[mid]` might itself be the peak. By setting `hi = mid`, we don't exclude it. The loop converges because `lo < hi` ensures `mid < hi`, so `hi = mid` strictly decreases hi.

### Peak in Mountain Array

```cpp
// Find peak of unimodal (mountain) array — goes up then down
int peakIndexInMountainArray(vector<int>& arr) {
    int lo = 0, hi = arr.size()-1;
    while(lo < hi) {
        int mid = lo + (hi-lo)/2;
        if(arr[mid] < arr[mid+1]) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
// Identical logic — mountain array is a special case of peak element
```

---

## 8. Koko Eating Bananas — Classic Search Space

### Problem

Koko has `piles` of bananas. She must eat all bananas in `h` hours. She eats at speed k (bananas/hour) — one pile at a time. Find minimum k.

### Why binary search

- Speed range: [1, max(piles)] (she can always finish at max pile speed)
- Feasibility: given speed k, can she finish in h hours? Monotonic — if k works, k+1 also works.
- We want minimum k → binary search for leftmost feasible.

```cpp
bool canFinish(vector<int>& piles, int h, int k) {
    long long hours = 0;
    for(int p : piles)
        hours += (p + k - 1) / k;   // ceil(p/k) = (p + k - 1) / k
    return hours <= h;
}

int minEatingSpeed(vector<int>& piles, int h) {
    int lo = 1;
    int hi = *max_element(piles.begin(), piles.end());
    int result = hi;

    while(lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if(canFinish(piles, h, mid)) {
            result = mid;    // mid works, try smaller
            hi = mid - 1;
        } else {
            lo = mid + 1;    // mid too slow, need faster
        }
    }
    return result;
}
```

### The ceil division trick

```cpp
// Hours to eat pile p at speed k:
(p + k - 1) / k   // integer ceil division
// Equivalent to ceil(p / k)
// Example: p=5, k=3 → ceil(5/3) = 2 → (5+3-1)/3 = 7/3 = 2 ✓
// Example: p=6, k=3 → ceil(6/3) = 2 → (6+3-1)/3 = 8/3 = 2 ✓
```

**Why not just `p/k + 1`?** That overcounts when `p` is exactly divisible by `k`. The `(p+k-1)/k` formula is exact for all cases.

---

## 9. Book Allocation / Painter's Partition

### Problem

Given `n` books with `pages[]` pages each, allocate to `m` students such that:
- Each student gets at least one contiguous section of books
- Maximize the student who reads the least? No — **Minimize the maximum pages assigned to any student**

### Why binary search

- Answer range: `[max(pages), sum(pages)]`
  - min: at least one student gets the largest single book
  - max: one student reads all books
- Feasibility: can we allocate with maximum `mid` pages per student, using ≤ m students?
- Monotonic: if `mid` works, `mid+1` also works. We want minimum `mid`.

```cpp
bool canAllocate(vector<int>& pages, int m, int maxPages) {
    int students = 1;
    int currPages = 0;
    for(int p : pages) {
        if(p > maxPages) return false;   // single book exceeds limit — impossible
        if(currPages + p > maxPages) {
            students++;          // start new student
            currPages = p;
            if(students > m) return false;
        } else {
            currPages += p;
        }
    }
    return true;
}

int allocateBooks(vector<int>& pages, int m) {
    if(m > pages.size()) return -1;   // more students than books
    int lo = *max_element(pages.begin(), pages.end());
    int hi = accumulate(pages.begin(), pages.end(), 0);
    int result = hi;

    while(lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if(canAllocate(pages, m, mid)) {
            result = mid;
            hi = mid - 1;
        } else {
            lo = mid + 1;
        }
    }
    return result;
}
```

### Why lo = max(pages)?

If we set the per-student maximum below the largest single book, the student with that book can never finish. So any valid answer must be ≥ max(pages). Starting lo here avoids wasting iterations on infeasible answers.

### Greedy allocation in feasibility check

The greedy strategy — assign books to current student until limit exceeded, then start new student — is optimal. Proof: giving fewer books to current student only forces the next student to take more, potentially violating the limit.

---

## 10. Aggressive Cows

### Problem

Place `c` cows in `n` stalls (positions given) such that the **minimum distance between any two cows is maximized**.

### Why binary search

- Answer range: `[1, max_position - min_position]`
- Feasibility: given minimum distance `d`, can we place c cows with all pairwise distances ≥ d?
- Monotonic: if distance `d` works, `d-1` also works. We want maximum `d`.

**For maximization — we want the LAST feasible value**, not the first.

```cpp
bool canPlace(vector<int>& stalls, int c, int minDist) {
    int count = 1;         // place first cow at stalls[0]
    int lastPos = stalls[0];
    for(int i = 1; i < stalls.size(); i++) {
        if(stalls[i] - lastPos >= minDist) {
            count++;
            lastPos = stalls[i];
            if(count == c) return true;
        }
    }
    return false;
}

int aggressiveCows(vector<int>& stalls, int c) {
    sort(stalls.begin(), stalls.end());   // MUST sort first
    int lo = 1;
    int hi = stalls.back() - stalls.front();
    int result = 0;

    while(lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if(canPlace(stalls, c, mid)) {
            result = mid;    // mid works, try LARGER (maximization)
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return result;
}
```

### Maximization vs Minimization — the key difference

```
Minimization (Book Allocation, Koko):
  feasible(mid) = true → result = mid; try smaller: hi = mid - 1
  feasible(mid) = false → try larger: lo = mid + 1

Maximization (Aggressive Cows):
  feasible(mid) = true → result = mid; try LARGER: lo = mid + 1
  feasible(mid) = false → try smaller: hi = mid - 1
```

---

## 11. Things Most People Forget

### 1. Mid computation must be overflow-safe

```cpp
int mid = (lo + hi) / 2;         // OVERFLOW if lo + hi > INT_MAX
int mid = lo + (hi - lo) / 2;   // SAFE — always use this
```

### 2. `lo <= hi` for existence search, `lo < hi` for peak/boundary

```cpp
// Standard search: while(lo <= hi) — loop ends when lo > hi (no elements left)
// Peak element: while(lo < hi)  — needs arr[mid+1], must have mid+1 <= hi
// lower_bound: while(lo < hi)   — hi = n initially, returns hi when done
```

### 3. lower_bound vs upper_bound

```cpp
lower_bound: first index where arr[i] >= target  (≥)
upper_bound: first index where arr[i] > target   (>)

// Count of target in sorted array:
upper_bound - lower_bound

// Last occurrence index:
upper_bound - 1  (only valid if element exists)
```

### 4. Binary search on answer — always sort first

For Aggressive Cows, Book Allocation, and similar problems — **sort the array first**. The feasibility check greedily scans sorted positions.

### 5. Feasibility check: greedy is optimal

In allocation problems (books, painters), the greedy check — "fill current section until limit exceeded, then start new section" — is always optimal. There's no benefit to leaving room in current section.

### 6. For first occurrence — set `hi = mid - 1` when match found

```cpp
// Finding first occurrence
if(arr[mid] == target) {
    result = mid;
    hi = mid - 1;    // keep searching LEFT — don't return immediately
}
```

### 7. For last occurrence — set `lo = mid + 1` when match found

```cpp
// Finding last occurrence
if(arr[mid] == target) {
    result = mid;
    lo = mid + 1;    // keep searching RIGHT — don't return immediately
}
```

### 8. lower_bound on unsorted array = WRONG result

```cpp
// lower_bound requires SORTED input
vector<int> v = {3, 1, 4, 1, 5};
lower_bound(v.begin(), v.end(), 3);   // GARBAGE — array not sorted!
sort(v.begin(), v.end());
lower_bound(v.begin(), v.end(), 3);   // CORRECT
```

### 9. Ceiling division: `(a + b - 1) / b` (not `a/b + 1`)

```cpp
// ceil(a/b) in integer arithmetic:
(a + b - 1) / b    // correct for all cases
a/b + 1            // WRONG when b divides a exactly: ceil(6/2) = 3, but 6/2+1 = 4
```

### 10. Rotated array: `arr[lo] <= arr[mid]` uses `<=` not `<`

When `arr[lo] == arr[mid]`, the left half still has consistent comparison for our purposes. Using `<` could cause incorrect determination of which half is sorted.

### 11. Peak element: `hi = mid` not `hi = mid - 1`

When `arr[mid] >= arr[mid+1]` (peak could be at mid itself):
```cpp
hi = mid;     // CORRECT — mid could be the peak
hi = mid - 1; // WRONG — might miss the peak at mid
```

### 12. Binary search space problems: define lo and hi carefully

```
Book Allocation:
  lo = max(pages)    ← NOT 1 (single book can't be split)
  hi = sum(pages)    ← one student reads all

Aggressive Cows:
  lo = 1             ← minimum possible distance
  hi = stalls[n-1] - stalls[0]  ← maximum possible distance
```

---

## 13. Final Revision Sheet

### All Templates — Quick Reference

```cpp
// ===== STANDARD BINARY SEARCH =====
int binarySearch(vector<int>& arr, int target) {
    int lo = 0, hi = arr.size()-1;
    while(lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if(arr[mid] == target) return mid;
        arr[mid] < target ? lo = mid+1 : hi = mid-1;
    }
    return -1;
}

// ===== FIRST OCCURRENCE =====
int findFirst(vector<int>& arr, int target) {
    int lo = 0, hi = arr.size()-1, res = -1;
    while(lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if(arr[mid] == target) { res = mid; hi = mid-1; }  // search left
        else if(arr[mid] < target) lo = mid+1;
        else hi = mid-1;
    }
    return res;
}

// ===== LAST OCCURRENCE =====
int findLast(vector<int>& arr, int target) {
    int lo = 0, hi = arr.size()-1, res = -1;
    while(lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if(arr[mid] == target) { res = mid; lo = mid+1; }  // search right
        else if(arr[mid] < target) lo = mid+1;
        else hi = mid-1;
    }
    return res;
}

// ===== LOWER BOUND (manual) =====
int lowerBound(vector<int>& arr, int target) {
    int lo = 0, hi = arr.size();
    while(lo < hi) {
        int mid = lo + (hi-lo)/2;
        arr[mid] < target ? lo = mid+1 : hi = mid;
    }
    return lo;  // first index where arr[i] >= target; arr.size() if none
}

// ===== UPPER BOUND (manual) =====
int upperBound(vector<int>& arr, int target) {
    int lo = 0, hi = arr.size();
    while(lo < hi) {
        int mid = lo + (hi-lo)/2;
        arr[mid] <= target ? lo = mid+1 : hi = mid;
    }
    return lo;  // first index where arr[i] > target; arr.size() if none
}

// ===== SEARCH IN ROTATED SORTED ARRAY =====
int searchRotated(vector<int>& arr, int target) {
    int lo = 0, hi = arr.size()-1;
    while(lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if(arr[mid] == target) return mid;
        if(arr[lo] <= arr[mid]) {   // left sorted
            (arr[lo] <= target && target < arr[mid]) ? hi = mid-1 : lo = mid+1;
        } else {                    // right sorted
            (arr[mid] < target && target <= arr[hi]) ? lo = mid+1 : hi = mid-1;
        }
    }
    return -1;
}

// ===== PEAK ELEMENT =====
int peakElement(vector<int>& arr) {
    int lo = 0, hi = arr.size()-1;
    while(lo < hi) {
        int mid = lo + (hi-lo)/2;
        arr[mid] < arr[mid+1] ? lo = mid+1 : hi = mid;
    }
    return lo;
}

// ===== BINARY SEARCH ON ANSWER (Minimize) =====
// Lo = min possible answer, Hi = max possible answer
// feasible(mid) → can we achieve with limit mid?
int bsOnAnswer_minimize(vector<int>& arr, int param) {
    int lo = /* min */, hi = /* max */, res = hi;
    while(lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if(feasible(arr, param, mid)) { res = mid; hi = mid-1; }
        else lo = mid+1;
    }
    return res;
}

// ===== BINARY SEARCH ON ANSWER (Maximize) =====
int bsOnAnswer_maximize(vector<int>& arr, int param) {
    int lo = /* min */, hi = /* max */, res = lo;
    while(lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if(feasible(arr, param, mid)) { res = mid; lo = mid+1; }
        else hi = mid-1;
    }
    return res;
}

// ===== BOOK ALLOCATION (feasibility check) =====
bool canAllocate(vector<int>& pages, int m, int maxPages) {
    int students = 1, curr = 0;
    for(int p : pages) {
        if(p > maxPages) return false;
        if(curr + p > maxPages) { students++; curr = p; }
        else curr += p;
        if(students > m) return false;
    }
    return true;
}

// ===== KOKO (feasibility check) =====
bool canFinish(vector<int>& piles, int h, int k) {
    long long hours = 0;
    for(int p : piles) hours += (p + k - 1) / k;
    return hours <= h;
}

// ===== AGGRESSIVE COWS (feasibility check) =====
bool canPlace(vector<int>& stalls, int c, int minDist) {
    int count = 1, last = stalls[0];
    for(int i = 1; i < stalls.size(); i++) {
        if(stalls[i] - last >= minDist) { count++; last = stalls[i]; }
        if(count == c) return true;
    }
    return false;
}
```

### Complexity Cheatsheet

| Problem | Time | Space | Key Insight |
|---------|------|-------|-------------|
| Standard binary search | O(log n) | O(1) | `lo + (hi-lo)/2` |
| First/Last occurrence | O(log n) | O(1) | Don't return on match |
| Rotated sorted array search | O(log n) | O(1) | One half is always sorted |
| Peak element | O(log n) | O(1) | Ascending slope → peak right |
| Binary search on answer | O(n log(hi-lo)) | O(1) | Define lo, hi, feasibility |
| Book allocation | O(n log(sum)) | O(1) | Greedy feasibility check |
| Aggressive cows | O(n log(range)) | O(1) | Sort + greedy placement |
| Koko eating bananas | O(n log(max)) | O(1) | Ceil division in check |

### Decision Guide — Which variant to use?

```
"Find element in sorted array"
  → Standard binary search

"Find first/last index of element"
  → Modified BS with result variable (or lower_bound/upper_bound)

"Find element in rotated sorted array"
  → Rotated BS — determine which half is sorted

"Find peak / mountain top"
  → Peak variant: while(lo < hi), hi = mid (not mid-1)

"Minimize the maximum / find minimum feasible value"
  → Binary search on answer — feasible? hi = mid-1. Else lo = mid+1.

"Maximize the minimum / find maximum feasible value"
  → Binary search on answer — feasible? lo = mid+1. Else hi = mid-1.
```

### Interview Checklist

- [ ] Do I always use `lo + (hi-lo)/2`? (never `(lo+hi)/2`)
- [ ] Do I use `lo <= hi` for standard search and `lo < hi` for peak element?
- [ ] Can I write first/last occurrence without returning immediately on match?
- [ ] Can I explain lower_bound vs upper_bound and implement both?
- [ ] Can I search in rotated sorted array and determine which half is sorted?
- [ ] Do I use `arr[lo] <= arr[mid]` (with `<=`) for rotated array?
- [ ] For peak: do I use `hi = mid` (not `mid - 1`) in the descending case?
- [ ] Can I formulate a binary search on answer problem: define lo, hi, feasibility check?
- [ ] Do I know which direction to adjust result for minimization vs maximization?
- [ ] Do I use `(p + k - 1) / k` for ceiling division?
- [ ] For book allocation: is `lo = max(pages)`, not 1?
- [ ] For aggressive cows: do I sort the stalls first?

### Key Insights for Interviews

1. **Binary search on answer eliminates O(n²) or O(n³) solutions** — if you see "minimize the maximum" or "maximize the minimum," always think binary search on answer
2. **Feasibility check must be O(n) or better** — otherwise overall time is O(n² log n), which may not be improvement
3. **Greedy feasibility is provably optimal** — in allocation problems, greedy fill is always the optimal strategy for the check
4. **Rotated array: exactly one sorted half always exists** — use this invariant, not just "try both"
5. **lower_bound returns an iterator/index even when element not found** — always check `*it != target` or `idx < n`
6. **Binary search needs sorted input for standard use** — but search space problems don't need a sorted array (the answer space itself is the monotone space)

---

*Chapter 04 — Binary Search | Part of DSA Interview Prep series*  
*Based on Striver's A2Z Sheet + Love Babbar lecture series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] Binary Search — https://leetcode.com/problems/binary-search/
- [ ] Lower Bound — https://www.geeksforgeeks.org/problems/floor-in-a-sorted-array-1587115620/1
- [ ] Upper Bound — https://www.geeksforgeeks.org/problems/ceil-the-floor2802/1
- [ ] Search Insert Position — https://leetcode.com/problems/search-insert-position/
- [ ] Floor and Ceil in Sorted Array — https://www.geeksforgeeks.org/problems/ceil-the-floor2802/1
- [ ] First and Last Occurrence — https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/
- [ ] Count Occurrences in a Sorted Array — https://www.geeksforgeeks.org/problems/number-of-occurrence2259/1
- [ ] Search in Rotated Sorted Array I — https://leetcode.com/problems/search-in-rotated-sorted-array/
- [ ] Search in Rotated Sorted Array II — https://leetcode.com/problems/search-in-rotated-sorted-array-ii/
- [ ] Find Minimum in Rotated Sorted Array — https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/
- [ ] Find how many times array is rotated — https://www.geeksforgeeks.org/problems/rotation4723/1
- [ ] Single Element in a Sorted Array — https://leetcode.com/problems/single-element-in-a-sorted-array/
- [ ] Find Peak Element — https://leetcode.com/problems/find-peak-element/
- [ ] Find Square Root of a Number — https://www.geeksforgeeks.org/problems/square-root/1
- [ ] Find Nth Root of a Number — https://www.geeksforgeeks.org/problems/find-nth-root-of-m5843/1
- [ ] Koko Eating Bananas — https://leetcode.com/problems/koko-eating-bananas/
- [ ] Minimum Days to Make M Bouquets — https://leetcode.com/problems/minimum-number-of-days-to-make-m-bouquets/
- [ ] Find the Smallest Divisor — https://leetcode.com/problems/find-the-smallest-divisor-given-a-threshold/
- [ ] Capacity to Ship Packages Within D Days — https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/
- [ ] Kth Missing Positive Number — https://leetcode.com/problems/kth-missing-positive-number/
- [ ] Aggressive Cows — https://www.geeksforgeeks.org/problems/aggressive-cows/1
- [ ] Book Allocation Problem — https://www.geeksforgeeks.org/problems/allocate-minimum-number-of-pages0937/1
- [ ] Split Array Largest Sum — https://leetcode.com/problems/split-array-largest-sum/
- [ ] Painter's Partition — https://www.geeksforgeeks.org/problems/the-painter-s-partition-problem1535/1
- [ ] Minimize Max Distance to Gas Station — https://leetcode.com/problems/minimize-max-distance-to-gas-station/
- [ ] Median of Two Sorted Arrays — https://leetcode.com/problems/median-of-two-sorted-arrays/
- [ ] Kth Element of Two Sorted Arrays — https://www.geeksforgeeks.org/problems/k-th-element-of-two-sorted-array1317/1
- [ ] Find Row with Maximum 1s — https://www.geeksforgeeks.org/problems/row-with-max-1s0023/1
- [ ] Search in a 2D Matrix — https://leetcode.com/problems/search-a-2d-matrix/
- [ ] Search in 2D Matrix II — https://leetcode.com/problems/search-a-2d-matrix-ii/
- [ ] Find Peak Element II — https://leetcode.com/problems/find-a-peak-element-ii/
- [ ] Matrix Median — https://www.geeksforgeeks.org/problems/median-in-a-row-wise-sorted-matrix1527/1
- [ ] Peak Index in a Mountain Array — https://leetcode.com/problems/peak-index-in-a-mountain-array/

