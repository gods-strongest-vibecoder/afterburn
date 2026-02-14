// Terminal animation script data - lines and spinner definitions
// Frame numbers are RELATIVE to Scene 2 start (absolute frame 270)
export type TerminalLine = {
  text: string;
  startFrame: number;
  type: 'command' | 'output' | 'result' | 'blank';
};

export type SpinnerDef = {
  label: string;
  startFrame: number;
  resolveFrame: number;
};

export const terminalLines: TerminalLine[] = [
  { text: '$ npx afterburn-cli https://flowsync.dev', startFrame: 0, type: 'command' },
  { text: '', startFrame: 10, type: 'blank' },
  { text: 'Afterburn v1.0.1', startFrame: 20, type: 'output' },
  { text: '', startFrame: 25, type: 'blank' },
];

export const spinners: SpinnerDef[] = [
  { label: "Launching browser...", startFrame: 31, resolveFrame: 55 },
  { label: "Crawling site... (3 pages discovered)", startFrame: 55, resolveFrame: 79 },
  { label: "Testing workflows... (5 workflows generated)", startFrame: 79, resolveFrame: 103 },
  { label: "Analyzing results...", startFrame: 103, resolveFrame: 127 },
  { label: "Generating reports...", startFrame: 127, resolveFrame: 157 },
];

export const resultLines: TerminalLine[] = [
  { text: '', startFrame: 330, type: 'blank' },
  { text: 'Health: 62/100 — 52 issues found (13 high, 21 medium, 18 low)', startFrame: 335, type: 'result' },
  { text: '', startFrame: 345, type: 'blank' },
  { text: 'Top issues:', startFrame: 350, type: 'output' },
  { text: '  1. [HIGH] "Get Started" button does nothing when clicked', startFrame: 360, type: 'output' },
  { text: '  2. [HIGH] Newsletter signup form fails silently', startFrame: 370, type: 'output' },
  { text: '  3. [HIGH] Contact form submission returns 500 error', startFrame: 380, type: 'output' },
  { text: '  ... and 49 more (see report)', startFrame: 390, type: 'output' },
  { text: '', startFrame: 400, type: 'blank' },
  { text: 'Reports saved:', startFrame: 410, type: 'output' },
  { text: '  HTML:     afterburn-reports/report.html', startFrame: 420, type: 'output' },
  { text: '  Markdown: afterburn-reports/report.md  ← paste into AI to auto-fix', startFrame: 430, type: 'output' },
];
