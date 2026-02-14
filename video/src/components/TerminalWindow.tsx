// Terminal chrome wrapper with title bar dots, dark background, and spring entrance
import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, SPRINGS } from "../constants";

type TerminalWindowProps = {
  children: React.ReactNode;
  width?: number;
  style?: React.CSSProperties;
};

export const TerminalWindow: React.FC<TerminalWindowProps> = ({
  children,
  width = 1000,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: SPRINGS.snappy,
  });

  const translateY = interpolate(entrance, [0, 1], [100, 0], {
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(entrance, [0, 1], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        opacity,
        transform: `translateY(${translateY}px)`,
        ...style,
      }}
    >
      {/* Title bar */}
      <div
        style={{
          background: "#161b22",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#ef4444",
          }}
        />
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#f59e0b",
          }}
        />
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#10b981",
          }}
        />
        <span
          style={{
            color: "#8b949e",
            fontSize: 13,
            marginLeft: 8,
            fontFamily: "monospace",
          }}
        >
          afterburn
        </span>
      </div>

      {/* Terminal body */}
      <div
        style={{
          background: COLORS.terminal,
          padding: "20px 24px",
          minHeight: 400,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 18,
          lineHeight: 1.6,
          color: COLORS.terminalText,
        }}
      >
        {children}
      </div>
    </div>
  );
};
