// ============================================================================
// 01  REACT HOOK FORM: register + built-in validation   (react-hook-form.com)
// ============================================================================
// Type-check:  npm run typecheck        (these are components: mount them in a Vite app to see them)
//
// WHAT YOU NEED TO LEARN FROM THIS FILE
//   1. RHF = UNCONTROLLED inputs: values live in the DOM + a ref, NOT in useState
//      -> typing does NOT re-render the component (that's the whole performance pitch)
//   2. register("name") returns { name, onChange, onBlur, ref }: you MUST spread it
//   3. handleSubmit(onValid, onInvalid?): runs validation, calls onValid ONLY if all pass,
//      and calls event.preventDefault() for you
//   4. Built-in rules: required, minLength, maxLength, min, max, pattern, validate
//   5. HTML inputs return STRINGS. type="number" is still a string unless valueAsNumber
//   6. errors.field?.message: the message you passed in the rule
//   7. validation `mode`: when validation runs (onSubmit default, onBlur, onChange, onTouched, all)
//   8. Client validation is UX only. The server must validate again.
// ============================================================================

import { useForm } from "react-hook-form";

type SignupValues = {
  username: string;
  email: string;
  age: number;
  password: string;
  confirm: string;
};

export function SignupForm() {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SignupValues>({
    mode: "onTouched", // validate on first blur, then on every change (nice UX default)
    // default is "onSubmit": errors only appear after the first submit attempt
    // "onChange" validates every keystroke and re-renders a lot: use sparingly
  });

  // EXAMPLE 1: handleSubmit gives you the collected values, already validated.
  // `data` is typed as SignupValues, but NOTE: age is a number only because of valueAsNumber below.
  const onValid = (data: SignupValues) => {
    console.log("valid submit:", data);
  };

  // Optional 2nd callback: runs when validation FAILS (analytics, scroll to first error, ...)
  const onInvalid = (errs: typeof errors) => {
    console.log("invalid fields:", Object.keys(errs));
  };

  return (
    // handleSubmit returns a function (event) => Promise<void>: it calls preventDefault itself.
    <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
      {/* EXAMPLE 2: required + minLength + pattern, each with its OWN message */}
      <label>
        Username
        <input
          {...register("username", {
            required: "Username is required",
            minLength: { value: 3, message: "At least 3 characters" },
            pattern: {
              value: /^[a-z0-9_]+$/i,
              message: "Letters, numbers and underscore only",
            },
          })}
        />
      </label>
      {errors.username && <p role="alert">{errors.username.message}</p>}

      {/* EXAMPLE 3: custom `validate`: return true when OK, or a string (the message) when not */}
      <label>
        Email
        <input
          type="email"
          {...register("email", {
            required: "Email is required",
            validate: (value) =>
              value.endsWith("@example.com") || "Only @example.com addresses",
          })}
        />
      </label>
      {errors.email && <p role="alert">{errors.email.message}</p>}

      {/* EXAMPLE 4: numbers. WITHOUT valueAsNumber the value is the STRING "30". */}
      <label>
        Age
        <input
          type="number"
          {...register("age", {
            valueAsNumber: true, // "30" -> 30 (empty input -> NaN: handle it!)
            required: "Age is required",
            min: { value: 18, message: "Must be 18+" },
          })}
        />
      </label>
      {errors.age && <p role="alert">{errors.age.message}</p>}
      {/* GOTCHA: an empty number input with valueAsNumber gives NaN, not "" or undefined.
          `required` catches empty, but a custom rule would see NaN. */}

      {/* EXAMPLE 5: cross-field validate using getValues */}
      <label>
        Password
        <input
          type="password"
          {...register("password", {
            required: "Password is required",
            minLength: { value: 8, message: "At least 8 characters" },
          })}
        />
      </label>
      {errors.password && <p role="alert">{errors.password.message}</p>}

      <label>
        Confirm password
        <input
          type="password"
          {...register("confirm", {
            // getValues reads current values WITHOUT subscribing / re-rendering
            validate: (value) =>
              value === getValues("password") || "Passwords do not match",
          })}
        />
      </label>
      {errors.confirm && <p role="alert">{errors.confirm.message}</p>}

      <button type="submit">Create account</button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// GOTCHAS (each one is a real production bug)
// ---------------------------------------------------------------------------
// 1. Forgetting to spread:   <input register("username") />        -> nothing is registered
//    Not calling register:   <input {...register} />               -> TS error, but common typo.
// 2. Using `value=` on a registered input: you now fight RHF (controlled + uncontrolled mix).
//    Use defaultValues in useForm for initial values (see 02).
// 3. Registering the same name twice on different inputs: the last one wins (radios/checkbox
//    groups are the legit exception).
// 4. Type-safety lie: type="number" without valueAsNumber means the runtime value is a string
//    even though SignupValues says number. That is exactly the gap Zod's resolver closes (see 11).
// 5. <input> used inside a custom component must forward the ref (React 19: ref is just a prop;
//    React 18: forwardRef), otherwise RHF can't focus the field on error.
// 6. Native browser validation + RHF both running: add `noValidate` to the <form> (done above).

// ---------------------------------------------------------------------------
// INTERVIEW TAKEAWAYS
// ---------------------------------------------------------------------------
// - "Why is React Hook Form faster than a controlled form?"
//     Inputs are uncontrolled: values stay in the DOM, so typing doesn't re-render the form.
//     Only subscribed state (errors, isDirty) causes renders.
// - "What does register return?"
//     { name, onChange, onBlur, ref }, spread onto the input. The ref lets RHF read the value
//     and focus the field on error.
// - "What does handleSubmit do?"
//     preventDefault, run validation, call your callback with typed data only if valid.
// - "When does validation run?"
//     Controlled by `mode` (onSubmit default) and `reValidateMode` (onChange default after submit).

// - "How do you handle password confirmation?"
//     Use a custom validate function that compares the confirm field value with the password field value.

// DONE
