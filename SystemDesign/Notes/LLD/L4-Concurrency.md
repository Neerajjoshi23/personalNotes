# L4 · Concurrency for LLD rounds: correctness before cleverness

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** BookMyShow / ticket booking, blocking queue, TTL cache, LRU cache, rate limiter, singleton, producer-consumer, concurrent hashmap follow-ups.

---

## Why this topic matters

LLD concurrency questions are rarely about writing a lock-free data structure. They are about not corrupting state when two threads hit the same object.

The interviewer wants to hear:

- where shared mutable state lives,
- which lock protects it,
- whether waiting is done safely,
- how deadlocks are avoided,
- what the race condition is in a booking/cache problem.

| If you say… | Also say… |
|---|---|
| "I'll use a mutex." | "Every read/write of this map happens under the same mutex." |
| "I'll wait on a condition variable." | "I use predicate wait because wakeups can be spurious." |
| "I'll use atomics." | "Only for independent counters/flags; compound invariants still need locks." |
| "Per-seat locks scale better." | "But DB-level unique constraints/transactions are still the real source of truth." |

**Interview line:** "I'll start with a coarse lock for correctness, then split locks only if contention is measurable and the invariant allows it."

---

## Part 1: threads, shared state and RAII locking

### `std::thread`

`std::thread` starts a new OS thread. You must `join()` it or `detach()` it before the thread object is destroyed; otherwise the program calls `std::terminate()`.

```cpp
#include <iostream>
#include <thread>

void worker(int id) {
    std::cout << "worker " << id << '\n';
}

int main() {
    std::thread t(worker, 1);
    t.join(); // wait for it to finish
}
```

For most real C++ code, prefer a thread pool or higher-level executor. But in LLD rounds, `std::thread` is enough to demonstrate producer-consumer or booking races.

### `std::mutex` and RAII

A mutex protects a critical section. In C++, do not manually call `lock()` / `unlock()` unless you have a very good reason. Use RAII:

```cpp
#include <mutex>
#include <unordered_map>

class CounterMap {
    std::mutex mu_;
    std::unordered_map<int, int> count_;
public:
    void increment(int key) {
        std::lock_guard<std::mutex> lock(mu_);
        ++count_[key];
    } // lock released even if an exception is thrown
};
```

`std::lock_guard` is simple: lock in constructor, unlock in destructor. `std::unique_lock` is heavier but movable and can be unlocked/relocked, which is why `condition_variable` uses it.

### What must be protected?

The lock protects an **invariant**, not a line of code. For a booking system:

```text
seat.status == Available  -> exactly one thread may change it to Held
```

Both the check and the update must be in the same critical section. Otherwise you get a check-then-act bug.

---

## Part 2: race conditions and check-then-act bugs

A race condition happens when program correctness depends on unlucky timing between threads.

Classic seat booking bug:

```cpp
if (seat.status == Available) {  // Thread A and B both see Available
    seat.status = Held;          // both "book" the same seat
}
```

Fix:

```cpp
{
    std::lock_guard<std::mutex> lock(seat.mu);
    if (seat.status != SeatStatus::Available) return false;
    seat.status = SeatStatus::Held;
    return true;
}
```

**Interview line:** "The critical section is the whole check-and-mark operation. Splitting it into `isAvailable()` and `book()` would reintroduce the race unless both happen under one lock."

Common check-then-act examples:

- `if (!map.count(k)) map[k] = v;`
- `if (balance >= amount) balance -= amount;`
- `if (tokens > 0) --tokens;`
- `if (seat is free) reserve seat;`

---

## Part 3: condition variables — sleep until a condition becomes true

A condition variable lets a thread sleep without spinning. Use it for producer-consumer queues.

The rule you must remember:

```cpp
cv.wait(lock, [] { return condition; });
```

not:

```cpp
if (!condition) cv.wait(lock); // weak: spurious wakeups break this
```

Why? Threads can wake up without a real notification (**spurious wakeup**), and notifications can race with checks. Predicate wait is effectively:

```cpp
while (!condition) cv.wait(lock);
```

The lock is released while waiting and reacquired before returning.

### Bounded blocking queue (producer-consumer)

This is the most important LLD concurrency code to know.

```cpp
#include <condition_variable>
#include <deque>
#include <mutex>
#include <optional>
#include <stdexcept>

template <typename T>
class BlockingQueue {
    std::mutex mu_;
    std::condition_variable notEmpty_;
    std::condition_variable notFull_;
    std::deque<T> q_;
    std::size_t capacity_;
    bool closed_ = false;

public:
    explicit BlockingQueue(std::size_t capacity) : capacity_(capacity) {}

    void push(T item) {
        std::unique_lock<std::mutex> lock(mu_);
        notFull_.wait(lock, [&] {
            return closed_ || q_.size() < capacity_;
        });
        if (closed_) throw std::runtime_error("queue closed");

        q_.push_back(std::move(item));
        notEmpty_.notify_one();
    }

    std::optional<T> pop() {
        std::unique_lock<std::mutex> lock(mu_);
        notEmpty_.wait(lock, [&] {
            return closed_ || !q_.empty();
        });

        if (q_.empty()) return std::nullopt; // closed and drained
        T item = std::move(q_.front());
        q_.pop_front();
        notFull_.notify_one();
        return item;
    }

    void close() {
        std::lock_guard<std::mutex> lock(mu_);
        closed_ = true;
        notEmpty_.notify_all();
        notFull_.notify_all();
    }
};
```

Why this is correct:

- `q_`, `closed_` and capacity checks are protected by the same mutex.
- Producers wait while the queue is full.
- Consumers wait while the queue is empty.
- `close()` wakes everyone so no thread waits forever.
- Predicate wait handles spurious wakeups.

ASCII view:

```text
Producer threads ──push──> [ bounded queue ] ──pop──> Consumer threads
                 notFull        mutex        notEmpty
```

---

## Part 4: atomics — useful, but not magic

`std::atomic<T>` makes operations on one variable atomic and gives memory-ordering guarantees. In interviews, keep it simple:

```cpp
#include <atomic>

std::atomic<int> requests{0};
requests.fetch_add(1);
```

Good uses:

- counters (`requestsServed`),
- flags (`shutdownRequested`),
- generating simple IDs,
- cheap metrics.

Bad uses:

- "seat is available, then book it" across multiple fields,
- "if balance >= amount then debit",
- updating a map and a list for LRU.

Those are **compound invariants**. Use a mutex.

You can implement some logic with compare-and-swap (`compare_exchange_weak/strong`), but it is easy to get wrong. In an LLD round, a lock is usually the right answer unless the problem explicitly asks for lock-free.

---

## Part 5: deadlock — four conditions and practical prevention

Deadlock needs all four Coffman conditions:

1. **Mutual exclusion:** a resource can be held by only one thread.
2. **Hold and wait:** a thread holds one resource while waiting for another.
3. **No preemption:** resources are released only voluntarily.
4. **Circular wait:** A waits for B; B waits for A.

Classic bug:

```cpp
// Thread 1: lock A then B
// Thread 2: lock B then A
```

### Lock ordering

Pick a global order and always acquire locks in that order:

```cpp
void transfer(Account& from, Account& to, int amount) {
    Account* first = &from < &to ? &from : &to;
    Account* second = &from < &to ? &to : &from;

    std::lock_guard<std::mutex> l1(first->mu);
    std::lock_guard<std::mutex> l2(second->mu);
    // update balances
}
```

### `std::scoped_lock`

C++17 gives a safer option for multiple mutexes:

```cpp
void transfer(Account& from, Account& to, int amount) {
    std::scoped_lock lock(from.mu, to.mu); // uses deadlock-avoidance algorithm
    from.balance -= amount;
    to.balance += amount;
}
```

Use `std::scoped_lock` when you need to lock multiple mutexes at once.

---

## Part 6: thread-safe seat booking

### Global lock

Simplest correct design:

```cpp
class Show {
    std::mutex mu_;
    std::vector<SeatStatus> seats_;
public:
    bool hold(int seatId) {
        std::lock_guard<std::mutex> lock(mu_);
        if (seats_[seatId] != SeatStatus::Available) return false;
        seats_[seatId] = SeatStatus::Held;
        return true;
    }
};
```

Pros: easy to reason about. Cons: all seats serialize, even unrelated seats.

### Per-seat locks

Better concurrency when holds touch one seat:

```cpp
#include <mutex>
#include <vector>

enum class SeatStatus { Available, Held, Sold };

class SeatBooker {
    std::vector<SeatStatus> seats_;
    std::vector<std::mutex> locks_;
public:
    explicit SeatBooker(int n)
        : seats_(n, SeatStatus::Available), locks_(n) {}

    bool hold(int seatId) {
        std::lock_guard<std::mutex> lock(locks_.at(seatId));
        if (seats_[seatId] != SeatStatus::Available) return false;
        seats_[seatId] = SeatStatus::Held;
        return true;
    }
};
```

If booking multiple seats, acquire locks in sorted seat-id order or use `std::scoped_lock` on a fixed set, otherwise two threads can deadlock while booking seats `[A, B]` and `[B, A]`.

### DB-level reality

In a real BookMyShow system, in-memory locks are not the final authority. You still need a database transaction or unique constraint:

```sql
-- one successful row per seat per show
UNIQUE(show_id, seat_id)
```

or:

```sql
UPDATE seats
SET status = 'HELD', hold_expires_at = now() + interval '5 minutes'
WHERE show_id = ? AND seat_id = ? AND status = 'AVAILABLE';
```

If affected rows = 1, you got the seat. If 0, someone else got it.

**Interview line:** "Inside one process I protect the seat with a per-seat mutex. Across app servers, the database transaction/unique constraint is the source of truth."

---

## Part 7: TTL cache with `mutex` / `shared_mutex`

A TTL cache has two invariants:

- map key → entry is not corrupted,
- expired entries are not returned.

With a simple mutex:

```cpp
class TtlCache {
    struct Entry {
        std::string value;
        std::chrono::steady_clock::time_point expiresAt;
    };

    std::mutex mu_;
    std::unordered_map<std::string, Entry> data_;

public:
    void put(std::string key, std::string value, std::chrono::milliseconds ttl) {
        std::lock_guard<std::mutex> lock(mu_);
        data_[std::move(key)] = {std::move(value),
            std::chrono::steady_clock::now() + ttl};
    }

    std::optional<std::string> get(const std::string& key) {
        std::lock_guard<std::mutex> lock(mu_);
        auto it = data_.find(key);
        if (it == data_.end()) return std::nullopt;

        if (it->second.expiresAt <= std::chrono::steady_clock::now()) {
            data_.erase(it);
            return std::nullopt;
        }
        return it->second.value;
    }
};
```

If reads dominate, C++17 `std::shared_mutex` allows many readers or one writer:

```cpp
#include <shared_mutex>

class ReadMostlyTtlCache {
    mutable std::shared_mutex mu_;
    std::unordered_map<std::string, Entry> data_;

public:
    std::optional<std::string> get(const std::string& key) {
        {
            std::shared_lock<std::shared_mutex> readLock(mu_);
            auto it = data_.find(key);
            if (it == data_.end()) return std::nullopt;
            if (it->second.expiresAt > std::chrono::steady_clock::now()) {
                return it->second.value;
            }
        }

        std::unique_lock<std::shared_mutex> writeLock(mu_);
        auto it = data_.find(key);
        if (it != data_.end() &&
            it->second.expiresAt <= std::chrono::steady_clock::now()) {
            data_.erase(it);
        }
        return std::nullopt;
    }
};
```

Notice the double-check after upgrading to write lock. Another thread may have deleted/refreshed the entry while we released the read lock.

### Cleanup thread?

You can lazily delete expired entries on `get`, or have a background cleanup thread. In interviews, lazy deletion is usually enough. If you add a cleanup thread, give it a clean shutdown flag and `join()` it in the destructor.

---

## Part 8: thread-safe singleton

C++11 guarantees function-local static initialization is thread-safe:

```cpp
class Logger {
public:
    static Logger& instance() {
        static Logger logger;
        return logger;
    }

    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;

    void log(const std::string& message);

private:
    Logger() = default;
};
```

This is the Meyers Singleton. Caveat: prefer dependency injection when you want testability. A singleton is fine for a process-wide logger/config in an interview if you mention the trade-off.

Do not write double-checked locking by hand unless asked. It is easy to get memory ordering wrong, and the function-local static already solves the problem.

---

## Part 9: Same in Java

The ideas are the same; the syntax changes.

| Concept | C++17 | Java |
|---|---|---|
| Thread | `std::thread` | `Thread`, but prefer `ExecutorService` |
| Mutex | `std::mutex` | `synchronized` monitor or `ReentrantLock` |
| RAII locking | `std::lock_guard`, `std::unique_lock` | `try/finally` with `lock.unlock()` |
| Condition variable | `std::condition_variable` | `Object.wait/notify` or `Condition` from `ReentrantLock` |
| Blocking queue | write with mutex + CV | `BlockingQueue` (`ArrayBlockingQueue`, `LinkedBlockingQueue`) |
| Read/write lock | `std::shared_mutex` | `ReentrantReadWriteLock` |
| Concurrent map | no standard C++17 concurrent map | `ConcurrentHashMap` |
| Atomic counter | `std::atomic<int>` | `AtomicInteger`, `AtomicLong` |
| Thread pool | hand-roll / libraries | `ExecutorService`, `Executors`, `CompletableFuture` |

### Java mapping snippets

```java
class Counter {
  private int value = 0;
  synchronized void inc() { value++; }
  synchronized int get() { return value; }
}
```

`wait()` / `notifyAll()` must be called while holding the object's monitor:

```java
synchronized (lock) {
  while (queue.isEmpty()) {
    lock.wait();
  }
}
```

With `ReentrantLock`:

```java
lock.lock();
try {
  while (queue.isEmpty()) notEmpty.await();
} finally {
  lock.unlock();
}
```

For production Java LLD, prefer built-ins:

- `BlockingQueue` for producer-consumer,
- `ConcurrentHashMap` for concurrent maps,
- `ExecutorService` for worker pools,
- `AtomicInteger` for counters.

---

## Part 10: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| One object has a few fields with one invariant | One `std::mutex` | Correct and simple |
| Read-heavy cache | `std::shared_mutex` | Many concurrent readers |
| Producer-consumer | `mutex` + `condition_variable` + predicate wait | No busy waiting |
| Independent metric counter | `std::atomic<int>` | No lock needed |
| Seat booking inside one process | per-seat lock or show-level lock | Prevent double hold |
| Seat booking across servers | DB transaction / unique constraint | In-memory locks do not cross processes |
| Need two locks | `std::scoped_lock` or global lock order | Avoid deadlock |
| Singleton | function-local static | Thread-safe since C++11 |

### Common interview traps

- Protecting writes but not reads. Reads of shared mutable state also need synchronization.
- Splitting check and update across methods without one lock.
- Using `if` around `cv.wait()` instead of predicate/while.
- Calling `notify_one()` before updating the condition under the lock.
- Assuming `volatile` is a synchronization primitive. In C++ it is not for threading.
- Using atomics for multi-field invariants.
- Forgetting that app-server locks do not protect data across multiple machines.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why is <code>if (!ready) cv.wait(lock)</code> wrong?</summary>

Condition variables can wake spuriously, and the condition may become false again before the thread runs. Use `cv.wait(lock, predicate)` or a `while` loop so the condition is rechecked under the lock.
</details>

<details><summary>2. A seat booking method calls <code>isAvailable()</code> and then <code>book()</code>, each with its own lock. What's wrong?</summary>

The check and update are not atomic together. Another thread can book the seat between the two calls. The whole check-then-mark operation must happen under one critical section.
</details>

<details><summary>3. When is <code>std::atomic&lt;int&gt;</code> enough, and when is it not?</summary>

It is enough for independent counters/flags. It is not enough for compound invariants involving multiple fields or containers, like LRU map+list or seat status + hold expiry.
</details>

<details><summary>4. Name the four deadlock conditions.</summary>

Mutual exclusion, hold-and-wait, no preemption, circular wait.
</details>

<details><summary>5. How do you avoid deadlock when booking multiple seats?</summary>

Acquire locks in a deterministic order, such as sorted seat IDs, or use a deadlock-avoiding multi-lock utility where applicable. Never let different threads lock the same set in different orders.
</details>

<details><summary>6. Why is a DB unique constraint still needed for BookMyShow?</summary>

Because in-memory mutexes protect only one process. With multiple app servers, two servers can both think they hold a seat unless the database enforces uniqueness/transactional update.
</details>

<details><summary>7. What's the C++17 thread-safe singleton idiom?</summary>

Function-local static: `static Logger logger; return logger;`. Initialization is thread-safe since C++11. Delete copy/assignment and keep the constructor private.
</details>

<details><summary>8. Java equivalent of <code>condition_variable</code>?</summary>

Low-level: `wait/notify/notifyAll` on an object monitor. With explicit locks: `Condition` from `ReentrantLock`. Usually prefer `BlockingQueue` for producer-consumer.
</details>

---

## My notes (write from memory after reading)

- 
- 
- 

**One thing I'd have got wrong before reading this:**

---

## Sources / read more

| Source | What to read | Where / time |
|---|---|---|
| [Hello Interview LLD: Concurrency Fundamentals](https://www.hellointerview.com/learn/low-level-design/concurrency/intro) | Headings verified: Concurrency Fundamentals → The Toolbox → Language Reference → Three Problem Types | ~30 min |
| [Oracle Java tutorial: Processes and Threads](https://docs.oracle.com/javase/tutorial/essential/concurrency/procthread.html) | "Processes" and "Threads" | ~10 min |
| [Oracle Java tutorial: Synchronization](https://docs.oracle.com/javase/tutorial/essential/concurrency/sync.html) | Intrinsic locks, synchronized methods/statements, atomic access | ~20 min |
| [Oracle Java tutorial: High Level Concurrency Objects](https://docs.oracle.com/javase/tutorial/essential/concurrency/highlevel.html) | Lock objects, executors, concurrent collections, atomic variables | ~20 min |
| [cppreference: `std::thread`](https://en.cppreference.com/w/cpp/thread/thread) | Member functions, join/detach notes | ~10 min |
| [cppreference: `std::mutex`](https://en.cppreference.com/w/cpp/thread/mutex) | Notes and example | ~10 min |
| [cppreference: `std::lock_guard`](https://en.cppreference.com/w/cpp/thread/lock_guard) and [`std::unique_lock`](https://en.cppreference.com/w/cpp/thread/unique_lock) | RAII lock wrappers | ~10 min |
| [cppreference: `std::condition_variable`](https://en.cppreference.com/w/cpp/thread/condition_variable) and [`wait`](https://en.cppreference.com/w/cpp/thread/condition_variable/wait) | Predicate wait and example | ~15 min |
| [cppreference: `std::atomic`](https://en.cppreference.com/w/cpp/atomic/atomic) | Atomic specializations and example | ~10 min |
| [cppreference: `std::scoped_lock`](https://en.cppreference.com/w/cpp/thread/scoped_lock) | C++17 multi-mutex locking | ~5 min |
| [cppreference: `std::shared_mutex`](https://en.cppreference.com/w/cpp/thread/shared_mutex) | Shared/exclusive locking | ~10 min |

**Connects to:** [L0 C++ OOP](L0-Cpp-OOP-for-LLD.md) (RAII, smart pointers) · [L3b Behavioral Patterns](L3b-Behavioral-Patterns.md) (Command queues, Observer) · LRU cache · BookMyShow · Rate limiter · TTL cache
