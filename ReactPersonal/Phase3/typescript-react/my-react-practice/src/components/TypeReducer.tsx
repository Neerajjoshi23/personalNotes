import React, { useRef } from "react";
import { useInputContext } from "./InputContext";

export function TypeReducer() {
  const { state, dispatch } = useInputContext();

  // 1. Create type-safe references for the inputs
  const updateRef = useRef<HTMLInputElement>(null);
  const appendRef = useRef<HTMLInputElement>(null);
  const prependRef = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div>
        <strong>Current Managed Value:</strong> {state.input || "(empty)"}
      </div>

      <hr />

      {/* Direct Set (Still uses controlled state because it reflects the actual managed value) */}
      <div>
        <label htmlFor="set-input">Set Input: </label>
        <input
          id="set-input"
          type="text"
          value={state.input}
          onChange={(e) =>
            dispatch({ type: "SET_INPUT", payload: e.target.value })
          }
        />
      </div>

      {/* Update Action using useRef */}
      <div>
        <label htmlFor="update-input">Update Input: </label>
        <input id="update-input" type="text" ref={updateRef} />
        <button
          onClick={() => {
            if (updateRef.current) {
              dispatch({
                type: "UPDATE_INPUT",
                payload: updateRef.current.value,
              });
              updateRef.current.value = ""; // Clear the field after dispatching
            }
          }}
        >
          Apply Update
        </button>
      </div>

      {/* Append Action using useRef */}
      <div>
        <label htmlFor="append-input">Append Input: </label>
        <input id="append-input" type="text" ref={appendRef} />
        <button
          onClick={() => {
            if (appendRef.current) {
              dispatch({
                type: "APPEND_INPUT",
                payload: appendRef.current.value,
              });
              appendRef.current.value = "";
            }
          }}
        >
          Append
        </button>
      </div>

      {/* Prepend Action using useRef */}
      <div>
        <label htmlFor="prepend-input">Prepend Input: </label>
        <input id="prepend-input" type="text" ref={prependRef} />
        <button
          onClick={() => {
            if (prependRef.current) {
              dispatch({
                type: "PREPEND_INPUT",
                payload: prependRef.current.value,
              });
              prependRef.current.value = "";
            }
          }}
        >
          Prepend
        </button>
      </div>

      <div>
        <button onClick={() => dispatch({ type: "RESET_INPUT" })}>
          Reset Value
        </button>
      </div>
    </div>
  );
}
