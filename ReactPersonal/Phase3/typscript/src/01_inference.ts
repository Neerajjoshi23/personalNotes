// GOAL: Understand Type Inference (when TS automatically guesses types)
// versus Explicit Annotation (when you must manually declare types).

// 1. Implicit Type Inference (Letting TypeScript do the work)
// Because TypeScript understands JavaScript deeply, it automatically infers that
// 'count' is a number and 'nameOfFather' is a string.
// Adding manual type tags here isn't wrong, it is just redundant and noisy.
let count = 9;
const nameOfFather = "Mohan joshi";

// 2. Explicit Annotation for Functions (Best Practice & Often Required)
// TypeScript cannot guess function parameter types ahead of time because they depend
// on future inputs. Manually annotating parameters (a, b) and return types ensures strict safety.
export function add(a: number, b: number): number {
  return a + b;
}

// 3. Explicit Annotation for Dynamic/Unclear Types
// You should manually annotate a variable if it starts out empty, or if its values
// can change dynamically (like a Union Type: string | number).
// Tip: Change 'let math;' to 'let math: string | number;' to make this strictly safe!
let math: string | number;
math = Math.random() > 0.3 ? "test" : 19;

console.log(count, nameOfFather, math);
