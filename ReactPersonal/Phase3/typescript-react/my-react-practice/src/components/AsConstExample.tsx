// some understanding of "as const" in TypeScript
// ============================================================================
// 1. OBJECTS: Extracting Keys and Values
// ============================================================================

// --- Case A: From a TypeScript TYPE ---
// type UserType = { id: number; username: string; role: "admin" | "user" };

// type KeysOfTSObject   = keyof UserType;                  // 🔑 "id" | "username" | "role"
// type ValuesOfTSObject = UserType[keyof UserType];        // 💎 number | string | "admin" | "user"

// // --- Case B: From a JavaScript VARIABLE ---
// const UserVar = { id: 1, nickname: "Ace", active: true } as const; // locked with 'as const'

// type KeysOfJSObject   = keyof typeof UserVar;            // 🔑 "id" | "nickname" | "active"
// type ValuesOfJSObject = (typeof UserVar)[keyof typeof UserVar]; // 💎 1 | "Ace" | true

// ============================================================================
// 2. ARRAYS / TUPLES: Extracting Element Values
// ============================================================================

// --- Case A: From a TypeScript TYPE ---
// type HttpStatusCodes = [200, 404, 500];

// type CodesFromTSTuple = HttpStatusCodes[number];         // 💎 200 | 404 | 500

// // --- Case B: From a JavaScript VARIABLE ---
// const AllowedRoles = ["admin", "moderator", "guest"] as const;

// type RolesFromJSArray = (typeof AllowedRoles)[number];   // 💎 "admin" | "moderator" | "guest"

// ============================================================================
// 🚀 REAL-WORLD TEST: Putting it all together
// ============================================================================
// const currentUser = {
//   name: "Alex",
//   role: "moderator" satisfies RolesFromJSArray, // Verified against JS array values
//   status: 200 satisfies CodesFromTSTuple,       // Verified against TS type values
// };
// Spot on! That is exactly what satisfies is built for.It acts as a structural filter. It ensures your data conforms to
//  a general boundary (the constraint) but preserves the exact literal values so your narrow functions don't complain

const variants = ["primary", "secondary", "danger"] as const;
interface BadgeProps {
  variant: (typeof variants)[number];
  size: "small" | "medium" | "large";
}
const Badge = ({ variant, size }: BadgeProps) => {
  const styles: Record<(typeof variants)[number], object> = {
    primary: { color: "white", backgroundColor: "blue", fontSize: size },
    secondary: { color: "white", backgroundColor: "gray", fontSize: size },
    danger: { color: "white", backgroundColor: "red", fontSize: size },
  };
  return <span style={styles[variant]}>Badge</span>;
};

export default Badge;
