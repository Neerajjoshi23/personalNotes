# L3b · Behavioral patterns: making objects talk without turning into `if/else` soup

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Parking lot, Elevator, BookMyShow, Vending machine, Logging framework, Pub-sub / notification, undo/redo editors, job queues.

---

## Why this topic matters

Creational patterns decide **how objects are born**. Structural patterns decide **how objects are composed**. Behavioral patterns decide **who talks to whom, and where the changing rule lives**.

In LLD, the fastest way to lose marks is to put all behaviour inside one service:

```cpp
if (type == "SURGE") ...
else if (type == "NEAREST_ELEVATOR") ...
else if (state == "HAS_MONEY") ...
```

Behavioral patterns replace those conditionals with small objects:

| Pattern | Interview smell it fixes | Common LLD question |
|---|---|---|
| Strategy | one algorithm chosen from many | Parking pricing, elevator scheduling, rate-limiter algorithm |
| State | same operation behaves differently by lifecycle | Vending machine, elevator, order lifecycle |
| Observer | many things react to one event | Notification, pub-sub, chat presence |
| Command | request must be queued, retried, undone or logged | Undo/redo, job queue, remote control |
| Chain of Responsibility | request passes through handlers until one handles it | Logger, approvals, middleware |
| Template Method | fixed algorithm with overridable steps | Report generation, game loop, import pipeline |

**Interview line:** "I'll use a pattern only at a real variation point. If a simple enum is enough, I won't over-engineer it; if the interviewer asks for new behaviours at runtime, I move it behind an interface."

---

## Part 1: Strategy — swap an algorithm without editing the caller

### Intent

Strategy defines a family of algorithms, puts each one in a class, and lets the caller depend on a common interface.

### The problem

Parking lot pricing, ride pricing and elevator scheduling all start with a simple `if`:

```cpp
int fee(VehicleType type, int hours) {
    if (type == VehicleType::Car) return hours * 20;
    if (type == VehicleType::Bike) return hours * 10;
    return hours * 50;
}
```

Then follow-ups arrive: weekend pricing, EV charging, lost-ticket fee, nearest-car elevator scheduling, least-loaded elevator scheduling. Editing this function for every new rule violates OCP.

### C++17 code: parking pricing

```cpp
#include <memory>
#include <string>

enum class VehicleType { Bike, Car, Truck };

struct PricingStrategy {
    virtual ~PricingStrategy() = default;
    virtual int fee(VehicleType type, int hours) const = 0;
};

class WeekdayPricing final : public PricingStrategy {
public:
    int fee(VehicleType type, int hours) const override {
        switch (type) {
            case VehicleType::Bike:  return hours * 10;
            case VehicleType::Car:   return hours * 20;
            case VehicleType::Truck: return hours * 50;
        }
        return 0;
    }
};

class WeekendPricing final : public PricingStrategy {
public:
    int fee(VehicleType type, int hours) const override {
        return WeekdayPricing{}.fee(type, hours) + 30; // flat weekend surcharge
    }
};

class ParkingLot {
    std::unique_ptr<PricingStrategy> pricing_;
public:
    explicit ParkingLot(std::unique_ptr<PricingStrategy> pricing)
        : pricing_(std::move(pricing)) {}

    int checkout(VehicleType type, int hours) const {
        return pricing_->fee(type, hours);
    }
};
```

The lot does not know the concrete pricing rule. A follow-up becomes a new class, not a risky edit.

### C++17 code: elevator scheduling

```cpp
#include <cstdlib>
#include <memory>
#include <vector>

struct SchedulingStrategy {
    virtual ~SchedulingStrategy() = default;
    virtual int chooseElevator(int requestFloor,
                               const std::vector<int>& elevatorFloors) const = 0;
};

class NearestElevatorStrategy final : public SchedulingStrategy {
public:
    int chooseElevator(int requestFloor,
                       const std::vector<int>& elevatorFloors) const override {
        int best = 0;
        for (int i = 1; i < static_cast<int>(elevatorFloors.size()); ++i) {
            if (std::abs(elevatorFloors[i] - requestFloor) <
                std::abs(elevatorFloors[best] - requestFloor)) {
                best = i;
            }
        }
        return best;
    }
};

class ElevatorController {
    std::unique_ptr<SchedulingStrategy> scheduler_;
public:
    explicit ElevatorController(std::unique_ptr<SchedulingStrategy> scheduler)
        : scheduler_(std::move(scheduler)) {}
};
```

### ASCII UML

```text
ParkingLot ◆── owns ──> PricingStrategy
                         ▲
                         ├── WeekdayPricing
                         └── WeekendPricing

ElevatorController ◆──> SchedulingStrategy
                         ▲
                         └── NearestElevatorStrategy
```

### Where it appears in LLD questions

- **Parking lot:** pricing, spot-search strategy.
- **Elevator:** scheduling strategy: nearest, SCAN, least-loaded.
- **Rate limiter:** token bucket vs fixed window vs sliding window.
- **BookMyShow:** seat selection strategy ("best available", "same row").
- **Splitwise:** settlement simplification strategy.

### Pitfalls

- Do not make every two-line function a strategy. Use it when algorithms vary.
- Avoid a strategy that has to downcast the caller; pass it the data it needs.
- If the algorithm is selected once at startup, constructor injection is enough. If it changes during runtime, add a setter carefully.
- Strategy is not the same as State: Strategy is chosen by the client/config; State changes because the object lifecycle changes.

### Java equivalent

```java
interface PricingStrategy { int fee(VehicleType type, int hours); }
final class WeekdayPricing implements PricingStrategy { /* @Override fee */ }
final class ParkingLot {
  private final PricingStrategy pricing;
  ParkingLot(PricingStrategy pricing) { this.pricing = pricing; }
}
```

---

## Part 2: State — lifecycle-specific behaviour without a giant switch

### Intent

State lets an object change its behaviour when its internal state changes. It looks as if the object changed its class.

### The problem

Vending machine logic often becomes:

```cpp
if (state == State::Idle && event == Event::InsertCoin) ...
else if (state == State::HasMoney && event == Event::SelectItem) ...
else if (state == State::Dispensing && event == Event::Cancel) ...
```

That is acceptable for a tiny problem, but it gets brittle when each state has many operations.

### C++17 code: vending machine state classes

```cpp
#include <memory>
#include <stdexcept>

class VendingMachine;

struct MachineState {
    virtual ~MachineState() = default;
    virtual void insertCoin(VendingMachine&) { throw std::logic_error("invalid"); }
    virtual void selectItem(VendingMachine&) { throw std::logic_error("invalid"); }
    virtual void dispense(VendingMachine&)   { throw std::logic_error("invalid"); }
};

class VendingMachine {
    int coins_ = 0;
    std::unique_ptr<MachineState> state_;
public:
    explicit VendingMachine(std::unique_ptr<MachineState> initial)
        : state_(std::move(initial)) {}

    void setState(std::unique_ptr<MachineState> next) { state_ = std::move(next); }
    void addCoin() { ++coins_; }
    int coins() const { return coins_; }

    void insertCoin() { state_->insertCoin(*this); }
    void selectItem() { state_->selectItem(*this); }
    void dispense()   { state_->dispense(*this); }
};

class HasMoneyState final : public MachineState {
public:
    void insertCoin(VendingMachine& m) override { m.addCoin(); }
    void selectItem(VendingMachine& m) override;
};
```

In a real interview, you would define `IdleState`, `HasMoneyState`, `SoldOutState`, and `DispensingState`. Each state owns the valid transitions from that state.

### State classes vs `enum + switch`

| Use `enum class + switch` when… | Use State classes when… |
|---|---|
| Only 2–4 states and 1–2 events | Many states and many events |
| Behaviour is tiny | Each state has different rules/data |
| You want the simplest answer in 45 minutes | Interviewer asks "add refund / out-of-stock / maintenance mode" |
| Example: order status label | Example: vending machine, elevator controller, workflow engine |

**Interview line:** "I'll start with an enum if the state machine is tiny. If transitions and behaviours grow, I'll move each state into a class; that keeps invalid operations local to the state."

### Elevator and order lifecycle examples

- **Elevator:** `IdleState`, `MovingUpState`, `MovingDownState`, `DoorOpenState`, `MaintenanceState`.
- **Order:** `Created`, `Paid`, `Packed`, `Shipped`, `Delivered`, `Cancelled`. For simple e-commerce, an enum may be enough; for payment/refund side effects, State classes make sense.

### ASCII UML

```text
VendingMachine ◆── current ──> MachineState
                                  ▲
             ┌────────────────────┼────────────────────┐
             │                    │                    │
          IdleState          HasMoneyState        DispensingState
```

### Where it appears in LLD questions

- **Vending machine:** exact fit: inserted money, selected item, dispensing, sold out.
- **Elevator:** movement and door states.
- **Order / booking:** payment and cancellation transitions.
- **Game:** running, paused, won, draw.

### Pitfalls

- Circular ownership: states should not own the context. The context owns the current state.
- Scattering transition rules too much. Keep a transition table in your head and explain it.
- Creating a class per status when the status has no behaviour. That is over-engineering.
- Throwing exceptions for all invalid operations in an interview can be noisy; sometimes return `false` or `Result`.

### Java equivalent

```java
interface MachineState {
  default void insertCoin(VendingMachine m) { throw new IllegalStateException(); }
  void selectItem(VendingMachine m);
}
```

---

## Part 3: Observer — publish an event, notify many listeners safely

### Intent

Observer defines a one-to-many dependency: when the subject changes, all observers are notified.

### The problem

When a booking is confirmed, you may need to send email, SMS, app push, analytics and audit logs. Hard-coding all of that into `BookingService` violates SRP and makes adding WhatsApp an edit to booking logic.

### C++17 code: weak observers for lifetime safety

```cpp
#include <memory>
#include <string>
#include <vector>

struct Observer {
    virtual ~Observer() = default;
    virtual void onEvent(const std::string& event) = 0;
};

class Topic {
    std::vector<std::weak_ptr<Observer>> observers_;
public:
    void subscribe(const std::shared_ptr<Observer>& observer) {
        observers_.push_back(observer);
    }

    void publish(const std::string& event) {
        for (auto it = observers_.begin(); it != observers_.end();) {
            if (auto observer = it->lock()) {
                observer->onEvent(event);
                ++it;
            } else {
                it = observers_.erase(it); // subscriber was destroyed
            }
        }
    }
};

class EmailNotification final : public Observer {
public:
    void onEvent(const std::string& event) override {
        // send email for event
    }
};
```

Why `weak_ptr`? If the subject stores `shared_ptr<Observer>`, it can keep subscribers alive forever. If observers also point back to the topic, you can create a reference cycle. Another valid C++ design is raw pointers plus explicit `unsubscribe()`; then the observer's destructor must unsubscribe.

### ASCII UML

```text
Subject / Topic ◆── weak list ──> Observer
                                    ▲
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
           EmailNotification  SmsNotification   AnalyticsObserver
```

### Where it appears in LLD questions

- **Pub-sub / notification:** topics, subscribers, fan-out.
- **BookMyShow:** booking confirmed → email, SMS, wallet ledger.
- **Splitwise:** expense added → notify group members.
- **DrawBoard / Adobe Connect:** presence or chat event fan-out to UI listeners.

### Pitfalls

- Lifetime safety: use `weak_ptr` or explicit unsubscribe; do not leave dangling raw pointers.
- Blocking observers: one slow SMS provider should not block the subject forever. In production, enqueue events.
- Error handling: one observer throwing should not stop all observers unless that is deliberate.
- Observer is in-process. Distributed pub-sub needs a broker (Kafka/Redis/SQS), retries and idempotency.

### Java equivalent

Java references are GC-managed, so dangling pointers are not the problem. Leaks still are: a subject holding listeners prevents GC unless you remove them. Java UIs commonly have `addListener` / `removeListener`; backends often push to a queue instead.

---

## Part 4: Command — wrap a request as an object

### Intent

Command turns an action into an object. You can queue it, log it, retry it, undo it, or execute it later.

### The problem

An editor action like "draw rectangle" is not just a function call. You may need:

- execute now,
- push to undo history,
- serialize for collaboration,
- retry later if the server is down.

### C++17 code: undo/redo command

```cpp
#include <memory>
#include <string>
#include <vector>

class Canvas {
    std::vector<std::string> shapes_;
public:
    void addShape(std::string shape) { shapes_.push_back(std::move(shape)); }
    void removeLast() { if (!shapes_.empty()) shapes_.pop_back(); }
};

struct Command {
    virtual ~Command() = default;
    virtual void execute() = 0;
    virtual void undo() = 0;
};

class AddShapeCommand final : public Command {
    Canvas& canvas_;
    std::string shape_;
public:
    AddShapeCommand(Canvas& canvas, std::string shape)
        : canvas_(canvas), shape_(std::move(shape)) {}

    void execute() override { canvas_.addShape(shape_); }
    void undo() override { canvas_.removeLast(); }
};

class CommandHistory {
    std::vector<std::unique_ptr<Command>> done_;
public:
    void run(std::unique_ptr<Command> command) {
        command->execute();
        done_.push_back(std::move(command));
    }
    void undoLast() {
        if (done_.empty()) return;
        done_.back()->undo();
        done_.pop_back();
    }
};
```

### Job queue variant

For job queues, `Command` often has only `execute()` and metadata:

```cpp
struct Job {
    virtual ~Job() = default;
    virtual void execute() = 0;
};
```

The queue stores `std::unique_ptr<Job>`. Workers pop and run jobs. Retries are metadata around the command (`attempts`, `nextRunAt`, idempotency key).

### ASCII UML

```text
Client ──creates──> Command ──calls──> Receiver
                       ▲
          ┌────────────┴────────────┐
          │                         │
   AddShapeCommand           ReserveSeatCommand

CommandHistory ◆── owns executed commands
```

### Where it appears in LLD questions

- **Undo/redo editor:** command history.
- **Task manager / job scheduler:** jobs as command objects.
- **BookMyShow:** reserve seat command can be queued/retried.
- **Snake & Ladder / game moves:** move command with undo for tests.

### Pitfalls

- Commands should be small. Do not put the whole service layer inside one command.
- Undo needs enough captured state. "Remove last" works only if no one else edited meanwhile; real editors store IDs or inverse patches.
- Retrying commands requires idempotency. A payment command must not charge twice.
- If commands outlive the receiver, store IDs or `weak_ptr`, not raw owning assumptions.

### Java equivalent

Java's `Runnable` and `Callable<T>` are command-like. For undo you create your own interface:

```java
interface Command { void execute(); void undo(); }
```

---

## Part 5: Chain of Responsibility — pass a request through handlers

### Intent

Chain of Responsibility lets multiple handlers get a chance to process a request. The sender does not know which handler will handle it.

### The problem

Logging and middleware often become nested conditionals:

```cpp
if (level >= ERROR) console.log(...);
if (level >= WARN) file.log(...);
if (isAuthenticated(req)) {
  if (isAuthorized(req)) {
    controller(req);
  }
}
```

Handlers are easier to extend and reorder.

### C++17 code: logger levels

```cpp
#include <iostream>
#include <memory>
#include <string>

enum class LogLevel { Info = 1, Warn = 2, Error = 3 };

class Logger {
    LogLevel threshold_;
    std::unique_ptr<Logger> next_;
public:
    explicit Logger(LogLevel threshold) : threshold_(threshold) {}
    virtual ~Logger() = default;

    Logger& setNext(std::unique_ptr<Logger> next) {
        next_ = std::move(next);
        return *next_;
    }

    void log(LogLevel level, const std::string& message) {
        if (static_cast<int>(level) >= static_cast<int>(threshold_)) {
            write(message);
        }
        if (next_) next_->log(level, message);
    }
private:
    virtual void write(const std::string& message) = 0;
};

class ConsoleLogger final : public Logger {
public:
    ConsoleLogger() : Logger(LogLevel::Info) {}
private:
    void write(const std::string& message) override {
        std::cout << message << '\n';
    }
};

class ErrorLogger final : public Logger {
public:
    ErrorLogger() : Logger(LogLevel::Error) {}
private:
    void write(const std::string& message) override {
        std::cerr << message << '\n';
    }
};
```

For approval flows and request middleware, the handler usually either handles and stops, or passes to the next handler.

### ASCII UML

```text
Request ──> Handler ──next──> Handler ──next──> Handler
              ▲                 ▲                 ▲
              │                 │                 │
        AuthHandler       RateLimitHandler   ControllerHandler
```

### Where it appears in LLD questions

- **Logging framework:** log level handlers / appenders.
- **Approval flow:** manager → director → VP by amount.
- **Request middleware:** auth → rate limit → validation → controller.
- **ATM:** validation chain before dispense.

### Pitfalls

- Be clear whether the chain stops at first handler or all handlers run. Logger appenders often all run; approval stops at one.
- Avoid hidden cycles in the chain.
- Ordering matters. Auth before authorization; validation before controller.
- If every handler needs every dependency, the chain is a disguised god service.

### Java equivalent

Servlet filters, Spring Security filters and Express middleware are Chain of Responsibility. Java implementation is the same: an abstract handler with `setNext`.

---

## Part 6: Template Method — fixed skeleton, variable steps

### Intent

Template Method defines the skeleton of an algorithm in a base class and lets subclasses override selected steps.

### The problem

Several reports share the same flow:

1. validate input,
2. load data,
3. render body,
4. write footer.

The order must not change, but the body differs.

### C++17 code

```cpp
#include <string>

class Report {
public:
    virtual ~Report() = default;

    std::string generate() {          // non-virtual: the algorithm skeleton
        return header() + body() + footer();
    }

private:
    std::string header() { return "Report\n"; }
    std::string footer() { return "\n-- end --"; }
    virtual std::string body() = 0;   // hook
};

class SalesReport final : public Report {
private:
    std::string body() override { return "sales: 42"; }
};
```

This is the Non-Virtual Interface idea from [L0](L0-Cpp-OOP-for-LLD.md): public non-virtual method controls the algorithm; private/protected virtual hooks vary.

### ASCII UML

```text
Report
 ├─ generate()  fixed skeleton
 ├─ header()    fixed
 ├─ footer()    fixed
 └─ body()      abstract hook
       ▲
       └── SalesReport
```

### Where it appears in LLD questions

- **Game loop:** initialise → take turns → check winner → publish result.
- **Import pipeline:** parse → validate → transform → store.
- **Report generation:** fixed header/footer, variable body.
- **ATM transaction:** authenticate → validate → execute → receipt.

### Pitfalls

- Inheritance coupling is strong. Prefer Strategy if you need to swap one step independently at runtime.
- Do not call virtual hooks from the constructor; C++ dispatch will not reach the derived class during base construction.
- Keep the template method small; otherwise the base becomes a framework no one can reason about.

### Java equivalent

Same pattern with an abstract class:

```java
abstract class Report {
  public final String generate() { return header() + body() + footer(); }
  protected abstract String body();
}
```

---

## Part 7: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| "Pricing can change by day, vehicle, coupon." | Strategy | Many interchangeable algorithms |
| "The object behaves differently after payment / selection / cancellation." | State | Behaviour follows lifecycle |
| "Many subscribers react to one event." | Observer | Subject stays decoupled from listeners |
| "Need undo, retry, queue or audit of operations." | Command | Request becomes an object |
| "Auth → rate limit → validation → controller." | Chain of Responsibility | Ordered handlers, sender decoupled |
| "Same algorithm skeleton, only a few steps vary." | Template Method | Base controls order |
| "Only two statuses and one operation." | `enum class + switch` | Simpler than State classes |

### Common interview traps

- Forcing patterns into every answer. Pattern names are less important than localising change.
- Using inheritance where Strategy would be cleaner. If behaviour must be swapped independently, compose it.
- Ignoring C++ ownership. Pattern examples online often use raw `new`; use `unique_ptr`, references and `weak_ptr`.
- Confusing Observer with distributed pub-sub. Observer is in-process; Kafka/SQS is a system-design component.
- Building State classes but not explaining transitions. Draw the state machine.
- Not saying the "simple alternative". Interviewers like hearing when `enum + switch` is enough.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Parking lot pricing has weekday, weekend and event-day rules. Which pattern and why?</summary>

Strategy. Pricing is an interchangeable algorithm. `ParkingLot` depends on `PricingStrategy`; each rule is a new class, so adding event-day pricing does not edit checkout logic.
</details>

<details><summary>2. Vending machine has Idle, HasMoney, Dispensing and SoldOut. When would you use State classes instead of an enum?</summary>

Use State classes when each state has different valid operations and transitions. If there are many event/state combinations, State classes avoid a giant switch and keep invalid operations local.
</details>

<details><summary>3. In C++ Observer, why might the subject store <code>weak_ptr&lt;Observer&gt;</code> instead of <code>shared_ptr&lt;Observer&gt;</code>?</summary>

`shared_ptr` makes the subject an owner of observers, which can cause leaks or cycles. `weak_ptr` lets the subject notify observers that are still alive and erase expired ones safely.
</details>

<details><summary>4. Give two reasons to wrap an action as a Command.</summary>

Undo/redo and queuing/retry are the common ones. It also helps logging, audit, scheduling and serialising actions for collaborative editing.
</details>

<details><summary>5. Logger levels can be modelled with Chain of Responsibility. What must you clarify?</summary>

Whether the chain stops at the first handler or all matching handlers run. Approval flows usually stop; logging appenders may all run.
</details>

<details><summary>6. Template Method vs Strategy: which one is less coupled?</summary>

Strategy is usually less coupled because it uses composition. Template Method uses inheritance, so the subclass is tied to the base skeleton. Use Template Method when the algorithm order must be fixed by the base.
</details>

<details><summary>7. What is the biggest C++ smell in pattern examples copied from the web?</summary>

Raw owning pointers and missing virtual destructors. In interview C++17, use `std::unique_ptr` for ownership, references for non-owning dependencies, and `virtual ~Base() = default` for every interface/base.
</details>

<details><summary>8. Which pattern fits request middleware?</summary>

Chain of Responsibility: each middleware handler receives the request, either rejects/handles it or passes to the next handler.
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
| [Refactoring Guru: Strategy](https://refactoring.guru/design-patterns/strategy) | Headings verified: Intent → Problem → Solution → Structure → Pseudocode → Applicability → Pros and Cons | ~15 min |
| [Refactoring Guru: State](https://refactoring.guru/design-patterns/state) | Intent → Problem → Solution → Structure → Pseudocode → Applicability | ~15 min |
| [Refactoring Guru: Observer](https://refactoring.guru/design-patterns/observer) | Intent → Problem → Solution → Structure → Pseudocode → Applicability | ~15 min |
| [Refactoring Guru: Command](https://refactoring.guru/design-patterns/command) | Intent → Problem → Solution → Structure → Pseudocode → Applicability | ~15 min |
| [Refactoring Guru: Chain of Responsibility](https://refactoring.guru/design-patterns/chain-of-responsibility) | Intent → Problem → Solution → Structure → Pseudocode → Applicability | ~15 min |
| [Refactoring Guru: Template Method](https://refactoring.guru/design-patterns/template-method) | Intent → Problem → Solution → Structure → Pseudocode → Applicability | ~10 min |
| [Hello Interview LLD: Patterns](https://www.hellointerview.com/learn/low-level-design/in-a-hurry/patterns) | Headings verified: Creational Patterns → Factory Method → Builder → Singleton → Structural Patterns → Behavioral Patterns | ~30 min |

**Connects to:** [L0 C++ OOP](L0-Cpp-OOP-for-LLD.md) · [L2 OOP + SOLID](L2-OOP-SOLID.md) · [L3 Patterns](L3-Patterns.md) · [L3a Creational Patterns](L3a-Creational-Patterns.md) · [L3c Structural Patterns](L3c-Structural-Patterns.md) · [L4 Concurrency](L4-Concurrency.md) · Questions: Parking lot, Elevator, Vending machine, Logging framework, Pub-sub / notification
