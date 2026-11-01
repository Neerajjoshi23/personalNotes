# Chapter 06 — Linked List

> **Revision target:** 1 day  
> **Goal:** After reading this file, you need nothing else for this topic — no code files, no YouTube, no tutorials.

---

## Table of Contents

1. [Node Structure & Core Concepts](#1-node-structure--core-concepts)
2. [Singly Linked List — Your Code Analysis](#2-singly-linked-list--your-code-analysis)
3. [Doubly Linked List — Your Code Analysis](#3-doubly-linked-list--your-code-analysis)
4. [Circular Linked List — Your Code Analysis](#4-circular-linked-list--your-code-analysis)
5. [Reversal — Iterative & Recursive (Missing, Written Here)](#5-reversal--iterative--recursive)
6. [Finding Middle Node](#6-finding-middle-node)
7. [Floyd's Cycle Detection — Deep Dive](#7-floyds-cycle-detection--deep-dive)
8. [Merge Two Sorted Lists](#8-merge-two-sorted-lists)
9. [Reverse in K Groups](#9-reverse-in-k-groups)
10. [Clone List with Random Pointer](#10-clone-list-with-random-pointer)
11. [Flatten a Linked List](#11-flatten-a-linked-list)
12. [LRU Cache](#12-lru-cache)
13. [Things Most People Forget](#13-things-most-people-forget)
14. [Practice Problems](#14-practice-problems)
15. [Final Revision Sheet](#15-final-revision-sheet)

---

## 1. Node Structure & Core Concepts

### The fundamental building block

```cpp
class Node {
public:
    int data;
    Node* next;

    Node(int d) {
        this->data = d;
        this->next = NULL;
    }
};
```

**Why `this->` syntax?** When the constructor parameter name matches the member name, `this->data` explicitly refers to the member variable, disambiguating it from the parameter. It's a style choice — functionally identical to renaming the parameter to something else.

### Linked list vs array — the core trade-off

| | Array | Linked List |
|--|-------|-------------|
| Access by index | O(1) | O(n) — must traverse |
| Insert at head | O(n) — shift | O(1) |
| Insert at tail (with tail ptr) | O(1) amortized | O(1) |
| Insert at middle (after finding node) | O(n) | O(1) |
| Delete arbitrary node | O(n) | O(1) if you have the node |
| Memory | Contiguous — cache-friendly | Scattered — pointer chasing |
| Size | Fixed (or O(n) resize) | Dynamic |

**When interviewers ask "why linked list?":** Frequent insertions/deletions at arbitrary positions without shifting. When size isn't known upfront. When you need O(1) insert at front (stack, queue with deque).

### The two critical pointers

Most singly linked list operations need just `head`. But for efficient operations:
- `head` — where the list starts
- `tail` — where the list ends (avoids O(n) traversal for append)

Both are passed by reference `Node* &head` so functions can update the pointer itself (not just the node data).

---

## 2. Singly Linked List — Your Code Analysis

### Insert at Head

```cpp
void insertAtHead(Node* &head, int d) {
    Node* temp = new Node(d);
    temp->next = head;    // new node points to current head
    head = temp;          // head now points to new node
}
```

**Two-step order matters:** You MUST set `temp->next = head` BEFORE `head = temp`. If you do it in reverse, you lose the reference to the old list — `head` now points to the new node, and you can never reach the old nodes.

**Complexity:** O(1)

### Insert at Tail

```cpp
void insertAtTail(Node* &tail, int d) {
    Node* temp = new Node(d);
    tail->next = temp;   // current last node points to new node
    tail = temp;         // update tail to new last node
}
```

**Why pass tail by reference:** We're modifying which node `tail` points to. Without `&`, the update to `tail` inside the function wouldn't affect the `tail` in main.

**The precondition trap:** This function assumes the list is non-empty (tail != NULL). Always handle the empty list case — either in the insert function or before calling it.

### Insert at Position

```cpp
void insertAtPosition(Node* &tail, Node* &head, int position, int d) {
    if(position == 1) {
        insertAtHead(head, d);
        return;
    }
    Node* temp = head;
    int cnt = 1;
    while(cnt < position-1) {    // stop ONE node BEFORE insertion point
        temp = temp->next;
        cnt++;
    }
    if(temp->next == NULL) {     // inserting at end
        insertAtTail(tail, d);
        return;
    }
    Node* nodeToInsert = new Node(d);
    nodeToInsert->next = temp->next;
    temp->next = nodeToInsert;
}
```

**Why `position-1`:** You need to be AT the node before the insertion point so you can set `nodeToInsert->next = temp->next` and `temp->next = nodeToInsert`. If you walk to `position`, you've lost the reference to the previous node.

**The three-line pointer update order:**
```
Step 1: nodeToInsert->next = temp->next    // new node points forward
Step 2: temp->next = nodeToInsert          // previous node points to new node
```
NEVER do step 2 first — you'd lose the connection to everything after `temp`.

### Delete Node

```cpp
void deleteNode(int position, Node* &head) {
    if(position == 1) {
        Node* temp = head;
        head = head->next;    // head moves to next
        temp->next = NULL;    // isolate deleted node
        delete temp;          // free memory
        return;
    }
    Node* curr = head;
    int cnt = 1;
    while(cnt < position-1) {
        curr = curr->next;
        cnt++;
    }
    Node* nodeToDelete = curr->next;
    curr->next = curr->next->next;  // bypass the node
    nodeToDelete->next = NULL;
    delete nodeToDelete;
}
```

**Why set `nodeToDelete->next = NULL` before delete?** The destructor in your code checks `if(this->next != NULL)` — this avoids a chain reaction where deleting one node triggers deleting the next. Setting `next = NULL` first ensures clean, isolated deletion.

**The `temp->next = NULL` for head deletion:** Same reason — before calling `delete temp`, disconnect it from the rest of the list.

### Floyd's Cycle Detection — Implementation

```cpp
Node* floydDetectLoop(Node* head) {
    if(head == NULL) return NULL;
    
    Node* slow = head;
    Node* fast = head;
    
    while(slow != NULL && fast != NULL) {
        fast = fast->next;
        if(fast != NULL) fast = fast->next;
        slow = slow->next;
        
        if(slow == fast) {
            cout << "cycle detected at: " << slow->data << endl;
            return slow;  // return meeting point
        }
    }
    return NULL;  // no cycle
}
```

**Why the loop condition is `slow != NULL && fast != NULL`:** In a cycle-free list, `fast` will reach NULL first. The inner `if(fast != NULL)` guard before the second `fast = fast->next` prevents null pointer dereference.

### Finding Cycle Start — getStartingNode

```cpp
Node* getStartingNode(Node* head) {
    Node* intersection = floydDetectLoop(head);
    Node* slow = head;
    
    while(slow != intersection) {
        slow = slow->next;
        intersection = intersection->next;
    }
    return slow;  // cycle start
}
```

**Why does this work?** Mathematical proof:
- Let `F` = distance from head to cycle start
- Let `C` = cycle length
- Let `a` = distance from cycle start to meeting point

When they meet: slow traveled `F + a`, fast traveled `F + a + kC` (for some k ≥ 1).
Since fast travels 2× slow: `2(F + a) = F + a + kC`
→ `F + a = kC`
→ `F = kC - a = (k-1)C + (C - a)`

So `F` = some multiple of cycle length + `(C - a)`. 
`(C - a)` is the distance from the meeting point to the cycle start (going forward in the cycle).

**Result:** Starting one pointer from `head` and one from the meeting point, both moving at the same speed, they meet exactly at the cycle start.

### Remove Loop

```cpp
void removeLoop(Node* head) {
    Node* startOfLoop = getStartingNode(head);
    Node* temp = startOfLoop;
    
    while(temp->next != startOfLoop) {   // find the node just before cycle start
        temp = temp->next;
    }
    temp->next = NULL;   // break the cycle
}
```

**The pattern:** Find where the cycle starts, then find the node whose `next` points back to the start, set it to NULL.

---

## 3. Doubly Linked List — Your Code Analysis

```cpp
class Node {
public:
    int data;
    Node* prev;    // backward link — this is what makes it doubly linked
    Node* next;
    
    Node(int d) {
        this->data = d;
        this->prev = NULL;
        this->next = NULL;
    }
};
```

### Insert at Head (doubly linked)

```cpp
void insertAtHead(Node* &tail, Node* &head, int d) {
    if(head == NULL) {
        Node* temp = new Node(d);
        head = temp;
        tail = temp;
        return;
    }
    Node* temp = new Node(d);
    temp->next = head;
    head->prev = temp;    // CRITICAL: old head's prev must point back to new head
    head = temp;
}
```

**Four pointer updates for insert in DLL:**
1. `newNode->next = curr->next` (or head)
2. `newNode->prev = curr`
3. `curr->next->prev = newNode` (the node after must point back)
4. `curr->next = newNode`

Missing any of these breaks either forward or backward traversal.

### Insert at Position (doubly linked) — the four-pointer update

```cpp
Node* nodeToInsert = new Node(d);
nodeToInsert->next = temp->next;       // 1. new → next node
temp->next->prev = nodeToInsert;       // 2. next node ← new
temp->next = nodeToInsert;             // 3. prev node → new
nodeToInsert->prev = temp;             // 4. new ← prev node
```

**Order matters:** Do step 1 and 2 BEFORE step 3. If you do step 3 first, `temp->next` already points to `nodeToInsert`, so `temp->next->prev` now refers back to `nodeToInsert->prev` — wrong node.

### Delete from DLL

```cpp
// Deleting curr from middle/end
if(curr->next == NULL) {     // tail node
    tail = prev;
    prev->next = NULL;
    curr->prev = NULL;
} else {                     // middle node
    prev->next = curr->next;
    curr->next->prev = prev;
    curr->next = NULL;
    curr->prev = NULL;
}
delete curr;
```

**Always set both `curr->next = NULL` and `curr->prev = NULL`** before deleting. This isolates the node and prevents the destructor from following pointers to live nodes.

### DLL vs SLL — when to use DLL

| Use DLL when | Because |
|---|---|
| Need to traverse backward | SLL only has forward traversal |
| Frequent deletion of arbitrary nodes | SLL requires tracking previous node separately |
| LRU Cache (most common interview use) | O(1) delete requires knowing previous node |
| Browser history (back + forward) | Bidirectional navigation |

---

## 4. Circular Linked List — Your Code Analysis

**Key property:** The last node's `next` points back to the first node (or the tail node itself for circular). No NULL anywhere.

### Your code uses tail-based circular list

```cpp
// Circular list: tail->next points back to head (first node)
// Your code stores only tail (not head)
// head = tail->next (always)
```

### Insert in Circular List

```cpp
void insertNode(Node* &tail, int element, int d) {
    if(tail == NULL) {
        Node* newNode = new Node(d);
        tail = newNode;
        newNode->next = newNode;    // points to itself — circular!
        return;
    }
    // Find element to insert after
    Node* curr = tail;
    while(curr->data != element) {
        curr = curr->next;
    }
    Node* temp = new Node(d);
    temp->next = curr->next;
    curr->next = temp;
}
```

**The single-node case:** `newNode->next = newNode` — the node points to itself. This maintains the circular invariant for a list with one element.

### Print Circular List — do-while is natural

```cpp
void print(Node* tail) {
    if(tail == NULL) { cout << "Empty"; return; }
    Node* temp = tail;
    do {
        cout << tail->data << " ";
        tail = tail->next;
    } while(tail != temp);    // stop when we've gone full circle
}
```

**Why `do-while` instead of `while`:** If we used `while(tail != temp)`, we'd never enter the loop because we started at `temp`. `do-while` executes the body at least once.

### Delete from Circular List

```cpp
void deleteNode(Node* &tail, int value) {
    Node* prev = tail;
    Node* curr = prev->next;
    
    while(curr->data != value) {
        prev = curr;
        curr = curr->next;
    }
    
    prev->next = curr->next;    // bypass curr
    
    if(curr == prev) {          // only one node
        tail = NULL;
    } else if(tail == curr) {   // deleting tail
        tail = prev;
    }
    
    curr->next = NULL;
    delete curr;
}
```

**The two special cases:**
1. Single-node list (`curr == prev`): After deletion, list is empty → `tail = NULL`
2. Deleting the tail node: `tail` must be updated to `prev` — otherwise `tail` is a dangling pointer

---

## 5. Reversal — Iterative & Recursive

**Not directly in your singly/doubly LL code files — written fully here.**

### Iterative Reversal — the most asked linked list question

```cpp
Node* reverseList(Node* head) {
    Node* prev = NULL;
    Node* curr = head;
    Node* nxt = NULL;
    
    while(curr != NULL) {
        nxt = curr->next;    // save next BEFORE we break the link
        curr->next = prev;   // reverse the link
        prev = curr;         // move prev forward
        curr = nxt;          // move curr forward
    }
    return prev;             // prev is the new head
}
```

**The three-pointer dance — trace with "1→2→3→NULL":**
```
Initial: prev=NULL, curr=1, nxt=?

Iteration 1: nxt=2, 1→NULL, prev=1, curr=2
Iteration 2: nxt=3, 2→1, prev=2, curr=3
Iteration 3: nxt=NULL, 3→2, prev=3, curr=NULL
Return prev = 3 (new head)
Result: 3→2→1→NULL ✓
```

**Why save `nxt` first:** Once you do `curr->next = prev`, you've lost the reference to the rest of the list. `nxt = curr->next` must happen BEFORE the link reversal.

**Why return `prev` and not `curr`:** When the loop exits, `curr` is NULL (we've gone past the end). `prev` is the last node we processed — which is the new head of the reversed list.

**Complexity:** O(n) time, O(1) space.

### Recursive Reversal

```cpp
Node* reverseListRecursive(Node* head) {
    // Base case: empty list or single node
    if(head == NULL || head->next == NULL) return head;
    
    // Reverse the rest of the list
    Node* newHead = reverseListRecursive(head->next);
    
    // Make the next node point back to current node
    head->next->next = head;
    head->next = NULL;    // current node now points to NULL (tail of reversed)
    
    return newHead;       // new head stays the same throughout recursion
}
```

**The hardest-to-understand step: `head->next->next = head`**

Trace with "1→2→3→NULL":
```
reverseRecursive(1):
  reverseRecursive(2):
    reverseRecursive(3):
      head=3, next=NULL → return 3
    head=2: 2->next->next = 2  (i.e. 3->next = 2)  → 2→3 becomes 2←3
            2->next = NULL     → 2 no longer points to 3
    return 3 (newHead)
  head=1: 1->next->next = 1  (i.e. 2->next = 1)   → 1→2 becomes 1←2
          1->next = NULL      → 1 no longer points to 2
  return 3 (newHead)
Result: 3→2→1→NULL, newHead=3 ✓
```

**Why pass back `newHead` unchanged:** The new head is determined by the deepest base case (last node). Every level of recursion just passes it back up without changing it.

**Complexity:** O(n) time, O(n) space (recursion stack).

**Interview tip:** Iterative is almost always preferred. Recursive demonstrates recursion thinking but is O(n) space. Know both.

---

## 6. Finding Middle Node

**Pattern:** Slow and fast pointers. Fast moves 2 steps, slow moves 1 step. When fast reaches end, slow is at middle.

```cpp
Node* findMiddle(Node* head) {
    if(head == NULL) return NULL;
    
    Node* slow = head;
    Node* fast = head;
    
    while(fast != NULL && fast->next != NULL) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}
```

**For odd-length list "1→2→3→4→5":**
```
slow=1, fast=1
slow=2, fast=3
slow=3, fast=5
fast->next == NULL → stop. slow=3 (middle) ✓
```

**For even-length list "1→2→3→4":**
```
slow=1, fast=1
slow=2, fast=3
fast->next=NULL? No. fast=4, fast->next=NULL? No. slow=3, fast=NULL
fast==NULL → stop. slow=3 (second middle)
```

**Alternative for "first middle" in even list:** Change condition to `fast->next != NULL && fast->next->next != NULL`. This stops one step earlier.

**When to use which:**
- "Find middle to split list": second middle (the default above)
- "Is list palindrome" (check half): second middle works for forward + backward check
- Merge sort on linked list: split at middle

---

## 7. Floyd's Cycle Detection — Deep Dive

Already shown in the code analysis — here's the complete reference.

### Detect Cycle — O(n) time, O(1) space

```cpp
bool hasCycle(Node* head) {
    Node* slow = head;
    Node* fast = head;
    while(fast != NULL && fast->next != NULL) {
        slow = slow->next;
        fast = fast->next->next;
        if(slow == fast) return true;   // cycle!
    }
    return false;
}
```

**Why Floyd's works intuitively:** Think of a circular track. If you run at 2× speed, you'll eventually lap someone running at 1× speed. They MUST meet.

**Mathematical proof (brief):**
- Without a cycle: fast reaches NULL in O(n/2) steps.
- With a cycle: once both pointers are in the cycle, the distance between them decreases by 1 each step (fast gains 1 step per iteration). They meet in at most C steps (C = cycle length).

**Total time:** O(n) — both pointers traverse at most 2n nodes.

### Find Cycle Start — O(n) time, O(1) space

```cpp
Node* detectCycleStart(Node* head) {
    Node* slow = head;
    Node* fast = head;
    bool hasCycle = false;
    
    while(fast != NULL && fast->next != NULL) {
        slow = slow->next;
        fast = fast->next->next;
        if(slow == fast) { hasCycle = true; break; }
    }
    
    if(!hasCycle) return NULL;
    
    slow = head;   // reset slow to head
    while(slow != fast) {
        slow = slow->next;
        fast = fast->next;   // both move ONE step now
    }
    return slow;   // cycle start
}
```

### Map-based approach — O(n) time, O(n) space

```cpp
Node* detectCycleMap(Node* head) {
    map<Node*, bool> visited;
    while(head != NULL) {
        if(visited[head]) return head;  // seen before = cycle start
        visited[head] = true;
        head = head->next;
    }
    return NULL;
}
```

**From your code — this approach is used in your singlyLinkedList.cpp**. It's simpler but uses O(n) space. Floyd's is always preferred in interviews.

---

## 8. Merge Two Sorted Lists

**Not in your codebase — written fully here.**

### Iterative — O(n+m) time, O(1) space

```cpp
Node* mergeTwoLists(Node* l1, Node* l2) {
    Node dummy(0);          // dummy head to avoid edge cases
    Node* curr = &dummy;
    
    while(l1 != NULL && l2 != NULL) {
        if(l1->data <= l2->data) {
            curr->next = l1;
            l1 = l1->next;
        } else {
            curr->next = l2;
            l2 = l2->next;
        }
        curr = curr->next;
    }
    
    // Attach remaining nodes
    curr->next = (l1 != NULL) ? l1 : l2;
    
    return dummy.next;
}
```

**The dummy node trick:** Instead of special-casing the first node (what if l1 is smaller? what if l2 is smaller?), create a dummy node. The result list starts at `dummy.next`. This eliminates all edge cases for the first comparison.

**Why `curr->next = l1 ? l1 : l2` at the end:** When one list is exhausted, the other list is already sorted. Just attach the rest — no need to loop.

### Recursive — elegant but O(n+m) stack space

```cpp
Node* mergeTwoLists(Node* l1, Node* l2) {
    if(l1 == NULL) return l2;
    if(l2 == NULL) return l1;
    
    if(l1->data <= l2->data) {
        l1->next = mergeTwoLists(l1->next, l2);
        return l1;
    } else {
        l2->next = mergeTwoLists(l1, l2->next);
        return l2;
    }
}
```

**Reading the recursion:** "The result of merging l1 and l2 is: whichever has the smaller head, with its `next` set to the result of merging the rest." Beautiful but uses O(n+m) stack space.

---

## 9. Reverse in K Groups

**Not in your codebase — written fully here. This is the hardest standard LL problem.**

```cpp
// "1→2→3→4→5" with k=2 → "2→1→4→3→5"
// "1→2→3→4→5" with k=3 → "3→2→1→4→5"

Node* reverseKGroup(Node* head, int k) {
    // Check if there are k nodes remaining
    Node* check = head;
    for(int i = 0; i < k; i++) {
        if(check == NULL) return head;  // fewer than k nodes — don't reverse
        check = check->next;
    }
    
    // Reverse k nodes
    Node* prev = NULL;
    Node* curr = head;
    Node* nxt = NULL;
    int count = 0;
    
    while(count < k && curr != NULL) {
        nxt = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nxt;
        count++;
    }
    
    // head is now the tail of the reversed group
    // Connect tail of this group to the result of reversing the next group
    head->next = reverseKGroup(curr, k);
    
    return prev;   // prev is the new head of this group
}
```

**Pointer bookkeeping — the part that fades:**

After reversing k nodes:
- `prev` = first node of reversed group (new head of this group)
- `head` = last node of reversed group (connects to next group)
- `curr` = first node of the next group

`head->next = reverseKGroup(curr, k)` connects this group's tail to the next group's new head.

**Trace with "1→2→3→4→5", k=2:**
```
First call: reverse 1,2 → 2→1, head=1, curr=3, prev=2
  1->next = reverseKGroup(3, 2)
    Second call: reverse 3,4 → 4→3, head=3, curr=5, prev=4
      3->next = reverseKGroup(5, 2)
        Third call: check — only 1 node, k=2, return 5 unchanged
      So: 3->next = 5 → 4→3→5
    return 4
  So: 1->next = 4 → 2→1→4→3→5
return 2 ✓
```

**Complexity:** O(n) time — each node processed twice at most. O(n/k) recursion depth.

**Iterative version** is also possible (avoid stack overflow for large n). The logic is similar but uses explicit prev-group-tail tracking.

---

## 10. Clone List with Random Pointer

**Not in your codebase — written fully here.**

**Problem:** Each node has `next` and `random` (can point to any node or NULL). Create a deep copy.

### Approach 1: Hash Map — O(n) time, O(n) space

```cpp
Node* copyRandomList(Node* head) {
    if(!head) return NULL;
    
    unordered_map<Node*, Node*> mp;  // original → clone
    
    // First pass: create all clones
    Node* curr = head;
    while(curr) {
        mp[curr] = new Node(curr->val);
        curr = curr->next;
    }
    
    // Second pass: set next and random pointers
    curr = head;
    while(curr) {
        mp[curr]->next   = mp[curr->next];    // NULL maps to NULL (mp default)
        mp[curr]->random = mp[curr->random];
        curr = curr->next;
    }
    
    return mp[head];
}
```

**Why two passes?** In the first pass, you create all clone nodes. In the second pass, you set the `random` pointers. You can't do it in one pass because the node that `random` points to might not have been created yet.

### Approach 2: In-place Interleaving — O(n) time, O(1) space

```cpp
Node* copyRandomList(Node* head) {
    if(!head) return NULL;
    
    // Step 1: interleave — insert clone after each original
    // 1→2→3 becomes 1→1'→2→2'→3→3'
    Node* curr = head;
    while(curr) {
        Node* clone = new Node(curr->val);
        clone->next = curr->next;
        curr->next = clone;
        curr = clone->next;
    }
    
    // Step 2: set random pointers for clones
    curr = head;
    while(curr) {
        if(curr->random)
            curr->next->random = curr->random->next;
        curr = curr->next->next;
    }
    
    // Step 3: separate the two lists
    curr = head;
    Node* cloneHead = head->next;
    while(curr) {
        Node* clone = curr->next;
        curr->next = clone->next;
        clone->next = clone->next ? clone->next->next : NULL;
        curr = curr->next;
    }
    
    return cloneHead;
}
```

**The clever insight of step 2:** If `curr->random = X`, then `curr->next` (the clone) should have `random = X->next` (X's clone). Because the clone is always immediately after the original, `original->random->next` is always the clone of `original->random`.

---

## 11. Flatten a Linked List

**Not in your codebase — written fully here.**

**Problem (GFG):** Each node has `next` and `bottom` pointers. Nodes in each vertical list are sorted. Flatten to a single sorted list using `bottom` pointers.

```cpp
// Merge two vertical lists
Node* merge(Node* a, Node* b) {
    if(!a) return b;
    if(!b) return a;
    if(a->data <= b->data) {
        a->bottom = merge(a->bottom, b);
        return a;
    } else {
        b->bottom = merge(a, b->bottom);
        return b;
    }
}

Node* flatten(Node* root) {
    if(root == NULL || root->next == NULL) return root;
    // Recursively flatten the rest of the list
    root->next = flatten(root->next);
    // Merge current list with flattened rest
    root = merge(root, root->next);
    return root;
}
```

**The recursive structure:** Flatten the tail first, then merge the current column with the already-flattened result. This is merge sort applied to columns.

---

## 12. LRU Cache

**Not in your codebase — written fully here. This is one of the most asked design questions.**

**Requirements:** `get(key)` and `put(key, value)`, both O(1). Evict Least Recently Used when capacity is exceeded.

**Data structure choice:**
- `unordered_map<int, list<pair<int,int>>::iterator>` → O(1) lookup
- `list<pair<int,int>>` (doubly linked list) → O(1) move to front, O(1) remove

```cpp
class LRUCache {
    int capacity;
    list<pair<int,int>> cache;                          // most recent at front
    unordered_map<int, list<pair<int,int>>::iterator> mp;  // key → iterator
    
public:
    LRUCache(int capacity) : capacity(capacity) {}
    
    int get(int key) {
        if(mp.find(key) == mp.end()) return -1;
        // Move to front (mark as recently used)
        cache.splice(cache.begin(), cache, mp[key]);
        return mp[key]->second;
    }
    
    void put(int key, int value) {
        if(mp.find(key) != mp.end()) {
            // Update existing — move to front
            mp[key]->second = value;
            cache.splice(cache.begin(), cache, mp[key]);
        } else {
            if(cache.size() == capacity) {
                // Evict LRU (back of list)
                int lruKey = cache.back().first;
                mp.erase(lruKey);
                cache.pop_back();
            }
            cache.push_front({key, value});
            mp[key] = cache.begin();
        }
    }
};
```

**Why `list` and not `vector`?** `list::splice` moves a node to another position in O(1) — just pointer updates. `vector` would require O(n) shifting. This is why DLL (implemented via `std::list`) is the right tool here.

**The `splice` operation:** Moves a node from its current position to another position in the same or different list — O(1). This is what gives us O(1) "move to front" on every get/put.

**The iterator in the map:** Storing `list::iterator` in the map lets us go directly to the node in the list — O(1). Without this, finding the node would be O(n).

---

## 13. Things Most People Forget

### 1. Three-pointer reversal — must save `nxt` BEFORE reversing link

```cpp
// CORRECT
nxt = curr->next;    // save first
curr->next = prev;   // then reverse

// WRONG
curr->next = prev;   // you've lost curr->next!
nxt = curr->next;    // this now points to prev, not the next node
```

### 2. K-group reversal — connect the tail to next group

```cpp
// After reversing k nodes, head is now the TAIL of the reversed group
head->next = reverseKGroup(curr, k);  // MUST do this — easy to forget
```

### 3. Cycle detection condition — guard against fast->next being NULL

```cpp
// CORRECT
while(fast != NULL && fast->next != NULL) {
    fast = fast->next->next;   // safe

// WRONG
while(fast != NULL) {
    fast = fast->next->next;   // crash if fast->next is NULL
```

### 4. Dummy head node — use it for edge cases in insert/merge

```cpp
// Without dummy: need special case for empty result list
// With dummy: no special case needed
Node dummy(0);
Node* curr = &dummy;
// ... build list ...
return dummy.next;
```

### 5. Pass head/tail by reference to modify them

```cpp
void insertAtHead(Node* &head, int d) { /* can reassign head */ }
// vs
void insertAtHead(Node* head, int d)  { /* head changes lost after return */ }
```

### 6. Cycle start — reset slow to HEAD, not to the meeting point

```cpp
// Finding cycle start:
// After detection, reset slow to HEAD (not to meeting point)
slow = head;         // ← reset to head
while(slow != fast) {
    slow = slow->next;
    fast = fast->next;   // BOTH move at speed 1 now
}
// They meet at cycle start
```

### 7. Clone with random — two passes required (can't do in one)

Random pointers can reference any node, including ones not yet created. You must create ALL clone nodes first, THEN set random pointers.

### 8. DLL insertion — four pointer updates, not two

When inserting into a DLL, there are 4 pointer updates (new→next, next←new, prev→new, new←prev). People always forget `next←new` (the backward link from the following node to the new node).

### 9. Circular list — initial node points to ITSELF

```cpp
newNode->next = newNode;  // don't forget this for first node in circular list
```

### 10. Merge Two Sorted — `curr->next = l1 ? l1 : l2` handles remaining

You don't need to loop when one list is exhausted — just attach the rest. The remaining portion is already sorted.

---

## 15. Final Revision Sheet

### Key Templates

```cpp
// 1. Iterative reversal
Node* reverse(Node* head) {
    Node* prev = NULL, *curr = head, *nxt = NULL;
    while(curr) {
        nxt = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nxt;
    }
    return prev;
}

// 2. Find middle (slow/fast)
Node* findMiddle(Node* head) {
    Node* slow = head, *fast = head;
    while(fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}

// 3. Floyd's cycle detect
bool hasCycle(Node* head) {
    Node* slow = head, *fast = head;
    while(fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if(slow == fast) return true;
    }
    return false;
}

// 4. Cycle start
Node* cycleStart(Node* head) {
    Node* slow = head, *fast = head;
    while(fast && fast->next) {
        slow = slow->next; fast = fast->next->next;
        if(slow == fast) {
            slow = head;
            while(slow != fast) { slow = slow->next; fast = fast->next; }
            return slow;
        }
    }
    return NULL;
}

// 5. Merge two sorted lists
Node* merge(Node* l1, Node* l2) {
    Node dummy(0); Node* curr = &dummy;
    while(l1 && l2) {
        if(l1->data <= l2->data) { curr->next = l1; l1 = l1->next; }
        else                     { curr->next = l2; l2 = l2->next; }
        curr = curr->next;
    }
    curr->next = l1 ? l1 : l2;
    return dummy.next;
}

// 6. Reverse K groups
Node* reverseKGroup(Node* head, int k) {
    Node* check = head;
    for(int i = 0; i < k; i++) {
        if(!check) return head;
        check = check->next;
    }
    Node* prev = NULL, *curr = head, *nxt;
    for(int i = 0; i < k; i++) {
        nxt = curr->next; curr->next = prev; prev = curr; curr = nxt;
    }
    head->next = reverseKGroup(curr, k);
    return prev;
}

// 7. Insert at head (SLL)
void insertHead(Node* &head, int d) {
    Node* t = new Node(d);
    t->next = head;
    head = t;
}

// 8. Delete node by position
void deleteAt(Node* &head, int pos) {
    if(pos == 1) { Node* t = head; head = head->next; t->next = NULL; delete t; return; }
    Node* curr = head;
    for(int i = 1; i < pos-1; i++) curr = curr->next;
    Node* del = curr->next;
    curr->next = del->next;
    del->next = NULL;
    delete del;
}
```

### Complexity Table

| Operation | SLL | DLL | Circular |
|-----------|-----|-----|----------|
| Insert at head | O(1) | O(1) | O(1) |
| Insert at tail (with tail ptr) | O(1) | O(1) | O(1) |
| Insert at position i | O(i) | O(i) | O(i) |
| Delete head | O(1) | O(1) | O(1) |
| Delete tail | O(n) | O(1) | O(1) (with tail) |
| Delete given node | O(n)* | O(1) | O(n) |
| Search | O(n) | O(n) | O(n) |
| Reverse | O(n), O(1) space | O(n) | O(n) |
| Find middle | O(n) | O(n) | — |
| Cycle detect (Floyd's) | O(n), O(1) | — | — |

*O(1) if you have the previous node; O(n) to find previous node.

### Interview Checklist

- [ ] Can I write iterative reversal without looking it up?
- [ ] Do I know the order: save `nxt` → reverse link → advance pointers?
- [ ] Can I explain Floyd's cycle detection AND cycle start finding?
- [ ] Do I know why `slow` resets to HEAD (not to meeting point) for cycle start?
- [ ] Can I write the K-group reversal including the critical `head->next = reverseKGroup(curr, k)`?
- [ ] Can I write merge two sorted with dummy head?
- [ ] Do I know why LRU Cache uses `list` (doubly linked) and not `vector`?
- [ ] Can I pass `head` by reference `Node* &head` when needed?
- [ ] For DLL insertion, can I write all 4 pointer updates?
- [ ] Do I know `list::splice` for O(1) move-to-front?

### Most Important Observations

1. **Reversal order:** Save next → reverse → advance. Doing it any other way loses the list.
2. **Floyd's magic:** After detection, reset slow to HEAD and move both at speed 1. They meet at the cycle start. The math: `F = kC - a`.
3. **Dummy head:** Use it whenever the first node might change (merge, remove nth from end, etc.). Eliminates all null head edge cases.
4. **K-group reversal trap:** After reversing, the original `head` is now the TAIL of the reversed group. You must connect it: `head->next = reverseKGroup(curr, k)`.
5. **DLL for LRU:** `std::list::splice` is O(1) — this is the key operation that makes LRU Cache O(1). No vector can do this.
6. **Clone with random:** Must be two passes. Can't know where random points until all nodes exist.

---

*Chapter 06 — Linked List | Part of DSA Interview Prep series*  
*Based on Striver's A2Z Sheet + Love Babbar lecture series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] Introduction to Singly LinkedList — https://www.geeksforgeeks.org/problems/introduction-to-linked-list/1
- [ ] Insertion at the head of Linked List — https://www.geeksforgeeks.org/problems/linked-list-insertion-1587115620/1
- [ ] Deletion of a node in LL — https://leetcode.com/problems/delete-node-in-a-linked-list/
- [ ] Find the length of the Linked List — https://www.geeksforgeeks.org/problems/count-nodes-of-linked-list/1
- [ ] Search in Linked List — https://www.geeksforgeeks.org/problems/search-in-linked-list-1660148408/1
- [ ] Introduction to Doubly LL — https://www.geeksforgeeks.org/problems/introduction-to-doubly-linked-list/1
- [ ] Insert node before head in DLL — https://www.geeksforgeeks.org/problems/insert-a-node-in-doubly-linked-list/1
- [ ] Delete head of Doubly Linked List — https://www.geeksforgeeks.org/problems/delete-node-in-doubly-linked-list/1
- [ ] Reverse a Doubly Linked List — https://www.geeksforgeeks.org/problems/reverse-a-doubly-linked-list/1
- [ ] Middle of a LinkedList — https://leetcode.com/problems/middle-of-the-linked-list/
- [ ] Reverse a LinkedList — https://leetcode.com/problems/reverse-linked-list/
- [ ] Detect a loop in LL — https://leetcode.com/problems/linked-list-cycle/
- [ ] Find the starting point of loop in LL — https://leetcode.com/problems/linked-list-cycle-ii/
- [ ] Length of loop in LL — https://www.geeksforgeeks.org/problems/find-length-of-loop/1
- [ ] Check if LL is palindrome or not — https://leetcode.com/problems/palindrome-linked-list/
- [ ] Segregate odd and even nodes in LL — https://leetcode.com/problems/odd-even-linked-list/
- [ ] Remove Nth node from the back of LL — https://leetcode.com/problems/remove-nth-node-from-end-of-list/
- [ ] Delete the middle node in LL — https://leetcode.com/problems/delete-the-middle-node-of-a-linked-list/
- [ ] Sort LL (Merge Sort) — https://leetcode.com/problems/sort-list/
- [ ] Sort a LL of 0's 1's and 2's — https://www.geeksforgeeks.org/problems/given-a-linked-list-of-0s-1s-and-2s-sort-it/1
- [ ] Find the intersection point of two LL — https://leetcode.com/problems/intersection-of-two-linked-lists/
- [ ] Add one to a number represented by LL — https://www.geeksforgeeks.org/problems/add-1-to-a-number-represented-as-linked-list/1
- [ ] Add two numbers in Linked List — https://leetcode.com/problems/add-two-numbers/
- [ ] Delete all occurrences of a key in DLL — https://www.geeksforgeeks.org/problems/delete-all-occurrences-of-a-given-key-in-a-doubly-linked-list/1
- [ ] Find Pairs with Given Sum in DLL — https://www.geeksforgeeks.org/problems/find-pairs-with-given-sum-in-doubly-linked-list/1
- [ ] Remove duplicates from sorted DLL — https://www.geeksforgeeks.org/problems/remove-duplicates-from-a-sorted-doubly-linked-list/1
- [ ] Reverse LL in group of given size K — https://leetcode.com/problems/reverse-nodes-in-k-group/
- [ ] Rotate a LL — https://leetcode.com/problems/rotate-list/
- [ ] Flattening of LL — https://www.geeksforgeeks.org/problems/flattening-a-linked-list/1
- [ ] Clone a LL with random and next pointer — https://leetcode.com/problems/copy-list-with-random-pointer/
- [ ] Remove Duplicates from Sorted LL — https://leetcode.com/problems/remove-duplicates-from-sorted-list/
- [ ] Remove Duplicates from Unsorted LL — https://www.geeksforgeeks.org/problems/remove-duplicates-from-an-unsorted-linked-list/1
- [ ] Merge Two Sorted Linked Lists — https://leetcode.com/problems/merge-two-sorted-lists/

