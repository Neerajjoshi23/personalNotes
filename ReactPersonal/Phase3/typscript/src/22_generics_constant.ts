// ============================================================================
// COMPREHENSIVE ADVANCED GENERICS BLUEPRINT
// TOPICS COVERED:
// 1. Generic Structure Constraints (T extends { length: number })
// 2. Lookup Key Constraints (K extends keyof T)
// ============================================================================

// ----------------------------------------------------------------------------
// TOPIC 1: STRUCTURAL CONSTRAINTS (T extends Shape)
// "I don't know what T is, but I guarantee it has a .length property."
// ----------------------------------------------------------------------------

function displayLength<T extends { length: number }>(item: T): void {
  // TypeScript safely allows .length because the constraint guarantees its existence
  console.log(`[Structural Constraint] Length of item is: ${item.length}`);
}

// ----------------------------------------------------------------------------
// TOPIC 2: LOOKUP KEY CONSTRAINTS (K extends keyof T)
// "I don't know what object T or key K are, but K is guaranteed to be a key of T."
// ----------------------------------------------------------------------------

interface Product {
  id: string;
  title: string;
  price: number;
  inStock: boolean;
}

// A safe utility to extract property values from any object structure
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  // TypeScript safely resolves the dynamic return type based on the key passed
  return obj[key];
}

// A safe utility to update property values on any object structure
function setProperty<T, K extends keyof T>(obj: T, key: K, value: T[K]): void {
  obj[key] = value;
  console.log(`[Key Constraint] Updated key "${String(key)}" to:`, value);
}

// ----------------------------------------------------------------------------
// EXECUTION, VALIDATION, AND PRINTING
// ----------------------------------------------------------------------------

console.log("--- 1. Testing Structural Constraints ---");

displayLength("Hello Neeraj"); // Works! String has a .length property
displayLength([10, 20, 30, 40]); // Works! Array has a .length property
displayLength({ length: 99, v: 1 }); // Works! Custom object has a .length property
// displayLength(452);               // ❌ COMPILER ERROR: Number has no .length

console.log("\n--- 2. Testing Lookup Key Constraints ---");

const laptop: Product = {
  id: "prod_992",
  title: "M4 Macbook Pro",
  price: 1999,
  inStock: true,
};

// ✅ SAFE READS: TypeScript infers exact return types automatically
const itemTitle = getProperty(laptop, "title"); // Inferred as: string
const itemPrice = getProperty(laptop, "price"); // Inferred as: number

console.log(`Product Fetched: ${itemTitle} costs $${itemPrice}`);

// ✅ SAFE WRITES: Value must match the type of the key specified
setProperty(laptop, "price", 1849); // Works! 1849 is a valid number for 'price'
setProperty(laptop, "inStock", false); // Works! false is a valid boolean for 'inStock'

// ❌ COMPILER ERRORS (TypeScript blocks these compile-time bugs):
// getProperty(laptop, "discountCode"); // Error: Argument "discountCode" not assignable to keys of Product
// setProperty(laptop, "price", "free"); // Error: Argument "free" (string) not assignable to number
// T is the single item type (Product). T[] is the array. K is a key of Product.
function getArrayItemProperty<T, K extends keyof T>(
  arr: T[],
  index: number,
  key: K,
): T[K] {
  const item = arr[index];
  return item[key];
}

// Example Execution:
const productList: Product[] = [
  { id: "p1", title: "Mouse", price: 25, inStock: true },
  { id: "p2", title: "Keyboard", price: 75, inStock: false },
];

// TypeScript infers T as Product, K as "title", and returns a string
const title = getArrayItemProperty(productList, 1, "title"); // Returns "Keyboard"
// ============================================================================
// THE GOLDEN RULE OF TYPESCRIPT DATA FLOW
// ============================================================================

/*
  SUMMARY OF THE MENTAL MODEL:
  
  1. Use <T> (Generics):
     When you want the function to accept different shapes, but you need 
     the function output to REMEMBER and LOCK ONTO whichever specific shape 
     was thrown in. It acts like a dynamic laser beam preserving your types.
     
  2. Never use 'any':
     Unless you are writing quick, dirty code or migrating a legacy 
     JavaScript project. It turns off the type checker and opens the door 
     to runtime crashes.
     
  3. Use 'unknown':
     When you genuinely have no idea what data is arriving (like reading 
     raw data from an external API response or a file stream) and you want 
     to FORCE yourself to validate it before touching it.
*/

interface UserProfile {
  username: string;
  loginCount: number;
}

const mockUser: UserProfile = { username: "Neeraj", loginCount: 42 };

// ----------------------------------------------------------------------------
// 1. GENERIC <T> APPROACH (Type Preservation)
// ----------------------------------------------------------------------------
function processWithGeneric<T>(data: T): T {
  return data;
}

// TypeScript locks onto 'UserProfile'. Auto-complete works seamlessly!
const genericUser = processWithGeneric(mockUser);
console.log(`[Generic] Welcome back, ${genericUser.username}!`);

// ----------------------------------------------------------------------------
// 2. ANY APPROACH (The Unsafe Escape Hatch)
// ----------------------------------------------------------------------------
function processWithAny(data: any): any {
  return data;
}

const anyUser = processWithAny(mockUser);
// ❌ No type safety. The line below compiles perfectly but will crash at runtime!
// anyUser.someNonExistentMethod();

// ----------------------------------------------------------------------------
// 3. UNKNOWN APPROACH (The Strict Safe Box)
// ----------------------------------------------------------------------------
function processWithUnknown(data: unknown): unknown {
  return data;
}

const unknownUser = processWithUnknown(mockUser);

// ❌ COMPILER ERROR: Object is of type 'unknown'. TypeScript protects you from touching it.
// console.log(unknownUser.username);

// ✅ You are forced to validate/narrow the type before accessing properties:
if (
  unknownUser &&
  typeof unknownUser === "object" &&
  "username" in unknownUser
) {
  // Safe to cast or type-guard now that we verified it's an object containing the key
  const safeUser = unknownUser as UserProfile;
  console.log(`[Unknown] Validated user: ${safeUser.username}`);
}
