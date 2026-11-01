import React from "react";
export function FormExample() {
  const [email, setEmail] = React.useState<string>("");
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
  }
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      alert("Enter key pressed!");
    }
  }
  // My question for event we use React.ChangeEvent<HTMLInputElement> for input changes and React.MouseEvent<HTMLButtonElement> for button clicks.
  // React.ChangeEvent<HTMLInputElement> is used for input changes.
  // React.MouseEvent<HTMLButtonElement> is used for button clicks.
  // what is the parameter type for the event handler functions?
  // For input changes, it is React.ChangeEvent<HTMLInputElement>
  // For button clicks, it is React.MouseEvent<HTMLButtonElement>
  // React.{Change, Mouse}Event<HTML...> where H is the HTML element type, e.g., HTMLInputElement or HTMLButtonElement.
  // IS IT CORRECT?
  // Yes, it is correct. React provides specific event types for different HTML elements to ensure type safety in event handler functions.
  return (
    <form>
      <label htmlFor="email">
        Email:
        <input
          type="text"
          name="email"
          id="email"
          value={email}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </label>
      <select
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          alert(`Selected value: ${e.target.value}`);
          setEmail(e.target.value);
        }}
      >
        <option value="option1">Option 1</option>
        <option value="option2">Option 2</option>
        <option value="option3">Option 3</option>
      </select>
      <button
        type="submit"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.preventDefault();
          alert("Form submitted!");
          setEmail("");
        }}
      >
        Submit
      </button>
    </form>
  );
}
