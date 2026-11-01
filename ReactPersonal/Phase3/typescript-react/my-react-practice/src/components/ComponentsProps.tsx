type ButtonProps = React.ComponentProps<"button"> & {
  color?: string;
  size?: "small" | "medium" | "large";
  text?: string;
};
const stylesRealtedApperance = ({ color, size }: ButtonProps) => ({
  color,
  fontSize: size === "small" ? "12px" : size === "medium" ? "16px" : "20px",
});
export default function Button({ color, size, text, ...rest }: ButtonProps) {
  return (
    <button style={stylesRealtedApperance({ color, size })} {...rest}>
      {text ?? "Button"}
    </button>
  );
}
