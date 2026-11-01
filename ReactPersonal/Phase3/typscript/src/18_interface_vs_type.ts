// ============================================================================
// MASTER COMPARISON: TYPE VS INTERFACE
// ============================================================================

// ----------------------------------------------------------------------------
// POINT 1: OBJECT SHAPING & COMPREHENSIVE VERSATILITY
// Both shape objects, but 'type' can handle primitives, unions, and tuples.
// ----------------------------------------------------------------------------

// A. Primitive & Union Types (Interfaces cannot do this)
type PrimaryKey = string | number;
type NetworkStatus = "loading" | "success" | "error";

// B. Custom Tuples (Interfaces cannot do this)
type GeoCoordinates = [latitude: number, longitude: number];

// C. Shaping Standard Objects
interface InterfaceUser {
  id: PrimaryKey; // Using the type alias inside the interface
  status: NetworkStatus;
}

type TypeUser = {
  id: PrimaryKey;
  status: NetworkStatus;
};
const user123: TypeUser = {
  id: "234",
  status: "success",
};
console.log(user123);
// ----------------------------------------------------------------------------
// POINT 2: DECLARATION MERGING (Interfaces Auto-Merge, Types Error Out)
// ----------------------------------------------------------------------------

// First declaration
interface Customer {
  name: string;
}

// Second declaration (TypeScript automatically merges this with the first)
interface Customer {
  loyaltyPoints: number;
}

// Resulting merged object variable
const activeCustomer: Customer = {
  name: "Sarah Jenkins",
  loyaltyPoints: 450, // Successfully compiled due to declaration merging
};

// ----------------------------------------------------------------------------
// POINT 3: INHERITANCE / COMBINING SHAPES ('extends' vs '&')
// ----------------------------------------------------------------------------

interface BaseComponent {
  id: string;
}

type InteractionProps = {
  onClick: () => void;
};

// A. Interface extending another shape using the 'extends' keyword
interface ButtonInterface extends BaseComponent {
  label: string;
}

// B. Type combining shapes using the '&' (intersection) operator
type ButtonType = BaseComponent &
  InteractionProps & {
    label: string;
  };

// ----------------------------------------------------------------------------
// INTEROPERABILITY BONUS: Intersecting and Extending cross-compatibly
// ----------------------------------------------------------------------------

// An interface can extend a type alias
interface InteractiveButton extends InteractionProps {
  variant: "primary" | "secondary";
}

// A type can intersect an interface
type MixedComponentType = BaseComponent & InterfaceUser;

// ----------------------------------------------------------------------------
// VARIABLE INSTANTIATION & VERIFICATION PRINTING
// ----------------------------------------------------------------------------

const finalUIWidget: ButtonType = {
  id: "btn_01",
  label: "Submit Form",
  onClick: () => console.log("Button clicked!"),
};

const userLocation: GeoCoordinates = [28.6139, 77.209];

console.log("--- Execution Output ---");
console.log("Customer Profile:", activeCustomer);
console.log("Widget Data:", {
  id: finalUIWidget.id,
  text: finalUIWidget.label,
});
console.log(
  `Coordinates Array: Lat ${userLocation[0]}, Lon ${userLocation[1]}`,
);
