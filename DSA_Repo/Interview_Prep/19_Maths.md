# Chapter 19 — Maths for DSA (Number Theory & Combinatorics)

> **Revision target:** 1 day
> **Goal:** After reading this file, you need nothing else for this topic — no code files, no YouTube, no tutorials.

---

## Table of Contents

1. [Why Maths Matters in Interviews](#1-why-maths-matters-in-interviews)
2. [Primality Check](#2-primality-check)
3. [Sieve of Eratosthenes](#3-sieve-of-eratosthenes)
4. [Prime Factorization](#4-prime-factorization)
5. [Divisors of a Number](#5-divisors-of-a-number)
6. [GCD & LCM](#6-gcd--lcm)
7. [Modular Arithmetic — The Rules](#7-modular-arithmetic--the-rules)
8. [Fast (Modular) Exponentiation](#8-fast-modular-exponentiation)
9. [Modular Inverse & Fermat's Little Theorem](#9-modular-inverse--fermats-little-theorem)
10. [Combinatorics — nCr, nPr, Pascal's Triangle](#10-combinatorics--ncr-npr-pascals-triangle)
11. [nCr % p for Large n (Factorial + Inverse)](#11-ncr--p-for-large-n-factorial--inverse)
12. [Overflow — The Silent Killer](#12-overflow--the-silent-killer)
13. [Things Most People Forget](#13-things-most-people-forget)
14. [Practice Problems](#14-practice-problems)
15. [Final Revision Sheet](#15-final-revision-sheet)

---

## 1. Why Maths Matters in Interviews

Maths problems are usually **short to state, easy to get wrong**. Interviewers love them because a brute force is obvious (O(n) or O(√n) or worse), but the optimal solution needs a specific identity or trick. If a problem mentions:

- "check if prime / find all primes up to N" → Sieve of Eratosthenes
- "prime factors of a number" → trial division up to √n, or smallest-prime-factor sieve
- "GCD / HCF / LCM" → Euclidean algorithm
- "power / exponent, answer mod 10^9+7" → fast exponentiation
- "count ways… mod 10^9+7", "combinations", "choose r from n" → nCr with modular inverse
- "divide under modulo" → modular inverse (division doesn't exist under mod — you must multiply by inverse)
- large intermediate values, "mod 10^9 + 7" appearing in constraints → overflow is baked into the problem, plan for `long long` and mod-at-every-step

**The fundamental insight:** almost all of "maths for DSA" is just number theory (primes, GCD, modular arithmetic) plus counting (combinatorics). Once these ~10 templates are memorized cold, most "maths" interview problems become mechanical.

---

## 2. Primality Check

**Brute force — O(n):**
```cpp
bool isPrimeSlow(int n) {
    if (n < 2) return false;
    for (int i = 2; i < n; i++)
        if (n % i == 0) return false;
    return true;
}
```

**Optimal — O(√n):** if `n = a * b` and `a <= b`, then `a <= √n`. So you only need to check divisors up to `√n`.
```cpp
bool isPrime(int n) {
    if (n < 2) return false;
    for (int i = 2; (long long)i * i <= n; i++)
        if (n % i == 0) return false;
    return true;
}
```

**Why `i * i <= n` and not `i <= sqrt(n)`?** Floating point `sqrt()` can be off by an epsilon near perfect squares, silently causing wrong answers. Integer comparison is exact.

---

## 3. Sieve of Eratosthenes

**Problem:** find/mark all primes up to `N`. Doing `isPrime()` for each number is `O(N√N)` — too slow for `N` up to `10^6`–`10^7`.

**Idea:** start from 2. Mark every multiple of 2 (except 2) as composite. Move to the next unmarked number (3), mark all its multiples. Repeat. Numbers that survive unmarked are prime.

```cpp
vector<bool> sieve(int n) {
    vector<bool> isComposite(n + 1, false);
    for (int i = 2; (long long)i * i <= n; i++) {
        if (!isComposite[i]) {
            for (int j = i * i; j <= n; j += i)
                isComposite[j] = true;
        }
    }
    // isComposite[i] == false  &&  i >= 2   =>  i is prime
    return isComposite;
}
```

**Complexity:** `O(N log log N)` — effectively linear. This is the single most important "maths" template — memorize it cold.

**Why start the inner loop at `i * i`, not `2 * i`?** All smaller multiples of `i` (like `2i`, `3i`, ..., `(i-1)*i`) were already marked by smaller primes. Starting at `i*i` avoids redundant work — a constant-factor optimization, not a correctness one (starting at `2*i` also works, just slower).

---

## 4. Prime Factorization

**Trial division — O(√n):**
```cpp
vector<int> primeFactors(int n) {
    vector<int> factors;
    for (int i = 2; (long long)i * i <= n; i++) {
        while (n % i == 0) {
            factors.push_back(i);
            n /= i;
        }
    }
    if (n > 1) factors.push_back(n);  // leftover prime factor > sqrt(original n)
    return factors;
}
```

**Why the `if (n > 1)` at the end?** After dividing out all factors `<= √(original n)`, at most ONE prime factor larger than `√n` can remain (two such factors would multiply to more than `n`). That leftover `n` itself is prime — don't forget it.

**When you need factorization for MANY numbers (queries):** precompute the **smallest prime factor (SPF)** for every number up to `N` with a modified sieve, then factorize any number in `O(log n)`:
```cpp
vector<int> smallestPrimeFactor(int n) {
    vector<int> spf(n + 1);
    for (int i = 2; i <= n; i++) {
        if (spf[i] == 0) {                 // i is prime
            for (int j = i; j <= n; j += i)
                if (spf[j] == 0) spf[j] = i;
        }
    }
    return spf;
}

vector<int> factorizeUsingSPF(int n, vector<int>& spf) {
    vector<int> factors;
    while (n > 1) {
        factors.push_back(spf[n]);
        n /= spf[n];
    }
    return factors;
}
```

---

## 5. Divisors of a Number

**Naive — O(n):** check every `i` from `1` to `n`.

**Optimal — O(√n):** divisors come in pairs `(i, n/i)`.
```cpp
vector<int> allDivisors(int n) {
    vector<int> divs;
    for (int i = 1; (long long)i * i <= n; i++) {
        if (n % i == 0) {
            divs.push_back(i);
            if (i != n / i) divs.push_back(n / i);
        }
    }
    return divs;
}
```

**Why the `i != n / i` check?** When `n` is a perfect square, `i == n/i` at `i = √n` — without the check you'd push that divisor twice.

**Counting divisors from prime factorization:** if `n = p1^a1 * p2^a2 * ... * pk^ak`, the number of divisors is `(a1+1)(a2+1)...(ak+1)`. This identity shows up in "count divisors for many numbers" problems combined with the SPF sieve.

---

## 6. GCD & LCM

**Euclidean algorithm — O(log(min(a,b))):**
```cpp
int gcd(int a, int b) {
    return b == 0 ? a : gcd(b, a % b);
}
// iterative version — preferred, no call-stack overhead
int gcdIter(int a, int b) {
    while (b) { a %= b; swap(a, b); }
    return a;
}
```

**Why does `gcd(a, b) == gcd(b, a % b)` hold?** Any common divisor of `a` and `b` also divides `a % b` (since `a % b = a - k*b`), and vice versa — so the *set* of common divisors is unchanged, hence the gcd is unchanged. This is the entire proof; it's short enough to reproduce in an interview if asked.

**LCM from GCD** (never compute LCM directly — always derive it):
```cpp
long long lcm(int a, int b) {
    return (long long)a / gcd(a, b) * b;   // divide first to avoid overflow
}
```

**Why divide by `gcd` before multiplying by `b`, not after?** `a * b` can overflow even when the true LCM fits in the return type. Dividing first keeps intermediate values smaller.

**C++ has this built in:** `std::gcd(a, b)` and `std::lcm(a, b)` in `<numeric>` (C++17) — use them directly instead of hand-rolling, unless asked to implement from scratch.

---

## 7. Modular Arithmetic — The Rules

Used whenever a problem says "return the answer mod `10^9 + 7`" (chosen because it's prime and fits in an `int`, which matters for the modular-inverse trick in §9).

```cpp
const long long MOD = 1e9 + 7;

(a + b) % MOD                     // addition — safe directly
(a - b + MOD) % MOD               // subtraction — ADD MOD to avoid negative result
(a * b) % MOD                     // multiplication — safe if a, b < MOD and using long long
// DIVISION IS NOT (a / b) % MOD  — see modular inverse, §9
```

**Why `(a - b + MOD) % MOD` and not `(a - b) % MOD`?** In C++, `%` on a negative number returns a **non-positive** result (implementation matches truncation toward zero). If `a < b`, `a - b` is negative, and `(a - b) % MOD` stays negative — wrong for an "answer" that must be a valid remainder in `[0, MOD)`. Adding `MOD` before the modulo guarantees a non-negative operand.

**Distributive rule to remember:** `(a * b) % MOD == ((a % MOD) * (b % MOD)) % MOD`. Take the mod as early and as often as possible — never let intermediate products grow unbounded (that's how you silently overflow `long long` too, e.g. multiplying two numbers already close to `10^9`).

---

## 8. Fast (Modular) Exponentiation

**Problem:** compute `a^b` (or `a^b % MOD`) when `b` can be huge (e.g., `10^9`). Naive loop is `O(b)` — too slow.

**Idea — binary exponentiation, O(log b):** write `b` in binary. `a^b = a^(sum of powers of 2 in b's binary form)`. Square the base each step; multiply into the answer only when the current bit is set.

```cpp
long long power(long long a, long long b, long long mod) {
    long long result = 1;
    a %= mod;
    while (b > 0) {
        if (b & 1) result = (result * a) % mod;   // bit is set — include this power
        a = (a * a) % mod;                          // square the base
        b >>= 1;                                     // move to next bit
    }
    return result;
}
```

**Trace for `a^13` (13 = 1101 in binary):**
`13 = 8 + 4 + 1` → answer `= a^8 * a^4 * a^1`. The loop squares `a` each iteration (`a, a^2, a^4, a^8, ...`) and multiplies into `result` exactly when that bit of `13` is 1.

This is the same "binary/bitmask decomposition" idea as subset enumeration in [Bit Manipulation](08_BitManipulation.md) — recognize the pattern once, reuse everywhere (also used in **binary lifting** for LCA, in your [Tree](../DSA_Codes/Tree/binarylifting.cpp) code, and in matrix exponentiation for Fibonacci-type recurrences).

---

## 9. Modular Inverse & Fermat's Little Theorem

**The problem:** `(a / b) % MOD` is **not** `((a % MOD) / (b % MOD)) % MOD` — modular division isn't defined the way modular multiplication is. Instead, division is replaced by multiplying by the **modular inverse** of `b`, written `b^-1`, defined so that `b * b^-1 ≡ 1 (mod MOD)`.

**Fermat's Little Theorem:** if `MOD` is prime and `b` is not a multiple of `MOD`, then:
```
b^(MOD-1) ≡ 1 (mod MOD)
  =>  b^(MOD-2) ≡ b^-1 (mod MOD)
```
So the modular inverse of `b` is just `power(b, MOD - 2, MOD)` — fast exponentiation from §8.

```cpp
long long modInverse(long long b, long long mod) {
    return power(b, mod - 2, mod);   // valid only when mod is prime
}

long long modDivide(long long a, long long b, long long mod) {
    return (a % mod) * modInverse(b, mod) % mod;
}
```

**Why this only works because `10^9 + 7` is prime:** Fermat's Little Theorem requires `MOD` prime. This is *the* reason `10^9 + 7` (and `998244353`) are the standard competitive-programming mod constants — they're prime and close to `2^30`, which keeps products of two mod-reduced values within `long long` range (`~10^18 < 9.2 * 10^18 = LLONG_MAX`).

---

## 10. Combinatorics — nCr, nPr, Pascal's Triangle

```
nPr (permutations, order matters)   = n! / (n-r)!
nCr (combinations, order doesn't)   = n! / (r! * (n-r)!)
```

**Pascal's Triangle identity** (avoids computing factorials, good for small `n`, and builds DP intuition):
```
nCr = (n-1)C(r-1) + (n-1)Cr
```
Each entry is the sum of the two entries above it — this is literally a 2D DP (`dp[n][r] = dp[n-1][r-1] + dp[n-1][r]`), and it's how [Pascal's Triangle](https://leetcode.com/problems/pascals-triangle/) is generated directly, no combinatorics formula needed:
```cpp
vector<vector<int>> pascalsTriangle(int numRows) {
    vector<vector<int>> tri(numRows);
    for (int i = 0; i < numRows; i++) {
        tri[i].resize(i + 1, 1);
        for (int j = 1; j < i; j++)
            tri[i][j] = tri[i-1][j-1] + tri[i-1][j];
    }
    return tri;
}
```

**Direct nCr for small n (no mod), O(r):**
```cpp
long long nCr(int n, int r) {
    if (r > n - r) r = n - r;           // nCr == nC(n-r); pick smaller r for fewer iterations
    long long result = 1;
    for (int i = 0; i < r; i++) {
        result *= (n - i);
        result /= (i + 1);              // safe: after i+1 multiplications, product is always divisible by i+1
    }
    return result;
}
```

---

## 11. nCr % p for Large n (Factorial + Inverse)

When `n` is large (up to `10^6`–`10^7`) and you need MANY `nCr % MOD` queries, precompute factorials and their inverses **once**, then answer each query in `O(1)`:

```cpp
const int MAXN = 1e6 + 5;
const long long MOD = 1e9 + 7;
vector<long long> fact(MAXN), invFact(MAXN);

void precompute() {
    fact[0] = 1;
    for (int i = 1; i < MAXN; i++) fact[i] = fact[i-1] * i % MOD;

    invFact[MAXN - 1] = power(fact[MAXN - 1], MOD - 2, MOD);   // Fermat inverse, ONE expensive call
    for (int i = MAXN - 2; i >= 0; i--)
        invFact[i] = invFact[i+1] * (i + 1) % MOD;             // O(1) each, walking downward
}

long long nCrMod(int n, int r) {
    if (r < 0 || r > n) return 0;
    return fact[n] * invFact[r] % MOD * invFact[n - r] % MOD;
}
```

**Why compute `invFact` backwards from a single `power()` call instead of calling `power()` for every `i`?** `invFact[i] = invFact[i+1] * (i+1) % MOD` because `(i+1)! * invFact[i+1] ≡ 1`, so dividing out one `(i+1)` factor gives `invFact[i]` in O(1). Calling `power()` (O(log MOD)) for every index would be `O(MAXN log MOD)` instead of `O(MAXN + log MOD)` — the difference between milliseconds and a TLE at `MAXN = 10^6`.

---

## 12. Overflow — The Silent Killer

This is where "maths" problems are actually lost in interviews — not the algorithm, the arithmetic.

```cpp
int a = 1e9, b = 1e9;
long long bad = a * b;        // WRONG — overflow happens in `int * int` BEFORE assignment to long long
long long good = (long long)a * b;   // correct — cast forces 64-bit multiplication
```

**Rule of thumb:**
- `int` range: ~2.1 × 10^9 (`2^31 - 1`). Two numbers near `10^9` multiplied together (`~10^18`) overflow `int` instantly, and overflow `long long` too if you multiply three of them.
- `long long` range: ~9.2 × 10^18 (`2^63 - 1`). Safe for one multiplication of two `10^9`-scale numbers, NOT safe for the product of three.
- Whenever you see `mod 10^9 + 7` in constraints, that is the problem statement telling you: *intermediate values will overflow if you don't reduce mod at every step.*
- Cast to `long long` **before** the multiplication, not after — `(long long)(a * b)` still computes `a * b` in 32-bit first if `a`, `b` are `int`.

---

## 13. Things Most People Forget

- **`i * i <= n` overflow:** if `n` is close to `INT_MAX` and `i` is an `int`, `i * i` can overflow before the comparison. Cast: `(long long)i * i <= n`.
- **Sieve inner loop start:** `j = i * i` is a speed optimization; starting at `j = 2 * i` is also correct, just slower — don't confuse this with a correctness requirement.
- **`n > 1` after prime factorization loop:** the last remaining prime factor (if any) is always `> √(original n)` and is easy to forget.
- **Negative mod in C++:** `(-7) % 3 == -1` in C++ (not `2`, unlike Python). Always normalize with `+ MOD` before taking `% MOD` after subtraction.
- **Modular inverse requires prime modulus.** Fermat's method (`power(b, MOD-2, MOD)`) silently gives a wrong answer if `MOD` isn't prime — use the Extended Euclidean Algorithm for non-prime moduli (rare in interviews, common in CP).
- **GCD(0, n) == n**, not undefined and not 0 — the recursive `gcd(a, b) = gcd(b, a % b)` base case (`b == 0 → return a`) already gets this right; hand-verify it if writing iteratively from scratch.
- **`nCr` when `r > n` or `r < 0`:** must return 0, not crash or produce garbage — easy to forget in the O(1) precomputed version.

---

## 14. Practice Problems

> Track your progress — check off each problem when solved.

- [ ] Count Primes (Sieve of Eratosthenes) — https://leetcode.com/problems/count-primes/
- [ ] Print Prime Factors of a Number — https://www.geeksforgeeks.org/problems/prime-factors5052/1
- [ ] All Divisors of a Number — https://www.geeksforgeeks.org/problems/all-divisors-of-a-number/1
- [ ] GCD / HCF of two numbers — https://www.geeksforgeeks.org/problems/gcd-of-two-numbers3459/1
- [ ] Pow(x, n) — https://leetcode.com/problems/powx-n/
- [ ] Super Pow — https://leetcode.com/problems/super-pow/
- [ ] Pascal's Triangle — https://leetcode.com/problems/pascals-triangle/
- [ ] Pascal's Triangle II (single row, O(r) space) — https://leetcode.com/problems/pascals-triangle-ii/
- [ ] Nth Root of a Number (binary search + power, cross-reference [04_BinarySearch](04_BinarySearch.md)) — https://www.geeksforgeeks.org/problems/find-nth-root-of-m5843/1
- [ ] Sum of All Divisors From 1 to N — https://leetcode.com/problems/sum-of-divisors-of-integers-in-a-range/
- [ ] Perfect Number Check — https://leetcode.com/problems/perfect-number/

---

## 15. Final Revision Sheet

### The templates to reproduce cold

```cpp
// 1. Primality check O(sqrt n)
bool isPrime(int n) {
    if (n < 2) return false;
    for (int i = 2; (long long)i * i <= n; i++)
        if (n % i == 0) return false;
    return true;
}

// 2. Sieve of Eratosthenes O(n log log n)
vector<bool> sieve(int n) {
    vector<bool> isComposite(n + 1, false);
    for (int i = 2; (long long)i * i <= n; i++)
        if (!isComposite[i])
            for (int j = i * i; j <= n; j += i)
                isComposite[j] = true;
    return isComposite;
}

// 3. GCD (Euclidean, iterative)
int gcd(int a, int b) {
    while (b) { a %= b; swap(a, b); }
    return a;
}
long long lcm(int a, int b) { return (long long)a / gcd(a, b) * b; }

// 4. Fast modular exponentiation O(log b)
long long power(long long a, long long b, long long mod) {
    long long result = 1; a %= mod;
    while (b > 0) {
        if (b & 1) result = result * a % mod;
        a = a * a % mod;
        b >>= 1;
    }
    return result;
}

// 5. Modular inverse (Fermat — mod MUST be prime)
long long modInverse(long long b, long long mod) { return power(b, mod - 2, mod); }

// 6. nCr % MOD via precomputed factorials — O(1) per query after O(n) precompute
long long nCrMod(int n, int r, vector<long long>& fact, vector<long long>& invFact, long long mod) {
    if (r < 0 || r > n) return 0;
    return fact[n] * invFact[r] % mod * invFact[n - r] % mod;
}
```

### Complexity Table

| Operation | Time | Space | Notes |
|-----------|------|-------|-------|
| Primality check (trial division) | O(√n) | O(1) | |
| Sieve of Eratosthenes | O(n log log n) | O(n) | For ALL primes up to n |
| Prime factorization (trial division) | O(√n) | O(log n) | |
| Prime factorization via SPF (precomputed) | O(log n) | O(n) precompute | For many queries |
| All divisors of n | O(√n) | O(√n) | |
| GCD (Euclidean) | O(log(min(a,b))) | O(1) | |
| Fast exponentiation | O(log b) | O(1) | |
| Modular inverse (Fermat) | O(log MOD) | O(1) | MOD must be prime |
| nCr % MOD (naive per query) | O(n) | O(1) | Recomputes factorial each time |
| nCr % MOD (precomputed fact/invFact) | O(1) per query | O(n) precompute | Best for many queries |

### Constants to know cold

```
10^9 + 7   — standard prime modulus (fits in int, safe for long long products)
998244353  — alternative prime modulus (NTT-friendly, seen in some CP problems)
LLONG_MAX  = 9.2 × 10^18 = 2^63 - 1
√(10^18)   ≈ 10^9        — trial division up to sqrt is feasible for n ≤ 10^18
```

### Interview Checklist

- [ ] Do I check primality only up to `√n`, with an overflow-safe comparison (`(long long)i*i <= n`)?
- [ ] Do I know the Sieve of Eratosthenes cold, including why it's `O(n log log n)`?
- [ ] Do I remember the leftover-prime-factor check (`if (n > 1)`) after trial-division factorization?
- [ ] Do I compute LCM as `a / gcd(a,b) * b`, dividing BEFORE multiplying?
- [ ] Do I normalize negative results with `(a - b + MOD) % MOD`?
- [ ] Can I write fast exponentiation from scratch, and explain why it's O(log b)?
- [ ] Do I know that modular division = multiply by modular inverse, and that Fermat's method needs a PRIME modulus?
- [ ] For repeated `nCr % MOD` queries, do I precompute factorial + inverse factorial arrays instead of recomputing each time?
- [ ] Do I cast to `long long` BEFORE multiplying, not after?

---

*Chapter 19 — Maths for DSA | Part of DSA Interview Prep series*
*Core number theory + combinatorics referenced across [Bit Manipulation](08_BitManipulation.md), [Segment Tree & Advanced](18_SegmentTree_Advanced.md), and DP-on-strings/combinatorics problems*
