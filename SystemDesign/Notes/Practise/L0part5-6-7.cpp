#include <iostream>
#include <memory>
#include <vector>
#include <string>
#include <unordered_map>

// ============================================================================
// PART 5 & 6: POLYMORPHIC BASE (The One Exception to the Rule of 0)
// ============================================================================
// Shape/Strategy interface pattern: Polymorphic base classes must manage 
// cleanup safely without allowing object slicing.
class PricingStrategy {
public:
    // A polymorphic base needs a virtual destructor. 
    // Declaring it blocks implicit move generation, so we explicitly default/delete.
    virtual ~PricingStrategy() = default;
    PricingStrategy() = default;
    
    // Explicitly delete copy semantics to prevent dangerous "object slicing" 
    // (e.g., passing a derived class to a base class parameter by value).
    PricingStrategy(const PricingStrategy&) = delete;
    PricingStrategy& operator=(const PricingStrategy&) = delete;
    
    virtual double calculateFare(double distanceKm) const = 0;
};

// Concrete implementation to be held via std::unique_ptr (Composition)
class SurgePricing : public PricingStrategy {
    double multiplier_;
public:
    explicit SurgePricing(double multiplier) : multiplier_(multiplier) {}
    double calculateFare(double distanceKm) const override {
        return distanceKm * 1.5 * multiplier_;
    }
};

// ============================================================================
// PART 7: DEPENDENCY (Uses temporarily)
// ============================================================================
// This object is passed via reference as a method parameter; no long-term storage.
class PaymentGateway {
public:
    void processTransaction(const std::string& userId, double amount) {
        std::cout << "[Dependency] Charging user " << userId << " Rs. " << amount << "\n";
    }
};

// Forward declaration needed to break the cyclic dependency below
struct Driver;

// ============================================================================
// PART 6: CYCLIC RELATIONSHIP & WEAK POINTERS (Observer Pattern)
// ============================================================================
// Topic keeps strong references to Subscribers. 
// Subscribers must hold weak references back to avoid a memory leak memory cycle.
struct RideMatchTopic {
    // Topic OWNS the collection structure, but shares ownership of the drivers
    std::vector<std::shared_ptr<Driver>> subscribers;
    
    void broadcastSurgeAlert();
};

struct Driver {
    std::string name;
    // ✅ Fixes shared_ptr cycle. Non-owning observer that doesn't keep Topic alive.
    std::weak_ptr<RideMatchTopic> assignedTopic; 

    explicit Driver(std::string n) : name(std::move(n)) {}
    
    void checkAlert() {
        // Must temporarily upgrade to a shared_ptr via .lock() to access the object securely
        if (auto topicRef = assignedTopic.lock()) {
            std::cout << "[Weak_ptr] Driver " << name << " confirmed topic is still active.\n";
        } else {
            std::cout << "[Weak_ptr] Driver " << name << " found out the topic was destroyed!\n";
        }
    }
};

void RideMatchTopic::broadcastSurgeAlert() {
    std::cout << "[Shared_ptr] Broadcasting alerts to all active subscribers...\n";
    for (auto& sub : subscribers) {
        sub->checkAlert();
    }
}

// ============================================================================
// PART 6 & 7: ASSOCIATION & AGGREGATION (Non-owning referencing)
// ============================================================================
class Customer {
    std::string id_;
public:
    explicit Customer(std::string id) : id_(std::move(id)) {}
    const std::string& getId() const { return id_; }
};

// Aggregation: The Team/Fleet holds drivers, but if the Fleet dissolves, the Drivers live on.
class Fleet {
    // Aggregation uses non-owning raw pointers or shared references.
    std::vector<std::shared_ptr<Driver>> driversInFleet_; 
public:
    void addDriver(const std::shared_ptr<Driver>& d) { driversInFleet_.push_back(d); }
};

// Association / Entity: A Ride Receipt targets a driver and customer. 
// It references them, but does not dictate their lifetimes.
class RideReceipt {
    std::string rideId_;
    const Customer* customer_;   // ──> Association: Non-owning, nullable raw pointer
    std::string driverId_;       // ✅ Best Practice: Store ID instead of pointer to prevent dangling references

public:
    RideReceipt(std::string id, const Customer* c, std::string dId)
        : rideId_(std::move(id)), customer_(c), driverId_(std::move(dId)) {}
};

// ============================================================================
// PART 5: RULE OF 0 (Preferred Modern C++ Resource Management)
// ============================================================================
// This class owns NO raw resources directly. It delegates lifecycle tasks to components 
// that manage themselves (std::vector, std::unique_ptr, std::string). 
// No explicit Destructor, Copy, or Move functions are written!
class RideSharingApp {
    // ◆── Composition: App completely owns its operational strategies and active sessions.
    // When the App instance dies, these objects die with it.
    std::vector<std::unique_ptr<Customer>> activeCustomers_; 
    std::unique_ptr<PricingStrategy> pricingEngine_;          
    std::shared_ptr<RideMatchTopic> globalTopic_;            

public:
    // Rule of 0: Compiler cleanly synthesizes all 5 special member functions automatically.
    RideSharingApp() : 
        pricingEngine_(std::make_unique<SurgePricing>(2.0)), // Use make_unique instead of 'new'
        globalTopic_(std::make_shared<RideMatchTopic>()) {}

    // Demonstrates Dependency & Composition interactions
    void executeSystemCycle() {
        // 1. Setup Data via Composition
        activeCustomers_.push_back(std::make_unique<Customer>("Cust_415"));
        
        auto driver1 = std::make_shared<Driver>("Alice");
        auto driver2 = std::make_shared<Driver>("Bob");
        
        // Establish the cyclic relationship safely using weak_ptr assign
        globalTopic_->subscribers.push_back(driver1);
        globalTopic_->subscribers.push_back(driver2);
        driver1->assignedTopic = globalTopic_;
        driver2->assignedTopic = globalTopic_;

        // 2. Compute via Polymorphic composition
        double fare = pricingEngine_->calculateFare(10.0); // 10km trip

        // 3. Utilize an transient dependency (Passed on the stack)
        PaymentGateway gateway;
        gateway.processTransaction(activeCustomers_.back()->getId(), fare);

        // 4. Trigger cycle resolution confirmation
        globalTopic_->broadcastSurgeAlert();
    }
};

// ============================================================================
// EXECUTION CONTEXT
// ============================================================================
int main() {
    std::cout << "--- Initializing System Workspace (Rule of 0 Initialization) ---\n";
    RideSharingApp app;
    app.executeSystemCycle();
    std::cout << "--- Terminating System Workspace (Automatic Clean Destruction) ---\n";
    return 0;
}

// ============================================================================
// WHAT I LEARNED (L0 Parts 5, 6, 7: Rule of 0/3/5, smart pointers, relationships)
// ============================================================================
// - Rule of 0: hold resources in RAII members (string, vector, unique_ptr) and write no
//   dtor/copy/move. Rule of 3/5: if you define one of dtor/copy/move, define them all.
// - Polymorphic base is the exception: virtual dtor = default, then explicitly default/delete the rest
//   (delete copy to block slicing).
// - unique_ptr = sole ownership (default choice, composition); shared_ptr = shared ownership;
//   weak_ptr = non-owning observer that breaks shared_ptr cycles (Observer pattern).
// - Raw pointer/reference = non-owning only; never delete it.
// - Relationships (3-second test: delete parent, does child die?):
//   Dependency = param/local, temporary | Association = knows about (ptr/ref/id)
//   Aggregation = non-owning container (children survive) | Composition = owns (by value / unique_ptr)
// - Cycle of shared_ptrs leaks; make the back-reference a weak_ptr.
