// it named shape for object
interface Customer {
  id: string;
  name: string;
  email?: string;
  readonly createdAt: Date;
  updatedAt: Date;
  role: "User" | "Admin";
}
const User123: Customer = {
  id: "1",
  name: "Neeraj joshi",
  email: "joshineerj2003303@gmail.com",
  createdAt: new Date(),
  updatedAt: new Date(),
  role: "User",
};
console.log(User123);
console.log(typeof Date.now());

// inherit
interface Admin extends Customer {
  role: "Admin";
  permissions: string[];
}
const admin123: Admin = {
  id: "12",
  name: "Neeraj rathur joshi",
  email: "joshineerj2003fdf303@gmail.com",
  createdAt: new Date(),
  updatedAt: new Date(),
  role: "Admin",
  permissions: ["Dashboard", "Analtics"],
};
console.log(admin123);
// 1. Define the base, shared fields using a standard interface
interface BaseUser {
  id: string;
  name: string;
  readonly createdAt: Date;
}

// 2. Specific interfaces extending the base layout
interface StandardCustomer extends BaseUser {
  role: "User"; // Literal discriminant tag
  email?: string;
}

interface AdminCustomer extends BaseUser {
  role: "admin"; // Literal discriminant tag
  permissions: string[];
}

interface ModeratorCustomer extends BaseUser {
  role: "Moderator"; // Literal discriminant tag
  regions: string[];
}

// 3. Combine the interfaces into a standard union type
type UserInterfaceUnion = StandardCustomer | AdminCustomer | ModeratorCustomer;

// ============================================================================
// EXHAUSTIVE SWITCH CHECK FUNCTION
// ============================================================================
function processUserWithInterfaces(user: UserInterfaceUnion): string {
  switch (user.role) {
    case "User":
      // TypeScript automatically narrows 'user' to StandardCustomer here
      return `Customer: ${user.name}, Email: ${user.email ?? "N/A"}`;

    case "admin":
      // TypeScript automatically narrows 'user' to AdminCustomer here
      return `Admin: ${user.name}, Permissions Count: ${user.permissions.length}`;

    case "Moderator":
      // TypeScript automatically narrows 'user' to ModeratorCustomer here
      return `Moderator: ${user.name}, Managing: ${user.regions.join(", ")}`;

    default:
      /**
       * The Exhaustive Check Safety Net:
       * If all variants are covered above, 'user' is stripped down to type 'never'.
       * If you add a new interface to the union and forget to write a case for it,
       * this assignment will flag an immediate compile error.
       */
      const _exhaustiveCheck: never = user;
      return _exhaustiveCheck;
  }
}

// ============================================================================
// EXECUTION TESTS
// ============================================================================
const adminUser: UserInterfaceUnion = {
  id: "77",
  name: "Neeraj",
  createdAt: new Date(),
  role: "admin",
  permissions: ["Billing", "Logs"],
};

console.log(processUserWithInterfaces(adminUser));
// Output: "Admin: Neeraj, Permissions Count: 2"
