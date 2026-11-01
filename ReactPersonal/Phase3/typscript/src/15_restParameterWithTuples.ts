function sumOfAllNumber(...nums: number[]): number {
  // gather using rest
  let sum: number = 0;
  nums.forEach((element) => {
    sum += element;
  });
  return sum;
}
let arr = [];
for (let i = 0; i < Math.random() * 100; i++) {
  arr.push(i);
}
console.log(arr);

console.log(sumOfAllNumber(...arr)); // spread

// tuple rest

function makeRange(
  ...args: [start: number, end: number, step?: number]
): number[] {
  const [start, end, step] = args;
  let out: number[] = [];
  let increment = step ?? 1;
  for (let i = start; i <= end; i += increment) out.push(i);
  return out;
}
console.log(makeRange(1, 23));
console.log(makeRange(1, 23, 2));

let arr1: number[] = [1, 25, 1];
console.log(arr1);

// console.log(makeRange(...arr1));
// ❌ ISSUE: The compiler sees 'arr1' as a plain list 'number[]' which could dynamically
// change to have 0, 5, or 100 values. However, 'makeRange' strictly demands a
// tuple layout containing exactly 2 to 3 elements.

// ==========================================
// SOLUTIONS FOR TUPLE SPREADING CONSTRAINTS
// ==========================================

// SOLUTION 1: Using 'as const' Assertion
// NOTE: 'as const' must be placed directly on the literal array declaration.
// This freezes the array elements and its length, transforming its type from
// 'number[]' into a read-only tuple: 'readonly'
const arr2 = [1, 23] as const;
console.log(makeRange(...arr2)); // ✅ Valid! The compiler knows it has exactly 2 items.

// SOLUTION 2: Explicit Tuple Typing
// We explicitly tell TypeScript that 'arr3' is a strict tuple of 3 numbers.
// Its structural length and index positions are locked at compile time.
let arr3: [number, number, number] = [12, 23, 2];
console.log(makeRange(...arr3)); // ✅ Valid! Matches the max parameter requirements of the tuple rest.
