// generate-gif.mjs - Programmatically renders afterburn demo GIF
// Uses @napi-rs/canvas for frame rendering and gif-encoder-2 for GIF assembly

import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import GIFEncoder from 'gif-encoder-2';
import { writeFileSync } from 'fs';
import { join } from 'path';

// --- Dracula Theme ---
const COLORS = {
  bg:       '#282a36',
  fg:       '#f8f8f2',
  green:    '#50fa7b',
  red:      '#ff5555',
  yellow:   '#f1fa8c',
  cyan:     '#8be9fd',
  purple:   '#bd93f9',
  comment:  '#6272a4',
  titleBar: '#1e1f29',
  dotRed:   '#ff5555',
  dotYellow:'#f1fa8c',
  dotGreen: '#50fa7b',
};

// --- Layout ---
const WIDTH = 960;
const HEIGHT = 540;
const FPS = 12;
const FRAME_DELAY = Math.round(1000 / FPS); // ~83ms
const PADDING_X = 24;
const PADDING_Y = 14;
const TITLE_BAR_HEIGHT = 34;
const FONT_SIZE = 16;
const LINE_HEIGHT = 22;
const BORDER_RADIUS = 10;

// --- Content Definition ---
const LINES = [];

function addLine(time, segments) {
  LINES.push({ time, segments });
}

function seg(text, color = COLORS.fg) { return { text, color }; }

// Beat 1: Command (pre-visible from frame 0)
addLine(0.0, [seg('$ ', COLORS.purple), seg('npx afterburn https://myapp.dev')]);

// Beat 2: Banner + progress (after 1.5s)
addLine(1.5, [seg('')]);
addLine(1.5, [seg('Afterburn v1.0.1')]);
addLine(1.5, [seg('')]);

// Use simple checkmark character that renders in all fonts
addLine(2.2, [seg('  '), seg('OK', COLORS.green), seg(' Checking browser...')]);
addLine(2.9, [seg('  '), seg('OK', COLORS.green), seg(' Crawling site...')]);
addLine(3.6, [seg('  '), seg('OK', COLORS.green), seg(' Testing workflows...')]);
addLine(4.3, [seg('  '), seg('OK', COLORS.green), seg(' Analyzing results...')]);
addLine(5.0, [seg('  '), seg('OK', COLORS.green), seg(' Generating reports...')]);

// Beat 3: Health score + issues (after 5.5s)
addLine(5.5, [seg('')]);
addLine(5.8, [seg('Health: '), seg('47/100', COLORS.yellow), seg(' - 52 issues found (13 high, 21 medium, 18 low)')]);
addLine(5.8, [seg('')]);

addLine(6.3, [seg('Top issues:')]);
addLine(6.7, [seg('  1. '), seg('[HIGH]', COLORS.red), seg(' "Get Started Free" button does nothing when clicked')]);
addLine(7.1, [seg('  2. '), seg('[HIGH]', COLORS.red), seg(' Newsletter signup form fails silently')]);
addLine(7.5, [seg('  3. '), seg('[HIGH]', COLORS.red), seg(' JavaScript error: TypeError on page load')]);
addLine(7.8, [seg('  ... and 49 more (see report)')]);

// Beat 4: Reports (after 8.5s)
addLine(8.5, [seg('')]);
addLine(8.8, [seg('Reports saved:')]);
addLine(9.0, [seg('  HTML:     afterburn-reports/report.html')]);
addLine(9.2, [seg('  Markdown: afterburn-reports/report.md  '), seg('<-- paste into AI to auto-fix', COLORS.cyan)]);

// Total duration: ~12 seconds (linger until 12.0)
const TOTAL_DURATION = 12.0;
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
  // Short leg of check (going down-right)
  ctx.moveTo(x, y + size * 0.4);
  ctx.lineTo(x + size * 0.35, y + size * 0.75);
  // Long leg of check (going up-right)
  ctx.lineTo(x + size * 0.85, y + size * 0.1);
  ctx.stroke();
}

function renderFrame(canvas, ctx, time) {
  // Outer background (slightly darker, acts as margin)
  ctx.fillStyle = '#1a1b26';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Terminal window with rounded corners
  const winX = 16, winY = 12;
  const winW = WIDTH - 32, winH = HEIGHT - 24;

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

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

  // macOS-style dots
  const dotY = winY + TITLE_BAR_HEIGHT / 2;
  const dotStartX = winX + 20;
  const dotSpacing = 22;
  const dotR = 6;

  [COLORS.dotRed, COLORS.dotYellow, COLORS.dotGreen].forEach((color, i) => {
    ctx.beginPath();
    ctx.arc(dotStartX + i * dotSpacing, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });

  // Title text
  ctx.fillStyle = COLORS.comment;
  ctx.font = `13px "Consolas", "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('afterburn', winX + winW / 2, dotY + 4);
  ctx.textAlign = 'left';

  // Content area
  const contentX = winX + PADDING_X;
  const contentY = winY + TITLE_BAR_HEIGHT + PADDING_Y;

  ctx.font = `${FONT_SIZE}px "Consolas", "Courier New", monospace`;

  // Determine visible lines at this time
  const visibleLines = LINES.filter(l => l.time <= time);

  visibleLines.forEach((line, idx) => {
    const y = contentY + idx * LINE_HEIGHT + FONT_SIZE;
    let x = contentX;

    for (const segment of line.segments) {
      // Check if this is a checkmark placeholder
      if (segment.text === 'OK' && segment.color === COLORS.green) {
        // Draw a proper checkmark glyph
        drawCheckmark(ctx, x + 1, y - FONT_SIZE + 3, FONT_SIZE - 2, COLORS.green);
        x += ctx.measureText('OK').width;
      } else {
        ctx.fillStyle = segment.color;
        ctx.fillText(segment.text, x, y);
        x += ctx.measureText(segment.text).width;
      }
    }
  });

  // Block cursor after last visible line
  if (visibleLines.length > 0 && time < TOTAL_DURATION - 1.5) {
    const lastLineIdx = visibleLines.length - 1;
    const cursorY = contentY + (lastLineIdx + 1) * LINE_HEIGHT + FONT_SIZE;
    ctx.fillStyle = COLORS.fg;
    ctx.fillRect(contentX, cursorY - FONT_SIZE + 3, FONT_SIZE * 0.55, FONT_SIZE - 2);
  }
}

// --- Main ---
async function main() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const encoder = new GIFEncoder(WIDTH, HEIGHT, 'neuquant', true);

  const outputPath = join('C:', 'afterburn', 'demo', 'afterburn-demo.gif');

  encoder.setDelay(FRAME_DELAY);
  encoder.setQuality(10);
  encoder.setRepeat(0);    // 0 = loop forever

  encoder.start();

  console.log(`Generating ${TOTAL_FRAMES} frames at ${FPS}fps...`);

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
    console.log('File size is within target (<2MB).');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
