// ============================================================================
// 1. Core Array Declarations (Two syntaxes for the exact same thing)
// ============================================================================
const arr: number[] = [1, 2, 3, 2]; // Standard shorthand syntax (T[])
const arr1: Array<number> = [12, 32, 32]; // Generic type syntax (Array<T>)
console.log(arr, arr1);

// 2. Implicit Array Inference (Union Arrays)
// TypeScript implicitly infers this array as type: (string | number)[]
const arr2 = [1, "shssj", 34];
// arr2.push({id: "jdsfsd"}); // ❌ Error! Objects are not allowed in a string | number array.

// ============================================================================
// 3. Readonly Arrays (Two styles of data freezing)
// Both styles completely strip away mutator methods like .push(), .pop(), and .splice()
// ============================================================================
const ys: readonly number[] = [12, 32, 32]; // Shorthand Readonly syntax
const yss: ReadonlyArray<number> = [122312, 32, 32]; // Generic Readonly syntax

// ys.push(34); // ❌ Error: Property 'push' does not exist on type 'readonly number[]'.
// ys[0] = 99;  // ❌ Error: Index signature in type 'readonly number[]' only permits reading.

// ============================================================================
// 4. Readonly Function Contracts
// ============================================================================
function sumOfArray(nums: readonly number[]): number {
  let s = 0;
  nums.forEach((element) => {
    s += element;
  });
  return s;
}

// ✅ VALID: You can safely pass a mutable array into a readonly function parameter.
// The function promises not to change it, keeping the original 'arr' fully safe!
console.log(sumOfArray(arr));
console.log(arr1, arr2, ys, yss);
