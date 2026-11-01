#include <iostream>
#include <string>
#include <utility> // For std::move

// ==========================================
// 1. STRUCT VS CLASS: THE DEFAULT DIFFERENCE
// ==========================================

// In LLD, structs are conventionally used for pure data packets (DTOs) or Interfaces.
struct LineItem {
    // No specifier? Defaults to PUBLIC.
    std::string itemName;
    double price;
};

// In LLD, classes are used when you have "invariants" (rules you must enforce via encapsulating state).
class Ticket {
    // No specifier? Defaults to PRIVATE.
    // -------------------------------------------------------------
    // ACCESS SPECIFIERS MATRIX (Inside Class | Derived Class | Outside)
    // public:                           ✅ | ✅ | ✅
    // protected:                        ✅ | ✅ | ❌
    // private:                          ✅ | ❌ | ❌
    // -------------------------------------------------------------
private:
    static int nextId_;    // STATIC MEMBER: Only ONE copy exists, shared by all instances.
    const int id_;    // CONST MEMBER: Cannot change after creation. MUST be set in initializer list.
    int quantity_; 
    std::string& logRef_;  // REFERENCE MEMBER: Cannot be re-bound. MUST be set in initializer list.
    std::string plate_;

public:
    // ==========================================
    // 2. CONSTRUCTORS & INITIALIZER LISTS
    // ==========================================

    // The Member Initializer List runs BEFORE the constructor body executing.
    // It is REQUIRED for: const members, reference members, and base classes without a default ctor.
    explicit Ticket(int id, std::string plate, std::string& externalLog)
        : id_(id),                     // Initializing const member
          logRef_(externalLog),        // Initializing reference member
          plate_(std::move(plate))     // std::move avoids an extra copy (preferred over assignment inside body)
          //Two question what is happening here? mean string & mean you are saying tke ref of an existing string rather than making a copy.
          // and waht is move?
          // std::move essentially casts an object to an rvalue reference, signaling that its resources can be "moved from" rather than copied.
          // explin  both 
          // 1. std::string& means we are taking a reference to an existing string rather than making a copy. ( this is know)
          //    This is efficient because it avoids copying the string, but it also means the original string must outlive this reference. ( its mean we have instilaize them in constrcutor? Yes, reference members must be initialized in the constructor's initializer list.)
          // 2. std::move is used to indicate that the resources of the string can be "moved" rather than copied.
          
          //    This is useful for optimizing performance by transferring ownership of the underlying data instead of duplicating it.
    {
        // Body assignment like "this->plate_ = plate;" would mean:
        // 1. Construct an empty string -> 2. Overwrite it with a copy. Wasteful!
        this->quantity_ = 0; // Initialize quantity to a default value (could be any appropriate default)
    }

    // DELEGATING CONSTRUCTOR + EXPLICIT
    // explicit: Stops the compiler from doing silent, implicit type conversions.
    // e.g., void inspect(Ticket t); -> calling inspect(42); will fail to compile.
    explicit Ticket(int id, std::string& externalLog) 
        : Ticket(id, "UNKNOWN_PLATE", externalLog) {} // Delegates to the 3-argument constructor above

    // Rule of 0 / Defaults: Letting the compiler generate standard copies safely.
    Ticket(const Ticket&) = default;            // Copy Constructor
    Ticket& operator=(const Ticket&) = default; // Copy Assignment Operator
    ~Ticket() = default;                        // Destructor

    // ==========================================
    // 3. THIS, STATIC, AND CONST MECHANICS
    // ==========================================

    // CONST MEMBER FUNCTION: Promises not to modify any instance state. 
    // Interviewers check this: Always mark getters as 'const'.
    int getId() const { 
        return this->id_; // 'this' is a hidden pointer to the current object instance.
    }
    int getQuantity() const {
        return this->quantity_;
    }

    std::string getPlate() const { return plate_; }

    // 'THIS' POINTER CHAINING (The Fluid API / Builder Pattern)
    // Returns a reference to itself (*this), allowing us to chain calls back-to-back.
    Ticket& updatePlate(std::string newPlate) {
        this->plate_ = std::move(newPlate);
        return *this; // Returns the updated object itself by reference
    }
    Ticket& updateQuantity(Ticket newTicket) {
        this->quantity_ = newTicket.getQuantity();
        return *this;
    }

    // STATIC MEMBER FUNCTION: Has NO 'this' pointer. 
    // It belongs to the class type itself, not any specific object instance.
    // It can ONLY access static member variables.
    static int generateGlobalNextId() {
        // id_ = 10; // ERROR: Can't touch non-static members because there is no 'this' object instance here.
        return nextId_++; 
    }
};

// Allocation/Instantiation of static members must occur outside the class definition body
int Ticket::nextId_ = 1001;


// ==========================================
// 4. INHERITANCE MODES: HOW ACCESSIBILITY CHANGES
// ==========================================

// Base Class to showcase inheritance visibility conversions
class Base {
public:    int pubMem;
protected: int protMem;
private:   int privMem;
};

// PUBLIC INHERITANCE (99% of LLD code): Represents an "is-a" relationship.
// - public remains public, protected remains protected. Private is completely hidden.
class PublicDerived : public Base {
    void check() {
        pubMem = 1;   // OK (Treats as public)
        protMem = 2;  // OK (Treats as protected)
        // privMem = 3; // ERROR: Unreachable. Private is locked to Base class only.
    }
};

// PROTECTED INHERITANCE (Rare): 
// - Both public and protected elements become PROTECTED inside this class hierarchy.
class ProtectedDerived : protected Base {
    void check() {
        pubMem = 1;   // OK (Now acts as protected internally)
        protMem = 2;  // OK (Now acts as protected internally)
    }
};

// PRIVATE INHERITANCE (Defaults here if you use class without a specifier): 
// - Represents "Implemented-in-terms-of". Everything from Base gets squeezed down into PRIVATE access.
// - Generally frowned upon in LLD; always prefer object composition over private inheritance.
class PrivateDerived : private Base {
    void check() {
        pubMem = 1;   // OK (But turns into private for any future children of PrivateDerived)
    }
};


// ==========================================
// EXECUTION & VERIFICATION
// ==========================================
int main() {
    std::string sharedSystemLog = "System Started. ";

    // Using Static methods cleanly without constructing any objects first
    int assignedId = Ticket::generateGlobalNextId(); 

    // Constructing an object explicitly
    Ticket ticketA(assignedId, "ABC-1234", sharedSystemLog);
    Ticket ticketB =Ticket(Ticket::generateGlobalNextId(), sharedSystemLog);

    // METHOD CHAINING PROOF ('this' chaining)
    // We execute .updatePlate() which updates the internal state and hands back the reference to continue execution
    ticketA.updatePlate("XYZ-9999").updatePlate("PROD-7777"); 
    std::cout << "Final Chained Plate: " << ticketA.getPlate() << "\n";
    // ticketA.updateQuantity({Ticket::generateGlobalNextId(), "XYZ-9999", sharedSystemLog}); // Example usage of the new updateQuantity method
    // Ticket ticketC= {Ticket::generateGlobalNextId(), "LMN-4567", sharedSystemLog}; // Another example ticket for updateQuantity demonstration
    // EXPLICIT CHECK PROOF
    // The line below fails compilation because 'explicit' blocks implicit type coercions:
    // Ticket badTicketq = {42}; 
    // Ticket badTicket = {42,"ABC-1234"};  // Works because all required arguments are provided explicitly
    // why this fails: Because the constructor is marked 'explicit', it cannot be used for implicit conversions or copy-list-initialization.
    // the why this work  Ticket badTicket = {42,"ABC-1234", sharedSystemLog} 
    // This demonstrates the importance of the 'explicit' keyword in preventing unintended implicit conversions.

    // Plain Struct Instantiation (defaults to public, direct initialization)
    LineItem receiptItem{"Parking Fee", 15.50};
    std::cout << "Item: " << receiptItem.itemName << " Costs: $" << receiptItem.price << "\n";
    //Now i know 
    // Struct members are public by default, so I can access them directly without getters or setters.
    // This is in contrast to classes where members are private by default and require explicit getters/setters for access.
    // 1) I know why we need explicit
    //  I understand how to use explicit constructors to prevent unintended implicit conversions.
    // 2) I know Member intialsation list usage in constructors.
    // i know const property and ref string usage in constructors. they need to be initialized using the member initialization list.
    

    return 0;
}

// ============================================================================
// WHAT I LEARNED (L0 Part 1: OOP recap)
// ============================================================================
// - struct = public by default (DTOs/interfaces); class = private by default (enforces invariants).
// - Access: public (all) | protected (class + derived) | private (class only).
// - Member initializer list runs BEFORE ctor body; REQUIRED for const members,
//   reference members, and base classes without a default ctor. Avoids default-construct + assign.
// - std::move casts to rvalue so resources are transferred, not copied (use for sink params).
// - explicit blocks silent implicit conversions / copy-list-init (Ticket t = {42} fails).
// - Delegating constructor: one ctor calls another to avoid duplicate init logic.
// - const member function = promises not to modify state; mark all getters const.
// - return *this -> method chaining (fluent API).
// - static member: one copy shared by all; static function has no `this`; define static data outside class.
// - Inheritance modes: public (is-a, 99% of LLD), protected (rare), private (implemented-in-terms-of;
//   prefer composition).
