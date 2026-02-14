// Staggered list of top issues with severity badges
import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, SPRINGS } from "../constants";

type Issue = {
  severity: "HIGH" | "MEDIUM" | "LOW";
  text: string;
};

type TopIssuesProps = {
  issues: Issue[];
  startFrame?: number;
  staggerFrames?: number;
};

const SEVERITY_COLORS: Record<string, string> = {
  HIGH: COLORS.danger,
  MEDIUM: COLORS.warning,
  LOW: COLORS.textMuted,
};

export const TopIssues: React.FC<TopIssuesProps> = ({
  issues,
  startFrame = 0,
  staggerFrames = 30,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}
    >
      {issues.map((issue, i) => {
        const issueStart = startFrame + i * staggerFrames;
        const localFrame = Math.max(0, frame - issueStart);

        const entry = spring({
          frame: localFrame,
          fps,
          config: SPRINGS.snappy,
        });

        if (frame < issueStart) return null;

        return (
          <div
            key={i}
            style={{
              opacity: interpolate(entry, [0, 1], [0, 1], {
                extrapolateRight: "clamp",
              }),
              transform: `translateX(${interpolate(entry, [0, 1], [-20, 0], { extrapolateRight: "clamp" })}px)`,
              display: "flex",
              gap: 8,
              alignItems: "center",
              fontSize: 16,
            }}
          >
            <span
              style={{
                color: SEVERITY_COLORS[issue.severity],
                fontWeight: 700,
                fontSize: 12,
                padding: "2px 6px",
                borderRadius: 4,
                background: `${SEVERITY_COLORS[issue.severity]}22`,
              }}
            >
              {issue.severity}
            </span>
            <span style={{ color: COLORS.terminalText }}>{issue.text}</span>
          </div>
        );
      })}
    </div>
  );
};
