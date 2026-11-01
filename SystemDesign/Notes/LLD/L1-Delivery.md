# L1 · Delivery: how to run a calm 45–60 minute LLD interview

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Parking lot (LLD Tier 1), Elevator (LLD Tier 1), BookMyShow / movie ticket booking (LLD Tier 1), Vending machine (LLD Tier 1), Library management (LLD Tier 2), every LLD/OOD round.

---

## Why this topic matters

Most LLD failures are not C++ failures. They are **delivery failures**: jumping into code too early, drawing a giant class diagram nobody can use, forcing patterns, or running out of time before the core flow works.

A good 45–60 minute LLD answer has a rhythm:

| Phase | Output | What the interviewer learns |
|---|---|---|
| Clarify | A small agreed spec | You can control ambiguity |
| Model | Entities, relationships, ownership | You understand OOP boundaries |
| Design | Class APIs + ASCII UML | You can turn nouns/verbs into code |
| Implement | Core happy path + edge cases | You can write practical C++ |
| Verify | One traced scenario | You debug your own design |
| Extend | Clean follow-ups | Your design survives change |

**Interview line:** "I'll first lock the scope, then model the core entities and one main use case. I won't introduce a pattern unless the requirements show a real variation point."

---

## Part 1: the 45–60 minute time budget

Use this as your default pacing. If the interviewer interrupts, follow them, but keep this map in your head.

| Time | What to do | Avoid |
|---|---|---|
| 0–5 min | Clarify requirements and scope | Asking 15 vague questions |
| 5–10 min | Identify entities and relationships | Full UML ceremony |
| 10–22 min | Define class APIs + ASCII diagram | Private fields for every trivial DTO first |
| 22–40 min | Code the core flow | Coding every getter/setter |
| 40–45 min | Walk through one use case | Saying "it should work" |
| 45–60 min | Follow-ups: extension, concurrency, persistence | Rewriting everything |

For a 45-minute interview, code one core path deeply. For a 60-minute interview, add one follow-up and a concurrency discussion.

A clean answer sounds like a product engineer thinking out loud, not a student reciting patterns:

> "For the first version, I'll keep storage in memory and ignore UI/networking. The core operation is `borrowBook(memberId, isbn)`, so I'll design around that and leave persistence behind a repository if needed."

---

## Part 2: clarify requirements and scope

The prompt is intentionally tiny: "Design a parking lot", "Design a library", "Design a vending machine". Your first job is to convert it into a spec.

Ask questions in four buckets:

| Bucket | Questions | Example: Library |
|---|---|---|
| Primary capabilities | What operations must users perform? | Search, borrow, return, reserve? |
| Rules and completion | When does an action succeed/fail? | Max active loans? Due date? One copy per member? |
| Error handling | What invalid actions matter? | Copy unavailable, unknown member, overdue? |
| Scope boundaries | What are we explicitly not building? | UI, database, payment, auth, notifications? |

Keep this short. Interviewers don't want a questionnaire; they want evidence that you can narrow the problem.

### Write a small spec on the board

For a library opening, a good first spec is:

- Members can borrow and return physical book copies.
- A book title can have multiple copies.
- A copy is either available or borrowed.
- A member can have up to 5 active loans.
- Ignore UI, persistence, fines and reservations for version 1.

That spec is enough to design and code.

**Interview line:** "I'll treat `Book` as bibliographic metadata and `BookCopy` as the physical thing that changes availability. That avoids mixing title-level data with copy-level state."

### The scope sentence

Always say one sentence that protects you from over-building:

> "I'll design the in-memory domain model first. If time remains, I'll show where persistence, concurrency and notifications plug in."

This is KISS + YAGNI from [L2 OOP + SOLID](L2-OOP-SOLID.md), applied under time pressure.

---

## Part 3: identify entities/nouns and behaviours/verbs

Scan the requirements.

- **Nouns** are candidate entities: `Library`, `Book`, `BookCopy`, `Member`, `Loan`.
- **Verbs** are candidate behaviours: `search`, `borrow`, `return`, `reserve`, `renew`.
- **Rules** tell you where behaviour belongs: max loans belongs near `Member` or `Library`, availability belongs near `BookCopy`.

Do not turn every noun into a class. Use this filter:

| If it... | Then... |
|---|---|
| Owns changing state or enforces a rule | Make it an entity/class |
| Is just a label/value | Make it a field or value object |
| Is an algorithm that varies | Make it an interface/strategy |
| Coordinates a workflow | Make it a service/orchestrator |

For library:

| Candidate | Keep? | Why |
|---|---|---|
| `Book` | yes | metadata: ISBN, title, author |
| `BookCopy` | yes | state changes: available/borrowed |
| `Member` | yes | active-loan limit |
| `Loan` | yes | ties copy + member + due date |
| `Shelf` | no for v1 | physical placement not in requirements |
| `FineCalculator` | no for v1 | fines out of scope; later Strategy if needed |

### Ownership and relationships

Once entities are named, decide ownership. C++ makes this concrete:

| Relationship | Meaning | C++ representation |
|---|---|---|
| Composition | whole owns part | member by value or `std::unique_ptr` |
| Association | knows/refers to | ID, raw pointer/reference, or `std::weak_ptr` |
| Dependency | uses temporarily | function parameter |
| Inheritance | is-a | `: public Base`, only for stable type hierarchies |

In interview code, IDs are often cleaner than pointers. A `Loan` with `memberId` and `copyId` mirrors a database row and avoids dangling pointers.

---

## Part 4: define relationships and draw an ASCII class diagram

Don't draw academic UML. Draw boxes, fields, important methods and arrows. The goal is to let the interviewer follow the design.

For the library mini-example:

```text
+------------------+        owns         +------------------+
| Library          | ◆-----------------> | BookCopy         |
| - booksByIsbn    |                     | - id             |
| - copiesById     |                     | - isbn           |
| - membersById    |                     | - status         |
| - activeLoans    |                     | + isAvailable()  |
| + addBookCopy()  |                     | + markBorrowed() |
| + borrowBook()   |                     +------------------+
| + returnCopy()   |
+--------+---------+
         |
         | uses / owns records
         v
+------------------+       +------------------+
| Loan             |       | Member           |
| - id             |       | - id             |
| - memberId       |       | - activeLoanIds  |
| - copyId         |       | + canBorrow()    |
| - status         |       | + addLoan()      |
+------------------+       +------------------+

Book is metadata: isbn, title, author. BookCopy points to isbn.
```

Notice two things:

1. `Library` is the orchestrator/facade. It coordinates the workflow.
2. Rules stay near the state they protect: `BookCopy` owns availability; `Member` owns loan limit.

**Interview line:** "This is simplified UML: composition from `Library` to the objects it owns, associations by ID between `Loan`, `Member` and `BookCopy`. I'll now code the `borrowBook` flow because it exercises the design."

---

## Part 5: pick patterns only where variation exists

Patterns are tools, not decorations. In a delivery round, the interviewer grades whether your design can change cleanly. A pattern helps only when it isolates a real axis of change.

| Requirement signal | Pattern that fits | Why |
|---|---|---|
| Multiple pricing rules | Strategy | Swap `PricingStrategy` without editing checkout |
| Object has states and allowed transitions | State / state machine | Vending machine, elevator, booking lifecycle |
| Many components react to an event | Observer | Order confirmed → notification, analytics, inventory |
| Need to create subtype from input | Factory / registry | Payment method, notification channel, vehicle type |
| Need optional stackable behaviours | Decorator | Logging, caching, compression, pricing add-ons |
| Tree-like part/whole | Composite | File system, menu, org chart |
| Undo/redo actions | Command | Store executed commands and reverse them |

In the library v1, we need almost no patterns. If fines enter scope, `FinePolicy` can be a Strategy. If notifications enter scope, `LoanObserver` can be Observer. If persistence enters scope, repositories use DIP.

### Pattern-itis: the common failure

Bad answer:

> "I'll use Singleton for Library, Factory for every entity, Builder for Book, Observer for returns..."

Better answer:

> "For v1, normal constructors are enough. If later fine calculation varies by member type or overdue duration, I'll introduce a `FinePolicy` strategy."

That sentence shows maturity.

---

## Part 6: write core C++17 code, not all code

Write the code that proves the design. Use modern C++ defaults from [L0 C++ OOP](L0-Cpp-OOP-for-LLD.md): `enum class`, `override` when polymorphic, `std::unique_ptr` for ownership, no raw owning `new`.

Here is a compact library core. It is intentionally in-memory because the interview is about object design, not databases.

```cpp
#include <algorithm>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

using Id = int;

enum class CopyStatus { Available, Borrowed };
enum class LoanStatus { Active, Closed };

struct Book {
    std::string isbn;
    std::string title;
    std::string author;
};

class BookCopy {
public:
    BookCopy(Id id, std::string isbn) : id_(id), isbn_(std::move(isbn)) {}
    Id id() const { return id_; }
    const std::string& isbn() const { return isbn_; }
    bool isAvailable() const { return status_ == CopyStatus::Available; }
    void markBorrowed() {
        if (!isAvailable()) throw std::logic_error("copy is not available");
        status_ = CopyStatus::Borrowed;
    }
    void markReturned() { status_ = CopyStatus::Available; }
private:
    Id id_;
    std::string isbn_;
    CopyStatus status_ = CopyStatus::Available;
};

struct Loan {
    Id id;
    Id memberId;
    Id copyId;
    LoanStatus status = LoanStatus::Active;
};

class Member {
public:
    explicit Member(Id id) : id_(id) {}
    Id id() const { return id_; }
    bool canBorrow() const { return activeLoanIds_.size() < kMaxLoans; }
    void addLoan(Id loanId) {
        if (!canBorrow()) throw std::logic_error("loan limit reached");
        activeLoanIds_.push_back(loanId);
    }
    void closeLoan(Id loanId) {
        activeLoanIds_.erase(
            std::remove(activeLoanIds_.begin(), activeLoanIds_.end(), loanId),
            activeLoanIds_.end());
    }
private:
    static constexpr std::size_t kMaxLoans = 5;
    Id id_;
    std::vector<Id> activeLoanIds_;
};

class Library {
public:
    void addBook(Book book) {
        std::string isbn = book.isbn;
        booksByIsbn_[isbn] = std::move(book);
    }
    void addMember(Id memberId) { members_.emplace(memberId, Member(memberId)); }
    void addCopy(Id copyId, const std::string& isbn) {
        if (booksByIsbn_.count(isbn) == 0) throw std::invalid_argument("unknown isbn");
        copies_.emplace(copyId, BookCopy(copyId, isbn));
    }

    Id borrowBook(Id memberId, const std::string& isbn) {
        Member& member = getMember(memberId);
        if (!member.canBorrow()) throw std::logic_error("loan limit reached");

        BookCopy& copy = findAvailableCopy(isbn);
        copy.markBorrowed();

        Id loanId = nextLoanId_++;
        loans_.emplace(loanId, Loan{loanId, memberId, copy.id(), LoanStatus::Active});
        member.addLoan(loanId);
        return loanId;
    }

    void returnCopy(Id loanId) {
        auto it = loans_.find(loanId);
        if (it == loans_.end() || it->second.status != LoanStatus::Active) {
            throw std::invalid_argument("active loan not found");
        }
        Loan& loan = it->second;
        copies_.at(loan.copyId).markReturned();
        members_.at(loan.memberId).closeLoan(loan.id);
        loan.status = LoanStatus::Closed;
    }
private:
    Member& getMember(Id id) { return members_.at(id); }
    BookCopy& findAvailableCopy(const std::string& isbn) {
        for (auto& entry : copies_) {
            BookCopy& copy = entry.second;
            if (copy.isbn() == isbn && copy.isAvailable()) return copy;
        }
        throw std::logic_error("no copy available");
    }

    std::unordered_map<std::string, Book> booksByIsbn_;
    std::unordered_map<Id, BookCopy> copies_;
    std::unordered_map<Id, Member> members_;
    std::unordered_map<Id, Loan> loans_;
    Id nextLoanId_ = 1;
};
```

One practical C++ note: this snippet uses `std::unordered_map::emplace`, so `Member` and `BookCopy` do not need default constructors. In quick whiteboard code, interviewers are fine if you skip includes, but in real C++ the details matter.

---

## Part 7: walk through one use case and debug out loud

After code, spend 1–2 minutes proving the design.

For the library:

```text
Initial:
- Book ISBN-1 exists.
- Copy #10 of ISBN-1 is Available.
- Member #7 has 0 active loans.

Call borrowBook(7, "ISBN-1"):
1. Library finds Member #7.
2. Member can borrow because activeLoanIds.size() < 5.
3. Library finds available Copy #10.
4. Copy #10 moves Available -> Borrowed.
5. Library creates Loan #1 {member=7, copy=10, Active}.
6. Member records Loan #1.
7. Return loanId=1.

Call returnCopy(1):
1. Loan #1 is active.
2. Copy #10 moves Borrowed -> Available.
3. Member #7 removes Loan #1.
4. Loan #1 moves Active -> Closed.
```

Then mention edge cases:

- Unknown member → reject.
- Unknown ISBN → reject.
- No available copy → reject.
- Member over limit → reject.
- Returning a closed/unknown loan → reject.

This walkthrough often catches bugs. If you discover one, fix it calmly. That is a positive signal.

**Interview line:** "I'll trace one normal borrow-return flow, then list the rejected operations. That verifies the state transitions before we discuss extensions."

---

## Part 8: handle extensions and follow-ups

Follow-ups test whether your boundaries were good.

| Follow-up | Clean change |
|---|---|
| Fines for overdue returns | Add `FinePolicy` Strategy; `Library::returnCopy` calls it after closing loan |
| Reservations / holds | Add `Reservation` entity and copy/member queues |
| Search by title/author | Add `BookCatalog` or indexes; don't overload `Library` forever |
| Notifications | Add Observer: `LoanEventListener` for email/SMS |
| Persistence | Add `BookRepository`, `LoanRepository`; inject interfaces into `LibraryService` |
| Multiple branches | Add `Branch`; `BookCopy` belongs to a branch |
| Concurrency | Lock per copy or perform DB transaction with row lock/CAS |

Say where it plugs in, not full code. For example:

> "Fines are a variation point, so I won't hard-code them in `returnCopy`. I'd introduce `struct FinePolicy { virtual Money calculate(const Loan&) const = 0; }` and inject it into `Library`."

That is enough.

---

## Part 9: concurrency discussion without over-building

Most LLD prompts are single-process unless stated. Still, you should be ready for the follow-up: "What if two users borrow the last copy at the same time?"

For in-memory C++:

- Protect the critical section with a `std::mutex` around checking availability and marking borrowed.
- Prefer narrower locks: lock per `BookCopy` or per ISBN bucket if needed.
- Keep the operation atomic: check availability, change status, create loan and attach to member must succeed together or roll back.

For production persistence:

- Use a database transaction.
- Lock the copy row (`SELECT ... FOR UPDATE`) or use optimistic version/CAS.
- Put a unique constraint that prevents two active loans for one copy.

Do not implement concurrency unless asked. Say the boundary clearly:

**Interview line:** "This in-memory version is not thread-safe. If concurrent borrow is in scope, the critical section is `find available copy -> mark borrowed -> create loan`; I'd protect that with a mutex here, or with a DB transaction and row lock in production."

This connects directly to L4 Concurrency later.

---

## Part 10: what interviewers grade / cheat sheet

| Dimension | Strong signal | Weak signal |
|---|---|---|
| Scope control | Confirms a small spec | Designs everything in the real world |
| OOP modelling | Behaviour lives with state | Anemic data classes + god manager |
| Extensibility | Interfaces only at variation points | Pattern-itis everywhere |
| Code | Core flow is readable and edge cases exist | Only diagrams, no logic |
| Communication | Thinks out loud and verifies | Silent coding for 25 minutes |
| Trade-offs | Explains choices | Claims one perfect design |

### Common interview traps

- Starting with code before agreeing on requirements.
- Drawing a perfect UML diagram but never implementing the core flow.
- Using Singleton for orchestrators because "there is only one". Pass dependencies instead.
- Creating inheritance hierarchies for every noun.
- Forgetting ownership: who owns a `Spot`, `Ticket`, `Loan`, `Seat`?
- Ignoring invalid operations and state transitions.
- Not walking through a concrete use case.

### Final 60-second template

```text
1. Scope: "I'll support X and Y; exclude UI, DB and auth for now."
2. Entities: "The main nouns are A, B, C. A owns B; C references B by ID."
3. Variation: "Only pricing/payment varies, so only that gets an interface."
4. Code: "I'll implement the main operation because it exercises the design."
5. Verify: "Let's trace one happy path and the main failures."
6. Extend: "For follow-up Z, this class changes / this interface gets a new implementation."
```

---

## Self-test (answer out loud first, then open)

<details><summary>1. In the first 5 minutes of an LLD interview, what are you trying to produce?</summary>

A small agreed spec: primary capabilities, business rules, invalid operations and explicit out-of-scope areas. The goal is not to ask every possible question; it is to make the design target unambiguous enough to model and code.
</details>

<details><summary>2. How do you decide whether a noun deserves its own class?</summary>

If it owns changing state, enforces rules, or is a stable domain concept with behaviour, make it a class. If it is just information attached to another object, keep it as a field/value. If it is an algorithm that varies, use an interface/strategy.
</details>

<details><summary>3. Why is <code>Book</code> different from <code>BookCopy</code> in the library example?</summary>

`Book` is title-level metadata: ISBN, title, author. `BookCopy` is the physical copy whose availability changes. If you merge them, multiple copies of the same title become awkward and borrowing one copy may look like borrowing the entire book.
</details>

<details><summary>4. When should you introduce a design pattern during delivery?</summary>

Only when the requirements show a real variation point or structure: varying pricing → Strategy, tree → Composite, optional stackable behaviours → Decorator, subtype creation from input → Factory, events → Observer. Don't add patterns just to name them.
</details>

<details><summary>5. What is the best method to implement first?</summary>

The core use case that exercises the design. For parking lot, `park` / `unpark`; for library, `borrowBook` / `returnCopy`; for vending machine, `selectItem` / `pay` / `dispense`. It should show state changes and collaboration between classes.
</details>

<details><summary>6. How do you discuss concurrency for "borrow the last copy" without derailing the answer?</summary>

State the critical section: check availability, mark borrowed, create loan. In memory, protect it with a mutex (ideally narrow-grained). In production, use a transaction with row lock or optimistic version/CAS plus a uniqueness constraint. Do not implement unless asked.
</details>

<details><summary>7. What are signs of a god class in LLD?</summary>

One class does validation, state storage, pricing, notification, persistence and formatting. It has too many reasons to change. Split behaviour into the entity that owns the state, an orchestrator for workflow, and small strategies/adapters for variation or external systems.
</details>

<details><summary>8. How should you handle a follow-up like "add fines"?</summary>

Point to a clean extension point. For library, add a `FinePolicy` strategy injected into the orchestrator. Existing borrow/return logic stays mostly unchanged; new fine rules are new classes.
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
| [Hello Interview LLD: Delivery](https://www.hellointerview.com/learn/low-level-design/in-a-hurry/delivery) | Verified headings: "1) Requirements", "2) Entities and Relationships", "3) Class Design", "4) Implementation", "Verification: Walk Through a Specific Scenario", "5) Extensibility" | ~30 min |
| [L0 C++ OOP for LLD](L0-Cpp-OOP-for-LLD.md) | Smart pointers, ownership, abstract classes, `enum class`, object relationships | local note |
| [L2 OOP + SOLID](L2-OOP-SOLID.md) | Encapsulation, composition over inheritance, OCP/DIP and pattern discipline | local note |

**Connects to:** [L2 OOP + SOLID](L2-OOP-SOLID.md) · [L3 Patterns](L3-Patterns.md) · [L4 Concurrency](L4-Concurrency.md) · [L5 Practice Playbook](L5-Practice-Playbook.md) · Questions: Parking lot, Elevator, BookMyShow, Vending machine, Library management
