# Chapter 01 — C++ Basics & STL

> **Revision target:** 0.5 day  
> **Goal:** After reading this file, you need nothing else for this topic — no code files, no YouTube, no tutorials.

---

## Table of Contents

0. [C++ Basics — Language Fundamentals](#0-c-basics--language-fundamentals)
1. [Memory & Variables](#1-memory--variables)
2. [Pass by Value vs Reference vs Pointer](#2-pass-by-value-vs-reference-vs-pointer)
3. [Pointers Deep Dive](#3-pointers-deep-dive)
4. [Dynamic Memory Allocation](#4-dynamic-memory-allocation)
5. [STL — Vector](#5-stl--vector)
6. [STL — Pair](#6-stl--pair)
7. [STL — Map & Unordered Map](#7-stl--map--unordered-map)
8. [STL — Set & Multiset](#8-stl--set--multiset)
9. [STL — Priority Queue (Heap)](#9-stl--priority-queue-heap)
10. [STL — Stack & Queue](#10-stl--stack--queue)
11. [Sorting & Custom Comparators](#11-sorting--custom-comparators)
12. [lower_bound & upper_bound](#12-lower_bound--upper_bound)
13. [Built-in Algorithms](#13-built-in-algorithms)
14. [Lambda Functions](#14-lambda-functions)
15. [auto & Range-Based For](#15-auto--range-based-for)
16. [Iterators](#16-iterators)
17. [Templates & Things That Fade](#17-things-most-people-forget)
18. [Practice Problems](#18-practice-problems)
19. [Final Revision Sheet](#19-final-revision-sheet)

---

## 0. C++ Basics — Language Fundamentals

### Program Structure

Every C++ program you write in competitive/interview context follows this skeleton:

```cpp
#include <bits/stdc++.h>   // includes everything — vector, map, algorithm, etc.
using namespace std;        // so you write cout instead of std::cout

int main() {
    // your code here
    return 0;
}
```

`#include <bits/stdc++.h>` is a GCC extension — it's fine for LeetCode/GFG/competitive. In production code, you'd include headers individually.

---

### Data Types & Sizes

```cpp
int     n = 5;          // 4 bytes, range: -2^31 to 2^31-1 (~2.1 billion)
long long ll = 5LL;     // 8 bytes, range: -2^63 to 2^63-1 (~9.2 × 10^18)
double  d = 3.14;       // 8 bytes, decimal
float   f = 3.14f;      // 4 bytes, less precise
char    c = 'a';        // 1 byte, stores ASCII value
bool    b = true;       // 1 byte, true(1) / false(0)
string  s = "hello";    // dynamic size
```

**When to use `long long`:** Any time intermediate calculation can exceed ~2 billion.
```cpp
// Classic overflow trap
int a = 1e9, b = 1e9;
int bad  = a * b;        // OVERFLOW — result doesn't fit in int
long long good = (long long)a * b;  // cast ONE operand before multiply
```

**ASCII values worth remembering:**
```
'0' = 48    '9' = 57    (digit d = '0' + d)
'A' = 65    'Z' = 90
'a' = 97    'z' = 122
'a' - 'A' = 32           (lowercase = uppercase + 32)
c - '0'   = digit value  (char digit to int)
c - 'a'   = 0-25 index   (used in freq arrays)
```

---

### Input / Output

```cpp
// Basic input
int n;
cin >> n;

// Multiple values on one line
int a, b;
cin >> a >> b;

// String input — single word (stops at space)
string s;
cin >> s;

// Full line input (including spaces)
string line;
getline(cin, line);

// After cin >> n, buffer has '\n' left — causes getline to read empty string
cin >> n;
cin.ignore();           // flush the '\n'
getline(cin, line);     // now works correctly

// Array input
int arr[n];
for(int i = 0; i < n; i++) cin >> arr[i];

// Vector input
int n; cin >> n;
vector<int> v(n);
for(int& x : v) cin >> x;
```

**Fast I/O — use this when TLE on large inputs:**
```cpp
ios_base::sync_with_stdio(false);
cin.tie(NULL);
// Put these two lines at the start of main()
// Do NOT mix scanf/printf with cin/cout after this
```

**Output:**
```cpp
cout << value;
cout << value << "\n";    // faster than endl
cout << endl;             // flushes buffer — slower, avoid in loops
printf("%d\n", n);        // C-style, slightly faster for large output
```

---

### Operators

```cpp
// Arithmetic
+  -  *  /  %

// Integer division truncates toward zero
7 / 2 = 3       // NOT 3.5
-7 / 2 = -3     // NOT -4

// Modulo
7 % 3 = 1
-7 % 3 = -1     // sign follows dividend in C++

// Relational
==  !=  <  >  <=  >=

// Logical
&&  ||  !

// Bitwise
&   |   ^   ~   <<   >>

// Assignment shorthand
x += 5;  x -= 5;  x *= 5;  x /= 5;  x %= 5;
x++;  x--;  ++x;  --x;
```

---

### Logical Operators — Detail

#### `&&` — AND (both must be true)

```cpp
if (a > 0 && b > 0)    // true only if BOTH are true

// Short circuit — if LEFT is false, RIGHT is never evaluated
if (x != 0 && 10/x > 1)   // safe: if x==0, second part skipped, no div-by-zero
```

#### `||` — OR (at least one must be true)

```cpp
if (a == 0 || b == 0)  // true if either is zero

// Short circuit — if LEFT is true, RIGHT is never evaluated
if (x > 0 || heavyFunction())  // heavyFunction() never called if x > 0
```

#### `!` — NOT (flips true/false)

```cpp
if (!found)          // true when found == false
if (!v.empty())      // true when vector is NOT empty
if (!(a == b))       // same as a != b
```

---

### Bitwise Operators — Detail

These work **on individual bits** of the number's binary representation.

#### `&` — Bitwise AND (1 only if BOTH bits are 1)

```
  5 = 0101
  3 = 0011
  --------
5&3 = 0001 = 1
```
```cpp
5 & 3     // = 1
n & 1     // = 1 if n is odd, 0 if even  ← most common use
```

#### `|` — Bitwise OR (1 if EITHER bit is 1)

```
  5 = 0101
  3 = 0011
  --------
5|3 = 0111 = 7
```
```cpp
5 | 3          // = 7
n | (1 << i)   // SET bit i of n
```

#### `^` — Bitwise XOR (1 if bits are DIFFERENT)

```
  5 = 0101
  3 = 0011
  --------
5^3 = 0110 = 6
```
```cpp
5 ^ 3    // = 6

// KEY PROPERTIES:
// a ^ a = 0   (same number XORed = 0)
// a ^ 0 = a   (XOR with 0 = unchanged)

// Classic use: find the single non-duplicate in array
int result = 0;
for (int x : arr) result ^= x;   // all duplicates cancel, single remains
```

#### `~` — Bitwise NOT (flip every bit)

```cpp
~5     // = -6   (always: ~n = -(n+1))
n & ~(1 << i)   // CLEAR bit i of n
```

#### `<<` — Left Shift (×2 per shift)

```cpp
1 << 0   // = 1
1 << 1   // = 2
1 << 2   // = 4
1 << n   // = 2^n      ← memorize this
5 << 1   // = 10  (5 × 2)
```

#### `>>` — Right Shift (÷2 per shift)

```cpp
20 >> 1   // = 10  (20 ÷ 2)
20 >> 2   // = 5   (20 ÷ 4)
n >> i    // = n / 2^i
(n >> i) & 1   // get value of bit i  ← most common use
```

---

### 4 Bit Tricks Used in Every Interview

```cpp
n & 1                  // check if n is ODD (1=odd, 0=even)
n & (n-1) == 0         // check if n is POWER OF 2 (also n > 0)
(n >> i) & 1           // get value of bit i
n | (1<<i)             // SET bit i
n & ~(1<<i)            // CLEAR bit i
n ^ (1<<i)             // TOGGLE bit i
```

---

### Logical vs Bitwise — The Trap

```cpp
int a = 2, b = 1;
a && b   // = 1  (logical:  both nonzero = both true)
a & b    // = 0  (bitwise:  0010 & 0001 = 0000)
// Same inputs, completely different results!

// Always use && / || for conditions
// Always use & / | for bit manipulation
```

---

**Precedence trap:**
```cpp
// & has lower precedence than ==
if(n & 1 == 0)      // parsed as: n & (1 == 0) = n & 0 = 0 — WRONG
if((n & 1) == 0)    // correct: check if n is even
// Rule: always wrap bitwise ops in parentheses inside conditions
```

---

### Conditionals

```cpp
// if-else
if(condition) {
    // ...
} else if(another) {
    // ...
} else {
    // ...
}

// Ternary
int result = (a > b) ? a : b;

// Switch — for discrete values (int, char, enum)
switch(op) {
    case '+': result = a + b; break;
    case '-': result = a - b; break;
    default:  cout << "invalid"; break;
}
```

**Switch trap — missing `break` causes fall-through:**
```cpp
switch(x) {
    case 1: cout << "one";   // NO break — falls through!
    case 2: cout << "two";   // this runs even when x==1
    break;
}
```

**From your code (Basic_Patterns_Loops/Calculator.cpp + Switch.cpp):** Switch works on `int` and `char`. Note `case '1':` and `case 1:` are different — `'1'` has ASCII value 49, not 1.

---

### Assignment Operators — Interview Traps

#### Pre vs Post Increment

```cpp
int x = 5;

int a = x++;    // a = 5, x = 6  (use THEN increment)
int b = ++x;    // x = 7, b = 7  (increment THEN use)
```

Standalone line — no difference:
```cpp
x++;    // same result as ++x when not used in expression
++x;
```

Where it matters:
```cpp
int arr[] = {10, 20, 30};
int i = 0;
cout << arr[i++];   // prints arr[0]=10, then i becomes 1
cout << arr[++i];   // i becomes 2 first, then prints arr[2]=30
```

**Undefined behavior trap interviewers ask about:**
```cpp
int x = 5;
int y = x++ + ++x;   // UNDEFINED BEHAVIOR in C++ — never write this
// Correct answer: "this is UB, result is compiler-dependent"
```

#### Compound Assignment

```cpp
x += 5;   x -= 5;   x *= 5;   x /= 5;   x %= 5;

// Bitwise compound — also valid
x &= mask;    // x = x & mask
x |= flag;    // x = x | flag
x ^= val;     // x = x ^ val
x <<= 2;      // x = x * 4
x >>= 1;      // x = x / 2
```

Common interview uses:
```cpp
// Toggle a boolean with XOR
bool visited = false;
visited ^= 1;    // true
visited ^= 1;    // false again

// Accumulate XOR (find single non-duplicate)
int result = 0;
for (int x : arr) result ^= x;

// Modular arithmetic — keep sum in range
sum = (sum + x) % MOD;
```

---

### Loops

#### Basic for loop structure

```cpp
for (init; condition; update) {
    // body
}
// Order: init(once) → condition → body → update → condition → ...
```

Common patterns:
```cpp
for (int i = 0; i < n; i++) { }        // 0 to n-1
for (int i = n-1; i >= 0; i--) { }     // n-1 to 0
for (int i = 0; i < n; i += 2) { }     // 0, 2, 4 ...
for (int i = 0, j = n-1; i < j; i++, j--) { }   // two-pointer in one loop
```

Loop control:
```cpp
for (int i = 0; i < n; i++) {
    if (i == 3) continue;   // skip i=3, jump to i=4
    if (i == 7) break;      // exit loop entirely
}
```

Infinite loop:
```cpp
for (;;) {          // no condition = always true
    if (done) break;
}
```

#### Loop variable scope trap

```cpp
for (int i = 0; i < n; i++) { }
cout << i;   // ERROR — i doesn't exist outside loop

int i;
for (i = 0; i < n; i++) { }
cout << i;   // fine — i == n here (condition became false)
```

#### Nested loops — complexity

```cpp
for (int i = 0; i < n; i++)
    for (int j = 0; j < n; j++)         // O(n²) — both full range

for (int i = 0; i < n; i++)
    for (int j = i+1; j < n; j++)       // O(n²) still — n(n-1)/2 iterations

for (int i = 0; i < n; i++)
    for (int j = 0; j < n; j++)
        for (int k = 0; k < n; k++)     // O(n³)
```

#### while and do-while

```cpp
// while — condition checked BEFORE body
while (condition) { }

// do-while — body runs AT LEAST ONCE, condition checked after
do {
    // runs once even if condition is false from start
} while (condition);
```

#### Range-based for — which form to use

```cpp
for (int x : v) { }            // COPY — changes don't affect v
for (int& x : v) { x++; }     // REFERENCE — modifies v
for (const auto& x : v) { }   // CONST REF — read-only, no copy cost

// Rule:
// int, char (small types)         → for (int x : v)
// string, vector, struct (large)  → for (const auto& x : v)
// need to modify original         → for (auto& x : v)
```

**Pattern printing — outer loop = rows, inner = columns:**
```cpp
for (int i = 1; i <= n; i++) {
    for (int j = 1; j <= i; j++) cout << "* ";
    cout << "\n";
}
// Number of inner iterations is a function of outer variable i
```

---

### Functions

```cpp
// Declaration (prototype) — optional if defined before use
int add(int a, int b);

// Definition
int add(int a, int b) {
    return a + b;
}

// Default arguments — must be at the END
void print(int arr[], int n, int start = 0) {
    for(int i = start; i < n; i++) cout << arr[i];
}
print(arr, 5);      // start defaults to 0
print(arr, 5, 2);   // start = 2

// Inline function — compiler replaces call with body (avoids call overhead)
inline int getMax(int& a, int& b) {
    return (a > b) ? a : b;
}
// Modern compilers inline automatically — mainly a hint now

// Function overloading — same name, different parameter types
int add(int a, int b) { return a + b; }
double add(double a, double b) { return a + b; }
```

**From your code (Basic_Patterns_Loops/defaultArgs.cpp + inlineFunctions.cpp):** Default args must be rightmost parameters. You can't do `void f(int start = 0, int n)` — compiler can't tell which arg you're skipping.

---

### Macros & Constants

```cpp
// Macro — text substitution before compilation
#define PI 3.14
#define area(r) (PI * r * r)    // function-like macro

// Prefer const/constexpr over macros — type-safe, debuggable
const int MOD = 1e9 + 7;
const double PI = 3.14159;
constexpr int MAX = 1e5 + 5;

// Useful macros in competitive coding
#define ll long long
#define pii pair<int,int>
#define vii vector<int>
#define pb push_back
#define all(v) v.begin(), v.end()
```

**From your code (Basic_Patterns_Loops/macros.cpp):** `#define area(r) (PI*r*r)` — note the parentheses around `r`. Without them, `area(a+b)` expands to `PI*a+b*a+b` — wrong. Always wrap macro parameters in parentheses.

---

### Global vs Local Variables

```cpp
int score = 15;     // global — accessible everywhere, lives for program lifetime

void a(int& i) {
    score++;        // modifies global score
}

int main() {
    cout << score;  // 15
    a(i);
    cout << score;  // 16 — modified by a()
}
```

**From your code (Basic_Patterns_Loops/globalVariable.cpp):** Global variables are shared across all functions. This is why global `dp[]` arrays work in recursion with memoization — every recursive call reads/writes the same array without passing it.

**Interview note:** Avoid globals in production. In competitive/DSA, using global arrays for DP/visited is a common and accepted pattern.

---

### Time & Space Complexity — Quick Reference

Interviewers expect you to state complexity for every solution.

```
O(1)        constant     — array access, hash map lookup (avg)
O(log n)    logarithmic  — binary search, balanced BST ops
O(n)        linear       — single loop, linear scan
O(n log n)  linearithmic — sort, heap operations × n
O(n²)       quadratic    — nested loops
O(2^n)      exponential  — subsets, brute-force recursion
O(n!)       factorial    — all permutations
```

**Rough constraints → complexity guide:**
```
n ≤ 10^6  → O(n) or O(n log n)
n ≤ 10^5  → O(n log n) or O(n √n)
n ≤ 10^4  → O(n²) acceptable
n ≤ 10^3  → O(n²) or O(n³)
n ≤ 20    → O(2^n) or O(n!)
```

**Space complexity:** Count the extra memory your algorithm uses (not input size).
```cpp
// O(1) space — only a few variables
int sum = 0;
for(int x : v) sum += x;

// O(n) space — extra array/map of input size
vector<int> prefix(n);

// O(n) space — recursion stack depth up to n
void dfs(int node) { dfs(next); }  // depth = n in worst case
```

---

## 1. Memory & Variables

### What actually happens when you declare a variable

```
Stack memory  → local variables, function call frames (auto-freed)
Heap memory   → new/malloc (you manage, you free)
```

- Every variable has an **address** (location in memory) and a **value** (what's stored there).
- `&x` gives the address of `x`.
- Size of pointer is always **8 bytes on 64-bit systems** (regardless of what it points to).

```cpp
int num = 5;
cout << &num;       // address (e.g. 0x61ff08)
int *ptr = &num;
cout << ptr;        // same address
cout << *ptr;       // value: 5
cout << sizeof(ptr); // 8 bytes always
```

**From your code (Pointer/intro.cpp):** The key insight is that `sizeof(ptr)` is always 8 regardless of whether it's `int*` or `double*`. The pointer stores an address, not the value — so size is fixed.

---

## 2. Pass by Value vs Reference vs Pointer

This is the most fundamental concept. Get this wrong and nothing else works.

### Pass by Value — copy is made, original unchanged

```cpp
void dummy(int n) {
    n++;            // modifies the copy, not original
}
int main() {
    int n = 5;
    dummy(n);
    cout << n;      // still 5
}
```

**From your code (Functions/passByValue.cpp):** Classic trap — students assume `n++` inside `dummy` changes `n` in `main`. It doesn't. A copy is made.

### Pass by Reference — alias, original changes

```cpp
void update(int& n) {
    n++;            // modifies original
}
int main() {
    int n = 5;
    update(n);
    cout << n;      // 6
}
```

### Pass by Pointer — pass address, dereference to change

```cpp
void update(int *p) {
    *p = *p + 1;    // modifies value at address
}
int main() {
    int val = 5;
    update(&val);
    cout << val;    // 6
}
```

### When to use which

| Scenario | Use |
|----------|-----|
| Read-only, small type (int, char) | Pass by value |
| Read-only, large object (vector, string) | Pass by `const&` |
| Modify the original | Pass by `&` (reference) |
| Can be null, or pointer arithmetic needed | Pass by pointer |
| Modify the pointer itself | Double pointer `**` |

### Reference Variable — key rules

```cpp
int i = 5;
int& j = i;     // j is an alias for i
j++;            // i becomes 6
// Rules:
// 1. Must be initialized at declaration
// 2. Cannot be reassigned to another variable
// 3. NOT a copy — any change to j reflects in i
```

**From your code (dynamicAllocation/ReferenceVariable.cpp):** Note the dangerous pattern of returning a reference to a local variable (`int& func(int a)`) — this is undefined behavior. Local variable dies when function returns.

---

## 3. Pointers Deep Dive

### What a pointer actually is in memory

```
int num = 5;
int *ptr = &num;

Memory layout:
┌─────────────┐          ┌─────────────┐
│  ptr        │          │  num        │
│  0x61ff04   │ ──────►  │  5          │
│  (address   │          │  (at 0x61ff04)
│   of num)   │          └─────────────┘
└─────────────┘

ptr  = 0x61ff04   (an address)
*ptr = 5          (the value at that address)
&ptr = 0x61ff08   (address of ptr itself)
```

---

### Basic Pointer Operations

```cpp
int num = 5;
int *ptr = &num;

cout << ptr;    // prints address, e.g. 0x61ff04
cout << *ptr;   // prints 5     (dereference)
cout << &ptr;   // prints address of ptr itself

*ptr = 10;      // num is now 10 — you modified via pointer
ptr++;          // moves to NEXT int address (+4 bytes on 32-bit, not +1)
```

**Pointer size is always fixed** — doesn't matter what it points to:
```cpp
int    *p1;   // sizeof = 4 (32-bit) or 8 (64-bit)
double *p2;   // sizeof = 4 or 8 — SAME as p1
char   *p3;   // sizeof = 4 or 8 — SAME
// The SIZE of a pointer never changes. Only the STEP size of ptr++ changes.
```

---

### Pointer Arithmetic — how stepping works

```cpp
int arr[] = {10, 20, 30, 40};
int *p = arr;   // p points to arr[0]

// Each ++ moves by sizeof(int) = 4 bytes
p + 0  →  arr[0] = 10
p + 1  →  arr[1] = 20   (moved 4 bytes)
p + 2  →  arr[2] = 30   (moved 8 bytes)
p + 3  →  arr[3] = 40   (moved 12 bytes)

// These are all equivalent:
arr[2]    ==  *(arr + 2)  ==  *(p + 2)  ==  p[2]
```

**Subtraction gives element count, not byte count:**
```cpp
int* a = &arr[1];
int* b = &arr[4];
cout << b - a;   // 3 — elements between them, not bytes
```

**What you CAN and CANNOT do:**
```cpp
ptr + 2    // OK — moves pointer forward
ptr - 2    // OK — moves pointer backward
ptr2 - ptr1 // OK — distance in elements
ptr++      // OK — advance by 1 element
ptr2 + ptr1 // ILLEGAL — adding addresses is meaningless
```

---

### Pointer to Array — how arrays decay

```cpp
int arr[6] = {1, 2, 3, 4, 5, 6};

// arr decays to pointer to first element in most contexts
int *p = arr;       // same as &arr[0]
cout << *p;         // 1
cout << *(p + 2);   // 3

// Passing to function — arr decays to int*
void printFirst(int* arr) {
    cout << arr[0];         // works fine
    cout << sizeof(arr);    // WRONG — gives 4/8 (pointer size), NOT 24
}
// Inside function, arr is just a pointer. Array size is LOST.
// Always pass size separately: printFirst(arr, 6)
```

**`arr` vs `&arr` — subtle difference:**
```cpp
int arr[4] = {1,2,3,4};
cout << arr;      // address of first element:  e.g. 0x100
cout << arr + 1;  // 0x104  (moves by sizeof(int) = 4)

cout << &arr;     // also 0x100 — same address BUT different type
cout << &arr + 1; // 0x110  (moves by sizeof entire array = 16)
```

---

### Pointer and Character Arrays

```cpp
char arr[] = "hello";
char *p = arr;

cout << p;      // prints "hello" — cout treats char* specially, reads until '\0'
cout << p + 2;  // prints "llo"  — starts from index 2

// Iterating a string with pointer:
while(*p != '\0') {
    cout << *p;
    p++;
}
```

**Why `cout << p` prints the whole string but `cout << ptr` prints an address for int\*?**
`cout` has a special overload for `char*` that treats it as a C-string and prints until `\0`. For any other pointer type it prints the raw address.

---

### Double Pointer

```cpp
int i = 5;
int *p  = &i;    // p  holds address of i
int **p2 = &p;   // p2 holds address of p

Memory:
┌──────┐     ┌──────┐     ┌──────┐
│  p2  │ ──► │  p   │ ──► │  i   │
│ addr │     │ addr │     │  5   │
└──────┘     └──────┘     └──────┘

*p2  = address of i  (same as p)
**p2 = 5             (actual value)
```

**Three operations — which one does what:**
```cpp
p2 = p2 + 1;      // moves p2 itself — NO effect on i or p
*p2 = *p2 + 1;    // moves p (changes what p points to) — NO effect on i
**p2 = **p2 + 1;  // increments i — THIS is what you usually want
```

**When do you need double pointer?** When you want to modify the pointer itself inside a function:
```cpp
// WRONG — p is a copy, changes don't escape
void allocate(int* p) {
    p = new int(10);   // only local copy changes
}

// CORRECT — we pass address of p, so we can change p itself
void allocate(int** p) {
    *p = new int(10);  // modifies caller's pointer
}

int main() {
    int* ptr = nullptr;
    allocate(&ptr);
    cout << *ptr;   // 10
}
```

**From your code (Pointer/doublePointer.cpp):** Three levels of confusion clarified:
- `p2 = p2 + 1` → moves the pointer-to-pointer. No effect outside.
- `*p2 = *p2 + 1` → moves the inner pointer. Changes where `p` points.
- `**p2 = **p2 + 1` → changes the actual integer value. This is what you want.

---

### Pass by Pointer vs Pass by Value

```cpp
// Pass by value — copy made, original unchanged
void byValue(int x) {
    x = 100;           // only local copy changes
}

// Pass by pointer — can modify original
void byPointer(int* x) {
    *x = 100;          // modifies the actual variable
}

// Swap example — the classic interview test
void swap(int* a, int* b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main() {
    int x = 5, y = 10;
    byValue(x);          // x still 5
    byPointer(&x);       // x is now 100
    swap(&x, &y);        // works correctly
}
```

**Pointer to pointer for swap of pointers themselves:**
```cpp
void swapPtrs(int** a, int** b) {
    int* temp = *a;
    *a = *b;
    *b = temp;
}
```

---

### Dangerous Patterns — UB you WILL be asked about

```cpp
// 1. Returning address of local variable — DANGLING
int* danger() {
    int x = 5;
    return &x;    // x dies here, pointer is now dangling — UB
}

// 2. NULL dereference — crash
int* p = nullptr;
*p = 5;           // segfault

// 3. Uninitialized pointer — wild pointer
int* wild;
*wild = 10;       // points to random memory — UB / crash

// 4. delete without nullptr reset — dangling
int* p = new int(5);
delete p;
*p = 10;          // UB — memory already freed
p = nullptr;      // do this immediately after delete

// 5. Array out of bounds via pointer
int arr[3] = {1, 2, 3};
int* p = arr;
*(p + 5) = 99;    // writes beyond array — UB, may corrupt other vars
```

---

### Pointer Interview Questions

#### Conceptual — "Explain the difference" type

**Q1. NULL vs Wild vs Dangling pointer — what's each one?**

| Type | What it is | How it happens | Fix |
|------|-----------|----------------|-----|
| **NULL** | Intentionally points nowhere (`nullptr`) | You set it explicitly | Safe to check with `if(ptr)` |
| **Wild** | Uninitialized — holds garbage address | Declared but never assigned | Always initialize: `int* p = nullptr;` |
| **Dangling** | Points to memory that was freed/expired | `delete ptr` but didn't set to `nullptr`, or returned address of local variable | Set to `nullptr` after `delete`; never return address of local |

```cpp
int* wild;          // wild pointer — could point anywhere, UB to dereference
int* p = nullptr;   // NULL pointer — safe

int* dangling = new int(5);
delete dangling;
// dangling still holds the old address — UB to use
dangling = nullptr; // now safe
```

---

**Q2. What is the difference between `const int* ptr` and `int* const ptr`?**

```cpp
const int* ptr   // pointer to const — CAN move ptr, CANNOT change *ptr
int* const ptr   // const pointer   — CANNOT move ptr, CAN change *ptr
const int* const ptr  // both locked
```

Memory trick: read right-to-left from the variable name.
- `int* const ptr` → "ptr is a const pointer to int" → ptr is locked
- `const int* ptr` → "ptr is a pointer to const int" → value is locked

---

**Q3. Why can't you do arithmetic on a `void*` pointer?**

Pointer arithmetic moves by `sizeof(type)`. A `void*` has no type, so the compiler doesn't know how many bytes to jump. You must cast first:

```cpp
void* vp = &x;
// vp++;         // ERROR — size unknown
((int*)vp)++;    // OK after cast
```

---

**Q4. Pointer vs Reference — when to use which?**

| | Pointer | Reference |
|---|---------|-----------|
| Can be null | Yes | No |
| Can be reassigned | Yes | No |
| Needs `*` to dereference | Yes | No (transparent) |
| Use when | optional param, array traversal, dynamic memory | alias, pass-by-ref in functions |

**Interview answer:** Use references when the argument is always required and won't change binding. Use pointers when null is a valid state or when you need to reassign.

---

#### Output-Based — "What does this print?"

**Q5.**
```cpp
int a = 5, b = 10;
int* p = &a;
p = &b;
(*p)++;
cout << a << " " << b;
```
<details><summary>Answer</summary>
`5 11` — p was reassigned to b, so `(*p)++` increments b, not a.
</details>

---

**Q6.**
```cpp
int arr[] = {10, 20, 30, 40};
int* p = arr;
p++;
cout << *p << " " << *(p+1);
```
<details><summary>Answer</summary>
`20 30` — `p++` moves to index 1, `*(p+1)` is index 2.
</details>

---

**Q7.**
```cpp
int x = 10;
int* p = &x;
int** q = &p;
**q = 20;
cout << x;
```
<details><summary>Answer</summary>
`20` — `**q` dereferences twice to reach `x` directly.
</details>

---

**Q8. Classic trap — `*ptr++` vs `(*ptr)++`**
```cpp
int arr[] = {1, 2, 3};
int* p = arr;
cout << *p++ << " ";   // Line A
cout << *p   << " ";   // Line B
int* q = arr;
cout << (*q)++ << " "; // Line C
cout << *q;            // Line D
```
<details><summary>Answer</summary>
`1 2 1 2`
- `*p++` → prints `*p` (=1), THEN increments pointer. So Line B sees p pointing to arr[1] = 2.
- `(*q)++` → increments the VALUE at q (arr[0] becomes 2), prints old value 1. Line D sees arr[0] = 2.
</details>

---

**Q9. Pointer subtraction**
```cpp
int arr[] = {10, 20, 30, 40, 50};
int* p = &arr[1];
int* q = &arr[4];
cout << q - p;
```
<details><summary>Answer</summary>
`3` — pointer subtraction gives number of elements between them, not byte difference.
</details>

---

**Q10. sizeof trap**
```cpp
int arr[10];
int* ptr = arr;
cout << sizeof(arr) << " " << sizeof(ptr);
```
<details><summary>Answer</summary>
`40 4` (32-bit compiler) or `40 8` (64-bit compiler) — `sizeof(arr)` = 10 × 4 = 40 (always). `sizeof(ptr)` = pointer size = 4 or 8 depending on compiler target. The key point: `sizeof(arr) ≠ sizeof(ptr)` — this is the classic array-decays-to-pointer trap when passing to functions.
</details>

---

#### Advanced — asked at SDE-2+ level

**Q11. What is a function pointer? Write one.**
```cpp
int add(int a, int b) { return a + b; }

int (*fp)(int, int) = &add;  // fp is a pointer to function taking 2 ints, returning int
cout << fp(3, 4);             // prints 7
```
Used in: callbacks, strategy pattern, jump tables in embedded systems.

---

**Q12. Returning a pointer from a function — what's safe, what's not?**
```cpp
// UNSAFE — local variable dies, pointer dangles
int* bad() {
    int x = 5;
    return &x;  // UB
}

// SAFE — heap memory persists
int* good() {
    int* x = new int(5);
    return x;   // caller must delete
}

// SAFE — static memory persists
int* alsoGood() {
    static int x = 5;
    return &x;
}
```

---

**Q13. Smart pointers — why do they exist? (C++11)**
```cpp
// Raw pointer — you must manually delete, easy to forget
int* raw = new int(5);
delete raw;

// unique_ptr — auto-deleted when out of scope, single owner
unique_ptr<int> up = make_unique<int>(5);

// shared_ptr — ref-counted, multiple owners
shared_ptr<int> sp1 = make_shared<int>(5);
shared_ptr<int> sp2 = sp1;  // ref count = 2, deleted when both go out of scope
```
**Interview one-liner:** Smart pointers implement RAII — resource lifetime is tied to object lifetime, eliminating manual `delete` and memory leaks.

---

#### Quick Fire — common yes/no traps

| Question | Answer |
|----------|--------|
| Can a pointer point to another pointer? | Yes — that's `**` double pointer |
| Can you increment an array name like `arr++`? | No — array name is not an lvalue |
| Is `NULL` and `nullptr` the same? | `nullptr` (C++11) is type-safe; `NULL` is just `0` (int), prefer `nullptr` |
| Can two pointers be added? | No — meaningless. Only `ptr - ptr` (gives distance) and `ptr + int` are valid |
| Does `delete` set the pointer to null? | No — you must do it manually: `delete p; p = nullptr;` |
| Size of pointer on 32-bit vs 64-bit? | 4 bytes vs 8 bytes, regardless of what it points to |

---

## 4. Dynamic Memory Allocation

```cpp
// Allocate
int* arr = new int[n];      // heap, runtime size
int* single = new int(5);   // single int, value 5

// Deallocate — MUST do or you have a memory leak
delete[] arr;
delete single;
```

### Memory Leak — what it looks like

```cpp
// Case 1 — NO leak (stack variable, auto freed)
while(true) {
    int i = 5;
}

// Case 2 — MEMORY LEAK (heap memory never freed)
while(true) {
    int* ptr = new int;  // allocates 4 bytes each iteration, never freed
}
```

**From your code (dynamicAllocation/dynamicArray.cpp):** This code demonstrates both cases side-by-side — Case 1 is fine, Case 2 leaks infinitely. In interview problems on LC/GFG you rarely need `delete`, but the concept is asked.

**In interviews:** When asked about memory management, mention RAII, smart pointers (`unique_ptr`, `shared_ptr`). You don't need to implement them, but knowing they exist shows seniority.

---

## 5. STL — Vector

The most used DS in C++ interviews. Know every operation cold.

### Core Operations & Complexities

```cpp
vector<int> v;              // empty
vector<int> v(5, 0);        // size 5, all zeros — O(n)
vector<int> v2 = v;         // deep copy — O(n), independent!

v.push_back(x);             // O(1) amortized
v.pop_back();               // O(1)
v.size();                   // O(1)
v.empty();                  // O(1)
v[i];                       // O(1) — no bounds check
v.at(i);                    // O(1) — with bounds check, throws exception
v.front();                  // O(1)
v.back();                   // O(1)
v.clear();                  // O(n)
v.resize(10);               // O(n)
v.erase(v.begin() + i);     // O(n) — shifts elements
v.insert(v.begin() + i, x); // O(n) — shifts elements
```

### Capacity vs Size

```cpp
vector<int> v;
v.reserve(100);     // allocates memory for 100, size stays 0
v.capacity();       // how much memory is allocated
v.size();           // how many elements currently
```

**Why it matters in interviews:** `push_back` is O(1) amortized because vector doubles capacity when full. If you know the size upfront, `reserve()` avoids reallocations.

### 2D Vector

```cpp
vector<vector<int>> dp(n, vector<int>(m, 0));   // n×m grid, all 0
dp[i][j] = 5;
```

**From your code (STL/vector.cpp):** Vector copy (`v3 = v2`) is O(n) deep copy. Modifying `v3` doesn't affect `v2`. This is different from Java/Python where assignment creates a reference.

### Common Traps

```cpp
// TRAP 1: Iterating while erasing
for(auto it = v.begin(); it != v.end(); ) {
    if(*it == target) it = v.erase(it);  // erase returns next valid iterator
    else ++it;
}

// TRAP 2: Index out of bounds — v[i] doesn't throw, v.at(i) does
// TRAP 3: Comparing size() (unsigned) with negative int
if(v.size() - 1 >= 0)   // ALWAYS TRUE — size() is unsigned
if((int)v.size() - 1 >= 0)   // correct
```

---

## 6. STL — Pair

```cpp
pair<int, string> p = {2, "abc"};
pair<int, string> p2 = make_pair(3, "xyz");

p.first;    // 2
p.second;   // "abc"

// In vector
vector<pair<int,int>> vp = {{1,2}, {3,4}};
vp.push_back({5,6});
vp[0].first;    // 1

// Sorting vector of pairs — sorts by first, then second by default
sort(vp.begin(), vp.end());

// Swap
swap(vp[0], vp[1]);
```

**From your code (STL/Pair_vector.cpp + Iterator1.cpp):** Pair reference assignment `pair<int,string>& p1 = p; p1.first = 4;` changes `p.first` too — reference is an alias.

---

## 7. STL — Map & Unordered Map

### `map<K,V>` — Sorted, Red-Black Tree

```cpp
map<int, string> m;

// Insert — O(log n)
m[1] = "abc";
m.insert({4, "xyz"});

// Access — O(log n)
m[1];               // returns value; INSERTS default if key doesn't exist!
m.at(1);            // returns value; throws if key doesn't exist

// Find — O(log n)
auto it = m.find(7);
if(it != m.end()) { /* found */ }

// Erase — O(log n)
m.erase(3);         // by key
m.erase(it);        // by iterator — ONLY if it != m.end(), else crash!

// Size, clear
m.size();
m.clear();

// Iterate — keys come out in SORTED order
for(auto& [key, val] : m) { }      // C++17 structured binding
for(auto& pr : m) { pr.first; pr.second; }
```

**From your code (STL/map1.cpp + map2.cpp):** Two important insights:
1. Map keys are **always sorted** (string keys → dictionary order, int keys → numeric order)
2. `m[key]` on a non-existent key **silently inserts a default value** — this is a bug in frequency-counting if you're not careful. Use `m.count(key)` or `m.find(key)` to check existence first.

### `unordered_map<K,V>` — Hash Table

```cpp
unordered_map<int, int> um;
um[key]++;              // O(1) average, O(n) worst case

// Same API as map but:
// - No sorted order
// - O(1) average vs O(log n) for map
// - Slightly higher constant factor
```

### When to use which

| | `map` | `unordered_map` |
|--|-------|-----------------|
| Order needed | ✅ Sorted | ❌ |
| Time complexity | O(log n) | O(1) avg |
| Ordered iteration | ✅ | ❌ |
| Custom key type | Need comparator | Need hash function |
| Worst case | O(log n) | O(n) — hash collision |

**Interview rule:** Default to `unordered_map` for frequency counting. Use `map` when you need sorted order or `lower_bound` on keys.

### Map `lower_bound`

```cpp
map<int,int> mp;
auto it = mp.lower_bound(key);  // first key >= given key — O(log n)
auto it = mp.upper_bound(key);  // first key > given key — O(log n)
```

---

## 8. STL — Set & Multiset

**Your codebase has no set examples** — gap filled here.

```cpp
set<int> s;

// Insert — O(log n)
s.insert(5);
s.insert(3);
s.insert(5);    // duplicate ignored

// Find — O(log n)
s.find(3);      // iterator or s.end()
s.count(3);     // 0 or 1 for set

// Erase — O(log n)
s.erase(3);     // by value
s.erase(it);    // by iterator

// Sorted order always
for(int x : s) cout << x; // prints in ascending order

// Lower/upper bound — O(log n)
auto it = s.lower_bound(4); // first element >= 4
auto it = s.upper_bound(4); // first element > 4
```

```cpp
// multiset — allows duplicates
multiset<int> ms;
ms.insert(5);
ms.insert(5);
ms.count(5);    // 2

// Erase ALL occurrences of 5
ms.erase(5);

// Erase ONE occurrence of 5
ms.erase(ms.find(5));   // CRITICAL — use find, not value
```

### unordered_set

```cpp
unordered_set<int> us;  // O(1) avg, no sorted order
us.insert(x);
us.count(x);    // 0 or 1
```

---

## 9. STL — Priority Queue (Heap)

**Your codebase has no priority_queue examples** — most commonly forgotten, gap filled here.

```cpp
// Max-heap (default)
priority_queue<int> maxPQ;
maxPQ.push(5);
maxPQ.push(1);
maxPQ.push(3);
maxPQ.top();        // 5 — largest
maxPQ.pop();        // removes 5
maxPQ.size();
maxPQ.empty();

// Min-heap — MUST memorize this syntax
priority_queue<int, vector<int>, greater<int>> minPQ;
minPQ.push(5);
minPQ.top();        // 1 — smallest
```

### Custom Comparator for Priority Queue

```cpp
// Sort pairs by second element (min-heap on second)
auto cmp = [](pair<int,int>& a, pair<int,int>& b) {
    return a.second > b.second;  // > means min-heap
};
priority_queue<pair<int,int>, vector<pair<int,int>>, decltype(cmp)> pq(cmp);
```

### When to use

| Problem | Use |
|---------|-----|
| Kth largest | Min-heap of size k |
| Kth smallest | Max-heap of size k |
| Dijkstra | Min-heap on distance |
| Merge K sorted lists | Min-heap |
| Running median | Two heaps |

**The trap:** Priority queue does NOT support `decrease-key` operation. In Dijkstra, you push duplicate entries and check if already visited.

---

## 10. STL — Stack & Queue

```cpp
// Stack — LIFO
stack<int> st;
st.push(x);
st.top();       // peek
st.pop();       // remove top (returns void!)
st.empty();
st.size();

// Queue — FIFO
queue<int> q;
q.push(x);
q.front();      // peek front
q.back();       // peek back
q.pop();        // remove front (returns void!)
q.empty();
q.size();

// Deque — double-ended
deque<int> dq;
dq.push_front(x);
dq.push_back(x);
dq.pop_front();
dq.pop_back();
dq.front();
dq.back();
```

---

## 11. Sorting & Custom Comparators

### Basic Sort

```cpp
sort(arr, arr + n);             // array — O(n log n) introsort
sort(v.begin(), v.end());       // vector ascending
sort(v.rbegin(), v.rend());     // vector descending
```

### Custom Comparator — the syntax people forget

```cpp
// Method 1: standalone function
bool cmp(int a, int b) {
    return a > b;   // descending
}
sort(v.begin(), v.end(), cmp);

// Method 2: lambda (most common in interviews)
sort(v.begin(), v.end(), [](int a, int b) {
    return a > b;   // descending
});

// Sort pairs by second element
sort(vp.begin(), vp.end(), [](auto& a, auto& b) {
    return a.second < b.second;
});

// Sort by frequency, then by value
sort(v.begin(), v.end(), [&freq](int a, int b) {
    if(freq[a] != freq[b]) return freq[a] < freq[b];
    return a < b;
});
```

**From your code (STL/Sorting.cpp):** The comparator `cmp(a, b)` returns `true` if `a` should come BEFORE `b`. So `return a > b` puts larger elements first (descending).

### Comparator Rule — the golden rule

> Return `true` if first argument should appear **before** second argument.

```
a < b  → ascending (default)
a > b  → descending
```

**Common interview trap:** `sort` expects a **strict weak ordering** — never return `true` when `a == b`. This causes undefined behavior.

---

## 12. lower_bound & upper_bound

Must work on both arrays and vectors. Array MUST be sorted.

```cpp
// On array — returns pointer
int arr[] = {-35, -9, 0, 1, 3, 4};  // sorted
int *lb = lower_bound(arr, arr + 6, 1);  // first element >= 1
int *ub = upper_bound(arr, arr + 6, 1);  // first element > 1

// Get index
int idx = lb - arr;

// Not found check
if(lb == arr + n) { /* not found */ }

// On vector — returns iterator
auto it = lower_bound(v.begin(), v.end(), target);
int idx = it - v.begin();

// On map — returns iterator to first key >= given key
auto it = m.lower_bound(key);
```

**From your code (STL/lowerbound_upperbound.cpp):** Key insight — pointer arithmetic `ptr - arr` gives the index. On map, you can't do pointer subtraction — you just use the iterator directly.

### lower_bound vs upper_bound

```
Array: [-35, -9, 0, 1, 1, 3, 4]
                     ^lb(1)  ^ub(1)
lower_bound(1) → index of FIRST 1
upper_bound(1) → index AFTER LAST 1
upper_bound(1) - lower_bound(1) = count of 1s
```

---

## 13. Built-in Algorithms

```cpp
// All O(n) unless noted
min_element(v.begin(), v.end());     // returns iterator
max_element(v.begin(), v.end());     // returns iterator
*min_element(v.begin(), v.end());    // dereference for value

accumulate(v.begin(), v.end(), 0);   // sum with initial value
count(v.begin(), v.end(), val);      // count occurrences
find(v.begin(), v.end(), val);       // returns iterator, or end() if not found

reverse(v.begin(), v.end());         // in-place reverse
rotate(v.begin(), v.begin()+k, v.end()); // left rotate by k

all_of(v.begin(), v.end(), pred);    // true if ALL satisfy pred
any_of(v.begin(), v.end(), pred);    // true if ANY satisfies pred
none_of(v.begin(), v.end(), pred);   // true if NONE satisfy pred

next_permutation(v.begin(), v.end()); // next permutation in-place, returns false if at last
prev_permutation(v.begin(), v.end());

fill(v.begin(), v.end(), val);       // fill all with val
iota(v.begin(), v.end(), 0);         // fill with 0,1,2,3,... (from <numeric>)

// __builtin functions (GCC only, important for competitive)
__builtin_popcount(n);    // count set bits in int
__builtin_popcountll(n);  // count set bits in long long
__builtin_clz(n);         // count leading zeros
__builtin_ctz(n);         // count trailing zeros
```

**From your code (STL/InBuilt.cpp):** `accumulate` takes an initial value as third argument. If you want sum, pass `0`. If you want product, pass `1`. If you pass `0` with a vector of floats, result will be int — pass `0.0` for float sum.

---

## 14. Lambda Functions

```cpp
// Syntax: [capture](params) { body }
auto add = [](int a, int b) { return a + b; };
cout << add(2, 3);   // 5

// Capture by reference — access outer variables
int threshold = 5;
auto isGreater = [&threshold](int x) { return x > threshold; };

// Capture everything by reference
auto f = [&](int x) { return x > threshold; };

// Capture everything by value (copy)
auto f2 = [=](int x) { return x > threshold; };

// In sort
sort(v.begin(), v.end(), [](int a, int b) { return a > b; });

// In all_of
all_of(v.begin(), v.end(), [](int a) { return a > 0; });
```

**From your code (STL/InBuilt.cpp):** Lambda captures — if you use `[&]` in sort comparator that captures `freq` map, every comparator call accesses the map by reference. This is the correct pattern for "sort by frequency" problems.

---

## 15. auto & Range-Based For

```cpp
// auto — type deduction
auto x = 5;             // int
auto it = v.begin();    // vector<int>::iterator
auto& [key, val] = *m.begin();  // structured binding (C++17)

// Range-based for — VALUE COPY (does not modify original)
for(int x : v) { }

// Range-based for — REFERENCE (modifies original)
for(int& x : v) { x++; }   // increments each element

// Range-based for — CONST REFERENCE (read-only, no copy cost)
for(const auto& x : v) { }

// With pairs
for(auto& [key, val] : m) {
    cout << key << " " << val;
}
```

**From your code (STL/Iterator1.cpp):** The comment in your code says it all — range-based for copies by default. To modify, use `&`. For large types, always use `const auto&` to avoid copying.

---

## 16. Iterators

```cpp
v.begin()       // iterator to first element
v.end()         // iterator to ONE PAST last element (not last!)
v.rbegin()      // reverse iterator to last element
v.rend()        // reverse iterator to one before first

// Increment
it++            // move to next element (works for ALL containers)
it + 1          // only works for random-access iterators (vector, array)
                // does NOT work for map, set, list

// Dereference
*it             // value at iterator
it->first       // for pairs/maps
(*it).first     // same thing
```

**From your code (STL/Iterator1.cpp):** The key distinction at the bottom — `it + 1` works for vector (contiguous memory). For map/set (tree-based, non-contiguous), only `it++` works. This catches people out when they try `m.begin() + 2`.

---

## 17. Things Most People Forget

### 1. Min-heap syntax

```cpp
// WRONG — this is max-heap
priority_queue<int> pq;

// CORRECT — min-heap
priority_queue<int, vector<int>, greater<int>> minPQ;
```

### 2. Custom comparator direction

```cpp
// For sort: return true = a comes BEFORE b
// For priority_queue: return true = a has LOWER priority (pushed DOWN)
// So for min-heap behavior with custom type:
auto cmp = [](int a, int b) { return a > b; };  // > gives min-heap in PQ
```

### 3. Map operator[] inserts default value

```cpp
map<int,int> freq;
if(freq[5] == 0) { }    // INSERTS key 5 with value 0 into the map!
// Use this instead:
if(freq.find(5) == freq.end()) { }
if(freq.count(5) == 0) { }
```

### 4. Erase on invalid iterator = crash

```cpp
auto it = m.find(key);
m.erase(it);            // CRASH if key not found (it == m.end())
// Always check:
if(it != m.end()) m.erase(it);
```

### 5. multiset — erase by value removes ALL

```cpp
multiset<int> ms = {1, 2, 2, 3};
ms.erase(2);            // removes BOTH 2s
ms.erase(ms.find(2));   // removes only ONE 2
```

### 6. sort comparator must be strict weak ordering

```cpp
// BUG — returns true when a == b
bool cmp(int a, int b) { return a >= b; }  // UNDEFINED BEHAVIOR
// Correct:
bool cmp(int a, int b) { return a > b; }
```

### 7. vector::size() is unsigned

```cpp
vector<int> v = {1,2,3};
v.size() - 4    // = very large number (unsigned underflow), not -1!
(int)v.size() - 4   // = -1, correct
```

### 8. lower_bound requires SORTED input

```cpp
// lower_bound on unsorted array = GARBAGE result
// Always sort first
sort(arr, arr+n);
lower_bound(arr, arr+n, target);
```

### 9. Pass by value in lambda captures a COPY

```cpp
int x = 5;
auto f = [=]() { return x; };  // captures copy of x at this moment
x = 10;
f();    // still returns 5, not 10
```

### 10. Returning local reference = undefined behavior

```cpp
int& func(int a) {
    int num = a;
    return num;     // num dies when function returns — dangling reference!
}
```

---

## 19. Final Revision Sheet

### Most Important Templates

```cpp
// 1. Min-heap
priority_queue<int, vector<int>, greater<int>> minPQ;

// 2. Custom sort (descending)
sort(v.begin(), v.end(), [](int a, int b){ return a > b; });

// 3. Sort pairs by second
sort(vp.begin(), vp.end(), [](auto& a, auto& b){ return a.second < b.second; });

// 4. Frequency count
unordered_map<int,int> freq;
for(int x : v) freq[x]++;

// 5. lower_bound usage
sort(v.begin(), v.end());
auto it = lower_bound(v.begin(), v.end(), target);
if(it == v.end() || *it != target) { /* not found */ }
int idx = it - v.begin();

// 6. Top-K using min-heap
priority_queue<int, vector<int>, greater<int>> pq;
for(int x : v) {
    pq.push(x);
    if(pq.size() > k) pq.pop();
}

// 7. Pass by const reference (always for large objects)
void solve(const vector<int>& v) { }

// 8. 2D DP table
vector<vector<int>> dp(n+1, vector<int>(m+1, 0));
```

### Complexity Cheatsheet

| Operation | vector | map | unordered_map | set | priority_queue |
|-----------|--------|-----|---------------|-----|----------------|
| Insert | O(1) amort | O(log n) | O(1) avg | O(log n) | O(log n) |
| Delete | O(n) | O(log n) | O(1) avg | O(log n) | O(log n) |
| Search | O(n) | O(log n) | O(1) avg | O(log n) | — |
| Access i-th | O(1) | O(log n) | — | — | — |
| Min/Max | O(n) | O(log n)* | — | O(log n)* | O(1) |
| Ordered | — | ✅ | ❌ | ✅ | — |

*`m.begin()` gives min key, `m.rbegin()` gives max key — O(log n)

### Interview Checklist

- [ ] Can I write min-heap syntax from memory?
- [ ] Can I write sort with lambda comparator correctly?
- [ ] Do I know when `m[key]` is dangerous?
- [ ] Do I know difference between `set::erase(val)` vs `multiset::erase(find(val))`?
- [ ] Can I use `lower_bound` on sorted vector AND on map?
- [ ] Can I write `vector<vector<int>> dp(n, vector<int>(m, 0))` instantly?
- [ ] Do I cast `v.size()` to `int` before subtraction?
- [ ] Am I using `const auto&` in range-for for large objects?

### Most Important Observations

1. `map` iterates in **sorted key order** — exploit this when order matters
2. `priority_queue` only gives you `top()` — no random access
3. `set` = sorted unique elements; `multiset` = sorted with duplicates
4. For competitive/interview, `unordered_map` beats `map` almost always unless you need order or `lower_bound` on keys
5. When sorting with custom comparator, the lambda captures by `[&]` to access external maps/vectors
6. `lower_bound` on a `set`/`map` is a member function (`s.lower_bound(x)`) — NOT the `std::lower_bound` — and it's O(log n) either way
7. `erase` on map/set iterator is safe; erase on `end()` is undefined behavior

---

*Chapter 01 — C++ Basics & STL | Part of DSA Interview Prep series*  
*Based on Striver's A2Z Sheet + Love Babbar lecture series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] Reverse Integer — https://leetcode.com/problems/reverse-integer/
- [ ] Palindrome Number — https://leetcode.com/problems/palindrome-number/
- [ ] GCD of Two Numbers — https://www.geeksforgeeks.org/problems/gcd-of-two-numbers3459/1
- [ ] Armstrong Number — https://leetcode.com/problems/armstrong-number/
- [ ] All Divisors of a Number — https://www.geeksforgeeks.org/problems/all-divisors-of-a-number/1
- [ ] Check for Prime — https://www.geeksforgeeks.org/problems/prime-number2314/1
- [ ] Reverse an Array — https://leetcode.com/problems/reverse-string/
- [ ] Valid Palindrome — https://leetcode.com/problems/valid-palindrome/
- [ ] Fibonacci Number — https://leetcode.com/problems/fibonacci-number/
- [ ] Top K Frequent Elements (Hashing) — https://leetcode.com/problems/top-k-frequent-elements/
- [ ] Sort Array by Frequency — https://leetcode.com/problems/sort-array-by-increasing-frequency/
- [ ] Find All Anagrams in a String (STL warmup) — https://leetcode.com/problems/find-all-anagrams-in-a-string/

