# L3 · Patterns: the LLD pattern map, not a sticker collection

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Parking lot (LLD Tier 1), Elevator (LLD Tier 1), Vending machine (LLD Tier 1), BookMyShow (LLD Tier 1), Splitwise (LLD Tier 1), Logger (LLD Tier 1), Pub-sub / notification (LLD Tier 1), File system and Chess (LLD Tier 2).

---

## Why this topic matters

Design patterns are names for shapes you reach through good OOP: composition, abstraction and small responsibilities. In LLD interviews, patterns communicate **why a design survives follow-ups**.

But patterns are also a trap. Force them, and the interviewer hears "over-engineering".

| Good use | Bad use |
|---|---|
| "Pricing varies, so I'll inject a `PricingStrategy`." | "I'll use Strategy because parking lot uses Strategy." |
| "File system is a tree, so Composite fits." | "Every model gets a Factory and Builder." |
| "Payment gateway API differs, so Adapter isolates it." | "Singleton for anything that has one instance." |

**Interview line:** "I'll name patterns only where they explain a variation point. Design first; pattern name second."

---

## Part 1: why patterns matter

Patterns buy three things:

1. **Vocabulary:** "This is Composite" is shorter than explaining tree polymorphism from scratch.
2. **Extensibility:** many patterns are ways to keep old code closed while adding new classes.
3. **Interview speed:** if the interviewer knows it, you can move faster to trade-offs.

The frequency distribution is uneven. Strategy, State, Observer and Factory show up constantly. Prototype and Facade are useful, but rarely the centre of a solution.

### Must-know by frequency

| Frequency | Patterns | Why they appear |
|---|---|---|
| Very high | Strategy, State, Observer, Factory | Variation, state transitions, notifications, subtype creation |
| High | Command, Decorator, Chain of Responsibility, Adapter, Composite | Undo, optional layers, log pipelines, third-party APIs, trees |
| Medium | Singleton, Builder, Facade | Shared service, complex construction, clean subsystem entry |
| Low | Prototype, Proxy, Template Method | Clone, lazy/access control, fixed algorithm skeleton |

Detailed notes:

- [L3a Creational Patterns](L3a-Creational-Patterns.md): Factory, Singleton, Builder, Prototype.
- [L3b Behavioral](L3b-Behavioral-Patterns.md): Strategy, State, Observer, Command, Chain of Responsibility.
- [L3c Structural Patterns](L3c-Structural-Patterns.md): Decorator, Adapter, Composite, Facade, Proxy.

---

## Part 2: question → patterns that fit and why

Use this as an index, not a memorised answer.

| Question | Patterns that fit | Why |
|---|---|---|
| Parking lot | Strategy, Factory | Pricing/spot-selection can vary; vehicle/spot creation may come from type |
| Elevator | State, Strategy | Elevator states; scheduling algorithm varies (nearest car, SCAN, priority) |
| Vending machine | State, Strategy, Factory | Insert coin/select item/dispense transitions; payment and product creation vary |
| BookMyShow | Strategy, State, Observer | Seat allocation/pricing varies; booking lifecycle; notify user after booking |
| Splitwise | Strategy, Factory | Expense split algorithms: equal, exact, percentage; factory creates split type |
| Logger | Chain of Responsibility, Singleton, Decorator | Level pipeline; one shared logger sometimes; add timestamp/thread/context layers |
| Pub-sub / notification | Observer, Factory, Adapter | Subscribers react to event; channel factory; third-party gateways |
| File system | Composite, Iterator (language feature) | File and directory share a node interface; directory contains nodes |
| Undo/redo editor | Command, Memento (optional) | Each user action can execute and undo; history stacks |
| Notification | Observer, Decorator, Adapter | Multiple listeners; optional Slack/SMS/email wrapping; gateway mismatch |
| Rate limiter | Strategy, Singleton (careful) | Token bucket/sliding window vary; shared limiter service only if process-wide |
| Chess | State/Strategy, Factory, Template Method | Piece movement rules vary; piece factory; common move validation skeleton |

Map **requirement wording** to pattern:

| Wording | Think |
|---|---|
| "different ways to calculate / choose / dispatch" | Strategy |
| "object behaves differently in each state" | State |
| "notify many things when X happens" | Observer |
| "create concrete object based on type/config" | Factory |
| "optional features can be combined" | Decorator |
| "external API doesn't match our interface" | Adapter |
| "tree of objects, leaf and group treated same" | Composite |
| "undo, retry, queue actions" | Command |

---

## Part 3: how to mention a pattern naturally

Weak: "I'll use Strategy, Factory, Singleton and Observer."

Strong:

> "The fee calculation is the only part likely to change: hourly vs weekend vs EV surcharge. I'll model that as a `PricingStrategy` interface and inject it into `ParkingLot`. The lot doesn't care which concrete pricing class it gets."

After a follow-up, describe the local change: "Weekend pricing is a new `WeekendPricing` class. `Ticket` stays unchanged; wiring chooses the new strategy."

In C++, this is usually a small interface: `struct PricingStrategy { virtual ~PricingStrategy() = default; virtual int fee(int) const = 0; };`. In Java, it is an interface with constructor injection.

---

## Part 4: anti-patterns: pattern-itis and friends

### 1. Pattern-itis

If every class has a pattern name, the design is probably hiding a simple solution. Tic-tac-toe usually needs `Game`, `Board`, `Player`, and maybe a win-checking strategy only if board sizes vary.

### 2. Singleton as global variable

Singleton often hides dependencies and makes tests painful. Meyers Singleton is easy in C++, but DI is usually cleaner:

- Good: `Logger& logger` passed into `OrderService`.
- Risky: `Logger::instance()` called from everywhere.

### 3. Factory for normal constructors

A `Book{id,title}` doesn't need a factory. A `PaymentGateway` chosen from `PaymentType` may.

### 4. Inheritance where composition fits

`LoggedEmailSender`, `EncryptedLoggedEmailSender`, `RetriedEncryptedLoggedEmailSender` is subclass explosion. Use Decorator if layers are optional and combinable.

### 5. Naming without responsibility

Saying "Facade" for a god class does not make it clean. A facade simplifies a subsystem; it should not absorb every rule forever.

---

## Part 5: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Behaviour changes by policy/config | Strategy | Swaps algorithm |
| Current state controls allowed operations | State | Removes scattered state checks |
| Event triggers independent reactions | Observer | Publisher does not know subscribers |
| Need concrete class from a type | Factory / registry | Centralises creation |
| Object has many optional constructor args | Builder | Fluent, readable, validates once before build |
| Add optional runtime layers | Decorator | Avoids subclass explosion |
| Integrate third-party/legacy API | Adapter | Converts external interface into your domain interface |
| Part-whole tree | Composite | Treat file and directory uniformly |
| Undo/redo, queue actions | Command | Action object stores execute/undo data |
| Simple API over many services | Facade | Hides subsystem complexity |
| Lazy loading / access control / caching wrapper | Proxy | Same interface, controls access to real object |

### Common interview traps

- Choosing patterns before requirements.
- Using Singleton because "there is only one parking lot"; one instance is not the same as a Singleton pattern.
- Using Factory Method terminology when you implemented a Simple Factory. In interviews, be honest: "a simple factory/registry is enough here."
- Forgetting C++ ownership in pattern code. Decorators usually own their wrapped component via `std::unique_ptr`.
- Overusing inheritance. Most pattern implementations are composition plus interfaces.
- Not explaining how the follow-up becomes a new class rather than edits everywhere.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why do patterns matter less than SOLID in an interview?</summary>

Patterns are reusable consequences of SOLID/OOP decisions. The interviewer grades whether your design has good responsibilities and change boundaries. A pattern name helps communication, but a badly placed pattern is still a bad design.
</details>

<details><summary>2. Parking lot pricing can vary by weekday, weekend and EV. Which pattern fits?</summary>

Strategy. Define `PricingStrategy::fee(...)`; inject `WeekdayPricing`, `WeekendPricing`, `EvPricing`, etc. The checkout flow depends on the interface, not concrete pricing rules.
</details>

<details><summary>3. Vending machine has Idle, HasMoney, Dispensing and OutOfStock behaviours. Which pattern fits?</summary>

State / state machine. Each state defines allowed operations and transitions. This avoids scattered `if (state)` checks in every method.
</details>

<details><summary>4. A notification service must send email, SMS and Slack after an order is placed. Which patterns might appear?</summary>

Observer for multiple independent subscribers reacting to `OrderPlaced`; Factory to create channels from configuration; Adapter for third-party SMS/Slack SDKs. Decorator only if behaviours like retry/logging/encryption are optional layers around channels.
</details>

<details><summary>5. What is the difference between Strategy and Factory?</summary>

Factory chooses and creates an object. Strategy is the object whose behaviour is later used. Example: `PaymentFactory` creates a `CardPaymentStrategy`; checkout delegates payment behaviour to the strategy.
</details>

<details><summary>6. Why is Singleton usually a risky answer?</summary>

It hides dependencies, introduces global state, makes tests order-dependent, and complicates concurrency/lifetime. Dependency injection gives one shared instance when needed without global access.
</details>

<details><summary>7. File system: why Composite?</summary>

A file and a directory can share a `FileSystemNode` interface (`size`, `name`, `print`). A directory contains child nodes, including other directories. Client code treats leaf and composite uniformly.
</details>

<details><summary>8. How many patterns should a normal LLD answer contain?</summary>

Usually zero to two. If you reach for three or more early, pause and justify each by a real requirement.
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
| [Hello Interview LLD: Patterns](https://www.hellointerview.com/learn/low-level-design/in-a-hurry/patterns) | Verified headings: "Creational Patterns", "Factory Method", "Builder", "Singleton", "Structural Patterns", "Decorator", "Facade", "Behavioral Patterns", "Strategy", "Observer", "State Machine", "Wrapping Up" | ~30 min |
| [Refactoring Guru: Design Patterns](https://refactoring.guru/design-patterns) | Use individual pattern pages when reading L3a/L3b/L3c; focus on Intent → Problem → Solution → Structure → Applicability → Pros and Cons | reference |
| [L2 OOP + SOLID](L2-OOP-SOLID.md) | Composition over inheritance, OCP, DIP; patterns are applications of these | local note |

**Connects to:** [L3a Creational Patterns](L3a-Creational-Patterns.md) · [L3b Behavioral](L3b-Behavioral-Patterns.md) · [L3c Structural Patterns](L3c-Structural-Patterns.md) · [L5 Practice Playbook](L5-Practice-Playbook.md) · Questions: Parking lot, Elevator, Vending machine, BookMyShow, Splitwise, Logger, Pub-sub, File system, Chess
