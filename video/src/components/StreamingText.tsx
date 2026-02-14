// Multi-line streaming text with progressive reveal and code block syntax highlighting
import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../constants";

type CodeBlockRange = {
  start: number;
  end: number;
};

type StreamingTextProps = {
  lines: string[];
  codeBlockRanges: CodeBlockRange[];
  startFrame?: number;
  linesPerSecond?: number;
};

export const StreamingText: React.FC<StreamingTextProps> = ({
  lines,
  codeBlockRanges,
  startFrame = 0,
  linesPerSecond = 3,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const framesPerLine = fps / linesPerSecond;
  const localFrame = Math.max(0, frame - startFrame);
  const visibleLines = Math.min(
    Math.floor(localFrame / framesPerLine) + 1,
    lines.length
  );

  const isInCodeBlock = (lineIndex: number) => {
    return codeBlockRanges.some(r => lineIndex >= r.start && lineIndex <= r.end);
  };

  const isCodeFence = (line: string) => line.trim().startsWith('```');

  return (
    <div style={{
      fontFamily: 'Inter, sans-serif',
      fontSize: 14,
      lineHeight: 1.7,
      color: COLORS.text,
    }}>
      {lines.slice(0, visibleLines).map((line, i) => {
        const lineOpacity = interpolate(
          localFrame - (i * framesPerLine),
          [0, 5],
          [0, 1],
          { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
        );

        if (line === '') return <div key={i} style={{ height: 8 }} />;

        // Bold markdown headers
        if (line.startsWith('**') && line.includes('**')) {
          const cleanLine = line.replace(/\*\*/g, '');
          return (
            <div key={i} style={{ opacity: lineOpacity, fontWeight: 700, marginTop: 8 }}>
              {cleanLine}
            </div>
          );
        }

        // Code fence lines (``` markers)
        if (isCodeFence(line)) {
          return <div key={i} style={{ height: 4 }} />;
        }

        // Code block content
        if (isInCodeBlock(i) && !isCodeFence(line)) {
          return (
            <div key={i} style={{
              opacity: lineOpacity,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 13,
              color: COLORS.success,
              backgroundColor: '#0d1117',
              padding: '2px 8px',
              marginLeft: 0,
              borderLeft: `2px solid ${COLORS.primary}33`,
            }}>
              {line}
            </div>
          );
        }

        // Regular text
        return (
          <div key={i} style={{ opacity: lineOpacity }}>
            {line}
          </div>
        );
      })}

      {/* Blinking cursor at the end */}
      {visibleLines < lines.length && (
        <span style={{
          opacity: interpolate(
            (frame % (fps / 2)),
            [0, fps / 4, fps / 2],
            [1, 0, 1],
            { extrapolateRight: 'clamp' }
          ),
          color: COLORS.primary,
        }}>
          &#9611;
        </span>
      )}
    </div>
  );
};
