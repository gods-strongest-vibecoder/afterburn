// Shared type definitions for all pipeline stages and artifacts

/**
 * Base interface for all artifacts produced by pipeline stages
 */
export interface ArtifactMetadata {
  version: string;        // Schema version (e.g. "1.0")
  stage: string;          // Pipeline stage name
  timestamp: string;      // ISO 8601 timestamp
  sessionId: string;      // UUID for this run
}

/**
 * Reference to a captured screenshot with dual-format storage
 */
export interface ScreenshotRef {
  id: string;             // Content hash (first 12 chars of SHA-256)
  name: string;           // Human-readable name
  pngPath: string;        // Lossless path for LLM analysis
  webpPath: string;       // Compressed path for display
  width: number;
  height: number;
  sizes: {
    png: number;          // Size in bytes
    webp: number;         // Size in bytes
    reduction: string;    // Percentage reduction (e.g. "65%")
  };
  capturedAt: string;     // ISO 8601 timestamp
}

/**
 * Cookie consent platform definition
 */
export interface CookieBannerSelector {
  name: string;           // Platform name (e.g. "OneTrust", "Cookiebot")
  acceptButton: string;   // CSS selector for accept button
  rejectButton?: string;  // CSS selector for reject button (optional)
  modal?: string;         // CSS selector for modal container (optional)
}

/**
 * Configuration for a single Afterburn run
 */
export interface SessionConfig {
  sessionId: string;
  targetUrl: string;
  startedAt: string;      // ISO 8601 timestamp
  artifactDir: string;    // Defaults to .afterburn/artifacts
  screenshotDir: string;  // Defaults to .afterburn/screenshots
}

/**
 * Browser launch configuration
 */
export interface BrowserConfig {
  headless: boolean;      // Default: true
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  locale: string;         // e.g. "en-US"
  timezoneId: string;     // e.g. "America/New_York"
}
