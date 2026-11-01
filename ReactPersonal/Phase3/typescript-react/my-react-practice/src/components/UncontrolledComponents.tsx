import React from "react";
function UncontrolledComponents() {
  const formRef = React.useRef<HTMLFormElement | null>(null);
  // FormData allows us to easily extract values from the form without needing individual state for each input.
  // what is being returned by getStringValue? It returns the string value of the form field if it exists, otherwise null.
  // This helper function simplifies extracting string values from the FormData object.
  // why needed only in uncontrolled components?
  // In uncontrolled components, we don't have state variables for each input field, so we use FormData to extract values directly from the form.
  // In controlled components, we typically have state variables for each input field, so we don't need to use FormData.
  function getStringValue(formData: FormData, key: string): string | null {
    const value = formData.get(key);
    return typeof value === "string" ? value : null;
  }
  function getNumberValue(formData: FormData, key: string): number | null {
    const value = formData.get(key);
    const stringValue = getStringValue(formData, key);
    if (stringValue === null) {
      return null;
    }
    return Number(stringValue);
  }
  return (
    <div>
      <h2>Uncontrolled Components Example</h2>
      <form
        ref={formRef}
        onSubmit={(e: React.SubmitEvent<HTMLFormElement>) => {
          e.preventDefault();
          const formData = new FormData(formRef.current!);
          const name = getStringValue(formData, "name") ?? "";
          const email = getStringValue(formData, "email") ?? "";
          const age = getNumberValue(formData, "age") ?? 0;
          alert(JSON.stringify({ name, email, age }));
        }}
      >
        // explain use formData? // FormData is used to easily capture the
        values of all form fields without needing to manage individual state for
        each input.
        <input type="text" name="name" defaultValue="John Doe" />
        <input type="email" name="email" defaultValue="john.doe@example.com" />
        <input type="number" name="age" defaultValue="30" />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default UncontrolledComponents;
