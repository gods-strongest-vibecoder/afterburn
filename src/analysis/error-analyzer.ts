// LLM-powered error diagnosis with pattern-matching fallback

import { GeminiClient } from '../ai/gemini-client.js';
import { ExecutionArtifact, StepResult, ErrorEvidence } from '../types/execution.js';
import { DiagnosedError, ErrorDiagnosisSchema, ErrorDiagnosis } from './diagnosis-schema.js';

/**
 * Main export: Analyze all errors from ExecutionArtifact and produce plain English diagnoses
 */
export async function analyzeErrors(
  artifact: ExecutionArtifact,
  options?: { apiKey?: string }
): Promise<DiagnosedError[]> {
  const apiKey = options?.apiKey || process.env.GEMINI_API_KEY;
  const diagnosedErrors: DiagnosedError[] = [];

  // Collect all errors from the artifact
  const failedSteps = artifact.workflowResults.flatMap((workflow) =>
    workflow.stepResults.filter((step) => step.status === 'failed')
  );

  // Use LLM diagnosis if API key available, otherwise fallback
  // Note: dead buttons and broken forms are handled directly by priority-ranker.ts
  // from the execution artifact — no need to inject them here as DiagnosedErrors.
  if (apiKey) {
    try {
      const llmDiagnoses = await diagnoseWithLLM(artifact, failedSteps, apiKey);
      diagnosedErrors.push(...llmDiagnoses);
    } catch (error) {
      console.warn('LLM diagnosis failed, falling back to pattern matching:', error);
      const fallbackDiagnoses = fallbackDiagnosis(artifact, failedSteps);
      diagnosedErrors.push(...fallbackDiagnoses);
    }
  } else {
    const fallbackDiagnoses = fallbackDiagnosis(artifact, failedSteps);
    diagnosedErrors.push(...fallbackDiagnoses);
  }

  return diagnosedErrors;
}

/**
 * LLM-powered error diagnosis using Gemini
 */
async function diagnoseWithLLM(
  artifact: ExecutionArtifact,
  failedSteps: StepResult[],
  apiKey: string
): Promise<DiagnosedError[]> {
  const gemini = new GeminiClient(apiKey);
  const diagnosedErrors: DiagnosedError[] = [];

  // Diagnose each failed step with evidence
  for (const step of failedSteps) {
    if (!step.evidence || !step.error) continue;

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
function buildEvidencePrompt(step: StepResult, evidence: ErrorEvidence): string {
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
function collectAggregateErrors(
  artifact: ExecutionArtifact,
  failedSteps: StepResult[]
): Array<{ type: string; message: string }> {
  const aggregateErrors: Array<{ type: string; message: string }> = [];
  const diagnosedStepErrors = new Set(failedSteps.map((s) => s.error));

  // Deduplicate: the same resource/error appears across multiple workflows visiting the same pages
  const seen = new Set<string>();

  // Collect console errors not already diagnosed
  for (const workflow of artifact.workflowResults) {
    for (const consoleError of workflow.errors.consoleErrors) {
      if (!diagnosedStepErrors.has(consoleError.message)) {
        const key = `console:${consoleError.message}`;
        if (seen.has(key)) continue;
        seen.add(key);

        aggregateErrors.push({
          type: 'console',
          message: `Console error on ${consoleError.url}: ${consoleError.message}`,
        });
      }
    }

    // Collect network failures not already diagnosed
    for (const networkFailure of workflow.errors.networkFailures) {
      const failureMsg = `${networkFailure.status} ${networkFailure.url}`;
      if (!diagnosedStepErrors.has(failureMsg)) {
        const key = `network:${networkFailure.status}-${networkFailure.url}`;
        if (seen.has(key)) continue;
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
      if (seen.has(key)) continue;
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
function buildAggregatePrompt(
  targetUrl: string,
  errors: Array<{ type: string; message: string }>
): string {
  const errorList = errors.map((e) => `- ${e.message}`).join('\n');

  return `These errors were detected during testing of ${targetUrl}:

${errorList}

For each error, provide a plain English diagnosis. The audience is non-technical "vibe coders" who build with AI tools.
Focus on WHAT went wrong and HOW to fix it, not technical jargon.`;
}

/**
 * Diagnose batch of aggregate errors
 */
async function diagnoseBatch(
  gemini: GeminiClient,
  prompt: string,
  errors: Array<{ type: string; message: string }>
): Promise<DiagnosedError[]> {
  // For simplicity, diagnose aggregate errors individually
  // (batching multiple in one LLM call would require array schema)
  const diagnosedErrors: DiagnosedError[] = [];

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
    } catch (error) {
      console.warn('Failed to diagnose aggregate error:', error);
      // Skip this error, continue with others
    }
  }

  return diagnosedErrors;
}

/**
 * Fallback diagnosis using pattern matching (when GEMINI_API_KEY not available)
 */
function fallbackDiagnosis(
  artifact: ExecutionArtifact,
  failedSteps: StepResult[]
): DiagnosedError[] {
  const diagnosedErrors: DiagnosedError[] = [];

  // Diagnose failed steps
  for (const step of failedSteps) {
    if (!step.error) continue;

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
  const seen = new Set<string>();

  for (const workflow of artifact.workflowResults) {
    for (const consoleError of workflow.errors.consoleErrors) {
      const key = `console:${consoleError.message}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const diagnosis = patternMatchError(consoleError.message);
      diagnosedErrors.push({
        ...diagnosis,
        originalError: consoleError.message,
        pageUrl: consoleError.url || undefined,
      });
    }

    // Diagnose network failures
    for (const networkFailure of workflow.errors.networkFailures) {
      const key = `network:${networkFailure.status}-${networkFailure.url}`;
      if (seen.has(key)) continue;
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
      if (seen.has(key)) continue;
      seen.add(key);

      diagnosedErrors.push({
        summary: 'An image failed to load',
        rootCause: `The image at ${brokenImage.url} is missing or inaccessible`,
        errorType: 'network',
        confidence: 'medium',
        suggestedFix: 'Check if the image file exists and the URL is correct',
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
function patternMatchError(errorMessage: string): ErrorDiagnosis {
  const msg = errorMessage.toLowerCase();

  // TypeError patterns
  if (msg.includes('typeerror')) {
    return {
      summary: 'Tried to access something that doesn\'t exist in the code',
      rootCause: 'The code is trying to use a property or method on something that is null or undefined',
      errorType: 'javascript',
      confidence: 'medium',
      suggestedFix: 'Check that all variables are properly initialized before use',
      technicalDetails: errorMessage,
    };
  }

  // ReferenceError patterns
  if (msg.includes('referenceerror')) {
    return {
      summary: 'Used a variable or function that wasn\'t defined',
      rootCause: 'The code references something that hasn\'t been declared',
      errorType: 'javascript',
      confidence: 'medium',
      suggestedFix: 'Make sure all variables and functions are defined before using them',
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

  return {
    summary: cappedSummary,
    rootCause: 'Unable to determine root cause without AI analysis',
    errorType: 'unknown',
    confidence: 'low',
    suggestedFix: 'Set GEMINI_API_KEY for detailed AI diagnosis, or review the error in the browser console',
    technicalDetails: errorMessage,
  };
}

/**
 * Pattern match network failures by status code
 */
function patternMatchNetworkFailure(status: number, url: string): ErrorDiagnosis {
  if (status === 404) {
    return {
      summary: 'Page or resource not found',
      rootCause: `The URL ${url} doesn't exist on the server`,
      errorType: 'network',
      confidence: 'high',
      suggestedFix: 'Check if the URL is correct or if the resource has been moved',
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
    summary: 'Network request failed',
    rootCause: `Request to ${url} failed with status ${status}`,
    errorType: 'network',
    confidence: 'low',
    suggestedFix: 'Check the network tab in browser developer tools for details',
    technicalDetails: `HTTP ${status}: ${url}`,
  };
}
