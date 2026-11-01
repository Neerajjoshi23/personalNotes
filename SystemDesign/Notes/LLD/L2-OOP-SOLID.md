# L2 · OOP + SOLID: the grammar of every LLD answer

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** every LLD question (parking lot, elevator, BookMyShow, Splitwise…). Interviewers grade you on these ideas even when they never say the words.

---

## Why this topic matters

In an LLD round you get 45–60 minutes to turn a vague problem ("design a parking lot") into classes and code. The interviewer isn't checking whether it compiles. They're checking whether the design **survives change**:

- "Now add EV charging spots."
- "Now pricing differs on weekends."

If adding a feature means editing 6 classes, the design is weak. OOP gives you the building blocks. SOLID is the set of rules that keeps the blocks loosely connected, so change stays local.

You already know OOP from C++. This topic is about using it **the way interviewers want**.

---

## Part 1: the 4 OOP pillars, as interviewers see them

### 1. Encapsulation: protect the rules, not just the data

Encapsulation isn't just "make fields private and add getters and setters". A class with a public `setBalance()` is technically encapsulated but useless, because anyone can set the balance to −500. **The class should own its rules (invariants).**

```cpp
// Weak: anyone can break the invariant
class Wallet { public: double balance; };

// Strong: the class enforces its own rules
class Wallet {
    double balance = 0;
public:
    void debit(double amt) {
        if (amt <= 0 || amt > balance) throw std::invalid_argument("invalid debit");
        balance -= amt;
    }
    void credit(double amt) {
        if (amt <= 0) throw std::invalid_argument("invalid credit");
        balance += amt;
    }
    double getBalance() const { return balance; }   // read-only view, no setter
};
```

**Interview signal:** "`ParkingSpot` decides for itself whether a vehicle fits (`canFit(Vehicle&)`). The caller doesn't compare sizes."

### 2. Abstraction: expose *what*, hide *how*

Callers should depend on a simple interface. A `PaymentProcessor` exposes `pay(amount)`, and whether that's UPI, card or wallet stays hidden behind it.

Think of your React components: a `<DatePicker onChange={...} />` hides the calendar maths. Same idea, but for classes.

**Interview signal:** your class diagram has interfaces at the points **where variation is likely**: payment, pricing, notification, dispatch strategy, storage. Don't put interfaces everywhere, only where things will change.

### 3. Polymorphism: replace `if/else` chains with objects

This is the one interviewers care about most. When you see this…

```cpp
double calculateFee(const std::string& type, int hours) {
    if (type == "CAR")   return hours * 20;
    if (type == "BIKE")  return hours * 10;
    if (type == "TRUCK") return hours * 50;   // every new type edits this function
    throw std::invalid_argument("unknown");
}
```

…replace it with this:

```cpp
struct PricingStrategy {
    virtual double fee(int hours) const = 0;
    virtual ~PricingStrategy() = default;
};
struct CarPricing  : PricingStrategy { double fee(int h) const override { return h * 20; } };
struct BikePricing : PricingStrategy { double fee(int h) const override { return h * 10; } };
struct EvPricing   : PricingStrategy { double fee(int h) const override { return h * 20 + 50; } };  // new = new class
```

A new vehicle type becomes a **new class**, not an edit to old, tested code. This is also the *Strategy* pattern you'll meet in L3.

### 4. Inheritance: use it rarely, and prefer composition

Inheritance creates the **strongest possible coupling**: the child depends on every detail of the parent, and any parent change ripples down.

- **When inheritance works:** a true "is-a" relationship with a **small, stable** parent. `Car is-a Vehicle`, where `Vehicle` only holds a licence plate and a size.
- **When it breaks down:** hierarchies built from features. `Bird → FlyingBird → FlyingSwimmingBird → FlyingSwimmingTalkingBird`… explodes. And `Penguin extends Bird` inherits `fly()`, which is wrong.

**Composition over inheritance:** give the object *parts* instead of *parents*.

```cpp
class Duck {
    std::unique_ptr<FlyBehavior>  fly;    // can be swapped at runtime
    std::unique_ptr<SwimBehavior> swim;
public:
    void performFly() { fly->fly(); }
};
```

**Interview rule of thumb:** use inheritance for the **type** (`Car : Vehicle`) and composition for the **behaviour** (`Vehicle has-a PricingStrategy`).

---

## Part 2: general design principles (the quick ones)

| Principle | Meaning | How it shows up in LLD |
|---|---|---|
| **KISS** (Keep It Simple) | Simplest design that meets the requirements | Don't add a microservice to a parking lot. 5–8 classes is normal. |
| **DRY** (Don't Repeat Yourself) | One source of truth for each piece of logic | Fee calculation lives in one place, not in `Car` *and* `Ticket` |
| **YAGNI** (You Aren't Gonna Need It) | Don't build for imaginary requirements | Say "this is extensible *if needed*", then don't build it |
| **Separation of concerns** | Each part does one kind of job | Model classes vs service classes vs storage |
| **Law of Demeter** | Talk to friends, not strangers | Avoid `lot.getFloor(2).getSpot(5).getVehicle().getOwner()`. Ask `lot` directly. |

**KISS vs OCP tension:** OCP says "make it extensible"; KISS and YAGNI say "don't over-build". The balance: **add an interface only where the interviewer hinted at change**, or where the domain obviously varies (payment methods, vehicle types).

---

## Part 3: SOLID, explained with one running example

Running example: **a booking system that sends notifications** when a booking is confirmed.

### S: Single Responsibility Principle
> A class should have **one reason to change**.

❌ `BookingService` confirms the booking, formats the email, sends the SMS **and** writes logs. A change to the email template forces you to edit (and re-test) the booking logic.

✅ Split it:
- `BookingService`: booking rules only.
- `NotificationService`: sends messages.
- `MessageFormatter`: builds templates.

**Test:** can you describe the class without using "and"? If not, split it.

### O: Open/Closed Principle
> **Open for extension, closed for modification.**

Adding WhatsApp notifications should **not** mean editing `NotificationService`:

```cpp
struct Channel {
    virtual void send(const std::string& msg) = 0;
    virtual ~Channel() = default;
};
struct EmailChannel : Channel { void send(const std::string& m) override { /* SMTP */ } };
struct SmsChannel   : Channel { void send(const std::string& m) override { /* SMS API */ } };

class NotificationService {
    std::vector<std::unique_ptr<Channel>> channels;
public:
    void add(std::unique_ptr<Channel> c) { channels.push_back(std::move(c)); }
    void notify(const std::string& m) { for (auto& c : channels) c->send(m); }
};
// WhatsApp = one new class: struct WhatsAppChannel : Channel {...}
// NotificationService is untouched.
```

OCP is **why** polymorphism matters. It's the most-tested SOLID letter in LLD rounds, because every "now add X" follow-up is secretly an OCP test.

### L: Liskov Substitution Principle
> A subclass must be usable **anywhere** the parent is used, without surprises.

The classic break: `Square extends Rectangle`. Setting `width` on a Square also changes `height`, so code that expects rectangle behaviour (`setWidth(5); setHeight(4); area == 20`) silently breaks.

LLD example: `class ReadOnlyFile : File` whose `write()` throws. Any code holding a `File&` now crashes at runtime. The fix is a better hierarchy (`ReadableFile`, `WritableFile`), not a subclass that refuses its parent's contract.

**Test:** if a subclass overrides a method to throw "not supported" or do nothing, you've probably broken LSP.

### I: Interface Segregation Principle
> Many small, focused interfaces beat one fat one.

❌ `struct Machine { virtual void print()=0; virtual void scan()=0; virtual void fax()=0; }`: a simple printer is forced to implement `fax()`.
✅ `Printer`, `Scanner` and `Fax` as separate interfaces; a multifunction device implements all three.

In a vending machine: `Payable`, `Dispensable` and `Refundable` are separate, because not every flow needs all three.

**Frontend parallel:** it's like not forcing every React component to accept 40 props it doesn't use.

### D: Dependency Inversion Principle
> High-level code depends on **abstractions**, not on concrete classes.

❌ `BookingService` creates `new MySQLRepository()` inside itself, so you can't unit-test it or swap databases.
✅ `BookingService` receives an `IBookingRepository&` in its constructor (**dependency injection**).

```cpp
class BookingService {
    IBookingRepository& repo;   // abstraction
    Channel& notifier;          // abstraction
public:
    BookingService(IBookingRepository& r, Channel& n) : repo(r), notifier(n) {}
    void confirm(const Booking& b) { repo.save(b); notifier.send("Booked: " + b.id); }
};
// In tests: pass FakeRepository + FakeChannel. In prod: PostgresRepository + EmailChannel.
```

This is exactly what **Spring Boot** does with constructor injection. When you learn Spring, you'll recognise DIP immediately; Spring just automates the wiring.

---

## Part 4: putting it together (how an answer *sounds*)

> "I'll model `Vehicle` as an abstract type with `Car`, `Bike` and `Truck`: that's a stable is-a relationship. Pricing varies and may change, so it's a `PricingStrategy` interface injected into `ParkingLot`. That's composition + OCP, so weekend pricing is just a new class. `ParkingSpot` owns the fit check (encapsulation). `ParkingLot` depends on a `SpotRepository` interface, not a concrete store (DIP), so I can test it with an in-memory fake."

That paragraph covers 5 principles in 20 seconds, and that's what gets marks. **Name the principle only while applying it**, never as a lecture.

### Common interview traps
- **Over-engineering:** 20 interfaces for a tic-tac-toe game. KISS beats "showing off patterns".
- **Inheritance for code reuse:** "`Admin extends User` because they share fields". Ask whether it's truly is-a, and whether it will stay stable. Often a `Role` field or composition is better.
- **Anaemic models:** classes that hold only data while one giant `ParkingManager` does everything. That's SRP inverted: behaviour should live with the data it protects.
- **God class:** one class with 30 methods. Split by reason to change.
- **Naming principles without applying them:** saying "SOLID" is worth nothing; a class diagram where change stays local is worth everything.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What is the difference between encapsulation and "private fields + getters/setters"?</summary>

Encapsulation means the object **enforces its own invariants** (a wallet can't go negative; a spot can't hold two cars). Public setters for every field expose the state and let callers break the rules, so the class is private in name only.
</details>

<details><summary>2. Your <code>calculateFee()</code> has a 5-branch <code>if/else</code> on vehicle type. Which principles does it violate, and how do you fix it?</summary>

Mainly Open/Closed: every new type edits the function. It also mixes responsibilities (SRP). Fix it with polymorphism or the Strategy pattern: one `PricingStrategy` per type, picked by a factory or a `map<VehicleType, PricingStrategy*>`.
</details>

<details><summary>3. Why is <code>Square extends Rectangle</code> a problem? Give an LLD equivalent.</summary>

It breaks Liskov: code that sets width and height independently on a `Rectangle&` gets surprising results with a `Square`. LLD equivalent: `ReadOnlyFile : File` throwing on `write()`, or `Penguin : Bird` with `fly()`. A subclass must honour the parent's contract.
</details>

<details><summary>4. When is inheritance the right choice in an LLD answer?</summary>

For a true, stable is-a **type** relationship (`Car : Vehicle`, `AdminUser : User` only if admin truly is a user in every context) where the parent is small. Use composition for behaviour that varies: pricing, movement, notification channel, elevator scheduling.
</details>

<details><summary>5. How does Dependency Inversion connect to Spring Boot, and why does it help testing?</summary>

Spring's dependency-injection container creates the concrete implementations and injects them into constructors that depend on interfaces. That's DIP automated. For testing you inject fakes or mocks (for example an in-memory repository), so tests run fast without a real database.
</details>

<details><summary>6. KISS says "keep it simple", but OCP says "make it extensible". How do you balance them in an interview?</summary>

Add abstractions only at **known or likely variation points**: things the interviewer mentioned, or obvious domain variation (payment types, vehicle types). Everything else stays concrete. Say "if we later need X, this interface is where it plugs in" instead of building X.
</details>

---

## My notes (write from memory after reading)

- 
- 
- 

**One thing I'd have got wrong before reading this:**

---

## Sources / read more

| Source | What to read | Time |
|---|---|---|
| [Hello Interview: OOP Concepts](https://www.hellointerview.com/learn/low-level-design/in-a-hurry/oop-concepts) | All sections: Encapsulation → Abstraction → Polymorphism → Inheritance → "When Inheritance Works" → "When Inheritance Breaks Down" → "Putting It Together" | ~20 min |
| [Hello Interview: Design Principles](https://www.hellointerview.com/learn/low-level-design/in-a-hurry/design-principles) | "General Software Design Principles" (KISS, DRY, YAGNI, Separation of Concerns, Law of Demeter) + all 5 SOLID sections + "Putting It All Together" | ~30 min |
| [Refactoring Guru: Strategy](https://refactoring.guru/design-patterns/strategy) | Optional preview of how OCP + polymorphism become a pattern (covered fully in L3) | ~10 min |

**Connects to:** [L1 Delivery](L1-Delivery.md) · [L3 Patterns](L3-Patterns.md) · Questions: Parking lot, Vending machine, Notification / pub-sub
