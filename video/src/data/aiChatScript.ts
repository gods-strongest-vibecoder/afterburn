// AI chat animation script data - user message, Claude response, and code patches
export const userMessage = `# Afterburn Analysis Report\n\n**Health Score:** 62/100\n\n## High Priority Issues\n\n1. "Get Started" button (nav) — onClick handler undefined\n   - Location: /index.html line 47\n   - Expected: Navigate to /signup\n   - Actual: Nothing happens\n...`;

export const claudeResponse = `I'll help fix these issues. I found:\n\n1. Dead button: Missing onClick handler\n   • Location: src/components/Button.tsx:47\n   • Fix: Add handleClick function\n\n2. Broken form: Invalid endpoint\n   • Location: src/components/Newsletter.tsx:23\n   • Fix: Update API URL\n\nLet me generate the patches...`;

export const codePatches = [
  {
    file: "src/components/Button.tsx",
    deletions: ['<button className="cta">'],
    additions: ['<button className="cta" onClick={handleGetStarted}>', '', 'function handleGetStarted() {', "  window.location.href = '/signup';", '}'],
  },
  {
    file: "src/components/Newsletter.tsx",
    deletions: ["const API_URL = 'https://api.old-domain.com/subscribe';"],
    additions: ["const API_URL = 'https://api.flowsync.dev/subscribe';"],
  },
  {
    file: "public/index.html",
    deletions: ['<img src="hero.jpg">'],
    additions: ['<img src="hero.jpg" alt="FlowSync dashboard interface">'],
  },
];
