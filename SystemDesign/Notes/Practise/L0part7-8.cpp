
// Part 7: Object Relationships (The Class Diagram Rubric)

// This section tells you how objects connect in memory. Master the 3-second rule to decide your relationship type: "If I delete the parent, should the child be deleted too?"

// 1. Dependency (┄┄>) — Uses Temporarily

// • Meaning: Class A uses Class B briefly to complete a specific task, then drops it.
// • C++ Blueprint: Pass it as a function parameter or create it as a local function variable.
// • LLD Example: PaymentService::pay(PaymentMethod& method)

// 2. Association (──>) — Knows About

// • Meaning: Two completely independent objects that know about each other. Their lifecycles have nothing to do with each other.
// • C++ Blueprint: Stored as a raw pointer, reference, or a primitive ID string/int.
// • LLD Example: A Ticket points to a ParkingSpot.

// 3. Aggregation (◇──) — Has-A (Loose Container)

// • Meaning: Class A acts as a container for Class B items. The items can exist perfectly fine without the container and can even be shared.
// • The 3-Second Rule: If you delete the container, the items do NOT die.
// • C++ Blueprint: Stored as a pointer to an external object (std::weak_ptr or raw pointer).
// • LLD Example: A Playlist contains Song* pointers. Delete the playlist, the songs remain in the catalog.

// 4. Composition (◆──) — Owns Strictly (Strict Container)

// • Meaning: Class B is a physical, inseparable part of Class A.
// • The 3-Second Rule: If you delete the parent, the children die immediately.
// • C++ Blueprint: Stored by value (member variable) or wrapped inside a std::unique_ptr.
// • LLD Example: A ParkingLot strictly owns its Floor instances.

// 5. Inheritance (──▷) & Realisation (┄┄▷)

// • Inheritance (Is-A): Extending a base class (class Car : public Vehicle).
// • Realisation (Implements): Implementing a pure abstract interface class (class UpiPayment : public PaymentMethod).

// Part 8: Extras Worth Knowing (C++ LLD Best Practices)

// These are modern C++ design patterns and features that show interviewers you write modern, high-grade production code instead of outdated code.

// 1. enum class over Plain enum

// • Plain enums leak names into the global scope and silently convert to raw integers, causing subtle bugs.
// • enum class locks the states inside a type-safe scope.
// • LLD Blueprint: enum class SpotSize { Small, Medium, Large }; (must be accessed cleanly as SpotSize::Small).

// 2. Thread-Safe Singleton (Meyers Singleton)

// • Used when an application needs exactly one global instance of a class (like a shared Logger or configuration manager).
// • Storing a static variable inside a function body guarantees it will be instantiated exactly once in a globally shared memory space, completely thread-safe (thanks to C++11 compiler magic).
// • LLD Blueprint:cpp
// static Logger& instance() {
//     static Logger inst; // Created once globally on first ever call
//     return inst;
// }
// Use code with caution.

// 3. Custom Type as an unordered_map Key

// • When creating grid-based LLDs (like a Chess board or BookMyShow seating arrangement), you use custom coordinates (SeatKey { int row, col; }) as map keys.
// • std::unordered_map cannot hash custom structs out of the box. You must provide an Equality Operator (==) and a Custom Hash Struct to convert your object coordinates into a unique math number.

// 4. std::optional for "May Not Exist"

// • Used when a search function might come back empty (e.g., trying to find an empty parking spot when the lot is full).
// • Instead of returning problematic legacy placeholders like nullptr or -1, wrap the return type in std::optional<T>. It explicitly forces the calling code to safely verify if a value exists.

// 5. dynamic_cast is a Design Smell

// • Forcefully casting generic pointers at runtime (e.g., asking Vehicle* if it's explicitly a Car*) breaks the Open/Closed Principle.
// • If you find yourself chain-checking types using if/else, you should replace the entire type logic with a virtual function on the base class and rely on pure polymorphism instead.

// ============================================================================
// WHAT I LEARNED (L0 Parts 7 & 8: relationships + modern C++ extras)
// ============================================================================
// - Relationship rubric: Dependency < Association < Aggregation < Composition; plus
//   Inheritance (is-a) and Realisation (implements interface).
// - enum class: scoped + type-safe, no implicit int conversion, no global name leak.
// - Meyers Singleton: function-local static is created once and thread-safe (C++11).
// - Custom struct as unordered_map key needs operator== AND a custom hash.
// - std::optional<T> for "may not exist" instead of nullptr / -1.
// - dynamic_cast / type if-else chains are a design smell (violates OCP); use a virtual function.