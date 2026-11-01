# L3c · Structural Patterns: composing objects into flexible shapes

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** File system (Composite), Notification and pricing add-ons (Decorator), Payment systems (Adapter), BookMyShow / checkout facades, Logger wrappers, access-control or cache proxies.

---

## Why this topic matters

Structural patterns are about **how objects are connected**. They help you avoid the two common LLD extremes:

- giant inheritance trees for every feature combination;
- a god service that knows every subsystem detail.

The structural pattern question is usually: should this object **wrap**, **adapt**, **contain**, **simplify**, or **stand in for** another object?

| Pattern | Relationship shape | Interview signal |
|---|---|---|
| Decorator | same interface, wraps object, adds behaviour | optional stackable features |
| Adapter | your interface wraps incompatible external interface | third-party/legacy API |
| Composite | leaf and group share interface | tree / part-whole structure |
| Facade | simple entry point over many classes | orchestrator/subsystem API |
| Proxy | same interface, controls access to real object | lazy loading, caching, auth, remote object |

**Interview line:** "I'll use composition first. If the wrapper should look like the wrapped object, it's Decorator or Proxy; if it converts an incompatible API, it's Adapter."

---

## Part 1: Decorator

### Intent

Decorator adds behaviour to an object by wrapping it in another object that implements the same interface. You can stack decorators at runtime.

### The problem

Suppose you sell a base pizza. Customers can add cheese, olives, extra paneer and a coupon. If you model every combination with subclasses, you get:

```text
Pizza
CheesePizza
OlivePizza
CheeseOlivePizza
CheeseOlivePaneerPizza
DiscountedCheeseOlivePaneerPizza
...
```

That is subclass explosion. The same appears in logging streams, notification channels, compression/encryption and retry/caching wrappers.

### C++ code: pricing add-ons

```cpp
#include <memory>
#include <string>
#include <utility>
#include <utility>

struct Priceable {
    virtual ~Priceable() = default;
    virtual int price() const = 0;
    virtual std::string description() const = 0;
};

class BasePizza final : public Priceable {
public:
    int price() const override { return 200; }
    std::string description() const override { return "base pizza"; }
};

class PriceDecorator : public Priceable {
public:
    explicit PriceDecorator(std::unique_ptr<Priceable> wrapped)
        : wrapped_(std::move(wrapped)) {}
protected:
    const Priceable& wrapped() const { return *wrapped_; }
private:
    std::unique_ptr<Priceable> wrapped_;
};

class Cheese final : public PriceDecorator {
public:
    using PriceDecorator::PriceDecorator;
    int price() const override { return wrapped().price() + 50; }
    std::string description() const override {
        return wrapped().description() + ", cheese";
    }
};

class Olives final : public PriceDecorator {
public:
    using PriceDecorator::PriceDecorator;
    int price() const override { return wrapped().price() + 30; }
    std::string description() const override {
        return wrapped().description() + ", olives";
    }
};
```

Call site:

```cpp
std::unique_ptr<Priceable> item = std::make_unique<BasePizza>();
item = std::make_unique<Cheese>(std::move(item));
item = std::make_unique<Olives>(std::move(item));
// price = 280, description = "base pizza, cheese, olives"
```

### UML sketch

```text
Priceable <|.. BasePizza
Priceable <|.. PriceDecorator
PriceDecorator ◆── Priceable
PriceDecorator <|-- Cheese
PriceDecorator <|-- Olives
```

### Where it appears in LLD questions

| Question | Decorators |
|---|---|
| Vending/food ordering | Add-ons, coupon layers |
| Logger | Timestamp, thread-id, JSON formatting, async sink |
| Notification | Retry, rate-limit, template, audit wrapper |
| File/stream | Compression, encryption, buffering |
| Payment | Fraud check, logging, idempotency wrapper around gateway |

### Pitfalls

- Order may matter: compress-then-encrypt is not encrypt-then-compress.
- Too many layers make debugging harder.
- Decorator and Proxy both wrap the same interface. Decorator adds behaviour; Proxy controls access/lifecycle.
- In C++, make ownership explicit. The decorator usually owns the wrapped object via `std::unique_ptr`.

### Java equivalent

Java decorators implement the same interface and hold a field of that interface:

```java
class Cheese implements Priceable {
    private final Priceable wrapped;
}
```

Java's I/O streams (`BufferedInputStream`, `DataInputStream`) are the classic mental model.

**Interview line:** "These add-ons are optional and combinable at runtime, so Decorator avoids one subclass per combination."

---

## Part 2: Adapter

### Intent

Adapter converts the interface of one class into the interface your code expects. It is the "translation layer" for legacy or third-party code.

### The problem

Your checkout code wants:

```cpp
gateway.payRupees(500);
```

But the third-party SDK exposes:

```cpp
legacy.makePaymentInPaise(50000);
```

You don't want paise conversion and strange method names leaking through your domain.

### C++ code: third-party payment gateway

```cpp
#include <string>

struct PaymentGateway {
    virtual ~PaymentGateway() = default;
    virtual bool payRupees(int amount, const std::string& orderId) = 0;
};

class LegacyPaymentSdk {
public:
    bool makePaymentInPaise(int paise, const char* merchantReference) {
        lastPaise_ = paise;
        lastReference_ = merchantReference;
        return paise > 0;
    }
private:
    int lastPaise_ = 0;
    std::string lastReference_;
};

class LegacyPaymentAdapter final : public PaymentGateway {
public:
    explicit LegacyPaymentAdapter(LegacyPaymentSdk sdk) : sdk_(std::move(sdk)) {}

    bool payRupees(int amount, const std::string& orderId) override {
        return sdk_.makePaymentInPaise(amount * 100, orderId.c_str());
    }
private:
    LegacyPaymentSdk sdk_;
};
```

### UML sketch

```text
CheckoutService --> PaymentGateway
                      ^
                      |
              LegacyPaymentAdapter ----> LegacyPaymentSdk
                  payRupees()             makePaymentInPaise()
```

### Where it appears in LLD questions

| Question | What gets adapted |
|---|---|
| Payment / wallet | Bank, UPI, card processor SDK |
| Notification | Twilio/SendGrid/Slack SDKs |
| Storage | Local filesystem vs S3-like API |
| Logger | External log sink with different API |
| Maps/location | Third-party distance API |

### Pitfalls

- Don't adapt your own clean classes unnecessarily.
- Keep the adapter thin: conversion, error mapping, retries only if that is its responsibility.
- If many third-party providers share the same target interface, combine Adapter with Factory.
- Hide SDK-specific exceptions/types at the boundary.

### Java equivalent

Same shape:

```java
final class LegacyPaymentAdapter implements PaymentGateway {
    private final LegacyPaymentSdk sdk;
}
```

Dependency injection wires the adapter wherever `PaymentGateway` is needed.

**Interview line:** "The rest of checkout depends on my `PaymentGateway` interface. Only this adapter knows the third-party SDK's method names, units and exceptions."

---

## Part 3: Composite

### Intent

Composite lets clients treat individual objects and groups of objects uniformly. It fits trees: file systems, menu trees, org charts, UI component trees.

### The problem

A file has a size. A directory has a size equal to the sum of its children. Client code should not need two separate flows:

```cpp
if (node is file) ...
else if (node is directory) ...
```

### C++ code: file system tree

```cpp
#include <memory>
#include <numeric>
#include <string>
#include <utility>
#include <vector>

struct FileSystemNode {
    virtual ~FileSystemNode() = default;
    virtual int size() const = 0;
    virtual std::string name() const = 0;
};

class File final : public FileSystemNode {
public:
    File(std::string name, int bytes) : name_(std::move(name)), bytes_(bytes) {}
    int size() const override { return bytes_; }
    std::string name() const override { return name_; }
private:
    std::string name_;
    int bytes_;
};

class Directory final : public FileSystemNode {
public:
    explicit Directory(std::string name) : name_(std::move(name)) {}

    void add(std::unique_ptr<FileSystemNode> child) {
        children_.push_back(std::move(child));
    }

    int size() const override {
        int total = 0;
        for (const auto& child : children_) total += child->size();
        return total;
    }

    std::string name() const override { return name_; }
private:
    std::string name_;
    std::vector<std::unique_ptr<FileSystemNode>> children_;
};
```

### UML sketch

```text
FileSystemNode
  + size()
  + name()
     ^                 ^
     |                 |
   File             Directory ◆── vector<unique_ptr<FileSystemNode>>
```

### Where it appears in LLD questions

| Question | Composite structure |
|---|---|
| In-memory file system | Directory contains files/directories |
| Menu system | Menu contains menu items and submenus |
| Org chart | Manager contains employees/managers |
| UI tree | Component contains child components |
| Comments | Comment thread contains replies |

### Pitfalls

- Avoid parent raw pointers unless needed. If you need them, make ownership clear.
- Think about cycles. Trees should not allow a directory to contain itself.
- Decide which operations belong on the base interface. A `File` should not have a fake `add()` that throws if you can avoid it.
- For large trees, recursion depth and caching may matter.

### Java equivalent

`FileSystemNode` is an interface, `Directory` stores `List<FileSystemNode> children`. GC handles ownership, but you still need to avoid cycles and decide parent references carefully.

**Interview line:** "A directory and a file both answer `size()` and `name()`, so the client can treat them as `FileSystemNode`. Only `Directory` owns children."

---

## Part 4: Facade (brief, but useful) ⏭ *Skip for interviews*

### Intent

Facade provides a simple interface over a complex subsystem. In LLD, your orchestrator often behaves like a facade even if you don't name the pattern.

### C++ sketch: notification facade

```cpp
#include <string>

class EmailClient { public: void sendEmail(const std::string&) {} };
class SmsClient { public: void sendSms(const std::string&) {} };
class AuditLog { public: void record(const std::string&) {} };

class NotificationFacade {
public:
    void notifyBookingConfirmed(const std::string& userId) {
        audit_.record("booking confirmed:" + userId);
        email_.sendEmail(userId);
        sms_.sendSms(userId);
    }
private:
    EmailClient email_;
    SmsClient sms_;
    AuditLog audit_;
};
```

### UML sketch

```text
Client --> NotificationFacade --> EmailClient
                              --> SmsClient
                              --> AuditLog
```

### Where it appears

- `Game` hiding `Board`, `Player`, `MoveValidator`.
- `BookingService` hiding seat lock, payment, ticket generation, notification.
- `NotificationFacade` hiding email/SMS/push/audit clients.
- `Library` in [L1 Delivery](L1-Delivery.md) hiding books, copies, members and loans.

### Pitfalls

- Facade should simplify, not become a god class.
- Keep domain rules with the entities that own state; the facade coordinates.
- If the facade grows too large, split services or introduce strategies/adapters behind it.

### Java equivalent

Same class shape. In Spring, a service class often plays this role, with dependencies injected into its constructor.

**Interview line:** "This orchestrator is effectively a facade: callers get one clean operation, while the service coordinates the smaller components behind it."

---

## Part 5: Proxy (brief, but important to distinguish from Decorator)

### Intent

Proxy provides a stand-in with the same interface as a real object, controlling access to it. Common reasons: lazy loading, caching, auth checks, rate limiting or remote calls.

### C++ code: lazy/cached document proxy

```cpp
#include <memory>
#include <string>
#include <utility>

struct Document {
    virtual ~Document() = default;
    virtual std::string read() = 0;
};

class RealDocument final : public Document {
public:
    explicit RealDocument(std::string path) : path_(std::move(path)) {}
    std::string read() override { return "contents of " + path_; }
private:
    std::string path_;
};

class CachedDocumentProxy final : public Document {
public:
    explicit CachedDocumentProxy(std::string path) : path_(std::move(path)) {}

    std::string read() override {
        if (cached_.empty()) {
            if (!real_) real_ = std::make_unique<RealDocument>(path_);
            cached_ = real_->read();
        }
        return cached_;
    }
private:
    std::string path_;
    std::unique_ptr<RealDocument> real_;
    std::string cached_;
};
```

### Decorator vs Proxy

| Question | Decorator | Proxy |
|---|---|---|
| Main goal | Add behaviour | Control access/lifecycle |
| Client chooses layers? | often yes | often no; proxy is substituted transparently |
| Examples | compression, encryption, add-ons | lazy load, cache, auth, remote object |
| Same interface? | yes | yes |

### Where it appears

- Lazy loading a large file or profile.
- Access-control wrapper around a document/service.
- Cache proxy around a remote API.
- Rate-limiting proxy for an expensive dependency.

### Pitfalls

- Don't call every wrapper a proxy. If it adds independent optional behaviour, use Decorator language.
- Caching proxy needs invalidation rules; don't hand-wave if data changes.
- Remote proxy must discuss network failures/timeouts if the interview goes there.

### Java equivalent

Java uses explicit proxy classes or dynamic proxies. Spring AOP often creates proxies for transactions, security and caching. In LLD, write the explicit class; it is clearer.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Optional behaviours can be combined at runtime | Decorator | Stack wrappers; avoid subclass explosion |
| Third-party API has wrong shape | Adapter | Convert external interface to domain interface |
| Tree of leaf/group nodes | Composite | Uniform operations over part-whole hierarchy |
| One clean operation over many internal services | Facade | Hide subsystem complexity |
| Same interface, but lazy/cache/auth/remote control | Proxy | Stand-in controls access to real object |
| Behaviour algorithm varies | Strategy, not structural | Use [L3b Behavioral](L3b-Behavioral-Patterns.md) |
| Object creation varies | Factory, not structural | Use [L3a Creational](L3a-Creational-Patterns.md) |

### Common interview traps

- Using Decorator when a normal subclass is a stable type difference.
- Letting Adapter leak third-party types into the domain interface.
- Giving `add()` to every Composite node and making leaf nodes throw "not supported".
- Calling a god service a Facade. A facade should coordinate, not own every rule.
- Forgetting ownership: Composite parent owns children; Decorator owns or references wrapped object intentionally.
- Confusing Proxy with Decorator. Ask whether the goal is access control/lifecycle or added feature.

---

## Self-test (answer out loud first, then open)

<details><summary>1. A pizza can have any combination of cheese, olives and paneer. Which structural pattern fits?</summary>

Decorator. Each add-on wraps a `Priceable` and adds cost/description. You avoid one subclass per combination and can stack add-ons at runtime.
</details>

<details><summary>2. Your payment SDK uses paise and callbacks, but your code wants <code>payRupees(orderId)</code>. Which pattern fits?</summary>

Adapter. The adapter implements your `PaymentGateway` interface and translates method names, units, exceptions and SDK details.
</details>

<details><summary>3. Why is a file system a Composite?</summary>

Files and directories share a `FileSystemNode` interface. A file is a leaf; a directory is a composite that owns child nodes. Client code can call `size()` or `name()` without checking concrete type.
</details>

<details><summary>4. What is the difference between Facade and Adapter?</summary>

Adapter changes an incompatible interface into the expected one. Facade provides a simpler high-level interface over a set of internal classes. Adapter is about compatibility; Facade is about simplification.
</details>

<details><summary>5. What is the difference between Decorator and Proxy?</summary>

Both wrap the same interface. Decorator adds optional behaviour and is often stacked by the client. Proxy controls access, lifecycle, caching, lazy loading or remote calls, often transparently.
</details>

<details><summary>6. In C++, how should a directory own files and subdirectories?</summary>

Use `std::vector<std::unique_ptr<FileSystemNode>>` if the directory owns its children. The base must have `virtual ~FileSystemNode() = default;` to delete derived nodes safely.
</details>

<details><summary>7. When is Decorator overkill?</summary>

When the behaviour is a stable type difference known at design time and not combinable. A normal subclass or simple composition may be clearer.
</details>

<details><summary>8. How would you explain a facade in a BookMyShow design?</summary>

`BookingService` can be the facade: `bookSeats()` coordinates seat locking, pricing, payment, ticket creation and notification. The detailed rules should still live in focused components; the facade orchestrates the workflow.
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
| [Refactoring Guru: Decorator](https://refactoring.guru/design-patterns/decorator) | Verified headings: Intent, Problem, Solution, Real-World Analogy, Structure, Pseudocode, Applicability, How to Implement, Pros and Cons | ~20 min |
| [Refactoring Guru: Adapter](https://refactoring.guru/design-patterns/adapter) | Verified headings: Intent, Problem, Solution, Real-World Analogy, Structure, Pseudocode, Applicability, How to Implement, Pros and Cons | ~15 min |
| [Refactoring Guru: Composite](https://refactoring.guru/design-patterns/composite) | Verified headings: Intent, Problem, Solution, Real-World Analogy, Structure, Pseudocode, Applicability, How to Implement, Pros and Cons | ~20 min |
| [Refactoring Guru: Facade](https://refactoring.guru/design-patterns/facade) | Verified headings: Intent, Problem, Solution, Real-World Analogy, Structure, Pseudocode, Applicability, How to Implement, Pros and Cons | ~10 min |
| [Refactoring Guru: Proxy](https://refactoring.guru/design-patterns/proxy) | Verified headings: Intent, Problem, Solution, Real-World Analogy, Structure, Pseudocode, Applicability, How to Implement, Pros and Cons | ~10 min |
| [Hello Interview LLD: Patterns](https://www.hellointerview.com/learn/low-level-design/in-a-hurry/patterns) | Structural Patterns → Decorator, Facade; use Adapter/Composite from Refactoring Guru as free detail | ~10 min |
| [L0 C++ OOP for LLD](L0-Cpp-OOP-for-LLD.md) | Composition, ownership, interfaces, virtual destructors | local note |

**Connects to:** [L3 Patterns](L3-Patterns.md) · [L3a Creational Patterns](L3a-Creational-Patterns.md) · [L3b Behavioral](L3b-Behavioral-Patterns.md) · [L5 Practice Playbook](L5-Practice-Playbook.md) · Questions: File system, Logger, Notification, BookMyShow, Payment, Vending machine
