# Chapter 10 — Sliding Window & Two Pointer

> **Revision target:** 0.5 day  
> **Goal:** After reading this file, you need nothing else for this topic — no code files, no YouTube, no tutorials.

---

## Table of Contents

1. [The Core Intuition](#1-the-core-intuition)
2. [Fixed Window — Template & Mechanics](#2-fixed-window--template--mechanics)
3. [Variable Window — Template & Mechanics](#3-variable-window--template--mechanics)
4. [When to Shrink: Identifying the Condition](#4-when-to-shrink-identifying-the-condition)
5. [Two Pointer — Sorted Arrays](#5-two-pointer--sorted-arrays)
6. [Pair Sum (Two Sum II)](#6-pair-sum-two-sum-ii)
7. [Three Sum](#7-three-sum)
8. [Container With Most Water](#8-container-with-most-water)
9. [Longest Substring Without Repeating Characters](#9-longest-substring-without-repeating-characters)
10. [Minimum Window Substring](#10-minimum-window-substring)
11. [Longest K Unique Characters Substring](#11-longest-k-unique-characters-substring)
12. [Count Occurrences of Anagrams](#12-count-occurrences-of-anagrams)
13. [Max Sum Subarray of Size K (Fixed)](#13-max-sum-subarray-of-size-k-fixed)
14. [Longest Sub-Array with Sum K](#14-longest-sub-array-with-sum-k)
15. [Things Most People Forget](#15-things-most-people-forget)
16. [Practice Problems](#16-practice-problems)
17. [Final Revision Sheet](#17-final-revision-sheet)

---

## 1. The Core Intuition

### Why Sliding Window exists

The brute-force approach for "find something in all subarrays" is O(n²) — iterate all pairs (i, j). Sliding Window makes it O(n) by **reusing work**.

**The insight:** When you slide a window one step to the right, you're not computing a completely new result. You're taking the old result, removing one element (left edge) and adding one element (right edge). If the update is O(1), the entire algorithm is O(n).

**This only works when the property of interest is:**
1. Monotone with window size (bigger window = better/worse, consistently)
2. Or computable incrementally (you can add/remove one element cheaply)

### Pattern identification — when to reach for Sliding Window

Look for these signals in the problem:
- "contiguous subarray/substring"
- "of length k" (fixed window)
- "with at most / exactly / at least k distinct characters"
- "maximum sum", "minimum length", "longest/shortest" + contiguous constraint
- "window of size k"

**If the array/string is sorted and you need pairs/triplets**, that's Two Pointer, not Sliding Window.

### Two types

```
Fixed Window:     window size k is given and constant
Variable Window:  expand right freely, shrink left when condition violated
```

---

## 2. Fixed Window — Template & Mechanics

**Setup:** Window of fixed size `k`. Slide it across the array, computing something for each window.

```cpp
// Fixed Window Template
int fixedWindow(vector<int>& arr, int k) {
    int n = arr.size();

    // Step 1: compute result for the FIRST window [0, k-1]
    int windowResult = 0;
    for (int i = 0; i < k; i++)
        windowResult += arr[i];   // or whatever computation

    int bestResult = windowResult;

    // Step 2: slide window from index k to n-1
    for (int i = k; i < n; i++) {
        windowResult += arr[i];          // add new right element
        windowResult -= arr[i - k];      // remove old left element
        bestResult = max(bestResult, windowResult);
    }

    return bestResult;
}
// Time: O(n), Space: O(1)
```

**The sliding step:**
- `arr[i]` = the new element entering the window (right edge)
- `arr[i - k]` = the element leaving the window (left edge)
- Window always spans `[i-k+1, i]`

**Trace for arr = [2, 1, 5, 1, 3, 2], k = 3:**
```
Window [0..2]: 2+1+5 = 8
Window [1..3]: 8 + arr[3] - arr[0] = 8+1-2 = 7
Window [2..4]: 7 + arr[4] - arr[1] = 7+3-1 = 9  ← max
Window [3..5]: 9 + arr[5] - arr[2] = 9+2-5 = 6
Answer: 9
```

### Fixed Window with a Map/Frequency Array

When the window tracks character/element frequencies:
```cpp
// Example: count windows with exactly k distinct characters
unordered_map<char, int> freq;

// Build first window
for (int i = 0; i < k; i++) freq[s[i]]++;

// Slide
for (int i = k; i < n; i++) {
    // Process current window (before sliding)
    // ...

    // Slide: add new, remove old
    freq[s[i]]++;
    freq[s[i - k]]--;
    if (freq[s[i - k]] == 0) freq.erase(s[i - k]);
}
```

---

## 3. Variable Window — Template & Mechanics

**Setup:** No fixed size. Expand right pointer, shrink left when the window becomes invalid.

```cpp
// Variable Window Template
int variableWindow(vector<int>& arr) {
    int left = 0;
    int right = 0;
    int windowState = 0;     // whatever tracks window validity (sum, count, freq)
    int result = 0;

    while (right < arr.size()) {
        // 1. Expand: add arr[right] to window
        windowState += arr[right];

        // 2. Shrink: while window is INVALID, remove arr[left]
        while (windowConditionViolated(windowState)) {
            windowState -= arr[left];
            left++;
        }

        // 3. Update result (window is now valid)
        result = max(result, right - left + 1);

        // 4. Move right
        right++;
    }

    return result;
}
// Time: O(n) — right moves n steps, left moves at most n steps total
// Space: O(1) or O(k) for frequency maps
```

**Why O(n)?** Right pointer travels from 0 to n-1 (n steps). Left pointer only moves right and never goes back — total movement across entire algorithm is at most n. Total = 2n = O(n).

### The critical decision: what is the "condition"?

This is problem-specific and is what you need to identify:
- Sum > target → shrink
- Distinct chars > k → shrink  
- Frequency of some char > allowed → shrink
- Window contains required chars with sufficient count → valid, record result; else shrink

### Two flavors of variable window

**Maximize window (find longest):** Shrink when window becomes invalid. Record after shrinking.  
**Minimize window (find shortest):** Record while window is valid, then shrink to see if still valid.

```cpp
// Minimize template (find shortest window with property)
int left = 0, right = 0;
int result = INT_MAX;
int windowState = 0;

while (right < n) {
    windowState += arr[right];

    while (windowIsValid(windowState)) {    // while valid: record and shrink
        result = min(result, right - left + 1);
        windowState -= arr[left];
        left++;
    }

    right++;
}
return result == INT_MAX ? 0 : result;
```

---

## 4. When to Shrink: Identifying the Condition

This is the hardest part. Here's a breakdown by problem type:

| Problem | Shrink when... | Data structure for window |
|---------|---------------|--------------------------|
| Max sum subarray size k | Always after k elements | Sum variable |
| Longest without repeating | Duplicate in window | Frequency map |
| Longest with at most k distinct | Distinct count > k | Freq map, distinct counter |
| Minimum window substring | Not needed chars present (for min) | Freq map, matched count |
| Subarray with sum = k (positive) | Sum > k | Sum variable |
| Count anagrams | Fixed window of size p | Freq array |

**The rule of thumb:**
- "Longest" / "Maximum" → variable window, shrink when condition violated, maximize `right - left + 1`
- "Shortest" / "Minimum" → variable window, record when condition satisfied, then shrink to minimize
- "Count windows" → fixed window (if size given) or variable

---

## 5. Two Pointer — Sorted Arrays

Two pointer is a technique for sorted arrays (or arrays you can sort) where you maintain two indices and move them toward each other based on the current sum/value.

**When to use:**
- Pair sum problems on sorted arrays
- Three sum (reduce to two sum with fixed first element)
- "Container with most water" style optimization
- Merging sorted arrays

**Core insight:** In a sorted array, to find a pair with a target sum:
- If `arr[left] + arr[right] == target` → found
- If `arr[left] + arr[right] < target` → need bigger sum → move `left++`
- If `arr[left] + arr[right] > target` → need smaller sum → move `right--`

This eliminates O(n) candidates per step instead of O(1) in brute force.

```cpp
// Two Pointer on sorted array
bool twoSum(vector<int>& arr, int target) {
    int left = 0, right = arr.size() - 1;
    while (left < right) {
        int sum = arr[left] + arr[right];
        if (sum == target) return true;
        else if (sum < target) left++;
        else right--;
    }
    return false;
}
// Time: O(n), Space: O(1) — after O(n log n) sort if unsorted
```

**Why it works:** Think about it as eliminating possibilities. When `sum < target`, we know that `arr[left] + arr[right]` is too small. Making `right` smaller makes it even smaller — so we can skip this `right` for this `left`. We move `left++` to consider a larger left partner. Similarly for the other direction.

---

## 6. Pair Sum (Two Sum II)

**Problem:** Find all pairs in a sorted array that sum to target.

```cpp
// Two Sum II — sorted array
vector<pair<int,int>> pairSum(vector<int>& arr, int target) {
    int left = 0, right = arr.size() - 1;
    vector<pair<int,int>> result;

    while (left < right) {
        int sum = arr[left] + arr[right];
        if (sum == target) {
            result.push_back({arr[left], arr[right]});
            left++;
            right--;
            // Skip duplicates for unique pairs
            while (left < right && arr[left] == arr[left-1]) left++;
            while (left < right && arr[right] == arr[right+1]) right--;
        }
        else if (sum < target) left++;
        else right--;
    }
    return result;
}
```

**Unsorted array (Hash Map approach):**
```cpp
// Two Sum — unsorted (LeetCode 1)
vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;   // value → index
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        if (seen.count(complement))
            return {seen[complement], i};
        seen[nums[i]] = i;
    }
    return {};
}
// Time: O(n), Space: O(n)
```

**When to use which:**
- Sorted + find pair: Two pointer O(n)
- Unsorted + find indices: Hash map O(n)
- Unsorted + find pair values + want O(1) space: Sort then two pointer O(n log n)

---

## 7. Three Sum

**Problem:** Find all unique triplets that sum to 0 (or target).

**Key idea:** Sort → fix one element → reduce to Two Sum on the remaining array.

```cpp
vector<vector<int>> threeSum(vector<int>& nums) {
    sort(nums.begin(), nums.end());
    int n = nums.size();
    vector<vector<int>> result;

    for (int i = 0; i < n - 2; i++) {
        // Skip duplicate fixed elements
        if (i > 0 && nums[i] == nums[i-1]) continue;

        // Early termination: smallest possible sum > 0
        if (nums[i] > 0) break;

        int left = i + 1, right = n - 1;
        while (left < right) {
            int sum = nums[i] + nums[left] + nums[right];
            if (sum == 0) {
                result.push_back({nums[i], nums[left], nums[right]});
                // Skip duplicates
                while (left < right && nums[left] == nums[left+1]) left++;
                while (left < right && nums[right] == nums[right-1]) right--;
                left++;
                right--;
            }
            else if (sum < 0) left++;
            else right--;
        }
    }
    return result;
}
// Time: O(n²), Space: O(1) — sorting is O(n log n), inner loop is O(n) × n iterations
```

**The three traps:**
1. **Duplicate fixed element:** `if (i > 0 && nums[i] == nums[i-1]) continue`
2. **Duplicate pair after finding a triplet:** Skip duplicates in both `left` and `right`
3. **Early termination:** Once `nums[i] > 0`, the smallest possible triplet sum is positive — no solution possible

**Four Sum:** Same idea — fix two elements (nested loop), inner two-pointer for the remaining two. O(n³).

---

## 8. Container With Most Water

**Problem:** Given array `height` where `height[i]` is the height of a vertical line at position `i`. Find two lines that form a container with maximum water.

```cpp
int maxArea(vector<int>& height) {
    int left = 0, right = height.size() - 1;
    int maxWater = 0;

    while (left < right) {
        int h = min(height[left], height[right]);
        int w = right - left;
        maxWater = max(maxWater, h * w);

        // Move the pointer with the SHORTER line
        // Moving the taller one can never improve: height is limited by shorter,
        // width only decreases → area can only decrease
        if (height[left] < height[right]) left++;
        else right--;
    }
    return maxWater;
}
// Time: O(n), Space: O(1)
```

**The critical insight:** Why move the shorter line?  
- Water held = `min(h[L], h[R]) × (R - L)`
- If we move the taller pointer, the width decreases, and the height can only stay same or decrease (still bounded by the shorter line). So area can only decrease or stay same.
- If we move the shorter pointer, width decreases, but height might increase. So area might increase.
- **We always move the shorter pointer** because it's the only move that can possibly improve the area.

---

## 9. Longest Substring Without Repeating Characters

**Problem:** Find the length of the longest substring with no repeated characters.

```cpp
int lengthOfLongestSubstring(string s) {
    unordered_map<char, int> freq;  // or last-seen index
    int left = 0, maxLen = 0;

    for (int right = 0; right < s.size(); right++) {
        freq[s[right]]++;

        // Shrink while duplicate exists
        while (freq[s[right]] > 1) {
            freq[s[left]]--;
            left++;
        }

        maxLen = max(maxLen, right - left + 1);
    }
    return maxLen;
}
// Time: O(n), Space: O(1) — at most 26 lowercase or 128 ASCII chars
```

**Optimized version using last-seen index:**
```cpp
int lengthOfLongestSubstring(string s) {
    unordered_map<char, int> lastSeen;   // char → last seen index
    int left = 0, maxLen = 0;

    for (int right = 0; right < s.size(); right++) {
        if (lastSeen.count(s[right]) && lastSeen[s[right]] >= left) {
            // Jump left past the duplicate directly
            left = lastSeen[s[right]] + 1;
        }
        lastSeen[s[right]] = right;
        maxLen = max(maxLen, right - left + 1);
    }
    return maxLen;
}
// Advantage: left jumps directly instead of crawling — still O(n) but fewer iterations
```

**Why the `>= left` check?** If the previous occurrence of `s[right]` is before `left`, it's outside our window — irrelevant. We only care about duplicates inside the current window.

**Common mistake:** Updating `maxLen` inside the inner `while` loop instead of after it. Always update result AFTER the window is valid.

---

## 10. Minimum Window Substring

**Problem:** Find the shortest substring of `s` that contains all characters of `t`.

This is the hardest variable window problem. The trick is tracking "how many characters have been satisfied."

```cpp
string minWindow(string s, string t) {
    if (s.empty() || t.empty()) return "";

    unordered_map<char, int> need;     // how many of each char we need
    for (char c : t) need[c]++;

    int left = 0;
    int matched = 0;                    // how many chars are fully satisfied
    int required = need.size();         // number of DISTINCT chars in t
    int minLen = INT_MAX, minStart = 0;

    unordered_map<char, int> window;   // current window frequencies

    for (int right = 0; right < s.size(); right++) {
        char c = s[right];
        window[c]++;

        // Check if this char is now fully satisfied
        if (need.count(c) && window[c] == need[c])
            matched++;

        // Shrink: while all required chars are satisfied, try to minimize window
        while (matched == required) {
            if (right - left + 1 < minLen) {
                minLen = right - left + 1;
                minStart = left;
            }

            char lc = s[left];
            window[lc]--;
            if (need.count(lc) && window[lc] < need[lc])
                matched--;   // this char is no longer fully satisfied
            left++;
        }
    }

    return minLen == INT_MAX ? "" : s.substr(minStart, minLen);
}
// Time: O(|s| + |t|), Space: O(|t|)
```

**Key design choices:**

1. **`required = need.size()` (distinct chars, not total):** If `t = "aab"`, required = 2 (for 'a' and 'b'). This prevents counting a char as "satisfied" when count is less than needed.

2. **`matched` increments only when `window[c] == need[c]`:** Not when `window[c] > need[c]` (already matched). This is the critical optimization — `matched` only changes at the exact threshold.

3. **Shrink direction:** This is a "minimize" problem. We keep shrinking as long as the window is valid, recording the minimum length.

**Trace for s = "ADOBECODEBANC", t = "ABC":**
```
need = {A:1, B:1, C:1}, required = 3

Expand right until matched == 3:
right=0 A: window={A:1}, matched=1
right=1 D: window={A:1,D:1}
right=2 O: ...
right=3 B: window={..., B:1}, matched=2
right=4 E: ...
right=5 C: window={..., C:1}, matched=3 ← all matched

Shrink:
minLen=6, minStart=0 ("ADOBEC")
Remove A: window={A:0}, matched drops to 2 → stop shrinking

Continue expanding...
right=9 B: matched=3 again
Shrink: window has A from index 9? No...
Eventually: "BANC" (length 4) is minimum
```

---

## 11. Longest K Unique Characters Substring

**Problem:** Find the longest substring with exactly k distinct characters.

```cpp
int longestKUnique(string s, int k) {
    unordered_map<char, int> freq;
    int left = 0, maxLen = 0;

    for (int right = 0; right < s.size(); right++) {
        freq[s[right]]++;

        // Shrink while more than k distinct characters
        while (freq.size() > k) {
            freq[s[left]]--;
            if (freq[s[left]] == 0) freq.erase(s[left]);
            left++;
        }

        // freq.size() == k here (exactly k distinct)
        if ((int)freq.size() == k)
            maxLen = max(maxLen, right - left + 1);
    }

    return maxLen == 0 ? -1 : maxLen;
}
// Time: O(n), Space: O(k)
```

**Variant: at most k distinct characters:**
```cpp
// Change condition:
// while (freq.size() > k) → shrink
// After shrink, freq.size() <= k → always valid, always update
maxLen = max(maxLen, right - left + 1);   // remove the "if size == k" check
```

**Why erase from map when count reaches 0?** `freq.size()` counts distinct chars currently in window. If you don't erase, a char with count 0 still shows up in size — making the distinct count wrong.

---

## 12. Count Occurrences of Anagrams

**Problem:** Count the number of occurrences of anagrams of pattern `p` in string `s`.

```cpp
int countAnagrams(string s, string p) {
    int n = s.size(), m = p.size();
    unordered_map<char, int> need, window;
    for (char c : p) need[c]++;

    int count = 0, matched = 0, required = need.size();

    for (int right = 0; right < n; right++) {
        // Add to window
        char c = s[right];
        window[c]++;
        if (need.count(c) && window[c] == need[c]) matched++;

        // Slide: once window reaches size m, check and remove oldest char
        if (right >= m) {
            char lc = s[right - m];   // outgoing character
            if (need.count(lc) && window[lc] == need[lc]) matched--;
            window[lc]--;
            if (window[lc] == 0) window.erase(lc);
        }

        // Window is exactly size m
        if (right >= m - 1 && matched == required) count++;
    }
    return count;
}
// Time: O(n + m), Space: O(m)
```

**Alternative with frequency array (faster for lowercase letters):**
```cpp
int countAnagrams(string s, string p) {
    vector<int> need(26, 0), window(26, 0);
    for (char c : p) need[c - 'a']++;

    int count = 0, m = p.size();

    for (int right = 0; right < s.size(); right++) {
        window[s[right] - 'a']++;

        if (right >= m)
            window[s[right - m] - 'a']--;

        if (right >= m - 1 && need == window)
            count++;
    }
    return count;
}
// Comparing two vector<int>(26) is O(26) = O(1)
// Overall: O(26 × n) = O(n)
```

**Why `array<int,26>` beats `unordered_map` here:** Map has hash overhead. For fixed-size alphabets (lowercase English = 26 chars), a fixed array is faster and the comparison `need == window` is a simple 26-element equality check (O(1) in practice).

---

## 13. Max Sum Subarray of Size K (Fixed)

**Problem (from Question.txt #1):** Find the maximum sum of any subarray of exactly size k.

This is the simplest fixed window problem — direct application of the template.

```cpp
int maxSumSubarray(vector<int>& arr, int k) {
    int n = arr.size();
    if (n < k) return -1;

    // Compute first window
    int windowSum = 0;
    for (int i = 0; i < k; i++) windowSum += arr[i];

    int maxSum = windowSum;

    // Slide
    for (int i = k; i < n; i++) {
        windowSum += arr[i];      // add new element
        windowSum -= arr[i - k];  // remove old element
        maxSum = max(maxSum, windowSum);
    }

    return maxSum;
}
// Time: O(n), Space: O(1)
```

---

## 14. Longest Sub-Array with Sum K

**Problem (from Question.txt #6):** Find the length of the longest subarray with sum exactly equal to k.

**Case 1: All positive numbers** — use sliding window

```cpp
int longestSubarraySumK_positive(vector<int>& arr, int k) {
    int left = 0, right = 0;
    int sum = 0, maxLen = 0;

    while (right < arr.size()) {
        sum += arr[right];

        // Shrink if sum exceeds k (works only for positive arrays)
        while (sum > k && left <= right) {
            sum -= arr[left];
            left++;
        }

        if (sum == k)
            maxLen = max(maxLen, right - left + 1);

        right++;
    }
    return maxLen;
}
```

**Case 2: Negative numbers possible** — use prefix sum + hash map

```cpp
int longestSubarraySumK(vector<int>& arr, int k) {
    unordered_map<int, int> firstOccurrence;  // prefix sum → first index
    firstOccurrence[0] = -1;   // empty prefix has sum 0 at index -1

    int prefixSum = 0, maxLen = 0;

    for (int i = 0; i < arr.size(); i++) {
        prefixSum += arr[i];

        int needed = prefixSum - k;
        if (firstOccurrence.count(needed))
            maxLen = max(maxLen, i - firstOccurrence[needed]);

        // Only store FIRST occurrence (we want the longest subarray)
        if (!firstOccurrence.count(prefixSum))
            firstOccurrence[prefixSum] = i;
    }

    return maxLen;
}
// Time: O(n), Space: O(n)
```

**Why prefix sum works:** `subarray sum from l to r = prefix[r] - prefix[l-1]`. If we want this = k, then `prefix[l-1] = prefix[r] - k`. So for each `r`, we look up `prefix[r] - k` in our map to find the earliest `l-1`.

**Why store only first occurrence?** We want the LONGEST subarray, so we want the smallest `l-1` index. First occurrence gives the earliest index.

---

## 15. Count Subarrays with Sum = K (Prefix Sum + Hash Map)

This is a separate problem from "longest subarray with sum k" and is commonly confused with it. Sliding window cannot solve this — use prefix sum.

**Problem:** Count the number of subarrays with sum exactly equal to k.

```cpp
int subarraySum(vector<int>& nums, int k) {
    unordered_map<int, int> prefixCount;
    prefixCount[0] = 1;  // empty prefix has sum 0 — ONE way
    int sum = 0, count = 0;

    for (int x : nums) {
        sum += x;
        // If (sum - k) seen before, those prefixes can pair with current to give sum k
        count += prefixCount[sum - k];
        prefixCount[sum]++;
    }
    return count;
}
// Time: O(n), Space: O(n)
```

**Why `prefixCount[0] = 1`?** If `sum == k` at some index, then `sum - k = 0`, and we need `prefixCount[0]` to be 1 to count the subarray from index 0. Without this initialization, we'd miss subarrays starting from the beginning.

**Count vs Longest — the key difference:**

| Problem | Approach | Direction |
|---------|----------|-----------|
| Count subarrays with sum = k | Prefix sum + map, `prefixCount[sum-k]` | Count occurrences |
| Longest subarray with sum = k | Prefix sum + map, `firstOccurrence[sum-k]` | Store first index only |
| Longest subarray with sum = k (positives only) | Sliding window | Shrink when sum > k |

**Count of subarrays with XOR = k** (same pattern, different operation):
```cpp
int subarrayXOR(vector<int>& nums, int k) {
    unordered_map<int, int> prefixCount;
    prefixCount[0] = 1;
    int xorSum = 0, count = 0;

    for (int x : nums) {
        xorSum ^= x;
        count += prefixCount[xorSum ^ k];  // xorSum ^ k == prev prefix XOR we need
        prefixCount[xorSum]++;
    }
    return count;
}
```

---

## 16. Things Most People Forget

### 1. Sliding window only works when window property is monotone

```cpp
// For "longest subarray with sum <= k":
// Adding elements can only increase sum → valid to use sliding window
// For "longest subarray with sum = k" with negatives:
// Adding elements can increase OR decrease sum → sliding window BREAKS
// Must use prefix sum + hash map instead
```

### 2. Update result AFTER shrinking, not inside the shrink loop

```cpp
// WRONG:
while (freq.size() > k) {
    maxLen = max(maxLen, right - left + 1);  // window might be invalid here!
    freq[s[left]]--;
    left++;
}

// CORRECT:
while (freq.size() > k) {
    freq[s[left]]--;
    if (freq[s[left]] == 0) freq.erase(s[left]);
    left++;
}
maxLen = max(maxLen, right - left + 1);  // window is valid now
```

### 3. Always erase from map when count reaches 0

```cpp
// WRONG — freq.size() will count "ghost" entries:
freq[s[left]]--;
// left++;  // freq might have {a:0, b:2} — size is 2 but only 1 distinct char!

// CORRECT:
freq[s[left]]--;
if (freq[s[left]] == 0) freq.erase(s[left]);
left++;
```

### 4. Three Sum: skip duplicates in both the fixed element AND the pair

```cpp
// Skip fixed element duplicates:
if (i > 0 && nums[i] == nums[i-1]) continue;

// Skip pair duplicates AFTER finding a valid triplet:
while (left < right && nums[left] == nums[left+1]) left++;
while (left < right && nums[right] == nums[right-1]) right--;
left++;
right--;
// Missing either → duplicate triplets in result
```

### 5. Minimum Window Substring: `matched` only changes at the threshold

```cpp
// WRONG — increments for every match including overcounts:
if (need.count(c)) matched++;  // wrong if window[c] > need[c]

// CORRECT — only at the exact threshold:
if (need.count(c) && window[c] == need[c]) matched++;
```

### 6. Container With Most Water: always move the SHORTER pointer

```cpp
// WRONG:
if (height[left] > height[right]) left++;  // moving taller → can never improve

// CORRECT:
if (height[left] < height[right]) left++;   // move shorter
else right--;
```

### 7. Two pointer requires sorted array (or you need to sort first)

```cpp
// Two Sum on unsorted → hash map, not two pointer
// Three Sum → sort first, then two pointer
// Missing the sort → wrong answers
sort(nums.begin(), nums.end());   // always sort before two pointer
```

### 8. For "longest substring without repeating" — check `lastSeen >= left`

```cpp
// WRONG — jumps left too far:
if (lastSeen.count(s[right]))
    left = lastSeen[s[right]] + 1;   // might move left backwards to before current window!

// CORRECT:
if (lastSeen.count(s[right]) && lastSeen[s[right]] >= left)
    left = lastSeen[s[right]] + 1;
```

### 9. Fixed window: first window is built in a separate loop

```cpp
// Anti-pattern — trying to handle first window inside the slide:
for (int i = 0; i < n; i++) {
    windowSum += arr[i];
    if (i >= k) windowSum -= arr[i - k];     // this is correct actually
    if (i >= k - 1) maxSum = max(maxSum, windowSum);
}
// This form also works — but only if you understand when i >= k-1 first becomes true (= after first window built)
```

### 10. Prefix sum for sum-k with negatives: store FIRST occurrence only

```cpp
// WRONG — overwrites first occurrence with later one:
firstOccurrence[prefixSum] = i;   // always update

// CORRECT — only store first time:
if (!firstOccurrence.count(prefixSum))
    firstOccurrence[prefixSum] = i;
// This gives the LONGEST subarray, not the shortest
```

---

## 17. Final Revision Sheet

### Core Templates

```cpp
// 1. Fixed Window — size k
int fixedWindow(vector<int>& arr, int k) {
    int windowResult = 0;
    for (int i = 0; i < k; i++) windowResult += arr[i];
    int best = windowResult;
    for (int i = k; i < arr.size(); i++) {
        windowResult += arr[i] - arr[i - k];
        best = max(best, windowResult);
    }
    return best;
}

// 2. Variable Window — maximize (longest)
int variableMax(vector<int>& arr) {
    int left = 0, state = 0, result = 0;
    for (int right = 0; right < arr.size(); right++) {
        state += arr[right];                       // expand
        while (invalidCondition(state)) {          // shrink
            state -= arr[left++];
        }
        result = max(result, right - left + 1);    // record
    }
    return result;
}

// 3. Variable Window — minimize (shortest)
int variableMin(vector<int>& arr) {
    int left = 0, state = 0, result = INT_MAX;
    for (int right = 0; right < arr.size(); right++) {
        state += arr[right];
        while (validCondition(state)) {            // while valid: record then shrink
            result = min(result, right - left + 1);
            state -= arr[left++];
        }
    }
    return result == INT_MAX ? 0 : result;
}

// 4. Two Pointer — pair sum in sorted array
bool pairSum(vector<int>& arr, int target) {
    int l = 0, r = arr.size() - 1;
    while (l < r) {
        int s = arr[l] + arr[r];
        if (s == target) return true;
        s < target ? l++ : r--;
    }
    return false;
}

// 5. Three Sum
vector<vector<int>> threeSum(vector<int>& nums) {
    sort(nums.begin(), nums.end());
    vector<vector<int>> res;
    for (int i = 0; i < (int)nums.size() - 2; i++) {
        if (i > 0 && nums[i] == nums[i-1]) continue;
        if (nums[i] > 0) break;
        int l = i+1, r = nums.size()-1;
        while (l < r) {
            int s = nums[i] + nums[l] + nums[r];
            if (s == 0) {
                res.push_back({nums[i], nums[l], nums[r]});
                while (l<r && nums[l]==nums[l+1]) l++;
                while (l<r && nums[r]==nums[r-1]) r--;
                l++; r--;
            } else if (s < 0) l++;
            else r--;
        }
    }
    return res;
}

// 6. Longest substring without repeating
int longestNoRepeat(string s) {
    unordered_map<char,int> last;
    int left = 0, maxLen = 0;
    for (int r = 0; r < s.size(); r++) {
        if (last.count(s[r]) && last[s[r]] >= left)
            left = last[s[r]] + 1;
        last[s[r]] = r;
        maxLen = max(maxLen, r - left + 1);
    }
    return maxLen;
}

// 7. Minimum Window Substring
string minWindow(string s, string t) {
    unordered_map<char,int> need;
    for (char c : t) need[c]++;
    int left=0, matched=0, req=need.size(), minLen=INT_MAX, minStart=0;
    unordered_map<char,int> win;
    for (int r = 0; r < s.size(); r++) {
        win[s[r]]++;
        if (need.count(s[r]) && win[s[r]] == need[s[r]]) matched++;
        while (matched == req) {
            if (r-left+1 < minLen) { minLen = r-left+1; minStart = left; }
            char lc = s[left];
            win[lc]--;
            if (need.count(lc) && win[lc] < need[lc]) matched--;
            left++;
        }
    }
    return minLen==INT_MAX ? "" : s.substr(minStart, minLen);
}

// 8. Prefix sum for subarray sum = k (with negatives)
int subarraySum(vector<int>& nums, int k) {
    unordered_map<int,int> cnt; cnt[0] = 1;
    int psum = 0, count = 0;
    for (int x : nums) { psum += x; count += cnt[psum-k]; cnt[psum]++; }
    return count;
}
```

### Complexity Table

| Problem | Time | Space | Approach |
|---------|------|-------|---------|
| Max sum subarray k | O(n) | O(1) | Fixed window |
| Longest no repeat | O(n) | O(1) | Variable window + map |
| Min window substring | O(n+m) | O(m) | Variable window + freq map |
| Count anagrams | O(n+m) | O(m) | Fixed window + freq array |
| Longest k unique | O(n) | O(k) | Variable window + map |
| Pair sum (sorted) | O(n) | O(1) | Two pointer |
| 3Sum | O(n²) | O(1) | Sort + two pointer |
| Container water | O(n) | O(1) | Two pointer |
| Subarray sum = k | O(n) | O(n) | Prefix sum + hash map |
| Longest subarray sum = k | O(n) | O(n) | Prefix sum + hash map |
| Sliding window max | O(n) | O(k) | Monotonic deque |

### Decision Tree

```
Problem involves contiguous subarray/substring?
├── Fixed size k given?
│   ├── Yes → Fixed window template
│   └── No → Variable window
│       ├── Find longest? → expand right, shrink when invalid
│       └── Find shortest? → expand right, shrink while valid
│
Array is sorted + find pairs/triplets?
├── Two pointer (O(n) or O(n²) for 3sum)
│
Subarray sum = k with negatives?
└── Prefix sum + hash map
```

### Interview Checklist

- [ ] Can I write the fixed window template from memory?
- [ ] Can I write the variable window template (both maximize and minimize)?
- [ ] Do I erase from map when count reaches 0?
- [ ] Do I update result AFTER shrinking (for maximize) or WHILE valid (for minimize)?
- [ ] For min window: do I use `matched` with threshold check, not simple count?
- [ ] For 3sum: do I sort first, skip duplicates in 3 places, and early-terminate?
- [ ] For two pointer: do I move the shorter pointer in Container With Most Water?
- [ ] For last-seen map: do I check `lastSeen >= left`?
- [ ] Do I know when sliding window FAILS (negatives in sum problems)?
- [ ] Can I explain why O(n) works for sliding window amortized?
- [ ] Can I write "count subarrays with sum = k" using prefix sum + map (not sliding window)?
- [ ] Do I initialize `prefixCount[0] = 1` before the loop?
- [ ] Do I know `count += prefixCount[sum - k]` and NOT `prefixCount[sum - k]++` first?
- [ ] Can I adapt the pattern for "count subarrays with XOR = k" (replace + with ^)?

---

*Chapter 10 — Sliding Window & Two Pointer | Part of DSA Interview Prep series*  
*Based on Love Babbar lecture series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] Longest Substring Without Repeating Characters — https://leetcode.com/problems/longest-substring-without-repeating-characters/
- [ ] Max Consecutive Ones III — https://leetcode.com/problems/max-consecutive-ones-iii/
- [ ] Fruit Into Baskets — https://leetcode.com/problems/fruit-into-baskets/
- [ ] Longest Repeating Character Replacement — https://leetcode.com/problems/longest-repeating-character-replacement/
- [ ] Binary Subarrays With Sum — https://leetcode.com/problems/binary-subarrays-with-sum/
- [ ] Count number of Nice subarrays — https://leetcode.com/problems/count-number-of-nice-subarrays/
- [ ] Number of Substrings Containing All Three Characters — https://leetcode.com/problems/number-of-substrings-containing-all-three-characters/
- [ ] Maximum Points You Can Obtain from Cards — https://leetcode.com/problems/maximum-points-you-can-obtain-from-cards/
- [ ] Longest Substring With At Most K Distinct Characters — https://leetcode.com/problems/longest-substring-with-at-most-k-distinct-characters/
- [ ] Subarrays with K Different Integers — https://leetcode.com/problems/subarrays-with-k-different-integers/
- [ ] Minimum Window Substring — https://leetcode.com/problems/minimum-window-substring/
- [ ] Minimum Window Subsequence — https://leetcode.com/problems/minimum-window-subsequence/
- [ ] Max Sum Subarray of Size K — https://www.geeksforgeeks.org/problems/max-sum-subarray-of-size-k5313/1
- [ ] First Negative Integer in Every Window of Size K — https://www.geeksforgeeks.org/problems/first-negative-integer-in-every-window-of-size-k3345/1
- [ ] Count Occurrences of Anagrams — https://www.geeksforgeeks.org/problems/count-occurences-of-anagrams5839/1
- [ ] Longest Subarray with Sum K — https://www.geeksforgeeks.org/problems/longest-sub-array-with-sum-k0809/1
- [ ] Sum of min & max elements of all subarray of size K — https://www.geeksforgeeks.org/problems/sum-of-minimum-and-maximum-elements-of-all-subarrays-of-size-k/1

