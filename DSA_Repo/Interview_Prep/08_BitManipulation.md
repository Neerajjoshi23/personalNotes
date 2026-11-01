# Chapter 08 — Bit Manipulation

> **Revision target:** 0.5 day  
> **Goal:** After reading this file, you need nothing else for this topic — no code files, no YouTube, no tutorials.

---

## Table of Contents

1. [Why Bit Manipulation Matters](#1-why-bit-manipulation-matters)
2. [Binary Representation & Integer Limits](#2-binary-representation--integer-limits)
3. [The Four Core Bit Operations](#3-the-four-core-bit-operations)
4. [Check / Set / Unset / Toggle a Specific Bit](#4-check--set--unset--toggle-a-specific-bit)
5. [XOR — The Magic Operator](#5-xor--the-magic-operator)
6. [Counting Set Bits](#6-counting-set-bits)
7. [Power of 2 Check](#7-power-of-2-check)
8. [Multiply and Divide by 2 with Shifts](#8-multiply-and-divide-by-2-with-shifts)
9. [Odd / Even Check](#9-odd--even-check)
10. [Case Conversion with Bits](#10-case-conversion-with-bits)
11. [XOR Swap — No Temp Variable](#11-xor-swap--no-temp-variable)
12. [Subset Enumeration using Bitmask](#12-subset-enumeration-using-bitmask)
13. [Bitmask as a Set — Intersection, Union, Membership](#13-bitmask-as-a-set--intersection-union-membership)
14. [Binary ↔ Decimal Conversion](#14-binary--decimal-conversion)
15. [XOR Tricks for Interview Problems](#15-xor-tricks-for-interview-problems)
16. [Brian Kernighan's Algorithm](#16-brian-kernighans-algorithm)
17. [Things Most People Forget](#17-things-most-people-forget)
18. [Practice Problems](#18-practice-problems)
19. [Final Revision Sheet](#19-final-revision-sheet)

---

## 1. Why Bit Manipulation Matters

Bit manipulation is not just a curiosity — it encodes **O(1) solutions** to problems that would otherwise be O(n) or O(n log n).

**Pattern recognition:** If a problem mentions:
- "find the one element that appears once while others appear twice/three times" → XOR
- "all subsets" → bitmask enumeration
- "power of 2" → bit trick
- "optimize modulo/divide by 2" → shift
- "swap without temp" → XOR swap
- "track which elements are in a set" (small universe, ≤ 64 elements) → bitmask DP

**The fundamental insight:** Every integer is already a compact array of 0s and 1s. Bit operations let you manipulate all 32 bits simultaneously in a single CPU instruction — that's where the speed comes from.

---

## 2. Binary Representation & Integer Limits

### Signed vs. Unsigned

```cpp
// From your Bit.cpp:
cout << INT_MAX << endl;            // 2147483647 = 2^31 - 1

int a = (1ll << 31) - 1;           // INT_MAX — note: 1ll, not 1
cout << a << endl;                  // 2147483647

unsigned int b = (1ll << 32) - 1;  // UINT_MAX = 4294967295
cout << b << endl;
```

**Why `1ll << 31` and not `1 << 31`?**  
`1` is an `int` (32 bits). Left-shifting a 32-bit int by 31 positions shifts into the sign bit, which is **undefined behavior** in C++. Using `1ll` (long long, 64 bits) is safe.

**Signed integer:** bit 31 is the sign bit (0 = positive, 1 = negative). Only 31 bits carry magnitude.  
**Unsigned integer:** all 32 bits carry magnitude. Range doubles (0 to 2^32 - 1).

```
Signed int:    [sign][30 bits for magnitude] → -2^31 to 2^31 - 1
Unsigned int:  [32 bits for magnitude]        → 0 to 2^32 - 1
```

### Key constants to know cold

```cpp
INT_MAX   =  2147483647  =  2^31 - 1
INT_MIN   = -2147483648  = -2^31
LLONG_MAX =  9.2 × 10^18 =  2^63 - 1
UINT_MAX  =  4294967295  =  2^32 - 1
```

### Reading binary

```
Number 11:
Binary: 0 0 0 0 1 0 1 1
Bit:    7 6 5 4 3 2 1 0   ← bit position (0 = LSB = rightmost)

MSB = Most Significant Bit = leftmost = bit 31 (or bit n-1)
LSB = Least Significant Bit = rightmost = bit 0
set bit = 1
unset bit = 0
```

**From your Bit2.cpp comment:** "Right most bit = LSB, Left most bit = MSB. Set bit = 1, unset bit = 0." In `11101110`, set bits = 6, unset bits = 2.

---

## 3. The Four Core Bit Operations

These are the building blocks. Every trick uses one or more of these.

```cpp
// AND  (&):  1 only if BOTH bits are 1
//   1010 & 1100 = 1000

// OR   (|):  1 if EITHER bit is 1
//   1010 | 1100 = 1110

// XOR  (^):  1 if bits are DIFFERENT
//   1010 ^ 1100 = 0110

// NOT  (~):  flips ALL bits (two's complement — also changes sign)
//   ~5 = -6   (because ~n = -(n+1))
```

### The truth table to memorize

| A | B | A & B | A \| B | A ^ B |
|---|---|-------|--------|-------|
| 0 | 0 |   0   |   0    |   0   |
| 0 | 1 |   0   |   1    |   1   |
| 1 | 0 |   0   |   1    |   1   |
| 1 | 1 |   1   |   1    |   0   |

### Left and Right Shift

```cpp
n << k   // multiply n by 2^k  (shift bits left, fill right with 0)
n >> k   // divide n by 2^k    (shift bits right, fill left with sign bit for signed)

5 << 1  = 10   (5 × 2)
5 >> 1  = 2    (5 / 2, integer division)
1 << 3  = 8    (2^3)
```

**From your multiplyAndDivideByTwo.cpp:** Left shift = multiply by 2, right shift = divide by 2. This is O(1) and faster than actual multiplication for powers of 2.

**Common usage:** `1 << i` creates a number with only bit `i` set. This is the mask you use to isolate any bit.

---

## 4. Check / Set / Unset / Toggle a Specific Bit

This is THE most asked bit manipulation concept. Know these cold.

### Check if bit i is set

```cpp
// From your Bit2.cpp and fewOperations.cpp:
if ((n & (1 << i)) != 0)    // bit i is SET
    cout << "Set";
else
    cout << "Not set";

// Alternative — simpler, returns 0 or 1
int bit = (n >> i) & 1;     // shift bit i to position 0, then mask
```

**Why it works:** `1 << i` creates a mask with only bit `i` on. AND with `n` preserves bit `i` and kills all others. If result ≠ 0, bit was set.

**Which form to use?** `(n >> i) & 1` is cleaner for extracting bit value. `n & (1 << i)` is more common in conditions.

### Set bit i (force to 1)

```cpp
// From your fewOperations.cpp:
void setIthBit(int &x, int i) {
    x |= (1 << i);
}
// OR with mask: any bit ORed with 1 becomes 1
```

### Unset bit i (force to 0)

```cpp
// From your fewOperations.cpp:
void unsetIthBit(int &x, int i) {
    x &= ~(1 << i);
}
// ~(1 << i) = mask with all 1s EXCEPT bit i
// AND: bit i becomes 0, all others unchanged
```

**Why the NOT?** `~(1 << i)` is `11111...1011111` — all ones except bit `i`. ANDing forces bit `i` to 0 and leaves everything else alone.

### Toggle bit i (flip: 1→0 or 0→1)

```cpp
// From your fewOperations.cpp and Bit2.cpp:
void toggleIthBit(int &x, int i) {
    x ^= (1 << i);
}
// XOR with 1 flips the bit. XOR with 0 leaves it unchanged.
// So: x ^ 1 = ~x (for single bit), x ^ 0 = x
```

**From your Bit2.cpp:** Notice toggling the same bit twice returns you to the original value. That's the involution property of XOR — used in XOR swap.

### Summary table

```cpp
int check  = (n >> i) & 1;         // returns 0 or 1
int set    = n | (1 << i);          // force bit i to 1
int unset  = n & (~(1 << i));       // force bit i to 0
int toggle = n ^ (1 << i);          // flip bit i
```

### Print binary representation

```cpp
// From your Bit2.cpp:
void printBinary(int n) {
    for (int i = 10; i >= 0; i--)      // from MSB to LSB
        cout << ((n >> i) & 1);         // extract each bit
    cout << endl;
}
```

**Why right shift?** You bring each bit to position 0 and AND with 1 to isolate it. This is more consistent than using a mask `n & (1 << i)` because you're working with a fixed mask (1).

---

## 5. XOR — The Magic Operator

XOR is the most powerful bit operator for interview tricks. It has two critical properties:

```
x ^ 0 = x    (XOR with 0 → no change)
x ^ x = 0    (XOR with itself → zero)
```

**And two structural properties:**
```
Commutative:  a ^ b = b ^ a
Associative:  a ^ (b ^ c) = (a ^ b) ^ c
```

**What this means practically:**  
If you XOR a sequence of numbers where each number appears an even number of times, everything cancels to 0. The ones that appear an odd number of times survive.

---

## 6. Counting Set Bits

### Manual loop — O(32) = O(1)

```cpp
// From your Bit2.cpp:
int count = 0;
for (int i = 31; i >= 0; i--) {
    if ((n & (1 << i)) != 0)
        count++;
}
```

### Built-in — the interview-preferred way

```cpp
// From your Bit2.cpp:
__builtin_popcount(n);       // for int (32-bit)
__builtin_popcountll(n);     // for long long (64-bit)

// Examples:
__builtin_popcount(7);   // 7 = 0111 → 3
__builtin_popcount(15);  // 15 = 1111 → 4
__builtin_popcount(0);   // 0
```

**Always prefer `__builtin_popcount` in interviews.** It maps to a single hardware instruction on modern CPUs. Saying "I'll use `__builtin_popcount` for O(1) set bit count" signals you know your tools.

### Other useful built-ins (GCC only)

```cpp
__builtin_clz(n);    // count leading zeros (bits before first 1)
__builtin_ctz(n);    // count trailing zeros (bits after last 1)
// Both are O(1). Warning: undefined behavior on n == 0!
```

---

## 7. Power of 2 Check

### The trick

```cpp
// From your powerOf2.cpp:
int n = 15;
if ((n & (n - 1)) == 0)
    cout << n << " is a power of two";
else
    cout << n << " is not a power of two";
```

**Why this works:** Powers of 2 in binary are `10...0` (exactly one bit set).  
`n - 1` flips that one bit to 0 and sets all lower bits: `01...1`.  
`n & (n-1)` = 0 because there's no bit position where both have 1.

```
n = 8:    1000
n-1 = 7:  0111
n & (n-1): 0000  ✓ power of 2

n = 12:   1100
n-1 = 11: 1011
n & (n-1): 1000  ✗ not power of 2
```

**Edge case:** `n = 0` gives `0 & (-1) = 0`, which would say "0 is a power of 2." That's wrong — always add `n > 0` check.

```cpp
bool isPowerOf2(int n) {
    return n > 0 && (n & (n - 1)) == 0;
}
```

**Secondary use of n & (n-1):** It removes the **lowest set bit** of `n`. This is the basis of Brian Kernighan's algorithm for counting set bits efficiently.

---

## 8. Multiply and Divide by 2 with Shifts

```cpp
// From your multiplyAndDivideByTwo.cpp:
cout << (5 >> 1) << endl;   // 2  (5 / 2 = integer division)
cout << (5 << 1) << endl;   // 10 (5 × 2)

// General:
n << k  ==  n * 2^k   (valid only if result doesn't overflow)
n >> k  ==  n / 2^k   (floor division for positive numbers)
```

**When this matters in interviews:**
- `mid = (left + right) >> 1` in binary search — avoids overflow (vs `(left + right) / 2` which can overflow if both are large)
- `mid = left + ((right - left) >> 1)` — even safer
- Checking divisibility by 2: `n & 1 == 0` instead of `n % 2 == 0`

**Trap:** Right-shifting a negative number is implementation-defined in C++ (arithmetic vs logical shift). For competitive programming, assume arithmetic shift (sign extension), but be careful.

---

## 9. Odd / Even Check

```cpp
// From your oddEvenCheck.cpp:
int even = 2, odd = 1;
cout << (even & 1) << endl;  // 0 — even
cout << (odd & 1) << endl;   // 1 — odd

// General: n & 1 checks the LSB
// Even numbers always have LSB = 0
// Odd numbers always have LSB = 1
```

**Your code's comment is important:** "Operations like modulo and division take time, so it's better to use bit." `n & 1` is a single AND instruction. `n % 2` involves division circuitry. In tight loops, this matters.

**Interview application:** Replace `if (n % 2 == 0)` with `if ((n & 1) == 0)` for even check. Shows bit manipulation awareness.

**Common trap (from Chapter 01):**
```cpp
if(n & 1 == 0)       // WRONG — parsed as n & (1 == 0) = n & 0 = always 0
if((n & 1) == 0)     // CORRECT — parenthesize & operations
```

---

## 10. Case Conversion with Bits

### The key insight

The only difference between a lowercase letter and its uppercase version is **bit 5** (0-indexed from right).

```cpp
// From your charToBinary.cpp and lowerToUpper.cpp:
// 'a' = 01100001   (bit 5 is SET)
// 'A' = 01000001   (bit 5 is NOT set)
//        ^--- bit 5

// Lowercase → Uppercase: clear bit 5
char upper = (ch & (~(1 << 5)));   // same as: ch & 0xDF
// ch & (~32) because 1<<5 = 32

// Uppercase → Lowercase: set bit 5
char lower = (ch | (1 << 5));      // same as: ch | 32
// ch | 32

// Toggle case: flip bit 5
char toggled = (ch ^ (1 << 5));    // ch ^ 32
```

**From your lowerToUpper.cpp:**
```cpp
char a = 'a';
a = (a & (~(1 << 5)));   // clears bit 5 → 'A'
```

**Why this works:** `'a' - 'A' = 32 = 2^5`. So lowercase and uppercase differ by exactly one bit. OR to set it (lowercase), AND with NOT to clear it (uppercase), XOR to toggle.

**Interview trick:** `ch | ' '` (space = 32) converts to lowercase. `ch & '_'` (underscore = 95) converts to uppercase. These are known bit tricks but the explicit `1 << 5` form is clearer.

---

## 11. XOR Swap — No Temp Variable

```cpp
// From your swappingTwoNumbers.cpp:
int a = 6, b = 4;
a = a ^ b;          // a = a^b
b = b ^ a;          // b = b ^ (a^b) = b^b^a = a  (because b^b = 0, 0^a = a)
a = a ^ b;          // a = (a^b) ^ a = b           (because a^a = 0, 0^b = b)

// After: a = 4, b = 6
```

**Why it works:**
1. Step 1: `a` stores `a^b`
2. Step 2: `b = b ^ (a^b) = (b^b)^a = 0^a = a` → b now holds original a
3. Step 3: `a = (a^b) ^ a = a^b^a = (a^a)^b = 0^b = b` → a now holds original b

**XOR is associative and commutative** — that's what makes the algebra work.

**WARNING:** Never XOR-swap a variable with itself! `swap(a[i], a[i])` would zero out the element. Always check indices are different.

```cpp
if (i != j) {        // CRITICAL check before XOR swap
    a[i] ^= a[j];
    a[j] ^= a[i];
    a[i] ^= a[j];
}
```

**Interview note:** In practice, use `std::swap(a, b)` — it's cleaner and the compiler may optimize to the same thing. Show the XOR swap only when asked "swap without extra space."

---

## 12. Subset Enumeration using Bitmask

### The core idea

For an array of `n` elements, there are `2^n` subsets. We represent each subset as a bitmask where bit `i` = 1 means element `i` is included.

```cpp
// From your SubsetUsingBit.cpp:
vector<vector<int>> subsets(vector<int>& nums) {
    int n = nums.size();
    int no_of_subsets = (1 << n);       // 2^n total subsets
    vector<vector<int>> ans;

    for (int mask = 0; mask < no_of_subsets; mask++) {
        vector<int> subset;
        for (int i = 0; i < n; i++) {
            if ((mask & (1 << i)) != 0)  // is bit i set in mask?
                subset.push_back(nums[i]);
        }
        ans.push_back(subset);
    }
    return ans;
}
// Time: O(n × 2^n) — for each of 2^n masks, check n bits
// Space: O(n × 2^n) — storing all subsets
```

**How to read a mask:** mask = `101` (decimal 5) means include indices 0 and 2, skip index 1. So for `[a, b, c]`, mask 5 gives subset `{a, c}`.

```
mask = 0  = 000 → {} (empty set)
mask = 1  = 001 → {nums[0]}
mask = 2  = 010 → {nums[1]}
mask = 3  = 011 → {nums[0], nums[1]}
mask = 4  = 100 → {nums[2]}
mask = 5  = 101 → {nums[0], nums[2]}
mask = 6  = 110 → {nums[1], nums[2]}
mask = 7  = 111 → {nums[0], nums[1], nums[2]}
```

**When to use:** "Generate all subsets", "Try all combinations", bitmask DP where state = which elements are used.

**Constraint to check:** Only works when `n ≤ 20` (since `2^20 ≈ 10^6`, and `2^21` already hits `2 × 10^6` with per-subset work = too slow).

---

## 13. Bitmask as a Set — Intersection, Union, Membership

The idea: represent a set of integers (with values in a small universe 0..N) as a single integer where bit `i` = 1 means `i` is in the set.

```cpp
// From your mainIdeaBitmask.cpp:
// Each array is represented as a bitmask:
vector<int> masks(n, 0);
for (int i = 0; i < n; i++) {
    for (auto& a : v[i]) {
        masks[i] |= (1 << a);   // set bit 'a' to add element 'a' to the set
    }
}

// Intersection of two sets = bitwise AND
int common = masks[0] & masks[1];
cout << __builtin_popcount(common);   // count common elements
```

### All set operations with bitmask

```cpp
int A = 0, B = 0;         // empty sets

// Add element x to set A
A |= (1 << x);

// Remove element x from set A
A &= ~(1 << x);

// Check if x is in A
bool present = (A >> x) & 1;

// Union: A ∪ B
int unionAB = A | B;

// Intersection: A ∩ B
int intersectAB = A & B;

// Difference: A - B (elements in A not in B)
int diffAB = A & ~B;

// Complement (within n-bit universe)
int comp = ~A & ((1 << n) - 1);   // (1<<n)-1 is the all-ones mask

// Count elements in set
int size = __builtin_popcount(A);

// Check if A is a subset of B
bool isSubset = (A & B) == A;
```

**Why this is powerful:** All these operations are O(1). Checking if element `x` is in a set is one instruction vs O(n) for a vector, O(log n) for a set, O(1) average for unordered_set (but with hashing overhead).

**Constraint:** Universe must be small (≤ 32 for int, ≤ 64 for long long). Used extensively in bitmask DP (e.g., Traveling Salesman Problem state = visited cities bitmask).

---

## 14. Binary ↔ Decimal Conversion

### Decimal to Binary

```cpp
// From your decTobin.cpp:
int n = 13;  // input decimal
int ans = 0;
int i = 0;
while (n != 0) {
    int bit = n & 1;            // extract LSB
    ans = (bit * pow(10, i)) + ans;   // place bit in decimal representation
    n = n >> 1;                 // shift right (divide by 2)
    i++;
}
// For 13: bits are 1,0,1,1 → ans = 1101
```

**Cleaner version for actual use:**
```cpp
string decToBin(int n) {
    if (n == 0) return "0";
    string result = "";
    while (n > 0) {
        result = char('0' + (n & 1)) + result;  // prepend bit
        n >>= 1;
    }
    return result;
}
```

### Binary (as number) to Decimal

```cpp
// From your binTodec.cpp:
// Input: 1101 (as integer)
int n = 1101;
int i = 0, ans = 0;
while (n != 0) {
    int digit = n % 10;          // extract last decimal digit (0 or 1)
    if (digit == 1)
        ans += pow(2, i);        // add 2^i if digit is 1
    n = n / 10;                  // remove last digit
    i++;
}
// 1101: digit=1 at i=0 (+1), digit=0 at i=1, digit=1 at i=2 (+4), digit=1 at i=3 (+8)
// ans = 1+4+8 = 13
```

**Note on `pow(2, i)`:** The `pow` function returns `double`. For large `i`, use `(1 << i)` or `(1LL << i)` instead to avoid floating point errors.

### Using `bitset` for printing binary

```cpp
#include <bitset>
cout << bitset<32>(n) << endl;  // print 32-bit binary representation
cout << bitset<8>(n) << endl;   // print 8-bit binary
```

This is cleaner for debugging. Prints leading zeros.

---

## 15. XOR Tricks for Interview Problems

### Find the single number (appears once, rest appear twice)

```cpp
// From your eliminatingDuplicates.cpp:
int arr[] = {1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 8, 9};
int ans = 0;
for (int x : arr)
    ans ^= x;   // pairs cancel out (x^x=0), single number survives
cout << ans;    // 7
```

**Why this works:** XOR is associative and commutative. Each pair `x ^ x = 0`. Only the element with no pair remains. Result is O(n) time, O(1) space.

### Find the missing number

```cpp
// Array has n numbers from 1 to n+1, one missing
// XOR all elements, then XOR all 1 to n+1
int findMissing(vector<int>& arr, int n) {
    int xorAll = 0;
    for (int i = 1; i <= n + 1; i++) xorAll ^= i;  // XOR 1 to n+1
    for (int x : arr) xorAll ^= x;                  // cancel present elements
    return xorAll;   // missing number survives
}
```

### Two numbers appear once, rest appear twice (Single Number III)

```cpp
// XOR everything → get a = x ^ y (the two unique numbers)
// Find any set bit in a (they differ here)
// Use that bit to split array into two groups and XOR each group
int xorAll = 0;
for (int n : nums) xorAll ^= n;   // xorAll = x ^ y

int diffBit = xorAll & (-xorAll);  // isolate lowest set bit (where x and y differ)
// -x in two's complement = ~x + 1, so x & (-x) gives lowest set bit

int x = 0;
for (int n : nums)
    if (n & diffBit) x ^= n;       // group 1: has the diffBit set

int y = xorAll ^ x;                // the other unique number
```

**The key insight of `x & (-x)`:** `-x` in two's complement flips all bits and adds 1. This causes carry to propagate up to the first 1 bit, and all bits below it become 0. The result has only the lowest set bit on.

### Number of times bit i is set across 1 to n (Counting Bits DP)

```cpp
// dp[i] = number of 1s in binary representation of i
vector<int> countBits(int n) {
    vector<int> dp(n + 1, 0);
    for (int i = 1; i <= n; i++) {
        dp[i] = dp[i >> 1] + (i & 1);
        // dp[i>>1] = set bits in i without LSB
        // (i & 1)  = the LSB itself
    }
    return dp;
}
```

---

## 16. Brian Kernighan's Algorithm

This is the O(set bits count) algorithm for counting set bits — faster than O(32) when set bits are sparse.

```cpp
int countSetBits(int n) {
    int count = 0;
    while (n) {
        n = n & (n - 1);    // remove lowest set bit
        count++;
    }
    return count;
}
```

**Why `n & (n-1)` removes lowest set bit:**
```
n     = ...1000...0  (lowest set bit at position k, zeros below)
n-1   = ...0111...1  (borrow propagates through zeros, kills bit k)
n&(n-1) = ...0000...0  (bit k and below are cleared)

Example:
n = 12 = 1100
n-1 = 11 = 1011
n & (n-1) = 1000  (removed lowest set bit, which was bit 2)
```

**Time complexity:** O(k) where k = number of set bits. For sparse numbers (few bits set), this is much faster than iterating 32 times.

**The connection to isPowerOf2:** A power of 2 has exactly one set bit. So `n & (n-1) == 0` checks if there are zero set bits after removing the first — which means only one set bit existed.

---

## 17. Things Most People Forget

### 1. Precedence trap with &, |, ^ vs comparison operators

```cpp
// WRONG:
if (n & 1 == 0)      // parsed as n & (1 == 0) = n & 0 = always 0!
if (n | 0 == n)      // parsed as n | (0 == n) — wrong

// CORRECT — always parenthesize bit operations:
if ((n & 1) == 0)
if ((n | 0) == n)
```

Bitwise operators have **lower precedence** than `==`, `!=`, `<`, `>`. Always use parentheses.

### 2. Use 1LL for shifts beyond 30

```cpp
// WRONG — undefined behavior for n >= 31:
int x = 1 << 31;       // int overflow — undefined behavior

// CORRECT:
long long x = 1LL << 31;   // fine
long long x = 1LL << 32;   // fine
```

### 3. Power of 2 check misses n = 0

```cpp
// BUG:
bool isPow2 = (n & (n-1)) == 0;   // 0 & (-1) = 0 — wrongly says 0 is power of 2

// CORRECT:
bool isPow2 = n > 0 && (n & (n-1)) == 0;
```

### 4. XOR swap with same variable zeros it out

```cpp
// BUG:
arr[i] ^= arr[i];   // arr[i] = 0!

// CORRECT:
if (i != j) {
    arr[i] ^= arr[j];
    arr[j] ^= arr[i];
    arr[i] ^= arr[j];
}
```

### 5. `~n` is not the same as `n` with all bits flipped to "unsigned" interpretation

```cpp
~5 = -6    // NOT "a large positive number"
// ~n = -(n+1) for signed integers (two's complement)
// When you want n with a specific bit cleared, use n & ~(1<<i), not ~n
```

### 6. Bitmask works up to n = 30 with int, n = 62 with long long

```cpp
int mask = (1 << n);       // safe up to n = 30 (n=31 causes sign bit issue)
int mask = (1 << 31) - 1;  // INT_MAX — OK
int mask = (1 << 31);      // UNDEFINED BEHAVIOR with int

long long mask = (1LL << n); // safe up to n = 62
```

### 7. `__builtin_popcount` is for int; use `__builtin_popcountll` for long long

```cpp
long long x = (1LL << 35);
__builtin_popcount(x);    // WRONG — truncates to int
__builtin_popcountll(x);  // CORRECT — 1
```

### 8. Subset enumeration works only for n ≤ 20

```cpp
// 2^20 = 1,048,576 (~10^6) — workable
// 2^25 = 33,554,432 — might TLE
// 2^30 = 10^9 — definitely TLE
// Always check n constraint before bitmask enumeration
```

### 9. In `n & (n-1)`: when n=0, `n-1` underflows

```cpp
// Brian Kernighan's loop handles it:
while (n) {        // exits immediately if n == 0
    n = n & (n-1);
    count++;
}
// The while(n) condition saves you from the n=0 edge case
```

### 10. Lowercase ↔ Uppercase: it's bit 5, not bit 4

```cpp
'a' = 97  = 01100001  (bit 5 set)
'A' = 65  = 01000001  (bit 5 unset)
'a' - 'A' = 32 = 2^5
// Bit 5 (0-indexed from right) is the case bit
// Bit 4 is NOT the case bit — common confusion
```

---

## 19. Final Revision Sheet

### Core Templates — Memorize These

```cpp
// 1. Check if bit i is set
bool isSet = (n >> i) & 1;

// 2. Set bit i
int set = n | (1 << i);

// 3. Unset bit i
int unset = n & ~(1 << i);

// 4. Toggle bit i
int toggle = n ^ (1 << i);

// 5. Odd/even check
bool isOdd = n & 1;

// 6. Power of 2 check (safe version)
bool isPow2 = n > 0 && (n & (n - 1)) == 0;

// 7. Remove lowest set bit (Brian Kernighan step)
n = n & (n - 1);

// 8. Isolate lowest set bit
int lowestBit = n & (-n);

// 9. Count set bits
int cnt = __builtin_popcount(n);    // int
int cnt = __builtin_popcountll(n);  // long long

// 10. Multiply/divide by 2
n << 1;   // ×2
n >> 1;   // ÷2

// 11. Subset enumeration
for (int mask = 0; mask < (1 << n); mask++) {
    for (int i = 0; i < n; i++) {
        if ((mask >> i) & 1) { /* element i is in this subset */ }
    }
}

// 12. XOR swap (check i != j first!)
a ^= b; b ^= a; a ^= b;

// 13. Case conversion
char upper = ch & ~(1 << 5);    // clear bit 5 → uppercase
char lower = ch | (1 << 5);     // set bit 5 → lowercase

// 14. XOR to find single number
int result = 0;
for (int x : arr) result ^= x;

// 15. Bitmask set operations
A |= (1 << x);          // add x to set A
A &= ~(1 << x);         // remove x from set A
bool in = (A >> x) & 1; // check membership
int common = A & B;     // intersection
int all = A | B;        // union
```

### Complexity Table

| Operation | Time | Space | Notes |
|-----------|------|-------|-------|
| Check/set/unset/toggle bit | O(1) | O(1) | Single instruction |
| Count set bits (loop) | O(32) = O(1) | O(1) | Fixed 32 iterations |
| Count set bits (`__builtin_popcount`) | O(1) | O(1) | Hardware instruction |
| Count set bits (Brian Kernighan) | O(k) | O(1) | k = number of set bits |
| Power of 2 check | O(1) | O(1) | `n & (n-1)` |
| Subset enumeration | O(n × 2^n) | O(n × 2^n) | Feasible only for n ≤ 20 |
| XOR find single number | O(n) | O(1) | |
| Counting bits DP | O(n) | O(n) | DP on set bits |

### Bit Patterns to Know

```
Powers of 2:      1, 2, 4, 8, 16, 32, 64, 128, ...
                  2^10 = 1024, 2^20 ≈ 10^6, 2^30 ≈ 10^9
All-ones n-bit:   (1 << n) - 1
INT_MAX:          0x7FFFFFFF = 01111...1 (31 ones)
INT_MIN:          0x80000000 = 10000...0 (sign bit only)
-1 (int):         0xFFFFFFFF = 11111...1 (all ones)
```

### Interview Checklist

- [ ] Can I write check/set/unset/toggle without looking?
- [ ] Do I always parenthesize bit operations before comparisons?
- [ ] Do I use `1LL << i` when `i >= 31`?
- [ ] Do I add `n > 0` to the power-of-2 check?
- [ ] Do I check `i != j` before XOR swap?
- [ ] Can I enumerate all subsets with a bitmask loop?
- [ ] Do I know `n & (-n)` isolates the lowest set bit?
- [ ] Can I use `__builtin_popcount` and explain Brian Kernighan's algorithm?
- [ ] Do I know that uppercase↔lowercase = toggling bit 5?

---

*Chapter 08 — Bit Manipulation | Part of DSA Interview Prep series*  
*Based on Love Babbar lecture series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] Check if the i-th bit is Set or Not — https://www.geeksforgeeks.org/problems/check-whether-k-th-bit-is-set-or-not-1587115620/1
- [ ] Check if a Number is Odd or Not — https://www.geeksforgeeks.org/problems/odd-even-problem/1
- [ ] Check if a Number is Power of 2 or Not — https://leetcode.com/problems/power-of-two/
- [ ] Count the Number of Set Bits — https://leetcode.com/problems/number-of-1-bits/
- [ ] Set/Unset the rightmost unset bit — https://www.geeksforgeeks.org/problems/set-the-rightmost-unset-bit4436/1
- [ ] Swap Two Numbers — https://www.geeksforgeeks.org/problems/swap-two-numbers-without-using-third-variable/1
- [ ] Divide two numbers without multiplication and division — https://leetcode.com/problems/divide-two-integers/
- [ ] Minimum Bit Flips to Convert Number — https://leetcode.com/problems/minimum-bit-flips-to-convert-number/
- [ ] Single Number - I — https://leetcode.com/problems/single-number/
- [ ] Power Set Bit Manipulation — https://leetcode.com/problems/subsets/
- [ ] XOR of numbers in a given range — https://www.geeksforgeeks.org/problems/find-xor-of-numbers-from-l-to-r/1
- [ ] Single Number - III — https://leetcode.com/problems/single-number-iii/
- [ ] Print Prime Factors of a Number — https://www.geeksforgeeks.org/problems/prime-factors5052/1
- [ ] All Divisors of a Number — https://www.geeksforgeeks.org/problems/all-divisors-of-a-number/1
- [ ] Count primes (Sieve of Eratosthenes) — https://leetcode.com/problems/count-primes/
- [ ] Pow(x,n) — https://leetcode.com/problems/powx-n/

