// Fix: Turn 'raw' into an actual JSON string
const raw = '{"id": "1", "namse": "A"}';

// Now JSON.parse() accepts it perfectly!
const riskyUser = JSON.parse(raw) as { id: number; name: string };
console.log(riskyUser.name);

// but above there is issue we are not proving that value will be in format we want
// ============================================================================
// MASTER BLUEPRINT: Handling Unreliable Server Data Safely
// ============================================================================

type User22 = {
  id: number;
  name: string;
};

// ----------------------------------------------------------------------------
// 1. The Secure Type Guard (Real runtime verification)
// ----------------------------------------------------------------------------
function isUserSecure(v: unknown): v is User22 {
  // Why 'as any'? Because 'v' is typed as 'unknown' for safety.
  // TypeScript strictly forbids reading properties (like '.id') directly from 'unknown'.
  // We use 'as any' as a temporary override so JavaScript can read and check the value.
  return (
    typeof v === "object" &&
    v !== null &&
    "id" in v &&
    typeof (v as any).id === "number" &&
    "name" in v &&
    typeof (v as any).name === "string"
  );
}

// ----------------------------------------------------------------------------
// 2. The Dangerous Fake Type Guard (The Type Guard Lie)
// ----------------------------------------------------------------------------
function isUserFake(v: unknown): v is User22 {
  // CRITICAL DANGER: If you bypass checks and just return true,
  // TypeScript will blindly trust you, but you create a critical runtime trap!
  console.log(v);

  return true;
}

// ============================================================================
// SIMULATION: What happens when the server sends corrupted/broken data?
// ============================================================================

// The server forgot to send the 'name' string!
const brokenServerJson = '{"id": 101}';
const incomingData: unknown = JSON.parse(brokenServerJson);

// --- SCENARIO A: Using the Secure Type Guard ---
if (isUserSecure(incomingData)) {
  console.log(incomingData.name.toUpperCase());
} else {
  // The secure check catches the missing property at runtime!
  console.log(
    "[SECURE] Data validation failed. Handled safely without crashing.",
  );
}

// --- SCENARIO B: Using the Fake Type Guard (THE RUNTIME CRASH) ---
if (isUserFake(incomingData)) {
  // 1. TypeScript is completely fooled because the function returned 'true'.
  // 2. The editor assumes 'incomingData.name' is a valid string and allows this code:
  // console.log(incomingData.name.toUpperCase());
  // 💥 CRASH AT RUNTIME!
  // Once types are erased in JavaScript, 'incomingData.name' resolves to 'undefined'.
  // The app throws: "TypeError: Cannot read properties of undefined (reading 'toUpperCase')"
}
