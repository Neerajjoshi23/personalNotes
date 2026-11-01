# Chapter 03 — Arrays

> **Revision target:** 1 day  
> **Goal:** After reading this file, you need nothing else for this topic — no code files, no YouTube, no tutorials.

---

## Table of Contents

1. [Array Fundamentals](#1-array-fundamentals)
2. [Array Scope — Pass by Pointer](#2-array-scope--pass-by-pointer)
3. [Linear Search](#3-linear-search)
4. [Max and Min](#4-max-and-min)
5. [Reverse an Array](#5-reverse-an-array)
6. [Prefix Sum](#6-prefix-sum)
7. [Difference Array](#7-difference-array)
8. [Kadane's Algorithm — Maximum Subarray Sum](#8-kadanes-algorithm--maximum-subarray-sum)
9. [Two Pointer Technique](#9-two-pointer-technique)
10. [Dutch National Flag (3-Way Partition)](#10-dutch-national-flag-3-way-partition)
11. [2D Arrays — Matrix Fundamentals](#11-2d-arrays--matrix-fundamentals)
12. [Matrix — Spiral Print](#12-matrix--spiral-print)
13. [Matrix — Rotate 90 Degrees](#13-matrix--rotate-90-degrees)
14. [Matrix — Wave Print](#14-matrix--wave-print)
15. [Matrix — Search](#15-matrix--search)
16. [Things Most People Forget](#16-things-most-people-forget)
17. [Practice Problems](#17-practice-problems)
18. [Final Revision Sheet](#18-final-revision-sheet)

---

## 1. Array Fundamentals

### Declaration, Initialization, and Size

```cpp
// Declaration — uninitialized, contains garbage values
int number[15];

// Partial initialization — rest are 0
int third[15] = {2, 7};    // {2, 7, 0, 0, 0, ..., 0}

// All zeros
int fourth[10] = {0};       // {0, 0, 0, ..., 0}

// All-1 trap — ONLY first element becomes 1
int fifth[10] = {1};        // {1, 0, 0, ..., 0} — NOT all ones!

// Full initialization
int second[3] = {5, 7, 11};

// Char array
char ch[5] = {'a', 'b', 'c', 'r', 'p'};

// Get size of array (ONLY works in the same scope where declared)
int size = sizeof(arr) / sizeof(int);
```

**From your code (1DArray/arrayIntro.cpp):** Key traps demonstrated:
1. `int fifth[10] = {1}` — does NOT initialize all elements to 1. It initializes the first to 1 and the rest to 0. To initialize all to the same non-zero value, use `fill()` or `memset`.
2. Accessing `number[14]` on an uninitialized array — gives garbage (undefined behavior in C++). In practice you see random values.
3. `3e9 > 2147483647` check shows that 3e9 exceeds INT_MAX — a reminder to use `long long`.

### Array Memory Layout

```
int arr[5] = {10, 20, 30, 40, 50};

Memory (each int = 4 bytes):
Address:  1000  1004  1008  1012  1016
Value:      10    20    30    40    50
Index:       0     1     2     3     4

arr         → pointer to address 1000 (first element)
arr + 1     → address 1004 (second element)
*(arr + i)  → same as arr[i]
```

**Key insight:** Arrays are contiguous in memory. `arr[i]` is syntactic sugar for `*(arr + i)`. This is why arrays support O(1) random access — just compute the address.

### How to initialize all elements to same non-zero value

```cpp
// Method 1: memset (works for 0 and -1 only, due to byte-level filling)
int arr[100];
memset(arr, 0, sizeof(arr));    // all zeros
memset(arr, -1, sizeof(arr));   // all -1 (each byte becomes 0xFF, int = -1 in two's complement)

// Method 2: fill (works for any value)
int arr[100];
fill(arr, arr + 100, 7);        // all 7s

// Method 3: vector with value
vector<int> v(100, 7);          // 100 elements all = 7

// Method 4: loop
for(int i = 0; i < 100; i++) arr[i] = 7;
```

### Static vs Dynamic Array

```cpp
// Static array — size must be known at compile time
int arr[100];           // stack allocated, size fixed

// Dynamic array — size can be runtime variable
int n;
cin >> n;
int* arr = new int[n];  // heap allocated
// ... use arr ...
delete[] arr;           // must free

// Preferred: use vector
vector<int> arr(n);     // no manual memory management
```

**Interview rule:** In interview code, use `vector<int>` over raw arrays unless you have a specific reason. It's safer and has no size limitations.

---

## 2. Array Scope — Pass by Pointer

### Why arrays are "pass by pointer"

When you pass an array to a function, you don't pass the full array — you pass a **pointer to the first element**. This means:
1. The function can modify the original array (changes persist)
2. `sizeof(arr)` inside the function gives pointer size (8 bytes), NOT array size

```cpp
void update(int arr[], int n) {
    arr[0] = 120;    // modifies the original array in main!
}

int main() {
    int arr[3] = {1, 2, 3};
    update(arr, 3);
    // arr is now {120, 2, 3} — modified!
    cout << arr[0];   // 120
}
```

**From your code (1DArray/arrayScope.cpp):** The demonstration shows that `update(arr, 3)` changes `arr[0]` in main. This proves arrays are "passed by pointer" — the function receives the address of the first element, not a copy. Any change via that pointer affects the original.

### The sizeof trap

```cpp
void foo(int arr[], int n) {
    cout << sizeof(arr);   // prints 8 (pointer size), NOT n * 4
    // You CANNOT get array size inside a function from the array alone
    // Always pass n separately
}

int arr[10];
cout << sizeof(arr);   // prints 40 (10 * 4) — correct!
```

**This is a classic interview question:** "How do you get the size of an array passed to a function?" Answer: You can't from the array pointer alone — always pass size as a parameter.

### Arrays vs Vectors in functions

```cpp
// Array — implicitly passes pointer, caller's array is modified
void f(int arr[], int n) { arr[0] = 99; }  // modifies original

// Vector — passes by VALUE, copy is made
void f(vector<int> v) { v[0] = 99; }      // does NOT modify original

// Vector by reference — modifies original
void f(vector<int>& v) { v[0] = 99; }     // modifies original

// Vector by const reference — read only, no copy cost
void f(const vector<int>& v) { }          // preferred for reading
```

---

## 3. Linear Search

### What problem it solves

Find whether an element exists in an array (or find its index/first occurrence).

```cpp
bool search(int arr[], int size, int key) {
    for(int i = 0; i < size; i++) {
        if(arr[i] == key) return true;  // found
    }
    return false;  // not found
}
```

**From your code (1DArray/linearSearch.cpp):** Simple but important — returns `true`/`false`. In practice, you often want the index, not just existence.

### Returning index vs existence

```cpp
// Return index of first occurrence, -1 if not found
int linearSearch(int arr[], int size, int key) {
    for(int i = 0; i < size; i++)
        if(arr[i] == key) return i;
    return -1;
}

// Find all occurrences
vector<int> findAll(vector<int>& arr, int key) {
    vector<int> indices;
    for(int i = 0; i < arr.size(); i++)
        if(arr[i] == key) indices.push_back(i);
    return indices;
}
```

### Complexity

- **Time:** O(n) — must scan all elements in worst case
- **Space:** O(1)
- **When to use:** Unsorted arrays. For sorted arrays, binary search is O(log n).

### Pattern identification

> If the array is **unsorted** and you need to find something: Linear Search. O(n) is the best you can do.

---

## 4. Max and Min

### Finding maximum and minimum

```cpp
int getMax(int num[], int n) {
    int maxi = INT_MIN;     // start with smallest possible value
    for(int i = 0; i < n; i++)
        maxi = max(maxi, num[i]);
    return maxi;
}

int getMin(int num[], int n) {
    int mini = INT_MAX;     // start with largest possible value
    for(int i = 0; i < n; i++)
        mini = min(mini, num[i]);
    return mini;
}
```

**From your code (1DArray/maxMin.cpp):** Starting `maxi` at `INT_MIN` and `mini` at `INT_MAX` is important. If you start at 0:
- `getMax` would return 0 for an all-negative array like `{-5, -3, -8}`
- `getMin` would return 0 for an all-positive array like `{5, 3, 8}`

`INT_MIN` = -2,147,483,648 and `INT_MAX` = 2,147,483,647 (from `<climits>`).

### Common variation — index of max/min

```cpp
int getMaxIndex(int arr[], int n) {
    int maxIdx = 0;
    for(int i = 1; i < n; i++)
        if(arr[i] > arr[maxIdx]) maxIdx = i;
    return maxIdx;
}
```

### Simultaneous max and min in ~1.5n comparisons

```cpp
// Standard: 2(n-1) comparisons
// Optimal: process pairs — 3n/2 comparisons total
pair<int,int> minMax(vector<int>& arr) {
    int mini = INT_MAX, maxi = INT_MIN;
    int n = arr.size();
    int start = 0;
    if(n % 2 == 1) { mini = maxi = arr[0]; start = 1; }
    for(int i = start; i < n-1; i += 2) {
        if(arr[i] < arr[i+1]) { mini = min(mini, arr[i]); maxi = max(maxi, arr[i+1]); }
        else                  { mini = min(mini, arr[i+1]); maxi = max(maxi, arr[i]); }
    }
    return {mini, maxi};
}
```

---

## 5. Reverse an Array

### Two-pointer reversal (in-place)

```cpp
void reverse(int arr[], int n) {
    int start = 0;
    int end = n - 1;
    while(start <= end) {
        swap(arr[start], arr[end]);
        start++;
        end--;
    }
}
```

**From your code (1DArray/reverse.cpp):** The two-pointer approach is the canonical in-place reversal. Works for both even and odd lengths:
- Even (n=6): swaps pairs (0,5), (1,4), (2,3) — 3 swaps
- Odd (n=5): swaps (0,4), (1,3), then start > end when both equal 2 — stops without swapping middle

**Why `start <= end` not `start < end`?** For odd length, when start == end == middle element, the swap is a no-op (swapping with itself), so `<=` is fine and handles edge cases cleanly.

### STL alternatives

```cpp
reverse(arr, arr+n);           // array
reverse(v.begin(), v.end());   // vector
```

### Reverse a subarray

```cpp
// Reverse arr[l..r]
reverse(arr+l, arr+r+1);   // array pointer arithmetic
reverse(v.begin()+l, v.begin()+r+1);  // vector
```

### Key application — rotation

```cpp
// Left rotate array by k positions using reversal trick
// Approach: reverse first k, reverse rest, reverse all
void leftRotate(vector<int>& arr, int k) {
    int n = arr.size();
    k = k % n;                              // handle k > n
    reverse(arr.begin(), arr.begin()+k);    // reverse first k elements
    reverse(arr.begin()+k, arr.end());      // reverse remaining n-k elements
    reverse(arr.begin(), arr.end());        // reverse entire array
}
// Time: O(n), Space: O(1)
```

---

## 6. Prefix Sum

**Your codebase has no prefix sum code** — complete explanation written here.

### What problem it solves

Answer range sum queries — "what is the sum of elements from index l to r?" — in O(1) after O(n) preprocessing.

### Without prefix sum: O(n) per query

```cpp
int rangeSum(int arr[], int l, int r) {
    int sum = 0;
    for(int i = l; i <= r; i++) sum += arr[i];
    return sum;
}
// O(n) per query — if Q queries, O(nQ) total
```

### With prefix sum: O(1) per query

```cpp
// Preprocessing — O(n)
int prefix[n+1];
prefix[0] = 0;
for(int i = 0; i < n; i++) prefix[i+1] = prefix[i] + arr[i];

// Query — O(1)
int rangeSum(int l, int r) {
    return prefix[r+1] - prefix[l];
}
```

**Intuition:** `prefix[i]` = sum of `arr[0..i-1]`. So sum from `l` to `r` = `prefix[r+1] - prefix[l]`. Think of it as: total sum up to r+1, minus total sum up to l. What remains is the window `[l, r]`.

### Visualization

```
arr:     [3, 1, 4, 1, 5, 9, 2, 6]
index:    0  1  2  3  4  5  6  7

prefix:  [0, 3, 4, 8, 9, 14, 23, 25, 31]
index:    0  1  2  3  4   5   6   7   8

Sum from index 2 to 5:
= prefix[6] - prefix[2]
= 23 - 4
= 19   ✓ (4+1+5+9 = 19)
```

### 1-indexed prefix sum (alternative, cleaner for problems)

```cpp
prefix[i] = prefix[i-1] + arr[i];   // 1-indexed: arr[1..n]
// Query sum from l to r: prefix[r] - prefix[l-1]
```

### 2D Prefix Sum (matrix)

```cpp
// Build
vector<vector<int>> psum(n+1, vector<int>(m+1, 0));
for(int i = 1; i <= n; i++)
    for(int j = 1; j <= m; j++)
        psum[i][j] = arr[i-1][j-1] + psum[i-1][j] + psum[i][j-1] - psum[i-1][j-1];

// Query: sum of submatrix from (r1,c1) to (r2,c2) (1-indexed)
int submatrixSum(int r1, int c1, int r2, int c2) {
    return psum[r2][c2] - psum[r1-1][c2] - psum[r2][c1-1] + psum[r1-1][c1-1];
}
```

**Inclusion-exclusion for 2D:** Add the full rectangle, subtract the left part and top part (both subtracted the top-left corner twice), add it back once.

### When to use prefix sum

> "Range sum query," "sum of subarray," "sum in a window" → Prefix sum is usually the answer.

### Common Mistakes

```cpp
// MISTAKE 1: Off by one
prefix[r] - prefix[l-1]    // if 1-indexed: sum from l to r ✓
prefix[r+1] - prefix[l]    // if 0-indexed: sum from l to r ✓
prefix[r] - prefix[l]      // WRONG — excludes arr[l]

// MISTAKE 2: Overflow
int prefix[n+1];   // might overflow for large arrays of large values
long long prefix[n+1];   // safer

// MISTAKE 3: Not starting with 0
// Always prefix[0] = 0 (or prefix[-1] = 0 conceptually)
// This allows query for range starting at index 0
```

---

## 7. Difference Array

**Your codebase has no difference array code** — complete explanation written here.

### What problem it solves

Perform range updates efficiently — "add value `v` to all elements in range `[l, r]`" — in O(1) per update instead of O(n).

### Without difference array: O(n) per update

```cpp
// Add v to arr[l..r] — naive
for(int i = l; i <= r; i++) arr[i] += v;   // O(n) per update
```

### With difference array: O(1) per update, O(n) reconstruction

```cpp
// Build difference array (diff[i] = arr[i] - arr[i-1])
int diff[n+1] = {0};  // size n+1 for safety

// Range update: add v to arr[l..r]
diff[l] += v;
diff[r+1] -= v;      // r+1 might be n — that's why size is n+1

// After all updates, reconstruct the array
int curr = 0;
for(int i = 0; i < n; i++) {
    curr += diff[i];
    arr[i] = curr;  // or original_arr[i] + curr if tracking deltas
}
```

**Intuition:** `diff[l] += v` marks "start adding v at index l." `diff[r+1] -= v` marks "stop adding v after index r." When you take prefix sum of diff array, the +v propagates from l to r and cancels at r+1.

### Example

```
arr = [1, 2, 3, 4, 5]
Range update 1: add 10 to [1, 3]  → diff: [0, +10, 0, 0, -10, 0]
Range update 2: add 5  to [2, 4]  → diff: [0, +10, +5, 0, -10, -5]  (but wait, index 4+1=5)

diff after updates: [0, 10, 5, 0, -10, -5]
prefix sum of diff: [0, 10, 15, 15, 5, 0]
Final arr:         [1, 12, 18, 19, 9, 5]

Verify: arr[1] should be 2+10=12 ✓, arr[2] should be 3+10+5=18 ✓
```

### When to use difference array

> "Multiple range updates, then read the final array" → Difference array is the answer.

```
Q update operations, each O(1): O(Q) total for updates
1 reconstruction pass: O(n)
Total: O(Q + n) vs O(Q * n) brute force
```

### Common Mistakes

```cpp
// MISTAKE 1: diff array too small
int diff[n];    // if r can be n-1, diff[r+1] = diff[n] → out of bounds!
int diff[n+1];  // correct

// MISTAKE 2: Forgetting reconstruction
// diff array is NOT the final array — must take prefix sum

// MISTAKE 3: Wrong bounds
diff[l] += v;
diff[r] -= v;    // WRONG — this cancels at r, not after r
diff[r+1] -= v;  // CORRECT — cancels after r
```

---

## 8. Kadane's Algorithm — Maximum Subarray Sum

**Your codebase has no Kadane's code** — complete explanation written here.

### What problem it solves

Find the contiguous subarray with the maximum sum.

**Example:** `[-2, 1, -3, 4, -1, 2, 1, -5, 4]` → max subarray is `[4, -1, 2, 1]` with sum 6.

### Brute force — O(n²)

```cpp
int maxSubarrayBrute(vector<int>& arr) {
    int maxSum = INT_MIN;
    for(int i = 0; i < arr.size(); i++) {
        int currSum = 0;
        for(int j = i; j < arr.size(); j++) {
            currSum += arr[j];
            maxSum = max(maxSum, currSum);
        }
    }
    return maxSum;
}
```

### Kadane's Algorithm — O(n)

```cpp
int maxSubarray(vector<int>& arr) {
    int maxSum = INT_MIN;  // handles all-negative case
    int currSum = 0;
    for(int i = 0; i < arr.size(); i++) {
        currSum += arr[i];
        maxSum = max(maxSum, currSum);
        if(currSum < 0) currSum = 0;  // reset: don't carry negative prefix
    }
    return maxSum;
}
```

### The KEY insight — why it works

At each position, you decide: should I include previous elements or start fresh here?
- If `currSum + arr[i]` > `arr[i]` alone → include previous (currSum > 0)
- If `currSum + arr[i]` < `arr[i]` alone → start fresh (currSum < 0)

So: if `currSum` goes negative, reset to 0. Starting fresh from any position costs nothing.

**Formal reasoning (DP perspective):**  
`dp[i]` = max subarray sum ending at index `i`
- `dp[i] = max(arr[i], dp[i-1] + arr[i])`
- `= arr[i] + max(0, dp[i-1])` — if dp[i-1] > 0, extend; else start fresh
- Kadane's is this DP compressed to O(1) space.

### Tracking the actual subarray (indices)

```cpp
int maxSubarrayWithIndices(vector<int>& arr) {
    int maxSum = INT_MIN, currSum = 0;
    int start = 0, end = 0, tempStart = 0;
    for(int i = 0; i < arr.size(); i++) {
        currSum += arr[i];
        if(currSum > maxSum) {
            maxSum = currSum;
            start = tempStart;
            end = i;
        }
        if(currSum < 0) {
            currSum = 0;
            tempStart = i + 1;  // next subarray candidate starts here
        }
    }
    // Subarray is arr[start..end]
    return maxSum;
}
```

### Edge cases

```cpp
// All negative — should return the least negative (single element)
// Kadane's handles this correctly IF you initialize maxSum = INT_MIN (not 0)
// and DON'T reset currSum to 0 before updating maxSum

arr = [-3, -1, -4, -2]  →  maxSum = -1  (single element -1)

// Single element
arr = [5]  →  maxSum = 5

// All positive — entire array
arr = [1, 2, 3]  →  maxSum = 6
```

### Common Mistakes

```cpp
// MISTAKE 1: Initialize maxSum = 0 (wrong for all-negative arrays)
int maxSum = 0;     // WRONG — returns 0 for {-5, -3, -1}, should return -1
int maxSum = INT_MIN;   // CORRECT

// MISTAKE 2: Update maxSum AFTER resetting currSum
currSum += arr[i];
if(currSum < 0) currSum = 0;   // resets before updating maxSum
maxSum = max(maxSum, currSum);  // always 0 now if curr was negative — WRONG

// CORRECT order:
currSum += arr[i];
maxSum = max(maxSum, currSum);  // update maxSum FIRST
if(currSum < 0) currSum = 0;   // THEN reset if negative
```

### Variants

```cpp
// Maximum circular subarray sum
// Key insight: max circular sum = max(normal max sum, total sum - min subarray sum)
int maxCircularSum(vector<int>& arr) {
    int total = 0;
    for(int x : arr) total += x;
    int maxNormal = kadane(arr);
    // Negate all elements, find max subarray (= min subarray of original)
    for(int& x : arr) x = -x;
    int maxInverted = kadane(arr);
    int maxCircular = total + maxInverted;  // total - minSubarraySum
    if(maxCircular == 0) return maxNormal;  // all elements negative
    return max(maxNormal, maxCircular);
}
```

---

## 9. Two Pointer Technique

**Your codebase has no two-pointer code** — complete explanation written here.

### What it is

Two pointers moving through an array, usually converging from both ends or both moving in the same direction. Reduces O(n²) brute force to O(n).

### Pattern 1: Converging Pointers (sorted array)

Pointers start at opposite ends and move toward each other.

```cpp
// Pair Sum — find if any pair sums to target
bool pairSum(vector<int>& arr, int target) {
    sort(arr.begin(), arr.end());
    int lo = 0, hi = arr.size()-1;
    while(lo < hi) {
        int sum = arr[lo] + arr[hi];
        if(sum == target) return true;
        else if(sum < target) lo++;   // need larger sum → move lo right
        else hi--;                    // need smaller sum → move hi left
    }
    return false;
}
```

**Why it works:** In sorted array, if sum is too small, the only way to increase it is to increase the left element (lo++). If too large, decrease right element (hi--). We never need to revisit positions.

### Pattern 2: Same Direction Pointers (sliding window)

Both pointers move left to right, maintaining a window.

```cpp
// Longest subarray with sum <= k (all positive elements)
int longestSubarray(vector<int>& arr, int k) {
    int lo = 0, currSum = 0, maxLen = 0;
    for(int hi = 0; hi < arr.size(); hi++) {
        currSum += arr[hi];           // expand window
        while(currSum > k) {
            currSum -= arr[lo];       // shrink window
            lo++;
        }
        maxLen = max(maxLen, hi - lo + 1);
    }
    return maxLen;
}
```

### Pattern 3: Trapping Rain Water (two pointer + max tracking)

```cpp
int trap(vector<int>& height) {
    int lo = 0, hi = height.size()-1;
    int leftMax = 0, rightMax = 0;
    int water = 0;
    while(lo <= hi) {
        if(height[lo] <= height[hi]) {
            if(height[lo] >= leftMax) leftMax = height[lo];
            else water += leftMax - height[lo];
            lo++;
        } else {
            if(height[hi] >= rightMax) rightMax = height[hi];
            else water += rightMax - height[hi];
            hi--;
        }
    }
    return water;
}
```

**Intuition for Trapping Rain Water:** Water at position i is `min(maxLeft[i], maxRight[i]) - height[i]`. The two-pointer approach maintains running maxLeft and maxRight — when we process from the side with smaller height, we can guarantee the other side's max is at least as large.

### When to use two pointers

> "Sorted array, find pairs/triplets summing to target" → Converging pointers  
> "Contiguous subarray with some constraint" → Sliding window  
> "Two arrays, merge/intersection" → Two pointers on two arrays

---

## 10. Dutch National Flag (3-Way Partition)

*(Full theory in Chapter 02 — Sorting. Quick reference here.)*

### Template

```cpp
void dnf(vector<int>& arr) {
    int lo = 0, mid = 0, hi = arr.size()-1;
    while(mid <= hi) {
        if(arr[mid] == 0)      swap(arr[lo++], arr[mid++]);
        else if(arr[mid] == 1) mid++;
        else                   swap(arr[mid], arr[hi--]);
        // NOTE: no mid++ when swapping with hi
    }
}
```

### Generalizing to any three-value partition

```cpp
// Partition into: < x, == x, > x
void threeWay(vector<int>& arr, int x) {
    int lo = 0, mid = 0, hi = arr.size()-1;
    while(mid <= hi) {
        if(arr[mid] < x)       swap(arr[lo++], arr[mid++]);
        else if(arr[mid] == x) mid++;
        else                   swap(arr[mid], arr[hi--]);
    }
}
```

---

## 11. 2D Arrays — Matrix Fundamentals

### Declaration and Input

```cpp
int arr[3][3];   // static 2D array — row × col

// Input — row-wise (standard)
for(int row = 0; row < 3; row++)
    for(int col = 0; col < 3; col++)
        cin >> arr[row][col];

// Input — column-wise (transposed input)
for(int col = 0; col < 3; col++)
    for(int row = 0; row < 3; row++)
        cin >> arr[row][col];

// Dynamic 2D vector
int n = 3, m = 4;
vector<vector<int>> grid(n, vector<int>(m, 0));
```

**From your code (2dArray/intro.cpp):** Row-wise input is the standard. Column-wise input fills the same matrix but reads data in a different order — a common source of confusion when the input format specifies column-major order.

### Memory layout of 2D array

```
int arr[3][4] — stored in row-major order:
arr[0][0], arr[0][1], arr[0][2], arr[0][3],   ← row 0
arr[1][0], arr[1][1], arr[1][2], arr[1][3],   ← row 1
arr[2][0], arr[2][1], arr[2][2], arr[2][3]    ← row 2
```

Access `arr[i][j]` at address: `base + (i * cols + j) * element_size`

### Row Sum, Column Sum, Search

```cpp
// Row sum
void printRowSums(int arr[][3], int rows, int cols) {
    for(int row = 0; row < rows; row++) {
        int sum = 0;
        for(int col = 0; col < cols; col++) sum += arr[row][col];
        cout << sum << " ";
    }
}

// Column sum (note: outer loop on col, inner on row)
void printColSums(int arr[][3], int rows, int cols) {
    for(int col = 0; col < cols; col++) {
        int sum = 0;
        for(int row = 0; row < rows; row++) sum += arr[row][col];
        cout << sum << " ";
    }
}

// Search in 2D (unsorted)
bool isPresent(int arr[][3], int target, int rows, int cols) {
    for(int row = 0; row < rows; row++)
        for(int col = 0; col < cols; col++)
            if(arr[row][col] == target) return true;
    return false;
}
```

**From your code (2dArray/intro.cpp):** `largestRowSum` demonstrates combining row sum computation with tracking the max — a common pattern: "find which row/column has the property." Initialize `maxi = INT_MIN` (not 0), because row sums can be negative.

### Passing 2D arrays to functions — column size required

```cpp
// CORRECT — must specify all dimensions except the first
void f(int arr[][4], int rows) { }   // 4 cols must be specified

// With vectors — cleaner
void f(vector<vector<int>>& grid) { }   // no size specification needed
```

---

## 12. Matrix — Spiral Print

**Your codebase has no spiral print code** — complete explanation written here.

### What problem it solves

Print or collect matrix elements in spiral order (clockwise from outermost ring inward).

### How to think about it

Maintain 4 boundaries: `top`, `bottom`, `left`, `right`. In each pass, traverse the outermost ring and shrink the boundaries inward.

```cpp
vector<int> spiralOrder(vector<vector<int>>& matrix) {
    vector<int> result;
    int top = 0, bottom = matrix.size()-1;
    int left = 0, right = matrix[0].size()-1;

    while(top <= bottom && left <= right) {
        // Traverse right along top row
        for(int col = left; col <= right; col++)
            result.push_back(matrix[top][col]);
        top++;

        // Traverse down along right column
        for(int row = top; row <= bottom; row++)
            result.push_back(matrix[row][right]);
        right--;

        // Traverse left along bottom row (only if there's a row left)
        if(top <= bottom) {
            for(int col = right; col >= left; col--)
                result.push_back(matrix[bottom][col]);
            bottom--;
        }

        // Traverse up along left column (only if there's a column left)
        if(left <= right) {
            for(int row = bottom; row >= top; row--)
                result.push_back(matrix[row][left]);
            left++;
        }
    }
    return result;
}
```

### Why the `if` guards are needed

After processing the top row and right column, if top > bottom (only one row was left), we should NOT traverse bottom (would double-count) and should NOT traverse left column. Same logic for left column.

### Common Mistakes

```cpp
// MISTAKE 1: Forgetting to check top <= bottom before bottom row traversal
// For a single-row matrix, top becomes > bottom after top++, so skip bottom

// MISTAKE 2: Wrong direction — right to left (decreasing col), bottom to top (decreasing row)
// Spiral is: right → down → left ← up

// MISTAKE 3: Loop condition — use AND, not OR
while(top <= bottom && left <= right)   // CORRECT
while(top <= bottom || left <= right)   // WRONG — can access out of bounds
```

---

## 13. Matrix — Rotate 90 Degrees

**Your codebase has no rotation code** — complete explanation written here.

### What problem it solves

Rotate an n×n matrix 90 degrees clockwise in-place.

### Mathematical formula

After 90° clockwise rotation: element at `(row, col)` goes to `(col, n-1-row)`.

### In-place trick: Transpose + Reverse rows

```cpp
void rotate90Clockwise(vector<vector<int>>& matrix) {
    int n = matrix.size();

    // Step 1: Transpose (swap across main diagonal)
    for(int i = 0; i < n; i++)
        for(int j = i+1; j < n; j++)   // j starts at i+1 to avoid double-swap
            swap(matrix[i][j], matrix[j][i]);

    // Step 2: Reverse each row
    for(int i = 0; i < n; i++)
        reverse(matrix[i].begin(), matrix[i].end());
}
```

**Why this works:**
- Transpose: `(row, col)` → `(col, row)`
- Reverse row: `(col, row)` → `(col, n-1-row)`
- Combined: `(row, col)` → `(col, n-1-row)` which is exactly 90° clockwise

### Variations

```cpp
// 90° counter-clockwise = Transpose + Reverse each column
// OR: Reverse each row first, then transpose

// 180° rotation = Reverse each row + Reverse all rows
// OR: Reverse each row + Reverse each column

void rotate90CounterClockwise(vector<vector<int>>& matrix) {
    int n = matrix.size();
    // Step 1: Transpose
    for(int i = 0; i < n; i++)
        for(int j = i+1; j < n; j++)
            swap(matrix[i][j], matrix[j][i]);
    // Step 2: Reverse each column (instead of each row)
    for(int j = 0; j < n; j++)
        for(int i = 0, k = n-1; i < k; i++, k--)
            swap(matrix[i][j], matrix[k][j]);
}
```

### Common Mistakes

```cpp
// MISTAKE 1: Using extra space
// In-place = no extra matrix. The transpose trick works in-place.

// MISTAKE 2: Double-swapping during transpose
for(int i = 0; i < n; i++)
    for(int j = 0; j < n; j++)        // WRONG — swaps every pair twice (undo)
        swap(matrix[i][j], matrix[j][i]);

for(int i = 0; i < n; i++)
    for(int j = i+1; j < n; j++)      // CORRECT — j starts at i+1
        swap(matrix[i][j], matrix[j][i]);
```

---

## 14. Matrix — Wave Print

**Your codebase has no wave print code** — complete explanation written here.

### What problem it solves

Print a matrix in "wave" pattern — column 0 top-to-bottom, column 1 bottom-to-top, column 2 top-to-bottom, etc. (alternating direction per column).

```cpp
void wavePrint(vector<vector<int>>& matrix, int rows, int cols) {
    for(int col = 0; col < cols; col++) {
        if(col % 2 == 0) {
            // Even column — top to bottom
            for(int row = 0; row < rows; row++)
                cout << matrix[row][col] << " ";
        } else {
            // Odd column — bottom to top
            for(int row = rows-1; row >= 0; row--)
                cout << matrix[row][col] << " ";
        }
    }
}
```

**Intuition:** Like a snake going up and down through columns. Column 0 goes down, column 1 goes up, alternating. The `col % 2` check determines direction.

### Row-wise wave (snake pattern by rows)

```cpp
void snakePrint(vector<vector<int>>& matrix, int rows, int cols) {
    for(int row = 0; row < rows; row++) {
        if(row % 2 == 0) {
            for(int col = 0; col < cols; col++)
                cout << matrix[row][col] << " ";
        } else {
            for(int col = cols-1; col >= 0; col--)
                cout << matrix[row][col] << " ";
        }
    }
}
```

---

## 15. Matrix — Search

### Search in Sorted Matrix I (each row individually sorted, first of each row > last of previous)

**This matrix is equivalent to a sorted 1D array.**

```cpp
bool searchMatrix(vector<vector<int>>& matrix, int target) {
    int n = matrix.size(), m = matrix[0].size();
    int lo = 0, hi = n*m - 1;
    while(lo <= hi) {
        int mid = lo + (hi-lo)/2;
        int val = matrix[mid/m][mid%m];   // convert 1D index to 2D
        if(val == target) return true;
        else if(val < target) lo = mid+1;
        else hi = mid-1;
    }
    return false;
}
// Time: O(log(n*m))
```

**Key insight:** `1D index mid` maps to `(mid/m, mid%m)` in 2D. This converts a sorted matrix to a conceptual sorted array for binary search.

### Search in Sorted Matrix II (each row and column sorted)

**Can NOT be treated as 1D array (not fully sorted globally).**

```cpp
bool searchMatrixII(vector<vector<int>>& matrix, int target) {
    int n = matrix.size(), m = matrix[0].size();
    int row = 0, col = m-1;   // start at top-right corner
    while(row < n && col >= 0) {
        if(matrix[row][col] == target) return true;
        else if(matrix[row][col] > target) col--;    // too large → go left
        else row++;                                   // too small → go down
    }
    return false;
}
// Time: O(n + m)
```

**Why start at top-right?**  
- Top-right is the smallest in its column (column sorted top-to-bottom) and largest in its row (row sorted left-to-right).
- If target < current: move left (eliminate current column from candidates).
- If target > current: move down (eliminate current row from candidates).
- Each step eliminates a full row or column.

**Why NOT top-left?** If target > top-left, you can't decide whether to go right or down — both are larger. No decision rule.

---

## 16. Things Most People Forget

### 1. `int arr[10] = {1}` does NOT initialize all to 1

```cpp
int arr[10] = {1};    // {1, 0, 0, 0, 0, 0, 0, 0, 0, 0} — only first is 1!
// To set all to 1:
fill(arr, arr+10, 1);
vector<int> v(10, 1);  // cleaner
```

### 2. sizeof(arr) in a function gives pointer size, not array size

```cpp
void f(int arr[]) {
    int size = sizeof(arr) / sizeof(int);  // WRONG — gives 8/4 = 2 on 64-bit
    // Always pass n as a parameter
}
```

### 3. Prefix sum off-by-one

```cpp
// 0-indexed prefix: prefix[i+1] = prefix[i] + arr[i]
// Query l..r: prefix[r+1] - prefix[l]   ← NOT prefix[r] - prefix[l]
```

### 4. Kadane's: update maxSum BEFORE resetting currSum

```cpp
currSum += arr[i];
maxSum = max(maxSum, currSum);   // FIRST update max
if(currSum < 0) currSum = 0;    // THEN reset
```

### 5. Kadane's: initialize maxSum = INT_MIN, not 0

For all-negative arrays, correct answer is a single (least negative) element. If you initialize to 0, you return 0 which is wrong (0 is not a subarray).

### 6. Difference array requires size n+1

```cpp
int diff[n+1];   // NOT n — you write to diff[r+1] where r can be n-1
```

### 7. 2D prefix sum uses inclusion-exclusion

```cpp
psum[i][j] = arr[i][j] + psum[i-1][j] + psum[i][j-1] - psum[i-1][j-1];
// Query: psum[r2][c2] - psum[r1-1][c2] - psum[r2][c1-1] + psum[r1-1][c1-1]
```

### 8. Spiral: check bounds before bottom-row and left-column traversal

```cpp
if(top <= bottom) { /* traverse bottom row */ bottom--; }
if(left <= right) { /* traverse left col  */ left++;   }
```

### 9. Rotate: transpose loop uses j = i+1 (not j = 0)

```cpp
for(int j = i+1; j < n; j++)   // j starts at i+1, avoids double-swap
    swap(matrix[i][j], matrix[j][i]);
```

### 10. Search in Matrix II — start at top-right, not top-left or bottom-right

Top-right gives you a binary decision: go left (too large) or go down (too small).

### 11. Two-pointer requires sorted array for converging approach

The sorted order is what makes the decision rule (`lo++` or `hi--`) work. On unsorted arrays, converging two pointers don't give correct results.

### 12. Reverse rotation trick: k = k % n before reversing

```cpp
k = k % n;   // if k == n, rotation is a no-op
```

---

## 18. Final Revision Sheet

### All Templates — Quick Reference

```cpp
// ===== LINEAR SEARCH =====
int linearSearch(vector<int>& arr, int key) {
    for(int i = 0; i < arr.size(); i++)
        if(arr[i] == key) return i;
    return -1;
}

// ===== REVERSE =====
void reverseArr(vector<int>& arr) {
    int lo = 0, hi = arr.size()-1;
    while(lo < hi) swap(arr[lo++], arr[hi--]);
}

// ===== PREFIX SUM =====
vector<int> buildPrefix(vector<int>& arr) {
    int n = arr.size();
    vector<int> psum(n+1, 0);
    for(int i = 0; i < n; i++) psum[i+1] = psum[i] + arr[i];
    return psum;
}
int rangeSum(vector<int>& psum, int l, int r) {
    return psum[r+1] - psum[l];
}

// ===== DIFFERENCE ARRAY =====
vector<int> diff(n+1, 0);
// Range update: add v to arr[l..r]
diff[l] += v; diff[r+1] -= v;
// Reconstruct
int curr = 0;
for(int i = 0; i < n; i++) { curr += diff[i]; arr[i] += curr; }

// ===== KADANE'S =====
int kadane(vector<int>& arr) {
    int maxSum = INT_MIN, currSum = 0;
    for(int x : arr) {
        currSum += x;
        maxSum = max(maxSum, currSum);
        if(currSum < 0) currSum = 0;
    }
    return maxSum;
}

// ===== TWO POINTER (Pair Sum on sorted) =====
bool pairSum(vector<int>& arr, int target) {
    sort(arr.begin(), arr.end());
    int lo = 0, hi = arr.size()-1;
    while(lo < hi) {
        int s = arr[lo] + arr[hi];
        if(s == target) return true;
        s < target ? lo++ : hi--;
    }
    return false;
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

// ===== ROTATE 90° CLOCKWISE =====
void rotate(vector<vector<int>>& m) {
    int n = m.size();
    for(int i = 0; i < n; i++)
        for(int j = i+1; j < n; j++) swap(m[i][j], m[j][i]);
    for(auto& row : m) reverse(row.begin(), row.end());
}

// ===== SPIRAL ORDER =====
vector<int> spiral(vector<vector<int>>& m) {
    vector<int> res;
    int top = 0, bot = m.size()-1, left = 0, right = m[0].size()-1;
    while(top <= bot && left <= right) {
        for(int c = left; c <= right; c++) res.push_back(m[top][c]); top++;
        for(int r = top; r <= bot; r++)   res.push_back(m[r][right]); right--;
        if(top <= bot) { for(int c = right; c >= left; c--) res.push_back(m[bot][c]); bot--; }
        if(left <= right) { for(int r = bot; r >= top; r--) res.push_back(m[r][left]); left++; }
    }
    return res;
}

// ===== SEARCH MATRIX II =====
bool searchMatrixII(vector<vector<int>>& m, int t) {
    int row = 0, col = m[0].size()-1;
    while(row < m.size() && col >= 0) {
        if(m[row][col] == t) return true;
        m[row][col] > t ? col-- : row++;
    }
    return false;
}
```

### Complexity Cheatsheet

| Operation | Time | Space | Notes |
|-----------|------|-------|-------|
| Linear search | O(n) | O(1) | Unsorted array |
| Reverse | O(n) | O(1) | Two pointers |
| Prefix sum build | O(n) | O(n) | One-time |
| Prefix sum query | O(1) | O(1) | After build |
| Difference array update | O(1) | O(1) | After build |
| Difference array reconstruct | O(n) | O(1) | After all updates |
| Kadane's | O(n) | O(1) | |
| Two pointer (sorted) | O(n) | O(1) | After O(n log n) sort |
| Dutch National Flag | O(n) | O(1) | |
| Rotate matrix | O(n²) | O(1) | In-place |
| Spiral print | O(n×m) | O(1) | |
| Search Matrix I | O(log nm) | O(1) | Globally sorted |
| Search Matrix II | O(n+m) | O(1) | Row+col sorted |

### Interview Checklist

- [ ] Can I explain why `int arr[10] = {1}` doesn't set all to 1?
- [ ] Do I know that sizeof(arr) in a function gives pointer size?
- [ ] Can I build a prefix sum array and answer range queries in O(1)?
- [ ] Can I implement a difference array for range updates?
- [ ] Can I write Kadane's algorithm from memory (correct initialization, order of operations)?
- [ ] Do I know the two-pointer pattern for pair sum on sorted arrays?
- [ ] Can I code Dutch National Flag (3-way partition) correctly?
- [ ] Can I rotate a matrix 90° in-place (transpose + reverse rows)?
- [ ] Can I print a matrix in spiral order with correct boundary checks?
- [ ] Do I know the staircase search for Search Matrix II (start top-right)?
- [ ] Can I code trapping rain water with two pointers?

### Key Insights for Interviews

1. **Arrays are passed as pointers** — always pass size separately, never use `sizeof(arr)` in called function
2. **Prefix sum converts range query from O(n) to O(1)** — always think prefix sum when you see "sum of subarray"
3. **Difference array is dual to prefix sum** — where prefix sum answers queries, diff array enables updates
4. **Kadane's is DP with O(1) space** — extend OR start fresh at each position
5. **Two-pointer on sorted array eliminates O(n²) brute force** — sort first, then converge
6. **Matrix rotation = transpose + reverse** — memorize this; don't derive in interview
7. **Search Matrix II: staircase from top-right** — each step eliminates a row or column
8. **Spiral traversal: 4 boundaries, 2 guards** — check bounds before bottom row and left column

---

*Chapter 03 — Arrays | Part of DSA Interview Prep series*  
*Based on Striver's A2Z Sheet + Love Babbar lecture series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] Largest Element in Array — https://www.geeksforgeeks.org/problems/largest-element-in-array4009/1
- [ ] Second Largest Element — https://www.geeksforgeeks.org/problems/second-largest3735/1
- [ ] Check if Array is Sorted — https://leetcode.com/problems/check-if-array-is-sorted-and-rotated/
- [ ] Remove duplicates from Sorted Array — https://leetcode.com/problems/remove-duplicates-from-sorted-array/
- [ ] Left Rotate Array by One — https://www.geeksforgeeks.org/problems/cyclically-rotate-an-array-by-one2614/1
- [ ] Left Rotate Array by K Places — https://leetcode.com/problems/rotate-array/
- [ ] Move Zeros to End — https://leetcode.com/problems/move-zeroes/
- [ ] Linear Search — https://www.geeksforgeeks.org/problems/who-will-win-1587115621/1
- [ ] Union of two sorted arrays — https://www.geeksforgeeks.org/problems/union-of-two-sorted-arrays-1587115621/1
- [ ] Find missing number — https://leetcode.com/problems/missing-number/
- [ ] Maximum Consecutive Ones — https://leetcode.com/problems/max-consecutive-ones/
- [ ] Single Number — https://leetcode.com/problems/single-number/
- [ ] Longest subarray with sum K (positives) — https://www.geeksforgeeks.org/problems/longest-sub-array-with-sum-k0809/1
- [ ] Longest subarray with sum K (with negatives) — https://www.geeksforgeeks.org/problems/longest-sub-array-with-sum-k0809/1
- [ ] Two Sum — https://leetcode.com/problems/two-sum/
- [ ] Sort an array of 0s 1s and 2s — https://leetcode.com/problems/sort-colors/
- [ ] Majority Element I — https://leetcode.com/problems/majority-element/
- [ ] Kadane's Algorithm (Maximum Subarray) — https://leetcode.com/problems/maximum-subarray/
- [ ] Stock Buy and Sell — https://leetcode.com/problems/best-time-to-buy-and-sell-stock/
- [ ] Rearrange Array Elements by Sign — https://leetcode.com/problems/rearrange-array-elements-by-sign/
- [ ] Next Permutation — https://leetcode.com/problems/next-permutation/
- [ ] Leaders in an Array — https://www.geeksforgeeks.org/problems/leaders-in-an-array-1587115620/1
- [ ] Longest Consecutive Sequence — https://leetcode.com/problems/longest-consecutive-sequence/
- [ ] Set Matrix Zeroes — https://leetcode.com/problems/set-matrix-zeroes/
- [ ] Rotate Matrix 90 degrees — https://leetcode.com/problems/rotate-image/
- [ ] Spiral Matrix — https://leetcode.com/problems/spiral-matrix/
- [ ] Subarray Sum Equals K — https://leetcode.com/problems/subarray-sum-equals-k/
- [ ] Pascal's Triangle — https://leetcode.com/problems/pascals-triangle/
- [ ] Majority Element II — https://leetcode.com/problems/majority-element-ii/
- [ ] 3Sum — https://leetcode.com/problems/3sum/
- [ ] 4Sum — https://leetcode.com/problems/4sum/
- [ ] Largest Subarray with Sum 0 — https://www.geeksforgeeks.org/problems/largest-subarray-with-0-sum/1
- [ ] Count Subarrays with XOR = K — https://www.geeksforgeeks.org/problems/count-subarrays-with-given-xor-k0807/1
- [ ] Merge Overlapping Intervals — https://leetcode.com/problems/merge-intervals/
- [ ] Merge Two Sorted Arrays Without Extra Space — https://leetcode.com/problems/merge-sorted-array/
- [ ] Find the Repeating and Missing Number — https://www.geeksforgeeks.org/problems/find-missing-and-repeating2512/1
- [ ] Count Inversions — https://www.geeksforgeeks.org/problems/inversion-of-array-1587115620/1
- [ ] Reverse Pairs — https://leetcode.com/problems/reverse-pairs/
- [ ] Maximum Product Subarray — https://leetcode.com/problems/maximum-product-subarray/
- [ ] Find the Duplicate Number — https://leetcode.com/problems/find-the-duplicate-number/
- [ ] Unique Number of Occurrences — https://leetcode.com/problems/unique-number-of-occurrences/
- [ ] Intersection of Two Arrays — https://leetcode.com/problems/intersection-of-two-arrays/
- [ ] Find All Duplicates in Array — https://leetcode.com/problems/find-all-duplicates-in-an-array/
- [ ] Wave Print — https://www.geeksforgeeks.org/problems/wave-array-1587115621/1
- [ ] Search in a 2D Matrix — https://leetcode.com/problems/search-a-2d-matrix/
- [ ] Search in a 2D Matrix II — https://leetcode.com/problems/search-a-2d-matrix-ii/

