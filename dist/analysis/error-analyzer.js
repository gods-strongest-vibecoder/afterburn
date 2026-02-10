// LLM-powered error diagnosis with pattern-matching fallback
import { GeminiClient } from '../ai/gemini-client.js';
import { ErrorDiagnosisSchema } from './diagnosis-schema.js';
/**
 * Main export: Analyze all errors from ExecutionArtifact and produce plain English diagnoses
 */
export async function analyzeErrors(artifact, options) {
    const apiKey = options?.apiKey || process.env.GEMINI_API_KEY;
    const diagnosedErrors = [];
    // Collect all errors from the artifact
    const failedSteps = artifact.workflowResults.flatMap((workflow) => workflow.stepResults.filter((step) => step.status === 'failed'));
    // Use LLM diagnosis if API key available, otherwise fallback
    // Note: dead buttons and broken forms are handled directly by priority-ranker.ts
    // from the execution artifact — no need to inject them here as DiagnosedErrors.
    if (apiKey) {
        try {
            const llmDiagnoses = await diagnoseWithLLM(artifact, failedSteps, apiKey);
            diagnosedErrors.push(...llmDiagnoses);
        }
        catch (error) {
            console.warn('LLM diagnosis failed, falling back to pattern matching:', error);
            const fallbackDiagnoses = fallbackDiagnosis(artifact, failedSteps);
            diagnosedErrors.push(...fallbackDiagnoses);
        }
    }
    else {
        const fallbackDiagnoses = fallbackDiagnosis(artifact, failedSteps);
        diagnosedErrors.push(...fallbackDiagnoses);
    }
    return diagnosedErrors;
}
/**
 * LLM-powered error diagnosis using Gemini
 */
async function diagnoseWithLLM(artifact, failedSteps, apiKey) {
    const gemini = new GeminiClient(apiKey);
    const diagnosedErrors = [];
    // Diagnose each failed step with evidence
    for (const step of failedSteps) {
        if (!step.evidence || !step.error)
            continue;
        const prompt = buildEvidencePrompt(step, step.evidence);
        const diagnosis = await gemini.generateStructured(prompt, ErrorDiagnosisSchema);
        diagnosedErrors.push({
            ...diagnosis,
            originalError: step.error, // CRITICAL: preserve original error for source mapping
            screenshotRef: step.evidence.screenshotRef?.pngPath,
        });
    }
    // Diagnose aggregate errors (console errors, network failures not tied to specific steps)
    const aggregateErrors = collectAggregateErrors(artifact, failedSteps);
    if (aggregateErrors.length > 0) {
        const aggregatePrompt = buildAggregatePrompt(artifact.targetUrl, aggregateErrors);
        const aggregateDiagnoses = await diagnoseBatch(gemini, aggregatePrompt, aggregateErrors);
        diagnosedErrors.push(...aggregateDiagnoses);
    }
    return diagnosedErrors;
}
/**
 * Build evidence-based prompt for a single failed step
 */
function buildEvidencePrompt(step, evidence) {
    const consoleErrors = evidence.consoleErrors.length > 0
        ? evidence.consoleErrors.join('\n')
        : 'None';
    const networkFailures = evidence.networkFailures.length > 0
        ? evidence.networkFailures.map((f) => `${f.status} ${f.url}`).join('\n')
        : 'None';
    return `Analyze this browser error and diagnose the root cause:

Page URL: ${evidence.pageUrl}
Action attempted: ${step.action} on ${step.selector}
Error message: ${step.error}

Console Errors:
${consoleErrors}

Network Failures:
${networkFailures}

Provide a plain English diagnosis. The audience is non-technical "vibe coders" who build with AI tools.
Focus on WHAT went wrong and HOW to fix it, not technical jargon.`;
}
/**
 * Collect errors not tied to specific workflow steps
 */
function collectAggregateErrors(artifact, failedSteps) {
    const aggregateErrors = [];
    const diagnosedStepErrors = new Set(failedSteps.map((s) => s.error));
    // Deduplicate: the same resource/error appears across multiple workflows visiting the same pages
    const seen = new Set();
    // Collect all broken image URLs first so we can skip duplicate network failure entries
    const brokenImageUrls = new Set();
    for (const workflow of artifact.workflowResults) {
        for (const brokenImage of workflow.errors.brokenImages) {
            brokenImageUrls.add(brokenImage.url);
        }
    }
    // Collect console errors not already diagnosed
    for (const workflow of artifact.workflowResults) {
        for (const consoleError of workflow.errors.consoleErrors) {
            if (!diagnosedStepErrors.has(consoleError.message)) {
                const key = `console:${consoleError.message}`;
                if (seen.has(key))
                    continue;
                seen.add(key);
                aggregateErrors.push({
                    type: 'console',
                    message: `Console error on ${consoleError.url}: ${consoleError.message}`,
                });
            }
        }
        // Collect network failures not already diagnosed
        // Skip network failures for URLs already reported as broken images (avoids double-counting)
        for (const networkFailure of workflow.errors.networkFailures) {
            if (brokenImageUrls.has(networkFailure.url))
                continue;
            const failureMsg = `${networkFailure.status} ${networkFailure.url}`;
            if (!diagnosedStepErrors.has(failureMsg)) {
                const key = `network:${networkFailure.status}-${networkFailure.url}`;
                if (seen.has(key))
                    continue;
                seen.add(key);
                aggregateErrors.push({
                    type: 'network',
                    message: `Network failure: ${failureMsg} (${networkFailure.method} ${networkFailure.resourceType})`,
                });
            }
        }
        // Collect broken images
        for (const brokenImage of workflow.errors.brokenImages) {
            const key = `image:${brokenImage.url}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            aggregateErrors.push({
                type: 'image',
                message: `Image failed to load: ${brokenImage.url} (status ${brokenImage.status})`,
            });
        }
    }
    return aggregateErrors;
}
/**
 * Build aggregate prompt for multiple errors
 */
function buildAggregatePrompt(targetUrl, errors) {
    const errorList = errors.map((e) => `- ${e.message}`).join('\n');
    return `These errors were detected during testing of ${targetUrl}:

${errorList}

For each error, provide a plain English diagnosis. The audience is non-technical "vibe coders" who build with AI tools.
Focus on WHAT went wrong and HOW to fix it, not technical jargon.`;
}
/**
 * Diagnose batch of aggregate errors
 */
async function diagnoseBatch(gemini, prompt, errors) {
    // For simplicity, diagnose aggregate errors individually
    // (batching multiple in one LLM call would require array schema)
    const diagnosedErrors = [];
    for (const error of errors) {
        const individualPrompt = `Analyze this browser error and diagnose the root cause:

${error.message}

Provide a plain English diagnosis. The audience is non-technical "vibe coders" who build with AI tools.
Focus on WHAT went wrong and HOW to fix it, not technical jargon.`;
        try {
            const diagnosis = await gemini.generateStructured(individualPrompt, ErrorDiagnosisSchema);
            diagnosedErrors.push({
                ...diagnosis,
                originalError: error.message,
            });
        }
        catch (error) {
            console.warn('Failed to diagnose aggregate error:', error);
            // Skip this error, continue with others
        }
    }
    return diagnosedErrors;
}
/**
 * Fallback diagnosis using pattern matching (when GEMINI_API_KEY not available)
 */
function fallbackDiagnosis(artifact, failedSteps) {
    const diagnosedErrors = [];
    // Diagnose failed steps
    for (const step of failedSteps) {
        if (!step.error)
            continue;
        const diagnosis = patternMatchError(step.error);
        diagnosedErrors.push({
            ...diagnosis,
            originalError: step.error,
            screenshotRef: step.evidence?.screenshotRef?.pngPath,
            pageUrl: step.evidence?.pageUrl || undefined,
        });
    }
    // Diagnose aggregate console errors, network failures, and broken images
    // Deduplicate: the same resource/error appears across multiple workflows visiting the same pages
    const seen = new Set();
    // Collect all broken image URLs first so we can skip duplicate network failure entries
    const brokenImageUrls = new Set();
    for (const workflow of artifact.workflowResults) {
        for (const brokenImage of workflow.errors.brokenImages) {
            brokenImageUrls.add(brokenImage.url);
        }
    }
    for (const workflow of artifact.workflowResults) {
        for (const consoleError of workflow.errors.consoleErrors) {
            const key = `console:${consoleError.message}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            const diagnosis = patternMatchError(consoleError.message);
            diagnosedErrors.push({
                ...diagnosis,
                originalError: consoleError.message,
                pageUrl: consoleError.url || undefined,
            });
        }
        // Diagnose network failures
        // Skip network failures for URLs already reported as broken images (avoids double-counting)
        for (const networkFailure of workflow.errors.networkFailures) {
            if (brokenImageUrls.has(networkFailure.url))
                continue;
            const key = `network:${networkFailure.status}-${networkFailure.url}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            const diagnosis = patternMatchNetworkFailure(networkFailure.status, networkFailure.url);
            diagnosedErrors.push({
                ...diagnosis,
                originalError: `${networkFailure.status} ${networkFailure.url}`,
                pageUrl: networkFailure.url || undefined,
            });
        }
        // Diagnose broken images
        for (const brokenImage of workflow.errors.brokenImages) {
            const key = `image:${brokenImage.url}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            const imgFilename = brokenImage.url.split('/').pop() || brokenImage.url;
            diagnosedErrors.push({
                summary: `Image "${imgFilename}" failed to load (${brokenImage.status})`,
                rootCause: `The image at ${brokenImage.url} returned status ${brokenImage.status}`,
                errorType: 'network',
                confidence: 'high',
                suggestedFix: `Check if "${imgFilename}" exists in your images folder. If the file was renamed or moved, update the <img src> to match.`,
                originalError: `Broken image: ${brokenImage.url} (status ${brokenImage.status})`,
                pageUrl: brokenImage.url || undefined,
            });
        }
    }
    return diagnosedErrors;
}
/**
 * Pattern match error messages to produce basic diagnoses
 */
function patternMatchError(errorMessage) {
    const msg = errorMessage.toLowerCase();
    // Navigation errors -> high priority 'navigation' type
    if (msg.includes('net::err_') || msg.includes('page crashed') || msg.includes('navigation failed')) {
        return {
            summary: 'Page navigation failed',
            rootCause: 'The page could not load — it may be down, too slow, or the URL is wrong',
            errorType: 'navigation',
            confidence: 'high',
            suggestedFix: 'Check that the URL is correct and the server is responding',
            technicalDetails: errorMessage,
        };
    }
    // Navigation timeouts (page.goto timeout) -> high priority
    if (msg.includes('timeout') && (msg.includes('navigation') || msg.includes('goto') || msg.includes('waiting for page'))) {
        return {
            summary: 'Page took too long to load',
            rootCause: 'The page did not finish loading within the timeout — the server may be slow or unresponsive',
            errorType: 'navigation',
            confidence: 'high',
            suggestedFix: 'Check that the server is running and responding. For slow-loading pages, try increasing the timeout.',
            technicalDetails: errorMessage,
        };
    }
    // Element wait timeouts (selector not found within timeout) -> medium priority DOM issue
    if (msg.includes('timeout') && !msg.includes('navigation')) {
        // Extract selector from "Timeout 10000ms exceeded. Waiting for selector '...'"
        const selectorMatch = errorMessage.match(/selector ['"]([^'"]+)['"]/i);
        const selectorName = selectorMatch ? selectorMatch[1] : 'an element';
        return {
            summary: `Could not find ${selectorName} on the page`,
            rootCause: 'The element was not found within the time limit — it may not exist, have a different selector, or be loaded later',
            errorType: 'dom',
            confidence: 'medium',
            suggestedFix: 'Check if the element exists in the HTML and is visible. It may have a different CSS selector or load dynamically.',
            technicalDetails: errorMessage,
        };
    }
    // Authentication errors -> high priority 'authentication' type
    if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('authentication')) {
        return {
            summary: 'Access denied — authentication required or forbidden',
            rootCause: 'The server rejected the request due to missing or invalid credentials',
            errorType: 'authentication',
            confidence: 'high',
            suggestedFix: 'Check if login credentials are required. Use --email and --password flags for authenticated testing.',
            technicalDetails: errorMessage,
        };
    }
    // Form submission errors -> high priority 'form' type
    if (msg.includes('form') && (msg.includes('submit') || msg.includes('validation') || msg.includes('failed'))) {
        return {
            summary: 'Form submission failed',
            rootCause: 'The form could not be submitted — it may have validation errors or a broken action endpoint',
            errorType: 'form',
            confidence: 'medium',
            suggestedFix: 'Check form validation rules and ensure the form action URL is correct',
            technicalDetails: errorMessage,
        };
    }
    // TypeError patterns — extract property name for specific fix
    if (msg.includes('typeerror')) {
        // Try to extract the specific property: "cannot read properties of null (reading 'X')"
        const propMatch = errorMessage.match(/reading '(\w+)'/i) || errorMessage.match(/property '(\w+)'/i);
        const nullMatch = errorMessage.match(/of (null|undefined)/i);
        const specificProp = propMatch ? `.${propMatch[1]}` : '';
        const nullType = nullMatch ? nullMatch[1] : 'null or undefined';
        return {
            summary: `Tried to use ${specificProp || 'a property'} on something that is ${nullType}`,
            rootCause: `The code calls ${specificProp || 'a property/method'} on a value that is ${nullType}. This usually means an element wasn't found or data hasn't loaded yet.`,
            errorType: 'javascript',
            confidence: 'medium',
            suggestedFix: specificProp
                ? `Add a null check before accessing ${specificProp}: use "if (variable) { variable${specificProp} }" or optional chaining "variable?${specificProp}"`
                : 'Add a null check before accessing the property, or make sure the variable is initialized first',
            technicalDetails: errorMessage,
        };
    }
    // ReferenceError patterns — extract the undefined name
    if (msg.includes('referenceerror')) {
        const nameMatch = errorMessage.match(/(\w+) is not defined/i);
        const undefinedName = nameMatch ? nameMatch[1] : null;
        return {
            summary: undefinedName
                ? `"${undefinedName}" is not defined — the code references something that doesn't exist`
                : 'Used a variable or function that wasn\'t defined',
            rootCause: undefinedName
                ? `The code tries to use "${undefinedName}" but it was never declared. This could be a typo, a missing script tag, or a missing import.`
                : 'The code references something that hasn\'t been declared',
            errorType: 'javascript',
            confidence: 'medium',
            suggestedFix: undefinedName
                ? `Make sure "${undefinedName}" is defined before this line runs. Check for typos, missing <script> tags, or missing imports.`
                : 'Make sure all variables and functions are defined before using them',
            technicalDetails: errorMessage,
        };
    }
    // SyntaxError patterns
    if (msg.includes('syntaxerror')) {
        return {
            summary: 'There\'s a syntax error in the code',
            rootCause: 'The JavaScript code has invalid syntax that prevents it from running',
            errorType: 'javascript',
            confidence: 'medium',
            suggestedFix: 'Check for missing brackets, semicolons, or unexpected characters in the code',
            technicalDetails: errorMessage,
        };
    }
    // RangeError patterns
    if (msg.includes('rangeerror')) {
        return {
            summary: 'The code got stuck in an infinite loop or used too much memory',
            rootCause: 'A value is out of the allowed range, often caused by infinite recursion or oversized arrays',
            errorType: 'javascript',
            confidence: 'medium',
            suggestedFix: 'Check for recursive function calls without a proper exit condition',
            technicalDetails: errorMessage,
        };
    }
    // Network error patterns
    if (msg.includes('networkerror') || msg.includes('fetch')) {
        return {
            summary: 'Failed to connect to the server',
            rootCause: 'The application couldn\'t reach the backend server or API',
            errorType: 'network',
            confidence: 'medium',
            suggestedFix: 'Check your internet connection and verify the server is running',
            technicalDetails: errorMessage,
        };
    }
    // CORS error patterns
    if (msg.includes('cors') || msg.includes('cross-origin') || msg.includes('access-control-allow-origin')) {
        return {
            summary: 'Cross-origin request blocked (CORS error)',
            rootCause: 'The browser blocked a request to a different domain because the server doesn\'t allow it',
            errorType: 'network',
            confidence: 'high',
            suggestedFix: 'Add the correct CORS headers on the server (Access-Control-Allow-Origin)',
            technicalDetails: errorMessage,
        };
    }
    // SecurityError / mixed content patterns
    if (msg.includes('securityerror') || msg.includes('mixed content') || msg.includes('blocked:mixed')) {
        return {
            summary: 'Security error — blocked insecure content',
            rootCause: 'The page tried to load insecure (HTTP) content on a secure (HTTPS) page',
            errorType: 'network',
            confidence: 'high',
            suggestedFix: 'Change all resource URLs from http:// to https://',
            technicalDetails: errorMessage,
        };
    }
    // Content Security Policy (CSP) patterns
    if (msg.includes('content security policy') || msg.includes('csp') || msg.includes('refused to')) {
        return {
            summary: 'Content blocked by security policy',
            rootCause: 'The page\'s Content Security Policy is blocking a script, style, or resource from loading',
            errorType: 'network',
            confidence: 'medium',
            suggestedFix: 'Update the Content-Security-Policy header to allow the blocked resource',
            technicalDetails: errorMessage,
        };
    }
    // Deprecation warnings
    if (msg.includes('deprecated') || msg.includes('deprecation')) {
        return {
            summary: 'Code uses a deprecated feature that may stop working',
            rootCause: 'The code relies on a browser API or pattern that is being phased out',
            errorType: 'javascript',
            confidence: 'medium',
            suggestedFix: 'Update the code to use the recommended modern alternative',
            technicalDetails: errorMessage,
        };
    }
    // Default fallback: surface original error message instead of generic text
    const cleanedMessage = errorMessage.trim().replace(/\n/g, ' ');
    const truncatedMessage = cleanedMessage.length > 120
        ? cleanedMessage.slice(0, 120) + '...'
        : cleanedMessage;
    const summary = truncatedMessage
        ? `JavaScript error: ${truncatedMessage}`
        : 'An unknown error occurred';
    // Cap total summary at 150 chars
    const cappedSummary = summary.length > 150 ? summary.slice(0, 147) + '...' : summary;
    // Try to extract actionable fix from the error message itself
    let suggestedFix;
    if (cleanedMessage.includes('404') || cleanedMessage.includes('Not Found')) {
        suggestedFix = 'A resource returned 404 — check if the file path or API endpoint URL is correct and the resource exists on the server.';
    }
    else if (cleanedMessage.includes('500') || cleanedMessage.includes('Internal Server Error')) {
        suggestedFix = 'The server returned a 500 error — check your server logs for the stack trace and fix the backend code.';
    }
    else if (cleanedMessage.includes('Failed to load') || cleanedMessage.includes('failed to fetch')) {
        suggestedFix = 'A resource or API call failed to load — verify the URL is correct and the server is running.';
    }
    else {
        suggestedFix = 'Open your browser DevTools (F12), go to the Console tab, reproduce the error, and check the stack trace for the source file and line number.';
    }
    return {
        summary: cappedSummary,
        rootCause: 'Set GEMINI_API_KEY for AI-powered root cause analysis',
        errorType: 'unknown',
        confidence: 'medium',
        suggestedFix,
        technicalDetails: errorMessage,
    };
}
/**
 * Pattern match network failures by status code
 */
function patternMatchNetworkFailure(status, url) {
    const resourceName = url.split('/').pop()?.split('?')[0] || url;
    if (status === 404) {
        return {
            summary: `"${resourceName}" not found (404)`,
            rootCause: `The URL ${url} doesn't exist on the server`,
            errorType: 'network',
            confidence: 'high',
            suggestedFix: `Check if "${resourceName}" exists at the expected path, or update the URL that references it`,
            technicalDetails: `HTTP 404: ${url}`,
        };
    }
    if (status === 403) {
        return {
            summary: 'Permission denied',
            rootCause: `Access to ${url} is forbidden`,
            errorType: 'authentication',
            confidence: 'high',
            suggestedFix: 'Check if you need to be logged in or have specific permissions',
            technicalDetails: `HTTP 403: ${url}`,
        };
    }
    if (status === 401) {
        return {
            summary: 'Authentication required',
            rootCause: `Access to ${url} requires authentication`,
            errorType: 'authentication',
            confidence: 'high',
            suggestedFix: 'Log in with valid credentials',
            technicalDetails: `HTTP 401: ${url}`,
        };
    }
    if (status >= 500) {
        return {
            summary: 'Server error',
            rootCause: `The server encountered an error processing ${url}`,
            errorType: 'network',
            confidence: 'high',
            suggestedFix: 'Contact the website administrator or try again later',
            technicalDetails: `HTTP ${status}: ${url}`,
        };
    }
    if (status >= 400) {
        return {
            summary: 'Request error',
            rootCause: `The request to ${url} was invalid`,
            errorType: 'network',
            confidence: 'medium',
            suggestedFix: 'Check the request parameters and URL format',
            technicalDetails: `HTTP ${status}: ${url}`,
        };
    }
    return {
        summary: `Network request to ${resourceName} failed (HTTP ${status})`,
        rootCause: `The server returned an unexpected status ${status} for ${url}`,
        errorType: 'network',
        confidence: 'medium',
        suggestedFix: `Check if "${resourceName}" is working correctly — the server returned HTTP ${status}`,
        technicalDetails: `HTTP ${status}: ${url}`,
    };
}
//# sourceMappingURL=error-analyzer.js.map