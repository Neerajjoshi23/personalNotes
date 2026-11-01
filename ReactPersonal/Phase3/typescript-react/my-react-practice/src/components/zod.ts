// import { z } from "zod";

// // --- THE CORE PRIMITIVES ---
// const StringSchema = z.string();   // Checks if data is a string
// const NumberSchema = z.number();   // Checks if data is a number
// const BooleanSchema = z.boolean(); // Checks if data is true/false

// // --- FLEXIBILITY ---
// const OptionalString = z.string().optional(); // Allows string OR undefined
// const NullableString = z.string().nullable(); // Allows string OR null

// // Unlike pure TypeScript types (which vanish
// // completely when your code compiles into standard JavaScript), Zod schemas stay alive in the browser at runtime.
// // exmaple of use of  above 5
// const exampleString: string = StringSchema.parse("Hello");
// if (exampleString) {
//   console.log("Example string is valid:", exampleString);
// }
// const exampleNumber: number = NumberSchema.parse(42);
// if (exampleNumber) {
//   console.log("Example number is valid:", exampleNumber);
// }
// const exampleBoolean: boolean = BooleanSchema.parse(true);
// if (exampleBoolean) {
//   console.log("Example boolean is valid:", exampleBoolean);
// }
// const exampleOptionalString: string | undefined = OptionalString.parse(undefined);
// if (exampleOptionalString !== undefined) {
//   console.log("Example optional string is valid:", exampleOptionalString);
// }

// const exampleNullableString: string | null = NullableString.parse(null);
// if (exampleNullableString !== null) {
//   console.log("Example nullable string is valid:", exampleNullableString);
// }

// // --- COMPLEX STRUCTURES ---
// const UserProfileSchema = z.object({
//   username: z.string(),
//   age: z.number(),
//   hobbies: z.array(z.string()), // An array full of strings
// });

// // --- HOW TO RUN THE VALIDATION AT RUNTIME ---
// const incomingUnknownData: unknown = { username: "Alice", age: 25, hobbies: ["music"] };

// const validationResult = UserProfileSchema.safeParse(incomingUnknownData);

// if (validationResult.success) {
//   // validationResult.data is now safely isolated and completely typed!
//   console.log("Success:", validationResult.data.username);
// } else {
//   // validationResult.error contains deep structural logs showing exactly what field failed
//   console.error("Failed:", validationResult.error.format());
// }
