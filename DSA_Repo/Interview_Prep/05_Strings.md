# Chapter 05 — Strings

> **Revision target:** 0.5 day  
> **Goal:** After reading this file, you need nothing else for this topic — no code files, no YouTube, no tutorials.

---

## Table of Contents

1. [char\[\] vs std::string](#1-char-vs-stdstring)
2. [std::string — All Operations](#2-stdstring--all-operations)
3. [Character Operations & ASCII Tricks](#3-character-operations--ascii-tricks)
4. [Your Code — intro.cpp Analysis](#4-your-code--introcpp-analysis)
5. [Palindrome Check — Iterative & Recursive](#5-palindrome-check--iterative--recursive)
6. [Reverse String — Iterative & Recursive](#6-reverse-string--iterative--recursive)
7. [Anagram Check — Three Approaches](#7-anagram-check--three-approaches)
8. [String Hashing Basics](#8-string-hashing-basics)
9. [Sliding Window on Strings](#9-sliding-window-on-strings)
10. [KMP Algorithm — Pattern Matching (Full from Scratch)](#10-kmp-algorithm--pattern-matching-full-from-scratch)
11. [Z-Algorithm](#11-z-algorithm)
12. [String Compression](#12-string-compression)
13. [Things Most People Forget](#13-things-most-people-forget)
14. [Practice Problems](#14-practice-problems)
15. [Final Revision Sheet](#15-final-revision-sheet)

---

## 1. char\[\] vs std::string

This distinction matters in interviews — interviewers test both.

### char\[\] — C-style strings

```cpp
char name[20];          // fixed-size array on stack
cin >> name;            // reads until whitespace, adds '\0' at end
char name[] = "hello";  // compiler allocates 6 bytes ('h','e','l','l','o','\0')

// Manually iterate
for(int i = 0; name[i] != '\0'; i++) { }

// strlen — counts characters (excludes '\0')
#include <cstring>
int len = strlen(name);  // O(n)
```

**Critical facts about char\[\]:**
- Always null-terminated (`'\0'` at the end — you must account for it in size)
- `sizeof(name)` = full array size (including '\0'), not the string length
- You cannot assign: `name = "hello"` — you must use `strcpy(name, "hello")`
- No bounds checking — buffer overflow is a real bug

### std::string — C++ strings

```cpp
string s = "hello";     // dynamic size, heap-managed
string s2(5, 'a');      // "aaaaa" — fill constructor
string s3 = s;          // deep copy — s3 independent of s
```

**Why std::string is usually better:**
- Automatically handles memory
- Rich operations (find, substr, compare, etc.)
- Can resize dynamically
- Works with STL algorithms

### When interviewers give you char\[\]

If a function signature says `char[]` or `char*`, you work with it as-is. Otherwise, you can convert:

```cpp
// char[] to string
char arr[] = "hello";
string s(arr);  // or string s = arr;

// string to char[]
string s = "hello";
const char* arr = s.c_str();  // read-only C-string
```

---

## 2. std::string — All Operations

These operations come up in almost every string interview problem. Know them cold.

```cpp
string s = "hello world";

// Size / length — O(1)
s.length();     // 11
s.size();       // same as length()
s.empty();      // false

// Access — O(1)
s[0];           // 'h'
s.at(0);        // 'h' — with bounds check
s.front();      // 'h'
s.back();       // 'd'

// Modify
s.push_back('!');       // "hello world!" — O(1) amortized
s.pop_back();           // "hello world" — O(1)
s += " again";          // append — O(k) where k is appended length
s.append("xyz");        // same as +=
s.insert(5, " dear");   // insert at position 5

// Substring — O(k)
s.substr(6);            // "world" — from index 6 to end
s.substr(6, 5);         // "world" — from index 6, length 5
// TRAP: second arg is LENGTH, not end index

// Find — O(n*m) worst case, but usually O(n) with hash
s.find("world");        // returns index 6 — first occurrence
s.find("xyz");          // returns string::npos if not found
s.rfind("l");           // finds last occurrence

// Check if found
if(s.find("world") != string::npos) { /* found */ }

// Replace
s.replace(6, 5, "planet");  // replace 5 chars starting at index 6

// Erase
s.erase(6, 5);          // remove 5 chars at index 6
s.erase(s.begin() + 6); // remove single character at index 6

// Compare
s1 == s2;               // lexicographic equality
s1 < s2;                // lexicographic less-than (used in sort)
s1.compare(s2);         // 0 if equal, <0 if s1 < s2, >0 if s1 > s2

// Conversion
stoi("123");            // string to int
stol("123");            // string to long
stoll("123");           // string to long long
to_string(42);          // int to string

// Clear
s.clear();              // empties string, size becomes 0
```

### Iterating over a string

```cpp
string s = "hello";

// Index-based
for(int i = 0; i < s.size(); i++) {
    char c = s[i];
}

// Range-based for — copy
for(char c : s) { }

// Range-based for — reference (can modify)
for(char& c : s) { c = tolower(c); }
```

### Comparing strings

```cpp
string a = "apple", b = "banana";
// < compares lexicographically — 'a' < 'b' so apple < banana
sort(strs.begin(), strs.end());  // alphabetical sort works natively
```

---

## 3. Character Operations & ASCII Tricks

These come up constantly — know them from memory.

```cpp
// ASCII values
'0' = 48, '9' = 57    // digits
'A' = 65, 'Z' = 90    // uppercase
'a' = 97, 'z' = 122   // lowercase
'a' - 'A' = 32        // distance between cases

// Character to integer digit
char c = '7';
int d = c - '0';    // d = 7 — subtract ASCII of '0'

// Integer digit to character
int d = 7;
char c = '0' + d;   // c = '7'

// Character index (0-25) for frequency array
int idx = c - 'a';  // for lowercase: 'a'→0, 'b'→1, ..., 'z'→25
int idx = c - 'A';  // for uppercase

// Case check and conversion
bool isLower = (c >= 'a' && c <= 'z');
bool isUpper = (c >= 'A' && c <= 'Z');
bool isDigit = (c >= '0' && c <= '9');
bool isAlpha = isalpha(c);   // from <cctype>
bool isAlnum = isalnum(c);

char lower = tolower(c);    // 'A' → 'a', 'a' → 'a' (safe to call on lowercase)
char upper = toupper(c);    // 'a' → 'A'
```

**Why the frequency array trick matters:**

```cpp
// Count frequency of each lowercase letter — O(n), O(1) space (fixed 26)
int freq[26] = {0};
for(char c : s) freq[c - 'a']++;

// This is FASTER than unordered_map<char,int> — no hashing overhead
// Used in: anagram check, window problems, character frequency
```

**Manual case conversion — from your code:**

```cpp
// From intro.cpp — manual toLowerCase without <cctype>
char toLowerCase(char ch) {
    if(ch >= 'a' && ch <= 'z')
        return ch;           // already lowercase
    else
        return ch - 'A' + 'a';  // uppercase → lowercase
}
// Why does this work? 'A' is 65, 'a' is 97. Difference = 32.
// ch - 'A' gives the 0-25 index, + 'a' converts back to lowercase letter.
```

---

## 4. Your Code — intro.cpp Analysis

This file covers four fundamental string operations.

### getLength — manual strlen

```cpp
int getLength(char name[]) {
    int count = 0;
    for(int i = 0; name[i] != '\0'; i++) {
        count++;
    }
    return count;
}
```

**Why it works:** Iterate until the null terminator `'\0'`. This is exactly what `strlen()` does internally. Complexity: O(n).

**Interview insight:** `strlen` traverses the entire string every call — it's O(n), not O(1). Never call it inside a loop unless you cache the result. `std::string::size()` IS O(1) (stored as member variable).

### reverse — two-pointer swap

```cpp
void reverse(char name[], int n) {
    int s = 0, e = n-1;
    while(s < e) {
        swap(name[s++], name[e--]);
    }
}
```

**Why it works:** Two pointers converge from both ends, swapping characters. When they meet (or cross), every character has been swapped with its mirror. Complexity: O(n), O(1) space.

**When `s < e` vs `s <= e`:** Use `s < e`. When s == e (odd-length string), the middle character doesn't need swapping with itself. Using `s <= e` would work too (swap(x,x) is a no-op) but is wasteful to reason about.

### checkPalindrome — iterative

```cpp
bool checkPalindrome(char a[], int n) {
    int s = 0, e = n-1;
    while(s <= e) {
        if(toLowerCase(a[s]) != toLowerCase(a[e]))
            return false;
        s++;
        e--;
    }
    return true;
}
```

**Key design choices:**
- Normalizes case before comparing (handles "Racecar" as palindrome)
- Checks `s <= e` (not `s < e`) to handle the middle character of odd strings
- Early return `false` as soon as mismatch found — doesn't scan the whole string

### getMaxOccCharacter — frequency array

```cpp
char getMaxOccCharacter(string s) {
    int arr[26] = {0};
    for(int i = 0; i < s.length(); i++) {
        int number = s[i] - 'a';   // get 0-25 index
        arr[number]++;
    }
    int maxi = -1, ans = 0;
    for(int i = 0; i < 26; i++) {
        if(maxi < arr[i]) {
            ans = i;
            maxi = arr[i];
        }
    }
    return 'a' + ans;
}
```

**Why start `maxi` at -1:** If all characters appear 0 times (empty string), we'd still get an answer. Starting at -1 means ANY count ≥ 0 updates `maxi`.

**Why `ans = i` and then return `'a' + ans`:** `i` is the 0-25 index. `'a' + 0 = 'a'`, `'a' + 25 = 'z'`. This converts back to a character.

**Complexity:** O(n) time, O(1) space (the 26-element array is constant size regardless of input).

---

## 5. Palindrome Check — Iterative & Recursive

### Pattern recognition

**How to identify:** Problem asks if a string reads the same forwards and backwards.

**Variations:**
- Basic: "racecar" → yes
- Case-insensitive: "Racecar" → yes
- Ignore non-alphanumeric: "A man, a plan, a canal: Panama" → yes (LeetCode 125)

### Iterative — two-pointer (fastest, O(1) space)

```cpp
bool isPalindrome(string s) {
    int left = 0, right = s.size() - 1;
    while(left < right) {
        if(s[left] != s[right]) return false;
        left++;
        right--;
    }
    return true;
}

// With alphanumeric filter (LeetCode 125)
bool isPalindrome(string s) {
    int left = 0, right = s.size() - 1;
    while(left < right) {
        while(left < right && !isalnum(s[left]))  left++;
        while(left < right && !isalnum(s[right])) right--;
        if(tolower(s[left]) != tolower(s[right])) return false;
        left++;
        right--;
    }
    return true;
}
```

### Recursive — from your code (palindromeCheck.cpp)

```cpp
bool checkPalindrome(string str, int i, int j) {
    // Base case: pointers crossed or met — it's a palindrome
    if(i > j) return true;
    // If chars don't match — not a palindrome
    if(str[i] != str[j]) return false;
    // Recurse inward
    return checkPalindrome(str, i+1, j-1);
}
// Call: checkPalindrome(s, 0, s.length()-1)
```

**Why the recursive approach works:** Trust the base case. If pointers cross without finding a mismatch, every character matched its mirror. If any mismatch is found, immediately return false.

**Complexity:** O(n) time, O(n) space (recursion stack depth = n/2 calls).

**When to use which:**
- Iterative is always preferred in interviews (O(1) space)
- Recursive version is a good way to demonstrate recursion thinking — interviewers sometimes specifically ask for it

### Longest Palindromic Substring — Expand Around Center

```cpp
// O(n²) — expand around each center
string longestPalindrome(string s) {
    int n = s.size(), start = 0, maxLen = 1;
    
    auto expand = [&](int l, int r) {
        while(l >= 0 && r < n && s[l] == s[r]) {
            if(r - l + 1 > maxLen) {
                maxLen = r - l + 1;
                start = l;
            }
            l--;
            r++;
        }
    };
    
    for(int i = 0; i < n; i++) {
        expand(i, i);     // odd length palindromes (center = i)
        expand(i, i+1);   // even length palindromes (center between i and i+1)
    }
    return s.substr(start, maxLen);
}
```

**Why two expand calls per center:** Odd-length palindromes ("aba") have a single center character. Even-length palindromes ("abba") have a center between two characters. You must check both types.

**Complexity:** O(n²) time, O(1) space.

**Manacher's Algorithm** exists for O(n) but is rarely asked. Expand around center is the expected interview answer.

---

## 6. Reverse String — Iterative & Recursive

### Iterative — from intro.cpp

```cpp
void reverse(string& s) {  // pass by reference to modify in place
    int left = 0, right = s.size() - 1;
    while(left < right) {
        swap(s[left++], s[right--]);
    }
}
// Or just: reverse(s.begin(), s.end());  — STL built-in
```

### Recursive — from your code (reverseString.cpp)

```cpp
void reverse(string& str, int i, int j) {
    if(i > j) return;          // base case: done
    swap(str[i], str[j]);      // swap endpoints
    reverse(str, i+1, j-1);   // recurse inward
}
// Call: reverse(s, 0, s.length()-1)
```

**Why pass `string&` and not `string`:** The recursive calls need to modify the SAME string object. If you pass by value, each recursive call gets its own copy and the original is never modified.

**Tracing the recursion for "abcde":**
```
reverse("abcde", 0, 4) → swap a,e → "ebcda" → recurse(1,3)
  reverse("ebcda", 1, 3) → swap b,d → "edcba" → recurse(2,2)
    reverse("edcba", 2, 2) → i==j, done
```

### Reverse Words in a String

```cpp
// "the sky is blue" → "blue is sky the"
string reverseWords(string s) {
    reverse(s.begin(), s.end());   // "eulb si yks eht"
    int start = 0;
    for(int i = 0; i <= s.size(); i++) {
        if(i == s.size() || s[i] == ' ') {
            reverse(s.begin() + start, s.begin() + i);  // reverse each word
            start = i + 1;
        }
    }
    return s;
}
// Pattern: reverse whole → reverse each word
```

---

## 7. Anagram Check — Three Approaches

**Anagram definition:** Two strings are anagrams if they contain the same characters with the same frequencies.

### Approach 1: Sort and Compare — O(n log n)

```cpp
bool isAnagram(string s, string t) {
    if(s.size() != t.size()) return false;
    sort(s.begin(), s.end());
    sort(t.begin(), t.end());
    return s == t;
}
// Simple but O(n log n) and modifies strings
```

### Approach 2: Frequency Array — O(n), O(1) space

```cpp
bool isAnagram(string s, string t) {
    if(s.size() != t.size()) return false;
    
    int freq[26] = {0};
    for(char c : s) freq[c - 'a']++;   // increment for s
    for(char c : t) freq[c - 'a']--;   // decrement for t
    
    for(int i = 0; i < 26; i++)
        if(freq[i] != 0) return false; // mismatch
    return true;
}
// Best approach — O(n) time, O(1) space (array is fixed 26 slots)
```

**Why this works:** If s and t are anagrams, every character that appears k times in s also appears k times in t. Incrementing for s then decrementing for t gives 0 for every character if and only if they're anagrams.

### Approach 3: Hash Map — O(n), for arbitrary characters

```cpp
bool isAnagram(string s, string t) {
    if(s.size() != t.size()) return false;
    unordered_map<char,int> freq;
    for(char c : s) freq[c]++;
    for(char c : t) {
        freq[c]--;
        if(freq[c] < 0) return false;  // t has char not in s
    }
    return true;
}
// Use when: characters aren't just lowercase letters (Unicode, etc.)
```

### Permutation in String (Sliding Window Anagram)

```cpp
// "ab" in "eidbaooo" → true (anagram "ba" at index 3)
bool checkInclusion(string p, string s) {
    if(p.size() > s.size()) return false;
    
    vector<int> pCount(26,0), window(26,0);
    for(char c : p) pCount[c-'a']++;
    
    for(int r = 0; r < s.size(); r++) {
        window[s[r]-'a']++;
        // Remove character that left the window
        if(r >= (int)p.size())
            window[s[r - p.size()]-'a']--;
        if(window == pCount) return true;
    }
    return false;
}
```

**The window comparison `window == pCount`** works because `std::vector` comparison is element-wise in C++. Two vectors are equal if all elements are equal.

---

## 8. String Hashing Basics

**When to use:** Check if two substrings are equal in O(1) after O(n) preprocessing. Used in substring search, rolling hash.

### Polynomial Rolling Hash

```cpp
// Map each string to a number — if same string, same number
// hash(s) = s[0]*p^0 + s[1]*p^1 + ... + s[n-1]*p^(n-1)  (mod m)

// Commonly used: p = 31, m = 1e9+9
long long computeHash(string s) {
    long long hash = 0, p_pow = 1;
    long long p = 31, m = 1e9 + 9;
    for(char c : s) {
        hash = (hash + (c - 'a' + 1) * p_pow) % m;
        p_pow = (p_pow * p) % m;
    }
    return hash;
}
```

**Why `c - 'a' + 1` and not `c - 'a'`:** If we used `c - 'a'`, then 'a' maps to 0. Any string starting with 'a' would contribute 0 for the first character — losing information. Adding 1 ensures every character maps to 1-26.

**The collision problem:** Two different strings can map to the same hash value. This is a false positive. In practice: use two different hash functions (double hashing) to reduce collision probability to near zero.

### Prefix Hash for Substring Comparison

```cpp
// Precompute prefix hashes — then answer "is s[l..r] == t[l..r]?" in O(1)
vector<long long> buildPrefixHash(string s) {
    int n = s.size();
    vector<long long> h(n+1, 0);
    long long p_pow = 1, p = 31, m = 1e9 + 9;
    for(int i = 0; i < n; i++) {
        h[i+1] = (h[i] + (s[i] - 'a' + 1) * p_pow) % m;
        p_pow = (p_pow * p) % m;
    }
    return h;
}

// Get hash of substring s[l..r]
long long getHash(vector<long long>& h, vector<long long>& p_pow, int l, int r) {
    // (h[r+1] - h[l] + m) * modInverse(p_pow[l]) % m
    // In practice, compare two substrings by comparing their aligned hashes
}
```

**Interview note:** In most interview problems, hashing is used conceptually (e.g., "Rabin-Karp uses rolling hash"). You rarely need to implement full prefix hashing. Know what it does and when to mention it.

---

## 9. Sliding Window on Strings

A large class of string problems use the sliding window pattern. Master the template.

### Fixed Window — find all anagrams

```cpp
// Template for fixed-size window
for(int r = 0; r < s.size(); r++) {
    // Add s[r] to window
    window[s[r]-'a']++;
    
    // Remove element that left the window (window size = p.size())
    if(r >= (int)p.size())
        window[s[r - p.size()]-'a']--;
    
    // Check window
    if(window == pCount)
        result.push_back(r - (int)p.size() + 1);
}
```

### Variable Window — minimum window substring

```cpp
// Find shortest substring of s containing all chars of t
string minWindow(string s, string t) {
    unordered_map<char,int> need, have;
    for(char c : t) need[c]++;
    
    int formed = 0, required = need.size();
    int left = 0, minLen = INT_MAX, minStart = 0;
    
    for(int right = 0; right < s.size(); right++) {
        char c = s[right];
        have[c]++;
        // Check if this char's count now satisfies the need
        if(need.count(c) && have[c] == need[c]) formed++;
        
        // Try to shrink window from left
        while(formed == required) {
            // Update answer
            if(right - left + 1 < minLen) {
                minLen = right - left + 1;
                minStart = left;
            }
            // Remove leftmost
            char lc = s[left++];
            have[lc]--;
            if(need.count(lc) && have[lc] < need[lc]) formed--;
        }
    }
    return minLen == INT_MAX ? "" : s.substr(minStart, minLen);
}
```

**The `formed` variable trick:** Instead of comparing two full maps on every iteration (expensive), `formed` tracks how many distinct characters satisfy their required count. When `formed == required`, the window is valid.

---

## 10. KMP Algorithm — Pattern Matching (Full from Scratch)

**Not in your codebase — written fully here.**

**The problem:** Given text `t` and pattern `p`, find all positions in `t` where `p` occurs. Return first index, or all indices.

### Naive approach — O(n×m)

```cpp
// Slide pattern over text — O(n*m)
vector<int> search(string t, string p) {
    vector<int> result;
    int n = t.size(), m = p.size();
    for(int i = 0; i <= n-m; i++) {
        int j = 0;
        while(j < m && t[i+j] == p[j]) j++;
        if(j == m) result.push_back(i);
    }
    return result;
}
// Works but TLE for large inputs
```

### Why KMP is better

The key insight: when a mismatch occurs during matching, we have already seen a portion of the text. We know exactly what characters come before the mismatch point. We can use this to skip redundant comparisons.

**Example:**
```
Text:    AABAABAAB
Pattern: AABAAB
         ↑ matched AABAAB here — but what if mismatch at position 5?
         Instead of restarting from scratch, use the prefix info.
```

### Step 1: Build the LPS (Failure Function) Array

**LPS = Longest Proper Prefix which is also a Suffix**

For pattern `p`, `lps[i]` = length of the longest prefix of `p[0..i]` that is also a suffix of `p[0..i]`.

```
Pattern: A  A  B  A  A  B
Index:   0  1  2  3  4  5
LPS:     0  1  0  1  2  3
```

**How to read it:** `lps[5] = 3` means `p[0..2] = "AAB"` is both a prefix and suffix of `p[0..5] = "AABAAB"`.

**Building LPS — O(m):**

```cpp
vector<int> buildLPS(string p) {
    int m = p.size();
    vector<int> lps(m, 0);
    
    int len = 0;  // length of previous longest prefix-suffix
    int i = 1;    // lps[0] is always 0
    
    while(i < m) {
        if(p[i] == p[len]) {
            // Characters match — extend current prefix-suffix
            len++;
            lps[i] = len;
            i++;
        } else {
            if(len != 0) {
                // Don't increment i — fall back to previous prefix-suffix
                len = lps[len - 1];
            } else {
                // len == 0, no prefix-suffix to fall back to
                lps[i] = 0;
                i++;
            }
        }
    }
    return lps;
}
```

**Trace for "AABAAB":**
```
i=1, len=0: p[1]='A'==p[0]='A' → len=1, lps[1]=1, i=2
i=2, len=1: p[2]='B'!=p[1]='A' → len=lps[0]=0 (fallback)
i=2, len=0: p[2]='B'!=p[0]='A' → lps[2]=0, i=3
i=3, len=0: p[3]='A'==p[0]='A' → len=1, lps[3]=1, i=4
i=4, len=1: p[4]='A'==p[1]='A' → len=2, lps[4]=2, i=5
i=5, len=2: p[5]='B'==p[2]='B' → len=3, lps[5]=3, i=6 (done)
LPS = [0,1,0,1,2,3] ✓
```

### Step 2: KMP Search — O(n)

```cpp
vector<int> KMPSearch(string t, string p) {
    int n = t.size(), m = p.size();
    vector<int> lps = buildLPS(p);
    vector<int> result;
    
    int i = 0;  // index into text
    int j = 0;  // index into pattern
    
    while(i < n) {
        if(t[i] == p[j]) {
            i++;
            j++;
        }
        
        if(j == m) {
            // Full pattern matched at position i-j
            result.push_back(i - j);
            j = lps[j-1];  // look for next match using LPS
        } else if(i < n && t[i] != p[j]) {
            if(j != 0) {
                j = lps[j-1];  // fallback in pattern — DON'T move i
            } else {
                i++;  // j==0, no prefix to fall back to
            }
        }
    }
    return result;
}
```

**Why `j = lps[j-1]` on mismatch:** We've matched `j` characters so far. `lps[j-1]` tells us the longest border (prefix = suffix) of the matched portion. We can resume matching from that point without re-examining the text.

### Full KMP — Complete Working Code

```cpp
#include <bits/stdc++.h>
using namespace std;

vector<int> buildLPS(string& p) {
    int m = p.size();
    vector<int> lps(m, 0);
    int len = 0, i = 1;
    while(i < m) {
        if(p[i] == p[len]) {
            lps[i++] = ++len;
        } else {
            if(len != 0) len = lps[len-1];
            else         lps[i++] = 0;
        }
    }
    return lps;
}

vector<int> KMPSearch(string t, string p) {
    vector<int> lps = buildLPS(p);
    vector<int> result;
    int i = 0, j = 0, n = t.size(), m = p.size();
    while(i < n) {
        if(t[i] == p[j]) { i++; j++; }
        if(j == m) {
            result.push_back(i - j);
            j = lps[j-1];
        } else if(i < n && t[i] != p[j]) {
            j != 0 ? j = lps[j-1] : i++;
        }
    }
    return result;
}
```

**Complexity:** O(n + m) — O(m) to build LPS, O(n) for search.

**Why it's O(n) and not O(n×m):** The key is that `i` never decreases. In the naive approach, when we restart from position `i - j + 1`, we move `i` backward. In KMP, `i` only moves forward — we only reset `j`. Each character in the text is visited at most twice (once when matched, once potentially on the fallback step, but the total work on `j` is bounded by the total increases in `j`).

### When does KMP come up in interviews?

- "Find all occurrences of pattern in text" — classic KMP
- "Longest prefix that is also a suffix" — build LPS, answer is `lps[n-1]`
- "Minimum period of a string" — if `n % (n - lps[n-1]) == 0`, period = `n - lps[n-1]`
- "Repeated string match" — KMP on repeated string

---

## 11. Z-Algorithm

An alternative to KMP — often simpler to code.

**What it computes:** `z[i]` = length of the longest substring starting from `s[i]` that is also a prefix of `s`.

```cpp
vector<int> buildZ(string s) {
    int n = s.size();
    vector<int> z(n, 0);
    z[0] = n;  // by definition (entire string is prefix of itself)
    
    int l = 0, r = 0;  // current Z-box [l, r]
    for(int i = 1; i < n; i++) {
        if(i < r) {
            // i is inside Z-box — use previously computed value
            z[i] = min(r - i, z[i - l]);
        }
        // Extend Z-box
        while(i + z[i] < n && s[z[i]] == s[i + z[i]]) {
            z[i]++;
        }
        // Update Z-box if we extended past r
        if(i + z[i] > r) {
            l = i;
            r = i + z[i];
        }
    }
    return z;
}

// Pattern search using Z-algorithm
void ZSearch(string t, string p) {
    string s = p + "$" + t;  // separator '$' cannot appear in pattern/text
    vector<int> z = buildZ(s);
    int m = p.size();
    for(int i = m+1; i < s.size(); i++) {
        if(z[i] == m) {
            cout << "Found at index " << i - m - 1 << endl;
        }
    }
}
```

**Z-algorithm vs KMP:**
- Z is slightly easier to code and understand
- Both O(n+m)
- KMP's LPS has more applications (period, border of string)
- Z is more intuitive for direct pattern matching

---

## 12. String Compression

```cpp
// "aabcccdddd" → "a2b1c3d4"
// LeetCode 443 — compress in place
string compress(string s) {
    string result;
    int i = 0;
    while(i < s.size()) {
        char c = s[i];
        int count = 0;
        while(i < s.size() && s[i] == c) {
            count++;
            i++;
        }
        result += c;
        if(count > 1) result += to_string(count);
    }
    return result;
}
// Complexity: O(n) time, O(n) space for result
```

**Interview variant — in-place compression:**
The LeetCode 443 version requires you to do this in-place with O(1) extra space. Use two pointers: `read` pointer scans, `write` pointer writes.

---

## 13. Things Most People Forget

### 1. substr second argument is LENGTH, not end index

```cpp
string s = "hello world";
s.substr(6, 5);   // "world" — 5 characters starting at index 6
s.substr(6, 10);  // NOT the same as s.substr(6) — gives "world" (clamped to end)
// People often write substr(start, end) meaning start to end — WRONG
// Correct: substr(start, end - start)
```

### 2. string::npos is the "not found" sentinel

```cpp
if(s.find("xyz") != string::npos) { /* found */ }
// string::npos = SIZE_MAX (huge unsigned number)
// TRAP: comparing to -1 works on most systems but is technically UB
```

### 3. size() vs length() vs strlen

```cpp
// std::string::size() == std::string::length() — both O(1)
// strlen(c_str) — O(n), traverses the string
// Using strlen in a loop on a char[] is O(n²) total!
```

### 4. Comparing string::size() (unsigned) with negative int

```cpp
string s = "hi";
if(s.size() - 5 >= 0)   // ALWAYS TRUE — unsigned underflow!
if((int)s.size() - 5 >= 0)  // correct: -3 >= 0 is false
```

### 5. Modifying string while iterating — use index

```cpp
// TRAP: avoid iterator invalidation
for(auto it = s.begin(); it != s.end(); ) {
    if(*it == ' ') it = s.erase(it);  // erase returns next valid iterator
    else ++it;
}
// Easier: build a new string
```

### 6. KMP — when j != 0 on mismatch, DON'T advance i

```cpp
// This is the most common KMP coding bug
if(t[i] != p[j]) {
    if(j != 0) j = lps[j-1];  // DON'T do i++ here
    else i++;                   // only advance i when j == 0
}
```

### 7. Frequency array vs map — know when to use which

```cpp
// Lowercase letters only → int freq[26] = {0}  — O(1) space, fastest
// Arbitrary characters  → unordered_map<char,int>
// Need sorted order     → map<char,int>
```

### 8. Palindrome: even vs odd length centers

```cpp
// Expand around center — ALWAYS call expand for BOTH odd and even centers
for(int i = 0; i < n; i++) {
    expand(i, i);    // don't forget this one for odd
    expand(i, i+1);  // don't forget this one for even
}
// Forgetting the even-center case misses palindromes like "abba"
```

### 9. String concatenation in loop is O(n²)

```cpp
string result = "";
for(char c : v) result += c;    // O(n²) — each += can cause reallocation and copy

// Better:
string result;
result.reserve(v.size());        // pre-allocate
for(char c : v) result += c;    // now O(n) amortized
```

### 10. `stoi` throws on invalid input

```cpp
stoi("abc");  // throws std::invalid_argument
stoi("999999999999");  // throws std::out_of_range
// Use in try-catch or validate input first
```

---

## 15. Final Revision Sheet

### Key Templates

```cpp
// 1. Palindrome check (two-pointer)
bool isPalin(string& s, int l, int r) {
    while(l < r) {
        if(s[l++] != s[r--]) return false;
    }
    return true;
}

// 2. Frequency array for lowercase chars
int freq[26] = {0};
for(char c : s) freq[c - 'a']++;

// 3. Anagram check
bool isAnagram(string a, string b) {
    if(a.size() != b.size()) return false;
    int f[26] = {0};
    for(char c : a) f[c-'a']++;
    for(char c : b) { if(--f[c-'a'] < 0) return false; }
    return true;
}

// 4. Fixed sliding window
for(int r = 0; r < s.size(); r++) {
    window[s[r]-'a']++;
    if(r >= k) window[s[r-k]-'a']--;
    if(window == target) /* process */;
}

// 5. KMP LPS build
vector<int> buildLPS(string& p) {
    int m = p.size();
    vector<int> lps(m, 0);
    int len = 0, i = 1;
    while(i < m) {
        if(p[i] == p[len])      lps[i++] = ++len;
        else if(len != 0)       len = lps[len-1];
        else                    lps[i++] = 0;
    }
    return lps;
}

// 6. KMP Search
while(i < n) {
    if(t[i] == p[j]) { i++; j++; }
    if(j == m) { result.push_back(i-j); j = lps[j-1]; }
    else if(i < n && t[i] != p[j]) {
        j != 0 ? j = lps[j-1] : i++;
    }
}

// 7. Expand around center (longest palindrome)
auto expand = [&](int l, int r) {
    while(l >= 0 && r < n && s[l] == s[r]) { l--; r++; }
    return r - l - 1;  // length of palindrome
};
for(int i = 0; i < n; i++) {
    int odd = expand(i, i);
    int even = expand(i, i+1);
    maxLen = max({maxLen, odd, even});
}
```

### Complexity Table

| Operation | Time | Space | Notes |
|-----------|------|-------|-------|
| Palindrome check | O(n) | O(1) | Two-pointer |
| Anagram check | O(n) | O(1) | Frequency array |
| Find substring (naive) | O(n×m) | O(1) | Brute force |
| KMP build LPS | O(m) | O(m) | One-time cost |
| KMP search | O(n) | O(m) | Total O(n+m) |
| Z-algorithm | O(n+m) | O(n+m) | Similar to KMP |
| Longest palindromic substr | O(n²) | O(1) | Expand from center |
| Sliding window (fixed) | O(n) | O(1) | Rolling window |
| Sliding window (variable) | O(n) | O(k) | Two pointers |

### Interview Checklist

- [ ] Can I write palindrome check (iterative + recursive) without thinking?
- [ ] Do I know `substr(start, length)` — second arg is LENGTH not end?
- [ ] Can I build the KMP LPS array from memory?
- [ ] Do I know why `j = lps[j-1]` on KMP mismatch (and NOT move i)?
- [ ] Can I write the sliding window template for fixed and variable window?
- [ ] Do I cast `s.size()` to `int` before comparing with negative numbers?
- [ ] Do I know `isalnum`, `tolower`, `toupper` from `<cctype>`?
- [ ] Can I check if s.find() returned `string::npos`?
- [ ] Do I know when to use `freq[26]` vs `unordered_map`?
- [ ] Can I explain the expand-around-center for odd AND even palindromes?

### Most Important Observations

1. **KMP insight:** The failure function (LPS) re-uses work already done. On mismatch, you don't restart — you fall back to the longest border of the matched prefix.
2. **Palindrome:** Always handle even-length centers separately. Forgetting `expand(i, i+1)` misses "abba" type palindromes.
3. **Sliding window:** For variable window, always think: "when do I shrink left?" The answer is when your window condition is satisfied (for minimum window) or violated (for maximum window).
4. **Frequency array:** For lowercase-only problems, `int[26]` is strictly better than `unordered_map<char,int>` — no hashing, cache-friendly, O(1) comparison with `==` for vectors.
5. **String immutability trap:** In C++, `string` is mutable — you can modify it in place. This is different from Java/Python where strings are immutable.

---

*Chapter 05 — Strings | Part of DSA Interview Prep series*  
*Based on Striver's A2Z Sheet + Love Babbar lecture series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] Remove Outermost Parentheses — https://leetcode.com/problems/remove-outermost-parentheses/
- [ ] Reverse words in a given string / Palindrome Check — https://leetcode.com/problems/reverse-words-in-a-string/
- [ ] Largest Odd Number in a String — https://leetcode.com/problems/largest-odd-number-in-string/
- [ ] Longest Common Prefix — https://leetcode.com/problems/longest-common-prefix/
- [ ] Isomorphic String — https://leetcode.com/problems/isomorphic-strings/
- [ ] Rotate String — https://leetcode.com/problems/rotate-string/
- [ ] Check if two strings are anagram of each other — https://leetcode.com/problems/valid-anagram/
- [ ] Sort Characters by Frequency — https://leetcode.com/problems/sort-characters-by-frequency/
- [ ] Maximum Nesting Depth of the Parentheses — https://leetcode.com/problems/maximum-nesting-depth-of-the-parentheses/
- [ ] Roman to Integer — https://leetcode.com/problems/roman-to-integer/
- [ ] String to Integer (atoi) — https://leetcode.com/problems/string-to-integer-atoi/
- [ ] Count Number of Substrings
- [ ] Longest Palindromic Substring — https://leetcode.com/problems/longest-palindromic-substring/
- [ ] Sum of Beauty of All Substrings — https://leetcode.com/problems/sum-of-beauty-of-all-substrings/
- [ ] Reverse every word in a string — https://leetcode.com/problems/reverse-words-in-a-string/
- [ ] Minimum number of bracket reversals to make an expression balanced — https://leetcode.com/problems/minimum-add-to-make-parentheses-valid/
- [ ] Count and say — https://leetcode.com/problems/count-and-say/
- [ ] Hashing In Strings | Theory
- [ ] Rabin Karp Algorithm — https://leetcode.com/problems/repeated-string-match/discuss/416144/Rabin-Karp-algorithm-C%2B%2B-implementation
- [ ] Z function
- [ ] KMP Algorithm or LPS array — https://leetcode.com/problems/implement-strstr/
- [ ] Shortest Palindrome
- [ ] Longest happy prefix — https://leetcode.com/problems/longest-happy-prefix/
- [ ] Count Palindromic Subsequences — https://leetcode.com/problems/palindromic-substrings/
- [ ] Valid Palindrome — https://leetcode.com/problems/valid-palindrome/
- [ ] Reverse Words in a String — https://leetcode.com/problems/reverse-words-in-a-string-ii/
- [ ] Remove All Occurrences of a Substring — https://leetcode.com/problems/remove-all-occurrences-of-a-substring/
- [ ] Maximum Occurring Character — https://www.geeksforgeeks.org/problems/maximum-occuring-character-1587115620/1
- [ ] Permutation in String — https://leetcode.com/problems/permutation-in-string/

