// ==========================================
// 1. AUTOMATIC INFERENCE FOR INTERNAL FUNCTIONS
// ==========================================
// TypeScript looks at the expression 'n * 2'. Since 'n' is a number,
// the result must be a number. It automatically infers the return type as ': number'.
const doubleFunc = (n: number) => n * 2;
console.log(doubleFunc(1));

// ==========================================
// 2. EXPLICIT RETURN TYPES FOR EXPORTED / PUBLIC APIs
// ==========================================
// Best Practice: For exported or public functions, explicitly declaring ': string'
// acts as a safety contract. It prevents accidental internal changes from breaking
// external modules that import this function.
export function upperCaseOfString(s: string): string {
  return s.toUpperCase();
}

// ==========================================
// 3. IMPLICIT WRAPPING IN ASYNCHRONOUS FUNCTIONS
// ==========================================
// TypeScript knows by itself that an 'async' function ALWAYS wraps its returned value
// inside a Promise. Even though you wrote 'return 23', the compiler automatically
// infers the return type of 'loadUser' as ': Promise<number>'.
async function loadUser() {
  return 23;
}

// Because the type is inferred as Promise<number>, the parameter 'n' inside
// the '.then()' block is safely tracked and inferred strictly as a 'number'.
loadUser().then((n) => console.log(n));
