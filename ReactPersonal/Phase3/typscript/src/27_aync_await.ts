// how we are going to use async/await in TypeScript
// Awaited<T> is a utility type that extracts the resolved type of a Promise.
// For example:
// type Example = Awaited<Promise<string>>; // Result: string

async function fetchData(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("Data fetched successfully");
    }, 1000);
  });
}

// Usage example:
async function main() {
  const data: Awaited<ReturnType<typeof fetchData>> = await fetchData();
  console.log(data);
}
function main2() {
  let data: Awaited<ReturnType<typeof fetchData>> = "";
  fetchData().then((result) => {
    data = result;
    console.log("Calling main2()");
    console.log(data);
  });
}
// both are same na?
// Answer: Not exactly. The `main` function uses `async/await`, which makes it easier to work with asynchronous code in a synchronous-like manner. The `main2` function uses `.then()` to handle the Promise, which is the traditional way of handling asynchronous operations. While both achieve the same end result, `main` is generally preferred for readability and maintainability.
// it doing same question is that both functions ultimately get the data from fetchData, but the way they handle the asynchronous operation is different.

main();
main2();
// what this mean
type Example = Awaited<boolean>; // Result: boolean what does this mean?
// Answer: The `Awaited<T>` utility type extracts the resolved type of
// a Promise. In this case, `boolean` is not a Promise, so `Awaited<boolean>` simply resolves to `boolean`. Essentially, `Awaited<T>` will give you the type that a Promise would resolve to, and if `T` is not a Promise, it just returns `T` itself.

function getAllUsers() {
  return Promise.all([
    fetchData(),
    Promise.resolve("Another piece of data" as const),
  ]);
}
// Usage example for getAllUsers
async function main3() {
  let allUsers: Awaited<ReturnType<typeof getAllUsers>> = await getAllUsers();
  // allUsers = ["New user data", "Another new piece of data"]; => issue: TypeScript will infer the type of allUsers based on the return type of getAllUsers, so directly assigning an array of strings may cause a type mismatch.
  console.log(allUsers);
}

main3();
