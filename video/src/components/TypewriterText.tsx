// Typewriter text effect with blinking cursor
import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

type TypewriterProps = {
  text: string;
  startFrame?: number;
  charsPerFrame?: number;
  style?: React.CSSProperties;
};

export const TypewriterText: React.FC<TypewriterProps> = ({
  text,
  startFrame = 0,
  charsPerFrame = 0.5,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, frame - startFrame);
  const charsToShow = Math.floor(localFrame * charsPerFrame);
  const displayText = text.slice(0, charsToShow);
  const isComplete = charsToShow >= text.length;

  const cursorOpacity = isComplete
    ? interpolate(
        (frame % (fps / 2)),
        [0, fps / 4, fps / 2],
        [1, 0, 1],
        { extrapolateRight: 'clamp' }
      )
    : 1;

  return (
    <span style={style}>
      {displayText}
      <span style={{ opacity: cursorOpacity }}>{'\u258B'}</span>
    </span>
  );
};
