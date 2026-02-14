// Braille-character spinner with resolve-to-checkmark animation
import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../constants";

const BRAILLE_FRAMES = ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F'];

type SpinnerProps = {
  label: string;
  startFrame: number;
  resolveFrame: number;
};

export const Spinner: React.FC<SpinnerProps> = ({ label, startFrame, resolveFrame }) => {
  const frame = useCurrentFrame();

  if (frame < startFrame) return null;

  const isResolved = frame >= resolveFrame;
  const spinnerChar = BRAILLE_FRAMES[Math.floor(frame / 3) % BRAILLE_FRAMES.length];

  return (
    <div style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 20 }}>
      <span style={{ color: isResolved ? COLORS.success : COLORS.primary, width: 20 }}>
        {isResolved ? '\u2713' : spinnerChar}
      </span>
      <span style={{ color: COLORS.terminalText }}>{label}</span>
    </div>
  );
};
