// Exclude<T, U> constructs a type by excluding from T all properties that are assignable to U.
type Example = Exclude<"a" | "b" | "c", "a">; // Result: "b" | "c"

// Extract<T, U> constructs a type by extracting from T all properties that are assignable to U.
type ExtractExample = Extract<"a" | "b" | "c", "a" | "b">; // Result: "a" | "b"

// NonNullable<T> constructs a type by excluding null and undefined from T.
type NonNullableExample = NonNullable<string | number | null | undefined>; // Result: string | number

type eventTypeExclude = Exclude<"click" | "hover" | "focus", "focus">; // Result: "click" | "hover"

function handleEvent(event: eventTypeExclude) {
  console.log(`Handling event: ${event}`);
}
handleEvent("click");
handleEvent("hover");
// handleEvent("focus"); // This would cause a TypeScript error because "focus" is excluded from eventType.

type eventTypeExtract = NonNullable<
  Extract<"click" | "hover" | "focus", "click" | "hover"> | null | undefined
>; // Result: "click" | "hover"

function handleExtractEvent(event: eventTypeExtract) {
  console.log(`Handling extract event: ${event}`);
}
handleExtractEvent("click");
handleExtractEvent("hover");
// handleExtractEvent("focus"); // This would cause a TypeScript error because "focus" is not part of eventTypeExtract.

function getUserInfo(userId: string): string | null {
  if (Number(userId) > 0) {
    console.log(`Fetching user info for userId: ${userId}`);
    return `User info for userId: ${userId}`;
  } else {
    console.log(`Invalid userId: ${userId}`);
    return null;
  }
}
const userInfo = getUserInfo("1");
console.log(userInfo);
const invalidUserInfo = getUserInfo("0");
console.log(invalidUserInfo);
type userReturnType = ReturnType<typeof getUserInfo>; // Result: string | null
type nonNullableUserReturnType = NonNullable<userReturnType>; // Result: string
const nonNullableUserInfo: nonNullableUserReturnType = getUserInfo("0")!;
console.log(nonNullableUserInfo);
// why null then why at compile time no error?
// what we know from ruserreturtype it can be null or string my question when i called for zero why null printed and also no warning during compile
// i got it litle what that "!" means?
// The "!" is the non-null assertion operator in TypeScript. It tells the compiler that you are certain the value is not null or undefined at that point, even if the type allows it. In this case, getUserInfo("0") returns null, but the "!" asserts that it is not null, which is why there is no compile-time error. However, at runtime, it will still be null, which is why you see null printed.
// if remove then errror shoul come na?
// Yes, if you remove the "!" and try to assign the result of getUserInfo("0") to a variable of type nonNullableUserReturnType, TypeScript will give a compile-time error because getUserInfo("0") can return null, which is not assignable to nonNullableUserReturnType.
