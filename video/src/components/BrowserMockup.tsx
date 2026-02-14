// Fake browser window showing the FlowSync startup landing page (pure CSS)
import React from "react";

type BrowserMockupProps = {
  style?: React.CSSProperties;
};

export const BrowserMockup: React.FC<BrowserMockupProps> = ({ style = {} }) => {
  return (
    <div style={{
      width: 1400,
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      ...style,
    }}>
      {/* Browser Chrome */}
      <div style={{
        background: '#1e293b',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
        </div>
        {/* URL bar */}
        <div style={{
          flex: 1,
          background: '#0f172a',
          borderRadius: 6,
          padding: '6px 16px',
          color: '#94a3b8',
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
        }}>
          flowsync.dev
        </div>
      </div>

      {/* Website Content */}
      <div style={{
        background: '#ffffff',
        padding: '60px 80px',
        minHeight: 600,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: 40,
      }}>
        {/* Hero */}
        <div style={{ textAlign: 'center' as const }}>
          <div style={{
            fontSize: 14,
            color: '#6366f1',
            fontWeight: 600,
            marginBottom: 12,
            fontFamily: 'Inter, sans-serif',
          }}>
            INTRODUCING FLOWSYNC
          </div>
          <h1 style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.1,
            margin: 0,
            fontFamily: 'Inter, sans-serif',
          }}>
            Ship faster with
            <br />
            <span style={{ color: '#6366f1' }}>FlowSync</span>
          </h1>
          <p style={{
            fontSize: 20,
            color: '#64748b',
            marginTop: 20,
            maxWidth: 500,
            fontFamily: 'Inter, sans-serif',
          }}>
            The all-in-one platform for modern teams.
            Collaborate, deploy, and scale with confidence.
          </p>
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{
            background: '#6366f1',
            color: 'white',
            padding: '14px 32px',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
          }}>
            Get Started Free
          </div>
          <div style={{
            border: '2px solid #e2e8f0',
            color: '#475569',
            padding: '14px 32px',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
          }}>
            Watch Demo
          </div>
        </div>

        {/* Spacer */}
        <div style={{ height: 40 }} />

        {/* Newsletter Section */}
        <div style={{
          background: '#f8fafc',
          padding: '30px 40px',
          borderRadius: 12,
          textAlign: 'center' as const,
          width: '100%',
          maxWidth: 600,
        }}>
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: 8,
            fontFamily: 'Inter, sans-serif',
          }}>
            Stay in the loop
          </div>
          <div style={{
            fontSize: 14,
            color: '#64748b',
            marginBottom: 16,
            fontFamily: 'Inter, sans-serif',
          }}>
            Get product updates delivered to your inbox
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <div style={{
              border: '1px solid #e2e8f0',
              padding: '10px 16px',
              borderRadius: 6,
              width: 250,
              color: '#94a3b8',
              fontSize: 14,
              fontFamily: 'Inter, sans-serif',
              textAlign: 'left' as const,
            }}>
              your@email.com
            </div>
            <div style={{
              background: '#6366f1',
              color: 'white',
              padding: '10px 24px',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
            }}>
              Subscribe
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
