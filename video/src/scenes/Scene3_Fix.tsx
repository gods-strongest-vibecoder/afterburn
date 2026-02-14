// Scene 3: The Future — Split screen with Claude Desktop, code fixes, re-scan, and ending
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { FRAME_MAP, COLORS, DEMO_DATA } from "../constants";
import { DarkGradientBackground } from "../components/DarkGradientBackground";
import { ClaudeDesktopMockup } from "../components/ClaudeDesktopMockup";
import { EndingSequence } from "../components/EndingSequence";
import { codePatches } from "../data/aiChatScript";

// Inline terminal panel — avoids TerminalWindow's spring entrance issues
const TerminalPanel: React.FC<{ width: number; children: React.ReactNode }> = ({ width, children }) => (
  <div style={{
    width,
    height: 700,
    background: '#0d1117',
    borderRadius: 12,
    border: '1px solid #30363d',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 16,
    color: '#c9d1d9',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  }}>
    {/* Title bar */}
    <div style={{
      padding: '10px 16px',
      background: '#161b22',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
      <span style={{ color: '#8b949e', fontSize: 13, marginLeft: 8 }}>afterburn</span>
    </div>
    {/* Body */}
    <div style={{ padding: 24, flex: 1, overflow: 'hidden' }}>
      {children}
    </div>
  </div>
);

// Ctrl+V flash overlay
const PasteOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  const localFrame = frame - (FRAME_MAP.scene3_paste_report + 1);
  if (localFrame < 0 || localFrame > 5) return null;

  const opacity = interpolate(localFrame, [0, 2, 5], [0.8, 0.5, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `rgba(99, 102, 241, ${opacity * 0.15})`,
      zIndex: 10,
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.7)',
        padding: '12px 28px',
        borderRadius: 10,
        border: '1px solid rgba(99, 102, 241, 0.5)',
        opacity,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 20,
        color: '#f8fafc',
      }}>
        Ctrl + V
      </div>
    </div>
  );
};

// Code patch display with syntax coloring
const CodePatch: React.FC<{
  patch: typeof codePatches[0];
  opacity: number;
  translateY: number;
}> = ({ patch, opacity, translateY }) => (
  <div style={{
    opacity,
    transform: `translateY(${translateY}px)`,
    marginBottom: 16,
    background: 'rgba(22, 27, 34, 0.6)',
    borderRadius: 8,
    padding: '10px 14px',
    border: '1px solid #30363d',
  }}>
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12,
      color: COLORS.textMuted,
      marginBottom: 6,
    }}>
      {patch.file}
    </div>
    {patch.deletions.map((line, i) => (
      <div key={`d-${i}`} style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14,
        color: '#ff5555',
        lineHeight: 1.6,
      }}>
        - {line}
      </div>
    ))}
    {patch.additions.map((line, i) => (
      <div key={`a-${i}`} style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14,
        color: '#50fa7b',
        lineHeight: 1.6,
      }}>
        {line ? `+ ${line}` : ''}
      </div>
    ))}
  </div>
);

// Re-scan progress line
const ScanLine: React.FC<{ label: string; done: boolean; active: boolean }> = ({ label, done, active }) => (
  <div style={{
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 15,
    lineHeight: 1.8,
    color: done ? COLORS.success : active ? '#c9d1d9' : '#484f58',
  }}>
    {done ? '\u2714' : active ? '\u25CB' : ' '} {label}
  </div>
);

export const Scene3_Fix: React.FC = () => {
  const frame = useCurrentFrame();

  // === Layout animations ===

  // Terminal width: 1200 -> 800 during split setup (870-900)
  const terminalWidth = interpolate(
    frame,
    [FRAME_MAP.scene3_claude_split, FRAME_MAP.scene3_paste_report],
    [1200, 800],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Terminal X position: centered -> left
  const terminalX = interpolate(
    frame,
    [FRAME_MAP.scene3_claude_split, FRAME_MAP.scene3_paste_report],
    [960 - 600, 60],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Claude panel slides in from right
  const claudeX = interpolate(
    frame,
    [FRAME_MAP.scene3_claude_split, FRAME_MAP.scene3_paste_report],
    [1920, 960],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Claude panel fade out before re-scan
  const claudeOpacity = frame >= FRAME_MAP.scene3_rescan_start
    ? interpolate(frame, [FRAME_MAP.scene3_rescan_start, FRAME_MAP.scene3_rescan_start + 15], [1, 0], { extrapolateRight: 'clamp' })
    : 1;

  // Terminal expands back for re-scan
  const rescanTerminalWidth = frame >= FRAME_MAP.scene3_rescan_start
    ? interpolate(frame, [FRAME_MAP.scene3_rescan_start, FRAME_MAP.scene3_rescan_start + 15], [800, 1200], { extrapolateRight: 'clamp' })
    : terminalWidth;

  const rescanTerminalX = frame >= FRAME_MAP.scene3_rescan_start
    ? interpolate(frame, [FRAME_MAP.scene3_rescan_start, FRAME_MAP.scene3_rescan_start + 15], [60, 960 - 600], { extrapolateRight: 'clamp' })
    : terminalX;

  const finalTerminalWidth = frame >= FRAME_MAP.scene3_rescan_start ? rescanTerminalWidth : terminalWidth;
  const finalTerminalX = frame >= FRAME_MAP.scene3_rescan_start ? rescanTerminalX : terminalX;

  // === Claude mockup state ===
  const showUserMessage = frame >= 925;
  const showTypingIndicator = frame >= 930 && frame < FRAME_MAP.scene3_claude_responds;
  const showClaudeResponse = frame >= FRAME_MAP.scene3_claude_responds;

  const claudeResponseProgress = frame >= FRAME_MAP.scene3_claude_responds
    ? interpolate(
        frame,
        [FRAME_MAP.scene3_claude_responds, FRAME_MAP.scene3_code_fixes],
        [0, 1],
        { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' },
      )
    : 0;

  const inputText = frame >= 906 && frame < 920 ? '# Afterburn Analysis Report...' : undefined;

  // === Code patches in Claude area ===
  const patchOpacities = codePatches.map((_, i) => {
    const patchStart = FRAME_MAP.scene3_code_fixes + i * 30;
    return {
      opacity: interpolate(frame, [patchStart, patchStart + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      translateY: interpolate(frame, [patchStart, patchStart + 20], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    };
  });

  // === Re-scan progress (fast) ===
  const rescanSteps = [
    { label: 'Crawling pages...', startOffset: 0 },
    { label: 'Testing workflows...', startOffset: 12 },
    { label: 'Running audits...', startOffset: 24 },
    { label: 'Generating report...', startOffset: 36 },
    { label: 'Done!', startOffset: 48 },
  ];

  // === Score reveal ===
  const showScore = frame >= FRAME_MAP.scene3_score_reveal && frame < FRAME_MAP.scene3_ending_start;
  const scoreProgress = interpolate(
    frame,
    [FRAME_MAP.scene3_score_reveal, FRAME_MAP.scene3_score_reveal + 40],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const displayScore = Math.round(DEMO_DATA.healthScoreBefore + (DEMO_DATA.healthScoreAfter - DEMO_DATA.healthScoreBefore) * scoreProgress);
  const scoreColor = displayScore < 70 ? COLORS.warning : COLORS.success;

  // Score section fade-out into ending
  const scoreFadeOut = frame >= FRAME_MAP.scene3_ending_start - 10
    ? interpolate(frame, [FRAME_MAP.scene3_ending_start - 10, FRAME_MAP.scene3_ending_start], [1, 0], { extrapolateRight: 'clamp' })
    : 1;

  // Terminal fade out before score reveal
  const terminalFadeOut = frame >= FRAME_MAP.scene3_score_reveal - 15
    ? interpolate(frame, [FRAME_MAP.scene3_score_reveal - 15, FRAME_MAP.scene3_score_reveal], [1, 0], { extrapolateRight: 'clamp' })
    : 1;

  // === Ending ===
  const showEnding = frame >= FRAME_MAP.scene3_ending_start;

  // Which re-scan phase are we in?
  const isRescanPhase = frame >= FRAME_MAP.scene3_rescan_start + 15 && frame < FRAME_MAP.scene3_score_reveal;
  const isSplitPhase = frame >= FRAME_MAP.scene3_claude_split && frame < FRAME_MAP.scene3_rescan_start;

  // Terminal content for initial scan context
  const terminalHasContent = frame >= FRAME_MAP.scene3_claude_split;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <DarkGradientBackground />

      {/* Paste overlay */}
      <PasteOverlay frame={frame} />

      {/* Terminal panel */}
      {terminalHasContent && frame < FRAME_MAP.scene3_score_reveal && (
        <div style={{
          position: 'absolute',
          left: finalTerminalX,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: terminalFadeOut,
        }}>
          <TerminalPanel width={finalTerminalWidth}>
            {/* Initial scan results visible during split */}
            {isSplitPhase && (
              <div>
                <div style={{ color: COLORS.success, marginBottom: 8 }}>$ npx afterburn-cli https://flowsync.dev</div>
                <div style={{ color: '#c9d1d9', marginBottom: 4 }}>{'\u2714'} Crawled 12 pages</div>
                <div style={{ color: '#c9d1d9', marginBottom: 4 }}>{'\u2714'} Tested 5 workflows</div>
                <div style={{ color: '#c9d1d9', marginBottom: 4 }}>{'\u2714'} Ran accessibility audits</div>
                <div style={{ color: COLORS.warning, marginTop: 12, fontSize: 18, fontWeight: 700 }}>
                  Health Score: {DEMO_DATA.healthScoreBefore}/100
                </div>
                <div style={{ color: COLORS.danger, marginTop: 8 }}>{DEMO_DATA.highIssues} high-priority issues found</div>
                <div style={{ color: '#c9d1d9', marginTop: 4 }}>{DEMO_DATA.totalIssues} total issues</div>
                <div style={{ color: COLORS.textMuted, marginTop: 16, fontSize: 14 }}>
                  Reports saved to ./afterburn-report/
                </div>
                <div style={{ color: COLORS.primary, marginTop: 4, fontSize: 14 }}>
                  {'\u2192'} Open report.md and paste into Claude {'\u2190'}
                </div>
              </div>
            )}

            {/* Re-scan progress */}
            {isRescanPhase && (
              <div>
                <div style={{ color: COLORS.success, marginBottom: 12 }}>$ npx afterburn-cli https://flowsync.dev --rescan</div>
                {rescanSteps.map((step, i) => {
                  const stepFrame = FRAME_MAP.scene3_rescan_start + 15 + step.startOffset;
                  const isDone = frame >= stepFrame + 12;
                  const isActive = frame >= stepFrame && !isDone;
                  return frame >= stepFrame ? (
                    <ScanLine key={i} label={step.label} done={isDone} active={isActive} />
                  ) : null;
                })}
              </div>
            )}
          </TerminalPanel>
        </div>
      )}

      {/* Claude Desktop panel */}
      {isSplitPhase && (
        <div style={{
          position: 'absolute',
          left: claudeX,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: claudeOpacity,
        }}>
          <ClaudeDesktopMockup
            frame={frame}
            showUserMessage={showUserMessage}
            showClaudeResponse={showClaudeResponse}
            claudeResponseProgress={claudeResponseProgress}
            showTypingIndicator={showTypingIndicator}
            inputText={inputText}
          />

          {/* Code patches overlay inside Claude area */}
          {frame >= FRAME_MAP.scene3_code_fixes && frame < FRAME_MAP.scene3_rescan_start && (
            <div style={{
              position: 'absolute',
              bottom: 90,
              left: 270,
              width: 580,
              maxHeight: 300,
              overflow: 'hidden',
            }}>
              {codePatches.map((patch, i) => (
                <CodePatch
                  key={i}
                  patch={patch}
                  opacity={patchOpacities[i].opacity}
                  translateY={patchOpacities[i].translateY}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Score Reveal */}
      {showScore && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: scoreFadeOut,
        }}>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 24,
            color: COLORS.textMuted,
            letterSpacing: 3,
            marginBottom: 16,
          }}>
            HEALTH SCORE
          </div>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 160,
            fontWeight: 900,
            lineHeight: 1,
            color: scoreColor,
            textShadow: displayScore >= 70 ? '0 0 40px rgba(16, 185, 129, 0.4)' : 'none',
          }}>
            {displayScore}
          </div>
          {displayScore >= 90 && (
            <div style={{
              marginTop: 20,
              fontSize: 48,
              color: COLORS.success,
              opacity: interpolate(
                frame,
                [FRAME_MAP.scene3_score_reveal + 35, FRAME_MAP.scene3_score_reveal + 45],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
              ),
            }}>
              {'\u2714'}
            </div>
          )}
        </div>
      )}

      {/* Ending Sequence */}
      {showEnding && <EndingSequence frame={frame} />}
    </div>
  );
};
