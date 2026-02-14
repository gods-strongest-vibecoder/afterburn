// Chrome DevTools-style console error panel that slides up from bottom of browser
import React from "react";

type ConsoleErrorProps = {
  height: number;
};

export const ConsoleError: React.FC<ConsoleErrorProps> = ({ height }) => {
  if (height <= 0) return null;

  return (
    <div
      style={{
        height,
        background: "#1e1e1e",
        borderTop: "1px solid #3e3e3e",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column" as const,
      }}
    >
      {/* Console toolbar */}
      <div
        style={{
          height: 32,
          minHeight: 32,
          background: "#252526",
          borderBottom: "1px solid #3e3e3e",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 16,
        }}
      >
        <span
          style={{
            fontFamily: "Consolas, Menlo, monospace",
            fontSize: 12,
            color: "#cccccc",
            fontWeight: 600,
          }}
        >
          Console
        </span>
        <span
          style={{
            fontFamily: "Consolas, Menlo, monospace",
            fontSize: 11,
            color: "#ef4444",
            background: "rgba(239, 68, 68, 0.15)",
            padding: "2px 8px",
            borderRadius: 10,
          }}
        >
          1 error
        </span>
      </div>

      {/* Error message */}
      <div
        style={{
          padding: "12px 16px",
          background: "rgba(244, 135, 113, 0.1)",
          borderLeft: "3px solid #ef4444",
          margin: "8px 12px",
          borderRadius: 4,
        }}
      >
        <div
          style={{
            fontFamily: "Consolas, Menlo, monospace",
            fontSize: 13,
            color: "#f87171",
            lineHeight: 1.6,
          }}
        >
          <span style={{ marginRight: 8 }}>⛔</span>
          Uncaught TypeError: Cannot read property &apos;handleClick&apos; of undefined
        </div>
        <div
          style={{
            fontFamily: "Consolas, Menlo, monospace",
            fontSize: 13,
            color: "#9cdcfe",
            lineHeight: 1.6,
            marginTop: 4,
            paddingLeft: 24,
          }}
        >
          at onClick (Button.tsx:47)
        </div>
        <div
          style={{
            fontFamily: "Consolas, Menlo, monospace",
            fontSize: 13,
            color: "#6a6a6a",
            lineHeight: 1.6,
            paddingLeft: 24,
          }}
        >
          at HTMLButtonElement.dispatch (react-dom.production.min.js:189)
        </div>
      </div>
    </div>
  );
};
