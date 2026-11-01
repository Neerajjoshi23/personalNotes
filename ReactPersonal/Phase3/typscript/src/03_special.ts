// 1. Strict Null Checks Configuration
// In tsconfig, when 'strictNullChecks' is enabled, you cannot assign 'undefined' to a plain string.
// Using a union type (string | undefined) explicitly allows the variable to hold both types.
let title: string | undefined = "Function";
console.log(title);
title = undefined;

// 2. The 'void' Type
// Use 'void' when a function runs successfully but does not return a usable value.
function log(msg: string): void {
  console.log(msg);
}
log("Hello");

// 3. The 'never' Type
// Use 'never' when a function is physically incapable of reaching its ending point.
// Because this function throws an error, JavaScript execution will crash and halt right here.
// TypeScript recognizes that the next lines of code are impossible to reach, making 'never' the correct type.
function fail(mesg: string): never {
  throw new Error(mesg);
}
fail("failed");

// 4. Code Safety
// Avoid using the 'any' type because it disables TypeScript's safety features,
// which can hide bugs and lead to unpredictable crashes during runtime.
let count: any;
console.log(count);
