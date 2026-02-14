// Before/After health score comparison with animated bars and counter
import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, SPRINGS, DEMO_DATA } from "../constants";

type ScoreTransitionProps = {
  startFrame?: number;
};

export const ScoreTransition: React.FC<ScoreTransitionProps> = ({ startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, frame - startFrame);

  const beforeEntry = spring({
    frame: localFrame,
    fps,
    config: SPRINGS.snappy,
  });

  const afterEntry = spring({
    frame: Math.max(0, localFrame - 30),
    fps,
    config: SPRINGS.snappy,
  });

  const arrowEntry = spring({
    frame: Math.max(0, localFrame - 15),
    fps,
    config: SPRINGS.bouncy,
  });

  // Animated score counters
  const beforeProgress = spring({
    frame: localFrame,
    fps,
    config: SPRINGS.score,
  });

  const afterProgress = spring({
    frame: Math.max(0, localFrame - 30),
    fps,
    config: SPRINGS.score,
  });

  const beforeScore = Math.round(interpolate(beforeProgress, [0, 1], [0, DEMO_DATA.healthScoreBefore]));
  const afterScore = Math.round(interpolate(afterProgress, [0, 1], [0, DEMO_DATA.healthScoreAfter]));

  if (frame < startFrame) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 40,
      justifyContent: 'center',
    }}>
      {/* Before */}
      <div style={{
        textAlign: 'center',
        opacity: beforeEntry,
        transform: `translateY(${interpolate(beforeEntry, [0, 1], [20, 0])}px)`,
      }}>
        <div style={{
          fontSize: 14,
          color: COLORS.textMuted,
          fontFamily: 'Inter, sans-serif',
          marginBottom: 8,
          textTransform: 'uppercase' as const,
          letterSpacing: 2,
        }}>
          Before
        </div>
        <div style={{
          fontSize: 72,
          fontWeight: 800,
          color: COLORS.warning,
          fontFamily: 'Inter, sans-serif',
        }}>
          {beforeScore}
        </div>
        {/* Bar */}
        <div style={{
          width: 200,
          height: 8,
          background: '#ffffff15',
          borderRadius: 4,
          marginTop: 8,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${interpolate(beforeProgress, [0, 1], [0, DEMO_DATA.healthScoreBefore])}%`,
            height: '100%',
            background: COLORS.warning,
            borderRadius: 4,
          }} />
        </div>
      </div>

      {/* Arrow */}
      <div style={{
        opacity: arrowEntry,
        transform: `scale(${arrowEntry})`,
        fontSize: 48,
        color: COLORS.success,
      }}>
        &#8594;
      </div>

      {/* After */}
      <div style={{
        textAlign: 'center',
        opacity: afterEntry,
        transform: `translateY(${interpolate(afterEntry, [0, 1], [20, 0])}px)`,
      }}>
        <div style={{
          fontSize: 14,
          color: COLORS.textMuted,
          fontFamily: 'Inter, sans-serif',
          marginBottom: 8,
          textTransform: 'uppercase' as const,
          letterSpacing: 2,
        }}>
          After
        </div>
        <div style={{
          fontSize: 72,
          fontWeight: 800,
          color: COLORS.success,
          fontFamily: 'Inter, sans-serif',
        }}>
          {afterScore}
        </div>
        {/* Bar */}
        <div style={{
          width: 200,
          height: 8,
          background: '#ffffff15',
          borderRadius: 4,
          marginTop: 8,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${interpolate(afterProgress, [0, 1], [0, DEMO_DATA.healthScoreAfter])}%`,
            height: '100%',
            background: COLORS.success,
            borderRadius: 4,
          }} />
        </div>
      </div>
    </div>
  );
};
