# Zustand — Why Do We Need It?

## 1. React already has state management

React provides:

- `useState`
- `useReducer`
- Context API

So Zustand is **not required for basic state management**.

If only one component needs some state, keep it local:

```tsx
const [isOpen, setIsOpen] = useState(false);
```

**Rule:** Don't make every piece of state global.

---

## 2. Problem: Sharing State

The problem appears when multiple components need the same state.

For example:

```text
App
 ↓
Layout
 ↓
Dashboard
 ↓
Profile
 ↓
UserDetails
```

Suppose `App` owns:

```text
user
setUser
```

but `UserDetails` needs them.

We may have to pass them through every component:

```text
user, setUser
      ↓
   Layout
      ↓
  Dashboard
      ↓
   Profile
      ↓
 UserDetails
```

The intermediate components don't actually need the state.

This is called **prop drilling**.

---

## 3. Context API can solve prop drilling

We can use React Context:

```text
UserContext
    ↓
Navbar
    ↓
UserDetails
```

Components can access the context directly instead of receiving the value through props.

Therefore:

> Zustand is NOT needed simply because state is shared.

Context can absolutely solve shared-state/prop-drilling problems.

We can also combine:

```text
Context + useReducer
```

to build fairly complex shared state management.

---

# 4. So Why Zustand?

Zustand provides a **dedicated store for shared application/client state**.

Instead of keeping the state inside a high-level React component:

```text
App
 ↓
Layout
 ↓
Dashboard
 ↓
Profile
 ↓
UserDetails
```

we can have:

```text
             Zustand Store
          ┌─────────────────┐
          │ user            │
          │ cart            │
          │ theme           │
          │ notifications   │
          └────────┬────────┘
                   │
          ┌────────┴────────┐
          ↓                 ↓
       Navbar          UserDetails
```

Components can directly access the shared state they need.

There is no need to transport the state through unrelated components.

---

# 5. Subscription Model

One important advantage of Zustand is its subscription model.

A component can subscribe to a specific piece of state:

```tsx
const user = useStore((state) => state.user);
```

Another component can subscribe to something else:

```tsx
const theme = useStore((state) => state.theme);
```

The component is interested in the state selected by its selector.

This allows Zustand to manage updates based on what components subscribe to rather than requiring state to be passed through the React component tree.

> Don't simplify this to "Zustand only re-renders the component using the state." Rendering behavior also depends on the component's own props/state and the selector/subscription.

---

# 6. What Exactly Is Zustand?

> **Zustand is a small state-management library that provides a centralized store for shared application/client state, with components subscribing directly to the state they need.**

The basic model is:

```text
Store
 ├── State
 └── Actions
       ↓
   Components
       ↓
 read / subscribe / update
```

A simple store:

```tsx
const useStore = create((set) => ({
  count: 0,

  increment: () =>
    set((state) => ({
      count: state.count + 1,
    })),
}));
```

A component can access it:

```tsx
const count = useStore((state) => state.count);

const increment = useStore((state) => state.increment);
```

---

# 7. Context vs Zustand

|                       | Context                              | Zustand                         |
| --------------------- | ------------------------------------ | ------------------------------- |
| Main purpose          | Share values through React tree      | Manage shared application state |
| Solves prop drilling  | Yes                                  | Yes                             |
| Dedicated store       | No                                   | Yes                             |
| Select specific state | Possible, but more manual            | Built-in selector model         |
| Provider required     | Usually yes                          | No                              |
| Complex state         | Context + `useReducer` can handle it | Designed for this use case      |
| React mechanism       | Yes                                  | External state library          |

---

# 8. Important Mental Model

Don't think:

```text
Context = bad
Zustand = good
```

Instead:

```text
Context
   ↓
Share values through the React component tree

Zustand
   ↓
Dedicated solution for managing shared application state
```

Context and Zustand **overlap**, but they are not exactly the same abstraction.

---

# 9. When Should State Be Global?

### Keep it local

If only one component needs it:

```tsx
const [isOpen, setIsOpen] = useState(false);
```

Examples:

- Dropdown open/closed
- Modal state used only by one component
- Input state that doesn't need to be shared

### Consider shared/global state

When many unrelated parts of the application need the same state:

```text
user
cart
global filters
theme
notifications
shared UI state
application preferences
```

---

# 10. Final Takeaway

React already provides state management.

The problem is often **sharing and organizing state**, not simply storing state.

```text
Local state
    ↓
useState / useReducer

Shared values
    ↓
Context

More dedicated shared application state
    ↓
Zustand / Redux Toolkit / other state libraries
```

Zustand gives us:

- A dedicated store
- Shared application state
- Actions for modifying state
- Direct component subscriptions
- Selectors for selecting the state a component needs
- No Provider requirement

Most importantly:

> **Not every state should go into Zustand. Keep local state local, and use a store when shared application state becomes useful enough to justify it.**

# Zustand — Topic 2: Store and `create()`

## 1. What is a Zustand Store?

A Zustand **store** is a place where we keep:

```text
State + Actions
```

For example:

```tsx
const useCounterStore = create((set) => ({
  count: 0,

  increment: () => {
    set((state) => ({
      count: state.count + 1,
    }));
  },
}));
```

The store contains:

```text
Store
├── State
│   └── count: 0
│
└── Action
    └── increment()
```

---

## 2. What does `create()` do?

`create()` creates a Zustand store and returns a **hook** that React components can use to access the store.

```tsx
const useCounterStore = create((set) => ({
  count: 0,
  increment: () => ...
}));
```

The returned `useCounterStore` is what components use to read/subscribe to the store.

For example:

```tsx
const count = useCounterStore((state) => state.count);
```

This means:

> Get the `count` value from this store and subscribe to the selected state.

---

## 3. State

State is simply the data stored in the store.

```tsx
const useStore = create((set) => ({
  user: null,
  isLoggedIn: false,
}));
```

Here:

```text
State
├── user
└── isLoggedIn
```

---

## 4. Actions

Actions are functions that describe operations we want to perform on the state.

```tsx
const useStore = create((set) => ({
  count: 0,

  increment: () => {
    // update state
  },
}));
```

Here:

```text
State
└── count

Action
└── increment()
```

A common Zustand pattern is to keep the actions alongside the state they modify.

---

## 5. `set()`

`set` is provided by Zustand to update the store's state.

Direct update:

```tsx
set({
  count: 10,
});
```

Update based on the previous state:

```tsx
set((state) => ({
  count: state.count + 1,
}));
```

The second form is useful when the new value depends on the previous value.

---

## 6. Complete Example

```tsx
const useStore = create((set) => ({
  user: null,
  isLoggedIn: false,

  login: (user) =>
    set({
      user,
      isLoggedIn: true,
    }),

  logout: () =>
    set({
      user: null,
      isLoggedIn: false,
    }),
}));
```

Mental model:

```text
Store
│
├── State
│   ├── user
│   └── isLoggedIn
│
└── Actions
    ├── login()
    └── logout()
```

`login()` updates the state using `set()`.

`logout()` updates the state using `set()`.

---

## 7. Using the Store from a Component

A component can select what it needs:

```tsx
function Navbar() {
  const user = useStore((state) => state.user);

  return <div>{user?.name}</div>;
}
```

Or access an action:

```tsx
function LogoutButton() {
  const logout = useStore((state) => state.logout);

  return <button onClick={logout}>Logout</button>;
}
```

The component doesn't need to receive `user` or `logout` through props.

---

# Key Mental Model

```text
create()
   ↓
creates Zustand store
   ↓
Store
├── State
└── Actions
      ↓
    set()
      ↓
updates state
      ↓
Components subscribe/read state
```

## Important Points

- A **store** contains shared state and usually the actions that modify it.
- `create()` creates the Zustand store.
- `create()` returns a hook used by React components.
- `set()` updates the store.
- **State** represents data.
- **Actions** represent operations on that data.
- Components can select the specific state/action they need.

## Topic 2 Goal

After this topic, you should be able to look at:

```tsx
const useStore = create((set) => ({
  user: null,
  isLoggedIn: false,

  login: (user) =>
    set({
      user,
      isLoggedIn: true,
    }),

  logout: () =>
    set({
      user: null,
      isLoggedIn: false,
    }),
}));
```

and immediately understand:

> `create()` creates the store, the store contains state and actions, and the actions use `set()` to update the state.

---

## Next Topic

**Topic 3 — Reading State & Selectors**

We'll cover:

```tsx
const user = useStore((state) => state.user);
```

and, more importantly:

> **Why do we use selectors instead of simply taking the entire store?**

This is where the Zustand subscription/re-rendering model becomes much clearer.

# Zustand — Topic 3: Reading State & Selectors

## 1. Reading State from a Store

After creating a store, components need a way to read its state.

Example store:

```tsx
const useStore = create((set) => ({
  count: 0,
  user: null,
  theme: "light",

  increment: () =>
    set((state) => ({
      count: state.count + 1,
    })),
}));
```

A component can read `count` like this:

```tsx
const count = useStore((state) => state.count);
```

The function:

```tsx
(state) => state.count;
```

is called a **selector**.

---

## 2. What is a Selector?

A selector tells Zustand:

> "From the entire store, I am interested in this particular piece of state."

For example:

```tsx
const user = useStore((state) => state.user);
```

means:

```text
Entire Store
├── count
├── user  ← select this
└── theme
```

Another component could select:

```tsx
const theme = useStore((state) => state.theme);
```

So each component can subscribe to the part of the store it actually needs.

---

## 3. Why Not Take the Entire Store?

You could technically do:

```tsx
const store = useStore();
```

Now the component is accessing the entire store.

For example:

```text
Store
├── user
├── theme
├── cart
├── notifications
└── filters
```

The component is now subscribed to the whole store rather than explicitly selecting one piece.

Usually, you should prefer:

```tsx
const user = useStore((state) => state.user);
```

because the component is saying exactly what it needs.

---

## 4. Selectors and Re-rendering

Suppose we have:

```tsx
const useStore = create((set) => ({
  user: null,
  theme: "light",

  setUser: (user) => set({ user }),
  setTheme: (theme) => set({ theme }),
}));
```

Component A:

```tsx
const user = useStore((state) => state.user);
```

Component B:

```tsx
const theme = useStore((state) => state.theme);
```

If `theme` changes:

```text
theme: "light"
      ↓
theme: "dark"
```

Component A's selected value (`user`) hasn't changed.

This is the benefit of subscribing to specific state rather than passing everything through a React component hierarchy.

---

## 5. Selecting Actions

Selectors aren't only for state.

You can also select an action:

```tsx
const setUser = useStore((state) => state.setUser);
```

Then:

```tsx
<button onClick={() => setUser(user)}>Login</button>
```

Mental model:

```text
useStore(selector)
       ↓
   selects something
       ↓
State OR Action
```

---

## 6. Multiple Values

Suppose a component needs both:

```tsx
user;
theme;
```

You can select them separately:

```tsx
const user = useStore((state) => state.user);
const theme = useStore((state) => state.theme);
```

This is the simplest pattern and a good default.

You may also see more advanced patterns for selecting multiple values together. Don't worry about those yet.

---

## 7. Selector Is Not the Same as Copying State

When you write:

```tsx
const user = useStore((state) => state.user);
```

you're not simply reading the value once.

The component is **subscribing to the selected value**.

Conceptually:

```text
Component
    │
    │ selector
    ↓
Zustand Store
    │
    └── user
          ↓
     component updates
     when selected value changes
```

This is an important difference from simply taking a snapshot of some external variable.

---

# 8. Connection to Our "Why Zustand?" Topic

Earlier we had:

```text
App
 ↓
Layout
 ↓
Dashboard
 ↓
Profile
 ↓
UserDetails
```

With prop drilling, state may need to travel through every component.

With Zustand:

```text
             Store
               │
       ┌───────┴────────┐
       ↓                ↓
    Navbar         UserDetails
       │                │
   user selector    user selector
```

Components can subscribe directly to the shared store.

There is no need for intermediate components to transport the state.

---

# 9. Important Mental Model

Think of:

```tsx
const user = useStore((state) => state.user);
```

as:

> "Subscribe this component to the `user` part of my Zustand store."

And:

```tsx
const theme = useStore((state) => state.theme);
```

as:

> "Subscribe this component to the `theme` part of my Zustand store."

---

# 10. What You Should Know After This Topic

You should understand:

- What a selector is
- Why selectors are useful
- How a component reads state
- How a component subscribes to state
- How to select actions
- Why selecting only what you need is preferable
- How selectors relate to re-rendering
- How this differs from passing state through props

Basic pattern to remember:

```tsx
const value = useStore((state) => state.value);
```

This is the **core Zustand usage pattern**.

---

## Next Topic

**Topic 4 — Updating State with `set()`**

We'll go deeper into:

```tsx
set({ count: 10 });
```

vs.

```tsx
set((state) => ({
  count: state.count + 1,
}));
```

and understand how Zustand updates objects, nested state, and previous-state-dependent values.

# Zustand — Topic 4: Updating State with `set()`

## 1. What is `set()`?

`set()` is the function Zustand provides to **update the store's state**.

Example:

```tsx
const useStore = create((set) => ({
  count: 0,

  increment: () =>
    set({
      count: 1,
    }),
}));
```

Calling `increment()` changes:

```text
count: 0 → 1
```

---

## 2. Direct Updates

If the new value doesn't depend on the previous value:

```tsx
set({
  theme: "dark",
});
```

or:

```tsx
set({
  user: newUser,
});
```

This is straightforward:

```text
Old state
    ↓
 set({ theme: "dark" })
    ↓
New state
```

---

## 3. Updating Based on Previous State

If the new value depends on the current value, use the function form:

```tsx
set((state) => ({
  count: state.count + 1,
}));
```

Example:

```tsx
const useStore = create((set) => ({
  count: 0,

  increment: () =>
    set((state) => ({
      count: state.count + 1,
    })),

  decrement: () =>
    set((state) => ({
      count: state.count - 1,
    })),
}));
```

Mental model:

```text
current state
     ↓
  state.count
     ↓
calculate new value
     ↓
     set()
```

This is the same general idea as React's functional state update:

```tsx
setCount((prev) => prev + 1);
```

---

# 4. Zustand Merges the State

Consider:

```tsx
const useStore = create((set) => ({
  name: "Neeraj",
  age: 23,
  city: "Delhi",
}));
```

If we do:

```tsx
set({
  age: 24,
});
```

we don't need to provide everything else.

The result is conceptually:

```text
Before:
{
  name: "Neeraj",
  age: 23,
  city: "Delhi"
}

After:
{
  name: "Neeraj",
  age: 24,
  city: "Delhi"
}
```

The other top-level properties remain unchanged.

---

# 5. Updating Objects

Suppose:

```tsx
const useStore = create((set) => ({
  user: {
    name: "Neeraj",
    age: 23,
  },
}));
```

To update the user's age:

```tsx
set((state) => ({
  user: {
    ...state.user,
    age: 24,
  },
}));
```

Why?

Because we're replacing the `user` object with a new object.

We preserve the existing properties using:

```tsx
...state.user
```

---

# 6. Nested State

For deeper nesting:

```tsx
{
  user: {
    profile: {
      name: "Neeraj",
      age: 23
    }
  }
}
```

An update might look like:

```tsx
set((state) => ({
  user: {
    ...state.user,
    profile: {
      ...state.user.profile,
      age: 24,
    },
  },
}));
```

This is the normal immutable-update pattern.

For deeply nested state, Zustand also provides utilities/middleware such as Immer, but **don't learn that yet**.

---

# 7. `set()` Can Receive a Function

There are two important forms:

### Object form

```tsx
set({
  count: 10,
});
```

Use when you already know the new value.

### Function form

```tsx
set((state) => ({
  count: state.count + 1,
}));
```

Use when the new value depends on the current state.

This distinction is important.

---

# 8. Actions Usually Own the Updates

A common Zustand pattern is:

```tsx
const useStore = create((set) => ({
  count: 0,

  increment: () =>
    set((state) => ({
      count: state.count + 1,
    })),
}));
```

Instead of components manually deciding how to modify the store, the store exposes actions:

```text
Component
    ↓
increment()
    ↓
set()
    ↓
Store updated
```

This keeps application logic organized inside the store.

---

# 9. Example — Shopping Cart

A slightly more realistic example:

```tsx
const useCartStore = create((set) => ({
  items: [],

  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
}));
```

Mental model:

```text
State
└── items

Actions
├── addItem()
└── removeItem()

Actions
   ↓
  set()
   ↓
Updated items
```

---

# 10. Connection to React

If you already understand React state updates, Zustand should feel familiar.

React:

```tsx
setCount((prev) => prev + 1);
```

Zustand:

```tsx
set((state) => ({
  count: state.count + 1,
}));
```

The fundamental idea is the same:

> When the new state depends on the previous state, calculate the new state from the previous state.

The main difference is **where the state lives and who subscribes to it**.

---

# Key Mental Model

```text
set()
 ↓
updates Zustand store
 ↓
subscribed components are notified
 ↓
components whose selected state changed can update
```

Remember these three patterns:

```tsx
// Direct update
set({ count: 10 });

// Previous-state update
set((state) => ({
  count: state.count + 1,
}));

// Object update
set((state) => ({
  user: {
    ...state.user,
    name: "New Name",
  },
}));
```

## Topic 4 Goal

After this topic, you should understand:

- What `set()` does
- Direct vs functional updates
- Updating based on previous state
- Top-level state merging
- Updating objects immutably
- Updating nested state
- Why actions commonly contain the `set()` logic
- How Zustand's update model relates to React's `useState`

---

## Next Topic

**Topic 5 — Actions & Store Design**

We'll look at why Zustand commonly keeps **state + actions together**, how to design a clean store, and how this starts looking like a real application rather than a counter example.

# Zustand — Topic 5: Actions & Store Design

## 1. Why Put Actions Inside the Store?

A Zustand store commonly contains:

```text
State + Actions
```

Example:

```tsx
const useUserStore = create((set) => ({
  user: null,
  isLoggedIn: false,

  login: (user) =>
    set({
      user,
      isLoggedIn: true,
    }),

  logout: () =>
    set({
      user: null,
      isLoggedIn: false,
    }),
}));
```

The component doesn't need to know **how** the state is changed.

It simply says:

```tsx
login(user);
```

Mental model:

```text
Component
    ↓
  Action
    ↓
   set()
    ↓
 Store State
```

This keeps state-changing logic in one place.

---

# 2. State vs Actions

Think of a store as having two parts.

### State

The data:

```tsx
user: null,
isLoggedIn: false,
```

### Actions

Operations that modify the data:

```tsx
login: (user) => ...,
logout: () => ...,
```

So:

```text
Store
├── State
│   ├── user
│   └── isLoggedIn
│
└── Actions
    ├── login()
    └── logout()
```

---

# 3. Actions Can Use Existing State

Actions can access the current state through `set()`'s callback.

Example:

```tsx
const useCartStore = create((set) => ({
  items: [],

  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
    })),

  clearCart: () =>
    set({
      items: [],
    }),
}));
```

`addItem()` uses the existing `items` to create the new array.

---

# 4. Actions Can Also Read State with `get()`

Zustand's `create()` callback can provide both:

```tsx
create((set, get) => ...)
```

`set` → update state

`get` → read the current store state

Example:

```tsx
const useCartStore = create((set, get) => ({
  items: [],

  addItem: (item) => {
    const items = get().items;

    set({
      items: [...items, item],
    });
  },
}));
```

Mental model:

```text
set() → change state

get() → read current state
```

You won't need `get()` for every action. Use it when an action needs to read other parts of the store while performing some logic.

---

# 5. Keep Business Logic in Actions

Suppose we have:

```tsx
const useCartStore = create((set, get) => ({
  items: [],

  addItem: (item) => {
    // validation / business logic
    // then update state
  },
}));
```

The component can simply do:

```tsx
const addItem = useCartStore((state) => state.addItem);

addItem(product);
```

The component doesn't need to know the internal implementation.

This gives you:

```text
UI
 ↓
Intent / Action
 ↓
Store logic
 ↓
State update
```

---

# 6. Don't Put Everything in One Store

A large application doesn't necessarily need one giant store:

```text
❌ useAppStore

├── user
├── cart
├── notifications
├── products
├── filters
├── editor
├── settings
├── dashboard
├── ...
```

As the application grows, separating concerns can make the code easier to understand.

For example:

```text
Stores
├── useAuthStore
├── useCartStore
├── useUIStore
└── useSettingsStore
```

The exact organization depends on the application.

---

# 7. Keep Related State Together

If several pieces of state belong to the same domain, they can live together.

For example:

```tsx
const useCartStore = create((set) => ({
  items: [],
  coupon: null,

  addItem: (item) => {
    // ...
  },

  removeItem: (id) => {
    // ...
  },

  applyCoupon: (coupon) => {
    // ...
  },
}));
```

Everything related to the cart is together.

```text
Cart Store
├── items
├── coupon
├── addItem()
├── removeItem()
└── applyCoupon()
```

---

# 8. Don't Put Derived Data in State Unnecessarily

Suppose we have:

```tsx
items: [{ price: 100 }, { price: 200 }];
```

We could store:

```tsx
items: [...]
total: 300
```

But now we have two pieces of information that can become inconsistent.

Instead, `total` can often be derived:

```tsx
const total = useCartStore((state) =>
  state.items.reduce((sum, item) => sum + item.price, 0),
);
```

Mental model:

```text
Stored state
    ↓
derive/compute
    ↓
Derived value
```

Don't store something globally just because it can be calculated from existing state.

---

# 9. Example — Authentication Store

A realistic small store:

```tsx
const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,

  login: (user) =>
    set({
      user,
      isAuthenticated: true,
    }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
    }),
}));
```

Component:

```tsx
function Navbar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <>
      <span>{user?.name}</span>
      <button onClick={logout}>Logout</button>
    </>
  );
}
```

The component knows:

> "I need the current user and a logout action."

It doesn't need to know how logout modifies the store.

---

# 10. A Useful Store Design Rule

A good starting rule is:

> **Keep state and the operations that naturally modify that state together.**

For example:

```text
Cart
├── items
├── addItem()
├── removeItem()
└── clearCart()
```

rather than scattering the logic across many components.

---

# Key Mental Model

```text
                    Store
          ┌───────────┴───────────┐
          ↓                       ↓
        State                   Actions
          │                       │
          │                       ↓
          │                      set()
          │                       │
          └───────────←───────────┘
                    update
```

And from the component:

```text
Component
    │
    ├── reads state
    │      ↓
    │   selector
    │
    └── performs action
           ↓
        store action
           ↓
          set()
           ↓
      updated state
```

---

## What You Should Know After Topic 5

You should understand:

- Why actions are commonly kept inside the store
- State vs actions
- `set()` for updating
- `get()` for reading current store state inside store logic
- Keeping related state and actions together
- Separating unrelated domains into different stores when appropriate
- Avoiding unnecessary derived state
- Keeping business/state-changing logic out of UI components where appropriate

At this point, you understand the **core Zustand model**:

```text
create()
   ↓
Store
   ├── State
   └── Actions
         ↓
       set()
         ↓
     State update
         ↓
   subscribed components
```

## Next Topic

**Topic 6 — TypeScript with Zustand**

This should be relatively easy for you because you already know TypeScript. We'll focus on how to type the store, state, actions, selectors, and common patterns without getting into advanced TypeScript tricks.

# Zustand — Topic 6: TypeScript

## 1. Goal of This Topic

Since TypeScript is already familiar, this topic is **not about learning TypeScript itself**.

The goal is to understand:

- How to type a Zustand store
- How to type state
- How to type actions
- How `set()` and `get()` become typed
- How selectors are typed
- How TypeScript inference works with Zustand
- The basic Zustand TypeScript pattern

The main pattern to remember is:

```tsx
type Store = {
  // state
  // actions
};

const useStore = create<Store>()((set, get) => ({
  // implementation
}));
```

---

# 2. Basic TypeScript Pattern

A typical Zustand store looks like this:

```tsx
import { create } from "zustand";

type User = {
  id: number;
  name: string;
};

type UserStore = {
  user: User | null;
  isLoggedIn: boolean;

  login: (user: User) => void;
  logout: () => void;
};

const useUserStore = create<UserStore>()((set) => ({
  user: null,
  isLoggedIn: false,

  login: (user) =>
    set({
      user,
      isLoggedIn: true,
    }),

  logout: () =>
    set({
      user: null,
      isLoggedIn: false,
    }),
}));
```

The important part is:

```tsx
create<UserStore>()(...)
```

`UserStore` describes the complete shape of the Zustand store.

---

# 3. What Does the Store Type Contain?

A Zustand store generally contains:

1. State
2. Actions

For example:

```tsx
type UserStore = {
  // State
  user: User | null;
  isLoggedIn: boolean;

  // Actions
  login: (user: User) => void;
  logout: () => void;
};
```

Conceptually:

```text
Store
├── State
│   ├── user
│   └── isLoggedIn
│
└── Actions
    ├── login()
    └── logout()
```

This is the same State + Actions model from the previous topic, now expressed using TypeScript.

---

# 4. Typing State

State properties are typed normally.

```tsx
type CounterStore = {
  count: number;
  name: string;
  isActive: boolean;
};
```

More realistic example:

```tsx
type User = {
  id: number;
  name: string;
  email: string;
};

type UserStore = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
};
```

This gives the store a clear contract.

For example:

```tsx
user: null,
```

is valid because:

```tsx
user: User | null;
```

allows both a `User` and `null`.

---

# 5. Typing Actions

Actions are just function properties in the store type.

Example:

```tsx
type CounterStore = {
  count: number;

  increment: () => void;
  decrement: () => void;
  add: (amount: number) => void;
};
```

Implementation:

```tsx
const useCounterStore = create<CounterStore>()((set) => ({
  count: 0,

  increment: () =>
    set((state) => ({
      count: state.count + 1,
    })),

  decrement: () =>
    set((state) => ({
      count: state.count - 1,
    })),

  add: (amount) =>
    set((state) => ({
      count: state.count + amount,
    })),
}));
```

The action:

```tsx
add: (amount) => ...
```

must accept:

```tsx
number;
```

because the type says:

```tsx
add: (amount: number) => void;
```

---

# 6. Type Safety at the Component Level

Suppose we have:

```tsx
const add = useCounterStore((state) => state.add);
```

TypeScript understands:

```tsx
add: (amount: number) => void
```

Therefore:

```tsx
add(10); // ✅
add(5); // ✅
add("hello"); // ❌
```

The store type flows into the component automatically.

---

# 7. `set()` Is Typed Automatically

When we write:

```tsx
create<CounterStore>()((set) => ({
```

Zustand knows that the store is a `CounterStore`.

Therefore `set()` is aware of the store's state.

For example:

```tsx
set({
  count: 10,
});
```

is valid.

And:

```tsx
set((state) => ({
  count: state.count + 1,
}));
```

is also valid.

TypeScript knows that:

```tsx
state;
```

represents the store state.

So:

```tsx
state.count;
```

is known to be:

```tsx
number;
```

---

# 8. `get()` Is Typed Too

Remember that Zustand can provide:

```tsx
create((set, get) => ({
```

`get()` gives access to the current store state.

Example:

```tsx
type CartStore = {
  items: string[];

  addItem: (item: string) => void;
  clearCart: () => void;
};

const useCartStore = create<CartStore>()((set, get) => ({
  items: [],

  addItem: (item) => {
    const currentItems = get().items;

    set({
      items: [...currentItems, item],
    });
  },

  clearCart: () => {
    set({
      items: [],
    });
  },
}));
```

TypeScript knows:

```tsx
get().items;
```

is:

```tsx
string[]
```

Therefore:

```tsx
currentItems;
```

is also:

```tsx
string[]
```

---

# 9. Selectors Are Typed

Given:

```tsx
type CounterStore = {
  count: number;
  increment: () => void;
};
```

We can select state:

```tsx
const count = useCounterStore((state) => state.count);
```

TypeScript knows:

```tsx
count: number;
```

Similarly:

```tsx
const increment = useCounterStore((state) => state.increment);
```

knows:

```tsx
increment: () => void
```

No manual annotation is necessary.

---

# 10. Don't Manually Type Every Selector

You generally don't need to write:

```tsx
const count = useCounterStore((state: CounterStore): number => state.count);
```

Instead:

```tsx
const count = useCounterStore((state) => state.count);
```

TypeScript already knows:

```text
state → CounterStore
state.count → number
```

So let inference do the work.

---

# 11. A Complete Example

```tsx
import { create } from "zustand";

type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

type TodoStore = {
  todos: Todo[];

  addTodo: (text: string) => void;
  toggleTodo: (id: number) => void;
  removeTodo: (id: number) => void;
};

const useTodoStore = create<TodoStore>()((set) => ({
  todos: [],

  addTodo: (text) =>
    set((state) => ({
      todos: [
        ...state.todos,
        {
          id: Date.now(),
          text,
          completed: false,
        },
      ],
    })),

  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              completed: !todo.completed,
            }
          : todo,
      ),
    })),

  removeTodo: (id) =>
    set((state) => ({
      todos: state.todos.filter((todo) => todo.id !== id),
    })),
}));
```

Now TypeScript understands all of this:

```text
TodoStore
│
├── todos
│     └── Todo[]
│
├── addTodo
│     └── (text: string) => void
│
├── toggleTodo
│     └── (id: number) => void
│
└── removeTodo
      └── (id: number) => void
```

---

# 12. Using the Store in a Component

```tsx
function TodoList() {
  const todos = useTodoStore((state) => state.todos);

  const toggleTodo = useTodoStore((state) => state.toggleTodo);

  return (
    <div>
      {todos.map((todo) => (
        <button key={todo.id} onClick={() => toggleTodo(todo.id)}>
          {todo.text}
        </button>
      ))}
    </div>
  );
}
```

TypeScript knows:

```tsx
todos;
```

is:

```tsx
Todo[]
```

and:

```tsx
toggleTodo;
```

is:

```tsx
(id: number) => void
```

Therefore:

```tsx
toggleTodo(todo.id);
```

is type safe.

---

# 13. Type Inference

Zustand can infer a lot of types.

For example:

```tsx
const useCounterStore = create((set) => ({
  count: 0,

  increment: () =>
    set((state) => ({
      count: state.count + 1,
    })),
}));
```

TypeScript can infer much of the store shape from the implementation.

However, explicitly defining the store type is often useful for larger applications:

```tsx
type CounterStore = {
  count: number;
  increment: () => void;
};

const useCounterStore = create<CounterStore>()((set) => ({
  count: 0,

  increment: () =>
    set((state) => ({
      count: state.count + 1,
    })),
}));
```

This provides an explicit contract.

---

# 14. Why Explicit Store Types Are Useful

Consider a larger store:

```tsx
type AppStore = {
  user: User | null;
  theme: "light" | "dark";
  notifications: Notification[];
  isSidebarOpen: boolean;

  login: (user: User) => void;
  logout: () => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleSidebar: () => void;
};
```

This type acts as documentation for the store.

Someone opening the file can immediately understand:

```text
What state exists?
What actions exist?
What arguments do actions accept?
What types are returned?
```

It also catches accidental mismatches between the intended store API and its implementation.

---

# 15. Literal / Union Types

Zustand works normally with TypeScript union types.

Example:

```tsx
type Theme = "light" | "dark";

type SettingsStore = {
  theme: Theme;

  setTheme: (theme: Theme) => void;
};
```

Implementation:

```tsx
const useSettingsStore = create<SettingsStore>()((set) => ({
  theme: "light",

  setTheme: (theme) =>
    set({
      theme,
    }),
}));
```

Now:

```tsx
setTheme("dark"); // ✅
setTheme("light"); // ✅
setTheme("blue"); // ❌
```

---

# 16. Optional and Nullable State

Normal TypeScript rules apply.

Example:

```tsx
type AuthStore = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
};
```

Initially:

```tsx
user: null,
token: null,
isAuthenticated: false,
```

After login:

```tsx
set({
  user,
  token,
  isAuthenticated: true,
});
```

TypeScript understands the possible states.

---

# 17. Async Actions Are Also Typed

We'll cover async Zustand actions properly in the next topic, but TypeScript-wise, they are simply functions returning `Promise`.

Example:

```tsx
type UserStore = {
  user: User | null;

  fetchUser: () => Promise<void>;
};
```

Implementation:

```tsx
const useUserStore = create<UserStore>()((set) => ({
  user: null,

  fetchUser: async () => {
    const response = await fetch("/api/user");
    const user = await response.json();

    set({
      user,
    });
  },
}));
```

The action is:

```tsx
fetchUser: () => Promise<void>;
```

---

# 18. Store Type = Public Contract

A useful way to think about the type:

```tsx
type UserStore = {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
};
```

is that it defines the **public API of your store**.

Components don't need to know how `login()` works.

They only need to know:

```tsx
login(user);
```

The implementation can change internally without changing the component API.

This reinforces the same principle from the previous topic:

```text
Component
   ↓
calls action
   ↓
Store action
   ↓
set()
   ↓
state changes
```

---

# 19. The `create<Store>()()` Syntax

You will frequently see:

```tsx
create<CounterStore>()((set) => ({
  ...
}));
```

instead of:

```tsx
create<CounterStore>((set) => ({
  ...
}));
```

For now, just remember the standard TypeScript pattern:

```tsx
create<StoreType>()((set, get) => ({
  ...
}));
```

The extra `()` is part of Zustand's TypeScript-oriented API pattern.

You don't need to understand Zustand's advanced generic implementation behind it.

---

# 20. Advanced TypeScript — Not Yet Necessary

Zustand's documentation contains more advanced TypeScript topics involving things such as:

- `StateCreator`
- Middleware typing
- Generic stores
- Mutators
- `Mutate`
- Slice typing
- Custom middleware
- Advanced generic patterns

You **do not need these right now**.

For normal application development, first become comfortable with:

```tsx
type Store = {
  // state
  // actions
};

const useStore = create<Store>()((set, get) => ({
  // implementation
}));
```

Once middleware and slices become relevant, learn their specific typing patterns then.

---

# 21. Common Pattern to Memorize

```tsx
import { create } from "zustand";

type CounterStore = {
  count: number;

  increment: () => void;
  decrement: () => void;
  add: (amount: number) => void;
};

const useCounterStore = create<CounterStore>()((set) => ({
  count: 0,

  increment: () =>
    set((state) => ({
      count: state.count + 1,
    })),

  decrement: () =>
    set((state) => ({
      count: state.count - 1,
    })),

  add: (amount) =>
    set((state) => ({
      count: state.count + amount,
    })),
}));
```

Then in a component:

```tsx
const count = useCounterStore((state) => state.count);

const increment = useCounterStore((state) => state.increment);
```

That's the core TypeScript usage you'll use repeatedly.

---

# 22. Mental Model

```text
TypeScript
     │
     ▼
Store Type
     │
     ├── State
     │    ├── count: number
     │    ├── user: User | null
     │    └── theme: "light" | "dark"
     │
     └── Actions
          ├── increment(): void
          ├── login(user): void
          └── setTheme(theme): void
                │
                ▼
          create<StoreType>()
                │
                ▼
          Zustand Store
                │
        ┌───────┴────────┐
        ▼                ▼
      set()             get()
        │                │
        ▼                ▼
   update state      read state
        │
        ▼
   typed selectors
        │
        ▼
   React components
```

---

# 23. What You Should Know After Topic 6

You should now be comfortable with:

- [x] Defining a Zustand store type
- [x] Typing state
- [x] Typing actions
- [x] Using `create<Store>()()`
- [x] Understanding typed `set()`
- [x] Understanding typed `get()`
- [x] Using typed selectors
- [x] Using union types in stores
- [x] Using nullable state
- [x] Understanding TypeScript inference
- [x] Knowing when explicit store typing is useful
- [x] Knowing that advanced Zustand TypeScript isn't necessary yet

---

# 24. One-Line Summary

> **TypeScript + Zustand = define the store's State + Actions as a type, pass that type to `create`, and Zustand gives you type-safe `set`, `get`, selectors, and component usage.**

The pattern worth remembering:

```tsx
type Store = {
  state: StateType;
  action: (arg: ArgType) => ReturnType;
};

const useStore = create<Store>()((set, get) => ({
  ...
}));
```

---

# 25. Official Documentation

Zustand's official TypeScript guide:

https://zustand.docs.pmnd.rs/learn/guides/beginner-typescript

Zustand `create` API:

https://zustand.docs.pmnd.rs/reference/apis/create

Advanced TypeScript documentation:

https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript

---

# Zustand — Topic 7: Async Actions

## 1. The Problem: Actions That Take Time

Every action so far has been synchronous — `set()` runs immediately with a value you already have.

Real apps need actions that:

```text
call an API
   ↓
wait
   ↓
then update the store
```

Zustand doesn't need anything special for this. An action can just be an `async` function that calls `set()` whenever it's ready.

---

## 2. The `loading / error / data` Pattern

This is the standard shape for any store that fetches something:

```tsx
type UserStore = {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  fetchUser: (id: number) => Promise<void>;
};
```

Mental model:

```text
Before fetch     → isLoading: true,  error: null
Fetch succeeds   → isLoading: false, user: data,  error: null
Fetch fails      → isLoading: false, user: null,  error: "message"
```

Three states, always reset the ones from the previous attempt.

---

## 3. A Realistic Async Action

```tsx
const useUserStore = create<UserStore>()((set) => ({
  user: null,
  isLoading: false,
  error: null,

  fetchUser: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/users/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }

      const user = await response.json();

      set({ user, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Unknown error",
        isLoading: false,
      });
    }
  },
}));
```

Flow:

```text
Component calls fetchUser(id)
        ↓
   set(loading: true)
        ↓
     await fetch
        ↓
   success → set(user, loading: false)
   failure → set(error, loading: false)
```

The component doesn't await anything itself — it just triggers the action and reads `isLoading`/`error`/`user` via selectors.

```tsx
function UserProfile({ id }: { id: number }) {
  const user = useUserStore((state) => state.user);
  const isLoading = useUserStore((state) => state.isLoading);
  const error = useUserStore((state) => state.error);
  const fetchUser = useUserStore((state) => state.fetchUser);

  useEffect(() => {
    fetchUser(id);
  }, [id, fetchUser]);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  return <p>{user?.name}</p>;
}
```

---

## 4. Using `get()` to Avoid Duplicate Requests

A common real-world guard — don't refetch if a request for the same thing is already in flight:

```tsx
const useUserStore = create<UserStore>()((set, get) => ({
  user: null,
  isLoading: false,
  error: null,

  fetchUser: async (id) => {
    if (get().isLoading) return; // already fetching, skip

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/users/${id}`);
      const user = await response.json();
      set({ user, isLoading: false });
    } catch (err) {
      set({ error: "Failed to load user", isLoading: false });
    }
  },
}));
```

---

## 5. Multiple Async Requests (Parallel)

If a single action needs several independent pieces of data:

```tsx
const useDashboardStore = create<DashboardStore>()((set) => ({
  stats: null,
  notifications: [],
  isLoading: false,

  loadDashboard: async () => {
    set({ isLoading: true });

    const [stats, notifications] = await Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/notifications").then((r) => r.json()),
    ]);

    set({ stats, notifications, isLoading: false });
  },
}));
```

`Promise.all` keeps it a single loading flag instead of juggling one per request.

---

## 6. Resetting Error/Loading State

Errors shouldn't linger forever once the user retries or navigates away. A simple reset action:

```tsx
const useUserStore = create<UserStore>()((set) => ({
  user: null,
  isLoading: false,
  error: null,

  fetchUser: async (id) => {
    /* ... */
  },

  clearError: () => set({ error: null }),
}));
```

Call `clearError()` on retry, on unmount, or before starting a new fetch (as shown in section 3, `set({ isLoading: true, error: null })` already does this inline).

---

## 7. Where Zustand Ends and TanStack Query Begins

This is the important architectural line, and a common interview question.

```text
Zustand
   ↓
good for: CLIENT state
   - UI state (sidebar open, theme, modal open)
   - app-owned state (cart, form draft, auth session flag)
   - state with no "server" of truth — you own it

TanStack Query (or SWR, RTK Query)
   ↓
good for: SERVER state
   - data that lives on a server and can go stale
   - needs caching, refetching, retries, pagination
   - needs deduplication of identical in-flight requests
   - needs background refetch / stale-while-revalidate
```

**Why not just fetch-and-`set()` everything into Zustand, like Topic 7's examples above?**

Because you'd end up hand-rolling all of this yourself:

```text
caching
retry logic
stale-time / refetch-on-focus
request deduplication
pagination cursors
optimistic updates + rollback
```

TanStack Query already solves these. Zustand has no opinion about "server data freshness" — it just stores whatever you `set()`.

**Rule of thumb:**

> If the data comes from a server and can become outdated, prefer a query library. If it's local/UI/app state you fully own, Zustand (or `useState`/Context) is the right tool.

In practice, a real app often has both:

```text
useAuthStore (Zustand)     → isAuthenticated, user session flags
useUIStore (Zustand)       → sidebar open, theme, active modal
useQuery(["user", id])     → actual user data fetched from the server
```

---

## 8. Persisting State Across Refreshes — `persist` Middleware

Async actions solve *fetching* data. But client state you already have — theme, auth token, cart contents — still disappears on a page refresh unless you explicitly save it somewhere. That's what `persist` is for.

`persist` wraps your store definition and automatically syncs it to `localStorage` (or `sessionStorage`, or any storage you configure) on every `set()`, and rehydrates it on load.

```tsx
import { create } from "zustand";
import { persist } from "zustand/middleware";

type SettingsStore = {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
};

const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: "light",

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "settings-storage", // localStorage key
    },
  ),
);
```

Mental model:

```text
setTheme("dark")
      ↓
   set() updates in-memory store
      ↓
persist middleware also writes to localStorage
      ↓
Page refreshes
      ↓
persist middleware reads localStorage on load
      ↓
Store starts already hydrated with "dark"
```

Nothing changes about how components use the store — `useSettingsStore((state) => state.theme)` works exactly the same. `persist` only wraps the *creation* of the store, not its usage.

### 8.1 The `name` Option

`name` is the **required** storage key `persist` writes under. It must be unique per store — two stores with the same `name` will collide and overwrite each other's data in `localStorage`.

### 8.2 Partial Persistence — `partialize`

Not everything in a store should survive a refresh. A common mistake is persisting a whole store including transient state like `isLoading` or `error`, which then loads back in as stale/wrong on the next visit.

```tsx
const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false, // transient — shouldn't persist
      error: null, // transient — shouldn't persist

      login: (user, token) => set({ user, token }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        // isLoading and error are deliberately left out
      }),
    },
  ),
);
```

**Gotcha:** without `partialize`, `persist` saves the *entire* store by default — actions included (harmlessly, since functions aren't stored/restored meaningfully) and any transient UI/loading flags (harmfully, since a stale `isLoading: true` or leftover `error` message can resurrect itself on the next page load).

### 8.3 Choosing Storage

Default is `localStorage` (survives closing the browser). Swap in `sessionStorage` (cleared when the tab closes) via `storage`:

```tsx
import { createJSONStorage } from "zustand/middleware";

persist(
  (set) => ({
    /* ... */
  }),
  {
    name: "cart-storage",
    storage: createJSONStorage(() => sessionStorage),
  },
);
```

### 8.4 When to Reach for `persist`

```text
Good fit:
  theme preference
  auth token / logged-in flag
  cart contents
  sidebar collapsed/expanded
  draft form input the user shouldn't lose on refresh

Bad fit:
  loading/error flags (transient by nature)
  data fetched from a server (that's TanStack Query's job — see 7.7)
  anything that must always be fresh from the server on load
```

---

## 9. What You Should Know After Topic 7

- How to write an async Zustand action with `loading/error/data`
- Why `set()` is called multiple times across one async action (before + after)
- Using `get()` inside an action to guard against duplicate in-flight requests
- Handling multiple parallel requests with `Promise.all`
- Resetting error/loading state on retry
- **The key architectural line: Zustand = client state, TanStack Query = server state**
- Why duplicating server data into Zustand loses you caching/refetching/deduplication for free
- How `persist` middleware wraps a store to sync it to storage automatically
- Why `name` must be unique per persisted store
- Why `partialize` matters — excluding transient state (`isLoading`, `error`) from what gets saved
- Swapping `localStorage` for `sessionStorage` via `storage`/`createJSONStorage`
- When persisting a value is the right call vs. when it should stay transient or come from a query library instead

---

# Still Deferred (intentionally, for later)

- **`devtools` middleware** — wires a store into Redux DevTools for time-travel debugging.
- **Slices pattern** — splitting one large store definition into multiple composable slice files/functions instead of one giant object literal.
- **`immer` middleware** — lets you write "mutating" update syntax inside `set()` for deeply nested state, without manually spreading every level.

Learn these when a real project actually needs one of them, rather than up front.
