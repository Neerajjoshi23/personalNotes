// ============================================================================
// RUNTIME CRASH PREVENTION: 'in' Operator vs Nullish / Optional Chaining
// ============================================================================

// ----------------------------------------------------------------------------
// SCENARIO 1: The 'in' Operator for Type Narrowing (Unions with distinct properties)
// ----------------------------------------------------------------------------

type EmailMethod = {
  sendEmail: (addr: string) => void;
  emailAddress: string;
};

type SMSMethod = {
  sendSMS: (num: string) => void;
  phoneNumber: string;
};

// A union where the two types share NO common properties
type NotificationMethod = EmailMethod | SMSMethod;

function dispatchNotification(notification: NotificationMethod) {
  // Direct access would fail: notification.sendEmail() -> Compiler Error!

  if ("sendEmail" in notification) {
    // TypeScript now guaranteed: 'notification' is exactly 'EmailMethod'
    notification.sendEmail(notification.emailAddress);
  } else {
    // TypeScript knows it MUST be 'SMSMethod' by process of elimination
    notification.sendSMS(notification.phoneNumber);
  }
}

// ----------------------------------------------------------------------------
// SCENARIO 2: Optional Chaining (?.) & Nullish Coalescing (??)
// Safely handling completely missing, null, or undefined data structures.
// ----------------------------------------------------------------------------

type UserSession = {
  profile?: {
    settings?: {
      theme?: string | null;
    };
  };
};

function applyUserSettings(session: UserSession | null | undefined) {
  // 1. Optional Chaining (?.) stops evaluating if session, profile, or settings is null/undefined
  // 2. Nullish Coalescing (??) fallbacks to "default-dark" ONLY if the result is null or undefined
  const preferredTheme = session?.profile?.settings?.theme ?? "default-dark";

  console.log(`Applying Theme UI: ${preferredTheme.toUpperCase()}`);
}

// ----------------------------------------------------------------------------
// EXECUTION & VERIFICATION PRINTING
// ----------------------------------------------------------------------------

console.log("--- Executing Guard Checks ---");

// Test 1: Distinct union resolution using 'in'
const userPhoneAlert: NotificationMethod = {
  phoneNumber: "+1-555-0199",
  sendSMS: (num) => console.log(`[SMS Sent] Outbound text triggered to ${num}`),
};
dispatchNotification(userPhoneAlert);

// Test 2: Crash-proof deep object property fallback
const brokenServerResponse: UserSession = {
  profile: {
    settings: { theme: null }, // Explicitly null from database
  },
};
applyUserSettings(brokenServerResponse); // Prints fallback safely instead of throwing a TypeError

const emptyServerResponse = null;
applyUserSettings(emptyServerResponse); // Safely handles total lack of data structure
