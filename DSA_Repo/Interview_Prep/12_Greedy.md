# Chapter 12 — Greedy Algorithms

> **Revision target:** 0.5 day  
> **Goal:** After reading this file, you need nothing else for this topic — no code files, no YouTube, no tutorials.

---

## Table of Contents

1. [What Makes an Algorithm Greedy?](#1-what-makes-an-algorithm-greedy)
2. [The Exchange Argument — Proving Greedy Correctness](#2-the-exchange-argument--proving-greedy-correctness)
3. [Activity Selection / Interval Scheduling](#3-activity-selection--interval-scheduling)
4. [Fractional Knapsack](#4-fractional-knapsack)
5. [Job Sequencing with Deadlines](#5-job-sequencing-with-deadlines)
6. [Huffman Coding](#6-huffman-coding)
7. [Jump Game Patterns](#7-jump-game-patterns)
8. [Gas Station](#8-gas-station)
9. [Candy Distribution](#9-candy-distribution)
10. [Non-overlapping Intervals](#10-non-overlapping-intervals)
11. [Greedy vs DP — When Does Greedy Work?](#11-greedy-vs-dp--when-does-greedy-work)
12. [Things Most People Forget](#12-things-most-people-forget)
13. [Practice Problems](#13-practice-problems)
14. [Final Revision Sheet](#14-final-revision-sheet)

---

## 1. What Makes an Algorithm Greedy?

A greedy algorithm builds the solution **piece by piece**, always making the **locally optimal choice** at each step, with the hope that this leads to the **globally optimal solution**.

**Key properties a problem must have:**

1. **Greedy Choice Property:** A globally optimal solution can be constructed by making locally optimal choices. Making the best choice right now doesn't foreclose future optimal choices.

2. **Optimal Substructure:** The optimal solution to the problem contains optimal solutions to its subproblems. (Shared with DP, but greedy additionally needs the greedy choice property.)

**The hard question interviewers ask:** "Why doesn't DP work here? Why is greedy correct?"

The answer is the **exchange argument** — see the next section.

**Pattern recognition — when to try greedy:**
- "Maximize/minimize something subject to a constraint"
- "Pick/schedule/assign elements optimally"
- "The problem has a natural ordering (by start time, ratio, deadline, etc.)"
- Sorting by some criterion and then greedily picking is common
- "At each step, there's an obvious 'best' local choice and no decision needs backtracking"

**When greedy FAILS and you need DP:**
- 0/1 Knapsack: you can't take a fraction, so the greedy ratio approach fails
- Longest Common Subsequence: no local greedy choice is obvious
- Coin change with arbitrary denominations: greedy doesn't minimize coins (e.g., coins {1,3,4} to make 6: greedy gives 4+1+1=3 coins, DP gives 3+3=2 coins)

---

## 2. The Exchange Argument — Proving Greedy Correctness

This is what separates candidates who truly understand greedy from those who've just memorized solutions.

**The exchange argument template:**

1. Assume there exists an **optimal solution OPT** that differs from the **greedy solution G**.
2. Find the **first position** where they differ.
3. Show that you can **swap** OPT's choice at that position with G's choice **without making OPT worse**.
4. Repeat until OPT becomes identical to G.
5. Conclude: G is at least as good as OPT, hence G is optimal.

### Example: Activity Selection

**Greedy choice:** Always pick the activity that finishes earliest.

**Exchange argument proof:**
- Let G's first pick be activity `a` (finishes earliest among all compatible with previous choices).
- Suppose OPT picks activity `b` first (different from `a`).
- Since `a` finishes earliest, finish(`a`) ≤ finish(`b`).
- Replace `b` with `a` in OPT. Since `a` finishes no later than `b`, any activity compatible with `b` is also compatible with `a`. So OPT' (with `a` instead of `b`) is still feasible.
- OPT' has the same number of activities as OPT.
- Continue swapping until OPT becomes G.
- Therefore |G| ≥ |OPT|, and since OPT is optimal, |G| = |OPT|. Greedy is optimal.

**Template for explaining to an interviewer:**

> "I'm using the exchange argument. Suppose the optimal solution O differs from our greedy solution G at some step. I'll show that swapping O's choice with G's choice at that step produces a solution no worse than O. Since we can always make such swaps without losing quality, G must be at least as good as O."

---

## 3. Activity Selection / Interval Scheduling

**Problem:** Given n activities with start and finish times, select the maximum number of non-overlapping activities.

**Greedy rule:** Sort by finish time. Always pick the activity that finishes earliest and doesn't conflict with the last picked activity.

```cpp
int activitySelection(vector<pair<int,int>>& activities) {
    // Sort by finish time
    sort(activities.begin(), activities.end(), [](auto& a, auto& b) {
        return a.second < b.second;
    });

    int count = 1;
    int lastFinish = activities[0].second;

    for (int i = 1; i < activities.size(); i++) {
        if (activities[i].first >= lastFinish) {  // no overlap
            count++;
            lastFinish = activities[i].second;
        }
    }
    return count;
}
// Time: O(n log n)   Space: O(1)
```

**Why sort by finish time?** By finishing early, we leave maximum room for future activities. Sorting by start time or duration is wrong — counterexamples exist.

**Counterexample for sort-by-start:** Activity [(1,10), (2,3), (4,5)]. Sorting by start picks (1,10) first, blocking (2,3) and (4,5). Optimal picks (2,3) and (4,5) = 2 activities.

**Two activities conflict if:** `start_B < finish_A` (B starts before A finishes). They are compatible if `start_B >= finish_A`.

**Common variation — Minimum number of platforms (Interval Merge):**

```cpp
int minPlatforms(vector<int>& arrival, vector<int>& departure) {
    sort(arrival.begin(), arrival.end());
    sort(departure.begin(), departure.end());

    int platforms = 1, maxPlatforms = 1;
    int i = 1, j = 0;

    while (i < arrival.size() && j < departure.size()) {
        if (arrival[i] <= departure[j]) {
            platforms++;
            i++;
        } else {
            platforms--;
            j++;
        }
        maxPlatforms = max(maxPlatforms, platforms);
    }
    return maxPlatforms;
}
```

**Common variation — Meeting Rooms II (same as min platforms):**
Same problem, different wording. Use two-pointer on sorted arrival/departure.

---

## 4. Fractional Knapsack

**Problem:** Items with weight and value. Knapsack capacity W. You can take fractions of items. Maximize total value.

**Greedy rule:** Sort items by **value/weight ratio** (descending). Take as much as possible from the highest-ratio item, then next, and so on.

```cpp
double fractionalKnapsack(int W, vector<pair<int,int>>& items) {
    // Sort by value/weight ratio descending
    sort(items.begin(), items.end(), [](auto& a, auto& b) {
        return (double)a.first / a.second > (double)b.first / b.second;
        // a.first = value, a.second = weight
    });

    double totalValue = 0.0;

    for (auto& [value, weight] : items) {
        if (W >= weight) {
            totalValue += value;
            W -= weight;
        } else {
            totalValue += (double)value / weight * W;
            break;  // knapsack full
        }
    }
    return totalValue;
}
// Time: O(n log n)   Space: O(1)
```

**Why value/weight ratio?** Each unit of weight "spent" on a high-ratio item gives more value than spending it on a low-ratio item. By maximizing value-per-weight, we optimally fill the knapsack.

**Why doesn't this work for 0/1 Knapsack?** Because we can't take fractions. Consider items: {value=10, weight=5}, {value=9, weight=4}, capacity=6. Greedy takes all of item 1 (ratio=2) but that fills the knapsack and gives 10. Optimal takes all of item 2 (ratio=2.25, weight=4) and can't take more → value=9. Wait actually greedy also gives 10 here. Better example: {val=3,w=3},{val=4,w=4},{val=5,w=5} capacity=7. Fractional greedy: all ratios are equal (1), takes first two for value 7. But optimally: items 2+3 give 9. The real issue is that 0/1 has binary choices that interact — taking item A might block item B entirely.

**Exchange argument for fractional knapsack:** Suppose OPT selects a different fraction of some item than greedy. Replace OPT's choice with greedy's choice: the highest-ratio item should be taken first. Any "swap" of a unit of weight from a lower-ratio item to a higher-ratio item increases (or maintains) total value. Hence greedy is optimal.

---

## 5. Job Sequencing with Deadlines

**Problem:** n jobs, each with a deadline and profit. Each job takes 1 unit of time. Maximize total profit subject to: each job must be done by its deadline.

**Greedy rule:** Sort jobs by profit descending. For each job (greedily, highest profit first), assign it to the latest available slot ≤ its deadline.

```cpp
int jobSequencing(vector<pair<int,int>>& jobs, int n) {
    // jobs[i] = {deadline, profit}
    sort(jobs.begin(), jobs.end(), [](auto& a, auto& b) {
        return a.second > b.second;  // sort by profit descending
    });

    int maxDeadline = 0;
    for (auto& [d, p] : jobs) maxDeadline = max(maxDeadline, d);

    vector<int> slot(maxDeadline + 1, -1);  // slot[i] = job assigned to time i
    int totalProfit = 0, count = 0;

    for (auto& [deadline, profit] : jobs) {
        // Find latest free slot <= deadline
        for (int j = deadline; j >= 1; j--) {
            if (slot[j] == -1) {
                slot[j] = profit;
                totalProfit += profit;
                count++;
                break;
            }
        }
    }
    return totalProfit;
}
// Time: O(n log n) + O(n * maxDeadline)
```

**Why process highest profit first?** We want to ensure the most valuable jobs get scheduled. High-profit jobs take priority; lower-profit jobs fill remaining slots.

**Why assign to the latest available slot?** Assigning to slot 1 when slot 3 is available wastes slot 1 — future jobs with deadline 1 or 2 would lose their only chance.

**Optimized with DSU (Disjoint Set Union):** Find the latest free slot in O(α(n)) instead of O(deadline). Use path compression on a "find the free slot before deadline d" operation.

---

## 6. Huffman Coding

**Problem:** Given character frequencies, build a prefix-free binary encoding that minimizes total bits.

**Greedy rule:** Always merge the two nodes with the lowest frequency.

**The insight:** In the optimal encoding tree, lower-frequency characters get longer codes (deeper in the tree) and higher-frequency characters get shorter codes. We build this bottom-up by always combining the two least frequent nodes.

```cpp
struct HuffmanNode {
    char ch;
    int freq;
    HuffmanNode *left, *right;
    HuffmanNode(char c, int f) : ch(c), freq(f), left(nullptr), right(nullptr) {}
};

auto cmp = [](HuffmanNode* a, HuffmanNode* b) { return a->freq > b->freq; };
priority_queue<HuffmanNode*, vector<HuffmanNode*>, decltype(cmp)> pq(cmp);

HuffmanNode* buildHuffman(vector<pair<char,int>>& chars) {
    for (auto& [c, f] : chars)
        pq.push(new HuffmanNode(c, f));

    while (pq.size() > 1) {
        HuffmanNode* left  = pq.top(); pq.pop();
        HuffmanNode* right = pq.top(); pq.pop();
        HuffmanNode* parent = new HuffmanNode('\0', left->freq + right->freq);
        parent->left  = left;
        parent->right = right;
        pq.push(parent);
    }
    return pq.top();  // root of Huffman tree
}

void getCodesFromTree(HuffmanNode* root, string code, map<char,string>& codes) {
    if (!root) return;
    if (!root->left && !root->right) {
        codes[root->ch] = code;
        return;
    }
    getCodesFromTree(root->left,  code + "0", codes);
    getCodesFromTree(root->right, code + "1", codes);
}
// Time: O(n log n)
```

**Connection to Min Cost of Ropes:** It's the same algorithm! "Min cost of ropes" asks for minimum total combining cost. Huffman asks for minimum total bit cost. Both = always merge two smallest. The sum of internal node frequencies = total bit cost.

**Why is this greedy optimal?** Exchange argument: If we didn't merge the two smallest, we'd merge something larger. Swapping to always merge smallest gives a tree with equal or lower total weighted path length. (This is proven formally by Huffman's 1952 theorem.)

---

## 7. Jump Game Patterns

### Jump Game I — Can you reach the end?

**Problem:** Given array `nums` where `nums[i]` is the maximum jump from index i, determine if you can reach the last index.

**Greedy rule:** Track the maximum reachable index at each step. If you ever reach a position beyond `maxReach`, you're stuck.

```cpp
bool canJump(vector<int>& nums) {
    int maxReach = 0;
    for (int i = 0; i < nums.size(); i++) {
        if (i > maxReach) return false;  // can't reach this position
        maxReach = max(maxReach, i + nums[i]);
    }
    return true;
}
// Time: O(n)   Space: O(1)
```

**Why this works:** At each position i, we maintain the farthest we can possibly reach from any position ≤ i. If we reach i but i > maxReach, no previous position could get us here → impossible.

**Greedy choice:** Don't worry about which jump path to take. Just track the frontier of reachability.

### Jump Game II — Minimum jumps to reach end

**Problem:** Same setup but guaranteed to be reachable. Find minimum number of jumps.

**Greedy rule:** Use "levels" like BFS. At each level (range of reachable positions), find the farthest position reachable from any position in the current level. That farthest position is the next level.

```cpp
int jump(vector<int>& nums) {
    int jumps = 0;
    int currentEnd = 0;   // end of current jump's reachable range
    int farthest = 0;     // farthest reachable from current range

    for (int i = 0; i < (int)nums.size() - 1; i++) {
        farthest = max(farthest, i + nums[i]);
        if (i == currentEnd) {  // exhausted current range → must jump
            jumps++;
            currentEnd = farthest;
        }
    }
    return jumps;
}
// Time: O(n)   Space: O(1)
```

**Why greedy (not BFS or DP)?** At each "level" we don't need to track which position achieved the farthest reach — we only need the farthest value itself. This reduces BFS to a O(n) greedy scan.

**Trace with [2, 3, 1, 1, 4]:**
```
i=0: farthest = max(0, 0+2)=2; i==currentEnd(0) → jumps=1, currentEnd=2
i=1: farthest = max(2, 1+3)=4
i=2: farthest = max(4, 2+1)=4; i==currentEnd(2) → jumps=2, currentEnd=4
i=3: farthest = max(4, 3+1)=4
Result: 2 jumps
```

---

## 8. Gas Station

**Problem:** n gas stations in a circle. `gas[i]` = gas available at station i. `cost[i]` = gas needed to travel from i to i+1. Find the starting station from which you can complete the circuit, or -1 if impossible.

**Greedy insight 1:** If `sum(gas) >= sum(cost)`, a solution always exists (and is unique).

**Greedy insight 2:** If starting from station `start`, you run out of gas at station `j`, then no station between `start` and `j` can be a valid starting point (because each of them starts with less gas than `start` at that point).

```cpp
int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {
    int totalGas = 0, currentGas = 0;
    int startStation = 0;

    for (int i = 0; i < gas.size(); i++) {
        int net = gas[i] - cost[i];
        totalGas += net;
        currentGas += net;

        if (currentGas < 0) {
            // Can't reach i+1 from startStation
            // Reset: try starting from i+1
            startStation = i + 1;
            currentGas = 0;
        }
    }

    return (totalGas >= 0) ? startStation : -1;
}
// Time: O(n)   Space: O(1)
```

**Why resetting to i+1 is valid:**

If we started at `start` and failed at position `i` (ran out of gas), then for any station `k` between `start` and `i`:
- We had positive net gas up to k (we were still going at k).
- Starting from k means we skip the gas from `start` to `k-1`.
- Since that accumulated gas was positive, starting at k gives us less gas when we reach k... wait, no.

More precisely: when starting from `start` and reaching `k`, we had `accumulated gas from start to k`. If we now start at `k`, we don't have that accumulated buffer. So starting at `k` is strictly worse than starting at `start` for reaching i+1. Since even `start` couldn't reach i+1, neither can any k ∈ [start, i].

**The two-pass approach (also valid but O(n) space):** Check total sum first. Then find the station after the last negative-prefix-sum point.

---

## 9. Candy Distribution

**Problem:** n children in a row, each with a rating. Give each child at least 1 candy. Children with a higher rating than their neighbor get more candies than that neighbor. Minimize total candies.

**Greedy — two-pass approach:**

```cpp
int candy(vector<int>& ratings) {
    int n = ratings.size();
    vector<int> candies(n, 1);  // everyone gets at least 1

    // Left-to-right pass: satisfy left neighbor constraint
    for (int i = 1; i < n; i++) {
        if (ratings[i] > ratings[i-1])
            candies[i] = candies[i-1] + 1;
    }

    // Right-to-left pass: satisfy right neighbor constraint
    for (int i = n-2; i >= 0; i--) {
        if (ratings[i] > ratings[i+1])
            candies[i] = max(candies[i], candies[i+1] + 1);
    }

    return accumulate(candies.begin(), candies.end(), 0);
}
// Time: O(n)   Space: O(n)
```

**Why two passes?** The left-to-right pass ensures `rating[i] > rating[i-1] → candy[i] > candy[i-1]`. But this might not satisfy the right neighbor constraint. The right-to-left pass fixes that, taking the max to avoid reducing already-correct assignments.

**Why max in the right-to-left pass?** The left pass may have already given a child enough candies for their left constraint. The right pass can only increase (to satisfy right constraint), never decrease (or we'd violate left constraint).

**Can you do O(1) space?** Yes, using the slope counting method — track increasing and decreasing runs. More complex but worth knowing exists.

---

## 10. Non-overlapping Intervals

**Problem:** Given intervals, find the minimum number of intervals to remove to make the rest non-overlapping.

**Greedy rule:** Same as activity selection! Sort by end time. Greedily keep intervals that don't overlap. Count removals.

```cpp
int eraseOverlapIntervals(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end(), [](auto& a, auto& b) {
        return a[1] < b[1];  // sort by end time
    });

    int count = 0;
    int lastEnd = intervals[0][1];

    for (int i = 1; i < intervals.size(); i++) {
        if (intervals[i][0] < lastEnd) {
            count++;  // overlap → remove this interval
            // keep the one with earlier end (already placed as lastEnd)
        } else {
            lastEnd = intervals[i][1];
        }
    }
    return count;
}
// Time: O(n log n)   Space: O(1)
```

**The key insight:** When two intervals overlap, we remove the one with the LATER end time (since earlier end leaves more room for future intervals). Sorting by end time and keeping the first of each overlapping group achieves this automatically.

**Relationship to Activity Selection:** `answer = n - (max non-overlapping intervals)`. This problem is the complement of activity selection.

---

## 11. Greedy vs DP — When Does Greedy Work?

This is what interviewers ask most. Know the answer cold.

### The Core Distinction

| Property | Greedy | DP |
|----------|--------|-----|
| Greedy choice property | ✅ Required | ❌ Not required |
| Optimal substructure | ✅ Required | ✅ Required |
| Considers all choices? | ❌ Only locally optimal | ✅ All possibilities |
| Time complexity | Usually O(n log n) or O(n) | Usually O(n²) or O(n·k) |

### Problems where Greedy Works

| Problem | Greedy Choice | Why It Works |
|---------|--------------|--------------|
| Activity Selection | Earliest finish first | Exchange argument: swapping to earliest-finish doesn't reduce count |
| Fractional Knapsack | Highest value/weight ratio | Taking highest-ratio fraction per unit weight maximizes total value |
| Job Sequencing | Highest profit first | High-profit jobs deserve priority; late slots preserve earlier deadlines |
| Huffman Coding | Merge two smallest | Least frequent = deepest in tree; always optimal to push them deeper |
| Min Cost Ropes | Merge two smallest | Same as Huffman — exchange argument |
| Dijkstra | Process closest unvisited | Shortest path to a node can't be improved once finalized (no negative edges) |

### Problems where Greedy FAILS (need DP)

| Problem | Greedy Attempt | Why It Fails |
|---------|----------------|--------------|
| 0/1 Knapsack | Take highest ratio item | Can't split items; greedy may block a better combination |
| Longest Common Subsequence | Match first common char | Matching early may skip a longer common subsequence |
| Coin Change (arbitrary coins) | Largest coin first | E.g., coins {1,3,4} to make 6: greedy gives 4+1+1=3 coins; optimal is 3+3=2 |
| Edit Distance | Make cheapest edit | One cheap edit may force many expensive edits later |
| Subset Sum | — | No greedy exists; it's NP-complete for general case |

### The Coin Change Counterexample — Most Important

```
Coins: {1, 3, 4}    Target: 6

Greedy (largest first): 4 → remaining 2 → 1 → 1 → Total: 3 coins
DP (optimal):           3 → 3 → Total: 2 coins

Greedy fails here.
```

But with standard denominations {1, 5, 10, 25} (US coins), greedy works. The structure of the coin system matters.

### "Why greedy and not DP here?" — Scripted Answer

> "This problem has the greedy choice property: the locally optimal decision (e.g., picking the activity with earliest finish time) never forecloses a better global solution. I can prove this with the exchange argument: if an optimal solution makes a different choice at some step, swapping it to the greedy choice produces a solution that's equally good. This isn't true for 0/1 knapsack, for example, where taking the locally best item might leave us unable to fill the remaining capacity optimally."

---

## 12. Things Most People Forget

### 1. Greedy needs a proof — not just intuition

If you can't construct an exchange argument, your greedy might be wrong. Always ask: "Can I show that swapping to the greedy choice never makes things worse?"

### 2. Activity selection — sort by FINISH time, not start time

```cpp
// CORRECT
sort(activities.begin(), activities.end(), [](auto& a, auto& b) {
    return a.second < b.second;  // by finish time
});

// WRONG — sorting by start time gives wrong answer
sort(activities.begin(), activities.end(), [](auto& a, auto& b) {
    return a.first < b.first;  // by start time — this is WRONG
});
```

### 3. Non-overlapping removal = n minus maximum non-overlapping

```
Minimum removals = n - (max activities from activity selection)
```

Don't solve removal directly. Solve the activity selection problem, then subtract.

### 4. Fractional Knapsack — value is first, weight is second

Common pair representation confusion. Sort by `(double)value / weight` — don't accidentally compute `weight / value`.

### 5. Gas Station — reset candidate, not gas

When you fail at position i, you reset `startStation = i + 1` AND `currentGas = 0`. Don't carry over the negative gas.

### 6. Candy — two passes, taking max

Right-to-left pass uses `max(candies[i], candies[i+1] + 1)`. Forgetting `max` overwrites the left-pass result and breaks left-neighbor constraints.

### 7. Jump Game II — loop goes to n-2, not n-1

```cpp
for (int i = 0; i < (int)nums.size() - 1; i++)  // not nums.size()
```

We don't need to jump FROM the last position.

### 8. Huffman and Min-Cost-Ropes are the same algorithm

Both: always merge two smallest → use min-heap → push sum back in.

### 9. Greedy choice ≠ "try all choices and pick best"

Trying all choices is either DP or brute force. Greedy makes ONE choice and never revisits it.

### 10. Job sequencing — assign to LATEST available slot ≤ deadline

Assigning to earliest available slot is wrong — it wastes early slots that might be the ONLY option for deadline-1 jobs.

---

## 14. Final Revision Sheet

### Core Templates

```cpp
// 1. Activity Selection (sort by finish time)
sort(v.begin(), v.end(), [](auto& a, auto& b) { return a.second < b.second; });
int count = 1, lastEnd = v[0].second;
for (int i = 1; i < v.size(); i++)
    if (v[i].first >= lastEnd) { count++; lastEnd = v[i].second; }

// 2. Fractional Knapsack (sort by value/weight ratio)
sort(items.begin(), items.end(), [](auto& a, auto& b) {
    return (double)a.value/a.weight > (double)b.value/b.weight;
});

// 3. Jump Game I (can reach end?)
int maxReach = 0;
for (int i = 0; i < n; i++) {
    if (i > maxReach) return false;
    maxReach = max(maxReach, i + nums[i]);
}
return true;

// 4. Jump Game II (min jumps)
int jumps = 0, curEnd = 0, farthest = 0;
for (int i = 0; i < n-1; i++) {
    farthest = max(farthest, i + nums[i]);
    if (i == curEnd) { jumps++; curEnd = farthest; }
}

// 5. Gas Station
int total = 0, curr = 0, start = 0;
for (int i = 0; i < n; i++) {
    int net = gas[i] - cost[i];
    total += net; curr += net;
    if (curr < 0) { start = i+1; curr = 0; }
}
return (total >= 0) ? start : -1;

// 6. Candy (two-pass)
vector<int> c(n, 1);
for (int i = 1; i < n; i++) if (r[i] > r[i-1]) c[i] = c[i-1]+1;
for (int i = n-2; i >= 0; i--) if (r[i] > r[i+1]) c[i] = max(c[i], c[i+1]+1);

// 7. Non-overlapping Intervals
sort, count overlaps (same as activity selection, answer = n - maxNonOverlapping)

// 8. Min Cost Ropes / Huffman
priority_queue<long long, vector<long long>, greater<>> pq;
for (int x : arr) pq.push(x);
long long cost = 0;
while (pq.size() > 1) {
    auto a = pq.top(); pq.pop();
    auto b = pq.top(); pq.pop();
    cost += a+b; pq.push(a+b);
}
```

### Complexity Table

| Problem | Time | Space | Greedy Choice |
|---------|------|-------|---------------|
| Activity Selection | O(n log n) | O(1) | Earliest finish |
| Fractional Knapsack | O(n log n) | O(1) | Highest value/weight |
| Job Sequencing | O(n log n + n·D) | O(D) | Highest profit first |
| Huffman / Min Ropes | O(n log n) | O(n) | Merge two smallest |
| Jump Game I | O(n) | O(1) | Extend maxReach |
| Jump Game II | O(n) | O(1) | Extend level boundary |
| Gas Station | O(n) | O(1) | Reset candidate at fail |
| Candy | O(n) | O(n) | Two-pass with max |
| Non-overlapping | O(n log n) | O(1) | Earliest finish (keep) |

### Interview Checklist

- [ ] Can I state the greedy choice for each major problem without thinking?
- [ ] Can I sketch the exchange argument for activity selection?
- [ ] Do I know why fractional knapsack works but 0/1 knapsack doesn't?
- [ ] Do I know the coin change counterexample for greedy (coins {1,3,4}, target 6)?
- [ ] Can I implement Jump Game II in O(n) with two variables?
- [ ] Do I use `max` in the right-to-left pass of Candy?
- [ ] Do I sort by FINISH time (not start time) for activity selection?
- [ ] Can I explain "why greedy and not DP here?" in 3 sentences?

### Most Important Observations

1. **Greedy = make the locally optimal choice + prove it's globally optimal via exchange argument.** Without the proof, you're guessing.
2. **Sort is almost always step 1** in greedy algorithms. The sorting key encodes the greedy choice.
3. **Activity selection = sort by finish, pick non-overlapping.** Every interval scheduling problem reduces to this.
4. **Fractional knapsack works; 0/1 knapsack doesn't.** The difference: divisibility allows you to "fix" suboptimal choices.
5. **Jump Game II = implicit BFS.** Two variables replace the explicit BFS queue.
6. **Gas station: when you fail at i, restart from i+1.** Everything between start and i is disqualified.
7. **Min cost ropes = Huffman.** Always merge two smallest. Min-heap gives O(n log n).
8. **The hardest greedy question: "Why not DP?"** Have the answer ready before the interview.

---

*Chapter 12 — Greedy Algorithms | Part of DSA Interview Prep series*  
*Based on Striver's A2Z Sheet + Love Babbar lecture series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] Assign Cookies — https://leetcode.com/problems/assign-cookies/
- [ ] Fractional Knapsack — https://www.geeksforgeeks.org/problems/fractional-knapsack-1587115620/1
- [ ] Lemonade Change — https://leetcode.com/problems/lemonade-change/
- [ ] Valid Paranthesis Checker — https://leetcode.com/problems/valid-parenthesis-string/
- [ ] N meetings in one room — https://www.geeksforgeeks.org/problems/n-meetings-in-one-room-1587115620/1
- [ ] Jump Game - I — https://leetcode.com/problems/jump-game/
- [ ] Jump Game II — https://leetcode.com/problems/jump-game-ii/
- [ ] Minimum number of platforms required for a railway — https://www.geeksforgeeks.org/problems/minimum-number-of-platforms-required-for-a-railway4430/1
- [ ] Job sequencing Problem — https://www.geeksforgeeks.org/problems/job-sequencing-problem-1587115620/1
- [ ] Candy — https://leetcode.com/problems/candy/
- [ ] Shortest Job First — https://www.geeksforgeeks.org/problems/shortest-job-first/1
- [ ] LRU Page Replacement Algorithm — https://www.geeksforgeeks.org/problems/page-faults-in-lru5603/1
- [ ] Insert Interval — https://leetcode.com/problems/insert-interval/
- [ ] Merge Intervals — https://leetcode.com/problems/merge-intervals/
- [ ] Non-overlapping Intervals — https://leetcode.com/problems/non-overlapping-intervals/

