import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider, defaultTheme } from "@adobe/react-spectrum";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider theme={defaultTheme}>
      <App />
    </Provider>
  </StrictMode>,
);
