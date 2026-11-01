// ============================================================================
// 1. Core Tuple Declarations
// A strict array configuration enforcing fixed length, type order, and elements.
// ============================================================================
const userEntry: [number, string] = [12, "neraj joshi"];
console.log(userEntry);

// ============================================================================
// 2. Optional and Labeled Tuples
// - Using 'status:' and 'message:' provides descriptive labels for code autocomplete.
// - The '?' modifier means the second element can be completely omitted.
// ============================================================================
type ResponseStatus = [status: string, message?: string];

// Valid Case A: Providing only the mandatory 'status' element. Length is 1.
const resp1: ResponseStatus = ["ok"];
console.log(resp1);

// Valid Case B: Providing both elements. Length is 2.
const resp2: ResponseStatus = ["error", "Database connection lost"];
console.log(resp2);

// ❌ TypeScript Compiler Error (Caught before compile time):
// Position 0 is required and must be a string!
// const resp3: ResponseStatus =;
// ============================================================================
// CONCEPT: Readonly Tuples
// Adding 'readonly' guarantees that the array size, element values, and index
// positions can never be tampered with after creation.
// ============================================================================

type SecureResponse = readonly [status: string, message?: string];

// 1. Valid Usage
const standardSuccess: SecureResponse = ["200_OK"];
const detailedError: SecureResponse = [
  "500_INTERNAL",
  "Server connection timed out",
];

console.log(standardSuccess, detailedError);

// 2. ❌ TypeScript Compiler Errors (Caught before compile time)

// Attempting to modify a value inside the tuple:
// detailedError[0] = "400_BAD_REQUEST";
// 🔴 ERROR: Index signature only permits reading.

// Attempting to dynamically bypass the fixed length:
// detailedError.push("unauthorized");
// 🔴 ERROR: Property 'push' does not exist on type 'SecureResponse'.
// ============================================================================
// CONCEPT: Inline Tuple Type Annotations (Skipping Type Blueprints)
// ============================================================================

// 1. Inline Optional Tuple
const quickData: [number, string?] = [34]; // Valid to omit the second element inline!

// 2. Inline Readonly Tuple
const frozenMap: readonly [lat: number, lng: number] = [12.97, 77.59];
// frozenMap[0] = 14.12; // ❌ Error! This index position is strictly read-only.

// 3. Combining Everything Inline inside an Object Property
const appState: {
  user: string;
  statusLog: readonly [code: number, errorMsg?: string]; // Readonly + Optional inline!
} = {
  user: "Neeraj",
  statusLog: [404, "Page Not Found"],
};

// appState.statusLog[0] = 200; // ❌ Error: Index signature only permits reading.
console.log(appState);
console.log(frozenMap, quickData);
console.log(appState.statusLog[1]);
