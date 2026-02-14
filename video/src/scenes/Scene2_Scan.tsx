// Scene 2: The Magic/Scan — terminal runs afterburn, progress cascade, results, visual callback
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { DarkGradientBackground } from "../components/DarkGradientBackground";
import { FRAME_MAP, COLORS, DEMO_DATA, SPRINGS } from "../constants";
import { FlowSyncLandingPage } from "../components/FlowSyncLandingPage";

// ── Progress steps for the scan cascade ──
const SCAN_STEPS = [
  { frame: 331, label: "Launching browser..." },
  { frame: 355, label: "Crawling site... (3 pages discovered)" },
  { frame: 379, label: "Testing workflows... (5 workflows generated)" },
  { frame: 403, label: "Analyzing results..." },
  { frame: 427, label: "Generating reports..." },
];

// ── Top issues data ──
const TOP_ISSUES = [
  { severity: "HIGH" as const, emoji: "\u{1F534}", text: '"Get Started" button does nothing when clicked' },
  { severity: "HIGH" as const, emoji: "\u{1F534}", text: "Newsletter form fails silently" },
  { severity: "MEDIUM" as const, emoji: "\u{1F7E1}", text: "Missing alt text on 4 images" },
];

// ── Website preview activity phases ──
type ActivityPhase = "clicking" | "filling" | "transitioning" | "auditing" | "idle";

const getActivityPhase = (frame: number): ActivityPhase => {
  if (frame >= 501) return "auditing";
  if (frame >= 431) return "transitioning";
  if (frame >= 371) return "filling";
  if (frame >= 331) return "clicking";
  return "idle";
};

// ── Inline terminal chrome (avoids TerminalWindow relative-frame issue) ──
const TerminalChrome: React.FC<{
  width: number;
  height: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ width, height, children, style = {} }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      display: "flex",
      flexDirection: "column",
      ...style,
    }}
  >
    {/* Title bar */}
    <div
      style={{
        background: "#161b22",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}
    >
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#10b981" }} />
      <span style={{ color: "#8b949e", fontSize: 13, marginLeft: 8, fontFamily: "monospace" }}>
        afterburn
      </span>
    </div>
    {/* Body */}
    <div
      style={{
        background: COLORS.terminal,
        padding: "20px 24px",
        flex: 1,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 18,
        lineHeight: 1.6,
        color: COLORS.terminalText,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  </div>
);

// ── Checkmark animation for a single step ──
const CheckStep: React.FC<{ label: string; appearFrame: number }> = ({
  label,
  appearFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < appearFrame) return null;

  const localFrame = frame - appearFrame;
  const prog = spring({ frame: localFrame, fps, config: { damping: 14, stiffness: 200 } });

  const opacity = interpolate(prog, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(prog, [0, 0.6, 1], [0, 1.1, 1.0], { extrapolateRight: "clamp" });

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 18, opacity }}>
      <span
        style={{
          color: "#50fa7b",
          fontWeight: 700,
          display: "inline-block",
          transform: `scale(${scale})`,
        }}
      >
        {"\u2713"}
      </span>
      <span style={{ color: COLORS.terminalText }}>{label}</span>
    </div>
  );
};

// ── Blinking cursor ──
const BlinkingCursor: React.FC = () => {
  const frame = useCurrentFrame();
  const visible = Math.floor(frame / 15) % 2 === 0;
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 20,
        background: visible ? COLORS.terminalText : "transparent",
        marginLeft: 4,
        verticalAlign: "middle",
      }}
    />
  );
};

// ── Website activity overlay (simulates browser actions in the preview) ──
const WebsiteActivityOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const phase = getActivityPhase(frame);

  if (phase === "idle") return null;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* Clicking phase: animated cursor dot */}
      {phase === "clicking" && (
        <div
          style={{
            position: "absolute",
            top: 18,
            right: interpolate(frame, [331, 360], [30, 50], { extrapolateRight: "clamp" }),
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "rgba(99, 102, 241, 0.7)",
            boxShadow: "0 0 12px rgba(99, 102, 241, 0.5)",
            opacity: interpolate(frame, [331, 340, 365, 370], [0, 1, 1, 0], {
              extrapolateRight: "clamp",
              extrapolateLeft: "clamp",
            }),
          }}
        />
      )}

      {/* Filling phase: highlighted form area */}
      {phase === "filling" && (
        <div
          style={{
            position: "absolute",
            bottom: "20%",
            left: "10%",
            width: "40%",
            height: 20,
            borderRadius: 4,
            background: `rgba(99, 102, 241, ${interpolate(
              frame,
              [371, 380, 420, 430],
              [0, 0.2, 0.2, 0],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
            )})`,
            border: "1px solid rgba(99, 102, 241, 0.3)",
          }}
        />
      )}

      {/* Transitioning phase: page fade overlay */}
      {phase === "transitioning" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `rgba(255, 255, 255, ${interpolate(
              frame,
              [431, 450, 470, 500],
              [0, 0.6, 0.6, 0],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
            )})`,
          }}
        />
      )}

      {/* Auditing phase: a11y highlight overlays */}
      {phase === "auditing" && (() => {
        const auditOpacity = interpolate(frame, [501, 520, 580, 600], [0, 0.8, 0.8, 0.4], {
          extrapolateRight: "clamp",
          extrapolateLeft: "clamp",
        });
        return (
          <>
            <div
              style={{
                position: "absolute",
                top: "30%",
                left: "15%",
                width: "30%",
                height: 30,
                border: `2px solid rgba(245, 158, 11, ${auditOpacity})`,
                borderRadius: 4,
                background: `rgba(245, 158, 11, ${auditOpacity * 0.15})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "55%",
                left: "25%",
                width: "50%",
                height: 25,
                border: `2px solid rgba(139, 92, 246, ${auditOpacity})`,
                borderRadius: 4,
                background: `rgba(139, 92, 246, ${auditOpacity * 0.15})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "72%",
                left: "10%",
                width: "35%",
                height: 22,
                border: `2px solid rgba(245, 158, 11, ${auditOpacity})`,
                borderRadius: 4,
                background: `rgba(245, 158, 11, ${auditOpacity * 0.15})`,
              }}
            />
          </>
        );
      })()}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// ██ SCENE 2 MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export const Scene2_Scan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Website preview: shrinks to top-right corner (frames 270-300) ──
  const previewScale = interpolate(frame, [270, 300], [1, 0.21], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const previewRight = interpolate(frame, [270, 300], [-960, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const previewTop = interpolate(frame, [270, 300], [-540, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const previewOpacity = interpolate(frame, [270, 285], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Preview fades out as visual callback takes over
  const previewLateOpacity = frame >= 750
    ? interpolate(frame, [750, 770], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  // ── Terminal: expands into frame (270-300) ──
  const terminalEntrance = spring({
    frame: Math.max(0, frame - 270),
    fps,
    config: SPRINGS.snappy,
  });
  const terminalOpacity = interpolate(terminalEntrance, [0, 1], [0, 1], {
    extrapolateRight: "clamp",
  });
  const terminalTranslateY = interpolate(terminalEntrance, [0, 1], [60, 0], {
    extrapolateRight: "clamp",
  });

  // Terminal width shrinks for visual callback (frames 750-780)
  const terminalWidth = interpolate(frame, [750, 780], [1200, 1080], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const terminalLeft = interpolate(frame, [750, 780], [360, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Enter key flash (frame 300) ──
  const enterFlash = frame >= 300 && frame < 310
    ? interpolate(frame, [300, 305, 310], [0, 0.3, 0], { extrapolateRight: "clamp" })
    : 0;

  // ── Health score (frames 601-690) ──
  const scoreAppear = frame >= 601;
  const scoreSpring = spring({
    frame: Math.max(0, frame - 601),
    fps,
    config: SPRINGS.bouncy,
  });
  const scoreScale = scoreAppear
    ? interpolate(scoreSpring, [0, 1], [0, 1], { extrapolateRight: "clamp" })
    : 0;
  // Pulse animation: score pulses after appearing
  const scorePulse = frame >= 621 && frame < 641
    ? interpolate(frame, [621, 631, 641], [1.0, 1.1, 1.0], { extrapolateRight: "clamp" })
    : 1.0;

  // ── Visual callback section (frames 751-840) ──
  const callbackVisible = frame >= 751;
  const callbackEntrance = spring({
    frame: Math.max(0, frame - 751),
    fps,
    config: SPRINGS.snappy,
  });
  const callbackOpacity = callbackVisible
    ? interpolate(callbackEntrance, [0, 1], [0, 1], { extrapolateRight: "clamp" })
    : 0;
  const callbackTranslateX = callbackVisible
    ? interpolate(callbackEntrance, [0, 1], [40, 0], { extrapolateRight: "clamp" })
    : 40;
  // Callback fades out for dual reports
  const callbackFadeOut = frame >= 811
    ? interpolate(frame, [811, 825], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  // "FOUND THIS" pulse
  const foundThisPulse = frame >= 765
    ? interpolate(
        frame % 30,
        [0, 15, 30],
        [1.0, 1.08, 1.0],
        { extrapolateRight: "clamp" }
      )
    : 0;

  // Red circle highlight pulse
  const highlightPulse = frame >= 760
    ? interpolate(frame % 40, [0, 20, 40], [0.3, 0.6, 0.3], { extrapolateRight: "clamp" })
    : 0;

  // ── Dual reports (frames 811-840) ──
  const reportsVisible = frame >= 811;
  const reportLineOpacity = reportsVisible
    ? interpolate(frame, [811, 818], [0, 1], { extrapolateRight: "clamp" })
    : 0;
  const annotation1Opacity = interpolate(frame, [820, 828], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const annotation2Opacity = interpolate(frame, [830, 838], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Issue stagger timing ──
  const issueBaseFrame = 691;
  const issueStagger = 15;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <DarkGradientBackground />

      {/* ── Enter flash overlay ── */}
      {enterFlash > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `rgba(255, 255, 255, ${enterFlash})`,
            zIndex: 100,
            pointerEvents: "none",
          }}
        />
      )}

      {/* ── Website preview (top-right corner) ── */}
      {frame >= 270 && frame < 770 && (
        <div
          style={{
            position: "absolute",
            right: previewRight,
            top: previewTop,
            width: 1920,
            height: 1080,
            transform: `scale(${previewScale})`,
            transformOrigin: "top right",
            opacity: previewOpacity * previewLateOpacity,
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.1)",
            zIndex: 10,
          }}
        >
          <FlowSyncLandingPage />
          <WebsiteActivityOverlay />
        </div>
      )}

      {/* ── Terminal ── */}
      {frame >= 270 && (
        <div
          style={{
            position: "absolute",
            left: terminalLeft,
            top: "50%",
            transform: `translateY(-50%) translateY(${terminalTranslateY}px)`,
            opacity: terminalOpacity,
            zIndex: 20,
          }}
        >
          <TerminalChrome width={terminalWidth} height={700}>
            {/* Command line — pre-typed */}
            <div style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
              <span style={{ color: "#50fa7b" }}>$</span>
              <span style={{ marginLeft: 8, color: COLORS.terminalText }}>
                npx afterburn https://flowsync.dev
              </span>
              {frame < 300 && <BlinkingCursor />}
            </div>

            {/* Version banner (after enter) */}
            {frame >= 300 && (
              <div style={{ color: COLORS.primary, marginBottom: 12, fontWeight: 700 }}>
                Afterburn v1.0.1
              </div>
            )}

            {/* First progress line */}
            {frame >= 300 && frame < 331 && (
              <div style={{ color: COLORS.textMuted, marginLeft: 8 }}>
                {"\u283B"} Launching browser...
              </div>
            )}

            {/* Scan progress cascade */}
            <div style={{ marginLeft: 8 }}>
              {SCAN_STEPS.map((step, i) => (
                <CheckStep key={i} label={step.label} appearFrame={step.frame} />
              ))}
            </div>

            {/* ── Health Score (frame 601+) ── */}
            {scoreAppear && (
              <div
                style={{
                  marginTop: 20,
                  transform: `scale(${scoreScale})`,
                  transformOrigin: "left center",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ color: COLORS.terminalText, fontSize: 18 }}>Health Score:</span>
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 72,
                      fontWeight: 900,
                      color: COLORS.warning,
                      transform: `scale(${scorePulse})`,
                      display: "inline-block",
                    }}
                  >
                    {DEMO_DATA.healthScoreBefore}
                  </span>
                  <span style={{ fontSize: 36, color: COLORS.terminalText, fontWeight: 300 }}>
                    /100
                  </span>
                  <span style={{ fontSize: 28, marginLeft: 4 }}>{"\u26A0\uFE0F"}</span>
                </div>
                {frame >= 620 && (
                  <div
                    style={{
                      color: COLORS.textMuted,
                      fontSize: 16,
                      marginTop: 4,
                      opacity: interpolate(frame, [620, 635], [0, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      }),
                    }}
                  >
                    {DEMO_DATA.totalIssues} issues found ({DEMO_DATA.highIssues} high,{" "}
                    {DEMO_DATA.mediumIssues} medium, {DEMO_DATA.lowIssues} low)
                  </div>
                )}
              </div>
            )}

            {/* ── Top Issues (frame 691+) ── */}
            {frame >= issueBaseFrame && (
              <div style={{ marginTop: 16 }}>
                {TOP_ISSUES.map((issue, i) => {
                  const issueFrame = issueBaseFrame + i * issueStagger;
                  if (frame < issueFrame) return null;

                  const localF = frame - issueFrame;
                  const prog = spring({
                    frame: localF,
                    fps,
                    config: SPRINGS.snappy,
                  });
                  const opacity = interpolate(prog, [0, 1], [0, 1], {
                    extrapolateRight: "clamp",
                  });
                  const translateX = interpolate(prog, [0, 1], [-20, 0], {
                    extrapolateRight: "clamp",
                  });

                  const sevColor =
                    issue.severity === "HIGH" ? COLORS.danger : COLORS.warning;

                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        fontSize: 18,
                        fontFamily: "JetBrains Mono, monospace",
                        opacity,
                        transform: `translateX(${translateX}px)`,
                        marginBottom: 6,
                        // First issue gets red background highlight (references Scene 1)
                        ...(i === 0
                          ? {
                              background: "rgba(239, 68, 68, 0.12)",
                              padding: "4px 8px",
                              borderRadius: 4,
                              borderLeft: `3px solid ${COLORS.danger}`,
                            }
                          : {}),
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{issue.emoji}</span>
                      <span
                        style={{
                          color: sevColor,
                          fontWeight: 700,
                          fontSize: 13,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: `${sevColor}22`,
                        }}
                      >
                        [{issue.severity}]
                      </span>
                      <span style={{ color: COLORS.terminalText }}>{issue.text}</span>
                    </div>
                  );
                })}

                {/* "... and 49 more" */}
                {frame >= issueBaseFrame + TOP_ISSUES.length * issueStagger && (
                  <div
                    style={{
                      color: COLORS.textMuted,
                      fontSize: 15,
                      marginTop: 6,
                      marginLeft: 24,
                      opacity: interpolate(
                        frame,
                        [
                          issueBaseFrame + TOP_ISSUES.length * issueStagger,
                          issueBaseFrame + TOP_ISSUES.length * issueStagger + 12,
                        ],
                        [0, 1],
                        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                      ),
                    }}
                  >
                    ... and 49 more
                  </div>
                )}
              </div>
            )}

            {/* ── Dual Reports (frame 811+) ── */}
            {reportsVisible && (
              <div style={{ marginTop: 16, opacity: reportLineOpacity }}>
                <div style={{ color: COLORS.terminalText, marginBottom: 6 }}>
                  Reports saved:
                </div>
                <div
                  style={{
                    color: COLORS.terminalText,
                    marginLeft: 16,
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <span>{"\uD83D\uDCC4"} HTML:</span>
                  <span style={{ color: "#8be9fd" }}>report.html</span>
                  <span
                    style={{
                      color: COLORS.textMuted,
                      fontStyle: "italic",
                      opacity: annotation1Opacity,
                    }}
                  >
                    {"\u2190"} For you to read
                  </span>
                </div>
                <div
                  style={{
                    color: COLORS.terminalText,
                    marginLeft: 16,
                    display: "flex",
                    gap: 8,
                    marginTop: 4,
                  }}
                >
                  <span>{"\uD83E\uDD16"} Markdown:</span>
                  <span style={{ color: "#8be9fd" }}>report.md</span>
                  <span
                    style={{
                      color: COLORS.textMuted,
                      fontStyle: "italic",
                      opacity: annotation2Opacity,
                    }}
                  >
                    {"\u2190"} For AI to fix
                  </span>
                </div>
              </div>
            )}
          </TerminalChrome>
        </div>
      )}

      {/* ── Visual Callback: "FOUND THIS" screenshot (frames 751-825) ── */}
      {callbackVisible && (
        <div
          style={{
            position: "absolute",
            right: 80,
            top: "50%",
            transform: `translateY(-50%) translateX(${callbackTranslateX}px)`,
            opacity: callbackOpacity * callbackFadeOut,
            zIndex: 30,
          }}
        >
          {/* Container for the mini screenshot + annotations */}
          <div style={{ position: "relative", width: 600, height: 400 }}>
            {/* "FOUND THIS" label */}
            <div
              style={{
                position: "absolute",
                top: -44,
                left: 200,
                background: COLORS.danger,
                color: "#fff",
                padding: "8px 16px",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 16,
                fontFamily: "Inter, sans-serif",
                transform: `scale(${foundThisPulse || 1})`,
                zIndex: 5,
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
              }}
            >
              FOUND THIS {"\u26A0\uFE0F"}
            </div>

            {/* Mini screenshot of FlowSync */}
            <div
              style={{
                width: 600,
                height: 400,
                borderRadius: 8,
                overflow: "hidden",
                border: `2px solid ${COLORS.danger}`,
                boxShadow: `0 0 40px rgba(239, 68, 68, 0.3)`,
                position: "relative",
              }}
            >
              {/* Render FlowSyncLandingPage scaled down */}
              <div
                style={{
                  width: 1400,
                  height: 930,
                  transform: "scale(0.43)",
                  transformOrigin: "top left",
                  overflow: "hidden",
                }}
              >
                <FlowSyncLandingPage />
              </div>

              {/* Red circle highlight around "Get Started" button area */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 14,
                  width: 70,
                  height: 28,
                  borderRadius: 14,
                  border: `2px solid ${COLORS.danger}`,
                  boxShadow: `0 0 ${12 + highlightPulse * 20}px rgba(239, 68, 68, ${0.4 + highlightPulse})`,
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* Connector line from terminal to screenshot */}
            <svg
              width="100"
              height="200"
              style={{
                position: "absolute",
                left: -100,
                top: 0,
                overflow: "visible",
                pointerEvents: "none",
              }}
            >
              <line
                x1="0"
                y1="100"
                x2="100"
                y2="20"
                stroke={COLORS.danger}
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity={interpolate(
                  callbackEntrance,
                  [0.3, 1],
                  [0, 0.7],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                )}
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
