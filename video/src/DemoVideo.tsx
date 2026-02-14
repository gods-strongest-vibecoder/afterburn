// Main video composition - orchestrates scenes with absolute frame positioning
import React from "react";
import { useCurrentFrame, interpolate, Audio, staticFile } from "remotion";
import { FRAME_MAP } from "./constants";
import { Subtitle } from "./components/Subtitle";
import { Scene1_Problem } from "./scenes/Scene1_Problem";
import { Scene2_Scan } from "./scenes/Scene2_Scan";
import { Scene3_Fix } from "./scenes/Scene3_Fix";

export const DemoVideo: React.FC = () => {
  const frame = useCurrentFrame();

  // Scene visibility with crossfade transitions
  const scene1Opacity = frame < FRAME_MAP.transition1_start
    ? 1
    : interpolate(frame, [FRAME_MAP.transition1_start, FRAME_MAP.transition1_end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const scene2Opacity = frame < FRAME_MAP.scene2_start
    ? 0
    : frame < FRAME_MAP.transition2_start
      ? interpolate(frame, [FRAME_MAP.transition1_start, FRAME_MAP.transition1_end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      : interpolate(frame, [FRAME_MAP.transition2_start, FRAME_MAP.transition2_end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const scene3Opacity = frame < FRAME_MAP.scene3_start
    ? 0
    : interpolate(frame, [FRAME_MAP.transition2_start, FRAME_MAP.transition2_end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <>
      {/* Scene 1: The Pain */}
      {frame < FRAME_MAP.transition1_end && (
        <div style={{ position: 'absolute', inset: 0, opacity: scene1Opacity }}>
          <Scene1_Problem />
        </div>
      )}

      {/* Scene 2: The Magic */}
      {frame >= FRAME_MAP.transition1_start && frame < FRAME_MAP.transition2_end && (
        <div style={{ position: 'absolute', inset: 0, opacity: scene2Opacity }}>
          <Scene2_Scan />
        </div>
      )}

      {/* Scene 3: The Future */}
      {frame >= FRAME_MAP.transition2_start && (
        <div style={{ position: 'absolute', inset: 0, opacity: scene3Opacity }}>
          <Scene3_Fix />
        </div>
      )}

      {/* Voiceover audio */}
      <Audio src={staticFile("voiceover.mp3")} />

      {/* Subtitles overlay all scenes */}
      <Subtitle />
    </>
  );
};
