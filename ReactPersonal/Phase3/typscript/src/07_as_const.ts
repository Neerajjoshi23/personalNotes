// this are readonly and locked cannot be changed
const roles = ["admin", "user", "manager"] as const;
console.log(typeof roles);

type role = (typeof roles)[number];
function setRoles(r: role): void {
  console.log(r);
}
setRoles("admin");
// ============================================================================
// CONCEPT STUDY: Tuples vs. Unions
// ============================================================================

// 1. Tuple = Fixed length, fixed positions, strict array layout
type Coordinates = [number, number]; // Always exactly 2 numbers
const currentMapPoint: Coordinates = [28.6, 77.2];

// 2. Union = "OR" logic, a list of allowed data choices
type ThemeMode = "light" | "dark" | "system";
let currentTheme: ThemeMode = "dark";
console.log(currentMapPoint, currentTheme);
// ============================================================================
// 1. The Union Type ("OR" Logic)
// This strictly controls the only allowed state values for our user.
// ============================================================================
type ActiveStatus = "online" | "away" | "offline";

// ============================================================================
// 2. The Tuple Type (Fixed Array Layout)
// This locks down the exact order and length of our array structure.
// Position 0 MUST be a number (ID).
// Position 1 MUST be a string (Username).
// Position 2 MUST be our ActiveStatus Union type.
// ============================================================================
type UserSession = [number, string, ActiveStatus];

// ============================================================================
// 3. Putting it into practice
// ============================================================================

// A. Valid Tuple Usage
const profile1: UserSession = [101, "neeraj_joshi", "online"];
console.log(profile1);

// B. Invalid Tuple Usage (TypeScript blocks these before compile time)

// ❌ Error: The length is wrong! Tuples enforce a fixed number of items.
// const profile2: UserSession = [102, "amit_joshi", "away", "extra_data"];

// ❌ Error: The position types are mixed up!
// const profile3: UserSession = ["103", "rahul_radu", "offline"]; // Position 0 must be a number!

// ❌ Error: The status value is not part of the allowed Union!
// const profile4: UserSession = [104, "vikram_j", "busy"]; // "busy" is not in our union list.

// ============================================================================
// 4. Bonus: Modifying the Tuple safely
// Even though the array structure is locked down, we can still update slots
// as long as we match the type blueprint rules!
// ============================================================================
profile1[2] = "away"; // Perfectly legal because "away" is a valid ActiveStatus union option.
// profile1[2] = "sleeping"; // ❌ Error! TypeScript blocks this instantly.

console.log(`User ${profile1[1]} is now ${profile1[2]}.`);
