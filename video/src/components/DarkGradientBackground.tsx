// Animated dark gradient background that subtly shifts over the video duration
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../constants";

export const DarkGradientBackground: React.FC = () => {
  const frame = useCurrentFrame();

  const gradientPosition = interpolate(
    frame,
    [0, 2400],
    [0, 100],
    { extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `linear-gradient(${135 + gradientPosition * 0.5}deg, ${COLORS.background} 0%, ${COLORS.backgroundAlt} 50%, ${COLORS.background} 100%)`,
      }}
    />
  );
};
