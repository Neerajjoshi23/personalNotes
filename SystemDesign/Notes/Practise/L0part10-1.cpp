#include <iostream>
#include <string>
#include <vector>
#include <memory>
#include <utility>
#include <functional>
#include <unordered_map>
enum class channelType { SMS, EMAIL, PUSH_NOTIFICATION };
struct NotificationReqest{
    /// why struct used?
    /// Struct is used here because NotificationReqest is a simple data holder without complex behavior.
    // can we use enum class?
    /// Yes, we are already using enum class for channelType to represent different types of channels.  
    channelType channel;
    std::string message;
    std::string recipient;
    std::string sender;
    std::string address; 
};
class Channel{
    private:
         std::string channelName;
    public:
        explicit Channel(std::string channelName) : channelName(std::move(channelName)) {}
        std::string getChannelName() const { return channelName; }
        virtual void sendMessage(const std::string& sender, const std::string& message,const std::string& recipient) = 0;
        virtual ~Channel() = default;
};
class DeviceAddressable{
    private:
        std::string address;
    public:
        explicit DeviceAddressable(std::string address) : address(std::move(address)) {}
        std::string getAddress() const { return address; }
        virtual ~DeviceAddressable() = default;
};
class EmailSender : public Channel{
   
    public:
        void hello(){
            std::cout << "Hello from EmailSender!" << std::endl;
        }
        explicit EmailSender(std::string channelName) : Channel(std::move(channelName)) {}
        void sendMessage(const std::string& sender, const std::string& message,const std::string& recipient) override {
            std::cout << "Sending email from " << sender << " to " << recipient << " with message: " << message << std::endl;
        }
};
class SMS : public Channel, public DeviceAddressable{
    public:
        explicit SMS(std::string channelName, std::string address) : Channel(std::move(channelName)), DeviceAddressable(std::move(address)) {}
        void sendMessage(const std::string& sender, const std::string& message,const std::string& recipient) override {
            std::cout << "Sending SMS from " << sender << " to " << getAddress() << " with message: " << message << std::endl;
        }
};
class PushNotification : public Channel, public DeviceAddressable{
    public:
        explicit PushNotification(std::string channelName, std::string address) : Channel   (std::move(channelName)), DeviceAddressable(std::move(address)) {}
        void sendMessage(const std::string& sender, const std::string& message,const std::string& recipient) override {
            std::cout << "Sending push notification from " << sender << " to " << getAddress() << " with message: " << message << std::endl;
        }
};
class NotificationService{
    using createFunc = std::function<std::unique_ptr<Channel>(const std::string&)>; 
    std::unordered_map<channelType, createFunc> channelRegistry;
    public: 
       NotificationService() {
          channelRegistry[channelType::SMS] = [](const std::string& address) { return std::make_unique<SMS>("SMS Channel", address); };
          channelRegistry[channelType::EMAIL] = [](const std::string& address) { return std::make_unique<EmailSender>("Email Channel"); };
          channelRegistry[channelType::PUSH_NOTIFICATION] = [](const std::string& address) { return std::make_unique<PushNotification>("Push Channel", address); };
       }
       std::unique_ptr<Channel> createChannelFactory(channelType type, const std::string& address){
          std::unique_ptr<Channel> channelPtr = nullptr;
    
            // 1. Search the map once and save the iterator
            auto it = channelRegistry.find(type); 
            
            // 2. Check if the key was found
            if (it != channelRegistry.end()) { 
                // 3. it->second points directly to the lambda callback function
                channelPtr = it->second(address); 
            }
            return channelPtr;
       }
       void sendNotification(const NotificationReqest& request) {
        std::unique_ptr<Channel> channelPtr=createChannelFactory(request.channel, request.address);
        if (channelPtr) {
            channelPtr->sendMessage(request.sender, request.message, request.recipient);
        }
       }
       ~NotificationService() = default;

};
int main(){
     NotificationService notificationService;
     NotificationReqest request{channelType::SMS, "Hello, this is a test message", "recipient@example.com", "sender@example.com", "1234567890"};
     notificationService.sendNotification(request);
     NotificationReqest anotherRequest{channelType::EMAIL, "Hello, this is another test message", "recipient@example.com", "sender@example.com", ""};
     notificationService.sendNotification(anotherRequest);
     std::unique_ptr<Channel> emailChannel = notificationService.createChannelFactory(channelType::EMAIL, "");
     if(EmailSender * t = dynamic_cast<EmailSender*>(emailChannel.get())) {
         t->hello();
     }
     NotificationReqest pushRequest{channelType::PUSH_NOTIFICATION, "Hello, this is a push notification", "recipient@example.com", "sender@example.com", "1234567890"};
     notificationService.sendNotification(pushRequest);
}

// ============================================================================
// WHAT I LEARNED (L0 Part 10, attempt 1: Notification system)
// ============================================================================
// - struct for plain data holders (request DTO); enum class for channel types.
// - Channels are looked up in an unordered_map of callbacks (std::function / lambdas).
// - Search the map once with find(), keep the iterator, check != end(), then use it->second
//   (avoids double lookup and accidental insertion from operator[]).
// - Use explicit ctors and std::move for sink string params.