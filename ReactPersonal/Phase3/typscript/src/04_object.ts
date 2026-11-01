// ============================================================================
// CONCEPT: What is a Type Alias (`type`)?
// Just like JavaScript has built-in data types (string, number, boolean),
// TypeScript uses the 'type' keyword to create a custom blueprint or "nickname"
// for your data shapes.
//
// CRITICAL FACT: 'type' is pure development safety. When TypeScript compiles
// down to plain JavaScript, every single 'type' declaration is completely erased.
// They do not exist at runtime and add zero overhead to your final JavaScript app.
// ============================================================================

// ============================================================================
// 1. Base Blueprint (The Core Type Alias)
// ============================================================================
type User = {
  id: string;
  name: string;
  email?: string; // Optional property
  readonly createdAt: Date; // Immutable property (cannot be reassigned)
};

const user1: User = {
  id: "2",
  name: "neeraj joshi",
  email: "jsohineerj2003@gmail.com",
  createdAt: new Date(),
};
// user1.createdAt = new Date(); // -> Error! TypeScript blocks this because it is readonly.

type AdvancedTypeBlueprint = {
  // 1. Primitive Type Constraints (Must be a number)
  id: number;

  // 2. String Literal Constraints (Must be this exact string)
  role: "admin";

  // 3. Array Constraints (Must be an array of strings)
  tags?: string[];

  // 4. Nested Object Blueprint (An object inside an object)
  metadata: {
    ipAddress: string;
    isActive: boolean;
  };

  // 5. Function DECLARATION (Only the input/output rules, no working body!)
  saveToDatabase(userId: number): boolean;
};
const obj: AdvancedTypeBlueprint = {
  id: 1,
  role: "admin",
  metadata: {
    ipAddress: "8979871298732973",
    isActive: false,
  },
  saveToDatabase(id) {
    console.log(id);
    return true;
  },
};
console.log(obj);
obj.saveToDatabase(1);

// ============================================================================
// 2. Index Signatures (Open-Ended Objects)
// Definition: Use this when you DO NOT know the names of the keys ahead of time,
// but you DO know that any key added must be a string, and its value a number.
// ============================================================================
type CountIndexSignature = { [key: string]: number };

const postMetrics: CountIndexSignature = {
  likes: 1500,
  views: 54000,
  shares: 320,
};
// You can add absolutely any string key you want on the fly:
postMetrics.comments = 85;
postMetrics.bookmarks = 12;

// ============================================================================
// 3. The Record<Keys, Value> Type (Locked-Down Objects)
// Definition: Maps a fixed union of literal keys to a specific value type.
// Unlike an Index Signature, it completely blocks you from adding unlisted keys.
// ============================================================================
type MetricKeys = "likes" | "views" | "shares" | "random";
type CountRecordType = Record<MetricKeys, number>;

const specificMetrics: CountRecordType = {
  likes: 100,
  views: 500,
  shares: 25,
  random: 12,
  // profileClicks: 45 // -> Error! 'profileClicks' is not part of the allowed keys.
};

// ============================================================================
// 4. Utility Type: Partial<Type> (Makes everything optional)
// Use Case: Profile Edit Forms / HTTP PATCH requests.
// Definition: Takes an existing type and turns all of its properties into optional fields.
// ============================================================================
type UpdateUserDto = Partial<User>;

const profileFormUpdate: UpdateUserDto = {
  name: "Neeraj Kumar Joshi",
  // 'id', 'email', and 'createdAt' are missing, which is perfectly valid here.
};

// ============================================================================
// 5. Utility Type: Required<Type> (The exact opposite of Partial)
// Use Case: Strict backend data saving or final multi-step form validation.
// Definition: Strips away all question marks (?) and forces every single field to be filled.
// ============================================================================
type FullyCompletedUser = Required<User>;

const systemUser: FullyCompletedUser = {
  id: "101",
  name: "Neeraj Radu",
  email: "radu@test.com", // Leaving this out now triggers a compile-time error!
  createdAt: new Date(),
};

// ============================================================================
// 6. Utility Type: Pick<Type, Keys> (Cherry-pick specific fields)
// Use Case: Minimalist UI cards or mapping data for clean public responses.
// Definition: Creates a brand new, lightweight type using only the listed keys.
// ============================================================================
type UserContactCard = Pick<User, "name" | "email">;

const businessCard: UserContactCard = {
  name: "Neeraj Joshi",
  email: "jsohineerj2003@gmail.com",
  // 'id' and 'createdAt' have been completely stripped out of this type blueprint.
};

// ============================================================================
// 7. Utility Type: Omit<Type, Keys> (The exact opposite of Pick)
// Use Case: New account registration data before a database generates IDs.
// Definition: Copies the entire object type layout but deletes the specified keys.
// ============================================================================
type UserRegistrationForm = Omit<User, "id" | "createdAt">;

const newSignupData: UserRegistrationForm = {
  name: "Amit Joshi",
  email: "amit@test.com", // Only requires 'name' and 'email' properties.
};

// Output all data structures to verify execution
console.log({
  user1,
  postMetrics,
  specificMetrics,
  profileFormUpdate,
  systemUser,
  businessCard,
  newSignupData,
});
