/**
 * ============================================================================
 * C++ VS JAVASCRIPT: THE INHERITANCE MENTAL SHIFT
 * ============================================================================
 * C++: Uses static type layouts (e.g., 'class Rabbit : public Animal {}').
 * JS:  Uses runtime physical object linking via the prototype chain.
 *
 * The 'extends' keyword establishes TWO structural prototype links automatically:
 * 1. Rabbit.prototype.__proto__ === Animal.prototype (Inherits standard methods)
 * 2. Rabbit.__proto__ === Animal (Inherits static methods down the chain)
 */

class Animal {
  // Base class field
  name = "animal";

  constructor(name) {
    // *TRICKY NOTE*
    // If called via 'new Rabbit()', this line still alerts 'animal', NOT 'rabbit'!
    // C++ developers expect dynamic polymorphism here, but JS fields are initialized
    // IMMEDIATELY AFTER super() runs. During this base constructor execution,
    // the derived class fields do not exist yet.
    console.log(`Base Constructor Execution -> Field value: ${this.name}`);
    this.speed = 0;
    if (name) this.name = name;
  }

  run(speed) {
    this.speed = speed;
    console.log(`${this.name} runs with speed ${this.speed}.`);
  }

  stop() {
    this.speed = 0;
    console.log(`${this.name} stands still.`);
  }
}

// ==========================================
// 1. THE EXTENDS KEYWORD & CONSTRUCTOR OVERRIDING
// ==========================================
class Rabbit extends Animal {
  // Overriding a class field
  name = "rabbit";

  // If you omit the constructor entirely, JS automatically injects:
  // constructor(...args) { super(...args); }

  constructor(name, earLength) {
    /**
     * CRITICAL JS RULE vs C++:
     * C++ base constructors can be initialized implicitly.
     * In JS, a derived constructor has a special internal label: [[ConstructorKind]]:"derived".
     * A derived constructor DOES NOT allocate an empty 'this' object natively.
     * It relies entirely on the parent constructor to create 'this'.
     * Therefore, you MUST call super(...) before accessing 'this' or returning!
     */
    super(name); // Calls Animal's constructor, instantiates 'this' object context.

    this.earLength = earLength; // Now safe to use 'this'
  }

  // ==========================================
  // 2. OVERRIDING A METHOD & THE SUPER KEYWORD
  // ==========================================
  // Completely overrides Animal.stop
  stop() {
    // Use 'super.method()' to execute or extend the base functionality
    super.stop(); // Invokes Animal.stop()
    this.hide(); // Tailors with child-specific logic
  }

  hide() {
    console.log(`${this.name} hides!`);
  }

  // ==========================================
  // 3. ARROW FUNCTIONS & SUPER CONTEXT
  // ==========================================
  waitAndStop() {
    // Arrow functions have no native 'super' or 'this' context.
    // They pass through transparently to the outer scope method.
    setTimeout(() => super.stop(), 1000);

    // WARNING: A regular 'function() { super.stop() }' here would crash the engine!
  }
}

// ============================================================================
// DEMONSTRATION & UNDER-THE-HOOD MECHANICS
// ============================================================================

// A. Field Initialization Order Proof
console.log("--- Instantiating Base ---");
let genericAnimal = new Animal(); // Logs: "Base Constructor Execution -> Field value: animal"

console.log("--- Instantiating Derived ---");
let whiteRabbit = new Rabbit("White Rabbit", 10); // Logs: "Base Constructor Execution -> Field value: animal"

// B. Method Resolution Chain
whiteRabbit.run(5); // Checks instance -> Checks Rabbit.prototype -> Finds in Animal.prototype
whiteRabbit.stop(); // Executes overridden method, calling super.stop() internally

// C. Dynamic Class Expressions after Extends
// JS allows extending ANY expression that evaluates to a class structure at runtime
function dynamicClassFactory(phrase) {
  return class {
    sayHi() {
      console.log(phrase);
    }
  };
}

class User extends dynamicClassFactory("Hello Runtime Inheritance!") {}
new User().sayHi(); // "Hello Runtime Inheritance!"

// ============================================================================
// 4. THE [[HomeObject]] ENGINE MECHANICS (Advanced)
// ============================================================================
/**
 * Behind the scenes, 'super' cannot look up methods dynamically via 'this.__proto__'.
 * If it did, long prototype chains would cause infinite loops because 'this'
 * always targets the base execution object instance.
 *
 * To fix this, JS methods possess an internal immutable property called [[HomeObject]].
 * A method permanently remembers the object/class layout it was defined in,
 * allowing 'super' to step straight up from that specific definition point.
 *
 * Side Effect: Methods using 'super' are locked to their initial object structure
 * and cannot be cleanly copied or moved to a different object context later!
 */
