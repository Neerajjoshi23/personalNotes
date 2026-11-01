// ============================================================================
// GENERICS MASTER CLASS: HOISTING & INFERENCE EXAMPLES
// ============================================================================

// ----------------------------------------------------------------------------
// EXAMPLES FROM YOUR SUMMARY (Corrected & Extended)
// ----------------------------------------------------------------------------

function identity<T>(x: T): T {
  return x;
}

// Inference in action:
const numResult = identity(34); // T is inferred as: number
const stringResult = identity("Neeraj"); // T is inferred as: string (Corrected!)

function firstEle<T>(arr: T[]): T | undefined {
  return arr[0];
}

const firstNum = firstEle([12, 24, 36]); // T is inferred as: number
const firstWord = firstEle(["a", "b"]); // T is inferred as: string

// ----------------------------------------------------------------------------
// EXAMPLE 1: INFERRING MULTIPLE DISTINCT TYPE PARAMETERS
// Generics can take more than one placeholder (e.g., <T, U>)
// ----------------------------------------------------------------------------

function makePair<T, U>(first: T, second: U): [T, U] {
  return [first, second];
}

// Inference derives T as string, and U as number automatically
const mixedPair = makePair("UserID", 9921);

// ----------------------------------------------------------------------------
// EXAMPLE 2: INFERRING FROM COMPLEX OBJECT ARGUMENTS
// TypeScript looks deep inside object structures to grab the type of T
// ----------------------------------------------------------------------------

type ApiResponse<DataShape> = {
  status: "success" | "error";
  data: DataShape; // Dynamic payload block
};

// This function processes a response wrapper and extracts the inner 'data'
function extractPayload<T>(response: ApiResponse<T>): T {
  return response.data;
}

// We pass an object. TypeScript checks the 'data' key and infers T as { points: number }
const pointsPayload = extractPayload({
  status: "success",
  data: { points: 5000 },
});
console.log(pointsPayload);
// ----------------------------------------------------------------------------
// EXAMPLE 3: LOCKING DOWN GENERICS WITH CONSTRAINTS ('extends')
// Sometimes you want a placeholder, but it must have at least ONE specific property
// ----------------------------------------------------------------------------

interface HasLength {
  length: number;
}

// T can be anything, as long as it has a .length property (like strings, arrays)
function logLength<T extends HasLength>(item: T): void {
  console.log(`Length is: ${item.length}`);
}

logLength("Hello World"); // Inferred as string (strings have .length)
logLength([1, 2, 3, 4]); // Inferred as number[] (arrays have .length)
// logLength(125);        // COMPILER ERROR! number does not have a .length property

// ----------------------------------------------------------------------------
// PRINTING EXECUTION RESULTS
// ----------------------------------------------------------------------------

console.log("--- Running Generic Executions ---");
console.log("Identity (String):", stringResult);
console.log("First Element:", firstNum);
console.log("Inferred Pair Array:", mixedPair);
console.log("Extracted Nested Property Value:", pointsPayload.points);
