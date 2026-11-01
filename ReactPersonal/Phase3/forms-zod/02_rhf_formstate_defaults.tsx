// ============================================================================
// 02  REACT HOOK FORM: formState, defaultValues, reset, watch, server errors
// ============================================================================
// Type-check:  npm run typecheck
//
// WHAT YOU NEED TO LEARN FROM THIS FILE
//   1. formState is a PROXY: it only subscribes to what you READ during render
//      -> reading `isDirty` is what makes the component re-render on dirtiness
//   2. Destructure formState IN RENDER (not in an effect / callback), or the proxy can't track it
//   3. defaultValues are read ONCE at first render. Async data arriving later does NOT update
//      them -> use reset(data) or the `values` option
//   4. reset() restores to defaults (or sets NEW defaults when given an object)
//   5. watch("x")  -> subscribes: re-renders the component on every change of x
//      getValues() -> one-time read, NO re-render. Use inside handlers.
//      useWatch    -> subscribe in a CHILD component so only the child re-renders
//   6. isSubmitting is true while your async onSubmit is pending: disable the button
//   7. setError for server-side errors: field errors AND a "root" error
//   8. setValue / trigger / setFocus: imperative helpers
// ============================================================================

import { useEffect } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";

type ProfileValues = {
  displayName: string;
  bio: string;
  newsletter: boolean;
};

// Pretend API
async function fetchProfile(): Promise<ProfileValues> {
  return { displayName: "Neeraj", bio: "Learning React", newsletter: true };
}

async function saveProfile(
  values: ProfileValues,
): Promise<{ ok: boolean; field?: keyof ProfileValues }> {
  console.log("saving", values);
  return values.displayName === "admin"
    ? { ok: false, field: "displayName" }
    : { ok: true };
}

export function ProfileForm() {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    setError,
    control,
    formState: {
      errors,
      isDirty,
      isSubmitting,
      isSubmitSuccessful,
      dirtyFields,
    },
  } = useForm<ProfileValues>({
    // GOTCHA: this object is read ONCE. If you fetch the profile and pass it in later,
    // the form still shows the empty defaults.
    defaultValues: {
      displayName: "",
      bio: "",
      newsletter: false,
    },
  });

  // EXAMPLE 1: async defaults. Load data, then reset(data): this also becomes the NEW baseline,
  // so isDirty is false right after loading.
  useEffect(() => {
    fetchProfile().then((profile) => reset(profile));
  }, [reset]);
  // Alternative: useForm({ values: profileFromQuery }) keeps the form in sync with query data
  // (it resets whenever `values` changes by deep compare). Great with TanStack Query.

  // EXAMPLE 2: server-side errors
  const onSubmit = async (values: ProfileValues) => {
    try {
      const result = await saveProfile(values);

      if (!result.ok && result.field) {
        // Attach a server message to a SPECIFIC field
        setError(result.field, {
          type: "server",
          message: "That name is reserved",
        });
        return;
      }

      reset(values); // saved values become the new baseline -> isDirty false
    } catch {
      // Not tied to any field: use the special "root" key
      setError("root.serverError", {
        type: "server",
        message: "Network error, try again",
      });
    }
  };

  // EXAMPLE 3: watch vs getValues
  const liveName = watch("displayName"); // subscribes: the WHOLE form re-renders per keystroke
  console.log("liveName:", liveName);
  const onDebugClick = () => {
    console.log("snapshot without re-render:", getValues()); // read in a handler: no subscription
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <input {...register("displayName", { required: "Name required" })} />
      {errors.displayName && <p role="alert">{errors.displayName.message}</p>}
      <p>Live preview: {liveName}</p>

      <textarea {...register("bio")} />

      {/* checkbox: RHF gives a real boolean for a single checkbox */}
      <label>
        <input type="checkbox" {...register("newsletter")} />
        Newsletter
      </label>

      {/* Child component subscribes to just ONE field via useWatch: the parent does not re-render */}
      <BioCounter control={control} />

      {errors.root?.serverError && (
        <p role="alert">{errors.root.serverError.message}</p>
      )}

      {/* EXAMPLE 4: formState flags */}
      <button type="submit" disabled={!isDirty || isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </button>
      <button type="button" onClick={() => reset()}>
        Discard changes
      </button>
      <button type="button" onClick={onDebugClick}>
        Log values
      </button>

      {isSubmitSuccessful && <p>Saved!</p>}
      <pre>dirty: {JSON.stringify(dirtyFields)}</pre>
    </form>
  );
}

function BioCounter({ control }: { control: Control<ProfileValues> }) {
  const bio = useWatch({ control, name: "bio" }); // only THIS component re-renders on bio changes
  return <small>{bio?.length ?? 0} / 160</small>;
}

// ---------------------------------------------------------------------------
// GOTCHAS
// ---------------------------------------------------------------------------
// 1. Async defaultValues ignored: use reset(data) (or the `values` option). Classic "edit form
//    shows empty fields" bug.
// 2. Reading formState.isDirty in an effect / callback only: the proxy never subscribed, so
//    it's stale. Read it during render (destructure at the top, as above).
// 3. watch() at the top of a huge form = re-render on every keystroke. Prefer useWatch in a
//    leaf component, or getValues in handlers.
// 4. isDirty compares against defaultValues. After a successful save, call reset(savedValues),
//    otherwise the form stays "dirty" forever.
// 5. errors.root.* is cleared on the NEXT submit: it's not tied to a field.
// 6. Don't store server data in BOTH useForm and useState/Zustand: pick one source of truth.

// ---------------------------------------------------------------------------
// INTERVIEW TAKEAWAYS
// ---------------------------------------------------------------------------
// - "My form shows empty values after I fetch the data. Why?"
//     defaultValues are read once. Call reset(data) after the fetch, or pass `values`.
// - "watch vs getValues vs useWatch?"
//     watch re-renders the host component; getValues is a non-reactive read; useWatch isolates
//     re-renders to the component that calls it.
// - "How does formState avoid unnecessary renders?"
//     It's a Proxy: only the properties you read in render are subscribed.
// - "How do you show server-side validation errors?"
//     setError("field", {...}) or setError("root.serverError", {...}).
