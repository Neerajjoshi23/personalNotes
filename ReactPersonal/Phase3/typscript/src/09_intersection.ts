//value must be eveything from A and B

type Inter1 = { id: string };
type Inter2 = { id: string; name: string; email?: string };

type entity = Inter1 & Inter2;
const entity1: entity = { id: "uniey939", name: "neeraj joshi" };
console.log(entity1);

// what happen when we have same property in both

// ============================================================================
// STUDY: Identical Property Conflicts
// ============================================================================

type ConflictingA = { code: string };
type ConflictingB = { code: number };

// 1. UNION (|) creates a flexible choice:
// Shape becomes: { code: string | number }
type FlexibleUnion = ConflictingA | ConflictingB;

// 2. INTERSECTION (&) creates an impossible conflict:
// Shape becomes: { code: never } (This object can never be created!)
// type BrokenIntersection = ConflictingA & ConflictingB;

const A: FlexibleUnion = { code: "jhkjhaf" };
console.log(A);
// console.log(typeof BrokenIntersection);
