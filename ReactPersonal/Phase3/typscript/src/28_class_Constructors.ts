type UserInfo = {
  name: string;
  age: number;
  email?: string;
  readonly createdAt: Date;
  updatedAt?: Date;
};
class User {
  userInfo: UserInfo;
  constructor(name: string, age: number, email?: string) {
    this.userInfo = { name, age, createdAt: new Date(), updatedAt: new Date() };
    if (email) {
      this.userInfo.email = email;
    }
    console.log(
      `User created: ${this.userInfo.name}, ${this.userInfo.age}, ${this.userInfo.email ?? "No email"}`,
    );
  }
  greet() {
    console.log(`Hello, my name is ${this.userInfo.name}`);
  }
  setEmail(email: string) {
    this.userInfo.email = email;
    this.userInfo.updatedAt = new Date();
  }
}
// Usage example
type userInstance = InstanceType<typeof User>;
const user1: userInstance = new User("Alice", 30, "alice@example.com");
const user2: userInstance = new User("Bob", 25);
console.log(user1);
console.log(user2);
user1.greet();
user2.greet();
user1.setEmail("newalice@example.com");
console.log(user1);
// Bad practise
// class bad{
//  a: number;
//  constructor(a: number) {}}
// } this wrong na as we are not defining the property 'a' inside the constructor properly which is required for TypeScript to recognize it as a class property.
// answer?
// The correct way to define the class would be:
// class Good {
//   a: number;
//   constructor(a: number) {
//     this.a = a;
//   }
// }
