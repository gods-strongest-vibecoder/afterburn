// Shared constants for timing, colors, springs, and demo data
export const FRAME_MAP = {
  // Scene 1: The Pain (0-240 frames, 0-8s)
  scene1_start: 0,
  scene1_website_idle: 0,
  scene1_first_click: 90,
  scene1_click_happens: 150,
  scene1_error_reveal: 180,
  scene1_end: 240,

  // Transition 1 (240-270 frames, 8-9s)
  transition1_start: 240,
  transition1_end: 270,

  // Scene 2: The Magic (270-840 frames, 9-28s)
  scene2_start: 270,
  scene2_command_visible: 270,
  scene2_execution_start: 300,
  scene2_scan_progress: 300,
  scene2_results_reveal: 600,
  scene2_top_issues: 690,
  scene2_visual_callback: 750,
  scene2_dual_reports: 810,
  scene2_end: 840,

  // Transition 2 (840-870 frames, 28-29s)
  transition2_start: 840,
  transition2_end: 870,

  // Scene 3: The Future (870-1350 frames, 29-45s)
  scene3_start: 870,
  scene3_claude_split: 870,
  scene3_paste_report: 900,
  scene3_claude_responds: 960,
  scene3_code_fixes: 1020,
  scene3_rescan_start: 1140,
  scene3_score_reveal: 1200,
  scene3_ending_start: 1260,
  scene3_score_celebration: 1260,
  scene3_particle_burst: 1290,
  scene3_logo_reveal: 1320,
  scene3_end: 1350,

  total: 1350,
};

export const COLORS = {
  background: '#0f172a',
  backgroundAlt: '#1e293b',
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  terminal: '#0d1117',
  terminalText: '#c9d1d9',

  // Claude Desktop warm palette
  claudeBgPrimary: '#1a1918',
  claudeBgSecondary: '#252321',
  claudeTextPrimary: '#f4f3ee',
  claudeTextSecondary: '#b1ada1',
  claudeAccentOrange: '#c15f3c',
  claudeBorderSubtle: '#3a3634',
};

export const SPRINGS = {
  smooth: { damping: 200 },
  snappy: { damping: 20, stiffness: 200 },
  bouncy: { damping: 8 },
  heavy: { damping: 15, stiffness: 80, mass: 2 },
  score: { damping: 20 },
};

export const DEMO_DATA = {
  siteName: "FlowSync",
  siteUrl: "https://flowsync.dev",
  healthScoreBefore: 62,
  healthScoreAfter: 92,
  totalIssues: 52,
  highIssues: 13,
  mediumIssues: 21,
  lowIssues: 18,
  deadButtons: 7,
  brokenForms: 4,
  brokenLinks: 4,
  a11yViolations: 7,
  workflowsTested: 5,
  workflowsPassed: 5,
};
