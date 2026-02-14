// AFTERBURN product badge — always visible in top-left corner
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../constants";

export const ProductBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute',
      top: 30,
      left: 30,
      opacity,
      zIndex: 50,
    }}>
      <span style={{
        color: COLORS.primary,
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: 3,
        textTransform: 'uppercase' as const,
        fontFamily: 'Inter, sans-serif',
      }}>
        AFTERBURN
      </span>
    </div>
  );
};
