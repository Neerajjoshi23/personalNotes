# Chapter 17 — Tries

> **Revision target:** 0.5 day  
> **Goal:** After reading this file, you need nothing else for Tries — no YouTube, no code files, no tutorials. Both character Trie and binary XOR Trie are covered completely.

---

## Table of Contents

1. [What is a Trie](#1-what-is-a-trie)
2. [Character Trie — Standard Implementation](#2-character-trie--standard-implementation)
3. [Binary Trie — XOR problems](#3-binary-trie--xor-problems)
4. [Your Codebase — Into.cpp Analysis](#4-your-codebase--intocpp-analysis)
5. [Advanced Operations](#5-advanced-operations)
6. [Things Most People Forget](#6-things-most-people-forget)
7. [Practice Problems](#7-practice-problems)
8. [Final Revision Sheet](#8-final-revision-sheet)

---

## 1. What is a Trie

A Trie (prefix tree) is a tree data structure where each path from root to a node spells out a prefix of some string (or binary number). Each node represents one character (or one bit).

**When to use Trie:**
- Autocomplete / prefix search
- Word search in a dictionary
- Maximum XOR of pairs in an array
- Count words with given prefix
- Replacing a hash set of strings when prefix operations are needed

### Visual intuition

For words: "cat", "car", "card", "care", "bat"

```
root
├── c → a → t (isEnd=true)
│           └── (nothing)
│       └── r → (isEnd=true: "car")
│               ├── d (isEnd=true: "card")
│               └── e (isEnd=true: "care")
└── b → a → t (isEnd=true: "bat")
```

Each node branches into up to 26 children (for lowercase English letters).

---

## 2. Character Trie — Standard Implementation

### TrieNode structure

```cpp
struct TrieNode {
    TrieNode* children[26];  // 26 lowercase letters
    bool isEnd;              // does a word end here?
    int countWords;          // optional: how many words pass through this node

    TrieNode() {
        for (int i = 0; i < 26; i++) children[i] = nullptr;
        isEnd = false;
        countWords = 0;
    }
};
```

### Complete Trie Class

```cpp
class Trie {
    TrieNode* root;

public:
    Trie() {
        root = new TrieNode();
    }

    // Insert a word — O(L) where L = word length
    void insert(string word) {
        TrieNode* node = root;
        for (char c : word) {
            int idx = c - 'a';
            if (!node->children[idx]) {
                node->children[idx] = new TrieNode();
            }
            node = node->children[idx];
            node->countWords++;  // count words passing through
        }
        node->isEnd = true;
    }

    // Search for exact word — O(L)
    bool search(string word) {
        TrieNode* node = root;
        for (char c : word) {
            int idx = c - 'a';
            if (!node->children[idx]) return false;
            node = node->children[idx];
        }
        return node->isEnd;  // must end exactly here
    }

    // Check if any word starts with prefix — O(L)
    bool startsWith(string prefix) {
        TrieNode* node = root;
        for (char c : prefix) {
            int idx = c - 'a';
            if (!node->children[idx]) return false;
            node = node->children[idx];
        }
        return true;  // just need to reach end of prefix — don't care about isEnd
    }

    // Count words with given prefix — O(L)
    int countWordsWithPrefix(string prefix) {
        TrieNode* node = root;
        for (char c : prefix) {
            int idx = c - 'a';
            if (!node->children[idx]) return 0;
            node = node->children[idx];
        }
        return node->countWords;
    }
};
```

### search vs startsWith — the critical difference

```
Words in trie: "apple"

search("apple")   → true  (complete word exists, isEnd = true)
search("app")     → false (node exists but isEnd = false!)
startsWith("app") → true  (prefix exists, we reach 'p' node successfully)
startsWith("xyz") → false (no path exists)
```

**Common mistake:** Returning `true` in `search` just because the path exists without checking `isEnd`. Always check `node->isEnd` at the end of `search`.

### Trie Delete operation

Deleting requires careful backtracking — only delete a node if no other word uses it.

```cpp
// Delete word from trie — returns true if node should be deleted
bool deleteHelper(TrieNode* node, string word, int depth) {
    if (!node) return false;

    if (depth == word.size()) {
        if (node->isEnd) {
            node->isEnd = false;
            node->countWords--;
        }
        // Delete this node only if it has no children
        return isLeaf(node);
    }

    int idx = word[depth] - 'a';
    bool shouldDelete = deleteHelper(node->children[idx], word, depth + 1);

    if (shouldDelete) {
        delete node->children[idx];
        node->children[idx] = nullptr;
        node->countWords--;
        return !node->isEnd && isLeaf(node);
    }
    node->countWords--;
    return false;
}

bool isLeaf(TrieNode* node) {
    for (int i = 0; i < 26; i++)
        if (node->children[i]) return false;
    return true;
}
```

### Time and Space Complexity

| Operation | Time | Space |
|-----------|------|-------|
| Insert | O(L) | O(L × 26) worst case per word |
| Search | O(L) | O(1) extra |
| StartsWith | O(L) | O(1) extra |
| Total space | O(total_chars × 26) | Shared nodes reduce actual space |

**Where L = length of the word.** Average case much better due to shared prefixes.

---

## 3. Binary Trie — XOR Problems

A binary Trie stores numbers bit by bit (from MSB to LSB). Used for XOR maximization.

### Why XOR Trie works

To maximize XOR of two numbers a and b, at each bit position, we want the opposite bit. If current bit of `a` is 0, we want 1 in b's corresponding bit (and vice versa).

A binary Trie lets us greedily find the number that maximizes XOR with a given query number.

### Binary TrieNode

```cpp
struct TrieNode {
    TrieNode* children[2];  // children[0] = bit 0, children[1] = bit 1
    bool isTerminal;

    TrieNode() {
        children[0] = children[1] = nullptr;
        isTerminal = false;
    }
};
```

### Complete Binary Trie for XOR

```cpp
class BinaryTrie {
    TrieNode* root;
    const int BITS = 30;  // for numbers up to 2^30

public:
    BinaryTrie() { root = new TrieNode(); }

    // Insert a number bit by bit (from MSB to LSB)
    void insert(int num) {
        TrieNode* node = root;
        for (int i = BITS; i >= 0; i--) {
            int bit = (num >> i) & 1;  // extract bit i
            if (!node->children[bit]) {
                node->children[bit] = new TrieNode();
            }
            node = node->children[bit];
        }
        node->isTerminal = true;
    }

    // Find maximum XOR of num with any number in trie
    int getMaxXOR(int num) {
        TrieNode* node = root;
        int result = 0;

        for (int i = BITS; i >= 0; i--) {
            int bit = (num >> i) & 1;
            int wantedBit = 1 - bit;  // we want the OPPOSITE bit for max XOR

            if (node->children[wantedBit]) {
                result |= (1 << i);  // set this bit in result (XOR = 1 here)
                node = node->children[wantedBit];
            } else {
                // Can't get XOR=1 here, must take same bit (XOR=0)
                node = node->children[bit];
            }
        }
        return result;
    }
};
```

### Bit extraction — the key operations

```cpp
// Extract bit i of number num (0-indexed from right)
int bit = (num >> i) & 1;

// Check if bit is set using different approach
int bit = ((num & (1 << i)) == 0) ? 0 : 1;  // from your code

// Set bit i in result
result |= (1 << i);

// Flip bit (0→1, 1→0)
int oppositebit = 1 - bit;
```

---

## 4. Your Codebase — Into.cpp Analysis

Your `Trie/Into.cpp` implements a **binary XOR Trie** (not a character Trie). It's an advanced application solving [Maximum Strong Pair XOR](https://leetcode.com/problems/maximum-strong-pair-xor-ii/).

### What the code does

A "strong pair" (x, y) satisfies `|x - y| <= min(x, y)`, which simplifies to `x <= 2*y` (for sorted x ≤ y). The problem asks for max XOR of any strong pair.

### Key insights from your code

**1. Binary Trie with 31 bits (i from 30 down to 0):**
```cpp
for (int i = 30; i >= 0; i--) {
    int bit = ((num & (1 << i)) == 0) ? 0 : 1;
    // ...
}
```

**2. Sliding window + binary Trie (two-pointer technique):**
```cpp
int reach = 0;
for (int i = 0; i < n; i++) {
    // Add numbers ≤ 2*num[i] to trie (valid strong pair partners)
    int ind = upper_bound(num.begin(), num.end(), 2*num[i]) - num.begin();
    while (reach < ind) t.insert(num[reach++]);
    ans = max(ans, t.getMax(num[i]));
    t.root = t.remove(t.root, num[i], 30);  // remove num[i] to avoid self-pairing
}
```

**3. The `getMax` function tries opposite bits first:**
```cpp
bit = 1 - bit;  // flip: we WANT the opposite bit for max XOR
if (currNode->children[bit] == NULL) bit = 1 - bit;  // if not available, take same
else ans = ans | (1 << i);  // XOR bit = 1 here → contribute to answer
```

**4. Delete operation** for cleanup after processing each number — full recursive tree cleanup with `isEmpty` check.

### The character → index mapping

```cpp
// Character Trie
int idx = c - 'a';            // 'a'=0, 'b'=1, ..., 'z'=25
node->children[idx]

// Binary Trie
int bit = (num >> i) & 1;     // 0 or 1
node->children[bit]
```

---

## 5. Advanced Operations

### Word Search II (Trie + DFS on grid)

**Problem:** Given a grid and a list of words, find all words that exist in the grid (adjacent cells, no reuse).

**Approach:** Build a Trie from all words. DFS on grid while following Trie paths. When `node->isEnd = true`, we found a word.

```cpp
void dfs(vector<vector<char>> &board, TrieNode* node, int i, int j, string &current, vector<string> &result) {
    char c = board[i][j];
    int idx = c - 'a';

    if (board[i][j] == '#' || !node->children[idx]) return;

    node = node->children[idx];
    current += c;
    board[i][j] = '#';  // mark visited

    if (node->isEnd) {
        result.push_back(current);
        node->isEnd = false;  // prevent duplicates
    }

    for (auto [dr, dc] : directions)
        if (valid(i+dr, j+dc)) dfs(board, node, i+dr, j+dc, current, result);

    board[i][j] = c;  // restore (backtrack)
    current.pop_back();
}

// For each unvisited cell, start DFS if root has that character's child
for (int i = 0; i < m; i++)
    for (int j = 0; j < n; j++)
        dfs(board, root, i, j, current, result);
```

**Why Trie over checking each word separately?** If there are 30,000 words, doing DFS for each would be O(30000 × m×n×4^L). With Trie, all words are explored simultaneously in a single DFS — O(m×n×4^L) total.

**Optimization:** After finding a word, mark its trie node `isEnd = false` to avoid duplicates. Further, prune trie nodes that are no longer needed (leaves with no isEnd) to avoid redundant DFS paths.

### Longest Word with All Prefixes in Dictionary

**Problem:** Find the longest word where every prefix of the word is also in the dictionary.

```cpp
// Build trie with all words
// BFS/DFS from root — only traverse nodes where isEnd=true
// Track the longest path

string ans = "";
function<void(TrieNode*, string)> dfs = [&](TrieNode* node, string word) {
    if (word.size() > ans.size() || (word.size() == ans.size() && word < ans))
        ans = word;
    for (int i = 0; i < 26; i++) {
        if (node->children[i] && node->children[i]->isEnd) {
            dfs(node->children[i], word + char('a' + i));
        }
    }
};
dfs(root, "");
```

### Count Distinct Substrings using Trie

Insert every suffix of the string into a trie. The number of new nodes created = number of distinct substrings.

```cpp
int countDistinctSubstrings(string s) {
    Trie trie;
    int count = 0;
    for (int i = 0; i < s.size(); i++) {
        // Insert suffix s[i..n-1] and count new nodes
        count += trie.insertAndCount(s.substr(i));
    }
    return count;
}
```

### Auto-complete / Suggestions from Trie

```cpp
void collectAllWords(TrieNode* node, string prefix, vector<string> &results) {
    if (node->isEnd) results.push_back(prefix);
    for (int i = 0; i < 26; i++) {
        if (node->children[i])
            collectAllWords(node->children[i], prefix + char('a' + i), results);
    }
}

vector<string> suggest(string prefix) {
    TrieNode* node = root;
    for (char c : prefix) {
        if (!node->children[c - 'a']) return {};
        node = node->children[c - 'a'];
    }
    vector<string> results;
    collectAllWords(node, prefix, results);
    return results;
}
```

### Word Break (Trie + DP)

**Problem:** Given a string `s` and a dictionary of words, determine if `s` can be segmented into space-separated dictionary words.

**Why Trie beats HashSet here:** With a Trie, you can stop prefix checking early — if no word starts with the current prefix, no need to continue. With a HashSet you'd check the substring directly. Both are O(n²) in the worst case, but Trie is often faster in practice.

```cpp
// Approach 1: DP + Trie (cleaner for interviews)
bool wordBreak(string s, vector<string>& wordDict) {
    Trie trie;
    for (auto& w : wordDict) trie.insert(w);

    int n = s.size();
    vector<bool> dp(n + 1, false);
    dp[0] = true;  // empty prefix is always valid

    for (int i = 0; i < n; i++) {
        if (!dp[i]) continue;  // if we can't reach index i, skip
        // Try all substrings starting at i
        TrieNode* node = trie.root;
        for (int j = i; j < n; j++) {
            int idx = s[j] - 'a';
            if (!node->children[idx]) break;  // no word with this prefix — stop early
            node = node->children[idx];
            if (node->isEnd) dp[j + 1] = true;  // word s[i..j] is in dictionary
        }
    }
    return dp[n];
}
// Time: O(n²) worst case but fast with Trie pruning
// Space: O(n + total dict chars)
```

**Without Trie (plain DP + HashSet — simpler but no early termination):**
```cpp
bool wordBreak(string s, vector<string>& wordDict) {
    unordered_set<string> dict(wordDict.begin(), wordDict.end());
    int n = s.size();
    vector<bool> dp(n + 1, false);
    dp[0] = true;

    for (int i = 1; i <= n; i++) {
        for (int j = 0; j < i; j++) {
            if (dp[j] && dict.count(s.substr(j, i - j))) {
                dp[i] = true;
                break;
            }
        }
    }
    return dp[n];
}
// Time: O(n³) — O(n²) states × O(n) substr construction
```

**The dp[i] meaning:** Can the prefix `s[0..i-1]` be fully segmented? `dp[0] = true` is the base case (empty prefix needs no words).

### Word Break II — Return All Segmentations (Trie + Backtracking)

```cpp
vector<string> wordBreakII(string s, vector<string>& wordDict) {
    Trie trie;
    for (auto& w : wordDict) trie.insert(w);

    int n = s.size();
    vector<string> result;
    string current;

    function<void(int)> backtrack = [&](int start) {
        if (start == n) {
            // Remove trailing space and add to result
            result.push_back(current.substr(0, current.size() - 1));
            return;
        }
        TrieNode* node = trie.root;
        for (int end = start; end < n; end++) {
            int idx = s[end] - 'a';
            if (!node->children[idx]) break;  // Trie prunes invalid paths
            node = node->children[idx];
            if (node->isEnd) {
                current += s.substr(start, end - start + 1) + " ";
                backtrack(end + 1);
                // Undo: remove the word + space we just added
                current.resize(current.size() - (end - start + 2));
            }
        }
    };

    backtrack(0);
    return result;
}
```

**Key advantage of Trie here:** The `break` when a prefix doesn't match prunes entire branches of the backtracking tree. Without Trie, you'd try every possible split and check substring in the set — O(2^n) in worst case. Trie makes it O(n × maxWordLen) per path.

---

## 6. Things Most People Forget

### 1. search checks isEnd; startsWith does NOT

```cpp
// search: must check isEnd
bool search(string w) {
    // ... traverse path ...
    return node->isEnd;  // NOT just "return true"
}

// startsWith: just reach end of prefix
bool startsWith(string p) {
    // ... traverse path ...
    return true;  // reaching here = prefix exists
}
```

### 2. Binary Trie iterates from MSB to LSB (bit 30 down to 0)

```cpp
for (int i = 30; i >= 0; i--) {  // MSB first
    int bit = (num >> i) & 1;
    // ...
}
```

Why MSB first? Higher bits contribute more to the XOR value. We want to maximize from the most significant bit first.

### 3. In XOR Trie getMax: flip bit, take opposite if available

```cpp
int wantedBit = 1 - bit;  // flip: XOR should be 1
if (node->children[wantedBit]) {
    result |= (1 << i);   // this bit contributes 1 to XOR
    node = node->children[wantedBit];
} else {
    node = node->children[bit];  // forced: XOR = 0 here
}
```

### 4. Word Search II: mark cell '#' during DFS, restore on backtrack

```cpp
char temp = board[i][j];
board[i][j] = '#';          // mark visited (avoids revisiting in same path)
dfs(board, node, ...);
board[i][j] = temp;         // restore for other paths
```

### 5. Duplicate word in Word Search II: mark isEnd = false after finding

```cpp
if (node->isEnd) {
    result.push_back(current);
    node->isEnd = false;    // prevent same word appearing multiple times
}
```

### 6. Trie space: each node has 26 children pointers (256 bytes per node in naive impl)

For memory-tight problems, use `unordered_map<char, TrieNode*> children` instead of `TrieNode* children[26]`. Tradeoff: slower access (hash) but less memory for sparse tries.

```cpp
// Space-efficient TrieNode
struct TrieNode {
    unordered_map<char, TrieNode*> children;
    bool isEnd = false;
};
```

### 7. Don't forget to initialize all 26 children to nullptr

```cpp
// In constructor, either:
TrieNode* children[26] = {nullptr};  // value-initialization
// Or:
for (int i = 0; i < 26; i++) children[i] = nullptr;
```

### 8. The bit extraction: two equivalent forms

```cpp
// Form 1 (your code):
int bit = ((num & (1 << i)) == 0) ? 0 : 1;

// Form 2 (cleaner):
int bit = (num >> i) & 1;
```

Both give the i-th bit. Form 2 is more commonly seen in interviews.

---

## 8. Final Revision Sheet

### Core Templates

```cpp
// 1. TrieNode (character trie)
struct TrieNode {
    TrieNode* children[26] = {};
    bool isEnd = false;
};

// 2. Insert
void insert(string w) {
    TrieNode* node = root;
    for (char c : w) {
        int i = c - 'a';
        if (!node->children[i]) node->children[i] = new TrieNode();
        node = node->children[i];
    }
    node->isEnd = true;
}

// 3. Search (exact word)
bool search(string w) {
    TrieNode* node = root;
    for (char c : w) {
        int i = c - 'a';
        if (!node->children[i]) return false;
        node = node->children[i];
    }
    return node->isEnd;  // MUST check isEnd!
}

// 4. StartsWith (prefix)
bool startsWith(string p) {
    TrieNode* node = root;
    for (char c : p) {
        int i = c - 'a';
        if (!node->children[i]) return false;
        node = node->children[i];
    }
    return true;  // NO isEnd check
}

// 5. Binary Trie insert
void insert(int num) {
    TrieNode* node = root;
    for (int i = 30; i >= 0; i--) {
        int bit = (num >> i) & 1;
        if (!node->children[bit]) node->children[bit] = new TrieNode();
        node = node->children[bit];
    }
}

// 6. Binary Trie getMaxXOR
int getMaxXOR(int num) {
    TrieNode* node = root;
    int result = 0;
    for (int i = 30; i >= 0; i--) {
        int bit = (num >> i) & 1;
        int want = 1 - bit;
        if (node->children[want]) { result |= (1 << i); node = node->children[want]; }
        else node = node->children[bit];
    }
    return result;
}
```

### Complexity Table

| Operation | Character Trie | Binary Trie |
|-----------|---------------|-------------|
| Insert | O(L) | O(31) ≈ O(1) |
| Search | O(L) | O(31) ≈ O(1) |
| StartsWith | O(L) | — |
| Max XOR query | — | O(31) ≈ O(1) |
| Space per word | O(L × 26) worst | O(31 × 2) worst |

### Interview Checklist

- [ ] Can I write TrieNode with `children[26]` from memory?
- [ ] Do I check `isEnd` in `search` but NOT in `startsWith`?
- [ ] Can I write binary Trie insert from bit 30 down to 0?
- [ ] Can I write getMaxXOR (flip bit, prefer opposite, OR into result)?
- [ ] For Word Search II: do I mark '#' during DFS and restore after?
- [ ] For wildcard search ('.'), do I try all 26 children?
- [ ] Can I implement Word Break with Trie + DP (dp[0]=true, dp[j+1]=true on word found)?
- [ ] Do I know the Trie advantage in Word Break is early termination via `break` on missing prefix?
- [ ] Can I adapt Word Break to return all segmentations (backtracking + Trie pruning)?

---

*Chapter 17 — Tries | Part of DSA Interview Prep series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] Implement Trie (Insert, Search, StartsWith) — https://leetcode.com/problems/implement-trie-prefix-tree/
- [ ] Longest Word with All Prefixes — https://leetcode.com/problems/longest-word-in-dictionary/
- [ ] Number of distinct substrings in a string — https://www.geeksforgeeks.org/problems/number-of-distinct-substrings-in-a-string/1
- [ ] Maximum XOR of two numbers in an array — https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/
- [ ] Maximum XOR with an element from an array — https://leetcode.com/problems/maximum-xor-with-an-element-from-array/

