# L0 · C++ OOP for LLD interviews

> **Status:** [ ] Read the blog · [ ] Ran the code · [ ] Self-test passed · **Date:** ___
> **Level:** not a beginner's guide. It assumes you know class, object, constructor, inheritance and `virtual` (CodeWithHarry level).
> **Focus:** the C++ features that LLD interviews **actually need**, plus the theory questions they sometimes ask.
> **Read before:** [L2 OOP + SOLID](L2-OOP-SOLID.md) · [L3 Patterns](L3-Patterns.md)

---

## How to read this note

| Part | What | Interview weight |
|---|---|---|
| 1 | Quick recap (constructors, access, `this`, `static`, `const`) | Low: skim |
| 2 | **Abstract classes vs interfaces in C++** | ★★★ used in every LLD answer |
| 3 | **Virtual functions, vtable, virtual destructor, `override`/`final`** | ★★★ |
| 4 | **Object slicing** | ★★ |
| 5 | **Rule of 0/3/5** | ★★ |
| 6 | **Smart pointers + ownership** | ★★★ decides how your C++ LLD code looks |
| 7 | **Association vs aggregation vs composition** | ★★★ class diagrams |
| 8 | Extras worth knowing: `enum class`, singleton, hash keys, `optional` | ★★ |
| 9 | **Theory questions they may ask** (ctor order, friend, diamond…) | ★ LLD round, ★★★ C++ theory round |
| 10 | Full LLD example + C++ ↔ Java ↔ TypeScript map | ★★★ |

**Do LLD rounds ask C++ trivia?** In a *design* round, rarely. The interviewer judges your classes, relationships and extensibility. But a quick verbal check ("why is the destructor virtual?", "what order do constructors run?") is common, and a separate *OOP/C++ theory* round is common at service companies and some product companies. Part 9 covers that.

---

## Part 1: quick recap (skim)

### Access specifiers

| | Inside the class | Derived class | Outside |
|---|---|---|---|
| `public` | ✅ | ✅ | ✅ |
| `protected` | ✅ | ✅ | ❌ |
| `private` | ✅ | ❌ | ❌ |

- `class` defaults to **private** (members and inheritance). `struct` defaults to **public**. That's the **only** difference.
- Convention in LLD code: `struct` for interfaces and plain data, `class` for things with invariants.

**Inheritance mode** changes how the base's members appear in the derived class:

| Inherit as | Base `public` becomes | Base `protected` becomes | Meaning |
|---|---|---|---|
| `public` | public | protected | **is-a**: use this 99% of the time |
| `protected` | protected | protected | rare |
| `private` | private | private | "implemented-in-terms-of". Prefer **composition** instead. |

### Constructors: the pieces you need

```cpp
class Ticket {
public:
    Ticket(int id, std::string plate)          // parameterised
        : id_(id), plate_(std::move(plate)) {} // member initializer list (preferred over assignment in the body)

    explicit Ticket(int id) : Ticket(id, "") {} // delegating ctor + explicit (no silent int → Ticket conversion)

    Ticket(const Ticket&) = default;           // copy ctor
    Ticket& operator=(const Ticket&) = default;
    ~Ticket() = default;
private:
    const int id_;           // const member → MUST be set in the initializer list
    std::string plate_;
};
```

The initializer list is **required** for:
- `const` members
- reference members
- members with no default constructor
- base-class constructors that take arguments

`explicit` stops surprises like `void print(Ticket t); print(42);` compiling silently. Make single-argument constructors `explicit` by default.

### `this`, `static`, `const`: one line each

- `this` is a pointer to the current object. Return `*this` to allow chaining (`builder.setA(1).setB(2)`, the Builder pattern).
- `static` member = one copy shared by all objects, e.g. `static int nextId;`. A `static` function has no `this`, so it can't touch instance members. Used in Singleton and Factory.
- `const` member function (`int id() const`) promises not to modify the object. **Mark every getter `const`.** Interviewers notice.

---

## Part 2: abstract classes vs interfaces in C++ ★★★

C++ has **no `interface` keyword**. You build both concepts from **pure virtual functions**.

### Pure virtual function

```cpp
virtual double fee(int hours) const = 0;   // "= 0" → no implementation required here; derived MUST override
```

A class with **at least one** pure virtual function is **abstract**:
- ❌ You can't create an object of it: `PricingStrategy p;` is a compile error.
- ✅ You can have **pointers and references** to it: `PricingStrategy& p`, `std::unique_ptr<PricingStrategy>`.
- A derived class that doesn't override **every** pure virtual function is **also abstract**.

### Interface class (the C++ way of writing a Java `interface`)

**Rule:** only pure virtual functions + a virtual defaulted destructor + **no data members**.

```cpp
struct PaymentMethod {                          // "interface"
    virtual ~PaymentMethod() = default;         // ALWAYS: see Part 3
    virtual bool pay(double amount) = 0;
    virtual std::string name() const = 0;
};

struct UpiPayment : PaymentMethod {             // "implements"
    bool pay(double amount) override { /* call UPI */ return true; }
    std::string name() const override { return "UPI"; }
};
```

### Abstract class (shared state + some implemented behaviour + some varying behaviour)

```cpp
class Vehicle {                                  // abstract base
public:
    virtual ~Vehicle() = default;
    const std::string& plate() const { return plate_; }   // shared, non-virtual
    virtual SpotSize requiredSize() const = 0;             // varies per type
protected:
    explicit Vehicle(std::string plate) : plate_(std::move(plate)) {}  // protected ctor: only derived classes build it
private:
    std::string plate_;                                     // shared state
};
```

Yes, an abstract class **can** have a constructor, data members and normal methods. It just can't be instantiated directly.

### Which one do I use in an LLD answer?

| Use an **interface** when… | Use an **abstract class** when… |
|---|---|
| You're modelling a **capability / variation point**: `PricingStrategy`, `PaymentMethod`, `NotificationChannel`, `ElevatorScheduler` | You're modelling a **family of types** that share data and some code: `Vehicle`, `Account`, `User`, `Piece` (chess) |
| Many unrelated classes may implement it | Subclasses are genuinely "kinds of" the base |
| You want multiple implementations swappable at runtime (Strategy, DIP) | You want to avoid duplicating shared fields and methods |

**Interview heuristic:** interfaces for **behaviours**, abstract classes for **entity hierarchies**. Most LLD answers have 2–4 interfaces and 1–2 small abstract bases.

### Multiple interfaces = safe multiple inheritance

```cpp
class VendingMachine : public Payable, public Dispensable, public Refundable { ... };
```

Multiple inheritance of **interfaces** (no data) is safe, and it's exactly Java's `implements A, B, C`. The diamond problem (Part 9) only hurts when bases carry **state**.

### Pure virtual *with* a body (trivia, and occasionally useful) ⏭ *Skip for interviews*

```cpp
struct Logger {
    virtual ~Logger() = default;
    virtual void log(const std::string& m) = 0;
};
void Logger::log(const std::string& m) { std::cout << "[default] " << m; }  // body defined outside

struct FileLogger : Logger {
    void log(const std::string& m) override { Logger::log(m); /* + write to file */ }
};
```

The class is still abstract, but derived classes can call the default via `Base::f()`.

### Non-Virtual Interface (NVI) = Template Method pattern

```cpp
class Report {
public:
    void generate() {            // public, NON-virtual: fixed algorithm
        header(); body(); footer();
    }
    virtual ~Report() = default;
private:
    virtual void body() = 0;     // private virtual hook: only this step varies
    void header() { /*...*/ }
    void footer() { /*...*/ }
};
```

The base controls the *order*; subclasses fill in steps. This is the **Template Method** pattern from L3, and you get it almost for free in C++.

---

## Part 3: virtual functions, vtable, virtual destructor, `override`/`final` ★★★

### Early vs late binding

```cpp
struct Base    { void hi() { std::cout << "Base"; }  virtual void vhi() { std::cout << "Base"; }  virtual ~Base() = default; };
struct Derived : Base { void hi() { std::cout << "Derived"; } void vhi() override { std::cout << "Derived"; } };

Base* p = new Derived;
p->hi();    // "Base"     → non-virtual: decided at COMPILE time by the pointer type (early binding)
p->vhi();   // "Derived"  → virtual: decided at RUN time by the actual object (late binding)
delete p;
```

### How it works: vtable and vptr

- Every class with virtual functions gets **one vtable**: a static table of function pointers.
- Every **object** of such a class carries a hidden **vptr** that points to its class's vtable (usually +8 bytes on 64-bit).
- `p->vhi()` becomes: follow `p->vptr` → look up the slot for `vhi` → call it. That's one extra indirection, which is the "cost of virtual".

```
Derived object            Derived vtable
┌──────────┐              ┌──────────────────────┐
│ vptr ────┼────────────► │ &Derived::vhi        │
│ Base data│              │ &Derived::~Derived   │
│ Derived..│              └──────────────────────┘
└──────────┘
```

That's why `sizeof` a class grows by a pointer when it gains its first virtual function, and why a **constructor can't be virtual**: the vptr is set up *by* the constructor.

### Virtual destructor: the #1 C++ OOP interview question

```cpp
struct Base { ~Base() { std::cout << "~Base\n"; } };            // ❌ NOT virtual
struct Derived : Base {
    std::vector<int> big = std::vector<int>(1'000'000);
    ~Derived() { std::cout << "~Derived\n"; }
};

Base* p = new Derived;
delete p;   // UNDEFINED BEHAVIOUR. In practice prints only "~Base" → Derived's vector leaks
```

With `virtual ~Base()`, `delete p` dispatches to `~Derived()` first, then `~Base()` runs automatically.

**Rule (C++ Core Guidelines C.35):** a base class destructor should be **public and virtual**, or **protected and non-virtual**. In LLD code: **every base class and every interface gets `virtual ~X() = default;`.** Write it without thinking.

The same bug appears with `std::unique_ptr<Base>` holding a `Derived`: `unique_ptr` calls `delete` on a `Base*`. (`shared_ptr` created via `make_shared<Derived>` happens to call the right destructor because it remembers the real type. Don't rely on that.)

### `override`: let the compiler catch silent bugs

```cpp
struct Channel { virtual void send(const std::string& m) const = 0; virtual ~Channel() = default; };

struct Sms : Channel {
    void send(const std::string& m) { ... }            // ❌ forgot const → this is a NEW function, not an override.
                                                       //    Sms stays abstract, or worse, the base version gets called.
};
struct Sms2 : Channel {
    void send(const std::string& m) override { ... }   // ✅ compile ERROR: "does not override" → bug caught
};
```

**Always write `override`** on overriding functions (Core Guidelines C.128). It costs nothing and interviewers read it as "knows modern C++".

### `final`

```cpp
struct HourlyPricing final : PricingStrategy { ... };   // no one can inherit from HourlyPricing
struct Car : Vehicle { SpotSize requiredSize() const override final { ... } };  // no further override
```

Use `final` on leaf classes that aren't designed for extension. It documents intent, and it lets the compiler devirtualise calls.

### Two virtual-function traps (theory favourites)

**1. A virtual call inside a constructor or destructor does NOT dispatch to the derived class.**

```cpp
struct Base {
    Base() { init(); }                 // calls Base::init, NOT Derived::init
    virtual void init() { std::cout << "Base init"; }
    virtual ~Base() = default;
};
struct Derived : Base { void init() override { std::cout << "Derived init"; } };
Derived d;   // prints "Base init"
```

While `Base()` runs, the `Derived` part doesn't exist yet, so the object *is* a `Base` at that moment. (If `init` were pure virtual, you'd get a "pure virtual function called" crash.) The fix is a factory or a separate `init()` call after construction.

**2. Default arguments are bound statically.**

```cpp
struct A { virtual void f(int x = 1) { std::cout << x; } virtual ~A() = default; };
struct B : A { void f(int x = 2) override { std::cout << x; } };
A* p = new B; p->f();   // prints 1 ← B's body, but A's default argument (pointer type decides)
```

Rule: don't put default arguments on virtual functions.

---

## Part 4: object slicing ★★

Slicing = copying a derived object into a **base object by value**. The derived part gets "sliced off".

```cpp
Car car("KA-01");
Vehicle v = car;                      // ❌ (if copying were allowed) v is a plain Vehicle; car's extra data is gone
std::vector<Vehicle> lot;             // ❌ every push_back slices, and virtual calls go to Vehicle's versions
void park(Vehicle v);                 // ❌ pass by value slices

void park(const Vehicle& v);          // ✅ reference: no copy, polymorphism works
std::vector<std::unique_ptr<Vehicle>> lot;   // ✅ polymorphic collection
```

Where it bites in LLD:
- **Polymorphic containers.** Always `vector<unique_ptr<Base>>`, never `vector<Base>`.
- **Function parameters.** Take `const Base&`.
- **Exceptions.** `catch (const std::exception& e)` by reference, never by value.

**Prevention (Core Guidelines C.67):** in a polymorphic base, **delete** the public copy operations so slicing can't compile:

```cpp
class Vehicle {
public:
    Vehicle(const Vehicle&) = delete;
    Vehicle& operator=(const Vehicle&) = delete;
    virtual ~Vehicle() = default;
    // ...
};
```

Need copies of polymorphic objects? Add a **virtual `clone()`** (the "virtual constructor" idiom, which is the Prototype pattern):

```cpp
virtual std::unique_ptr<Vehicle> clone() const = 0;
std::unique_ptr<Vehicle> Car::clone() const { return std::make_unique<Car>(*this); } // needs Car's own (protected base) copy
```

---

## Part 5: rule of 0 / 3 / 5 ★★

The five "special members" that manage copying, moving and cleanup:
1. destructor
2. copy constructor
3. copy assignment
4. move constructor
5. move assignment

| Rule | Says | When |
|---|---|---|
| **Rule of 3** (C++98) | If you write **any** of destructor / copy ctor / copy assignment, you almost certainly need **all three** | Your class **owns a raw resource** (raw pointer, file handle, socket) |
| **Rule of 5** (C++11) | Same, plus move ctor + move assignment | Same, with modern C++ |
| **Rule of 0** ✅ | Write **none** of them. Hold resources in members that manage themselves (`std::string`, `std::vector`, `std::unique_ptr`) | **Default in LLD code** |

### Why the rule of 3 exists (the shallow-copy bug)

```cpp
class Buffer {                     // owns a raw array
    int* data; size_t n;
public:
    explicit Buffer(size_t n) : data(new int[n]), n(n) {}
    ~Buffer() { delete[] data; }
    // ❌ no copy ctor → compiler copies the POINTER (shallow copy)
};
Buffer a(10);
Buffer b = a;     // a.data == b.data
// both destructors run → delete[] twice → crash (double free)
```

Fix option 1 (rule of 3/5): write a deep-copying copy ctor, copy assignment, and move operations.
Fix option 2 (**rule of 0**, preferred): `std::vector<int> data;`. Copying, moving and cleanup are all correct automatically.

### Rule of 0 even for C resources

```cpp
struct FileCloser { void operator()(FILE* f) const { if (f) std::fclose(f); } };
class LogFile {
    std::unique_ptr<FILE, FileCloser> file_;     // RAII: closes automatically, non-copyable, movable
public:
    explicit LogFile(const char* path) : file_(std::fopen(path, "a")) {}
    void write(const std::string& s) { std::fputs(s.c_str(), file_.get()); }
};  // no destructor, no copy/move code → rule of 0
```

**RAII** (Resource Acquisition Is Initialization): acquire in the constructor, release in the destructor, so cleanup happens even when exceptions are thrown. `std::lock_guard` for mutexes is the same idea. You'll use it in L4 Concurrency.

### Polymorphic base: the one exception

A base class needs `virtual ~Base() = default;`. Declaring a destructor **stops the compiler from generating move operations**, and you should delete copy to prevent slicing (Part 4). So a polymorphic base usually states its special members explicitly:

```cpp
struct Shape {
    virtual ~Shape() = default;
    Shape() = default;
    Shape(const Shape&) = delete;
    Shape& operator=(const Shape&) = delete;
    // move also not generated → objects live behind unique_ptr anyway
    virtual double area() const = 0;
};
```

For **pure interfaces** held only through `unique_ptr`, the one-liner `virtual ~I() = default;` is enough in an interview.

---

## Part 6: smart pointers + ownership ★★★

In LLD C++ code, **the biggest signal of maturity is clear ownership**. Every pointer should answer the question "who deletes this?"

| Type | Meaning | Copy? | Use in LLD for |
|---|---|---|---|
| `std::unique_ptr<T>` | **Sole owner**. Deletes `T` when it dies. | ❌ move only | **Default.** Polymorphic members and collections: strategies, vehicles, floors |
| `std::shared_ptr<T>` | **Shared owner** (reference count). Last one out deletes. | ✅ | Genuinely shared lifetime. Rare in LLD; justify it if used. |
| `std::weak_ptr<T>` | **Non-owning observer** of a `shared_ptr` object. Doesn't keep it alive. | ✅ | Breaking cycles; observers that may disappear |
| `T*` (raw) | **Non-owning**, nullable reference | ✅ | "Points to something someone else owns" (a Ticket → its Spot) |
| `T&` | **Non-owning**, never null | — | Parameters, and injected dependencies that must exist |

**Create with `std::make_unique` / `std::make_shared`**. Never `new` in modern code (C++ Core Guidelines R.11, R.20–R.24).

### Ownership map for a parking lot

```cpp
class ParkingLot {
    std::vector<std::unique_ptr<ParkingFloor>> floors_;      // OWNS floors (composition)
    std::unique_ptr<PricingStrategy> pricing_;               // OWNS its strategy, swappable (Strategy + DIP)
    std::unordered_map<std::string, Ticket> activeTickets_;  // OWNS tickets (by value, not polymorphic)
};
struct Ticket {
    std::string id;
    const ParkingSpot* spot;      // does NOT own; the floor owns spots
    std::string vehiclePlate;     // or store an ID instead of a pointer: simplest, mirrors a DB
};
```

**Tip:** in LLD, storing **IDs** instead of pointers between entities is perfectly fine and avoids dangling pointers. Say "in a real system these would be foreign keys".

### `shared_ptr` cycles → leak; `weak_ptr` fixes it

```cpp
struct Subscriber;
struct Topic {
    std::vector<std::shared_ptr<Subscriber>> subs;   // Topic keeps subscribers alive
};
struct Subscriber {
    std::shared_ptr<Topic> topic;                     // ❌ Subscriber keeps Topic alive → cycle → never freed
    // std::weak_ptr<Topic> topic;                    // ✅ back-reference as weak_ptr
};
// Using a weak_ptr:
if (auto t = sub.topic.lock()) { /* still alive, use t */ } else { /* already gone */ }
```

**The Observer pattern in C++** often holds observers as `weak_ptr`, so a destroyed observer doesn't crash the subject, or uses raw pointers plus an explicit `unsubscribe()` in the observer's destructor. Mention this when you design pub-sub or notifications (L3).

---

## Part 7: association vs aggregation vs composition ★★★

These appear in **every class diagram**. Interviewers expect the right arrow *and* the right C++ member type.

| Relationship | Meaning | Lifetime | UML | C++ member | LLD example |
|---|---|---|---|---|---|
| **Dependency** | *uses* temporarily | none | dashed arrow `┄┄>` | function **parameter** or local | `PaymentService::pay(PaymentMethod&)` |
| **Association** | *knows about* | independent | solid line / arrow `──>` | raw pointer / reference / **ID** | `Ticket → ParkingSpot`, `Booking → Show` |
| **Aggregation** | *has-a*, parts can exist alone, may be shared | independent | hollow diamond `◇──` | non-owning pointer / ID / sometimes `shared_ptr` | `Team ◇── Player`, `Playlist ◇── Song` |
| **Composition** | *owns*, part dies with the whole | **same** | filled diamond `◆──` | **member by value** or `unique_ptr` | `ParkingLot ◆── Floor ◆── Spot`, `Order ◆── OrderItem` |
| **Inheritance** | *is-a* | — | hollow triangle `──▷` | `: public Base` | `Car ──▷ Vehicle` |
| **Realisation** | *implements* | — | dashed hollow triangle `┄┄▷` | `: public Interface` | `UpiPayment ┄┄▷ PaymentMethod` |

**How to decide in 3 seconds:** "If I delete the whole, should the part be deleted too?"
- Yes → **composition**.
- No, but it's a "has" relationship → **aggregation**.
- It just refers to it → **association**.
- Only a method parameter → **dependency**.

Honest note: many interviewers treat association and aggregation as the same thing. **Composition vs "not owned"** is the distinction that really matters, and in C++ it maps directly onto `unique_ptr`/value vs pointer/ID.

---

## Part 8: extras worth knowing for LLD code

### `enum class` over plain `enum`

```cpp
enum class SpotSize { Small, Medium, Large };   // scoped: SpotSize::Small; no implicit int conversion
enum class Direction { Up, Down, Idle };        // elevator state
```

Plain `enum` leaks names into the surrounding scope and converts to int silently. Always use `enum class` in LLD.

### Thread-safe singleton (Meyers singleton)

```cpp
class Logger {
public:
    static Logger& instance() {
        static Logger inst;          // initialised once, thread-safe since C++11
        return inst;
    }
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;
    void log(const std::string& m);
private:
    Logger() = default;              // private ctor: no one else can create it
};
```

That's the whole Singleton pattern in C++. Say "thread-safe because of C++11 magic statics", and add that you'd **prefer dependency injection** over a singleton for testability. Interviewers like that caveat.

### Custom type as an `unordered_map` key

```cpp
struct SeatKey {
    int row, col;
    bool operator==(const SeatKey& o) const { return row == o.row && col == o.col; }
};
struct SeatKeyHash {
    size_t operator()(const SeatKey& k) const { return std::hash<int>{}(k.row) * 31 + std::hash<int>{}(k.col); }
};
std::unordered_map<SeatKey, SeatStatus, SeatKeyHash> seats;   // BookMyShow seat map
```

`std::map` needs `operator<` instead. Useful for BookMyShow, the chess board and tic-tac-toe.

### `std::optional` for "may not exist"

```cpp
std::optional<int> findFreeSpot(const Vehicle& v);    // instead of returning -1 or nullptr
if (auto spot = findFreeSpot(v)) use(*spot);
```

### `dynamic_cast` is a design smell in LLD

```cpp
if (auto* car = dynamic_cast<Car*>(v)) { ... }        // works (needs a polymorphic base), but…
```

If you're checking types with `dynamic_cast` or type enums in `if` chains, you probably should have added a **virtual function** instead (Open/Closed). Say that if the interviewer pushes.

---

## Part 9: theory questions they may ask

**Frequency:** 🟢 = often asked, even in LLD rounds · 🟡 = sometimes · ⚪ = theory rounds only

### 🟢 Q1. Order of constructor and destructor calls in inheritance

```cpp
struct Member  { Member()  { std::cout << "Member ctor\n"; }  ~Member()  { std::cout << "Member dtor\n"; } };
struct Base    { Base()    { std::cout << "Base ctor\n"; }    virtual ~Base() { std::cout << "Base dtor\n"; } };
struct Derived : Base {
    Member m;
    Derived() { std::cout << "Derived ctor\n"; }
    ~Derived() { std::cout << "Derived dtor\n"; }
};
int main() { Derived d; }
```

```
Base ctor       ← 1. base classes first (in the order listed in the class head)
Member ctor     ← 2. members, in DECLARATION order (not initializer-list order!)
Derived ctor    ← 3. the constructor body
Derived dtor    ← destruction is the exact reverse
Member dtor
Base dtor
```

**Trap:** members initialise in **declaration order** even if your initializer list is written in a different order. If `b_` is declared before `a_`, then `: a_(1), b_(a_ + 1)` reads an uninitialised `a_`. Compilers warn with `-Wreorder`.

**How the derived class calls a base constructor with arguments:** only through the initializer list:

```cpp
class Car : public Vehicle {
public:
    explicit Car(std::string plate) : Vehicle(std::move(plate)) {}   // explicit base ctor call
    // or inherit all base ctors: using Vehicle::Vehicle;
};
```

If you don't call one, the base's **default** constructor is used. That's a compile error if the base doesn't have one.

### 🟢 Q2. Why must a base-class destructor be virtual?
See Part 3: `delete basePtr` on a derived object is UB without it, and in practice the derived destructor never runs, so resources leak.

### 🟢 Q3. Overloading vs overriding vs hiding

| | Where | Signature | Resolved at |
|---|---|---|---|
| **Overloading** | same scope | different parameters | compile time |
| **Overriding** | base (`virtual`) vs derived | **same** signature | run time |
| **Hiding** ⚠️ | derived declares the same **name** | any | compile time |

The hiding trap:

```cpp
struct Base    { void f(int);  void f(double); virtual ~Base() = default; };
struct Derived : Base { void f(int); };   // hides BOTH Base::f overloads
Derived d; d.f(3.14);                     // calls Derived::f(int) → 3 ! (Base::f(double) is hidden)
// fix: add `using Base::f;` inside Derived
```

### 🟢 Q4. Abstract class vs interface? Can an abstract class have a constructor?
Yes. See Part 2. The constructor is called by derived constructors; make it `protected`.

### 🟡 Q5. Can a constructor be virtual? Can a destructor be pure virtual?
- **Constructor: no.** The vptr doesn't exist until construction sets it up. Use a virtual `clone()` or a factory instead.
- **Destructor: yes**, `virtual ~Base() = 0;`, but you **must still define it** (`Base::~Base() {}`), because derived destructors always call it. It's used to make a class abstract when it has no other pure virtual function.

### 🟡 Q6. Friend function / friend class
A `friend` declared inside a class gets access to its **private and protected** members without being a member.

```cpp
class Money {
    long paise_;
public:
    explicit Money(long p) : paise_(p) {}
    friend std::ostream& operator<<(std::ostream& os, const Money& m) {   // classic use
        return os << "₹" << m.paise_ / 100 << '.' << m.paise_ % 100;
    }
};
```

- Friendship is **not inherited, not transitive, not mutual**.
- Legitimate uses: `operator<<` / `operator>>`, symmetric operators, and tightly coupled helpers (e.g. a Builder filling a class's private fields).
- **In LLD, avoid it.** It weakens encapsulation. If you need it, say why.

### 🟡 Q7. The diamond problem and virtual inheritance

```cpp
struct Device  { int id; };
struct Scanner : Device {};
struct Printer : Device {};
struct Copier  : Scanner, Printer {};   // ❌ two copies of Device → copier.id is ambiguous

struct Scanner2 : virtual Device {};
struct Printer2 : virtual Device {};
struct Copier2  : Scanner2, Printer2 {}; // ✅ one shared Device sub-object
```

With virtual inheritance, the **most-derived** class (`Copier2`) constructs the virtual base directly. **LLD takeaway:** avoid diamonds with state entirely. Use interfaces (no data) plus composition, and the problem disappears. That's why Java allows multiple interfaces but only one class parent.

### 🟡 Q8. Shallow vs deep copy? Why does a copy constructor take `const T&`?
- **Shallow vs deep:** see the rule-of-3 example in Part 5.
- **By reference:** taking the parameter **by value** would itself need a copy → infinite recursion. It won't compile.
- **`const`:** so you can copy from `const` objects and temporaries.

### ⚪ Q9. `sizeof` an empty class? With one virtual function? ⏭ *Skip for interviews*
- **Empty class: 1 byte.** Each object needs a unique address.
- **One virtual function:** the size of a pointer (the vptr), typically **8 bytes** on 64-bit.

### ⚪ Q10. Private constructor / private destructor: why?
- **Private constructor:** Singleton, or a factory-only class (a static `create()` controls construction).
- **Private or protected destructor:** prevents stack objects and forces destruction through a controlled path, e.g. `destroy()`, or deleting via a base with a protected non-virtual destructor.

### ⚪ Q11. `struct` vs `class`? ⏭ *Skip for interviews*
Only default access differs: `struct` is public and `class` is private, for both members and inheritance.

---

## Part 10: putting it together

### A complete mini LLD in modern C++

This uses almost everything above: interface, abstract base, `override`/`final`, a virtual destructor, deleted copy (no slicing), `unique_ptr` ownership, non-owning pointers, `enum class`, `optional` and composition.

```cpp
#include <iostream>
#include <memory>
#include <optional>
#include <stdexcept>
#include <string>
#include <vector>

enum class SpotSize { Small, Medium, Large };

// Interface: a variation point (Strategy). Behaviour only, no state.
struct PricingStrategy {
    virtual ~PricingStrategy() = default;
    virtual double fee(int hours) const = 0;
};

struct HourlyPricing final : PricingStrategy {
    explicit HourlyPricing(double rate) : rate_(rate) {}
    double fee(int hours) const override { return hours * rate_; }
private:
    double rate_;
};

// Abstract class: an entity hierarchy with shared state.
class Vehicle {
public:
    explicit Vehicle(std::string plate) : plate_(std::move(plate)) {}
    virtual ~Vehicle() = default;
    Vehicle(const Vehicle&) = delete;                 // prevent slicing copies
    Vehicle& operator=(const Vehicle&) = delete;
    const std::string& plate() const { return plate_; }
    virtual SpotSize requiredSize() const = 0;
private:
    std::string plate_;
};

class Bike final : public Vehicle {
public:
    using Vehicle::Vehicle;                           // inherit constructor
    SpotSize requiredSize() const override { return SpotSize::Small; }
};

class Car final : public Vehicle {
public:
    using Vehicle::Vehicle;
    SpotSize requiredSize() const override { return SpotSize::Medium; }
};

class ParkingSpot {
public:
    ParkingSpot(int id, SpotSize size) : id_(id), size_(size) {}
    bool canFit(const Vehicle& v) const {             // encapsulation: the spot owns the rule
        return vehicle_ == nullptr && static_cast<int>(v.requiredSize()) <= static_cast<int>(size_);
    }
    void park(const Vehicle& v) { vehicle_ = &v; }
    void release() { vehicle_ = nullptr; }
    int id() const { return id_; }
private:
    int id_;
    SpotSize size_;
    const Vehicle* vehicle_ = nullptr;                // association: non-owning
};

class ParkingLot {
public:
    explicit ParkingLot(std::unique_ptr<PricingStrategy> pricing) : pricing_(std::move(pricing)) {}
    void addSpot(int id, SpotSize size) { spots_.emplace_back(id, size); }

    std::optional<int> park(const Vehicle& v) {
        for (auto& s : spots_)
            if (s.canFit(v)) { s.park(v); return s.id(); }
        return std::nullopt;
    }

    double checkout(int spotId, int hours) {
        for (auto& s : spots_)
            if (s.id() == spotId) { s.release(); return pricing_->fee(hours); }
        throw std::invalid_argument("no such spot");
    }
private:
    std::vector<ParkingSpot> spots_;                  // composition: spots die with the lot
    std::unique_ptr<PricingStrategy> pricing_;        // owned + swappable (DIP)
};

int main() {
    ParkingLot lot(std::make_unique<HourlyPricing>(20));
    lot.addSpot(1, SpotSize::Small);
    lot.addSpot(2, SpotSize::Medium);

    std::vector<std::unique_ptr<Vehicle>> vehicles;   // polymorphic collection, no slicing
    vehicles.push_back(std::make_unique<Car>("KA-01-1234"));
    vehicles.push_back(std::make_unique<Bike>("KA-02-9999"));

    for (const auto& v : vehicles)
        if (auto spot = lot.park(*v))
            std::cout << v->plate() << " -> spot " << *spot << '\n';

    std::cout << "fee: " << lot.checkout(2, 3) << '\n';
}
```

Output:

```
KA-01-1234 -> spot 2
KA-02-9999 -> spot 1
fee: 60
```

**How to lay out a C++ LLD answer in 45 minutes:** one file, in this order:
1. `enum class`es
2. interfaces
3. entities
4. services/orchestrator
5. `main()` demo

`#include <bits/stdc++.h>` is acceptable in an interview if you say "in production I'd include specific headers".

### C++ ↔ Java ↔ TypeScript cheat sheet

| Concept | C++ | Java | TypeScript |
|---|---|---|---|
| Interface | `struct I { virtual ~I() = default; virtual void f() = 0; };` | `interface I { void f(); }` | `interface I { f(): void }` |
| Implement | `class A : public I` | `class A implements I` | `class A implements I` |
| Abstract class | ≥1 pure virtual (`= 0`) | `abstract class` + `abstract` methods | `abstract class` + `abstract` methods |
| Inherit | `class B : public A` | `class B extends A` | `class B extends A` |
| Polymorphic by default? | ❌ need `virtual` | ✅ all instance methods | ✅ |
| Mark override | `override` | `@Override` | `override` (with `noImplicitOverride`) |
| Block inheritance | `final` | `final` | ❌ (no equivalent) |
| Multiple inheritance | ✅ classes too (avoid with state) | interfaces only | interfaces only |
| Memory / cleanup | RAII, destructors, smart pointers | GC, `AutoCloseable` + try-with-resources | GC |
| Virtual destructor needed | ✅ | ❌ | ❌ |
| Non-owning ref | `T*`, `T&` | every reference | every reference |
| Enum | `enum class` | `enum` (can have fields and methods) | `enum` or union of string literals |
| Access control | `public:`/`protected:`/`private:` sections | per member + package-private default | compile-time `private`, runtime `#private` |
| Overloading | ✅ | ✅ | signatures only, one implementation |
| Singleton | function-local `static` | enum singleton / holder class | module-level instance |
| Threads | `std::thread`, `std::mutex` | `Thread`, `synchronized`, `ExecutorService` | ❌ single-threaded (workers) |

**Takeaway:** once you know the C++ column, Java is the same design with less to manage.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What makes a class abstract in C++, and how do you write an "interface"?</summary>

At least one pure virtual function (`= 0`) makes it abstract: it can't be instantiated, but pointers and references to it work. An interface is a class with only pure virtual functions, a `virtual ~I() = default;` destructor, and no data members.
</details>

<details><summary>2. <code>Base* p = new Derived; delete p;</code>: what goes wrong without a virtual destructor?</summary>

Undefined behaviour. In practice only `~Base()` runs, so `Derived`'s resources leak. Fix: `virtual ~Base() = default;`. Rule: base destructors are public+virtual or protected+non-virtual.
</details>

<details><summary>3. Why write <code>override</code> if the code already works?</summary>

It turns silent mismatches (a missing `const`, a different parameter type) into compile errors. Without it you might create a new function instead of overriding, leaving the class abstract or calling the base version.
</details>

<details><summary>4. What is object slicing, and name two ways to prevent it.</summary>

Copying a derived object into a base object by value, which loses the derived part and its virtual behaviour. Prevent it by (1) using references or pointers (`const Base&`, `vector<unique_ptr<Base>>`), and (2) deleting copy operations in the polymorphic base (C.67). If copies are needed, add a virtual `clone()`.
</details>

<details><summary>5. State the rule of 0 and why it's preferred in LLD code.</summary>

Write none of the five special member functions. Let members that manage themselves (`string`, `vector`, `unique_ptr`) handle copy, move and cleanup. There's less code, fewer bugs (no double free or leaks), and the compiler-generated behaviour is correct.
</details>

<details><summary>6. When do you use <code>unique_ptr</code>, <code>shared_ptr</code>, <code>weak_ptr</code> and raw pointers in an LLD answer?</summary>

- `unique_ptr`: sole ownership. The default for owned polymorphic members and collections.
- `shared_ptr`: genuinely shared lifetime. Rare; justify it.
- `weak_ptr`: non-owning references to `shared_ptr` objects, to break cycles or for observers.
- Raw pointer / reference: non-owning links to objects someone else owns (or just store IDs).
</details>

<details><summary>7. <code>ParkingLot</code>–<code>Floor</code>, <code>Ticket</code>–<code>Spot</code>, <code>Team</code>–<code>Player</code>: which relationship is each, and what's the C++ member type?</summary>

- ParkingLot–Floor: **composition**, a member by value or `unique_ptr`.
- Ticket–Spot: **association**, a raw pointer or a spot ID.
- Team–Player: **aggregation**, a non-owning pointer or ID, since players outlive the team.
</details>

<details><summary>8. Give the construction and destruction order for <code>Derived : Base</code> with a member <code>m</code>. What's the initializer-list trap?</summary>

Construction: Base → members (in declaration order) → Derived body. Destruction is the exact reverse. Trap: members initialise in **declaration** order, not initializer-list order, so reading one member while initialising another can use an uninitialised value.
</details>

<details><summary>9. A virtual function is called from the base constructor. Which version runs, and why?</summary>

The base version. During `Base()`, the derived part isn't constructed yet and the vptr points to Base's vtable. If the function is pure virtual, you get a "pure virtual function called" crash. Use a factory or a separate init step instead.
</details>

<details><summary>10. Why does Java allow multiple interfaces but only one parent class? Connect it to C++.</summary>

To avoid the diamond problem with **state**: two parents carrying the same base data leads to ambiguity or duplication. Interfaces carry no state, so multiple implementation is safe. In C++ you get the same safety by inheriting only from interfaces and using composition for shared state (or virtual inheritance as a last resort).
</details>

---

## My notes (write from memory after reading)

- 
- 
- 

**One thing I'd have got wrong before reading this:**

---

## Sources / read more

All free. learncpp.com chapter numbers are current as of Sep 2026.

| Topic | Source | Section |
|---|---|---|
| Constructors, initializer lists, delegating, `explicit` | learncpp.com | [14.9](https://www.learncpp.com/cpp-tutorial/introduction-to-constructors/) · [14.10](https://www.learncpp.com/cpp-tutorial/constructor-member-initializer-lists/) · [14.12](https://www.learncpp.com/cpp-tutorial/delegating-constructors/) · [14.16](https://www.learncpp.com/cpp-tutorial/converting-constructors-and-the-explicit-keyword/) |
| Copy ctor, shallow vs deep copy | learncpp.com | [14.14](https://www.learncpp.com/cpp-tutorial/introduction-to-the-copy-constructor/) · [21.13](https://www.learncpp.com/cpp-tutorial/shallow-vs-deep-copying/) |
| `this`, `const` members, `static` | learncpp.com | [15.1](https://www.learncpp.com/cpp-tutorial/the-hidden-this-pointer-and-member-function-chaining/) · [14.4](https://www.learncpp.com/cpp-tutorial/const-class-objects-and-const-member-functions/) · [15.6](https://www.learncpp.com/cpp-tutorial/static-member-variables/) · [15.7](https://www.learncpp.com/cpp-tutorial/static-member-functions/) |
| Friend | learncpp.com | [15.8](https://www.learncpp.com/cpp-tutorial/friend-non-member-functions/) |
| Object relationships | learncpp.com | [23.1 Overview](https://www.learncpp.com/cpp-tutorial/object-relationships/) · [23.2 Composition](https://www.learncpp.com/cpp-tutorial/composition/) · [23.3 Aggregation](https://www.learncpp.com/cpp-tutorial/aggregation/) · [23.4 Association](https://www.learncpp.com/cpp-tutorial/association/) · [23.5 Dependencies](https://www.learncpp.com/cpp-tutorial/dependencies/) |
| Inheritance, ctor order, access | learncpp.com | [24.3 Construction order](https://www.learncpp.com/cpp-tutorial/order-of-construction-of-derived-classes/) · [24.5 Access specifiers](https://www.learncpp.com/cpp-tutorial/inheritance-and-access-specifiers/) |
| **Virtual functions (★ read all of chapter 25)** | learncpp.com | [25.2 Virtual functions](https://www.learncpp.com/cpp-tutorial/virtual-functions/) · [25.3 override/final](https://www.learncpp.com/cpp-tutorial/the-override-and-final-specifiers-and-covariant-return-types/) · [25.4 Virtual destructors](https://www.learncpp.com/cpp-tutorial/virtual-destructors-virtual-assignment-and-overriding-virtualization/) · [25.5 Early/late binding](https://www.learncpp.com/cpp-tutorial/early-binding-and-late-binding/) · [25.6 The vtable](https://www.learncpp.com/cpp-tutorial/the-virtual-table/) · [25.7 Pure virtual, abstract, interface](https://www.learncpp.com/cpp-tutorial/pure-virtual-functions-abstract-base-classes-and-interface-classes/) · [25.8 Virtual base classes](https://www.learncpp.com/cpp-tutorial/virtual-base-classes/) · [25.9 Object slicing](https://www.learncpp.com/cpp-tutorial/object-slicing/) · [25.10 dynamic_cast](https://www.learncpp.com/cpp-tutorial/dynamic-casting/) |
| Smart pointers + move | learncpp.com | [22.1 Intro](https://www.learncpp.com/cpp-tutorial/introduction-to-smart-pointers-move-semantics/) · [22.3 Move ctor](https://www.learncpp.com/cpp-tutorial/move-constructors-and-move-assignment/) · [22.5 unique_ptr](https://www.learncpp.com/cpp-tutorial/stdunique_ptr/) · [22.6 shared_ptr](https://www.learncpp.com/cpp-tutorial/stdshared_ptr/) · [22.7 weak_ptr and cycles](https://www.learncpp.com/cpp-tutorial/circular-dependency-issues-with-stdshared_ptr-and-stdweak_ptr/) |
| Reference | cppreference | [Abstract class](https://en.cppreference.com/w/cpp/language/abstract_class) · [virtual](https://en.cppreference.com/w/cpp/language/virtual) · [Rule of 3/5/0](https://en.cppreference.com/w/cpp/language/rule_of_three) |
| The rules interviewers quote | C++ Core Guidelines | [C.35 virtual dtor](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rc-dtor-virtual) · [C.67 no copy in polymorphic class](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rc-copy-virtual) · [C.20 rule of zero](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rc-zero) · [C.21 rule of five](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rc-five) · [C.128 override](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rh-override) · [C.121 interfaces = pure abstract](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rh-abstract) · [R.20 unique/shared_ptr for ownership](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-owner) · [R.21 prefer unique_ptr](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-unique) · [R.24 weak_ptr for cycles](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-weak_ptr) |

**Suggested reading order (≈ 4 days × 30 min):**
1. **Day 1:** learncpp 25.2–25.7.
2. **Day 2:** 25.8–25.10 + 22.5–22.7.
3. **Day 3:** 23.1–23.5 + 21.13 + Core Guidelines C.35/C.67/C.20.
4. **Day 4:** type out and run the Part 10 example, then do the self-test.

**Connects to:** [L2 OOP + SOLID](L2-OOP-SOLID.md) · [L3 Patterns](L3-Patterns.md) (Strategy, Template Method, Singleton, Prototype, Observer) · L4 Concurrency (RAII, `lock_guard`) · Questions: Parking lot, Vending machine, BookMyShow, Pub-sub
