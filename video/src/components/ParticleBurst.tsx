// Seeded confetti particle burst — deterministic animation for Remotion
import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { seededRandom } from "../utils/helpers";

type ParticleBurstProps = {
  startFrame: number;
  x?: number;
  y?: number;
  particleCount?: number;
};

export const ParticleBurst: React.FC<ParticleBurstProps> = ({
  startFrame,
  x = 0,
  y = 0,
  particleCount = 15,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;
  if (localFrame < 0 || localFrame > fps) return null; // 1 second duration

  const particles = Array.from({ length: particleCount }, (_, i) => {
    const angle = seededRandom(i) * Math.PI * 2;
    const velocity = 100 + seededRandom(i + 100) * 200;
    const size = 4 + seededRandom(i + 200) * 8;
    const hue = seededRandom(i + 300) * 60 + 100; // Green-to-gold range

    const progress = localFrame / fps;
    const px = Math.cos(angle) * velocity * progress;
    const py = Math.sin(angle) * velocity * progress + (progress * progress * 200);
    const opacity = interpolate(progress, [0, 0.7, 1], [1, 1, 0], { extrapolateRight: 'clamp' });

    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x + px,
          top: y + py,
          width: size,
          height: size,
          borderRadius: seededRandom(i + 400) > 0.5 ? '50%' : '2px',
          backgroundColor: `hsl(${hue}, 80%, 60%)`,
          opacity,
        }}
      />
    );
  });

  return <>{particles}</>;
};
