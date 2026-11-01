// Always explicitly define the return type for functions
function add(a: number, b: number): number {
  return a + b;
}

add(1, 2);
console.log(add(3, 4));

const arr = [1, 2, 21];
// TypeScript automatically infers 'n' as a number from the array
const doubled = arr.map((n) => n * 8);
console.log(doubled);

// In strict mode, arrow function parameters require type annotations
const times = (n: number): number => n * 9;
console.log(times(2));

// Defines the structure for a 2D coordinate point
type Point = {
  x: number;
  y: number;
};

// Calculates the straight-line distance from the origin (0,0)
function distanceFromorigin(p: Point): number {
  return Math.hypot(p.x, p.y);
}

console.log(distanceFromorigin({ x: 4, y: 3 }));
