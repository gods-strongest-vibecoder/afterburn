/**
 * Base interface for all artifacts produced by pipeline stages
 */
export interface ArtifactMetadata {
    version: string;
    stage: string;
    timestamp: string;
    sessionId: string;
}
/**
 * Reference to a captured screenshot with dual-format storage
 */
export interface ScreenshotRef {
    id: string;
    name: string;
    pngPath: string;
    webpPath: string;
    width: number;
    height: number;
    sizes: {
        png: number;
        webp: number;
        reduction: string;
    };
    capturedAt: string;
}
/**
 * Cookie consent platform definition
 */
export interface CookieBannerSelector {
    name: string;
    acceptButton: string;
    rejectButton?: string;
    modal?: string;
}
/**
 * Configuration for a single Afterburn run
 */
export interface SessionConfig {
    sessionId: string;
    targetUrl: string;
    startedAt: string;
    artifactDir: string;
    screenshotDir: string;
}
/**
 * Browser launch configuration
 */
export interface BrowserConfig {
    headless: boolean;
    userAgent: string;
    viewport: {
        width: number;
        height: number;
    };
    locale: string;
    timezoneId: string;
}
