// Error evidence capture: screenshot + context collection on step failure
import { redactSensitiveUrl } from '../utils/sanitizer.js';
/**
 * Capture error evidence when a workflow step fails
 * Collects screenshot, console errors, and network failures
 */
export async function captureErrorEvidence(page, collector, screenshotManager, stepIndex) {
    try {
        // Capture screenshot with error label
        const screenshotRef = await screenshotManager.capture(page, `error-step-${stepIndex}`);
        // Get last 5 console errors
        const recentConsoleErrors = collector.consoleErrors
            .slice(-5)
            .map((err) => err.message);
        // Get last 5 network failures
        const recentNetworkFailures = collector.networkFailures
            .slice(-5)
            .map((fail) => ({ url: fail.url, status: fail.status }));
        return {
            screenshotRef,
            consoleErrors: recentConsoleErrors,
            networkFailures: recentNetworkFailures,
            pageUrl: redactSensitiveUrl(page.url()),
            timestamp: new Date().toISOString(),
        };
    }
    catch (error) {
        // Return safe defaults if evidence capture fails
        return {
            consoleErrors: [],
            networkFailures: [],
            pageUrl: redactSensitiveUrl(page.url()),
            timestamp: new Date().toISOString(),
        };
    }
}
//# sourceMappingURL=evidence-capture.js.map