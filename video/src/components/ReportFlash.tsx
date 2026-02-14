// Report summary card that slides in from the right side
import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, SPRINGS, DEMO_DATA } from "../constants";

type ReportFlashProps = {
  startFrame?: number;
};

export const ReportFlash: React.FC<ReportFlashProps> = ({
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, frame - startFrame);
  const entry = spring({
    frame: localFrame,
    fps,
    config: SPRINGS.snappy,
  });

  if (frame < startFrame) return null;

  const translateX = interpolate(entry, [0, 1], [400, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: 420,
        background: "#1a1f2e",
        borderRadius: 12,
        padding: 28,
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        transform: `translateX(${translateX}px)`,
        opacity: interpolate(entry, [0, 1], [0, 1], {
          extrapolateRight: "clamp",
        }),
        border: `1px solid ${COLORS.primary}33`,
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: 16,
          color: COLORS.primary,
          fontWeight: 700,
          marginBottom: 16,
          fontFamily: "Inter, sans-serif",
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Afterburn Report
      </div>

      {/* Score */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: COLORS.warning,
          fontFamily: "Inter, sans-serif",
          marginBottom: 4,
        }}
      >
        {DEMO_DATA.healthScoreBefore}
        <span style={{ fontSize: 24, color: COLORS.textMuted }}>/100</span>
      </div>

      <div
        style={{
          fontSize: 14,
          color: COLORS.textMuted,
          marginBottom: 20,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {DEMO_DATA.totalIssues} issues found
      </div>

      {/* Severity Breakdown */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[
          { label: "High", count: DEMO_DATA.highIssues, color: COLORS.danger },
          {
            label: "Medium",
            count: DEMO_DATA.mediumIssues,
            color: COLORS.warning,
          },
          { label: "Low", count: DEMO_DATA.lowIssues, color: COLORS.success },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              flex: 1,
              background: `${item.color}15`,
              borderRadius: 8,
              padding: "10px 12px",
              textAlign: "center" as const,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: item.color,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {item.count}
            </div>
            <div
              style={{
                fontSize: 11,
                color: COLORS.textMuted,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Categories */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { icon: "\uD83D\uDD18", label: "Dead buttons", count: DEMO_DATA.deadButtons },
          { icon: "\uD83D\uDCDD", label: "Broken forms", count: DEMO_DATA.brokenForms },
          { icon: "\uD83D\uDD17", label: "Broken links", count: DEMO_DATA.brokenLinks },
          {
            icon: "\u267F",
            label: "Accessibility",
            count: DEMO_DATA.a11yViolations,
          },
        ].map((cat) => (
          <div
            key={cat.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 14,
              fontFamily: "Inter, sans-serif",
            }}
          >
            <span style={{ color: COLORS.textMuted }}>
              {cat.icon} {cat.label}
            </span>
            <span style={{ color: COLORS.text, fontWeight: 600 }}>
              {cat.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
