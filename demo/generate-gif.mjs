// generate-gif.mjs - Programmatically renders afterburn demo GIF
// Synthesized from Pain Point Strategist + Visual Designer + Devil's Advocate debate

import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import GIFEncoder from 'gif-encoder-2';
import { writeFileSync } from 'fs';
import { join } from 'path';

// --- Catppuccin Mocha Theme (Visual Designer: better GIF compression than Dracula) ---
const COLORS = {
  bg:        '#1e1e2e',   // Mocha base
  fg:        '#cdd6f4',   // Mocha text
  green:     '#a6e3a1',   // Mocha green (checkmarks)
  red:       '#f38ba8',   // Mocha red ([CRITICAL] tags)
  yellow:    '#f9e2af',   // Mocha yellow (health score)
  cyan:      '#89dceb',   // Mocha sky (AI annotation)
  purple:    '#cba6f7',   // Mocha mauve ($ prompt)
  comment:   '#6c7086',   // Mocha overlay0 (muted text)
  titleBar:  '#181825',   // Mocha mantle (darker bar)
  surface:   '#313244',   // Mocha surface0 (subtle borders)
  outer:     '#11111b',   // Mocha crust (outer bg)
  dotRed:    '#f38ba8',
  dotYellow: '#f9e2af',
  dotGreen:  '#a6e3a1',
  white:     '#ffffff',
  bold:      '#f5e0dc',   // Mocha rosewater (for emphasis)
};

// --- Layout (Visual Designer: 1000x600, larger font for GitHub scaling) ---
const WIDTH = 1000;
const HEIGHT = 600;
const FPS = 12;
const FRAME_DELAY = Math.round(1000 / FPS); // ~83ms
const PADDING_X = 30;
const PADDING_Y = 18;
const TITLE_BAR_HEIGHT = 38;
const FONT_SIZE = 17;       // Readable after GitHub scales to ~700px
const LINE_HEIGHT = 22;     // Tighter to fit all 23 lines in 600px height
const BORDER_RADIUS = 12;
const FONT_FAMILY = '"DejaVu Sans Mono", monospace';  // Devil's Advocate: confirmed on system

// --- Content Definition (Pain Point Strategist: gut-punch copy) ---
const LINES = [];

function addLine(time, segments) {
  LINES.push({ time, segments });
}

function seg(text, color = COLORS.fg) { return { text, color }; }

// Beat 1: Command (pre-visible from frame 0) -- thumbnail shows tool name + recognizable URL
addLine(0.0, [seg('$ ', COLORS.purple), seg('npx afterburn ', COLORS.fg), seg('https://my-saas.vercel.app', COLORS.cyan)]);

// Beat 2: Banner + progress (after 1.2s -- fast, we want to get to the payoff)
addLine(1.2, [seg('')]);
addLine(1.2, [seg('Afterburn v1.0.2', COLORS.bold)]);
addLine(1.2, [seg('')]);

// Checkmarks cascade -- satisfying progress feel
addLine(1.9, [seg('  '), seg('CHECK', COLORS.green), seg(' Checking browser...', COLORS.fg)]);
addLine(2.5, [seg('  '), seg('CHECK', COLORS.green), seg(' Crawling site...', COLORS.fg)]);
addLine(3.1, [seg('  '), seg('CHECK', COLORS.green), seg(' Testing workflows...', COLORS.fg)]);
addLine(3.7, [seg('  '), seg('CHECK', COLORS.green), seg(' Analyzing results...', COLORS.fg)]);
addLine(4.2, [seg('  '), seg('CHECK', COLORS.green), seg(' Generating reports...', COLORS.fg)]);

// Beat 3: Health score -- THE emotional climax (Pain Point Strategist: 38/100 = gut punch)
addLine(4.7, [seg('')]);
addLine(5.0, [
  seg('Health: ', COLORS.fg),
  seg('38/100', COLORS.yellow),
  seg(' -- 47 issues found ', COLORS.fg),
  seg('(11 critical, 19 medium, 17 low)', COLORS.comment),
]);
addLine(5.0, [seg('')]);

// Beat 4: Top issues -- stories, not labels (Pain Point Strategist)
addLine(5.5, [seg('Top issues:', COLORS.fg)]);
addLine(5.9, [
  seg('  1. ', COLORS.fg),
  seg('[CRITICAL]', COLORS.red),
  seg(' "Start Free Trial" button does nothing', COLORS.fg),
]);
addLine(6.3, [
  seg('  2. ', COLORS.fg),
  seg('[CRITICAL]', COLORS.red),
  seg(' Contact form submits but loses the message', COLORS.fg),
]);
addLine(6.7, [
  seg('  3. ', COLORS.fg),
  seg('[CRITICAL]', COLORS.red),
  seg(' Pricing page crashes on mobile', COLORS.fg),
]);
addLine(7.0, [seg('  ... and 44 more (see report)', COLORS.comment)]);

// Beat 5: Reports + AI hook (Pain Point Strategist: "For you" / "For your AI")
addLine(7.5, [seg('')]);
addLine(7.8, [seg('Reports saved:', COLORS.fg)]);
addLine(8.0, [seg('  For you:     ', COLORS.comment), seg('./afterburn-reports/report.html', COLORS.fg)]);
addLine(8.2, [seg('  For your AI: ', COLORS.comment), seg('./afterburn-reports/report.md', COLORS.fg)]);
addLine(8.5, [seg('')]);
addLine(8.7, [
  seg('Paste ', COLORS.cyan),
  seg('report.md', COLORS.bold),
  seg(' into Claude or Cursor to auto-fix these bugs.', COLORS.cyan),
]);

// Total duration: ~10.5 seconds (compromise: not 7, not 14)
const TOTAL_DURATION = 10.5;
const TOTAL_FRAMES = Math.ceil(TOTAL_DURATION * FPS);

// --- Rendering helpers ---

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Draw a green checkmark manually (two lines forming a check shape)
function drawCheckmark(ctx, x, y, size, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.5);
  ctx.lineTo(x + size * 0.35, y + size * 0.8);
  ctx.lineTo(x + size * 0.9, y + size * 0.15);
  ctx.stroke();
}

function renderFrame(canvas, ctx, time) {
  // Outer background (crust -- deepest dark)
  ctx.fillStyle = COLORS.outer;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Terminal window with rounded corners
  const winX = 18, winY = 14;
  const winW = WIDTH - 36, winH = HEIGHT - 28;

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;

  // Window background
  drawRoundedRect(ctx, winX, winY, winW, winH, BORDER_RADIUS);
  ctx.fillStyle = COLORS.bg;
  ctx.fill();

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Title bar
  drawRoundedRect(ctx, winX, winY, winW, TITLE_BAR_HEIGHT, BORDER_RADIUS);
  ctx.fillStyle = COLORS.titleBar;
  ctx.fill();
  // Cover bottom rounded corners of title bar
  ctx.fillRect(winX, winY + TITLE_BAR_HEIGHT - BORDER_RADIUS, winW, BORDER_RADIUS);

  // Subtle border line under title bar
  ctx.fillStyle = COLORS.surface;
  ctx.fillRect(winX, winY + TITLE_BAR_HEIGHT - 1, winW, 1);

  // macOS-style dots (Visual Designer: Colorful window bar = strongest terminal convention)
  const dotY = winY + TITLE_BAR_HEIGHT / 2;
  const dotStartX = winX + 22;
  const dotSpacing = 24;
  const dotR = 7;

  [COLORS.dotRed, COLORS.dotYellow, COLORS.dotGreen].forEach((color, i) => {
    ctx.beginPath();
    ctx.arc(dotStartX + i * dotSpacing, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });

  // Title text
  ctx.fillStyle = COLORS.comment;
  ctx.font = `14px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText('afterburn', winX + winW / 2, dotY + 5);
  ctx.textAlign = 'left';

  // Content area
  const contentX = winX + PADDING_X;
  const contentY = winY + TITLE_BAR_HEIGHT + PADDING_Y;

  ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;

  // Determine visible lines at this time
  const visibleLines = LINES.filter(l => l.time <= time);

  visibleLines.forEach((line, idx) => {
    const y = contentY + idx * LINE_HEIGHT + FONT_SIZE;
    let x = contentX;

    for (const segment of line.segments) {
      if (segment.text === 'CHECK' && segment.color === COLORS.green) {
        // Draw a proper checkmark glyph
        drawCheckmark(ctx, x + 1, y - FONT_SIZE + 3, FONT_SIZE, COLORS.green);
        x += ctx.measureText('OK').width + 2;
      } else {
        // Handle bold text
        if (segment.color === COLORS.bold || segment.color === COLORS.yellow) {
          ctx.font = `bold ${FONT_SIZE}px ${FONT_FAMILY}`;
        } else {
          ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
        }
        ctx.fillStyle = segment.color;
        ctx.fillText(segment.text, x, y);
        x += ctx.measureText(segment.text).width;
      }
    }
  });

  // Reset font after rendering
  ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;

  // Block cursor after last visible line (only during animation, not during linger)
  if (visibleLines.length > 0 && time < TOTAL_DURATION - 1.5) {
    const lastLineIdx = visibleLines.length - 1;
    const cursorY = contentY + (lastLineIdx + 1) * LINE_HEIGHT + FONT_SIZE;
    ctx.fillStyle = COLORS.fg;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(contentX, cursorY - FONT_SIZE + 3, FONT_SIZE * 0.6, FONT_SIZE);
    ctx.globalAlpha = 1.0;
  }
}

// --- Main ---
async function main() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const encoder = new GIFEncoder(WIDTH, HEIGHT, 'neuquant', true);

  const outputPath = join(process.cwd(), 'demo', 'afterburn-demo.gif');

  encoder.setDelay(FRAME_DELAY);
  encoder.setQuality(15);   // 10=best 30=worst; 15 is a good balance for dark themes
  encoder.setRepeat(0);    // 0 = loop forever

  encoder.start();

  console.log(`Generating ${TOTAL_FRAMES} frames at ${FPS}fps (${TOTAL_DURATION}s)...`);

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const time = i / FPS;
    renderFrame(canvas, ctx, time);
    encoder.addFrame(ctx);

    if (i % FPS === 0) {
      console.log(`  Frame ${i}/${TOTAL_FRAMES} (t=${time.toFixed(1)}s)`);
    }
  }

  encoder.finish();

  const buffer = encoder.out.getData();
  writeFileSync(outputPath, buffer);

  const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
  console.log(`\nGIF saved to: ${outputPath}`);
  console.log(`Size: ${sizeMB} MB (${buffer.length} bytes)`);
  console.log(`Frames: ${TOTAL_FRAMES}, Duration: ${TOTAL_DURATION}s, FPS: ${FPS}`);

  if (buffer.length > 3 * 1024 * 1024) {
    console.log('WARNING: File exceeds 3MB target!');
  } else if (buffer.length > 2 * 1024 * 1024) {
    console.log('NOTE: File exceeds 2MB goal but under 3MB hard limit.');
  } else {
    console.log('File size is within target (<2MB). Ship it!');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
