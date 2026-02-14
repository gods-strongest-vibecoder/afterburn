// Animated counter that springs from 0 to target score with color interpolation
import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, SPRINGS } from "../constants";

type HealthScoreCounterProps = {
  targetScore: number;
  startFrame?: number;
};

export const HealthScoreCounter: React.FC<HealthScoreCounterProps> = ({
  targetScore,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, frame - startFrame);

  const progress = spring({
    frame: localFrame,
    fps,
    config: SPRINGS.score,
  });

  const currentScore = Math.round(
    interpolate(progress, [0, 1], [0, targetScore], {
      extrapolateRight: "clamp",
    })
  );

  // Color: red (<40) -> amber (40-70) -> green (>70)
  const getColor = (score: number) => {
    if (score < 40) return COLORS.danger;
    if (score < 70) return COLORS.warning;
    return COLORS.success;
  };

  return (
    <span style={{ color: getColor(currentScore), fontWeight: 700 }}>
      {currentScore}
    </span>
  );
};
