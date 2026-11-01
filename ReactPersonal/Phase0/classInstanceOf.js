/**
 * ============================================================================
 * JAVASCRIPT UNDER THE HOOD: THE "instanceof" OPERATOR
 * ============================================================================
 * CORE MECHANIC:
 * JavaScript does NOT look at what function or class created an object.
 * Instead, "obj instanceof Class" climbs the physical prototype chain of 'obj'
 * and checks if it matches "Class.prototype" anywhere along the way.
 */

class Animal {}
class Rabbit extends Animal {}

let bunny = new Rabbit();

// ----------------------------------------------------------------------------
// 1. BASIC INHERITANCE CHECKS
// ----------------------------------------------------------------------------
console.log("--- 1. Standard Checks ---");
console.log(bunny instanceof Rabbit); // true -> bunny.__proto__ === Rabbit.prototype
console.log(bunny instanceof Animal); // true -> bunny.__proto__.__proto__ === Animal.prototype
console.log(bunny instanceof Object); // true -> Everything inherits from the base Object class

// ----------------------------------------------------------------------------
// 2. THE CONSTRUCTOR TRAP (Crucial Edge Case)
// ----------------------------------------------------------------------------
console.log("\n--- 2. The Prototype Mutation Trap ---");

function Wizard() {}
let gandalf = new Wizard();

console.log(gandalf instanceof Wizard); // true (Initial state matches Wizard.prototype)

// DANGER: Changing the prototype property of the function entirely!
Wizard.prototype = {};

// Even though gandalf was clearly created by the Wizard function, the link is broken!
console.log(gandalf instanceof Wizard); // false!
/**
 * WHY?
 * Because "Wizard.prototype" is now a completely new, blank object ( {} ).
 * The engine checks: Does gandalf's internal proto match the NEW blank object?
 * No, it still points to the OLD Wizard prototype layout.
 */

// ----------------------------------------------------------------------------
// 3. THE REVERSE QUESTION TRICK (Two different classes sharing a prototype)
// ----------------------------------------------------------------------------
console.log("\n--- 3. Shared Prototype Trick ---");

function Car() {}
function Spaceship() {}

// Forcing both independent factory functions to point to the exact same prototype object
Car.prototype = Spaceship.prototype = { engine: "V8" };

let tesla = new Car();

console.log(tesla instanceof Spaceship); // true!
/**
 * WHY?
 * Again, instanceof ignores the constructor name.
 * It climbs up: tesla.__proto__
 * It checks against: Spaceship.prototype
 * Since both lines point to the same physical object block, it returns true!
 */

// ----------------------------------------------------------------------------
// 4. CUSTOMIZING INSTANCEOF VIA SYMBOL.HASINSTANCE
// ----------------------------------------------------------------------------
console.log("\n--- 4. Advanced Custom Logic ---");

class Bird {
  // Overriding standard behavior. Any object with a 'canFly' property will pass as a Bird.
  static [Symbol.hasInstance](instance) {
    if (instance && instance.canFly) return true;
    return false;
  }
}

// This is a plain, literal object. It was NEVER initialized via "new Bird()".
let airplane = { canFly: true, engine: "Jet" };

console.log(airplane instanceof Bird); // true!
/**
 * WHY?
 * If Symbol.hasInstance exists on a class, JavaScript skips the entire
 * prototype chain check completely and hands full control over to this method.
 */
