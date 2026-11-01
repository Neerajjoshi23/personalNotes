// 1. Primitive Type Annotations
// Explicitly defining basic types tells TypeScript exactly what kind of data is allowed.
let myName: string = "Neeraj";

// This variable is named after a boolean but holds a numeric flag (0 or 1).
let bollean: number = 0;

// BigInt handles integers larger than the standard JavaScript safe number limit.
// Note: It requires the 'n' suffix on literals (like 2n).
let bugInit: bigint = 2n - 1n;

let check: boolean = true;
console.log(myName, bollean, bugInit, check);

// 2. Unique Symbols
// 'unique symbol' is a subtype of 'symbol'. It guarantees that this specific symbol
// is completely distinct from any other symbol in the application, making it ideal
// for creating private object keys or unique tokens.
const sym: unique symbol = Symbol("Toejn");

// 3. Function Type Constraints
// This function strictly enforces that it must receive a string input ('year')
// and will always return a validated number.
function parseYear(year: string): number {
  return Number(year);
}
console.log(sym, parseYear("2032"));
