# Chapter 09 — Stack & Queue

> **Revision target:** 1 day  
> **Goal:** After reading this file, you need nothing else for this topic — no code files, no YouTube, no tutorials.

---

## Table of Contents

1. [Mental Model — Stack vs Queue vs Deque](#1-mental-model--stack-vs-queue-vs-deque)
2. [Stack Implementation — Array](#2-stack-implementation--array)
3. [Stack Implementation — Linked List](#3-stack-implementation--linked-list)
4. [Queue Implementation — Array](#4-queue-implementation--array)
5. [Circular Queue](#5-circular-queue)
6. [Deque (Double-Ended Queue)](#6-deque-double-ended-queue)
7. [STL Stack, Queue, Deque](#7-stl-stack-queue-deque)
8. [Monotonic Stack — The Interview Workhorse](#8-monotonic-stack--the-interview-workhorse)
9. [Next Greater / Smaller Element](#9-next-greater--smaller-element)
10. [Largest Rectangle in Histogram](#10-largest-rectangle-in-histogram)
11. [Min Stack — O(1) getMin](#11-min-stack--o1-getmin)
12. [Valid Parentheses & Variants](#12-valid-parentheses--variants)
13. [Sliding Window Maximum (Deque)](#13-sliding-window-maximum-deque)
14. [Queue using Two Stacks / Stack using Two Queues](#14-queue-using-two-stacks--stack-using-two-queues)
15. [Celebrity Problem](#15-celebrity-problem)
16. [Things Most People Forget](#16-things-most-people-forget)
17. [Practice Problems](#17-practice-problems)
18. [Final Revision Sheet](#18-final-revision-sheet)

---

## 1. Mental Model — Stack vs Queue vs Deque

Before anything else, nail the mental model:

```
Stack  — LIFO (Last In, First Out)
         Think: a pile of plates. You add and remove from the TOP only.
         push(x), pop(), top(), empty()

Queue  — FIFO (First In, First Out)
         Think: a line at a ticket counter. You add at BACK, remove from FRONT.
         push(x), pop(), front(), back(), empty()

Deque  — Double-ended. Push/pop from BOTH ends.
         push_front(x), push_back(x), pop_front(), pop_back(), front(), back()
```

### When does each appear in problems?

| Pattern | Use |
|---------|-----|
| Matching/balancing (parentheses, brackets) | Stack |
| Process in order of arrival | Queue |
| Undo/redo, backtracking, DFS | Stack |
| BFS, level-order traversal | Queue |
| NGE, histogram, spans | Monotonic Stack |
| Sliding window max/min | Deque (monotonic) |
| Min-stack, max-stack | Stack with auxiliary |
| Celebrity, stock span | Stack trick |

---

## 2. Stack Implementation — Array

```cpp
// From your stackImplementationArray.cpp:
class Stack {
public:
    int *arr;
    int top;
    int size;

    Stack(int size) {
        this->size = size;
        arr = new int[size];
        top = -1;       // empty stack: top = -1
    }

    void push(int element) {
        if (size - top > 1) {  // size - top > 1 means top < size-1
            top++;
            arr[top] = element;
        } else {
            cout << "Stack OverFlow" << endl;
        }
    }

    void pop() {
        if (top >= 0) {
            top--;          // don't clear arr[top] — just move the pointer
        } else {
            cout << "Stack UnderFlow" << endl;
        }
    }

    int peek() {
        if (top >= 0)
            return arr[top];
        else {
            cout << "Stack is Empty" << endl;
            return -1;
        }
    }

    bool isEmpty() {
        return top == -1;
    }
};
```

### Key design decisions — WHY these choices

**`top = -1` for empty:** When top = -1, `arr[top]` would be `arr[-1]` — invalid. So the isEmpty check `top == -1` correctly returns true before any valid access. The first push increments top to 0, so `arr[0]` gets the first element.

**`top < size - 1` for full (written as `size - top > 1`):** When `top = size - 1`, the array is full. Your code checks `size - top > 1` which is equivalent. Both forms are correct — just pick one and be consistent.

**Popping doesn't clear the array:** `top--` doesn't erase `arr[top]`. The "deleted" value still sits in memory but is logically gone because `top` no longer points to it. The next push will overwrite it.

**Time complexity:**
| Operation | Time | Space |
|-----------|------|-------|
| push | O(1) | — |
| pop | O(1) | — |
| peek/top | O(1) | — |
| isEmpty | O(1) | — |
| Overall space | — | O(n) |

---

## 3. Stack Implementation — Linked List

```cpp
// From your stackUsingll.cpp:
class Node {
public:
    int data;
    Node* next;
    Node(int data) {
        this->data = data;
        this->next = NULL;
    }
    ~Node() {
        if (this->next != NULL) this->next = NULL;
        // destructor — helps memory cleanup
    }
};

class Stack {
public:
    Node* head;     // head = top of stack

    Stack() { head = NULL; }

    void push(int value) {
        Node* newNode = new Node(value);
        newNode->next = head;    // new node points to current top
        head = newNode;          // new node becomes the new top
    }

    void pop() {
        if (head == NULL) {
            cout << "Stack Is Empty" << endl;
            return;
        }
        Node* nodeToDelete = head;
        head = head->next;       // move head to next node
        delete nodeToDelete;     // free memory
    }

    int top() {
        if (head == NULL) return -1;
        return head->data;
    }

    bool empty() { return head == NULL; }
};
```

### Why linked list for stack?

**Array-based:** Fixed size at construction. Overflow possible.  
**Linked list:** Dynamic size. No overflow (limited only by heap memory). But each node has overhead for the `next` pointer.

**Key insight from the code:** Push prepends to the linked list (add at head). Pop removes from head. This is O(1) for both because you're always touching the head — no traversal needed.

**Why prepend instead of append?** Because prepend = O(1). Appending would require traversal to the tail = O(n), unless you maintain a tail pointer. For a stack, prepend is the natural choice.

**Memory:** Each node = `sizeof(int) + sizeof(pointer)` = 4 + 8 = 12 bytes on 64-bit. Array-based uses contiguous 4-byte slots — better cache performance. Use array for performance, linked list when dynamic sizing matters.

---

## 4. Queue Implementation — Array

```cpp
// From your queueImplementation.cpp:
class Queue {
    int* arr;
    int qfront;    // index of front element
    int rear;      // index of next empty slot (one past last element)
    int size;

public:
    Queue() {
        size = 100001;
        arr = new int[size];
        qfront = 0;
        rear = 0;          // empty: front == rear
    }

    bool isEmpty() {
        return qfront == rear;   // front == rear means empty
    }

    void enqueue(int data) {
        if (rear == size)
            cout << "Queue is Full" << endl;
        else {
            arr[rear] = data;
            rear++;
        }
    }

    int dequeue() {
        if (qfront == rear) return -1;    // empty
        int ans = arr[qfront];
        arr[qfront] = -1;
        qfront++;
        if (qfront == rear) {   // queue became empty
            qfront = 0;
            rear = 0;           // reset to reuse space
        }
        return ans;
    }

    int front() {
        if (qfront == rear) return -1;
        return arr[qfront];
    }
};
```

### Design analysis

**Why `front == rear` means empty:** Both start at 0. When you enqueue, `rear` advances. When you dequeue, `front` advances. When they meet again, all elements have been consumed.

**The problem with this linear queue:** `qfront` keeps moving right. Eventually, `rear == size` even though the left side of the array is empty from dequeued elements. Space is wasted. This is why circular queues exist.

**Reset trick:** When the queue becomes empty after a dequeue (`qfront == rear`), reset both to 0. This reclaims all space but only works when the queue is fully empty.

---

## 5. Circular Queue

```cpp
// From your circularQueue.cpp:
class CircularQueue {
    int *arr;
    int front, rear, size;

public:
    CircularQueue(int n) {
        size = n;
        arr = new int[size];
        front = rear = -1;    // -1 = empty (different convention from linear queue)
    }

    bool enqueue(int value) {
        // Full check:
        if ((front == 0 && rear == size-1) || (rear == (front-1) % (size-1))) {
            return false;   // full
        }
        else if (front == -1) {
            front = rear = 0;   // first element
        }
        else if (rear == size-1 && front != 0) {
            rear = 0;           // wrap rear around
        }
        else {
            rear++;
        }
        arr[rear] = value;
        return true;
    }

    int dequeue() {
        if (front == -1) return -1;    // empty
        int ans = arr[front];
        arr[front] = -1;
        if (front == rear) {
            front = rear = -1;          // queue became empty
        }
        else if (front == size - 1) {
            front = 0;                  // wrap front around
        }
        else {
            front++;
        }
        return ans;
    }
};
```

### The circular trick

Instead of letting `rear` go off the end, wrap it: `rear = (rear + 1) % size`.

The modulo operation handles wrap-around automatically:
```
size = 5
rear goes: 0 → 1 → 2 → 3 → 4 → 0 → 1 → ... (wraps back)
front goes: 0 → 1 → 2 → ... (follows rear, wrapping when needed)
```

**Full condition:** `(rear + 1) % size == front`. The queue is full when rear is one step behind front (circular).

**Why leave one slot empty?** If you fill all `n` slots, `front == rear` — which looks like the empty condition! To distinguish full from empty, either leave one slot empty (capacity = n-1) or use a size counter.

**Simpler circular queue with `%`:**
```cpp
// Cleaner implementation using modulo:
bool enqueue(int value) {
    if ((rear + 1) % size == front) return false;   // full
    if (front == -1) front = 0;
    rear = (rear + 1) % size;
    arr[rear] = value;
    return true;
}
int dequeue() {
    if (front == -1) return -1;
    int ans = arr[front];
    if (front == rear) { front = rear = -1; }    // became empty
    else front = (front + 1) % size;
    return ans;
}
```

---

## 6. Deque (Double-Ended Queue)

```cpp
// From your deque.cpp:
class Deque {
    int *arr;
    int front, rear, size;

public:
    Deque(int n) {
        size = n;
        arr = new int[n];
        front = rear = -1;
    }

    bool pushFront(int x) {
        if (isFull()) return false;
        if (isEmpty()) { front = rear = 0; }
        else if (front == 0) front = size - 1;  // wrap front to end
        else front--;
        arr[front] = x;
        return true;
    }

    bool pushRear(int x) {
        if (isFull()) return false;
        if (isEmpty()) { front = rear = 0; }
        else if (rear == size - 1) rear = 0;    // wrap rear to start
        else rear++;
        arr[rear] = x;
        return true;
    }

    int popFront() {
        if (isEmpty()) return -1;
        int ans = arr[front];
        arr[front] = -1;
        if (front == rear) { front = rear = -1; }
        else if (front == size - 1) front = 0;  // wrap
        else front++;
        return ans;
    }

    int popRear() {
        if (isEmpty()) return -1;
        int ans = arr[rear];
        arr[rear] = -1;
        if (front == rear) { front = rear = -1; }
        else if (rear == 0) rear = size - 1;    // wrap
        else rear--;
        return ans;
    }

    bool isEmpty() { return front == -1; }
    bool isFull() {
        return (front == 0 && rear == size-1) ||
               (front != 0 && rear == (front-1) % (size-1));
    }
};
```

### The critical insight about Deque

Deque = Circular queue + ability to push/pop from both ends. The wrap-around logic for `front` is the opposite direction compared to `rear`:
- `pushFront`: decrement `front` (wraps backward: `front == 0` → `front = size-1`)
- `popFront`: increment `front` (wraps forward: `front == size-1` → `front = 0`)

**The STL `deque` is far more common in interviews.** You only need to implement Deque from scratch if explicitly asked. In practice, you use it for the monotonic deque pattern (Sliding Window Maximum).

---

## 7. STL Stack, Queue, Deque

```cpp
// Stack — LIFO
stack<int> st;
st.push(x);        // O(1)
st.top();          // peek at top — O(1)
st.pop();          // remove top, returns void! — O(1)
st.empty();        // O(1)
st.size();         // O(1)

// Queue — FIFO
queue<int> q;
q.push(x);         // enqueue at back — O(1)
q.front();         // peek front — O(1)
q.back();          // peek back — O(1)
q.pop();           // dequeue from front, returns void! — O(1)
q.empty();         // O(1)
q.size();          // O(1)

// Deque — double-ended
deque<int> dq;
dq.push_front(x);  // O(1)
dq.push_back(x);   // O(1)
dq.pop_front();    // O(1)
dq.pop_back();     // O(1)
dq.front();        // O(1)
dq.back();         // O(1)
dq[i];             // O(1) random access (unlike queue/stack)
```

**Critical trap:** `st.pop()` and `q.pop()` return `void`. They do NOT return the element. To get the top before popping:
```cpp
int val = st.top();   // save value
st.pop();             // then pop
// NOT: int val = st.pop();  ← compile error
```

---

## 8. Monotonic Stack — The Interview Workhorse

This is the most important advanced concept in this chapter. It is NOT in your implementation files — it must be understood from scratch.

### What is a monotonic stack?

A stack where elements are maintained in **monotonically increasing or decreasing order**. When a new element violates the order, you pop until the order is restored.

### Two types

**Monotonically Increasing Stack:** Elements in stack are always increasing from bottom to top.  
- New element: pop everything GREATER than it.
- Use for: **Next Smaller Element**, minimum in window.

**Monotonically Decreasing Stack:** Elements in stack are always decreasing from bottom to top.  
- New element: pop everything SMALLER than it.
- Use for: **Next Greater Element**, maximum in window, spans.

### The key insight

**When you pop an element from the stack, you've found a relationship.** Specifically:
- Popping `x` to push `y`: `y` is the **next smaller** (for increasing stack) or **next greater** (for decreasing stack) element for `x`.

This is what makes monotonic stack O(n): each element is pushed and popped exactly once — total O(n) operations across all iterations.

---

## 9. Next Greater / Smaller Element

### Next Greater Element (NGE) — from the right

**Problem:** For each element, find the next element to its right that is greater.

```cpp
// Monotonically Decreasing Stack (decreasing bottom→top)
// When we pop x to push y, y is the NGE of x

vector<int> nextGreater(vector<int>& arr) {
    int n = arr.size();
    vector<int> result(n, -1);  // default -1 if no NGE
    stack<int> st;              // stores INDICES

    for (int i = 0; i < n; i++) {
        // Pop all elements smaller than arr[i]
        // For each popped element, arr[i] is its NGE
        while (!st.empty() && arr[st.top()] < arr[i]) {
            result[st.top()] = arr[i];  // arr[i] is NGE for st.top()
            st.pop();
        }
        st.push(i);   // push current index
    }
    // Remaining elements in stack have no NGE (result stays -1)
    return result;
}

// Time: O(n) — each element pushed/popped once
// Space: O(n) — stack
```

**Trace through example:**
```
arr = [4, 5, 2, 10, 8]

i=0: stack empty, push 0.  stack: [0]         (arr[0]=4)
i=1: arr[1]=5 > arr[0]=4 → pop 0, result[0]=5. push 1. stack: [1]
i=2: arr[2]=2 < arr[1]=5 → push 2. stack: [1, 2]
i=3: arr[3]=10 > arr[2]=2 → pop 2, result[2]=10
     arr[3]=10 > arr[1]=5 → pop 1, result[1]=10
     push 3. stack: [3]
i=4: arr[4]=8 < arr[3]=10 → push 4. stack: [3, 4]

Remaining: indices 3,4 → result[3]=result[4]=-1

result = [5, 10, 10, -1, -1]
```

### Direction matters — which way to iterate?

**Standard NGE (next to right):** Iterate left to right, push on stack.  
**Previous Greater Element:** Iterate left to right but now when you push `i`, everything still in stack to the left is the answer. Or: iterate right to left.

```cpp
// Previous Greater Element
// (element to the left that is greater)
vector<int> prevGreater(vector<int>& arr) {
    int n = arr.size();
    vector<int> result(n, -1);
    stack<int> st;

    for (int i = 0; i < n; i++) {
        while (!st.empty() && arr[st.top()] <= arr[i])
            st.pop();
        result[i] = st.empty() ? -1 : arr[st.top()];  // current top is PGE for i
        st.push(i);
    }
    return result;
}
```

### Summary of 4 directional variants

| Problem | Stack type | Iterate | Pop condition |
|---------|-----------|---------|---------------|
| Next Greater (right) | Decreasing | L→R | while top < current |
| Previous Greater (left) | Decreasing | L→R | while top <= current; peek before push |
| Next Smaller (right) | Increasing | L→R | while top > current |
| Previous Smaller (left) | Increasing | L→R | while top >= current; peek before push |

**Memory trick:** 
- You want NGE → use decreasing stack (stack that keeps big elements → they'll be the "greater" for the popped small elements)
- You want NSE → use increasing stack (stack that keeps small elements → they'll be the "smaller" for the popped big elements)

---

## 10. Largest Rectangle in Histogram

This is the hardest monotonic stack problem. It appears in interviews frequently and has an elegant O(n) solution.

**Problem:** Given an array of bar heights, find the largest rectangle that fits entirely within the histogram.

```
heights = [2, 1, 5, 6, 2, 3]

      _
    _|6|
   |5|6|
   |5|6|  _
   |5|6|_|3|
  _|5|6|2|3|
_|2|5|6|2|3|
2 1 5 6 2 3

Largest rectangle: 5×2 = 10 (using heights 5 and 6)
```

### Monotonic Stack Solution

**Insight:** For each bar `i`, the largest rectangle using bar `i` as the shortest bar extends:
- Left until a bar shorter than `heights[i]`
- Right until a bar shorter than `heights[i]`

We need: **left boundary** (previous smaller element) and **right boundary** (next smaller element).

```cpp
int largestRectangleArea(vector<int>& heights) {
    int n = heights.size();
    stack<int> st;
    int maxArea = 0;

    for (int i = 0; i <= n; i++) {
        int currentHeight = (i == n) ? 0 : heights[i];  // sentinel 0 at end

        while (!st.empty() && heights[st.top()] > currentHeight) {
            int height = heights[st.top()];
            st.pop();
            int width = st.empty() ? i : (i - st.top() - 1);
            maxArea = max(maxArea, height * width);
        }
        st.push(i);
    }
    return maxArea;
}
// Time: O(n), Space: O(n)
```

**Why the sentinel works:** Appending a virtual bar of height 0 at position `n` forces all remaining elements to be popped from the stack at the end, computing their rectangle areas.

**How width is computed:**
- When we pop index `h` to process current index `i`:
  - Right boundary = `i` (the first bar shorter than `heights[h]`)
  - Left boundary = `st.top() + 1` after the pop (the previous shorter bar's index + 1)
  - Width = `i - st.top() - 1`
  - If stack is empty after pop: left boundary = 0, width = `i`

**Trace for [2, 1, 5, 6, 2, 3, 0] (with sentinel):**
```
i=0: push 0.  stack: [0]
i=1: h[1]=1 < h[0]=2 → pop 0. height=2, width=(1-empty→1)=1, area=2. push 1. stack:[1]
i=2: push 2. stack:[1,2]
i=3: push 3. stack:[1,2,3]
i=4: h[4]=2 < h[3]=6 → pop 3. height=6, width=4-2-1=1, area=6.
     h[4]=2 < h[2]=5 → pop 2. height=5, width=4-1-1=2, area=10. ← MAXIMUM
     push 4. stack:[1,4]
i=5: push 5. stack:[1,4,5]
i=6(sentinel=0): pop 5. height=3, width=6-4-1=1, area=3.
     pop 4. height=2, width=6-1-1=4, area=8.
     pop 1. height=1, width=6 (empty), area=6.

maxArea = 10
```

### Max Rectangle in Binary Matrix

Uses this solution on each row as a histogram:
```cpp
// For each row, compute histogram heights (0 if cell=0, else += previous)
// Apply largestRectangleArea to each row's histogram
```

---

## 11. Min Stack — O(1) getMin

**Problem:** Design a stack that supports `push`, `pop`, `top`, and `getMin` in O(1) time and O(1) extra space.

### Solution 1: Auxiliary Stack

Simple but uses O(n) extra space:

```cpp
class MinStack {
    stack<int> st;
    stack<int> minSt;   // parallel stack tracking minimums

public:
    void push(int val) {
        st.push(val);
        if (minSt.empty() || val <= minSt.top())
            minSt.push(val);   // only push if new minimum
    }

    void pop() {
        if (st.top() == minSt.top())
            minSt.pop();       // remove from min stack only if it was a minimum
        st.pop();
    }

    int top() { return st.top(); }
    int getMin() { return minSt.top(); }
};
```

**Why `<=` not `<`?** If you push 3, 3 again, then pop once — you want `minSt` to still have 3. If you used `<`, you'd only push one 3 into `minSt`, then popping the second 3 from `st` (which matches `minSt.top()`) would wrongly remove it.

### Solution 2: Encoding in a Single Stack — O(1) space

```cpp
// Encode modified value when pushing a new minimum
class MinStack {
    stack<long long> st;
    long long minVal;

public:
    MinStack() { minVal = LLONG_MAX; }

    void push(int val) {
        if (st.empty()) {
            st.push(val);
            minVal = val;
        } else if (val < minVal) {
            // Push encoded value: 2*val - minVal
            // This is always < minVal, so we can detect it later
            st.push(2LL * val - minVal);
            minVal = val;
        } else {
            st.push(val);
        }
    }

    void pop() {
        if (st.top() < minVal) {
            // Encoded value — restore previous minimum
            minVal = 2 * minVal - st.top();
        }
        st.pop();
    }

    int top() {
        if (st.top() < minVal)
            return minVal;     // encoded → real top is current minVal
        return st.top();
    }

    int getMin() { return minVal; }
};
```

**Why this works:** When pushing a new min `v` with previous min `m`, we store `2v - m`. Since `v < m`, `2v - m < v < m` — the stored value is less than the current minimum, acting as a signal. On pop, if `st.top() < minVal`, we know it was a min-encoding, and we recover `prevMin = 2*minVal - st.top()`.

**Note:** Use `long long` to avoid overflow in `2*val - minVal` computation.

---

## 12. Valid Parentheses & Variants

### Basic Valid Parentheses

**Problem:** Given a string of `()[]{}`, determine if it's valid.

```cpp
bool isValid(string s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') {
            st.push(c);
        } else {
            if (st.empty()) return false;   // no matching open bracket
            char top = st.top();
            st.pop();
            if (c == ')' && top != '(') return false;
            if (c == ']' && top != '[') return false;
            if (c == '}' && top != '{') return false;
        }
    }
    return st.empty();   // must be empty — all brackets matched
}
```

**The two failure conditions:**
1. We see a closing bracket but stack is empty (unmatched closing)
2. The closing bracket doesn't match the most recent open bracket (mismatch)
3. At the end, stack is not empty (unmatched opening brackets)

**Pattern:** Matching/balancing problems always use a stack. The "most recent unmatched open" is maintained by the stack.

### Redundant Brackets

**Problem:** Check if any sub-expression is unnecessarily bracketed, e.g., `((a+b))` or `(a)`.

```cpp
bool hasRedundant(string s) {
    stack<char> st;
    for (char c : s) {
        if (c != ')') {
            st.push(c);
        } else {
            bool hasOp = false;
            while (st.top() != '(') {
                if (st.top() == '+' || st.top() == '-' ||
                    st.top() == '*' || st.top() == '/')
                    hasOp = true;
                st.pop();
            }
            st.pop();   // remove the '('
            if (!hasOp) return true;   // brackets with no operator inside = redundant
        }
    }
    return false;
}
```

### Minimum Bracket Reversals

**Problem:** Minimum reversals to make a bracket string balanced.  
**Key insight:** Only `}{` patterns need reversal. After canceling all matched pairs:
- Remaining form: `}...}{...{` (some unmatched `}` followed by unmatched `{`)
- Count of unmatched `}` = a, count of unmatched `{` = b
- Answer = `ceil(a/2) + ceil(b/2)`

---

## 13. Sliding Window Maximum (Deque)

**Problem:** Given array `arr` and window size `k`, find the maximum in every window of size `k`.

This is NOT in your implementation files but is a critical interview problem.

### Monotonic Deque Solution

**Idea:** Maintain a deque of indices such that `arr[deque.front()]` is always the maximum of the current window. The deque is **decreasing** (front = max).

```cpp
vector<int> slidingWindowMax(vector<int>& arr, int k) {
    int n = arr.size();
    deque<int> dq;      // stores INDICES, front = index of current window max
    vector<int> result;

    for (int i = 0; i < n; i++) {
        // 1. Remove indices outside the current window
        while (!dq.empty() && dq.front() < i - k + 1)
            dq.pop_front();

        // 2. Remove from back all indices whose values < arr[i]
        //    (they can never be the maximum when arr[i] is in the window)
        while (!dq.empty() && arr[dq.back()] < arr[i])
            dq.pop_back();

        // 3. Add current index
        dq.push_back(i);

        // 4. Record result once window is fully formed
        if (i >= k - 1)
            result.push_back(arr[dq.front()]);
    }
    return result;
}

// Time: O(n) — each element pushed/popped at most once
// Space: O(k) — deque never holds more than k elements
```

**Why O(n)?** Each element is added to the deque exactly once and removed at most once. Total operations = 2n.

**Trace for arr = [1, 3, -1, -3, 5, 3, 6, 7], k = 3:**
```
i=0: dq=[0]          (val=1)
i=1: 3>1, pop 0, dq=[1]    (val=3)
i=2: -1<3, dq=[1,2]        (val=-1)
     i>=k-1: result=[3]
i=3: -3<-1, dq=[1,2,3]     (val=-3)
     i>=k-1: result=[3,3]
i=4: 5>-3 pop 3, 5>-1 pop 2, 5>3 pop 1, dq=[4]
     i>=k-1: result=[3,3,5]
i=5: 3<5, dq=[4,5]
     i>=k-1: result=[3,3,5,5]
i=6: 6>3 pop 5, 6>5 pop 4, dq=[6]
     i>=k-1: result=[3,3,5,5,6]
i=7: 7>6 pop 6, dq=[7]
     i>=k-1: result=[3,3,5,5,6,7]
```

### Connection to "Sliding Window Minimum"

Same algorithm but flip the comparison: maintain an **increasing** deque (front = minimum). Change `arr[dq.back()] < arr[i]` to `arr[dq.back()] > arr[i]`.

---

## 14. Queue using Two Stacks / Stack using Two Queues

These are classic "interview favorite" design problems.

### Queue using Two Stacks

**Idea:** One stack for pushing (inbox), one for popping (outbox). When outbox is empty and you need to pop, transfer everything from inbox to outbox (reverses order = FIFO).

```cpp
class MyQueue {
    stack<int> inbox, outbox;

    void transfer() {
        if (outbox.empty()) {
            while (!inbox.empty()) {
                outbox.push(inbox.top());
                inbox.pop();
            }
        }
    }

public:
    void push(int val) { inbox.push(val); }

    int pop() {
        transfer();
        int val = outbox.top();
        outbox.pop();
        return val;
    }

    int peek() {
        transfer();
        return outbox.top();
    }

    bool empty() { return inbox.empty() && outbox.empty(); }
};
// Amortized O(1) per operation — each element moves at most twice total
```

**Amortized O(1) explanation:** Each element is pushed once into inbox, transferred once to outbox, and popped once from outbox. Total = 3 operations per element. Average = O(1) per operation.

### Stack using Two Queues

**Approach 1 — costly push:**
```cpp
// Push: enqueue to q2, enqueue all of q1 to q2, swap q1 and q2.
// Pop: dequeue from q1.
// Time: O(n) push, O(1) pop
```

**Approach 2 — costly pop:**
```cpp
// Push: enqueue to q1.
// Pop: dequeue all except last element from q1 to q2, return last, swap.
// Time: O(1) push, O(n) pop
```

```cpp
// Approach 1 — Costly Push (O(n) push, O(1) pop):
class MyStack {
    queue<int> q1, q2;

public:
    void push(int x) {
        q2.push(x);
        while (!q1.empty()) {
            q2.push(q1.front());
            q1.pop();
        }
        swap(q1, q2);   // now q1 has elements in stack order
    }

    int pop() {
        int val = q1.front();
        q1.pop();
        return val;
    }

    int top() { return q1.front(); }
    bool empty() { return q1.empty(); }
};
```

---

## 15. Celebrity Problem

**Problem:** Among `n` people, a celebrity knows nobody but everybody knows the celebrity. Find the celebrity or return -1. You're given function `knows(a, b)` which returns true if `a` knows `b`.

**Brute force:** O(n²) — check all pairs.

### Stack-based O(n) solution

```cpp
int findCelebrity(int n) {
    stack<int> st;
    for (int i = 0; i < n; i++) st.push(i);

    // Eliminate candidates
    while (st.size() > 1) {
        int a = st.top(); st.pop();
        int b = st.top(); st.pop();

        if (knows(a, b)) {
            st.push(b);   // a knows b → a is NOT celebrity, b might be
        } else {
            st.push(a);   // a doesn't know b → b is NOT celebrity, a might be
        }
    }

    int candidate = st.top();

    // Verify the candidate
    for (int i = 0; i < n; i++) {
        if (i != candidate) {
            if (knows(candidate, i) || !knows(i, candidate))
                return -1;   // candidate knows someone, or someone doesn't know candidate
        }
    }
    return candidate;
}
// Time: O(n), Space: O(n)
```

**Why elimination works:** In each step, one person is eliminated:
- If `a` knows `b`: `a` cannot be celebrity (celebrities know nobody). Eliminate `a`.
- If `a` doesn't know `b`: `b` cannot be celebrity (everyone must know celebrity). Eliminate `b`.

After n-1 comparisons, one candidate remains. Verify in O(n).

**Two-pointer variant (O(n) without stack):**
```cpp
int candidate = 0;
for (int i = 1; i < n; i++) {
    if (knows(candidate, i)) candidate = i;
}
// Verify candidate
```

---

## 16. Things Most People Forget

### 1. `stack::pop()` returns void — always save top first

```cpp
// BUG:
int val = st.pop();    // compile error — pop() returns void

// CORRECT:
int val = st.top();
st.pop();
```

### 2. Monotonic stack direction — the most commonly confused thing

```cpp
// For NEXT GREATER: use DECREASING stack
// → Pop when arr[top] < current (smaller elements get popped, current becomes their NGE)
// For NEXT SMALLER: use INCREASING stack
// → Pop when arr[top] > current (larger elements get popped, current becomes their NSE)

// Mnemonic: "The element that causes the pop IS the answer for the popped element"
```

### 3. Histogram width formula after popping

```cpp
// When popping index h at step i:
// If stack is empty: width = i  (extends to the left edge)
// If stack is not empty: width = i - st.top() - 1  (between prev smaller and current smaller)

// Missing the "-1" is the most common bug in histogram problems
int width = st.empty() ? i : (i - st.top() - 1);
```

### 4. Min-stack auxiliary stack needs `<=` not `<`

```cpp
// If you push duplicate minimums:
// push(3), push(2), push(2)
// minSt with `<`:  [3, 2]    ← only one 2
// pop 2 from st: st.top()==minSt.top() → pop from minSt → minSt=[3], WRONG (min should be 2)

// minSt with `<=`: [3, 2, 2] ← both 2s
// pop 2 from st: minSt has 2 → pop it → minSt=[3,2], CORRECT (min is still 2)
```

### 5. Sliding window max: remove expired indices from FRONT, remove smaller from BACK

```cpp
// Step 1: pop_front if dq.front() < i - k + 1   (out of window)
// Step 2: pop_back if arr[dq.back()] < arr[i]    (can never be max)
// Step 3: push_back(i)
// Missing step 1 → stale maximum from previous windows
// Missing step 2 → deque won't maintain decreasing property
```

### 6. Circular queue full vs empty — the off-by-one

```cpp
// Empty: front == rear (or front == -1)
// Full: (rear + 1) % size == front
// The one wasted slot is necessary — otherwise full looks like empty
```

### 7. Celebrity verification after stack elimination

```cpp
// Always verify after finding candidate!
// The stack elimination phase only finds the POTENTIAL candidate.
// Final O(n) verification is mandatory.
for (int i = 0; i < n; i++) {
    if (i == candidate) continue;
    if (knows(candidate, i) || !knows(i, candidate)) return -1;
}
```

### 8. Queue-using-two-stacks: transfer only when outbox is empty

```cpp
// WRONG: transfer every time you call pop()
// → Elements already in outbox get re-reversed → wrong order

// CORRECT: transfer only when outbox is empty
void transfer() {
    if (outbox.empty()) {   // ← this check is critical
        while (!inbox.empty()) { ... }
    }
}
```

### 9. Monotonic stack stores INDICES, not values

```cpp
// Store indices → you can compute both values AND widths
// Storing values → you lose position information (needed for histogram width)
stack<int> st;   // stores indices
// Access value: arr[st.top()]
// Access width: i - st.top() - 1
```

### 10. Valid parentheses: check empty stack before accessing top

```cpp
// BUG:
char top = st.top();   // crash if stack is empty
st.pop();

// CORRECT:
if (st.empty()) return false;
char top = st.top();
st.pop();
```

---

## 18. Final Revision Sheet

### Core Templates

```cpp
// 1. NGE — Next Greater Element
vector<int> nge(vector<int>& arr) {
    int n = arr.size();
    vector<int> res(n, -1);
    stack<int> st;
    for (int i = 0; i < n; i++) {
        while (!st.empty() && arr[st.top()] < arr[i]) {
            res[st.top()] = arr[i];
            st.pop();
        }
        st.push(i);
    }
    return res;
}

// 2. NSE — Next Smaller Element
vector<int> nse(vector<int>& arr) {
    int n = arr.size();
    vector<int> res(n, -1);
    stack<int> st;
    for (int i = 0; i < n; i++) {
        while (!st.empty() && arr[st.top()] > arr[i]) {
            res[st.top()] = arr[i];
            st.pop();
        }
        st.push(i);
    }
    return res;
}

// 3. Largest Rectangle in Histogram
int largestRect(vector<int>& h) {
    int n = h.size(), maxArea = 0;
    stack<int> st;
    for (int i = 0; i <= n; i++) {
        int cur = (i == n) ? 0 : h[i];
        while (!st.empty() && h[st.top()] > cur) {
            int ht = h[st.top()]; st.pop();
            int w = st.empty() ? i : i - st.top() - 1;
            maxArea = max(maxArea, ht * w);
        }
        st.push(i);
    }
    return maxArea;
}

// 4. Min Stack (auxiliary stack)
class MinStack {
    stack<int> st, minSt;
public:
    void push(int v) {
        st.push(v);
        if (minSt.empty() || v <= minSt.top()) minSt.push(v);
    }
    void pop() {
        if (st.top() == minSt.top()) minSt.pop();
        st.pop();
    }
    int top() { return st.top(); }
    int getMin() { return minSt.top(); }
};

// 5. Sliding Window Maximum
vector<int> slideMax(vector<int>& arr, int k) {
    deque<int> dq;
    vector<int> res;
    for (int i = 0; i < arr.size(); i++) {
        while (!dq.empty() && dq.front() < i - k + 1) dq.pop_front();
        while (!dq.empty() && arr[dq.back()] < arr[i]) dq.pop_back();
        dq.push_back(i);
        if (i >= k - 1) res.push_back(arr[dq.front()]);
    }
    return res;
}

// 6. Valid Parentheses
bool isValid(string s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') { st.push(c); continue; }
        if (st.empty()) return false;
        char t = st.top(); st.pop();
        if ((c==')' && t!='(') || (c==']' && t!='[') || (c=='}' && t!='{')) return false;
    }
    return st.empty();
}

// 7. Queue using Two Stacks
class MyQueue {
    stack<int> in, out;
    void flush() { if (out.empty()) while (!in.empty()) { out.push(in.top()); in.pop(); } }
public:
    void push(int v) { in.push(v); }
    int pop() { flush(); int v = out.top(); out.pop(); return v; }
    int peek() { flush(); return out.top(); }
    bool empty() { return in.empty() && out.empty(); }
};
```

### Complexity Table

| Operation | Time | Notes |
|-----------|------|-------|
| Stack push/pop/top | O(1) | — |
| Queue enqueue/dequeue/front | O(1) | — |
| NGE / NSE | O(n) | Each element pushed/popped once |
| Largest Rect Histogram | O(n) | Monotonic stack with sentinel |
| Min Stack push/pop/getMin | O(1) | Auxiliary stack or encoding |
| Sliding Window Max | O(n) | Monotonic deque |
| Queue from 2 Stacks | O(1) amortized | Each element transferred once |
| Celebrity Problem | O(n) | Elimination + verification |
| Valid Parentheses | O(n) | Single pass |

### When to Use Which Stack Pattern

```
NGE/NSE          → Monotonic stack, store indices
Histogram area   → Increasing monotonic stack + sentinel
Min/Max in stack → Auxiliary tracking stack (or encoding trick)
Window max/min   → Monotonic deque, remove expired from front
Matching pairs   → Basic stack, push open / pop on close
Celebrity        → Stack for elimination, verify the survivor
```

### Interview Checklist

- [ ] Do I save `st.top()` before calling `st.pop()`?
- [ ] For NGE: do I use decreasing stack (pop when top < current)?
- [ ] For NSE: do I use increasing stack (pop when top > current)?
- [ ] For histogram: do I use `i - st.top() - 1` for width?
- [ ] Do I append a sentinel 0 for histogram to flush remaining?
- [ ] For min-stack with `<=` to handle duplicates?
- [ ] For sliding window max: step 1 = remove expired from front, step 2 = remove smaller from back?
- [ ] For queue from stacks: transfer only when outbox is empty?
- [ ] For celebrity: do I always verify the candidate after stack elimination?
- [ ] Do I check `st.empty()` before calling `st.top()`?

---

*Chapter 09 — Stack & Queue | Part of DSA Interview Prep series*  
*Based on Love Babbar lecture series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] Implement Stack using Arrays — https://www.geeksforgeeks.org/problems/implement-stack-using-array/1
- [ ] Implement Queue using Arrays — https://www.geeksforgeeks.org/problems/implement-queue-using-array/1
- [ ] Implement Stack using Queue — https://leetcode.com/problems/implement-stack-using-queues/
- [ ] Implement Queue using Stack — https://leetcode.com/problems/implement-queue-using-stacks/
- [ ] Implement Stack using Linked List — https://www.geeksforgeeks.org/problems/implement-stack-using-linked-list/1
- [ ] Implement Queue using Linked List — https://www.geeksforgeeks.org/problems/implement-queue-using-linked-list/1
- [ ] Balanced Parentheses — https://leetcode.com/problems/valid-parentheses/
- [ ] Implement Min Stack — https://leetcode.com/problems/min-stack/
- [ ] Infix to Postfix Conversion — https://www.geeksforgeeks.org/problems/infix-to-postfix/1
- [ ] Prefix to Infix Conversion — https://www.geeksforgeeks.org/problems/prefix-to-infix-conversion/1
- [ ] Prefix to Postfix Conversion — https://www.geeksforgeeks.org/problems/prefix-to-postfix-conversion/1
- [ ] Postfix to Prefix Conversion — https://www.geeksforgeeks.org/problems/postfix-to-prefix-conversion/1
- [ ] Postfix to Infix Conversion — https://www.geeksforgeeks.org/problems/postfix-to-infix-conversion/1
- [ ] Infix to Prefix Conversion — https://www.geeksforgeeks.org/problems/infix-to-prefix-conversion/1
- [ ] Next Greater Element — https://leetcode.com/problems/next-greater-element-i/
- [ ] Next Greater Element - 2 — https://leetcode.com/problems/next-greater-element-ii/
- [ ] Next Smaller Element — https://www.geeksforgeeks.org/problems/next-smaller-element/1
- [ ] Number of Greater Elements to the Right — https://www.geeksforgeeks.org/problems/number-of-nges-to-the-right/1
- [ ] Trapping Rainwater — https://leetcode.com/problems/trapping-rain-water/
- [ ] Sum of Subarray Minimums — https://leetcode.com/problems/sum-of-subarray-minimums/
- [ ] Asteroid Collision — https://leetcode.com/problems/asteroid-collision/
- [ ] Sum of Subarray Ranges — https://leetcode.com/problems/sum-of-subarray-ranges/
- [ ] Remove K Digits — https://leetcode.com/problems/remove-k-digits/
- [ ] Largest rectangle in a histogram — https://leetcode.com/problems/largest-rectangle-in-histogram/
- [ ] Maximum Rectangles (Maximal Rectangle) — https://leetcode.com/problems/maximal-rectangle/
- [ ] Sliding Window Maximum — https://leetcode.com/problems/sliding-window-maximum/
- [ ] Stock span problem — https://leetcode.com/problems/online-stock-span/
- [ ] Celebrity Problem — https://www.geeksforgeeks.org/problems/the-celebrity-problem/1
- [ ] LRU Cache — https://leetcode.com/problems/lru-cache/
- [ ] LFU Cache — https://leetcode.com/problems/lfu-cache/
- [ ] Delete Middle Element in Stack — https://www.geeksforgeeks.org/problems/delete-middle-element-of-a-stack/1
- [ ] Insert at Bottom of Stack — https://www.geeksforgeeks.org/problems/insert-an-element-at-the-bottom-of-a-stack/1
- [ ] Reverse a Stack using recursion — https://www.geeksforgeeks.org/problems/reverse-a-stack/1
- [ ] Sort a Stack using recursion — https://www.geeksforgeeks.org/problems/sort-a-stack/1
- [ ] Redundant Brackets — https://www.geeksforgeeks.org/problems/e015cb4d3f354b035d9665e7c8a54a7aefb1901b/1
- [ ] Minimum bracket Reversals — https://www.geeksforgeeks.org/problems/minimum-bracket-reversals/1
- [ ] N Stacks in an Array — https://www.geeksforgeeks.org/problems/n-stacks-in-an-array/1
- [ ] Queue Reversal — https://www.geeksforgeeks.org/problems/queue-reversal/1
- [ ] First Negative Integer in Every Window of Size K — https://www.geeksforgeeks.org/problems/first-negative-integer-in-every-window-of-size-k3345/1
- [ ] Reverse First K Elements of Queue — https://www.geeksforgeeks.org/problems/reverse-first-k-elements-of-queue/1
- [ ] First Non-Repeating Character in Stream — https://www.geeksforgeeks.org/problems/first-non-repeating-character-in-a-stream1216/1
- [ ] Circular Tour — https://www.geeksforgeeks.org/problems/circular-tour-1587115620/1
- [ ] Interleave First and Second Half of Queue — https://www.geeksforgeeks.org/problems/interleave-the-first-half-of-the-queue-with-second-half/1
- [ ] Sum of min & max of all subarrays of size K — https://www.geeksforgeeks.org/problems/sum-of-minimum-and-maximum-elements-of-all-subarrays-of-size-k/1

