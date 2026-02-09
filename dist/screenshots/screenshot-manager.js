// Screenshot capture coordination with content-hash deduplication
import { createHash } from 'node:crypto';
import { captureDualFormat } from './dual-format.js';
/**
 * Manages screenshot capture with automatic deduplication by content hash
 */
export class ScreenshotManager {
    outputDir;
    dedupMap;
    constructor(outputDir = '.afterburn/screenshots') {
        this.outputDir = outputDir;
        this.dedupMap = new Map();
    }
    /**
     * Captures a screenshot in dual format (PNG + WebP) with deduplication
     * @param page - Playwright page instance
     * @param name - Human-readable screenshot name
     * @returns ScreenshotRef (existing ref if duplicate detected)
     */
    async capture(page, name) {
        // Capture PNG buffer to compute hash
        const pngBuffer = await page.screenshot({ type: 'png', fullPage: true });
        const hash = createHash('sha256').update(pngBuffer).digest('hex').substring(0, 12);
        // Check if this content hash already exists (deduplication)
        const existing = this.dedupMap.get(hash);
        if (existing) {
            return existing;
        }
        // New screenshot - capture dual format and store in dedup map
        const ref = await captureDualFormat(page, name, this.outputDir);
        this.dedupMap.set(hash, ref);
        return ref;
    }
    /**
     * Returns all captured screenshots
     */
    getAll() {
        return Array.from(this.dedupMap.values());
    }
    /**
     * Finds a screenshot by name
     */
    getByName(name) {
        return this.getAll().find((ref) => ref.name === name);
    }
}
//# sourceMappingURL=screenshot-manager.js.map