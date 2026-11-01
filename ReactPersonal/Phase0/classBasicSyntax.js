/**
 * 1. THE BASIC CLASS SYNTAX & CONSTRUCTOR
 *
 * In C++, you use 'Class MyClass { MyClass() { ... } };'
 * In JS, the keyword is explicitly 'constructor'.
 * Notice: NO COMMAS between class methods or fields (a common literal object pitfall).
 * JS classes automatically run in 'strict mode'.
 */
class User {
  // ==========================================
  // 2. CLASS FIELDS (INSTANCE VARIABLES)
  // ==========================================
  // C++: string name = "John";
  // JS: Declared directly in the class body with '='.
  // Crucial Difference: These are allocated directly on individual instance objects,
  // NOT on the shared prototype.
  name = "John";

  // Fields can evaluate dynamic, complex expressions at creation time
  id = Math.floor(Math.random() * 1000);

  constructor(initialAge) {
    // Properties can also be created/assigned dynamically inside the constructor
    this.age = initialAge;

    // Proving behind-the-scenes mechanics:
    // This constructor function becomes the actual function returned by 'class User'.
  }

  // ==========================================
  // 3. CLASS METHODS (PROTOTYPICAL FUNCTIONS)
  // ==========================================
  // C++: void sayHi() { ... }
  // JS: Standard methods are stored in User.prototype.
  // They are automatically non-enumerable (hidden from for..in loops).
  sayHi() {
    console.log(`Hello, my name is ${this.name} (ID: ${this.id})`);
  }

  // ==========================================
  // 4. GETTERS AND SETTERS
  // ==========================================
  // Similar to JS literal objects, these intercept property reading/writing.
  // Behind the scenes, these create get/set descriptors in User.prototype.
  get userAge() {
    return this.age;
  }

  set userAge(value) {
    if (value < 0) {
      console.log("Age cannot be negative.");
      return;
    }
    this.age = value;
  }

  // ==========================================
  // 5. COMPUTED METHOD NAMES [...]
  // ==========================================
  // Dynamically name methods using runtime expressions.
  ["print" + "Details"]() {
    console.log(`Computed execution: Age is ${this.age}`);
  }

  // ==========================================
  // 6. ARROW FUNCTIONS AS CLASS FIELDS (BOUND METHODS)
  // ==========================================
  // JS context ('this') is dynamic and depends on *how* a function is called.
  // Passing a regular method as a callback (e.g., event listener) leads to "losing this".
  // Making it an arrow function creates a per-object bound instance, preserving 'this'.
  clickCallback = () => {
    console.log(`Callback preserved! Context name: ${this.name}`);
  };
}

// ============================================================================
// DEMONSTRATION & PROOF OF UNDER-THE-HOOD MECHANICS
// ============================================================================

// A. Instantiation (Must use 'new', unlike raw functions)
let userInstance = new User(25);
userInstance.sayHi(); // "Hello, my name is John (ID: ...)"

// B. Proving "Class is just a function" under the hood
console.log(typeof User); // "function"
console.log(User === User.prototype.constructor); // true

// C. Proving Class Fields vs Methods allocation
console.log(User.prototype.sayHi); // Function code (Lives on prototype)
console.log(User.prototype.name); // undefined (Class fields stay on the instance object)
console.log(userInstance.name); // "John"

// D. Demonstration of Bound Method vs Lost Context
// Simulating passing a normal method as a callback:
let lostContextFunc = userInstance.sayHi;
try {
  lostContextFunc(); // Errors out or returns undefined because 'this' is lost!
} catch (e) {
  console.log("Context was lost!");
}

// Passing our Arrow Function Class Field:
let safeContextFunc = userInstance.clickCallback;
safeContextFunc(); // "Callback preserved! Context name: John" (Works perfectly anywhere)

// ============================================================================
// 7. CLASS EXPRESSIONS & DYNAMIC GENERATION
// ============================================================================

// Classes can be declared anonymously, assigned to variables, or named internally.
let Guest = class MyInternalClass {
  sayWelcome() {
    // 'MyInternalClass' is ONLY visible right here inside the class body
    console.log(`Internal scope check: ${MyInternalClass}`);
  }
};
new Guest().sayWelcome();
//console.log(MyInternalClass); // Error: Not visible outside

// Dynamic Class Factory Function
function makeClassWithCustomGreeting(phrase) {
  return class {
    greet() {
      console.log(phrase);
    }
  };
}
let DynamicUser = makeClassWithCustomGreeting("Salutations!");
new DynamicUser().greet(); // "Salutations!"
let Guest1 = class MyInternalClass {
  createNewMe() {
    // Safely creates a copy using the unchangeable internal name
    console.log(
      `Creating a new instance of MyInternalClass from within: ${MyInternalClass}`,
    );
    return new MyInternalClass();
  }
};

let Admin = Guest1; // Someone renames/reassigns the handle
Guest1 = null; // The original variable is wiped out

let user = new Admin();
let duplicate = user.createNewMe(); // Works perfectly! If it used 'new Guest()', it would crash.
