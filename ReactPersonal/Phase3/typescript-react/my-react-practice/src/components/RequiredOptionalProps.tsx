// This component demonstrates the usage of required and optional props in TypeScript with React.
import type { ReactNode } from "react";
// why need type?
// We use `import type` to import only the type information, which can help with performance and avoid including unnecessary runtime code.
interface RequiredOptionalProps {
  requiredProp: string;
  optionalProp?: number;
  defaultProp?: string; // Optional prop with a default value.
  subComponent?: ReactNode; // Optional prop for rendering a sub-component within this component.
}

const RequiredOptionalPropsComponent: React.FC<RequiredOptionalProps> = ({
  requiredProp,
  optionalProp,
  subComponent,
  defaultProp = "Default Value", // Provide a default value for the optional prop.
}) => {
  return (
    <div>
      <p>Required Prop: {requiredProp}</p>
      {optionalProp !== undefined && <p>Optional Prop: {optionalProp}</p>}
      {subComponent && <div>{subComponent}</div>}
      <p>Default Prop: {defaultProp}</p>
    </div>
  );
};
// question I know react and typescript so what this React.Fc i know <> in this you are defining saying thsi generic type for the props that the component will receive.
//? React.FC stands for React Functional Component. It is a type provided by React for functional components.
// The generic type parameter <RequiredOptionalProps> specifies the type of props that the component will receive.
export default RequiredOptionalPropsComponent;
// List things which i should remember I know react and ts which is new here?
// 1. `import type` is used to import only type information.
// 2. `React.FC` is a type for functional components.
// 3. The generic type parameter `<RequiredOptionalProps>` specifies the type of props.
// 4. Optional props are marked with `?`.
// 5. `ReactNode` represents any valid React child (elements, strings, numbers, etc.).
// 6. Conditional rendering can be used for optional props.
// 7. `React.FC` automatically includes the `children` prop.

// how to deal with let say default props?
// You can provide default values for optional props using default parameters in the function signature or by using defaultProps (though defaultProps is less common with functional components in modern React).
