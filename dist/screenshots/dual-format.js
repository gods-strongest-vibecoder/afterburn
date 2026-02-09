// Dual-format screenshot capture: PNG for LLM analysis, WebP for display
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import fs from 'fs-extra';
/**
 * Converts a PNG buffer to WebP format with optimal compression settings
 */
export async function convertToWebP(pngBuffer) {
    return sharp(pngBuffer)
        .webp({ quality: 80, effort: 4, smartSubsample: true })
        .toBuffer();
}
/**
 * Captures a full-page screenshot in both PNG and WebP formats with content-hash naming
 * @param page - Playwright page instance
 * @param name - Human-readable screenshot name
 * @param outputDir - Directory to save screenshots
 * @returns ScreenshotRef with paths and metadata
 */
export async function captureDualFormat(page, name, outputDir) {
    // Ensure output directory exists
    fs.ensureDirSync(outputDir);
    // Capture full-page PNG screenshot
    const pngBuffer = await page.screenshot({ type: 'png', fullPage: true });
    // Generate content hash (first 12 chars of SHA-256)
    const hash = createHash('sha256').update(pngBuffer).digest('hex').substring(0, 12);
    // Convert to WebP
    const webpBuffer = await convertToWebP(pngBuffer);
    // Build cross-platform file paths
    const pngPath = join(outputDir, `${name}-${hash}.png`);
    const webpPath = join(outputDir, `${name}-${hash}.webp`);
    // Write both formats to disk
    await fs.outputFile(pngPath, pngBuffer);
    await fs.outputFile(webpPath, webpBuffer);
    // Get image dimensions
    const metadata = await sharp(pngBuffer).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    // Calculate size reduction
    const pngSize = pngBuffer.length;
    const webpSize = webpBuffer.length;
    const reduction = Math.round(((pngSize - webpSize) / pngSize) * 100);
    return {
        id: hash,
        name,
        pngPath,
        webpPath,
        width,
        height,
        sizes: {
            png: pngSize,
            webp: webpSize,
            reduction: `${reduction}%`,
        },
        capturedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=dual-format.js.map