// public, private, protected are access modifiers in TypeScript.
// public: accessible from anywhere
// private: accessible only within the class
// protected: accessible within the class and its subclasses
// example:
// class Example {
//   public publicProperty: string;
//   private privateProperty: string;
//   protected protectedProperty: string;
//   constructor() {
//     this.publicProperty = "I am public";
//     this.privateProperty = "I am private";
//     this.protectedProperty = "I am protected";
//   }
// }
// In this example:
// - publicProperty can be accessed from anywhere
// - privateProperty can only be accessed within the Example class
// - protectedProperty can be accessed within the Example class and any subclass of Example
class BankAccount {
  public accountNumber: string;
  private balance: number;
  protected accountType: string;
  public ownerName: string;
  public getBalance(): number {
    return this.balance;
  }
  private setBalance(newBalance: number): void {
    if (newBalance < 0) {
      throw new Error("Balance cannot be negative");
    }
    this.balance = newBalance;
  }
  private setOwnerName(newOwnerName: string): void {
    this.ownerName = newOwnerName;
  }
  constructor(
    accountNumber: string,
    initialBalance: number,
    ownerName: string,
    accountType: string = "Savings",
  ) {
    this.accountNumber = accountNumber;
    this.balance = initialBalance;
    this.accountType = accountType;
    this.ownerName = ownerName;
  }
}
type BankAccountInfo = {
  accountNumber: string;
  balance: number;
  accountType: string;
  ownerName: string;
};
type BankAccountInstance = InstanceType<typeof BankAccount>;
const newAccount: BankAccountInstance = new BankAccount(
  "123456",
  1000,
  "John Doe",
  "Checking",
);
newAccount.getBalance();
console.log(newAccount.ownerName);
console.log(newAccount.accountNumber);
console.log(newAccount.getBalance());
// note: balance and accountType are not directly accessible due to private and protected access modifiers respectively.
class CheckingAccount extends BankAccount {
  constructor(
    accountNumber: string,
    initialBalance: number,
    ownerName: string,
    accountType: string = "Checking",
  ) {
    super(accountNumber, initialBalance, ownerName, accountType);
  }
  setAccountType(newAccountType: string): void {
    this.accountType = newAccountType;
  }
}
const checkingAccount: CheckingAccount = new CheckingAccount(
  "654321",
  500,
  "Jane Doe",
  "zero balance",
);
checkingAccount.setAccountType("Premium Checking");
console.log(checkingAccount);
