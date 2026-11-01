# Phase 3 — Forms, Zod, Tooling & Frameworks (3.8 – 3.11)

Covers:

- **3.8** Forms — React Hook Form
- **3.9** Schema validation with Zod (mechanics only)
- **3.10** ESLint + Prettier
- **3.11** Rendering strategies, hydration, Next.js (deferred — awareness only)

Sources: RHF "Get Started" and react.dev "Creating a React App" (fetched 2026-10-07).
Zod pages are JS-rendered and returned empty on fetch, so the Zod section is from the Zod API as I know it — verify against https://zod.dev/.

---

# 3.8 Forms — React Hook Form

## 1. Why not just `useState` per field?

Controlled inputs re-render the whole form on every keystroke.

```tsx
const [name, setName] = useState("");

<input value={name} onChange={(e) => setName(e.target.value)} />;
```

With 20 fields that is 20 state variables, 20 handlers, and a render per keystroke.

React Hook Form (RHF) embraces **uncontrolled inputs**:

- The DOM holds the value.
- RHF reads it through a **ref** when needed.
- Typing does not re-render the component.

**Trade-off:** fewer renders, less boilerplate. The cost is that the value is not in React state, so you must ask for it deliberately (`watch`, `getValues`).

---

## 2. Setup

```bash
npm install react-hook-form
```

```tsx
import { useForm, SubmitHandler } from "react-hook-form";

type Inputs = {
  firstName: string;
  age: number;
};

export default function App() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>();

  const onSubmit: SubmitHandler<Inputs> = (data) => {
    console.log(data); // only runs if validation passes
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("firstName", { required: true })} />
      {errors.firstName && <span>This field is required</span>}

      <button type="submit">Save</button>
    </form>
  );
}
```

Pass the generic to `useForm<Inputs>()` so field names and `data` are type-checked.

---

## 3. `register` — the core concept

`register('firstName')` returns an object of props that gets spread onto the input:

```text
{ name, ref, onChange, onBlur }
```

- **`name`** is required. It is the key in the form values.
- **`ref`** lets RHF read and focus the DOM node.
- **`onChange` / `onBlur`** let RHF track validation, dirty and touched state.

Without the spread, the field is **not registered** and its value is missing from `data`.

```tsx
// Correct
<input {...register('email')} />

// Wrong: RHF never sees this field
<input name="email" />
```

---

## 4. Built-in validation rules

RHF mirrors the HTML validation attributes:

- `required`
- `min` / `max`
- `minLength` / `maxLength`
- `pattern`
- `validate` (custom function)

```tsx
<input
  {...register('age', {
    required: 'Age is required', // string = the error message
    min: { value: 18, message: 'Must be 18+' },
    max: { value: 99, message: 'Too old' },
  })}
  type="number"
/>

<input
  {...register('username', {
    validate: (value) => value !== 'admin' || 'Reserved name',
  })}
/>
```

`validate` returns `true` for valid, or a string (the error message) for invalid.

---

## 5. `handleSubmit`

`handleSubmit(onValid, onInvalid?)` wraps your handler:

1. Calls `preventDefault`.
2. Runs validation.
3. Calls `onValid(data)` only if everything passes.
4. Otherwise populates `errors` and focuses the first invalid field.

```tsx
<form onSubmit={handleSubmit(onSubmit, onError)}>
```

---

## 6. `formState` — what you can read

```tsx
const {
  formState: { errors, isDirty, isValid, isSubmitting, touchedFields },
} = useForm<Inputs>();
```

`formState` is a **Proxy**. RHF only subscribes to the properties you actually read during render.

**Gotcha:** reading `formState.isValid` or `isDirty` only inside an effect or callback, not during render, means you never subscribed — the value stays stale. Destructure it in render.

---

## 7. `defaultValues`

```tsx
const { register } = useForm<Inputs>({
  defaultValues: {
    firstName: "",
    age: 18,
  },
});
```

- Set them in `useForm`, **not** as `defaultValue` on each input. Then `reset()` and `isDirty` work correctly.
- They are read **once** on first render. Changing the object later does nothing.
- For async data, use `reset(data)` when it arrives, or pass an async function to `defaultValues`.

```tsx
useEffect(() => {
  if (user) {
    reset(user); // re-initialises values and dirty baseline
  }
}, [user, reset]);
```

---

## 8. Reading values: `watch` vs `getValues`

```tsx
const email = watch("email"); // subscribes: re-renders on every change
const current = getValues("email"); // one-off read, no re-render
```

- `watch` causes re-renders. It defeats the performance win if overused.
- `getValues` is for event handlers and submit-time logic.
- `useWatch` isolates the re-render to the child component using it.

---

## 9. `Controller` — for controlled UI-library inputs

`register` needs a real input that exposes a `ref`. MUI, shadcn/ui, react-select and similar components are **controlled** and may not forward the ref. Use `Controller`:

```tsx
import { Controller, useForm } from "react-hook-form";

const { control } = useForm<Inputs>();

<Controller
  name="iceCream"
  control={control}
  render={({ field }) => <Select {...field} options={options} />}
/>;
```

- `field` carries `value`, `onChange`, `onBlur`, `name`, `ref`.
- `useController` is the hook version of the same thing.
- **Rule:** native input → `register`. Controlled component → `Controller`.

---

## 10. Resolver — plug in a schema (links to 3.9)

Instead of per-field rules, delegate all validation to a schema:

```bash
npm install @hookform/resolvers zod
```

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email"),
  age: z.number().min(18),
});

type FormValues = z.infer<typeof schema>;

const { register, handleSubmit } = useForm<FormValues>({
  resolver: zodResolver(schema),
});
```

**Version gotcha (from the RHF docs):** `Cannot find module '@hookform/resolvers/zod'` is usually a version mismatch. Zod v4 needs a recent `@hookform/resolvers` and `"moduleResolution": "bundler"` (or `node16`/`nodenext`) in `tsconfig.json`.

---

## 11. Gotchas

- **Number inputs return strings.** Use `valueAsNumber: true` (or `z.coerce.number()`).

```tsx
<input type="number" {...register("age", { valueAsNumber: true })} />
```

- **Empty number field gives `NaN`** with `valueAsNumber`. Validate for it.
- **`defaultValues` changes are ignored** after mount. Use `reset`.
- **Forgetting `name`** on a registered field.
- **Spreading `register` after your own `onChange`** overwrites it. Pass `onChange` inside the `register` options instead.

```tsx
<input
  {...register("email", {
    onChange: (e) => console.log(e.target.value),
  })}
/>
```

- **`watch` everywhere** brings back the re-render problem RHF was meant to fix.
- **Client validation is UX, not security.** The server must re-validate.

---

## 12. Interview angles

**"Why is RHF faster than controlled forms?"**
It uses uncontrolled inputs and refs, so typing does not trigger React re-renders. Subscriptions via the `formState` proxy mean only what you read re-renders.

**"`register` vs `Controller`?"**
`register` spreads ref/onChange/onBlur onto native inputs. `Controller` bridges controlled third-party components that cannot take a ref.

**"`watch` vs `getValues`?"**
`watch` subscribes and re-renders. `getValues` is a one-off snapshot with no subscription.

**"How do you validate with a schema?"**
Pass `resolver: zodResolver(schema)`. The schema becomes the single source of truth, and the types come from `z.infer`.

**Recap**

- Uncontrolled + refs = fewer renders.
- `register` for native, `Controller` for controlled libs.
- `handleSubmit` validates first, then calls your handler.
- `defaultValues` is read once; use `reset` for async data.
- Prefer a schema resolver as forms grow.

---

# 3.9 Schema validation with Zod

Scope for this phase: the **mechanics** only (`.parse`, `.safeParse`, inferred types). The security _rationale_ lives in `security-learning-path.md` Phase 4, topic 4.3.

## 1. Why Zod? TypeScript vanishes at runtime

TypeScript types are erased at compile time. They cannot check data that arrives at runtime.

```ts
type User = { name: string };

const res = await fetch("/api/user");
const user = (await res.json()) as User; // a lie: nothing is checked
```

`as User` is a promise to the compiler, not a check. If the API returns something else, you crash later, far from the cause.

Zod validates at the **boundary** (API responses, form input, `localStorage`, URL params), then gives you a trusted typed value.

---

## 2. Define a schema

```ts
import { z } from "zod";

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().min(18).optional(),
  role: z.enum(["admin", "member"]),
  tags: z.array(z.string()),
});
```

Common building blocks:

- Primitives: `z.string()`, `z.number()`, `z.boolean()`, `z.date()`
- `z.object({...})`, `z.array(...)`
- `z.enum([...])`, `z.union([...])`, `z.literal(...)`
- Modifiers: `.optional()`, `.nullable()`, `.default(x)`
- Checks: `.min()`, `.max()`, `.email()`, `.url()`, `.regex()`

---

## 3. `.parse` vs `.safeParse`

```ts
// .parse: returns the data, or THROWS a ZodError
const user = UserSchema.parse(input);
```

```ts
// .safeParse: never throws, returns a discriminated union
const result = UserSchema.safeParse(input);

if (!result.success) {
  console.log(result.error.issues); // what failed and where
  return;
}

result.data; // typed as User
```

- Use `.parse` when invalid data is a bug and a throw is acceptable.
- Use `.safeParse` for user input, where invalid data is expected.
- `result.success` narrows the union. This is a **discriminated union** from topic 3.5.

---

## 4. Inferred types — one source of truth

```ts
type User = z.infer<typeof UserSchema>;
```

You write the schema once and derive the type. They cannot drift apart.

When the schema transforms or coerces, input and output differ:

```ts
type UserInput = z.input<typeof UserSchema>;
type UserOutput = z.output<typeof UserSchema>; // same as z.infer
```

---

## 5. Coercion and transforms

Form values and query params are strings.

```ts
const Schema = z.object({
  age: z.coerce.number(), // "42" becomes 42
});
```

```ts
const Trimmed = z.string().trim().toLowerCase();

const WithTransform = z.string().transform((s) => s.length);
```

**Gotcha:** `z.coerce.boolean()` turns the string `"false"` into `true`, because any non-empty string is truthy. Handle booleans explicitly.

---

## 6. Custom rules: `refine`

```ts
const SignUp = z
  .object({
    password: z.string().min(8),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"], // attach the error to this field
  });
```

Without `path`, a cross-field error attaches to the object root, and the form cannot show it next to a field.

---

## 7. Object strictness

- Default: unknown keys are **stripped** from the output.
- `.strict()` makes unknown keys an error.
- `.passthrough()` keeps unknown keys.

```ts
const Schema = z.object({ a: z.string() }).strict();
```

---

## 8. Using Zod with an API response

```ts
async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  const json: unknown = await res.json(); // treat as unknown, not any

  return UserSchema.parse(json); // throws if the backend drifted
}
```

Typing the raw JSON as `unknown` forces you to validate before use.

---

## 9. Gotchas

- **`as User` is not validation.** It silences the compiler and checks nothing.
- **Validating only on the client.** The server must validate too.
- **`.parse` in a render path** without a try/catch crashes the component tree. Use `.safeParse` or an error boundary.
- **Hand-writing a type next to a schema.** It drifts. Use `z.infer`.
- **`z.coerce.boolean()`** mis-parses `"false"`.
- **Zod major versions** differ (v3 vs v4 API and import paths). Check the version you installed.
- **Optional vs nullable vs undefined:** `.optional()` allows `undefined`, `.nullable()` allows `null`. They are different.

---

## 10. Interview angles

**"TypeScript already checks types. Why Zod?"**
TS is compile-time only. Data crossing a runtime boundary (network, storage, user input) is untyped. Zod validates it and narrows to a real type.

**".parse vs .safeParse?"**
`parse` throws on failure. `safeParse` returns `{ success, data | error }` and never throws.

**"How do you avoid duplicating types and validation?"**
Define the schema once and derive the type with `z.infer<typeof schema>`.

**"How does Zod fit with React Hook Form?"**
Pass the schema through `zodResolver`. RHF runs it on submit, maps issues to `errors`, and the form values are typed from the same schema.

**Recap**

- Runtime validation at trust boundaries; TS types are erased.
- `.safeParse` for expected-bad input, `.parse` for "this is a bug".
- `z.infer` gives one source of truth.
- Coerce form strings, `refine` for cross-field rules (set `path`).
- Client validation is UX, never the only line of defence.

---

# 3.10 ESLint + Prettier

Read: [ESLint Getting Started](https://eslint.org/docs/latest/use/getting-started), [Prettier Rationale](https://prettier.io/docs/rationale), [Prettier: Integrating with Linters](https://prettier.io/docs/integrating-with-linters) — fetched 2026-10-07.
The `eslint-plugin-react-hooks` details are from my own knowledge (not fetched) — verify in its README.

## 1. Two tools, two jobs

- **ESLint** = code **quality**. Finds bugs and bad patterns (unused vars, missing hook deps).
- **Prettier** = code **formatting**. Opinionated, near-zero config (quotes, line width, commas).
- Prettier's docs: use Prettier for formatting and linters for code quality. Stylistic lint rules are unnecessary and can **conflict** with Prettier.

---

## 2. ESLint setup (flat config)

```bash
npm init @eslint/config@latest
```

This creates `eslint.config.js` (flat config, ESLint 9+). Run it:

```bash
npx eslint .
```

Key points from the docs:

- ESLint lints **nothing** unless you extend a shared config or turn rules on explicitly.
- `js/recommended` enables every rule marked recommended.
- Severity levels:
  - `"off"` / `0`: disabled
  - `"warn"` / `1`: reported, **exit code unaffected**
  - `"error"` / `2`: reported, **exit code 1** (fails CI)
- Needs Node `^20.19.0`, `^22.13.0` or `>=24`.
- Before v9 the config was `.eslintrc`; see the migration guide.

```js
import { defineConfig } from "eslint/config";
import js from "@eslint/js";

export default defineConfig([
  {
    files: ["**/*.js"],
    plugins: { js },
    extends: ["js/recommended"],
  },
  {
    rules: {
      "no-unused-vars": "warn",
    },
  },
]);
```

A Vite React + TS template ships with a config already, including the hooks plugin.

---

## 3. `eslint-plugin-react-hooks` — the one that matters most

Two rules:

- **`rules-of-hooks`** (error): hooks only at the top level of components/custom hooks, never in conditions or loops.
- **`exhaustive-deps`** (warn): every reactive value used inside `useEffect`/`useMemo`/`useCallback` must be in the dependency array.

```tsx
useEffect(() => {
  fetchUser(userId);
}, []); // warning: missing dependency 'userId'
```

**Gotcha:** silencing it with `// eslint-disable-next-line react-hooks/exhaustive-deps` hides a real stale-closure bug. Fix the code instead (move the function inside, use a functional update, or `useCallback`).

---

## 4. Prettier setup

```bash
npm install --save-dev --save-exact prettier
```

`.prettierrc`:

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 80
}
```

```bash
npx prettier --write .
npx prettier --check .
```

- `--write` rewrites files. `--check` only reports, which is what CI should use.
- Add `.prettierignore` for `dist`, `node_modules`, lockfiles.

Rationale details worth knowing:

- Output must keep **identical behaviour** to the input. Anything else is a bug.
- Quotes: picks whichever needs the fewest escapes, default double. `singleQuote` changes the default; `jsxSingleQuote` is separate for JSX.
- Blank lines: preserved, but multiple collapse into one, and blank lines at block start and end are removed.
- Objects: stay multi-line if there is a newline between `{` and the first key in your source. Long single-line objects get expanded, short multi-line ones are never collapsed.

---

## 5. Making them coexist

- Rules like indent or quotes in ESLint will fight Prettier.
- Fix: add `eslint-config-prettier`, which **turns off** conflicting ESLint rules. Put it last in the config.
- The Prettier docs advise **against** running Prettier as an ESLint rule (`eslint-plugin-prettier`): noisy red squiggles, slower, an extra layer that can break. Run `prettier --check` separately.

---

## 6. Format-on-save (VS Code)

`.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

Share it in the repo so the whole team gets the same behaviour.

---

## 7. npm scripts

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

Run `lint` and `format:check` in CI so style disputes never reach review.

---

## 8. Gotchas

- **ESLint with no config or no extends** reports nothing, which looks like "all clean".
- **`warn` does not fail CI.** Use `error` for rules you truly enforce.
- **Disabling `exhaustive-deps`** to make the warning go away.
- **ESLint stylistic rules + Prettier** produce a fix loop where each undoes the other.
- **Formatter versions differ** between teammates, causing noisy diffs. Pin Prettier with `--save-exact`.
- **Hand-formatting a file that Prettier then rewrites** wastes time. Let it own the layout.
- **Globally installed ESLint:** discouraged by the docs; plugins and configs must still be local.

---

## 9. Interview angles

**"ESLint vs Prettier?"**
ESLint finds bugs and bad patterns. Prettier only formats. Use both, with `eslint-config-prettier` turning off the overlap.

**"Why is `exhaustive-deps` important?"**
Effects capture values from the render they were created in. A missing dependency means a stale closure that reads old state or props.

**"`warn` vs `error`?"**
Both report. Only `error` sets a non-zero exit code, so only `error` blocks CI.

**"Why not run Prettier inside ESLint?"**
Slower, noisy in the editor, and another layer to break. Run them as separate steps.

**Recap**

- ESLint = quality, Prettier = formatting, keep the roles separate.
- ESLint does nothing until you extend a config or set rules.
- Hooks plugin is the highest-value rule set for React.
- `eslint-config-prettier` removes conflicts.
- Format on save locally, `--check` and `lint` in CI.

---

# 3.11 Rendering strategies, hydration & Next.js (deferred)

**Status:** not a Phase 3 completion requirement. Removed
