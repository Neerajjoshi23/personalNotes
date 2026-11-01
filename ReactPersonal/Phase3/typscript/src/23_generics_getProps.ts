type userA = {
  id: string;
  name: string;
  email?: string;
  readonly createdAt?: Date;
};
function getUser<T, K extends keyof T>(user: T, key: K): T[K] | string {
  return user[key] ?? "Not found";
}
function setUser<T, K extends keyof T>(user: T, key: K, value: T[K]): void {
  user[key] = value;
}
const u1: userA = { id: "1", name: "neeraj" };
const u2: userA = { id: "2", name: "rahul", email: "abc@gmail.com" };
console.log(getUser(u1, "email"));
setUser(u1, "email", "ABSNS@gmail.com");
console.log(getUser(u1, "email"));
