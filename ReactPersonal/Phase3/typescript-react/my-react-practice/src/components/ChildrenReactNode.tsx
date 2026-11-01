// children how to type in React with TypeScript
import type { ReactNode } from "react";
// what issue above tell??
// Answer: The `type` keyword in the
//  import statement is used to import only type information, which can help with performance and
// avoid including unnecessary code in the final bundle.
// then why above error is on hover visisble saying recat node name not found?
// removed first React then it solved why?
// Answer: When using `import type`, you should not import the default React object because it is not a type. Only type information should be imported with `import type`.

interface ChildrenReactNodeProps {
  children?: ReactNode;
}

const ChildrenReactNodeComponent: React.FC<ChildrenReactNodeProps> = ({
  children = <div>"No children provided"</div>,
}) => {
  return (
    <div>
      <div>"only when count is odd the content is shown"</div>
      {children}
    </div>
  );
};

export default ChildrenReactNodeComponent;
