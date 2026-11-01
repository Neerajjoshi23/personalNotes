// typeof fro primitives
function describeTypeOf(x: unknown): string | null {
  if (x === null) return null;
  else return typeof x;
}
console.log(
  describeTypeOf(12),
  describeTypeOf(true),
  describeTypeOf("neeraj"),
  describeTypeOf(10n),
  describeTypeOf(undefined),
  describeTypeOf({ x: 3, y: 5n }),
  describeTypeOf(Symbol("Toknizer")),
  describeTypeOf(() => {}),
  describeTypeOf(null),
);
// array error date
function info(z: unknown) {
  if (Array.isArray(z)) {
    return "array";
  } else if (z instanceof Date) return new Date();
  else if (z instanceof Error) return new Error();
  return "other";
}
console.log(info([1, 3, 3, 2]));
console.log(info(new Date()));
console.log(info(new Error("Something went wrong")));
