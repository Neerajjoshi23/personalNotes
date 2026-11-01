// ============================================================================
// 03  REACT HOOK FORM: Controller / useController for CONTROLLED components
// ============================================================================
// Type-check:  npm run typecheck
//
// WHAT YOU NEED TO LEARN FROM THIS FILE
//   1. register() works for NATIVE inputs (they expose a ref + native events)
//   2. Custom/UI-library components (sliders, selects, date pickers, rating stars) are
//      CONTROLLED: they take `value` + `onChange` and have no native input ref
//      -> wrap them with <Controller> or useController
//   3. Controller hands you { field, fieldState, formState }
//        field.value / field.onChange / field.onBlur / field.ref / field.name
//   4. You MUST call field.onChange with the NEW VALUE (or an event): otherwise RHF never knows
//   5. Controller subscribes to ONE field: re-renders are isolated to it
//   6. Pass field.ref to a focusable element so RHF can focus on error
//   7. Rule of thumb: native input -> register; controlled component -> Controller
// ============================================================================

import { Controller, useController, useForm, type Control } from "react-hook-form";

// A custom controlled component: knows NOTHING about RHF. Pure value/onChange API.
type VolumeSliderProps = {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
};

function VolumeSlider({ value, onChange, onBlur }: VolumeSliderProps) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))} // we give a NUMBER, not the event
      onBlur={onBlur}
    />
  );
}

type MixerValues = {
  trackName: string;
  volume: number;
  mood: "calm" | "focus" | "energy";
};

export function MixerSettingsForm() {
  const { register, control, handleSubmit } = useForm<MixerValues>({
    defaultValues: { trackName: "", volume: 50, mood: "calm" },
  });

  return (
    <form onSubmit={handleSubmit((values) => console.log(values))}>
      {/* native input: plain register */}
      <input {...register("trackName", { required: true })} />

      {/* EXAMPLE 1: Controller with a render prop */}
      <Controller
        name="volume"
        control={control}
        rules={{ min: { value: 5, message: "Too quiet" } }}
        render={({ field, fieldState }) => (
          <div>
            <VolumeSlider
              value={field.value}
              onChange={field.onChange} // tells RHF the new value (and marks dirty/touched logic)
              onBlur={field.onBlur}    // lets RHF mark the field as touched (for mode: onTouched/onBlur)
            />
            {fieldState.error && <p role="alert">{fieldState.error.message}</p>}
          </div>
        )}
      />

      {/* EXAMPLE 2: a plain <select> does NOT need Controller: register is enough */}
      <select {...register("mood")}>
        <option value="calm">Calm</option>
        <option value="focus">Focus</option>
        <option value="energy">Energy</option>
      </select>

      {/* EXAMPLE 3: reusable wrapper built with useController (see below) */}
      <ControlledVolume control={control} name="volume" />

      <button type="submit">Save</button>
    </form>
  );
}

// EXAMPLE 3: useController = the hook version: ideal for a reusable field component.
// Because the generic is the form's value type, `name` is type-checked against MixerValues.
function ControlledVolume({ control, name }: { control: Control<MixerValues>; name: "volume" }) {
  const {
    field,
    fieldState: { error, isTouched },
  } = useController({ control, name });

  return (
    <label>
      Volume (copy): {field.value}
      <VolumeSlider value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
      {isTouched && error && <span>{error.message}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// GOTCHAS
// ---------------------------------------------------------------------------
// 1. Using register on a controlled component: it has no ref/native events, so the value never
//    reaches RHF (field looks "stuck" at its default).
// 2. Forgetting to wire field.onChange: UI updates (if you keep local state) but form data
//    doesn't. Always pass the NEW VALUE or the event.
// 3. Controller and a local useState for the same value = two sources of truth. Let RHF own it.
// 4. Controlled components must get a defaultValue: undefined -> defined flips an input from
//    uncontrolled to controlled (React warning). Set defaultValues for every Controller field.
// 5. Controller re-renders on every change of its field; fine for a slider, but don't wrap
//    100 text inputs in Controller "to be safe": that gives up RHF's perf benefit.
// 6. In a UI library (MUI, Radix, shadcn Select) check whether it needs onValueChange vs onChange:
//    adapt in the render prop:  onValueChange={field.onChange}

// ---------------------------------------------------------------------------
// INTERVIEW TAKEAWAYS
// ---------------------------------------------------------------------------
// - "When do you need Controller?"
//     For controlled components that don't expose a native input ref (UI-library selects,
//     date pickers, sliders, rich text). Native inputs use register.
// - "Controller vs useController?"
//     Same thing: component with render prop vs hook; the hook is nicer for reusable fields.
// - "How does RHF stay performant with Controller?"
//     Each Controller subscribes to just its own field, so only it re-renders.
