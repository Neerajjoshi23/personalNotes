type Directions = "left" | "right" | "up";

function move(d: Directions): void {
  console.log(d);
}

// 1. Using 'const' (Literal Type Preservation)
// Because 'const' variables can never be reassigned, TypeScript implicitly infers
// the type as the exact literal string "left". This matches our Union type perfectly.
const d1 = "left";
move(d1); // Valid!

// 2. Using 'let' or 'var' without an explicit type (Type Widening Issue)
// TypeScript infers 'let' and 'var' variables as a general 'string' because their
// values could change later. This causes a type mismatch error when passed to the function.
// let d2 = "left";  // Inferred as: string
// move(d2);         // Error: Argument of type 'string' is not assignable to type 'Directions'.

// 3. Solution A: Explicit Type Annotation (Your Solution)
// By manually declaring the type as 'Directions', you explicitly restrict what
// values this 'let' variable can hold in the future.
let d4: Directions = "left";
move(d4); // Valid!

// 4. Alternative Solution B: The 'as const' Type Assertion
// If you want a 'let' variable to be locked down to a literal type without rewriting
// the type name, you can cast it using 'as const'.
let d5 = "left" as const; // Inferred strictly as: "left"
move(d5); // Valid!

// ============================================================================
// Why use 'as const' instead of just 'const'?
// 'const' only protects the variable assignment.
// 'as const' protects the deeply nested data INSIDE objects and arrays.
// ============================================================================

// Example A: Regular const array (Type Widening still happens)
const directionsArray = ["left", "right"]; // Inferred as type: string[]
directionsArray[0] = "up"; // ✅ TypeScript allows this! The values can change.

// Example B: 'as const' array (Deep Literal Freeze)
// const strictDirections = ["left", "right"] as const; // Inferred as: readonly ["left", "right"]
// strictDirections[0] = "up"; // ❌ Error: Property is read-only.
