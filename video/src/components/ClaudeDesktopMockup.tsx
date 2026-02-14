// Claude Desktop mockup with warm palette, Georgia serif, labeled messages (not bubbles)
import React from "react";
import { interpolate } from "remotion";
import { COLORS } from "../constants";

type ClaudeDesktopMockupProps = {
  frame: number;
  showUserMessage?: boolean;
  showClaudeResponse?: boolean;
  claudeResponseProgress?: number;
  showTypingIndicator?: boolean;
  inputText?: string;
};

const TypingIndicator: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '8px 0' }}>
      {[0, 1, 2].map((i) => {
        const opacity = interpolate(
          Math.sin((frame * 0.15) + i * 1.2),
          [-1, 1],
          [0.3, 1],
        );
        return (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: COLORS.claudeAccentOrange,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
};

export const ClaudeDesktopMockup: React.FC<ClaudeDesktopMockupProps> = ({
  frame,
  showUserMessage = false,
  showClaudeResponse = false,
  claudeResponseProgress = 0,
  showTypingIndicator = false,
  inputText,
}) => {
  const blurredChats = [
    { title: 'Fix deployment pipeline', time: '2h ago' },
    { title: 'Refactor auth module', time: '5h ago' },
    { title: 'Debug CSS layout issue', time: '1d ago' },
  ];

  return (
    <div style={{
      width: 900,
      height: 700,
      borderRadius: 12,
      overflow: 'hidden',
      display: 'flex',
      boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
      border: `1px solid ${COLORS.claudeBorderSubtle}`,
    }}>
      {/* Sidebar */}
      <div style={{
        width: 240,
        height: '100%',
        backgroundColor: COLORS.claudeBgSecondary,
        borderRight: `1px solid ${COLORS.claudeBorderSubtle}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 12px',
      }}>
        {/* New chat button */}
        <div style={{
          padding: '10px 16px',
          borderRadius: 8,
          border: `1px solid ${COLORS.claudeBorderSubtle}`,
          color: COLORS.claudeTextSecondary,
          fontFamily: 'Georgia, serif',
          fontSize: 14,
          marginBottom: 20,
          textAlign: 'center',
        }}>
          + New chat
        </div>

        {/* Blurred conversation items */}
        {blurredChats.map((chat, i) => (
          <div key={i} style={{
            padding: '10px 12px',
            marginBottom: 4,
            borderRadius: 6,
            filter: 'blur(2px)',
            opacity: 0.5,
          }}>
            <div style={{
              fontFamily: 'Georgia, serif',
              fontSize: 13,
              color: COLORS.claudeTextSecondary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {chat.title}
            </div>
            <div style={{
              fontFamily: 'Georgia, serif',
              fontSize: 11,
              color: COLORS.claudeTextSecondary,
              opacity: 0.6,
              marginTop: 2,
            }}>
              {chat.time}
            </div>
          </div>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Model selector */}
        <div style={{
          padding: '8px 12px',
          borderRadius: 6,
          backgroundColor: 'rgba(255,255,255,0.03)',
          fontFamily: 'Georgia, serif',
          fontSize: 13,
          color: COLORS.claudeTextSecondary,
          textAlign: 'center',
        }}>
          Claude 4.5 Sonnet
        </div>
      </div>

      {/* Chat Area */}
      <div style={{
        flex: 1,
        backgroundColor: COLORS.claudeBgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: `1px solid ${COLORS.claudeBorderSubtle}`,
          fontFamily: 'Georgia, serif',
          fontSize: 14,
          color: COLORS.claudeTextSecondary,
        }}>
          Claude &bull; New Conversation
        </div>

        {/* Messages container */}
        <div style={{
          flex: 1,
          padding: '24px 30px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ width: '100%', maxWidth: 600 }}>
            {/* User message */}
            {showUserMessage && (
              <div style={{ marginBottom: 28 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 6,
                }}>
                  <span style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: 14,
                    color: COLORS.claudeTextSecondary,
                    fontWeight: 600,
                  }}>
                    You
                  </span>
                  <span style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: 12,
                    color: COLORS.claudeTextSecondary,
                    opacity: 0.6,
                  }}>
                    just now
                  </span>
                </div>
                <div style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 15,
                  color: COLORS.claudeTextPrimary,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  # Afterburn Analysis Report{'\n\n'}
                  <span style={{ fontWeight: 700 }}>Health Score:</span> 62/100{'\n\n'}
                  <span style={{ color: COLORS.claudeAccentOrange }}>High Priority Issues:</span>{'\n'}
                  1. "Get Started" button — onClick undefined{'\n'}
                  2. Newsletter form — invalid API endpoint{'\n'}
                  3. Hero image — missing alt text
                </div>
              </div>
            )}

            {/* Claude response */}
            {showClaudeResponse && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 6,
                }}>
                  <span style={{
                    color: COLORS.claudeAccentOrange,
                    fontSize: 16,
                  }}>
                    &#10022;
                  </span>
                  <span style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: 14,
                    color: COLORS.claudeTextSecondary,
                    fontWeight: 600,
                  }}>
                    Claude
                  </span>
                </div>
                <ClaudeResponseText progress={claudeResponseProgress} />
              </div>
            )}

            {/* Typing indicator */}
            {showTypingIndicator && !showClaudeResponse && (
              <div style={{ marginTop: 8 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 6,
                }}>
                  <span style={{ color: COLORS.claudeAccentOrange, fontSize: 16 }}>&#10022;</span>
                  <span style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: 14,
                    color: COLORS.claudeTextSecondary,
                    fontWeight: 600,
                  }}>
                    Claude
                  </span>
                </div>
                <TypingIndicator frame={frame} />
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div style={{
          height: 80,
          padding: '12px 20px',
          borderTop: `1px solid ${COLORS.claudeBorderSubtle}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            flex: 1,
            backgroundColor: COLORS.claudeBgSecondary,
            border: `1px solid ${COLORS.claudeBorderSubtle}`,
            borderRadius: 12,
            padding: '12px 16px',
            fontFamily: 'Georgia, serif',
            fontSize: 16,
            color: inputText ? COLORS.claudeTextPrimary : COLORS.claudeTextSecondary,
            opacity: inputText ? 1 : 0.5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {inputText || 'Message Claude...'}
          </div>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: inputText ? COLORS.claudeAccentOrange : COLORS.claudeBorderSubtle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 18,
            fontWeight: 700,
          }}>
            &#8593;
          </div>
        </div>
      </div>
    </div>
  );
};

const ClaudeResponseText: React.FC<{ progress: number }> = ({ progress }) => {
  const fullText = `I'll help fix these issues. Here's what I found:\n\n1. Dead button: Missing onClick handler\n   Location: src/components/Button.tsx:47\n   Fix: Add navigation handler\n\n2. Broken form: Invalid API endpoint\n   Location: src/components/Newsletter.tsx:23\n   Fix: Update URL to production\n\n3. Missing alt text on hero image\n   Fix: Add descriptive alt attribute\n\nLet me generate the patches...`;

  const visibleLength = Math.floor(fullText.length * Math.min(progress, 1));
  const visibleText = fullText.slice(0, visibleLength);

  return (
    <div style={{
      fontFamily: 'Georgia, serif',
      fontSize: 15,
      color: COLORS.claudeTextPrimary,
      lineHeight: 1.6,
      whiteSpace: 'pre-wrap',
    }}>
      {visibleText}
      {progress < 1 && (
        <span style={{
          display: 'inline-block',
          width: 2,
          height: 18,
          backgroundColor: COLORS.claudeAccentOrange,
          marginLeft: 2,
          verticalAlign: 'text-bottom',
        }} />
      )}
    </div>
  );
};
