#include <iostream>
#include <string>
#include <memory>
#include <vector>
// If a Base* pointer points to a Derived object:
// Function Type	Code Example	What is called?	Why?
// Regular Function	basePtr->normalFunc();	Base version	It uses the pointer's type (Static Binding).
// Virtual Function	basePtr->polyFunc();	Derived version	It uses the actual object's type (Runtime Polymorphism).
// // ==========================================
// 1. THE INTERFACE (The C++ Way)
// ==========================================
// Rules for a pure interface:  
// - ONLY pure virtual functions.
// - NO data members (no state).
// - A virtual destructor set to = default.
struct PaymentMethod {
    // ALWAYS provide a virtual destructor. If someone deletes a derived class
    // via a PaymentMethod*, without this, it causes undefined behavior!
    virtual ~PaymentMethod() = default;

    // "= 0" means "Pure Virtual". This class has no implementation.
    // Any concrete class inheriting this MUST implement these methods.
    virtual bool pay(double amount) = 0;
    virtual std::string name() const = 0;
};

// --- Implementations of the Interface ---
class UpiPayment : public PaymentMethod {
public:
    // 'override' explicitly tells the compiler we are fulfilling the base contract
    bool pay(double amount) override {
        std::cout << "Processing UPI payment of ₹ " << amount << "\n";
        return true;
    }
    std::string name() const override { return "UPI"; }
};

class CardPayment : public PaymentMethod {
public:
    bool pay(double amount) override {
        std::cout << "Processing Card payment of $" << amount << "\n";
        return true;
    }
    std::string name() const override { return "Credit Card"; }
};


// ==========================================
// 2. THE ABSTRACT CLASS (Shared State + Behavior)
// ==========================================
// Rules for an abstract class:
// - Contains at least one pure virtual function.
// - CAN have constructors, normal methods, and private variables (state).
// - Cannot be instantiated directly.
enum class SpotSize { Small, Large };

class Vehicle {
public:
    virtual ~Vehicle() = default;

    // Normal method: Shared by ALL subclasses. They don't need to rewrite this.
    const std::string& plate() const { return plate_; }

    // Pure Virtual Function: Varies per vehicle type. Must be overridden.
    virtual SpotSize requiredSize() const = 0;

protected:
    // Protected constructor: Main program cannot call this, but subclasses can.
    explicit Vehicle(std::string plate) : plate_(std::move(plate)) {}

private:
    std::string plate_; // Shared state across all kinds of vehicles
};

// --- Subclasses of the Abstract Base ---
class Car : public Vehicle {
public:
    // Passes the license plate up to the parent Vehicle constructor
    explicit Car(std::string plate) : Vehicle(std::move(plate)) {}

    // Fulfils the specific requirement for a Car
    SpotSize requiredSize() const override { return SpotSize::Small; }
};


// ==========================================
// 3. MULTIPLE INHERITANCE (Safe with Interfaces)
// ==========================================
// Inheriting multiple classes with data leads to the "Diamond Problem".
// Inheriting multiple behavior-only interfaces is completely safe!
struct Payable { virtual void acceptMoney() = 0; virtual ~Payable() = default; };
struct Dispensable { virtual void dispenseItem() = 0; virtual ~Dispensable() = default; };

class VendingMachine : public Payable, public Dispensable {
public:
    void acceptMoney() override { std::cout << "Money collected.\n"; }
    void dispenseItem() override { std::cout << "Soda dropped.\n"; }
};


// ==========================================
// 4. NON-VIRTUAL INTERFACE (NVI) PATTERN
// ==========================================
// Also known as the Template Method design pattern.
// The public method is NON-virtual and controls the absolute structure.
// Subclasses are forced to implement the private/protected virtual "hooks".
class Report {
public:
    // Standard execution structure that no subclass can alter
    void generate() {
        printHeader(); 
        printBody(); // The changing step
        printFooter();
    }
    virtual ~Report() = default;

private:
    // Pure virtual hook: Private because the outer program shouldn't call it directly
    virtual void printBody() = 0; 

    void printHeader() { std::cout << "--- [REPORT START] ---\n"; }
    void printFooter() { std::cout << "--- [REPORT END] ---\n\n"; }
};

class FinancialReport : public Report {
private:
    void printBody() override {
        std::cout << "Q4 Revenue: $5M | Expenses: $3M | Net: $2M\n";
    }
};


// ==========================================
// MAIN EXECUTION LOGIC
// ==========================================
int main() {
    // --- 1. Proving Instantiation Errors ---
    // PaymentMethod pm; // COMPILE ERROR: Cannot instantiate abstract class/interface!
    // Vehicle v("ABC-123"); // COMPILE ERROR: Protected constructor & abstract class!
    // PaymentMethod* pm = new PaymentMethod(); // Just to demonstrate polymorphism with a base pointer
    std::cout << "=== Interface Polymorphism ===\n";
    // We can seamlessly swap implementations at runtime using references or pointers
    std::vector<std::unique_ptr<PaymentMethod>> wallet;
    std::unique_ptr<PaymentMethod> upi = std::make_unique<UpiPayment>();
    std::unique_ptr<PaymentMethod> card = std::make_unique<CardPayment>();
    wallet.push_back(std::move(upi));
    wallet.push_back(std::move(card));

    for (const auto& method : wallet) {
        std::cout << "Method: " << method->name() << " -> ";
        method->pay(150.0);
    }
    VendingMachine vendingMachine;
    vendingMachine.dispenseItem();
    std::cout << "\n=== Abstract Base Classes ===\n";
    Car myCar("DL-3C-1234");
    std::cout << "Car plate: " << myCar.plate() << "\n";
    std::cout << "Is small spot? " << (myCar.requiredSize() == SpotSize::Small ? "Yes" : "No") << "\n\n";

    std::cout << "=== Non-Virtual Interface (NVI) ===\n";
    FinancialReport finReport;
    finReport.generate(); // Calls fixed structural algorithm with specialized body

    return 0;
}

// ============================================================================
// WHAT I LEARNED (L0 Part 2: Abstract classes vs interfaces)
// ============================================================================
// - C++ has no `interface` keyword: interface = struct with ONLY pure virtual funcs (= 0),
//   no data, and a virtual destructor (= default).
// - Abstract class = has >= 1 pure virtual; can hold shared state + concrete methods + ctor.
//   Cannot be instantiated.
// - Use interface for a capability/variation point (Strategy: PaymentMethod);
//   abstract class for an entity hierarchy sharing state (Vehicle, Report).
// - Multiple inheritance is safe when the bases are pure interfaces.
// - NVI pattern: public non-virtual method (fixed algorithm / template method) calls
//   private virtual hooks that subclasses override.
// - Virtual call -> Derived version (runtime type); non-virtual -> pointer's type (static binding).
