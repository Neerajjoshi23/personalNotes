# L5 · Practice playbook: how to get interview-ready at LLD

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** all Tier-1 and Tier-2 LLD questions from the roadmap: Parking lot, Elevator, BookMyShow, Vending machine, LRU cache, Rate limiter, Splitwise, games, Logging, Pub-sub, Library, ATM, Hotel / car rental, Inventory, In-memory file system, Amazon locker, Stack Overflow, Task manager, Chess.

---

## Why this topic matters

LLD practice is not "read 30 GitHub solutions and hope one repeats". The useful skill is repeatable:

1. clarify scope,
2. find core entities,
3. draw relationships,
4. place behaviour near the data it protects,
5. add patterns only where they localise change,
6. code the risky part.

If you do that for 15–20 questions, most new LLD prompts become variants.

| What interviewers grade | What they want to see |
|---|---|
| Requirements | You ask scope-setting questions and freeze assumptions |
| Modelling | Entities have clean responsibilities, not one god manager |
| Extensibility | Follow-ups add classes, not edits everywhere |
| Correctness | Edge cases and concurrency are called out |
| Code | A small, compilable core in C++17 / Java-style OOP |

**Interview line:** "I'll first model the domain and invariants, then code the critical flow. I won't implement every CRUD method unless it changes the design."

---

## Part 1: the repeatable 45-minute drill

Use this timer even when practising alone.

### 0–5 min: clarify

Ask 5–7 questions:

- single machine or distributed?
- in-memory or persistent DB?
- concurrency required?
- users/roles?
- expected operations?
- what should be extensible?
- which edge cases matter?

Then say your assumptions out loud.

### 5–12 min: requirements and APIs

Write:

```text
Functional:
- reserve a seat
- release expired holds
- confirm booking

Non-functional:
- no double booking
- low latency for seat map reads
- extensible notification/pricing
```

Sketch the public API:

```cpp
class BookingService {
public:
    HoldResult holdSeats(UserId user, ShowId show, std::vector<SeatId> seats);
    Booking confirm(HoldId hold, PaymentId payment);
};
```

### 12–25 min: entities and relationships

Draw a small UML-ish map:

```text
Cinema ◆── Screen ◆── Seat
Movie  ──> Show ──> Screen
User   ──> Booking ◆── Ticket
Show   ◆── SeatInventory
```

Use C++ ownership language from [L0](L0-Cpp-OOP-for-LLD.md): composition/value/`unique_ptr` for owned parts; IDs or references for associations.

### 25–38 min: code the risky core

Pick the hardest part, not the whole app:

- Parking lot: `park()` and `checkout()`.
- BookMyShow: `holdSeats()` with concurrency.
- LRU: `get()` / `put()` using list + map.
- Rate limiter: `allowRequest()`.
- Pub-sub: `subscribe()` / `publish()`.

### 38–43 min: follow-ups

Add 3 extension points:

- Strategy for pricing/scheduling/rate-limiter algorithm.
- State for vending/elevator/order lifecycle.
- Observer for notifications.
- Chain for logger/middleware.
- Concurrency locks for shared mutable state.

### 43–45 min: recap

End with:

```text
Core invariant:
- A seat can have at most one active hold.

Extensibility:
- Pricing and notification are injected strategies/observers.

Concurrency:
- Per-seat lock in-process, DB unique constraint across servers.
```

---

## Part 2: Tier-1 questions

### 1. Parking lot

| Item | Notes |
|---|---|
| Core entities | `ParkingLot`, `ParkingFloor`, `ParkingSpot`, `Vehicle`, `Ticket`, `Gate`, `Payment`, `PricingStrategy` |
| Relationships | Lot ◆ floors ◆ spots; ticket associates vehicle + spot + entry time; gate uses lot service |
| Patterns that fit | Strategy for pricing / spot search; Factory for vehicle or spot creation; Singleton only if asked for one lot instance |
| Tricky part | Put fit rules in `ParkingSpot::canFit(const Vehicle&)`, not in a giant manager. Track active tickets safely. |
| Classic follow-ups | EV charging spots; lost ticket; multiple entry/exit gates with concurrency |
| Free breakdown | [Awesome LLD: parking-lot.md](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/parking-lot.md) — headings verified via GitHub API: Requirements, UML Class Diagram, Implementations, Classes / Interfaces / Enumerations |

Practice core:

```text
park(vehicle) -> optional<Ticket>
checkout(ticketId) -> amount
```

### 2. Elevator

| Item | Notes |
|---|---|
| Core entities | `Elevator`, `ElevatorController`, `Request`, `Button`, `Door`, `Display`, `SchedulingStrategy` |
| Relationships | Controller owns elevators; elevator has current floor, direction, requests; buttons create requests |
| Patterns that fit | Strategy for scheduling; State for moving/idle/door-open; Command for queued requests |
| Tricky part | Directional requests: hall call ("up from 3") differs from car call ("go to 7"). |
| Classic follow-ups | nearest vs SCAN scheduling; emergency/maintenance mode; multiple elevators and starvation |
| Free breakdown | [Hello Interview: Elevator](https://www.hellointerview.com/learn/low-level-design/problem-breakdowns/elevator) — headings verified: Understanding the Problem, Requirements, Core Entities and Relationships, Class Design, ElevatorController, Elevator |
| Extra | [Awesome LLD: elevator-system.md](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/elevator-system.md) |

**Interview line:** "The scheduler is a Strategy; elevator movement itself can be a small state machine."

### 3. Movie ticket booking / BookMyShow

| Item | Notes |
|---|---|
| Core entities | `Movie`, `Cinema`, `Screen`, `Show`, `Seat`, `SeatInventory`, `Hold`, `Booking`, `Payment`, `User` |
| Relationships | Cinema ◆ screens ◆ seats; show uses a screen; booking ◆ tickets; hold associates user + seats + expiry |
| Patterns that fit | Strategy for seat selection/pricing; State for booking lifecycle; Observer for booking notifications |
| Tricky part | No double booking. Hold expiry and payment confirmation must be consistent. |
| Classic follow-ups | concurrent holds; hold timeout; partial seat failure; cancellation/refund |
| Free breakdown | [Awesome LLD: movie-ticket-booking-system.md](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/movie-ticket-booking-system.md) |

Concurrency answer:

```text
Single process: per-seat locks acquired in sorted order.
Multi-server: DB transaction / unique(show_id, seat_id) / conditional update is source of truth.
```

### 4. Vending machine

| Item | Notes |
|---|---|
| Core entities | `VendingMachine`, `Inventory`, `Item`, `Slot`, `Money`, `Payment`, `MachineState` |
| Relationships | Machine ◆ inventory ◆ slots; machine owns current state; state operates on machine |
| Patterns that fit | State is the main pattern; Strategy for pricing/discounts; Command if dispensing is queued |
| Tricky part | Invalid operations by state: select before payment, refund after dispense, sold out. |
| Classic follow-ups | refund/change calculation; out-of-stock; card payment; admin restock mode |
| Free breakdown | [Awesome LLD: vending-machine.md](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/vending-machine.md) |

Use State classes if the interviewer asks for rich lifecycle behaviour; otherwise `enum class State` is acceptable for a smaller version.

### 5. LRU cache

| Item | Notes |
|---|---|
| Core entities | `LruCache<K,V>`, hash map, doubly-linked list |
| Relationships | map key → list iterator; list stores most-recent at front, least-recent at back |
| Patterns that fit | Usually no GoF pattern; optionally Template Method for eviction policy base, Strategy for eviction policy |
| Tricky part | `get()` must update recency; `put()` must update existing keys and evict at capacity. Map/list consistency is one invariant. |
| Classic follow-ups | thread-safe LRU; TTL + LRU; LFU; generic template |
| Free breakdown | [Awesome LLD: lru-cache.md](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/lru-cache.md) |

Thread-safe answer: protect both map and list with the same mutex. Do not lock only the map.

### 6. Rate limiter class

| Item | Notes |
|---|---|
| Core entities | `RateLimiter`, `RateLimitStrategy`, `RequestContext`, per-user bucket/window state |
| Relationships | limiter owns strategy; strategy owns or receives storage for counters/buckets |
| Patterns that fit | Strategy for fixed window / sliding window / token bucket; Factory for limiter config |
| Tricky part | Time source injection for testability; concurrency around per-user counters. |
| Classic follow-ups | token bucket vs sliding window; per-user vs global limits; thread-safe implementation; cleanup old keys |
| Free breakdown | [Chandan-004 Rate-Limiter](https://github.com/Chandan-004/Rate-Limiter) — free C++ repo for class-level practice; use your HLD rate-limiter notes separately if doing the distributed version |

For class-level LLD, implement token bucket with `lastRefillTime`, `tokens`, and a mutex per key or one coarse mutex first.

### 7. Splitwise

| Item | Notes |
|---|---|
| Core entities | `User`, `Group`, `Expense`, `Split`, `BalanceSheet`, `Settlement`, `Payment` |
| Relationships | Group aggregates users; expense ◆ splits; balance sheet maps `(from, to) -> amount` |
| Patterns that fit | Strategy for split type: equal, exact, percentage; Strategy for debt simplification |
| Tricky part | Keep balances normalized: if A owes B 100, do not also store B owes A -100 inconsistently. |
| Classic follow-ups | simplify debts; multi-currency; expense comments/notifications |
| Free breakdown | [Awesome LLD: splitwise.md](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/splitwise.md) |

**Interview line:** "An expense is immutable after creation; derived balances can be updated transactionally or recomputed for correctness."

### 8. Tic-tac-toe / Connect Four / Snake & Ladder

| Item | Notes |
|---|---|
| Core entities | `Game`, `Board`, `Cell`, `Player`, `Move`, `WinStrategy`, `Dice` / `Jumper` for Snake & Ladder |
| Relationships | Game ◆ board; game has players; moves update board; win strategy reads board |
| Patterns that fit | Strategy for win detection / bot moves; State for game lifecycle; Template Method for turn loop |
| Tricky part | Keep move validation in board/game, not in UI. Detect winner efficiently without over-building. |
| Classic follow-ups | variable board size; undo; bot player; Connect Four gravity; Snake & Ladder multiple dice |
| Free breakdown | [Hello Interview: Connect Four](https://www.hellointerview.com/learn/low-level-design/problem-breakdowns/connect-four) — headings verified: Requirements, Core Entities and Relationships, Class Design, Game, Board; also [Awesome Tic-tac-toe](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/tic-tac-toe.md) and [Snake & Ladder](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/snake-and-ladder.md) |

For Connect Four, the board owns gravity: a move chooses a column; the board decides the row.

### 9. Logging framework

| Item | Notes |
|---|---|
| Core entities | `Logger`, `LogLevel`, `Appender`, `Formatter`, `LogEvent`, `LogManager` |
| Relationships | logger has appenders; appender has formatter; chain may filter by level |
| Patterns that fit | Chain of Responsibility for levels/filters; Singleton for root logger; Strategy for formatter; Observer-ish fan-out to appenders |
| Tricky part | Clarify whether all appenders receive an event or first handler stops it. |
| Classic follow-ups | async logging; file rotation; dynamic log levels; multiple formatters |
| Free breakdown | [Awesome LLD: logging-framework.md](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/logging-framework.md) |

Async follow-up: write to a blocking queue; one worker flushes to appenders.

### 10. Pub-sub / notification

| Item | Notes |
|---|---|
| Core entities | `Topic`, `Publisher`, `Subscriber`, `Message`, `Broker`, `Subscription`, `NotificationChannel` |
| Relationships | broker owns topics; topic has subscribers; subscriber consumes messages |
| Patterns that fit | Observer for in-process pub-sub; Strategy for delivery channel; Command for queued delivery jobs |
| Tricky part | In-process observer vs real broker. Decide if persistence/retry/order is in scope. |
| Classic follow-ups | durable subscriptions; retry/DLQ; ordering per topic; slow subscriber |
| Free breakdown | [Awesome LLD: pub-sub-system.md](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/pub-sub-system.md) |

For notification system, split "preference + template + channel" from the core publish/subscribe mechanism.

---

## Part 3: Tier-2 questions

### 11. Library management

| Item | Notes |
|---|---|
| Core entities | `Book`, `BookItem` (copy), `Member`, `Librarian`, `Loan`, `Reservation`, `FinePolicy` |
| Relationships | book has many physical copies; loan associates member + copy; reservation queues members |
| Patterns that fit | Strategy for fine policy; State for book copy status; Observer for due-date reminders |
| Tricky part | Distinguish title (`Book`) from physical copy (`BookItem`) with barcode. |
| Classic follow-ups | reserve unavailable book; overdue fine; multiple branches |
| Free breakdown | [Awesome LLD: library-management-system.md](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/library-management-system.md) |

### 12. ATM

| Item | Notes |
|---|---|
| Core entities | `ATM`, `Card`, `Account`, `BankService`, `CashDispenser`, `Transaction`, `AtmState` |
| Relationships | ATM uses bank service; transaction operates on account; dispenser owns cash inventory |
| Patterns that fit | State for card inserted / authenticated / transaction selected; Chain for validation; Strategy for cash dispensing |
| Tricky part | Separate ATM machine state from bank account state. Cash dispense must match account debit outcome. |
| Classic follow-ups | insufficient cash denominations; network failure after debit; deposit flow |
| Free breakdown | [Awesome LLD: atm.md](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/atm.md) |

### 13. Hotel / car rental

| Item | Notes |
|---|---|
| Core entities | Hotel: `Hotel`, `Room`, `RoomType`, `Reservation`, `Guest`, `Payment`; Car rental: `Vehicle`, `Branch`, `Reservation`, `Customer`, `PricingPolicy` |
| Relationships | hotel ◆ rooms; reservation associates guest + room + date range; branch owns vehicles |
| Patterns that fit | Strategy for pricing; State for reservation lifecycle; Factory for vehicle/room types |
| Tricky part | Date-range availability. You cannot just store one status on a room/car. |
| Classic follow-ups | search by date range; cancellation fee; upgrade room/car; overbooking |
| Free breakdown | [Awesome hotel-management-system.md](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/hotel-management-system.md) and [car-rental-system.md](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/car-rental-system.md) |

Use an interval/calendar per resource or a repository query that checks overlapping reservations.

### 14. Inventory

| Item | Notes |
|---|---|
| Core entities | `Product`, `Sku`, `Warehouse`, `InventoryItem`, `StockLedger`, `Reservation`, `ReorderPolicy` |
| Relationships | warehouse has stock by SKU; ledger records immutable adjustments; reservation holds quantity for an order |
| Patterns that fit | Strategy for reorder policy; Observer for low-stock alerts; Command for stock adjustment |
| Tricky part | Prevent negative stock under concurrency. Ledger + current stock must stay consistent. |
| Classic follow-ups | transfer between warehouses; low-stock alert; expiry/batches; concurrent orders |
| Free breakdown | [Hello Interview: Inventory Management](https://www.hellointerview.com/learn/low-level-design/problem-breakdowns/inventory-management) — headings verified: Requirements, Core Entities and Relationships, Class Design; Awesome closest variant: [online-shopping-service.md](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/online-shopping-service.md) |

### 15. In-memory file system

| Item | Notes |
|---|---|
| Core entities | `FileSystem`, `Node`, `File`, `Directory`, `Path`, `Permission` |
| Relationships | directory ◆ child nodes; file and directory inherit/implement `Node` |
| Patterns that fit | Composite is the main pattern; Iterator for traversal; Strategy for permission policy |
| Tricky part | Path parsing, duplicate names, and distinguishing file vs directory operations. |
| Classic follow-ups | `ls`, `mkdir -p`, move/copy, permissions, file content chunks |
| Free breakdown | [doocs LeetCode 588: Design In-Memory File System](https://github.com/doocs/leetcode/blob/main/solution/0500-0599/0588.Design%20In-Memory%20File%20System/README_EN.md) — headings verified: Description, Solutions; Awesome repo does not currently list this exact problem in `problems/`. |

Accuracy note: do not pretend this is the same as a disk file system. It is usually an in-memory tree exercise.

### 16. Amazon locker

| Item | Notes |
|---|---|
| Core entities | `Locker`, `Compartment`, `Package`, `AccessToken`, `DeliveryAgent`, `Customer`, `Notification` |
| Relationships | locker ◆ compartments; package assigned to compartment; access token opens one package/compartment |
| Patterns that fit | Strategy for compartment selection; State for package lifecycle; Observer for pickup notification |
| Tricky part | Fit package to compartment size and expire pickup tokens. |
| Classic follow-ups | no locker available; OTP expiry; returns; multiple packages in one order |
| Free breakdown | [Hello Interview: Amazon Locker](https://www.hellointerview.com/learn/low-level-design/problem-breakdowns/amazon-locker) — headings verified: Requirements, Core Entities and Relationships, Class Design, Locker, AccessToken, Compartment |

### 17. Stack Overflow

| Item | Notes |
|---|---|
| Core entities | `User`, `Question`, `Answer`, `Comment`, `Vote`, `Tag`, `Badge`, `ReputationService` |
| Relationships | question ◆ answers/comments; answer ◆ comments; votes associate user + target; tags aggregate questions |
| Patterns that fit | Strategy for reputation scoring; Observer for badges/notifications; State for question status |
| Tricky part | Voting rules: one vote per user per target; reputation changes must be consistent. |
| Classic follow-ups | accepted answer; badges; search by tags; moderation |
| Free breakdown | [Awesome LLD: stack-overflow.md](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/stack-overflow.md) |

### 18. Task manager / Jira-lite

| Item | Notes |
|---|---|
| Core entities | `User`, `Project`, `Task`, `Sprint`, `Comment`, `Attachment`, `Workflow`, `TaskState` |
| Relationships | project ◆ tasks; task has assignee/reporter; task has comments; workflow controls transitions |
| Patterns that fit | State for task lifecycle; Observer for notifications; Strategy for priority/assignment |
| Tricky part | Workflow transitions and permission checks. A status is not just a string. |
| Classic follow-ups | subtasks; custom workflow; activity feed; search/filter |
| Free breakdown | [Awesome LLD: task-management-system.md](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/task-management-system.md) |

### 19. Chess

| Item | Notes |
|---|---|
| Core entities | `Game`, `Board`, `Cell`, `Piece`, `Move`, `Player`, `MoveValidator`, `GameState` |
| Relationships | game ◆ board; board has pieces; piece has movement strategy or subclasses |
| Patterns that fit | Strategy for piece movement; State for game status; Command for moves/undo |
| Tricky part | Valid moves are not just piece movement: check, checkmate, castling, en passant, promotion. |
| Classic follow-ups | undo; timer; draw conditions; online two-player |
| Free breakdown | [Awesome LLD: chess-game.md](https://github.com/ashishps1/awesome-low-level-design/blob/main/problems/chess-game.md) |

In a 45-minute round, explicitly scope special rules. Implementing full chess is too large.

---

## Part 4: pattern map by question

| Pattern | Questions where it naturally fits |
|---|---|
| Strategy | Parking pricing, elevator scheduling, rate limiter, Splitwise splits, room/car pricing, inventory reorder, chess movement |
| State | Vending machine, elevator, booking/order lifecycle, ATM, task workflow, game state |
| Observer | Notification, pub-sub, booking notifications, low-stock alerts, badges |
| Command | Undo/redo, job queue, game move, stock adjustment, async notifications |
| Chain of Responsibility | Logging, middleware, ATM validation, approval flows |
| Template Method | Game loop, report/import pipeline, ATM transaction skeleton |
| Composite | In-memory file system, menus/categories, organization trees |
| Factory/Builder | Construct vehicles/items/config-heavy domain objects |
| Singleton | Logger/config only when justified; prefer DI |

---

## Part 5: self-rating rubric

After every practice attempt, score yourself out of 20.

| Area | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| Requirements | jumped into code | asked 1–2 | covered basics | scoped well | scoped + trade-offs |
| Entities | god class | missing key entities | mostly okay | clean responsibilities | excellent invariants |
| Relationships | unclear ownership | some links | mostly correct | UML clear | ownership/lifetimes precise |
| Extensibility | hard-coded | one pattern forced | some variation points | patterns fit | follow-ups are local changes |
| Correctness | missed edge cases | found obvious | decent | concurrency/invalid states covered | production-grade caveats |

Interpretation:

- **0–8:** reread [L1 Delivery](L1-Delivery.md), [L2](L2-OOP-SOLID.md), and redo the same question.
- **9–14:** acceptable base; practise follow-ups.
- **15–18:** interview-ready for that question.
- **19–20:** strong; redo later in Java when your Java track starts.

### Weekly routine

- Mon–Thu: one 45-minute question attempt + 10-minute review.
- Fri: redo the hardest follow-up in code.
- Sat: read one reference solution and write "what I missed".
- Sun: redo one old question from memory without looking.

---

## Part 6: choosing in an interview / cheat sheet

| Prompt shape | Start with | Code this first |
|---|---|---|
| Physical resources (parking, hotel, locker) | resource, reservation, status/lifecycle | reserve/release |
| Game | game, board, player, move, win strategy | makeMove |
| Cache/rate limiter | data structure + policy | get/put or allowRequest |
| Workflow (ATM, task, vending) | states + valid transitions | transition method |
| Notification/pub-sub | topic, subscriber, message | subscribe/publish |
| Money/splitwise | ledger/balance invariant | addExpense/settle |

### Common interview traps

- Reading solutions before attempting the question.
- Treating all relationships as inheritance. Most are composition or association.
- Forgetting that "copy of a book" and "book title" are different.
- Storing one `available` boolean for date-range booking problems.
- Overusing Singleton because many GitHub solutions do.
- Ignoring concurrency in booking/inventory/cache problems.
- Coding every getter/setter instead of the one risky flow.

---

## Self-test (answer out loud first, then open)

<details><summary>1. In BookMyShow, why is <code>Seat.status</code> alone not enough in a real system?</summary>

Because multiple app servers can race. In-memory status is useful inside one process, but the database must enforce a conditional update or unique active hold/booking for `(show_id, seat_id)`.
</details>

<details><summary>2. Parking lot: where should the "can a car fit in this spot?" rule live?</summary>

In `ParkingSpot::canFit(const Vehicle&)` or a closely related policy, not in a god `ParkingManager`. The spot owns its size/availability invariant.
</details>

<details><summary>3. Which question is the clearest State-pattern practice?</summary>

Vending machine. ATM, elevator, task workflow and booking lifecycle are also good, but vending machine is the cleanest small state machine.
</details>

<details><summary>4. Library system: why split <code>Book</code> and <code>BookItem</code>?</summary>

`Book` is the title/metadata (ISBN, author). `BookItem` is a physical copy with barcode, rack location and loan status. Loans attach to copies, not titles.
</details>

<details><summary>5. LRU cache: what invariant must one lock protect in a thread-safe version?</summary>

The map and linked list together. A key's map iterator must point to the correct list node, and recency updates must change both consistently.
</details>

<details><summary>6. Hotel/car rental: why is a single status field weak?</summary>

Availability depends on date ranges. A room/car can be booked tomorrow and available today, so you need reservations/interval checks, not one global available flag.
</details>

<details><summary>7. Pub-sub: when is Observer enough and when do you need a broker?</summary>

Observer is enough for in-process notifications. A broker is needed for durability, retries, cross-process delivery, slow consumers or replay.
</details>

<details><summary>8. What should you do before reading any reference solution?</summary>

Run the 45-minute drill yourself: clarify, draw entities, write the core flow, list follow-ups. Then read the solution and note what you missed.
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
| [Hello Interview: Elevator](https://www.hellointerview.com/learn/low-level-design/problem-breakdowns/elevator) | Understanding the Problem → Requirements → Core Entities and Relationships → Class Design | ~45 min |
| [Hello Interview: Connect Four](https://www.hellointerview.com/learn/low-level-design/problem-breakdowns/connect-four) | Requirements → Core Entities and Relationships → Class Design → Game → Board | ~45 min |
| [Hello Interview: Amazon Locker](https://www.hellointerview.com/learn/low-level-design/problem-breakdowns/amazon-locker) | Requirements → Core Entities and Relationships → Class Design → Locker → AccessToken → Compartment | ~45 min |
| [Hello Interview: Inventory Management](https://www.hellointerview.com/learn/low-level-design/problem-breakdowns/inventory-management) | Requirements → Core Entities and Relationships → Class Design | ~45 min |
| [Awesome Low-Level Design: problems directory](https://github.com/ashishps1/awesome-low-level-design/tree/main/problems) | Problem statements and UML/code headings. Directory verified through GitHub API; each linked problem above exists in `problems/`. | Use after your own attempt |
| [Awesome Low-Level Design: GitHub API directory listing](https://api.github.com/repos/ashishps1/awesome-low-level-design/contents/problems) | Use to verify exact filenames: `parking-lot.md`, `elevator-system.md`, `movie-ticket-booking-system.md`, etc. | Reference |
| [Chandan-004 Rate-Limiter](https://github.com/Chandan-004/Rate-Limiter) | Free C++ rate limiter implementation for class-level practice | ~30 min |
| [doocs LeetCode 588: Design In-Memory File System](https://github.com/doocs/leetcode/blob/main/solution/0500-0599/0588.Design%20In-Memory%20File%20System/README_EN.md) | Free file-system tree exercise; useful for Composite practice | ~30 min |

**Connects to:** [L1 Delivery](L1-Delivery.md) · [L2 OOP + SOLID](L2-OOP-SOLID.md) · [L3b Behavioral Patterns](L3b-Behavioral-Patterns.md) · [L4 Concurrency](L4-Concurrency.md) · Questions: all LLD Tier-1 and Tier-2 in roadmap §1.4
