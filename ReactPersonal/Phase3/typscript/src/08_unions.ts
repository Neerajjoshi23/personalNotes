// what is union
// or on values it can be this ,this...

function printId(id: unknown | string) {
  if (typeof id == "string") {
    console.log(id.toUpperCase());
  }
}
printId("number");

// object union
// 1. Blueprints (Only DECLARING fields and methods, no function bodies)
type Fish = {
  name: "fish"; // Literal Type: Must be exactly "fish"
  swim(): void;
};

type Bird = {
  name: "bird"; // Literal Type: Must be exactly "bird"
  fly(): void;
};

// 2. Creating variables (Writing the actual function bodies here)
const nemo: Fish = {
  name: "fish",
  swim() {
    console.log("Nemo is swimming!");
  },
};

const zazu: Bird = {
  name: "bird",
  fly() {
    console.log("Zazu is flying high!");
  },
};

// 3. The Superpower: Discriminated Union
// This function takes either a Fish OR a Bird (a Union type).
// Because you defined specific 'name' literal strings, TypeScript can
// magically predict exactly which method is safe to call!
type Animal = Fish | Bird;

function moveAnimal(animal: Animal) {
  if (animal.name === "fish") {
    // TypeScript knows with 100% certainty that this is a Fish!
    // It gives you autocomplete for .swim() and blocks .fly()
    animal.swim();
  } else {
    // TypeScript knows this must be a Bird!
    // It gives you autocomplete for .fly() and blocks .swim()
    animal.fly();
  }
}

moveAnimal(nemo); // Prints: Nemo is swimming!
moveAnimal(zazu); // Prints: zazu is flying!
// ============================================================================
// MASTER BLUEPRINT: Smart Invoice Management System
// Demonstrates: Primitive Unions, Array Unions, Mixed Object Unions, and Discriminated Unions
// ============================================================================

// ----------------------------------------------------------------------------
// 1. DISCRIMINATED UNION (Tagged Union)
// Every type shares the exact same property key ('status') with a strict literal.
// ----------------------------------------------------------------------------
type InvoicePaid = {
  status: "paid"; // The Discriminant / Tag
  transactionId: string;
  amount: number;
};

type InvoiceOverdue = {
  status: "overdue"; // The Discriminant / Tag
  daysLate: number;
  fineAmount: number;
};

type InvoiceDraft = {
  status: "draft"; // The Discriminant / Tag
  lastEditedBy: string;
};

type InvoiceResponse = InvoicePaid | InvoiceOverdue | InvoiceDraft;

// ----------------------------------------------------------------------------
// 2. MIXED OBJECT UNION (No common tag)
// The object models are completely distinct. We must check for unique property keys.
// ----------------------------------------------------------------------------
type CompanyClient = {
  taxId: string;
  companyName: string;
};

type IndividualClient = {
  passportId: string;
  fullName: string;
};

type ClientProfile = CompanyClient | IndividualClient;

// ============================================================================
// 3. EXECUTION ENGINE (Functions Utilizing Unions)
// ============================================================================

// Demonstrates: A PRIMITIVE UNION (string | number) as an input argument
function formatInvoiceId(id: string | number): string {
  if (typeof id === "number") {
    return `INV-#${id.toString().padStart(6, "0")}`; // E.g., Converts 42 to INV-#000042
  }
  return id.toUpperCase(); // If it's already a string, clean it up
}

// Demonstrates: NARROWING A MIXED OBJECT UNION using the "in" operator
function getClientBillingHeader(client: ClientProfile): string {
  if ("taxId" in client) {
    // TypeScript automatically narrows the type to 'CompanyClient' inside this block
    return `Corporate Account: ${client.companyName} (Tax ID: ${client.taxId})`;
  } else {
    // TypeScript automatically narrows the type to 'IndividualClient' here
    return `Retail Customer: ${client.fullName} (ID/Passport: ${client.passportId})`;
  }
}

// Demonstrates: NARROWING A DISCRIMINATED UNION using a switch statement
function processInvoicePayload(payload: InvoiceResponse): void {
  switch (payload.status) {
    case "paid":
      console.log(
        `[SUCCESS] Settled Transaction: ${payload.transactionId} | Amount: $${payload.amount}`,
      );
      break;
    case "overdue":
      console.log(
        `[WARNING] Collection Action Needed! ${payload.daysLate} days late. Fine: $${payload.fineAmount}`,
      );
      break;
    case "draft":
      console.log(
        `[INFO] Internal Draft. Locked by Editor: ${payload.lastEditedBy}`,
      );
      break;
  }
}

// ============================================================================
// 4. TESTING AND LOGGING IN RUNTIME
// ============================================================================

// A. Testing Primitive & Mixed Object Unions
const corporateClient: CompanyClient = {
  taxId: "99-12345",
  companyName: "TechCorp Labs",
};
const rawId: string | number = 425;

console.log(formatInvoiceId(rawId));
console.log(getClientBillingHeader(corporateClient));

// B. Testing an ARRAY UNION (A mixed list containing strings AND numbers together)
const transactionLogs: (string | number)[] = [
  "INV-#000425",
  5000,
  "INV-#000426",
  1250,
];
console.log("Batched Log Output:", transactionLogs);

// C. Testing the Discriminated Union Payload Engine
const dynamicPayloads: InvoiceResponse[] = [
  { status: "paid", transactionId: "TXN_77A", amount: 250 },
  { status: "overdue", daysLate: 14, fineAmount: 25 },
  { status: "draft", lastEditedBy: "Neeraj Joshi" },
];

dynamicPayloads.forEach((payload) => processInvoicePayload(payload));

// Syntax A: An array that can hold a mix of strings AND numbers together
// let flexibleList: (string | number)[] = ["Apple", 5, "Banana", 12];

// Syntax B: Watch out! This means the variable must be an array of ALL strings OR an array of ALL numbers.
// let strictList: string[] | number[] = ["A", "B"];
// strictList =; // Valid to reassign entirely
// strictList = ["A", 1]; // ❌ Error! Cannot mix elements inside the same array instance.
