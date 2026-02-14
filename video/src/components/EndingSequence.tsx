// Three-part ending: Score Split -> Particle Burst -> Logo Reveal
import React from "react";
import { interpolate } from "remotion";
import { FRAME_MAP, COLORS } from "../constants";
import { seededRandom } from "../utils/helpers";

type EndingSequenceProps = {
  frame: number;
};

export const EndingSequence: React.FC<EndingSequenceProps> = ({ frame }) => {
  const showScoreSplit = frame >= FRAME_MAP.scene3_score_celebration;
  const showParticles = frame >= FRAME_MAP.scene3_particle_burst;
  const showLogo = frame >= FRAME_MAP.scene3_logo_reveal;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Part 1: Score Split Screen */}
      {showScoreSplit && !showLogo && <ScoreSplit frame={frame} />}

      {/* Part 2: Particle Burst */}
      {showParticles && !showLogo && <ParticleBurstEnding frame={frame} />}

      {/* Part 3: Logo Reveal */}
      {showLogo && <LogoReveal frame={frame} />}
    </div>
  );
};

const ScoreSplit: React.FC<{ frame: number }> = ({ frame }) => {
  const entryProgress = interpolate(
    frame,
    [FRAME_MAP.scene3_score_celebration, FRAME_MAP.scene3_score_celebration + 15],
    [0, 1],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' },
  );

  const shakeX = Math.sin((frame - FRAME_MAP.scene3_score_celebration) * 0.5) * 3;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: entryProgress,
    }}>
      {/* Before side */}
      <div style={{
        position: 'absolute',
        left: '20%',
        transform: `translate(-50%, 0) translateX(${shakeX}px)`,
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 24,
          color: COLORS.textMuted,
          letterSpacing: 3,
          marginBottom: 16,
        }}>
          BEFORE
        </div>
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 140,
          fontWeight: 900,
          lineHeight: 1,
          background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          62
        </div>
      </div>

      {/* Center divider */}
      <div style={{
        width: 3,
        height: 600,
        background: 'linear-gradient(180deg, #ef4444 0%, #10b981 100%)',
        borderRadius: 2,
        opacity: entryProgress,
      }} />

      {/* After side */}
      <div style={{
        position: 'absolute',
        left: '80%',
        transform: 'translate(-50%, 0)',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 24,
          color: COLORS.textMuted,
          letterSpacing: 3,
          marginBottom: 16,
        }}>
          AFTER
        </div>
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 140,
          fontWeight: 900,
          lineHeight: 1,
          color: COLORS.success,
          textShadow: '0 0 60px rgba(16, 185, 129, 0.6)',
        }}>
          92
        </div>
      </div>
    </div>
  );
};

const ParticleBurstEnding: React.FC<{ frame: number }> = ({ frame }) => {
  const localFrame = frame - FRAME_MAP.scene3_particle_burst;
  if (localFrame < 0 || localFrame > 30) return null;

  const particleCount = 80;
  const colors = ['#6366f1', '#10b981', '#8b5cf6'];

  const particles = Array.from({ length: particleCount }, (_, i) => {
    const angle = seededRandom(i * 7) * Math.PI * 2;
    const velocity = 10 + seededRandom(i * 13 + 100) * 8;
    const size = 4 + seededRandom(i * 17 + 200) * 4;
    const colorIndex = seededRandom(i * 23 + 300) < 0.4 ? 0 : seededRandom(i * 23 + 300) < 0.7 ? 1 : 2;
    const color = colors[colorIndex];

    const px = 960 + Math.cos(angle) * velocity * localFrame;
    const py = 540 + Math.sin(angle) * velocity * localFrame;
    const opacity = interpolate(localFrame, [0, 20, 30], [1, 0.8, 0], { extrapolateRight: 'clamp' });

    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: px - size / 2,
          top: py - size / 2,
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: color,
          opacity,
        }}
      />
    );
  });

  return <>{particles}</>;
};

const LogoReveal: React.FC<{ frame: number }> = ({ frame }) => {
  const entryOpacity = interpolate(
    frame,
    [FRAME_MAP.scene3_logo_reveal, FRAME_MAP.scene3_logo_reveal + 10],
    [0, 1],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' },
  );

  const bgPosition = interpolate(
    frame,
    [FRAME_MAP.scene3_logo_reveal, FRAME_MAP.scene3_end],
    [0, 100],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' },
  );

  const taglineOpacity = interpolate(
    frame,
    [1325, 1335],
    [0, 1],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' },
  );

  const commandSlide = interpolate(
    frame,
    [1330, 1340],
    [30, 0],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' },
  );

  const commandOpacity = interpolate(
    frame,
    [1330, 1340],
    [0, 1],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' },
  );

  const pillsOpacity = interpolate(
    frame,
    [1335, 1345],
    [0, 1],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' },
  );

  const githubOpacity = interpolate(
    frame,
    [1340, 1350],
    [0, 1],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' },
  );

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      opacity: entryOpacity,
    }}>
      {/* Glow behind text */}
      <div style={{
        position: 'absolute',
        width: 800,
        height: 400,
        background: 'radial-gradient(ellipse, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
        filter: 'blur(60px)',
      }} />

      {/* AFTERBURN wordmark */}
      <div style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 96,
        fontWeight: 900,
        letterSpacing: 6,
        background: 'linear-gradient(90deg, #6366f1 0%, #10b981 50%, #f8fafc 100%)',
        backgroundSize: '200% 100%',
        backgroundPosition: `${bgPosition}% 50%`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        position: 'relative',
        zIndex: 1,
      }}>
        AFTERBURN
      </div>

      {/* Tagline */}
      <div style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 28,
        color: COLORS.textMuted,
        opacity: taglineOpacity,
        position: 'relative',
        zIndex: 1,
      }}>
        Stop shipping bugs. Start shipping confidence.
      </div>

      {/* Command box */}
      <div style={{
        opacity: commandOpacity,
        transform: `translateY(${commandSlide}px)`,
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          background: '#0d1117',
          padding: '16px 40px',
          borderRadius: 12,
          border: '1px solid rgba(99, 102, 241, 0.4)',
          boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)',
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 18,
            color: COLORS.textMuted,
          }}>
            {'$ '}
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 18,
            color: '#8be9fd',
          }}>
            npx afterburn-cli https://your-site.com
          </span>
        </div>
      </div>

      {/* Interface pills */}
      <div style={{
        display: 'flex',
        gap: 16,
        opacity: pillsOpacity,
        position: 'relative',
        zIndex: 1,
      }}>
        {['CLI', 'MCP Server', 'GitHub Action'].map((label, i) => {
          const pillDelay = interpolate(
            frame,
            [1335 + i * 3, 1340 + i * 3],
            [0, 1],
            { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' },
          );
          return (
            <div key={label} style={{
              padding: '8px 20px',
              borderRadius: 24,
              border: `1px solid ${COLORS.textMuted}44`,
              fontFamily: 'Inter, sans-serif',
              fontSize: 15,
              color: COLORS.textMuted,
              opacity: pillDelay,
            }}>
              {label}
            </div>
          );
        })}
      </div>

      {/* GitHub URL */}
      <div style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 16,
        color: COLORS.primary,
        opacity: githubOpacity,
        position: 'relative',
        zIndex: 1,
      }}>
        github.com/gods-strongest-vibecoder/afterburn
      </div>
    </div>
  );
};
