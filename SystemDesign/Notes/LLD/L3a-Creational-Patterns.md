# L3a · Creational Patterns: creating the right object without coupling everything to `new`

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Parking lot (vehicle/spot/pricing creation), BookMyShow (seat/pricing strategies), Splitwise (split type), Notification/pub-sub (channel creation), Logger (Singleton discussion), API/client configuration builders.

---

## Why this topic matters

Creational patterns answer a simple LLD question: **who is allowed to create this object, and how much should callers know about the concrete class?**

In small code, a constructor is enough. In interview designs, creation becomes interesting when:

- the concrete subtype depends on input (`PaymentType::Upi` → `UpiPayment`);
- object construction has many optional fields and validation;
- there must be one process-wide instance;
- you need to copy a polymorphic object without knowing its real type.

| Pattern | Use when | Default warning |
|---|---|---|
| Factory Method / Simple Factory | caller should not know concrete subtype | Don't create factories for plain data classes |
| Singleton | exactly one shared instance is required | Prefer dependency injection when possible |
| Builder | object has many optional parts or validation | Don't replace every constructor |
| Prototype | clone through a base interface | Usually niche in LLD, but useful for polymorphic copies |

**Interview line:** "Normal constructors are enough for stable entities. I'll add a factory only at the subtype boundary, where a request type or config decides the concrete class."

---

## Part 1: Factory Method, simple factory and registry map

### Intent

Factory Method is a creational pattern that lets a base creator define a method for creating products while subclasses choose the concrete product. In interviews, people often say "factory" when they really mean a **Simple Factory** or **registry map**. Be precise and pragmatic.

### The problem

Suppose a notification service supports email first:

```cpp
auto channel = std::make_unique<EmailChannel>();
channel->send(message);
```

Now add SMS, push and Slack. If `new EmailChannel()` or `std::make_unique<EmailChannel>()` is scattered across services, every caller learns every concrete class. That violates OCP: adding a channel means editing unrelated code.

### The C++ design

For most LLD answers, this simple factory/registry is the right level:

```cpp
#include <functional>
#include <memory>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <utility>

enum class ChannelKind { Email, Sms, Push };

struct ChannelKindHash {
    std::size_t operator()(ChannelKind kind) const {
        return static_cast<std::size_t>(kind);
    }
};

struct NotificationChannel {
    virtual ~NotificationChannel() = default;
    virtual void send(const std::string& message) = 0;
};

class EmailChannel final : public NotificationChannel {
public:
    void send(const std::string& message) override { last_ = "email:" + message; }
    const std::string& last() const { return last_; }
private:
    std::string last_;
};

class SmsChannel final : public NotificationChannel {
public:
    void send(const std::string& message) override { last_ = "sms:" + message; }
private:
    std::string last_;
};

class PushChannel final : public NotificationChannel {
public:
    void send(const std::string& message) override { last_ = "push:" + message; }
private:
    std::string last_;
};

class NotificationChannelFactory {
public:
    using Creator = std::function<std::unique_ptr<NotificationChannel>()>;

    NotificationChannelFactory() {
        registerCreator(ChannelKind::Email, [] { return std::make_unique<EmailChannel>(); });
        registerCreator(ChannelKind::Sms, [] { return std::make_unique<SmsChannel>(); });
        registerCreator(ChannelKind::Push, [] { return std::make_unique<PushChannel>(); });
    }

    void registerCreator(ChannelKind kind, Creator creator) {
        creators_[kind] = std::move(creator);
    }

    std::unique_ptr<NotificationChannel> create(ChannelKind kind) const {
        auto it = creators_.find(kind);
        if (it == creators_.end()) throw std::invalid_argument("unsupported channel");
        return it->second();
    }
private:
    std::unordered_map<ChannelKind, Creator, ChannelKindHash> creators_;
};
```

The client code now depends on `NotificationChannel`, not `EmailChannel`.

### UML sketch

```text
NotificationChannelFactory
  - map<ChannelKind, Creator>
  + create(kind): unique_ptr<NotificationChannel>
          |
          v
  NotificationChannel <|.. EmailChannel
  NotificationChannel <|.. SmsChannel
  NotificationChannel <|.. PushChannel
```

### Where it appears in LLD questions

| Question | Factory creates |
|---|---|
| Notification | Email/SMS/Push/Slack channel |
| Splitwise | Equal/Exact/Percentage split strategy |
| Parking lot | Vehicle subclass or pricing strategy from type |
| BookMyShow | Seat allocation or pricing strategy from show/config |
| Vending machine | Product objects from SKU/catalog |

### Factory Method vs Simple Factory

The GoF Factory Method has a creator hierarchy:

```text
Dialog
  + createButton(): Button   <-- virtual factory method
  + render()
WindowsDialog -> createButton() returns WindowsButton
WebDialog     -> createButton() returns HtmlButton
```

Use that when the **creator itself has business logic** that should work with abstract products. In most LLD rounds, a simple factory is enough and clearer.

### Pitfalls

- Do not hide simple constructors behind factories.
- Do not return raw owning pointers. Use `std::unique_ptr<Base>`.
- Do not make the factory a Singleton by default; inject it.
- Be honest about terminology: "This is a simple factory/registry, not the full GoF Factory Method."

### Java equivalent

In Java, `NotificationChannel` is an `interface`, and the factory returns `NotificationChannel`. The registry is usually `Map<ChannelKind, Supplier<NotificationChannel>>`. Ownership is handled by GC, but dependency direction is identical.

**Interview line:** "The factory is only at the boundary where a type enum/config becomes a polymorphic object. After creation, the rest of the flow talks to the interface."

---

## Part 2: Singleton (Meyers Singleton, and why DI is usually better)

### Intent

Singleton ensures a class has exactly one instance and provides a global access point to it.

### The problem

Some resources are naturally process-wide: configuration, metrics registry, logger sink, thread pool. You might be tempted to write:

```cpp
Logger::instance().log("booking confirmed");
```

That is convenient, but it creates global state. Hidden dependencies make tests harder and order-dependent.

### C++ Meyers Singleton

If you must implement Singleton in C++17, use function-local `static`. It is thread-safe since C++11.

```cpp
#include <string>
#include <utility>
#include <vector>

class Logger {
public:
    static Logger& instance() {
        static Logger logger;
        return logger;
    }

    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;

    void log(std::string message) { entries_.push_back(std::move(message)); }
    const std::vector<std::string>& entries() const { return entries_; }
private:
    Logger() = default;
    std::vector<std::string> entries_;
};
```

This is the clean C++ answer: no manual `new`, no double-checked locking, no raw pointer lifetime bug.

### UML sketch

```text
+---------------------+
| Logger              |
| - Logger()          |
| - entries           |
| + instance(): Logger&|
| + log(message)      |
+---------------------+
```

### Why dependency injection is better

Instead of calling `Logger::instance()` deep inside classes:

```cpp
class OrderService {
public:
    explicit OrderService(Logger& logger) : logger_(logger) {}
    void confirm() { logger_.log("confirmed"); }
private:
    Logger& logger_;
};
```

Now tests can pass a fake logger, or production can pass the one shared logger. You still get one instance if you want, but the dependency is visible.

**Interview line:** "C++ has a simple thread-safe Meyers Singleton, but I would prefer constructor injection for testability unless the interviewer explicitly wants a Singleton."

### Where it appears in LLD questions

| Question | Sensible discussion |
|---|---|
| Logger | A shared logger may be a Singleton, but inject sinks/formatters |
| Config manager | Singleton can work; DI still cleaner |
| Rate limiter | Avoid global Singleton if per-user/per-api instances exist |
| Parking lot | Do **not** use Singleton just because there is one parking lot in the prompt |

### Pitfalls

- Hidden dependency: class looks independent but calls global state.
- Tests share state unless you add reset hooks (which weakens Singleton).
- Concurrency: one instance does not make its methods thread-safe.
- Lifetime: destruction order across global objects can bite. Meyers Singleton avoids construction-order issues but not every design issue.

### Java equivalent

Java options include enum singleton (`enum Logger { INSTANCE; }`) or a holder class. In Spring Boot, the common production equivalent is a singleton-scoped bean injected into constructors. That is Singleton lifetime with DI-style access.

---

## Part 3: Builder (fluent construction + validation)

### Intent

Builder separates construction of a complex object from its representation. In interview terms: use it when a constructor would have too many parameters, many optional fields, or validation rules.

### The problem

This is hard to read:

```cpp
SearchQuery q("lld", "notes", 20, false, true, "date_desc");
```

Which `bool` means archived? Which number is limit? A builder makes the call site self-documenting.

### C++ fluent builder

```cpp
#include <stdexcept>
#include <string>
#include <utility>

class SearchQuery {
public:
    SearchQuery(std::string text, std::string section, int limit,
                bool includeArchived, std::string sortBy)
        : text_(std::move(text)),
          section_(std::move(section)),
          limit_(limit),
          includeArchived_(includeArchived),
          sortBy_(std::move(sortBy)) {}

    const std::string& text() const { return text_; }
    int limit() const { return limit_; }
private:
    std::string text_;
    std::string section_;
    int limit_;
    bool includeArchived_;
    std::string sortBy_;
};

class SearchQueryBuilder {
public:
    explicit SearchQueryBuilder(std::string text) : text_(std::move(text)) {}

    SearchQueryBuilder& inSection(std::string section) {
        section_ = std::move(section);
        return *this;
    }
    SearchQueryBuilder& limit(int value) {
        limit_ = value;
        return *this;
    }
    SearchQueryBuilder& includeArchived(bool value) {
        includeArchived_ = value;
        return *this;
    }
    SearchQueryBuilder& sortBy(std::string sort) {
        sortBy_ = std::move(sort);
        return *this;
    }

    SearchQuery build() const {
        if (text_.empty()) throw std::invalid_argument("text is required");
        if (limit_ <= 0 || limit_ > 100) throw std::invalid_argument("limit must be 1..100");
        return SearchQuery(text_, section_, limit_, includeArchived_, sortBy_);
    }
private:
    std::string text_;
    std::string section_ = "all";
    int limit_ = 10;
    bool includeArchived_ = false;
    std::string sortBy_ = "relevance";
};
```

Call site:

```cpp
SearchQuery query = SearchQueryBuilder("design patterns")
    .inSection("LLD")
    .limit(20)
    .sortBy("recent")
    .build();
```

### UML sketch

```text
SearchQueryBuilder  ----build()---->  SearchQuery
  - mutable construction fields        - final validated fields
  + fluent setters                     + read-only getters
```

### Where it appears in LLD questions

Builder is not common in core domain flows, but it fits:

- HTTP/API request builders.
- Complex search filters.
- Notification template/config objects.
- Immutable objects with many optional fields.
- Test data builders for large entities.

### Pitfalls

- Do not use Builder for `User(name, email)` or `Book(isbn, title)`.
- Validate in `build()`, not scattered across setters.
- Decide whether the built object is immutable. In C++, private fields + const-style getters are enough for interview code.
- If fields are all required and few, a constructor is clearer.

### Java equivalent

Java often uses a nested static `Builder`:

```java
SearchQuery q = SearchQuery.builder("patterns")
    .section("LLD")
    .limit(20)
    .build();
```

Java records and Lombok builders are common in production, but in an interview, hand-written builder logic is enough to show the idea.

**Interview line:** "I'll use Builder only for objects with many optional knobs. The core entities still use simple constructors."

---

## Part 4: Prototype (clone through a base interface) ⏭ *Skip for interviews*

### Intent

Prototype creates new objects by copying existing ones, usually through a common base interface. In C++, it is the `clone()` idiom for polymorphic copying.

### The problem

You have `std::unique_ptr<Shape>` but do not know whether it points to `Circle`, `Rectangle` or `TextBox`. A normal copy would slice; copying through the base constructor is impossible because the base doesn't know the derived type.

### C++ clone example

```cpp
#include <memory>
#include <string>
#include <utility>

struct Shape {
    virtual ~Shape() = default;
    virtual std::unique_ptr<Shape> clone() const = 0;
    virtual std::string render() const = 0;
};

class Circle final : public Shape {
public:
    Circle(int radius, std::string color)
        : radius_(radius), color_(std::move(color)) {}

    std::unique_ptr<Shape> clone() const override {
        return std::make_unique<Circle>(*this);
    }

    std::string render() const override {
        return color_ + " circle";
    }
private:
    int radius_;
    std::string color_;
};
```

### UML sketch

```text
Shape
  + clone(): unique_ptr<Shape>
  + render(): string
     ^
     |
  Circle
  + clone(): unique_ptr<Shape>  // returns copy of Circle
```

### Where it appears in LLD questions

- Drawing board / editor: duplicate selected shape.
- Chess or game pieces: clone a board state for simulation.
- Workflow templates: create a new task from a saved template.
- Undo/redo snapshots if full copying is acceptable.

Your DrawBoard uses CRDTs at HLD level, but a local whiteboard editor can still use Prototype for duplicating object templates.

### Pitfalls

- Object slicing: never copy polymorphic objects by value.
- Deep vs shallow copy: decide whether owned children/resources are cloned too.
- If construction is cheap and type is known, a constructor/factory is simpler.
- A virtual `clone()` is still a virtual function: include `virtual ~Shape() = default`.

### Java equivalent

Java has `Cloneable`, but it is awkward. In interviews, prefer an explicit method:

```java
interface Shape {
    Shape copy();
}
```

Same design, less ownership ceremony.

---

## Part 5: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Concrete subtype chosen by enum/config | Simple Factory / registry | One creation boundary; callers depend on base |
| Creator has business logic and product varies by subclass | Factory Method | Subclass changes product without changing creator logic |
| Need one process-wide object | Singleton, but discuss DI | Meyers Singleton is safe; DI is testable |
| Many optional fields or unreadable constructor | Builder | Fluent, validated construction |
| Need polymorphic copy | Prototype / `clone()` | Avoids slicing and preserves dynamic type |
| Plain entity with 2–4 required fields | Constructor | Simpler and clearer |

### Common interview traps

- Using Factory for every class.
- Using Singleton for "one parking lot" or "one game"; that is just one object, not global access.
- Forgetting that Singleton methods still need synchronization if shared across threads.
- Writing builder setters that allow invalid final objects.
- Returning `Base*` from `clone()` and leaking memory; return `std::unique_ptr<Base>`.
- Confusing Factory Method with Abstract Factory. For this roadmap, simple factory/registry is usually enough.

---

## Self-test (answer out loud first, then open)

<details><summary>1. When is a simple factory better than direct construction?</summary>

When callers should not know the concrete subtype, usually because an enum/config/request type decides it: payment method, notification channel, split type, pricing policy. It centralises creation and keeps the rest of the code depending on an interface.
</details>

<details><summary>2. What is the difference between Factory Method and Simple Factory?</summary>

Factory Method is a GoF pattern where a base creator declares a factory method and subclasses override it to choose the product. Simple Factory is one class/function that switches or looks up a creator and returns the product. LLD interviews usually need Simple Factory.
</details>

<details><summary>3. Why is Meyers Singleton preferred in C++?</summary>

A function-local `static` is initialised once in a thread-safe way since C++11. It avoids manual allocation, double-checked locking and lifetime bugs common in hand-rolled singletons.
</details>

<details><summary>4. Why might dependency injection be better than Singleton?</summary>

DI makes dependencies visible, testable and replaceable. You can still pass one shared instance in production, but tests can pass fakes and state does not hide behind global access.
</details>

<details><summary>5. When should Builder not be used?</summary>

For simple objects with a few required fields. A clear constructor is better than a verbose builder. Builder fits many optional knobs, validation, or immutable configuration objects.
</details>

<details><summary>6. What C++ problem does Prototype solve?</summary>

Polymorphic copying without slicing. A `Base&` or `unique_ptr<Base>` can call virtual `clone()` and get a new object of the actual derived type.
</details>

<details><summary>7. In a notification system, which creational patterns might appear?</summary>

A simple factory/registry can create `EmailChannel`, `SmsChannel`, etc. A builder may build complex notification templates. Singleton might be discussed for a logger, but DI is usually cleaner.
</details>

<details><summary>8. Why should factory methods return <code>std::unique_ptr<Base></code> in C++ LLD?</summary>

The factory transfers ownership to the caller and the caller should not delete manually. `unique_ptr` makes ownership explicit, prevents leaks, and supports polymorphism when the base has a virtual destructor.
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
| [Refactoring Guru: Factory Method](https://refactoring.guru/design-patterns/factory-method) | Verified headings: Intent, Problem, Solution, Structure, Pseudocode, Applicability, How to Implement, Pros and Cons, Relations with Other Patterns, Code Examples | ~20 min |
| [Refactoring Guru: Singleton](https://refactoring.guru/design-patterns/singleton) | Verified headings: Intent, Problem, Solution, Real-World Analogy, Structure, Pseudocode, Applicability, How to Implement, Pros and Cons | ~15 min |
| [Refactoring Guru: Builder](https://refactoring.guru/design-patterns/builder) | Verified headings: Intent, Problem, Solution, Structure, Pseudocode, Applicability, How to Implement, Pros and Cons | ~15 min |
| [Refactoring Guru: Prototype](https://refactoring.guru/design-patterns/prototype) | Verified headings: Intent, Problem, Solution, Real-World Analogy, Structure, Pseudocode, Applicability, How to Implement, Pros and Cons | ~10 min |
| [Hello Interview LLD: Patterns](https://www.hellointerview.com/learn/low-level-design/in-a-hurry/patterns) | Creational Patterns → Factory Method, Builder, Singleton | ~10 min |
| [L0 C++ OOP for LLD](L0-Cpp-OOP-for-LLD.md) | Smart pointers, virtual destructors, object slicing, Singleton and `clone()` | local note |

**Connects to:** [L3 Patterns](L3-Patterns.md) · [L3b Behavioral](L3b-Behavioral-Patterns.md) · [L3c Structural Patterns](L3c-Structural-Patterns.md) · [L4 Concurrency](L4-Concurrency.md) · Questions: Notification, Splitwise, Logger, Parking lot, BookMyShow, DrawBoard-style editor
