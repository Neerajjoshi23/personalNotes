// 1. Explicitly type the structure of your optional configuration object
interface MessageConfig {
  shout?: boolean; // The '?' means this property can be boolean or undefined
}

// 2. Add type annotations to parameters and the function return type (: string)
function formatUserMessage(
  username: string,
  prefix: string = "Welcome", // Default parameter (type is inferred as string)
  config?: MessageConfig, // Optional parameter via '?' (MessageConfig | undefined)
): string {
  // Safe extraction using Optional Chaining (?.) and Nullish Coalescing (??)
  const shouldShout: boolean = config?.shout ?? false;

  const rawMessage: string = `${prefix}, ${username}!`;

  return shouldShout ? rawMessage.toUpperCase() : rawMessage;
}

// --- Execution & Output (Identical to JS, but 100% type-safe) ---

// 1. Uses the default parameter ("Welcome") and skips the optional parameter
console.log(formatUserMessage("Alice"));
// Output: "Welcome, Alice!"

// 2. Overrides the default parameter
console.log(formatUserMessage("Bob", "Hello"));
// Output: "Hello, Bob!"

// 3. Passes the optional config object with a true property
console.log(formatUserMessage("Charlie", "Hey", { shout: true }));
// Output: "HEY, CHARLIE!"

// 4. Proves ?? preserves an explicit false value without defaulting to false
console.log(formatUserMessage("Diana", "Hi", { shout: false }));
// Output: "Hi, Diana!"
