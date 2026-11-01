import type { ComponentType } from "react";
import { MixerSettingsForm } from "../03_rhf_controller";
import { SignupForm } from "../01_rhf_register_validation";
import { ProfileForm } from "../02_rhf_formstate_defaults";
import { SignUpForm } from "../11_rhf_zod_resolver";

export type LessonGroup = "React Hook Form" | "Zod" | "React Hook Form + Zod";

export type Lesson = {
  id: string;
  file: string;
  title: string;
  group: LessonGroup;
  // Components render live; scripts are executed in the browser and their console output is shown.
  demo?: ComponentType;
};

// 11 expects an onRegister prop, so give it a fake API call.
function SignUpFormDemo() {
  return (
    <SignUpForm
      onRegister={async (values) => {
        await new Promise((resolve) => setTimeout(resolve, 600));
        console.log("onRegister received (parsed OUTPUT):", values);
        console.log("typeof age =", typeof values.age);
      }}
    />
  );
}

export const lessons: Lesson[] = [
  {
    id: "01",
    file: "01_rhf_register_validation.tsx",
    title: "register + built-in validation",
    group: "React Hook Form",
    demo: SignupForm,
  },
  {
    id: "02",
    file: "02_rhf_formstate_defaults.tsx",
    title: "formState, defaultValues, reset, watch",
    group: "React Hook Form",
    demo: ProfileForm,
  },
  {
    id: "03",
    file: "03_rhf_controller.tsx",
    title: "Controller / useController",
    group: "React Hook Form",
    demo: MixerSettingsForm,
  },
  {
    id: "04",
    file: "04_zod_runtime_vs_types.ts",
    title: "Runtime vs TypeScript types",
    group: "Zod",
  },
  {
    id: "05",
    file: "05_zod_parse_safeparse.ts",
    title: "parse vs safeParse, building blocks",
    group: "Zod",
  },
  {
    id: "06",
    file: "06_zod_infer_input_output.ts",
    title: "z.infer / z.input / z.output",
    group: "Zod",
  },
  {
    id: "07",
    file: "07_zod_coerce_transform_default.ts",
    title: "coerce, transform, default, catch",
    group: "Zod",
  },
  {
    id: "08",
    file: "08_zod_refine_superrefine.ts",
    title: "refine, superRefine, async",
    group: "Zod",
  },
  {
    id: "09",
    file: "09_zod_object_strictness_composition.ts",
    title: "Object strictness + composition",
    group: "Zod",
  },
  {
    id: "10",
    file: "10_zod_api_boundary.ts",
    title: "Zod at the API boundary",
    group: "Zod",
  },
  {
    id: "11",
    file: "11_rhf_zod_resolver.tsx",
    title: "RHF + Zod (zodResolver)",
    group: "React Hook Form + Zod",
    demo: SignUpFormDemo,
  },
];

export const groups: LessonGroup[] = ["React Hook Form", "Zod", "React Hook Form + Zod"];

// Raw source text of every lesson file, keyed by "/<file name>" (Vite root-relative).
const rawSources = import.meta.glob("/[0-9][0-9]_*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export function getSource(lesson: Lesson): string {
  return rawSources[`/${lesson.file}`] ?? "// source not found";
}
