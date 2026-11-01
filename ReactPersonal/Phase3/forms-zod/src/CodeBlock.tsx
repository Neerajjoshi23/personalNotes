import { Highlight, themes } from "prism-react-renderer";

export function CodeBlock({ code }: { code: string }) {
  return (
    <Highlight theme={themes.vsDark} code={code.trimEnd()} language="tsx">
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre className="code" style={style}>
          {tokens.map((line, index) => (
            <div key={index} {...getLineProps({ line })} className="code-line">
              <span className="code-lineno">{index + 1}</span>
              <span>
                {line.map((token, tokenIndex) => (
                  <span key={tokenIndex} {...getTokenProps({ token })} />
                ))}
              </span>
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}
