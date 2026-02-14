// Scene 1: The Pain — polished website, cursor clicks, nothing happens, console error reveals
import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { FRAME_MAP } from "../constants";
import { DarkGradientBackground } from "../components/DarkGradientBackground";
import { FlowSyncLandingPage } from "../components/FlowSyncLandingPage";
import { ConsoleError } from "../components/ConsoleError";

export const Scene1_Problem: React.FC = () => {
  const frame = useCurrentFrame();

  // --- Cursor position with Bezier easing ---
  const cursorX =
    frame < FRAME_MAP.scene1_first_click + 1
      ? 200
      : interpolate(
          frame,
          [FRAME_MAP.scene1_first_click + 1, FRAME_MAP.scene1_click_happens],
          [200, 1330],
          {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          }
        );

  const cursorY =
    frame < FRAME_MAP.scene1_first_click + 1
      ? 150
      : interpolate(
          frame,
          [FRAME_MAP.scene1_first_click + 1, FRAME_MAP.scene1_click_happens],
          [150, 52],
          {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          }
        );

  // Second cursor movement: from button to console area (frame 220-240)
  const finalCursorX =
    frame < 220
      ? cursorX
      : interpolate(frame, [220, 238], [cursorX, 800], {
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        });

  const finalCursorY =
    frame < 220
      ? cursorY
      : interpolate(frame, [220, 238], [cursorY, 620], {
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        });

  // --- Click animations ---
  // First click at frame 151
  const firstClickScale =
    frame >= 151 && frame < 157
      ? interpolate(frame, [151, 154, 157], [1.0, 0.9, 1.0], {
          extrapolateRight: "clamp",
        })
      : 1.0;

  // Second click at frame 200
  const secondClickScale =
    frame >= 200 && frame < 206
      ? interpolate(frame, [200, 203, 206], [1.0, 0.9, 1.0], {
          extrapolateRight: "clamp",
        })
      : 1.0;

  const clickScale = firstClickScale * secondClickScale;

  // --- Button hover/press states ---
  // Hovered when cursor is close enough to button (approximated by frame range)
  const distToButton = Math.sqrt(
    Math.pow(cursorX - 1330, 2) + Math.pow(cursorY - 52, 2)
  );
  const isHovered = distToButton < 60 && frame >= FRAME_MAP.scene1_first_click;

  // Pressed for 3 frames after each click
  const isPressed =
    (frame >= 151 && frame < 154) || (frame >= 200 && frame < 203);

  // --- Console panel animation ---
  const consoleHeight =
    frame < FRAME_MAP.scene1_error_reveal + 1
      ? 0
      : interpolate(
          frame,
          [FRAME_MAP.scene1_error_reveal + 1, FRAME_MAP.scene1_error_reveal + 10],
          [0, 200],
          {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
            easing: Easing.out(Easing.quad),
          }
        );

  // --- Cursor visibility ---
  const cursorOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <DarkGradientBackground />

      {/* Browser Mockup — centered */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 1400,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
      >
        {/* Browser Chrome */}
        <div
          style={{
            background: "#1e293b",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* Traffic lights */}
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#ef4444",
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#f59e0b",
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#10b981",
              }}
            />
          </div>
          {/* URL bar */}
          <div
            style={{
              flex: 1,
              background: "#0f172a",
              borderRadius: 6,
              padding: "6px 16px",
              color: "#94a3b8",
              fontSize: 14,
              fontFamily: "Inter, sans-serif",
            }}
          >
            https://flowsync.dev
          </div>
        </div>

        {/* Website Content — shrinks as console grows */}
        <div
          style={{
            height: 800 - consoleHeight,
            overflow: "hidden",
          }}
        >
          <FlowSyncLandingPage isHovered={isHovered} isPressed={isPressed} />
        </div>

        {/* Console Error Panel */}
        <ConsoleError height={consoleHeight} />
      </div>

      {/* Animated Cursor */}
      <div
        style={{
          position: "absolute",
          left: finalCursorX,
          top: finalCursorY,
          opacity: cursorOpacity,
          transform: `scale(${clickScale})`,
          zIndex: 40,
          pointerEvents: "none" as const,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 3l14 9-8 2-4 8-2-19z"
            fill="white"
            stroke="#0f172a"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  );
};
