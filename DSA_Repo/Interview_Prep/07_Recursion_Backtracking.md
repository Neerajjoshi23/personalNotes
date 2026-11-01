# Chapter 07 — Recursion & Backtracking

> **Revision target:** 1 day  
> **Goal:** After reading this file, you need nothing else for this topic — no code files, no YouTube, no tutorials.

---

## Table of Contents

1. [How to Think Recursively](#1-how-to-think-recursively)
2. [Recursion Tree — The Mental Model](#2-recursion-tree--the-mental-model)
3. [Your Code — Factorial](#3-your-code--factorial)
4. [Your Code — Sum of Array](#4-your-code--sum-of-array)
5. [Your Code — Power of 2 (Simple)](#5-your-code--power-of-2-simple)
6. [Your Code — Fast Exponentiation (Binary Exponent)](#6-your-code--fast-exponentiation-binary-exponent)
7. [Your Code — Check Sorted Array](#7-your-code--check-sorted-array)
8. [Your Code — Linear Search](#8-your-code--linear-search)
9. [Your Code — Palindrome & Reverse (Recursion on Strings)](#9-your-code--palindrome--reverse-recursion-on-strings)
10. [Backtracking — The Template](#10-backtracking--the-template)
11. [Subsets (Power Set) — Include/Exclude Pattern](#11-subsets-power-set--includeexclude-pattern)
12. [Subsets with Duplicates](#12-subsets-with-duplicates)
13. [Permutations](#13-permutations)
14. [Permutations with Duplicates](#14-permutations-with-duplicates)
15. [Combination Sum](#15-combination-sum)
16. [N-Queens — Full Solution](#16-n-queens--full-solution)
17. [Rat in a Maze](#17-rat-in-a-maze)
18. [Word Search](#18-word-search)
19. [Sudoku Solver](#19-sudoku-solver)
20. [Phone Keypad / Letter Combinations](#20-phone-keypad--letter-combinations)
21. [Fibonacci & Climbing Stairs](#21-fibonacci--climbing-stairs)
22. [Things Most People Forget](#22-things-most-people-forget)
23. [Practice Problems](#23-practice-problems)
24. [Final Revision Sheet](#24-final-revision-sheet)

---

## 1. How to Think Recursively

The biggest hurdle is trusting the recursive call. Here is the three-step process for every recursive problem:

### Step 1: Define what the function does (in English)

Before writing any code, state clearly: "This function takes X and returns Y." Don't think about HOW it does it yet.

```
factorial(n): returns n!
getSum(arr, size): returns sum of first `size` elements of arr
checkPalindrome(str, i, j): returns true if str[i..j] is a palindrome
```

### Step 2: Identify the base case(s)

What is the smallest input where you KNOW the answer directly (no recursion needed)?

```
factorial(0) = 1          (zero items — product is 1)
getSum(arr, 0) = 0        (zero items — sum is 0)
checkPalindrome(i > j) = true  (empty or single char is always palindrome)
```

### Step 3: Trust the recursive call and use its result

Assume the function works perfectly for smaller inputs. Use that result to build the answer for the current input.

```
factorial(n) = n * factorial(n-1)     ← trust factorial(n-1) is correct
getSum(arr, n) = arr[0] + getSum(arr+1, n-1)  ← trust getSum(arr+1, n-1)
```

**The key mental shift:** You do NOT trace the full recursion in your head. You only think about: "given that the smaller problem is solved, how do I solve the current problem?"

---

## 2. Recursion Tree — The Mental Model

Every recursive call spawns child calls. Visualizing this as a tree helps with:
- Understanding time complexity
- Identifying where work is duplicated (→ use memoization)
- Debugging infinite recursion

```
factorial(4)
  └── factorial(3)
        └── factorial(2)
              └── factorial(1)
                    └── factorial(0) = 1
              return 1*1 = 1
        return 2*1 = 2
  return 3*2 = 6
return 4*6 = 24
```

### Call stack depth = space complexity

Each function call occupies stack space until it returns. For `factorial(n)`, the call stack depth is n → O(n) space.

```
Stack at deepest point:
  factorial(0) ← top of stack (currently executing)
  factorial(1)
  factorial(2)
  factorial(3)
  factorial(4) ← bottom (waiting)
  main()
```

**Stack overflow** happens when recursion depth exceeds the stack limit (~10^4 to 10^5 calls). This is why iterative solutions or memoized solutions (with shallower recursion) are preferred for large inputs.

### How to determine time complexity from recursion tree

```
T(n) = a * T(n/b) + O(n^d)   ← Master Theorem
```

Common patterns:
- `T(n) = T(n-1) + O(1)` → O(n) — linear recursion (factorial, sum)
- `T(n) = T(n-1) + O(n)` → O(n²) — quadratic
- `T(n) = 2*T(n/2) + O(n)` → O(n log n) — merge sort
- `T(n) = 2*T(n-1) + O(1)` → O(2^n) — exponential (subsets)

---

## 3. Your Code — Factorial

```cpp
int factorial(int n) {
    if(n == 0) return 1;    // base case: 0! = 1
    int smallerProblem = factorial(n-1);
    int biggerProblem = n * smallerProblem;
    return biggerProblem;
}
```

**Why the variable names matter pedagogically:** Your code uses `smallerProblem` and `biggerProblem` — this naming forces you to think about the structure. You trust `factorial(n-1)` gives the right answer (smaller problem), then multiply by `n` to get the current answer (bigger problem).

**Why base case is `n==0` and not `n==1`?** `0! = 1` by mathematical convention. If base case were `n==1`, then `factorial(0)` would call `factorial(-1)` → infinite recursion. Always think: "what is the smallest valid input?"

**Complexity:** O(n) time, O(n) space (call stack)

**Integer overflow:** `factorial(13)` overflows `int`. `factorial(20)` overflows `long long`. For large n, use arbitrary precision or just return `n! % MOD`.

---

## 4. Your Code — Sum of Array

```cpp
int getSum(int *arr, int size) {
    if(size == 0) return 0;            // base case: empty array, sum = 0
    int remainingPart = getSum(arr+1, size-1);  // sum of rest
    int sum = arr[0] + remainingPart;
    return sum;
}
```

**The pointer advance trick `arr+1`:** Instead of passing an index, the code advances the pointer. `arr+1` points to the second element — effectively "chops off" the first element for the recursive call.

**Why this works:** The function says "sum of this array = first element + sum of everything else". It trusts `getSum(arr+1, size-1)` gives the sum of elements [1..n-1], then adds `arr[0]`.

**Alternative index-based version:**
```cpp
int getSum(int arr[], int n, int i = 0) {
    if(i == n) return 0;
    return arr[i] + getSum(arr, n, i+1);
}
```

**Complexity:** O(n) time, O(n) space

---

## 5. Your Code — Power of 2 (Simple)

```cpp
int power(int n) {
    if(n == 0) return 1;       // 2^0 = 1
    return 2 * power(n-1);     // 2^n = 2 * 2^(n-1)
}
```

**Straightforward:** Each call reduces `n` by 1. `n` calls total. O(n) time.

**The problem:** For `n = 10^9`, this makes 10^9 recursive calls → stack overflow. The next code file solves this.

---

## 6. Your Code — Fast Exponentiation (Binary Exponent)

```cpp
int power(int a, int b) {
    if(b == 0) return 1;     // a^0 = 1
    if(b == 1) return a;     // a^1 = a
    
    int ans = power(a, b/2); // recursively compute a^(b/2)
    
    if(b % 2 == 0) {
        return ans * ans;        // a^b = (a^(b/2))^2
    } else {
        return a * ans * ans;    // a^b = a * (a^(b/2))^2
    }
}
```

**The key insight — halving instead of decrementing:**

Instead of `a^n = a * a^(n-1)` (O(n) calls), use:
- `a^n = (a^(n/2))^2` when n is even
- `a^n = a * (a^(n/2))^2` when n is odd

Each step halves `b` → log₂(b) levels deep → O(log b) time.

**Trace for `power(2, 10)`:**
```
power(2, 10) → ans = power(2, 5)
  power(2, 5) → ans = power(2, 2)
    power(2, 2) → ans = power(2, 1) = 2
    b is even: return 2*2 = 4
  b is odd: return 2 * 4 * 4 = 32
b is even: return 32 * 32 = 1024 ✓
```
Only 4 calls for `b=10` vs 10 calls in the simple version. For `b=10^9`, this is the difference between 10^9 operations and 30 operations.

**The reuse insight:** `ans = power(a, b/2)` is computed ONCE and reused. If you wrote `power(a, b/2) * power(a, b/2)`, you'd make two calls — twice the work. Storing in `ans` is critical.

**Complexity:** O(log b) time, O(log b) space

**With modular arithmetic (very common in problems):**
```cpp
long long power(long long a, long long b, long long mod) {
    if(b == 0) return 1;
    long long ans = power(a, b/2, mod);
    ans = (ans * ans) % mod;
    if(b % 2 == 1) ans = (ans * a) % mod;
    return ans;
}
```

---

## 7. Your Code — Check Sorted Array

```cpp
bool isSorted(int arr[], int size) {
    if(size == 0 || size == 1) return true;   // 0 or 1 elements is sorted
    
    if(arr[0] > arr[1]) return false;          // first two out of order → not sorted
    else {
        bool remainingPart = isSorted(arr+1, size-1);
        return remainingPart;
    }
}
```

**The insight:** "An array is sorted if: the first two elements are in order AND the rest of the array is sorted." Check the local condition, then delegate the rest.

**Why base case includes `size == 0`:** Even though `isSorted(arr, size-1)` won't be called with size=0 in the current code, it's defensive programming. A 0-element array is vacuously sorted.

**The call in main:** `isSorted(arr, size-1)` — passes `size-1` not `size`. This is because the function compares `arr[0]` with `arr[1]`, so the recursive call needs at least 2 elements to work. With size-1, when we reach size=1, we've checked all adjacent pairs.

**Complexity:** O(n) time, O(n) space

---

## 8. Your Code — Linear Search

```cpp
bool linearSearch(int arr[], int size, int k) {
    if(size == 0) return false;    // exhausted array without finding k
    if(arr[0] == k) return true;   // found k at first position
    return linearSearch(arr+1, size-1, k);
}
```

**Pattern: Check head, recurse on tail.** This is the canonical list recursion pattern — appears in almost every recursive function on arrays.

**The two base cases:** Always have a "not found" base case AND a "found" base case. Missing either causes bugs:
- No `size == 0` check: when k isn't in the array, you'll access memory beyond the array
- No `arr[0] == k` check: you'd always return false even when k is present

**Finding ALL occurrences:**
```cpp
// To find first occurrence, return index
int linearSearchFirst(int arr[], int size, int k, int index = 0) {
    if(index == size) return -1;
    if(arr[index] == k) return index;
    return linearSearchFirst(arr, size, k, index+1);
}

// To find all occurrences
void linearSearchAll(int arr[], int size, int k, int index, vector<int>& result) {
    if(index == size) return;
    if(arr[index] == k) result.push_back(index);
    linearSearchAll(arr, size, k, index+1, result);
}
```

**Complexity:** O(n) time, O(n) space

---

## 9. Your Code — Palindrome & Reverse (Recursion on Strings)

These were covered in Chapter 05, but here's the recursion perspective:

### Recursive Palindrome — the two-pointer recursion model

```cpp
bool checkPalindrome(string str, int i, int j) {
    if(i > j) return true;        // base case: pointers crossed — it's a palindrome
    if(str[i] != str[j]) return false;  // mismatch found
    return checkPalindrome(str, i+1, j-1);  // check inner substring
}
```

**This is the "two-pointer recursion" pattern.** Two indices move toward each other. Base case: they cross. This same pattern applies to:
- Palindrome check
- Reversing a string in-place
- Checking if a subsequence exists
- Comparing two strings recursively

### Recursive Reverse

```cpp
void reverse(string& str, int i, int j) {
    if(i > j) return;              // base case: done
    swap(str[i], str[j]);          // swap endpoints
    reverse(str, i+1, j-1);       // recurse inward
}
```

**Pass by reference `string&`:** All recursive calls modify the SAME string. Without `&`, each call gets a copy and no modification persists.

---

## 10. Backtracking — The Template

**Backtracking = recursive exploration with undoing choices.**

The mental model: you're navigating a decision tree. At each node, you make a choice, recurse into children, then UNDO the choice before exploring siblings.

### The universal template

```cpp
void backtrack(state, choices, result) {
    // Base case: reached a complete solution
    if(isComplete(state)) {
        result.push_back(state);  // or process it
        return;
    }
    
    // Explore each choice
    for(choice : choices) {
        if(isValid(choice, state)) {
            // CHOOSE: apply the choice
            makeChoice(choice, state);
            
            // RECURSE: explore with this choice made
            backtrack(state, choices, result);
            
            // UNCHOOSE: undo the choice (backtrack)
            undoChoice(choice, state);
        }
    }
}
```

**The "choose → recurse → unchoose" cycle is the essence of backtracking.**

Why undo the choice? After recursing with a choice, you want to try the next choice from the same state. If you don't undo, the state carries over from the previous choice and corrupts subsequent exploration.

### Backtracking vs Recursion

| | Recursion | Backtracking |
|--|-----------|--------------|
| Direction | Top-down, single path | Explores all paths |
| State | Usually passed by value or via parameters | Shared state, must be explicitly undone |
| When to use | Single solution, or direct computation | Find all solutions, explore a search space |
| Examples | Factorial, Fibonacci | Subsets, permutations, N-Queens |

---

## 11. Subsets (Power Set) — Include/Exclude Pattern

**Not in your codebase — written fully here.**

### The decision tree

For each element, make a binary choice: include it or exclude it.

```
                    []
              /              \
           [1]               []
         /    \           /     \
      [1,2]   [1]       [2]     []
      /   \   / \       / \     / \
  [1,2,3][1,2][1,3][1][2,3][2][3][]
```

For n elements: 2^n subsets, 2^n leaf nodes.

### Implementation — include/exclude

```cpp
void subsets(vector<int>& nums, int index, vector<int>& current, vector<vector<int>>& result) {
    // Base case: processed all elements — current subset is complete
    if(index == nums.size()) {
        result.push_back(current);
        return;
    }
    
    // Choice 1: INCLUDE nums[index]
    current.push_back(nums[index]);
    subsets(nums, index+1, current, result);
    current.pop_back();            // UNDO: remove for next exploration
    
    // Choice 2: EXCLUDE nums[index]
    subsets(nums, index+1, current, result);
}

// Call: subsets(nums, 0, {}, result)
```

**Trace for [1,2]:**
```
subsets(0, []):
  Include 1: subsets(1, [1]):
    Include 2: subsets(2, [1,2]): add [1,2]
    Exclude 2: subsets(2, [1]):  add [1]
  Exclude 1: subsets(1, []):
    Include 2: subsets(2, [2]):  add [2]
    Exclude 2: subsets(2, []):   add []
Result: [1,2], [1], [2], [] ✓ (order depends on include-first or exclude-first)
```

### Alternative: iterative subset generation (bit masking)

```cpp
vector<vector<int>> subsets(vector<int>& nums) {
    int n = nums.size();
    vector<vector<int>> result;
    for(int mask = 0; mask < (1 << n); mask++) {
        vector<int> subset;
        for(int j = 0; j < n; j++) {
            if(mask & (1 << j)) subset.push_back(nums[j]);
        }
        result.push_back(subset);
    }
    return result;
}
```

**Why bit masking works:** Each number from 0 to 2^n-1 represents a binary selection — bit j=1 means include nums[j], bit j=0 means exclude. This is the non-recursive way to generate all subsets.

**Complexity:** O(2^n * n) time, O(n) recursion depth.

---

## 12. Subsets with Duplicates

**The include/exclude pattern for duplicates — the part that fades.**

**Problem:** nums = [1,2,2], generate unique subsets.

**Wrong approach:** Generate all subsets, deduplicate. This is O(2^n * n log n) and messy.

**Correct approach:** Sort first, then skip duplicate elements at the same recursion level.

```cpp
void subsetsWithDup(vector<int>& nums, int start, vector<int>& curr, vector<vector<int>>& result) {
    result.push_back(curr);  // add current subset (even empty)
    
    for(int i = start; i < nums.size(); i++) {
        // SKIP duplicate: same value as previous at this recursion level
        if(i > start && nums[i] == nums[i-1]) continue;
        
        curr.push_back(nums[i]);
        subsetsWithDup(nums, i+1, curr, result);
        curr.pop_back();
    }
}

// Call: sort(nums.begin(), nums.end()); subsetsWithDup(nums, 0, {}, result)
```

**Why `i > start` and not `i > 0`?**

The condition `nums[i] == nums[i-1]` skips a duplicate. But we should only skip at the SAME level of recursion (same "start" value), not across levels.

Consider nums = [1,2,2], sorted. At the top level (start=0):
- i=0: include 1 → recurse
- i=1: include 2 → recurse
- i=2: `i > start` (2 > 0) AND `nums[2] == nums[1]` → SKIP. Correct — [1,2,2] was already generated.

But when we're recursing with start=2 (deciding what follows 1,2):
- i=2: `i > start` is (2 > 2) = FALSE → DON'T skip. Correct — include the second 2.

**The rule:** Only skip the i-th element if it's a duplicate AND we're not the first element considered at this recursion level. `i > start` encodes "not the first at this level."

**Trace for [1,2,2]:**
```
Level 0 (start=0): try i=0(1), i=1(2), skip i=2(2 duplicate)
  From 1 (start=1): try i=1(2), i=2(2 duplicate) → skipped
    From 1,2 (start=2): try i=2(2)
      → add [1,2,2]
    → add [1,2]
  → add [1]
  From 2 (start=2): try i=2(2)
    → add [2,2]
  → add [2]
→ add []
Result: [], [1], [1,2], [1,2,2], [2], [2,2] ✓
```

---

## 13. Permutations

**Not in your codebase — written fully here.**

### Approach: swap-based

```cpp
void permute(vector<int>& nums, int start, vector<vector<int>>& result) {
    if(start == nums.size()) {
        result.push_back(nums);
        return;
    }
    for(int i = start; i < nums.size(); i++) {
        swap(nums[start], nums[i]);          // CHOOSE: place nums[i] at position start
        permute(nums, start+1, result);      // RECURSE: fix rest
        swap(nums[start], nums[i]);          // UNCHOOSE: restore
    }
}
// Call: permute(nums, 0, result)
```

**Trace for [1,2,3]:**
```
permute(start=0):
  i=0: swap(0,0)[1,2,3]: permute(start=1):
    i=1: swap(1,1)[1,2,3]: permute(2): → [1,2,3]
    i=2: swap(1,2)[1,3,2]: permute(2): → [1,3,2]; swap back
  i=1: swap(0,1)[2,1,3]: permute(start=1):
    i=1: → [2,1,3]; i=2: → [2,3,1]
  i=2: swap(0,2)[3,2,1]: permute(start=1):
    i=1: → [3,2,1]; i=2: → [3,1,2]
Result: [1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,2,1],[3,1,2] ✓
```

### Approach: visited array (more general)

```cpp
void permute(vector<int>& nums, vector<bool>& used, vector<int>& curr, vector<vector<int>>& result) {
    if(curr.size() == nums.size()) {
        result.push_back(curr);
        return;
    }
    for(int i = 0; i < nums.size(); i++) {
        if(used[i]) continue;
        used[i] = true;
        curr.push_back(nums[i]);
        permute(nums, used, curr, result);
        curr.pop_back();
        used[i] = false;
    }
}
```

**Why two approaches?** Swap-based modifies the array in-place (space-efficient). Visited-array approach is easier to extend for duplicates (see next section) and clearer conceptually. Both O(n! * n) time.

**Complexity:** O(n! * n) — n! permutations, each of length n. O(n) recursion depth.

---

## 14. Permutations with Duplicates

```cpp
void permuteUnique(vector<int>& nums, vector<bool>& used, vector<int>& curr, vector<vector<int>>& result) {
    if(curr.size() == nums.size()) {
        result.push_back(curr);
        return;
    }
    for(int i = 0; i < nums.size(); i++) {
        if(used[i]) continue;
        // Skip duplicate: same value, and the previous duplicate was NOT used
        // (meaning we're at the same recursion level, not exploring a different branch)
        if(i > 0 && nums[i] == nums[i-1] && !used[i-1]) continue;
        
        used[i] = true;
        curr.push_back(nums[i]);
        permuteUnique(nums, used, curr, result);
        curr.pop_back();
        used[i] = false;
    }
}
// MUST sort first: sort(nums.begin(), nums.end())
```

**The `!used[i-1]` condition explained:**

When we have duplicates (e.g., [1,1,2]):
- If `used[i-1] == true`: the previous element is in our current path (different branch) — OK to use current
- If `used[i-1] == false`: the previous element was tried and backtracked at this same level — skip current (it's a duplicate path)

This ensures that among duplicates, we always use them in order (first 1 before second 1), preventing duplicate permutations.

---

## 15. Combination Sum

**Not in your codebase — written fully here.**

**Problem:** Given candidates (distinct), find all combinations that sum to target. Each candidate can be reused any number of times.

```cpp
void combinationSum(vector<int>& candidates, int target, int start, 
                    vector<int>& curr, vector<vector<int>>& result) {
    if(target == 0) {
        result.push_back(curr);
        return;
    }
    if(target < 0) return;  // overshot
    
    for(int i = start; i < candidates.size(); i++) {
        curr.push_back(candidates[i]);
        // Pass i (not i+1) to allow reuse of same element
        combinationSum(candidates, target - candidates[i], i, curr, result);
        curr.pop_back();
    }
}
```

**Key design: passing `i` (not `i+1`) allows reuse.**

If you pass `i+1`, each element can only be used once (Combination Sum II). Passing `i` allows the same element to be used again.

**Preventing duplicates without sorting:** By starting at index `start` and not going back, we ensure each combination is generated in non-decreasing order — no need to sort separately (though sorting helps with early termination).

**Early termination optimization:**
```cpp
// Sort first, then: if current candidate > remaining target, break
sort(candidates.begin(), candidates.end());
for(int i = start; i < candidates.size(); i++) {
    if(candidates[i] > target) break;  // all subsequent are also too large
    // ...
}
```

---

## 16. N-Queens — Full Solution

**Not in your codebase — written fully here. Classic backtracking problem.**

**Problem:** Place n queens on n×n board so no two queens attack each other.

### Validity Check — O(n) version

```cpp
bool isSafe(vector<string>& board, int row, int col, int n) {
    // Check column (all rows above, same column)
    for(int r = 0; r < row; r++) {
        if(board[r][col] == 'Q') return false;
    }
    // Check upper-left diagonal
    for(int r = row-1, c = col-1; r >= 0 && c >= 0; r--, c--) {
        if(board[r][c] == 'Q') return false;
    }
    // Check upper-right diagonal
    for(int r = row-1, c = col+1; r >= 0 && c < n; r--, c++) {
        if(board[r][c] == 'Q') return false;
    }
    return true;
    // Note: no need to check row (we place exactly one queen per row)
    // No need to check lower diagonals (queens haven't been placed there yet)
}
```

**Why only check upward?** We place queens row by row, from row 0 to row n-1. When we're deciding placement for row `r`, rows below `r` are empty. No queen can attack from an empty row. Only check above.

### N-Queens Backtracking

```cpp
void solve(int row, int n, vector<string>& board, vector<vector<string>>& result) {
    // Base case: all rows filled
    if(row == n) {
        result.push_back(board);
        return;
    }
    
    // Try placing queen in each column of current row
    for(int col = 0; col < n; col++) {
        if(isSafe(board, row, col, n)) {
            board[row][col] = 'Q';         // CHOOSE
            solve(row + 1, n, board, result);  // RECURSE
            board[row][col] = '.';         // UNCHOOSE
        }
    }
}

vector<vector<string>> solveNQueens(int n) {
    vector<string> board(n, string(n, '.'));  // n×n board of '.'
    vector<vector<string>> result;
    solve(0, n, board, result);
    return result;
}
```

**Complexity:** O(n!) time (first row: n choices, second row: at most n-1, etc.). O(n²) space for the board.

### Optimized O(1) validity check with hash sets

```cpp
// Track attacked columns and diagonals with sets
unordered_set<int> cols, diag1, diag2;

bool isSafe(int row, int col) {
    // diag1: top-left to bottom-right — same (row - col) value
    // diag2: top-right to bottom-left — same (row + col) value
    return !cols.count(col) && !diag1.count(row-col) && !diag2.count(row+col);
}

void solve(int row, int n, vector<string>& board, vector<vector<string>>& result) {
    if(row == n) { result.push_back(board); return; }
    for(int col = 0; col < n; col++) {
        if(isSafe(row, col)) {
            board[row][col] = 'Q';
            cols.insert(col); diag1.insert(row-col); diag2.insert(row+col);
            solve(row+1, n, board, result);
            board[row][col] = '.';
            cols.erase(col); diag1.erase(row-col); diag2.erase(row+col);
        }
    }
}
```

**The diagonal insight:**
- Left diagonal (`\`): all cells have the same `row - col` value
- Right diagonal (`/`): all cells have the same `row + col` value

If any queen is on `row - col = k`, any other queen at `(r, c)` with `r - c = k` is on the same left diagonal.

---

## 17. Rat in a Maze

**Not in your codebase — written fully here.**

**Problem:** Rat starts at (0,0), must reach (n-1, n-1). Can move in 4 directions. 0 = blocked, 1 = open.

```cpp
bool isSafe(vector<vector<int>>& maze, vector<vector<bool>>& visited, int r, int c, int n) {
    return r >= 0 && r < n && c >= 0 && c < n 
           && maze[r][c] == 1 && !visited[r][c];
}

void solve(vector<vector<int>>& maze, vector<vector<bool>>& visited,
           int r, int c, int n, string path, vector<string>& result) {
    if(r == n-1 && c == n-1) {
        result.push_back(path);
        return;
    }
    
    visited[r][c] = true;   // mark current cell as visited
    
    // Try all 4 directions: Down, Left, Right, Up
    int dr[] = {1, 0, 0, -1};
    int dc[] = {0, -1, 1, 0};
    char dir[] = {'D', 'L', 'R', 'U'};
    
    for(int i = 0; i < 4; i++) {
        int nr = r + dr[i];
        int nc = c + dc[i];
        if(isSafe(maze, visited, nr, nc, n)) {
            solve(maze, visited, nr, nc, n, path + dir[i], result);
        }
    }
    
    visited[r][c] = false;   // UNMARK: backtrack
}

vector<string> findPath(vector<vector<int>>& maze, int n) {
    vector<string> result;
    vector<vector<bool>> visited(n, vector<bool>(n, false));
    if(maze[0][0] == 1) solve(maze, visited, 0, 0, n, "", result);
    return result;
}
```

**Why `visited[r][c] = false` after recursion?** The cell must be available for OTHER paths. If you don't unmark, once you visit (1,1) on one path, no other path can go through (1,1) — this would miss valid paths.

**The direction arrays trick:** Instead of writing 4 separate if-statements for up/down/left/right, use parallel arrays `dr[]` and `dc[]`. Each index corresponds to a direction. This is clean and extensible.

---

## 18. Word Search

**Not in your codebase — written fully here.**

**Problem:** Given a 2D board of characters, determine if the word exists by using adjacent cells (up/down/left/right), each cell used at most once.

```cpp
bool exist(vector<vector<char>>& board, string word, int r, int c, int idx) {
    if(idx == word.size()) return true;  // all chars matched
    
    if(r < 0 || r >= board.size() || c < 0 || c >= board[0].size()) return false;
    if(board[r][c] != word[idx]) return false;
    if(board[r][c] == '#') return false;  // already visited
    
    char temp = board[r][c];
    board[r][c] = '#';    // mark as visited (in-place)
    
    bool found = exist(board, word, r+1, c, idx+1) ||
                 exist(board, word, r-1, c, idx+1) ||
                 exist(board, word, r, c+1, idx+1) ||
                 exist(board, word, r, c-1, idx+1);
    
    board[r][c] = temp;   // restore (backtrack)
    return found;
}

bool wordExists(vector<vector<char>>& board, string word) {
    for(int r = 0; r < board.size(); r++) {
        for(int c = 0; c < board[0].size(); c++) {
            if(exist(board, word, r, c, 0)) return true;
        }
    }
    return false;
}
```

**The `'#'` trick:** Instead of a separate `visited[][]` array, temporarily overwrite the cell with a sentinel character `'#'`. The check `board[r][c] == '#'` handles the visited case. Restore after recursion.

**Why check `board[r][c] != word[idx]` BEFORE marking visited?** If the character doesn't match, there's no point marking it visited — return early.

---

## 19. Sudoku Solver

**Not in your codebase — written fully here.**

```cpp
bool isValid(vector<vector<char>>& board, int row, int col, char num) {
    for(int i = 0; i < 9; i++) {
        if(board[row][i] == num) return false;  // check row
        if(board[i][col] == num) return false;  // check column
        // Check 3×3 box
        int boxRow = 3*(row/3) + i/3;
        int boxCol = 3*(col/3) + i%3;
        if(board[boxRow][boxCol] == num) return false;
    }
    return true;
}

bool solveSudoku(vector<vector<char>>& board) {
    for(int r = 0; r < 9; r++) {
        for(int c = 0; c < 9; c++) {
            if(board[r][c] == '.') {             // empty cell
                for(char num = '1'; num <= '9'; num++) {
                    if(isValid(board, r, c, num)) {
                        board[r][c] = num;       // CHOOSE
                        if(solveSudoku(board)) return true;  // RECURSE
                        board[r][c] = '.';       // UNCHOOSE
                    }
                }
                return false;  // no valid number — trigger backtrack
            }
        }
    }
    return true;  // no empty cells left — solved!
}
```

**The 3×3 box index formula:**
- `3*(row/3)` gives the starting row of the box (0, 3, or 6)
- `3*(col/3)` gives the starting column of the box
- `i/3` and `i%3` walk through the 9 cells of the box as i goes 0..8

**Why return `false` when no valid digit works:** This signals to the caller that the current board state is unsolvable → backtrack by undoing the previous choice.

**Why `if(solveSudoku(board)) return true`:** If the recursive call solved the rest of the board, we're done — propagate `true` upward without further exploration.

---

## 20. Phone Keypad / Letter Combinations

**Not in your codebase — written fully here.**

```cpp
string keypad[] = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};

void solve(string digits, int index, string current, vector<string>& result) {
    if(index == digits.size()) {
        if(!current.empty()) result.push_back(current);
        return;
    }
    
    int digit = digits[index] - '0';
    string letters = keypad[digit];
    
    for(char c : letters) {
        current += c;                          // CHOOSE
        solve(digits, index+1, current, result);   // RECURSE
        current.pop_back();                    // UNCHOOSE
    }
}

vector<string> letterCombinations(string digits) {
    vector<string> result;
    if(digits.empty()) return result;
    solve(digits, 0, "", result);
    return result;
}
```

**Why this is a classic recursion problem:** Each digit has a fixed set of letter choices. For n digits, you make n choices → depth of n, branching factor ~3-4 → total combinations = 3^n to 4^n.

**The tree for "23":**
```
Level 0 (digit '2'): a, b, c
  Level 1 (digit '3'): d, e, f for each
Result: ad, ae, af, bd, be, bf, cd, ce, cf ✓
```

---

## 21. Fibonacci & Climbing Stairs

### Fibonacci — demonstrating why naive recursion is bad

```cpp
// Naive — O(2^n) time, O(n) space
int fib(int n) {
    if(n <= 1) return n;
    return fib(n-1) + fib(n-2);
}
```

**The exponential blowup:**
```
fib(5)
  fib(4)          fib(3)
    fib(3) fib(2)   fib(2) fib(1)
```
`fib(3)` is computed twice, `fib(2)` three times. Total calls = O(2^n).

### With Memoization — O(n) time, O(n) space

```cpp
unordered_map<int,int> memo;
int fib(int n) {
    if(n <= 1) return n;
    if(memo.count(n)) return memo[n];   // already computed
    memo[n] = fib(n-1) + fib(n-2);
    return memo[n];
}
```

**The insight:** Each unique subproblem is solved exactly once. Lookup by memoization takes O(1). n unique subproblems → O(n) total.

### Climbing Stairs

"You can climb 1 or 2 stairs at a time. How many ways to reach step n?"

```cpp
// Same recursion as Fibonacci!
int climbStairs(int n) {
    if(n <= 2) return n;
    return climbStairs(n-1) + climbStairs(n-2);
    // With memo: O(n) time
}
```

**Why it's the same as Fibonacci:** To reach step n, you came from step n-1 (1 step) or step n-2 (2 steps). Ways(n) = Ways(n-1) + Ways(n-2). The recurrence is identical.

---

## 22. Things Most People Forget

### 1. Unchoose is as important as Choose

```cpp
// WRONG — forget to unchoose
curr.push_back(x);
backtrack(...);
// ← missing: curr.pop_back()

// After this call, curr still has x. Next iteration's state is wrong.
```

### 2. Subsets with duplicates — `i > start`, NOT `i > 0`

```cpp
// WRONG — skips too aggressively
if(i > 0 && nums[i] == nums[i-1]) continue;

// CORRECT — only skip at same recursion level
if(i > start && nums[i] == nums[i-1]) continue;
```

### 3. Combination Sum — `i` not `i+1` for reuse

```cpp
// Allows reuse of element at index i
combinationSum(candidates, target - candidates[i], i, curr, result);
// If you write i+1, each element can only be used once (different problem!)
```

### 4. Permutations with duplicates — `!used[i-1]` condition

```cpp
// Skip when: same value as previous AND previous was NOT used in current path
if(i > 0 && nums[i] == nums[i-1] && !used[i-1]) continue;
```

### 5. N-Queens — check only upward (not downward)

Queens haven't been placed in rows below the current one — no need to check downward diagonals or rows below.

### 6. Diagonal encoding in N-Queens

```
Left diagonal  (\): row - col is constant
Right diagonal (/): row + col is constant
```

### 7. Rat in Maze / Word Search — unmark after recursion

```cpp
visited[r][c] = true;
recurse();
visited[r][c] = false;   // don't forget this
```

Forgetting to unmark causes: once a cell is visited on one path, it's permanently blocked for ALL subsequent paths.

### 8. Binary exponentiation — store result in `ans` before reusing

```cpp
int ans = power(a, b/2);
return ans * ans;   // computed ONCE, reused

// NEVER write:
return power(a, b/2) * power(a, b/2);  // computes TWICE = O(n) calls again
```

### 9. String by reference in recursive calls

```cpp
// CORRECT: string& — all recursive calls share same string
void reverse(string& str, int i, int j)

// WRONG: string — each call gets a copy, modifications don't propagate
void reverse(string str, int i, int j)
```

### 10. Sudoku solver — return false when no digit works (triggers backtrack)

```cpp
// After trying all 9 digits with no valid choice:
return false;  // ← this is the trigger for backtracking
```

Without this return, the function returns `true` (found by default) and the solver thinks it's done.

---

## 24. Final Revision Sheet

### Key Templates

```cpp
// 1. Generic backtracking template
void backtrack(state, start, result) {
    if(done) { result.push_back(state); return; }
    for(i = start; i < choices; i++) {
        state.add(choice[i]);                      // choose
        backtrack(state, nextStart, result);       // recurse
        state.remove();                            // unchoose
    }
}

// 2. Subsets (no duplicates)
void subsets(nums, i, curr, res) {
    res.push_back(curr);
    for(int j = i; j < nums.size(); j++) {
        curr.push_back(nums[j]);
        subsets(nums, j+1, curr, res);
        curr.pop_back();
    }
}

// 3. Subsets with duplicates
void subsetsWithDup(nums, i, curr, res) {
    res.push_back(curr);
    for(int j = i; j < nums.size(); j++) {
        if(j > i && nums[j] == nums[j-1]) continue;  // skip duplicate at same level
        curr.push_back(nums[j]);
        subsetsWithDup(nums, j+1, curr, res);
        curr.pop_back();
    }
}

// 4. Permutations (swap-based)
void permute(nums, start, res) {
    if(start == nums.size()) { res.push_back(nums); return; }
    for(int i = start; i < nums.size(); i++) {
        swap(nums[start], nums[i]);
        permute(nums, start+1, res);
        swap(nums[start], nums[i]);
    }
}

// 5. Fast Exponentiation
long long power(long long a, long long b, long long mod) {
    if(b == 0) return 1;
    long long ans = power(a, b/2, mod);
    ans = (ans * ans) % mod;
    if(b % 2 == 1) ans = (ans * a) % mod;
    return ans;
}

// 6. N-Queens check
bool isSafe(int r, int c, unordered_set<int>& cols, 
            unordered_set<int>& d1, unordered_set<int>& d2) {
    return !cols.count(c) && !d1.count(r-c) && !d2.count(r+c);
}

// 7. Combination Sum (with reuse)
void combSum(candidates, target, i, curr, res) {
    if(target == 0) { res.push_back(curr); return; }
    for(int j = i; j < candidates.size(); j++) {
        if(candidates[j] > target) break;
        curr.push_back(candidates[j]);
        combSum(candidates, target - candidates[j], j, curr, res); // j, not j+1
        curr.pop_back();
    }
}

// 8. Recursive palindrome check
bool isPalin(string& s, int i, int j) {
    if(i >= j) return true;
    return s[i] == s[j] && isPalin(s, i+1, j-1);
}
```

### Complexity Table

| Problem | Time | Space | Notes |
|---------|------|-------|-------|
| Factorial | O(n) | O(n) | Stack depth n |
| Binary exponentiation | O(log b) | O(log b) | Halving per step |
| Subsets | O(2^n * n) | O(n) | 2^n subsets, n to copy each |
| Permutations | O(n! * n) | O(n) | n! perms, n to copy each |
| Combination Sum | O(2^target) | O(target) | Without sorting |
| N-Queens | O(n!) | O(n²) | n! placements, n² board |
| Rat in Maze | O(4^(n²)) | O(n²) | 4 directions, n² cells |
| Word Search | O(m*n * 4^L) | O(L) | L = word length |
| Sudoku | O(9^81) | O(81) | Worst case |
| Fibonacci (memo) | O(n) | O(n) | n unique subproblems |

### Interview Checklist

- [ ] Can I state the choose-recurse-unchoose template without looking?
- [ ] Do I know why forgetting "unchoose" corrupts subsequent branches?
- [ ] Can I write subsets with duplicates with the `i > start` skip condition?
- [ ] Can I explain why `i > start` and not `i > 0`?
- [ ] Can I write binary exponentiation without computing `power(a, b/2)` twice?
- [ ] Do I know the N-Queens diagonal encoding: `row-col` and `row+col`?
- [ ] Can I write the Rat in Maze unmark pattern correctly?
- [ ] Do I pass string/vector by reference in recursive calls when needed?
- [ ] For combination sum, do I know when to pass `i` vs `i+1`?
- [ ] Can I draw the recursion tree for subsets of [1,2,3]?

### Most Important Observations

1. **Trust the recursion:** You never need to trace the full call stack. Define what the function does, write the base case, and use the recursive result. Trust it works.

2. **Backtracking = DFS + undo:** Backtracking is just depth-first search on a decision tree, with explicit state reversal after each branch. The "undo" is what makes it backtracking (not just recursion).

3. **Duplicate skipping — `i > start`:** When generating subsets/combinations with duplicates, `i > start` means "we're not the first element tried at this recursion level." Only skip if we've already tried this value at this level.

4. **Binary exponentiation:** Halve the exponent each step. Use the result ONCE, not twice. `ans = power(a, b/2); return ans * ans`. Writing `power(a, b/2) * power(a, b/2)` defeats the optimization.

5. **N-Queens diagonal encoding:** `row - col` is constant on `\` diagonals; `row + col` is constant on `/` diagonals. Check these in O(1) with hash sets.

6. **Visited array in grid problems:** ALWAYS unmark after recursion. A cell visited on one path must be available for other paths. Not unmarking is the #1 bug in grid backtracking.

7. **Recursion + memoization = top-down DP:** Whenever you see overlapping subproblems in a recursion tree (like Fibonacci), add memoization. This converts O(2^n) to O(n) for Fibonacci-like problems.

---

*Chapter 07 — Recursion & Backtracking | Part of DSA Interview Prep series*  
*Based on Striver's A2Z Sheet + Love Babbar lecture series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] Recursive Implementation of atoi() — https://leetcode.com/problems/string-to-integer-atoi/
- [ ] Pow(x, n) — https://leetcode.com/problems/powx-n/
- [ ] Count Good Numbers — https://leetcode.com/problems/count-good-numbers/
- [ ] Sort a stack using recursion — https://www.geeksforgeeks.org/problems/sort-a-stack/1
- [ ] Reverse a Stack — https://www.geeksforgeeks.org/problems/reverse-a-stack/1
- [ ] Generate Binary Strings Without Consecutive 1s — https://www.geeksforgeeks.org/problems/generate-binary-strings-without-consecutive-1s/1
- [ ] Generate Parentheses — https://leetcode.com/problems/generate-parentheses/
- [ ] Power Set — https://leetcode.com/problems/subsets/
- [ ] Count all subsequences with sum K — https://www.geeksforgeeks.org/problems/number-of-subsets-of-a-given-sum/1
- [ ] Check if there exists a subsequence with sum K — https://www.geeksforgeeks.org/problems/subset-sum-problem/1
- [ ] Combination Sum — https://leetcode.com/problems/combination-sum/
- [ ] Combination Sum II — https://leetcode.com/problems/combination-sum-ii/
- [ ] Subsets I — https://leetcode.com/problems/subsets/
- [ ] Subsets II — https://leetcode.com/problems/subsets-ii/
- [ ] Combination Sum III — https://leetcode.com/problems/combination-sum-iii/
- [ ] Letter Combinations of a Phone Number — https://leetcode.com/problems/letter-combinations-of-a-phone-number/
- [ ] Palindrome Partitioning — https://leetcode.com/problems/palindrome-partitioning/
- [ ] Word Search — https://leetcode.com/problems/word-search/
- [ ] N Queen — https://leetcode.com/problems/n-queens/
- [ ] Rat in a Maze — https://www.geeksforgeeks.org/problems/rat-in-a-maze-problem/1
- [ ] Word Break — https://leetcode.com/problems/word-break/
- [ ] M Coloring Problem — https://www.geeksforgeeks.org/problems/m-coloring-problem/1
- [ ] Sudoku Solver — https://leetcode.com/problems/sudoku-solver/
- [ ] Expression Add Operators — https://leetcode.com/problems/expression-add-operators/
- [ ] Fibonacci Number — https://leetcode.com/problems/fibonacci-number/
- [ ] Climbing Stairs — https://leetcode.com/problems/climbing-stairs/
- [ ] Print all Subsequences — https://www.geeksforgeeks.org/problems/print-all-subsequences/1
- [ ] Permutations — https://leetcode.com/problems/permutations/

