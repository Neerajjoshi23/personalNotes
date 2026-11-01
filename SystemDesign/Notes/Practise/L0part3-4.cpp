#include <iostream>
#include <string>
#include <memory>
#include <vector>

// ==========================================
// 1. BASE CLASS DESIGN & SLICING PREVENTION
// ==========================================
class Vehicle {
private:
    std::string licensePlate;

public:
    explicit Vehicle(std::string plate) : licensePlate(std::move(plate)) {
        // [TRAP 1] VIRTUAL CALL IN CONSTRUCTOR
        // The vptr points to Vehicle's vtable at this moment because the Derived part isn't built yet!
        logInitialization(); 
    }

    // --- RULE (Core Guidelines C.67): PREVENT OBJECT SLICING ---
    // Deleting copy operations ensures that `Vehicle v = someCar;` or `vector<Vehicle>` won't compile.
    Vehicle(const Vehicle&) = delete;
    Vehicle& operator=(const Vehicle&) = delete;

    // --- RULE (Core Guidelines C.35): VIRTUAL DESTRUCTOR ---
    // Essential for clean polymophic deletion. Destroys the vtable layout gracefully.
    virtual ~Vehicle() = default;

    // --- PROTOTYPE PATTERN (Virtual Constructor Idiom) ---
    // Since copy constructors are deleted to prevent slicing, this is how we duplicate polymorphic objects.
    virtual std::unique_ptr<Vehicle> clone() const = 0;

    // --- EARLY VS LATE BINDING DEMO ---
    void displayTypeEarly() const { 
        std::cout << "[Early Binding] Resolves via Pointer Type (Vehicle)\n"; 
    }
    
    virtual void displayTypeLate() const { 
        std::cout << "[Late Binding] Resolves via Vtable lookup (Vehicle)\n"; 
    }

    // --- [TRAP 2] DEFAULT ARGUMENTS BOUND STATICALLY ---
    // The default value is chosen at compile-time by the pointer type, NOT the runtime object!
    virtual void printFee(int multiplier = 1) const {
        std::cout << "Base fee multiplier: " << multiplier << "\n";
    }

    virtual void logInitialization() const {
        std::cout << "Vehicle base constructor logging...\n";
    }

    std::string getPlate() const { return licensePlate; }
};


// ==========================================
// 2. DERIVED CLASS WITH MEMORY AND 'final'
// ==========================================
// Using 'final' here prevents any further inheritance from Car (Leaf class).
// It acts as clear LLD documentation and allows the compiler to optimize out virtual lookups (devirtualization).
class Car final : public Vehicle {
private:
    // This dynamically allocated resource will leak if the destructor isn't virtual!
    std::vector<int>* telemetryData; 

protected:
    // Protected copy constructor exclusively used by the clone() factory method
    Car(const Car& other) : Vehicle(other.getPlate()) {
        telemetryData = new std::vector<int>(*other.telemetryData);
    }

public:
    explicit Car(std::string plate) : Vehicle(std::move(plate)) {
        telemetryData = new std::vector<int>(100, 1); // Simulating heap usage
    }

    // Clean cleanup of derived elements
    ~Car() override {
        delete telemetryData;
        std::cout << "Car specific heap data freed safely.\n";
    }

    // Implementation of the Prototype clone idiom
    std::unique_ptr<Vehicle> clone() const override {
        // Uses the protected copy constructor safely behind a unique_ptr wrapper
        return std::unique_ptr<Car>(new Car(*this)); 
    }

    // --- OVERRIDE PROTECTION ---
    // `override` makes the compiler explicitly verify that this signature matches the base virtual method.
    // If you miss a 'const' keyword, the compiler throws an error instead of silently making a new method.
    void displayTypeLate() const override { 
        std::cout << "[Late Binding] Resolves via Vtable lookup (Car) - Plate: " << getPlate() << "\n"; 
    }

    // --- DEFAULT ARGUMENTS WRONG USE ---
    void printFee(int multiplier = 5) const override {
        std::cout << "Car specific body executed. Multiplier applied: " << multiplier << "\n";
    }

    void logInitialization() const override {
        std::cout << "Car constructor logging...\n";
    }
    void carSpecificFunction() const {
        std::cout << "This is a Car-specific function.\n";
    }
};


// ==========================================
// 3. THE POLYMORPHIC LLD CONTAINER
// ==========================================
class ParkingLot {
private:
    // --- RULE: POLYMORPHIC CONTAINERS ---
    // Never use `std::vector<Vehicle>`. That causes immediate Object Slicing. 
    // Always use smart pointers to point to the base abstraction.
    std::vector<std::unique_ptr<Vehicle>> parkedVehicles;

public:
    // --- RULE: CHOOSE REFERENCES OVER COPIES ---
    // Passing by value (`Vehicle v`) causes slicing. Always use references.
    void parkVehicle(const Vehicle& v) {
        // Duplicate the incoming object safely without slicing it using our Prototype clone()
        parkedVehicles.push_back(v.clone());
    }

    void processLot() {
        for (const auto& vehicle : parkedVehicles) {
            vehicle->displayTypeLate();
        }
    }
};


// ==========================================
// 4. EXECUTION AND VERIFICATION
// ==========================================
int main() {
    std::cout << "--- 1. Constructor Virtual Dispatch Trap ---\n";
    // Notice what prints! Even though we are creating a Car, it prints "Vehicle base constructor logging..."
    // Because the Car subobject isn't built yet, the vptr points to Vehicle's vtable inside Vehicle().
    Car myCar("XYZ-999");
    std::cout << "\n";

    std::cout << "--- 2. Early vs Late Binding & Default Argument Trap ---\n";
    // Polymorphic setup using a Base pointer pointing to a Derived instance
    // Object Memory Structure layout: [+0 bytes: hidden vptr] -> Points to Car's static vtable layout.
    Vehicle* polyPtr = new Car("ABC-123");

    polyPtr->displayTypeEarly(); // Outputs: "Vehicle" -> Decided at compile time by pointer type
    polyPtr->displayTypeLate();  // Outputs: "Car"     -> Decided at runtime via the object's vptr -> vtable slot lookup

    // POLYMORPHIC ACCESS TO DERIVED-SPECIFIC FUNCTIONALITY
    // DIRECT ACCESS polyPts->specificFunction() will not work because the base pointer type doesn't know about derived-specific functions. Use dynamic_cast to safely downcast.
    if (Car* carPtr = dynamic_cast<Car*>(polyPtr)) {
        carPtr->carSpecificFunction();
    }

    // Trap 2 Output Analysis:
    // It runs Car's function body (Late binding), but assigns Vehicle's default argument of '1' (Early binding).
    polyPtr->printFee(); 
    std::cout << "\n";

    std::cout << "--- 3. Safe Dynamic Deletion via Virtual Destructor ---\n";
    // Because ~Vehicle() is virtual, delete dispatches to ~Car() first to free telemetryData, then triggers ~Vehicle().
    delete polyPtr; 
    polyPtr = nullptr;
    std::cout << "\n";

    std::cout << "--- 4. Polymorphic Container & Prototype System ---\n";
    ParkingLot lot;
    lot.parkVehicle(myCar); // Safe pass-by-reference duplication via .clone()
    lot.processLot();
    
    return 0;
}
// ============================================================================
//                       C++ OOP & LLD REFERENCE CHEATSHEET
// ============================================================================

// 1. EARLY BINDING VS. LATE BINDING
// - Non-virtual functions use Early Binding: resolved at COMPILE time via pointer type.
// - Virtual functions use Late Binding: resolved at RUNTIME via the actual object.

// 2. MECHANICS OF VTABLES AND VPTRS
// - Classes with virtual functions get a static array of function pointers (vtable).
// - Each object of that class gets a hidden pointer (vptr) pointing to its class vtable.
// - Overhead: Adds one extra memory indirection step at runtime (+8 bytes on 64-bit systems).

// 3. VIRTUAL DESTRUCTORS (#1 INTERVIEW QUESTION)
// - Rule: Every base class or interface MUST have a public virtual destructor (`virtual ~Base() = default;`).
// - Why: Deleting a derived object via a base pointer skips the derived cleanup if non-virtual, causing memory leaks.

// 4. MODERN KEYWORDS: `override` AND `final`
// - `override`: Forces the compiler to verify signature matches exactly, catching subtle typos (e.g., missing `const`).
// - `final`: Prevents a class from being inherited or a virtual function from being overridden further (enables devirtualization).

// 5. VIRTUAL-FUNCTION TRAPS
// - Constructor Trap: Base class constructor runs FIRST. While it runs, the derived part doesn't exist yet,
//   so virtual calls inside constructors never dispatch dynamically to the child class.
// - Default Argument Trap: Default arguments are bound statically (compile time) by the pointer type,
//   while function bodies are bound dynamically (runtime), leading to strange mismatches. Never mix both.

// 6. OBJECT SLICING & PROTOTYPE PATTERN (`clone()`)
// - Slicing: Copying a derived object into a base object *by value* strips away the derived data and vtable layout.
// - Prevention: Hard-delete copy operations (`= delete`) to block slicing at compile time.
// - Solution: Use the Prototype Design Pattern (`clone()`) to safely duplicate polymorphic objects via pointer indirection.

// ============================================================================
// WHAT I LEARNED (L0 Parts 3 & 4: virtual functions + object slicing)
// ============================================================================
// - Virtual dispatch: each polymorphic object has a hidden vptr -> class vtable -> right override at runtime.
// - Base class of a polymorphic hierarchy MUST have a virtual destructor, else delete via Base* is UB.
// - Use `override` (compiler catches signature typos) and `final` (stop further overriding/inheriting).
// - Traps: (1) virtual call in ctor/dtor resolves to the current class, not Derived;
//   (2) default arguments are bound statically (use Base's default, even via Derived override).
// - Slicing: copying Derived into a Base by value chops off Derived's data/vptr.
//   Prevent with deleted copy ops, hold polymorphic objects via unique_ptr<Base>/Base&.
// - Need to copy polymorphically? Use virtual clone() (Prototype pattern).
//
// ============================================================================
