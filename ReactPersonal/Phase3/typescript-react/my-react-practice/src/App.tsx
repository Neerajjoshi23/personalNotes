import React from "react";
import RequiredOptionalPropsComponent from "./components/RequiredOptionalProps";
import ChildrenReactNodeComponent from "./components/ChildrenReactNode";
import AsConstExample from "./components/AsConstExample";
import InputField from "./components/InputField";
import Button from "./components/ComponentsProps";
import { FormExample } from "./components/Event";
import { TypeReducer } from "./components/TypeReducer";
import { InputProvider } from "./components/InputContext";
import UncontrolledComponents from "./components/UncontrolledComponents";
type AsConstVariant = React.ComponentProps<typeof AsConstExample>["variant"];

function App() {
  const [loading, setLoading] = React.useState<boolean>(false);
  const handleLoadingToggle = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 3000);
  };
  const [variant, setVariant] = React.useState<AsConstVariant>("primary");
  const [username, setUsername] = React.useState<string>("");

  // 1. State to show/hide a temporary status message
  const [status, setStatus] = React.useState<string | null>(null);

  // 2. Timer Ref: Holds the timeout ID across renders without causing re-renders
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // 3. Helper to update variant and trigger a temporary status message
  const handleVariantChange = (newVariant: AsConstVariant) => {
    setVariant(newVariant);
    setStatus(`Variant changed to ${newVariant}!`);
  };

  // 4. useEffect to manage the auto-hide timer and its strict cleanup
  React.useEffect(() => {
    // If a status message was set, start a timer to clear it
    if (status) {
      // Clear any existing active timer first to avoid overlapping timeouts
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Schedule the status message to disappear in 3 seconds
      timerRef.current = setTimeout(() => {
        setStatus(null);
      }, 3000);
    }

    // 🌟 THE CLEANUP FUNCTION 🌟
    // This runs when the component unmounts OR right before 'status' changes again.
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [status]); // Only re-run this effect when the 'status' text changes

  return (
    <InputProvider>
      <div style={{ padding: "24px", maxWidth: "100%" }}>
        <h1>Hello, React with TypeScript!</h1>
        {loading && <div>Loading...</div>}
        <Button
          color="green"
          onClick={() => handleLoadingToggle()}
          text="Toggle Loading"
        />

        {/* Updated buttons to trigger our status timer */}
        <Button
          color="blue"
          onClick={() => handleVariantChange("primary")}
          text="Primary"
        />
        <Button
          color="gray"
          onClick={() => handleVariantChange("secondary")}
          text="Secondary"
        />
        <Button
          color="red"
          onClick={() => handleVariantChange("danger")}
          text="Danger"
        />

        {/* 5. Render the temporary status toast if it exists */}
        {status && (
          <div
            style={{
              marginTop: "12px",
              padding: "8px",
              background: "#e0f7fa",
              color: "#006064",
              borderRadius: "4px",
            }}
          >
            {status}
          </div>
        )}

        <div style={{ marginTop: "24px" }}>
          <InputField
            label="Username"
            type="text"
            placeholder="Enter your username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <ChildrenReactNodeComponent>
          {loading ? (
            <RequiredOptionalPropsComponent
              requiredProp="This is required"
              optionalProp={42}
              subComponent={<AsConstExample size="medium" variant={variant} />}
              defaultProp={"This is a default prop"}
            />
          ) : undefined}
        </ChildrenReactNodeComponent>

        <UncontrolledComponents />
        <FormExample />
        <TypeReducer />
      </div>
    </InputProvider>
  );
}

export default App;
