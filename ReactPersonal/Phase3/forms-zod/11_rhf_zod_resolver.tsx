// ============================================================================
// 11  REACT HOOK FORM + ZOD  (zodResolver)   — the combo you'll use in SoundBlend auth
// ============================================================================
// Type-check:  npm run typecheck
//
// WHAT YOU NEED TO LEARN FROM THIS FILE
//   1. ONE schema = validation rules + TS types + error messages for the form
//   2. zodResolver(schema) replaces per-field rules on register(): RHF runs the schema,
//      maps issues -> errors by `path` (that's why refine needs `path`)
//   3. Needs @hookform/resolvers v5+ (supports Zod v4) and moduleResolution bundler/node16
//   4. INPUT vs OUTPUT types: the form HOLDS raw input, onSubmit RECEIVES parsed output
//        useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>
//      Needed whenever the schema uses coerce / transform / default
//   5. Inputs are strings: use z.coerce.number() (or valueAsNumber) for numbers
//   6. Empty input is "" not undefined: z.string().min(1) for required, not .optional()
//   7. Cross-field errors: refine({ path: ["confirm"] })
//   8. Error display: errors.field?.message (the Zod message)
//   9. Server must validate again: this is UX, not security
// ============================================================================

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// ---------------------------------------------------------------------------
// EXAMPLE 1: the schema (single source of truth)
// ---------------------------------------------------------------------------
export const signUpSchema = z
  .object({
    email: z.email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string().min(1, "Confirm your password"),
    age: z.coerce.number().int("Whole number").min(18, "Must be 18+"), // "" -> 0 -> fails min: OK here
    acceptTerms: z.boolean().refine((v) => v === true, "You must accept the terms"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"], // lands in errors.confirm
  });

// What the FORM holds (before parsing): age is `unknown` because of coerce
export type SignUpInput = z.input<typeof signUpSchema>;
// What onSubmit RECEIVES (after parsing): age is a real number
export type SignUpOutput = z.output<typeof signUpSchema>;

// ---------------------------------------------------------------------------
// EXAMPLE 2: wiring it up
// ---------------------------------------------------------------------------
export function SignUpForm({ onRegister }: { onRegister: (values: SignUpOutput) => Promise<void> }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput, unknown, SignUpOutput>({
    resolver: zodResolver(signUpSchema),
    // Resolver runs on the mode's schedule: onSubmit first, then onChange re-validation
    defaultValues: {
      email: "",
      password: "",
      confirm: "",
      age: "", // input type is unknown, so "" is fine for the empty field
      acceptTerms: false,
    },
  });

  // `values` is SignUpOutput: age is a number, validated, trimmed: trust it.
  const onSubmit = async (values: SignUpOutput) => {
    try {
      await onRegister(values);
    } catch {
      setError("root.serverError", { message: "Sign-up failed, try again" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* No rules in register(): the schema owns ALL the validation */}
      <input type="email" placeholder="Email" {...register("email")} />
      {errors.email && <p role="alert">{errors.email.message}</p>}

      <input type="password" placeholder="Password" {...register("password")} />
      {errors.password && <p role="alert">{errors.password.message}</p>}

      <input type="password" placeholder="Confirm" {...register("confirm")} />
      {errors.confirm && <p role="alert">{errors.confirm.message}</p>}

      {/* Plain type="number" is fine: the schema coerces "30" -> 30. No valueAsNumber needed. */}
      <input type="number" placeholder="Age" {...register("age")} />
      {errors.age && <p role="alert">{errors.age.message}</p>}

      <label>
        <input type="checkbox" {...register("acceptTerms")} />
        I accept the terms
      </label>
      {errors.acceptTerms && <p role="alert">{errors.acceptTerms.message}</p>}

      {errors.root?.serverError && <p role="alert">{errors.root.serverError.message}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Sign up"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// EXAMPLE 3: what the resolver does under the hood (conceptually)
// ---------------------------------------------------------------------------
//   1. handleSubmit collects raw values from the registered inputs (all strings)
//   2. resolver(values) -> schema.safeParseAsync(values)
//   3. success -> returns { values: parsed.data, errors: {} }   (OUTPUT type goes to onSubmit)
//      failure -> returns { values: {}, errors: { [issue.path.join(".")]: { message, type } } }
//   4. RHF puts the errors in formState.errors, focuses the first invalid field, and does NOT
//      call onSubmit.
//   That's why a refine WITHOUT `path` is a problem: the key would be "" (root), no field to show it.

// ---------------------------------------------------------------------------
// GOTCHAS (real bugs)
// ---------------------------------------------------------------------------
// 1. Generic mismatch: with coerce/transform, useForm<z.infer<typeof schema>> makes TS complain
//    about the resolver (input != output). Use the THREE-generic form shown above.
// 2. Optional text field: an untouched input gives "" (not undefined), so z.string().optional()
//    still receives "" and "" passes. For "optional but validated if filled", use
//      z.union([z.literal(""), z.email()])
//    or preprocess "" -> undefined.
// 3. Mixing register rules AND a resolver: the resolver wins; rule props are ignored. Pick one.
// 4. Checkboxes: z.boolean() works with a single register()ed checkbox. A group of checkboxes
//    returns string[] (or true/false for a lone one without a value attribute): shape must match.
// 5. z.coerce.number() turns "" into 0: for "required" ages add z.string().min(1) first (see 07).
// 6. Old @hookform/resolvers (v3) + Zod v4 = confusing type errors. Use resolvers v5+.
// 7. Schema defined INSIDE the component body is rebuilt on every render. Keep it at module level.
// 8. Client validation is not security: validate on the server with the SAME schema if you can
//    share it (monorepo / Next.js server actions).

// ---------------------------------------------------------------------------
// INTERVIEW TAKEAWAYS
// ---------------------------------------------------------------------------
// - "How do you integrate Zod with React Hook Form?"
//     resolver: zodResolver(schema). Types come from z.infer; for coerce/transform use
//     useForm<z.input<S>, unknown, z.output<S>>.
// - "Why z.input and z.output?"
//     The form state is the raw input (strings); the submit handler gets the parsed output.
// - "How does a cross-field error reach the right input?"
//     The refine's `path` becomes the RHF field name in errors.
// - "Why define validation in the schema instead of register rules?"
//     One source of truth, reusable on the server and in tests, types derived from it.
// - "Is client-side validation enough?"
//     No: it's UX. The server must validate again.
