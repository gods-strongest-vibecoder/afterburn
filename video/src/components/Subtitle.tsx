// Bottom-center subtitle overlay with fade in/out
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { subtitles } from "../data/subtitles";

export const Subtitle: React.FC = () => {
  const frame = useCurrentFrame();

  const currentSub = subtitles.find(
    (s) => frame >= s.startFrame && frame < s.endFrame
  );

  if (!currentSub) return null;

  const fadeIn = interpolate(
    frame,
    [currentSub.startFrame, currentSub.startFrame + 10],
    [0, 1],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
  );

  const fadeOut = interpolate(
    frame,
    [currentSub.endFrame - 10, currentSub.endFrame],
    [1, 0],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        textAlign: 'center',
        opacity: Math.min(fadeIn, fadeOut),
        zIndex: 100,
      }}
    >
      <span
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          color: '#f8fafc',
          fontSize: 32,
          fontFamily: 'Inter, sans-serif',
          padding: '8px 24px',
          borderRadius: 8,
        }}
      >
        {currentSub.text}
      </span>
    </div>
  );
};
