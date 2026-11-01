import React from "react";

// In React 19, ComponentProps safely includes the ref automatically!
export type InputFieldProps = React.ComponentProps<"input"> & {
  label: string;
};

// You just destructure 'ref' like any normal prop! No forwardRef needed.
export default function InputField({ label, ref, ...rest }: InputFieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label>{label}</label>

      {/* Just pass the ref directly down along with ...rest */}
      <input ref={ref} {...rest} />
    </div>
  );
}
