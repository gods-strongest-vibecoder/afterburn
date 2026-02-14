// Fake SaaS landing page for FlowSync — static layout, animation handled by parent scene
import React from "react";

type FlowSyncLandingPageProps = {
  isHovered?: boolean;
  isPressed?: boolean;
};

const FEATURE_CARDS = [
  { emoji: "⚡", gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)", title: "Real-time Sync", desc: "Instant updates across all your devices and team members." },
  { emoji: "👥", gradient: "linear-gradient(135deg, #10b981, #34d399)", title: "Team Workflows", desc: "Collaborate seamlessly with built-in approval flows." },
  { emoji: "🚀", gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)", title: "One-Click Deploy", desc: "Ship to production in seconds, not hours." },
];

export const FlowSyncLandingPage: React.FC<FlowSyncLandingPageProps> = ({
  isHovered = false,
  isPressed = false,
}) => {
  return (
    <div style={{ width: "100%", height: "100%", background: "#ffffff", overflow: "hidden" }}>
      {/* Section A: Navigation Bar */}
      <div
        style={{
          height: 64,
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
        }}
      >
        {/* Left: Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            }}
          />
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            FlowSync
          </span>
        </div>

        {/* Center: Nav links */}
        <div style={{ display: "flex", gap: 32 }}>
          {["Features", "Pricing", "Docs"].map((link) => (
            <span
              key={link}
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 15,
                color: "#475569",
              }}
            >
              {link}
            </span>
          ))}
        </div>

        {/* Right: Get Started button — primary click target */}
        <div
          style={{
            background: isPressed ? "#4f46e5" : isHovered ? "#4f46e5" : "#6366f1",
            color: "white",
            padding: "10px 24px",
            borderRadius: 8,
            fontFamily: "Inter, sans-serif",
            fontSize: 15,
            fontWeight: 600,
            transform: isPressed ? "scale(0.97)" : "none",
            boxShadow: isHovered ? "0 4px 12px rgba(99, 102, 241, 0.4)" : "none",
          }}
        >
          Get Started
        </div>
      </div>

      {/* Section B: Hero */}
      <div
        style={{
          height: 400,
          background: "radial-gradient(ellipse at top, #f0f4ff 0%, #ffffff 60%)",
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: "0 40px",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            color: "#6366f1",
            fontWeight: 600,
            letterSpacing: 1.5,
          }}
        >
          INTRODUCING FLOWSYNC
        </div>

        {/* Headline */}
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 56,
            fontWeight: 900,
            color: "#0f172a",
            lineHeight: 1.1,
            textAlign: "center" as const,
          }}
        >
          Ship faster with{" "}
          <span
            style={{
              backgroundImage: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            FlowSync
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 20,
            color: "#64748b",
            textAlign: "center" as const,
            maxWidth: 540,
            lineHeight: 1.5,
          }}
        >
          The all-in-one platform for modern teams. Collaborate, deploy, and scale
          with confidence.
        </div>

        {/* CTA Buttons */}
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <div
            style={{
              background: "#6366f1",
              color: "white",
              padding: "14px 32px",
              borderRadius: 8,
              fontFamily: "Inter, sans-serif",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Start Free Trial
          </div>
          <div
            style={{
              border: "2px solid #e2e8f0",
              color: "#475569",
              padding: "14px 32px",
              borderRadius: 8,
              fontFamily: "Inter, sans-serif",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Watch Demo
          </div>
        </div>
      </div>

      {/* Section C: Feature Cards */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 24,
          padding: "40px 60px 0",
          background: "#ffffff",
        }}
      >
        {FEATURE_CARDS.map((card) => (
          <div
            key={card.title}
            style={{
              flex: 1,
              maxWidth: 340,
              background: "#f8fafc",
              borderRadius: 12,
              padding: "32px 24px",
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "center",
              textAlign: "center" as const,
              gap: 12,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: card.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              {card.emoji}
            </div>
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              {card.title}
            </div>
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              {card.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
