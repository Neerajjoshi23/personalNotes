#include <iostream>
#include <string>
#include <vector>
#include <memory>
#include <utility>
#include <functional>
enum class ChannelType { Email, SMS, Push };
// what this?
// This enum defines the types of communication channels available for sending notifications.
// no why no make static?
// The enum could be made static if it were inside a class, but as a standalone enum, it is already globally accessible.
// then why class?
// Using 'enum class' instead of a plain 'enum' provides better type safety and scoping, preventing implicit conversions to int and name clashes.
// mean it is not normal class, it is an enum class which is a scoped and strongly typed enumeration.
// The Request contains the data for a single message transaction
struct NotificationRequest {
    ChannelType type;
    std::string sender;      // Belongs here! (Netflix, Zomato, etc.)
    std::string message;     // Belongs here!
    std::string destination; // Phone number or device token
};

// ==========================================
// 1. CAPABILITY INTERFACE
// ==========================================
struct DeviceAddressable {
    virtual ~DeviceAddressable() = default;
    virtual std::string getDeviceTokenOrNumber() const = 0;
};

// ==========================================
// 2. ABSTRACT BASE CLASS (Identity / Medium Name)
// ==========================================
class Channel {
private:
    std::string channelName; // Core structural state restored!

public:
    explicit Channel(std::string name) : channelName(std::move(name)) {}
    virtual ~Channel() = default;

    std::string getChannelName() const { return channelName; }
    
    // We pass the sender down along with the message to be processed dynamically
    virtual void sendMessage(const std::string& sender, const std::string& message) = 0;
};

// ==========================================
// 3. CONCRETE CHANNELS
// ==========================================
class EmailService : public Channel {
public:
    explicit EmailService() : Channel("Email Server Infrastructure") {}

    void sendMessage(const std::string& sender, const std::string& message) override {
        std::cout << "[" << getChannelName() << "] Dispatching mail for <" << sender << ">: " << message << "\n";
    }
};

class SmsService : public Channel, public DeviceAddressable {
private:
    std::string phoneNumber;
public:
    explicit SmsService(std::string phone) 
        : Channel("Telephony SMS Gateway"), phoneNumber(std::move(phone)) {}

    void sendMessage(const std::string& sender, const std::string& message) override {
        std::cout << "[" << getChannelName() << "] Forwarding SMS text from <" << sender << ">: " << message << "\n";
    }
    std::string getDeviceTokenOrNumber() const override { return phoneNumber; }
};

class PushService : public Channel, public DeviceAddressable {
private:
    std::string deviceToken;
public:
    explicit PushService(std::string token) 
        : Channel("FCM/APNS Push Engine"), deviceToken(std::move(token)) {}

    void sendMessage(const std::string& sender, const std::string& message) override {
        std::cout << "[" << getChannelName() << "] Pushing UI banner alert from <" << sender << ">: " << message << "\n";
    }
    std::string getDeviceTokenOrNumber() const override { return deviceToken; }
};

// ==========================================
// 4. THE FACTORY
// ==========================================
class ChannelFactory {
public:
    static std::unique_ptr<Channel> createChannel(ChannelType type, const std::string& destination) {
        switch (type) {
            case ChannelType::Email:
                return std::make_unique<EmailService>();
            case ChannelType::SMS:
                return std::make_unique<SmsService>(destination);
            case ChannelType::Push:
                return std::make_unique<PushService>(destination);
            default:
                return nullptr;
        }
    }
};

// ==========================================
// 5. THE ORCHESTRATOR
// ==========================================
class NotificationService {
    using createFunc = std::function<std::unique_ptr<Channel>(const std::string&)>;
public:
    void sendNotification(const NotificationRequest& request) {
        std::unique_ptr<Channel> channel = ChannelFactory::createChannel(request.type, request.destination);
        
        if (!channel) {
            std::cout << "   [Routing Registry]: Failed to create channel for type " << static_cast<int>(request.type) << "\n";
            return;
        }

        DeviceAddressable* device = dynamic_cast<DeviceAddressable*>(channel.get());
        // what this line does is attempt to cast the generic Channel pointer to a DeviceAddressable pointer. 
        if (device) {
            std::cout << "   [Routing Registry]: Endpoint Target -> " << device->getDeviceTokenOrNumber() << "\n";
        }
        std::cout << "----------------------------------------------------------------------\n";
        channel->sendMessage(request.sender, request.message);  
    }
};

// ==========================================
// 6. CLIENT RUNTIME
// ==========================================
int main() {
    NotificationService manager;

    NotificationRequest req1{ChannelType::Email, "Netflix", "Your subscription renewed successfully.", ""};
    NotificationRequest req2{ChannelType::SMS, "HDFC Bank", "ALERT: Debited INR 5,000.", "+91-9999999999"};
    NotificationRequest req3{ChannelType::Push, "Zomato", "Your biryani order has been picked up!", "token_xyz123"};

    std::cout << "=== CLIENT REQUEST DISPATCH ENGINE ===\n\n";
    manager.sendNotification(req1);
    manager.sendNotification(req2);
    manager.sendNotification(req3);

    return 0;
}

// ============================================================================
// CLASS DIAGRAM (paste into any Mermaid viewer)
// ============================================================================
// classDiagram
//   direction TB
//   class ChannelType {
//     <<enumeration>>
//     Email
//     SMS
//     Push
//   }
//   class NotificationRequest {
//     <<struct>>
//     +ChannelType type
//     +string sender
//     +string message
//     +string destination
//   }
//   class DeviceAddressable {
//     <<interface>>
//     +getDeviceTokenOrNumber() string
//   }
//   class Channel {
//     <<abstract>>
//     -string channelName
//     +getChannelName() string
//     +sendMessage(sender, message)* void
//   }
//   class EmailService {
//     +sendMessage(sender, message) void
//   }
//   class SmsService {
//     -string phoneNumber
//     +sendMessage(sender, message) void
//     +getDeviceTokenOrNumber() string
//   }
//   class PushService {
//     -string deviceToken
//     +sendMessage(sender, message) void
//     +getDeviceTokenOrNumber() string
//   }
//   class ChannelFactory {
//     +createChannel(type, destination)$ unique_ptr~Channel~
//   }
//   class NotificationService {
//     +sendNotification(request) void
//   }
//   Channel <|-- EmailService
//   Channel <|-- SmsService
//   Channel <|-- PushService
//   DeviceAddressable <|.. SmsService
//   DeviceAddressable <|.. PushService
//   NotificationRequest --> ChannelType : uses
//   NotificationService ..> NotificationRequest : depends
//   NotificationService ..> ChannelFactory : depends
//   NotificationService ..> Channel : uses (local unique_ptr)
//   ChannelFactory ..> Channel : creates
//   ChannelFactory ..> ChannelType : switches on
//
// Relationships: solid-triangle = inheritance, dashed-triangle = realisation (interface),
// dashed arrow = dependency (no field, only param/local). No aggregation/composition here:
// NotificationService owns nothing; each Channel lives only for one sendNotification call.
//
// Design note: the dynamic_cast to DeviceAddressable in NotificationService is a smell
// (see Part 8). Better: put destination in sendMessage(request) so no cast is needed.

// ============================================================================
// WHAT I LEARNED (L0 Part 10, attempt 2: Notification system, OOP version)
// ============================================================================
// - Layout: capability interface -> abstract base (shared identity/state) -> concrete channels
//   -> Factory (creates by enum) -> Orchestrator/manager -> client main().
// - Request data (sender, message, destination) belongs in the request struct, not in the channel.
// - Factory returns unique_ptr<Interface>, so callers own the object and adding a channel
//   doesn't touch the orchestrator (Open/Closed).
// - Combines: interface, abstract class, override, virtual dtor, enum class, smart pointers.
