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

  const deadButtons = artifact.deadButtons.filter((btn) => btn.isDead);
  const brokenForms = artifact.brokenForms.filter((form) => form.isBroken);

  // Use LLM diagnosis if API key available, otherwise fallback
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

  // Diagnose dead buttons
  for (const btn of deadButtons) {
    diagnosedErrors.push({
      summary: `Button "${btn.selector}" doesn't do anything when clicked`,
      rootCause: 'The button is not connected to any functionality',
      errorType: 'dom',
      confidence: 'high',
      suggestedFix: 'Connect the button to a click handler or navigation action',
      originalError: `Dead button: ${btn.selector}`,
    });
  }

  // Diagnose broken forms
  for (const form of brokenForms) {
    diagnosedErrors.push({
      summary: `Form "${form.formSelector}" submission isn't working`,
      rootCause: form.reason || 'The form submission handler is not functioning properly',
      errorType: 'form',
      confidence: 'high',
      suggestedFix: 'Check the form submit handler and network requests',
      originalError: `Broken form: ${form.formSelector} - ${form.reason}`,
    });
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

  // Collect console errors not already diagnosed
  for (const workflow of artifact.workflowResults) {
    for (const consoleError of workflow.errors.consoleErrors) {
      if (!diagnosedStepErrors.has(consoleError.message)) {
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
        aggregateErrors.push({
          type: 'network',
          message: `Network failure: ${failureMsg} (${networkFailure.method} ${networkFailure.resourceType})`,
        });
      }
    }

    // Collect broken images
    for (const brokenImage of workflow.errors.brokenImages) {
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
    });
  }

  // Diagnose aggregate console errors
  for (const workflow of artifact.workflowResults) {
    for (const consoleError of workflow.errors.consoleErrors) {
      const diagnosis = patternMatchError(consoleError.message);
      diagnosedErrors.push({
        ...diagnosis,
        originalError: consoleError.message,
      });
    }

    // Diagnose network failures
    for (const networkFailure of workflow.errors.networkFailures) {
      const diagnosis = patternMatchNetworkFailure(networkFailure.status, networkFailure.url);
      diagnosedErrors.push({
        ...diagnosis,
        originalError: `${networkFailure.status} ${networkFailure.url}`,
      });
    }

    // Diagnose broken images
    for (const brokenImage of workflow.errors.brokenImages) {
      diagnosedErrors.push({
        summary: 'An image failed to load',
        rootCause: `The image at ${brokenImage.url} is missing or inaccessible`,
        errorType: 'network',
        confidence: 'medium',
        suggestedFix: 'Check if the image file exists and the URL is correct',
        originalError: `Broken image: ${brokenImage.url} (status ${brokenImage.status})`,
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

  // Default fallback
  return {
    summary: 'An error occurred (AI diagnosis unavailable - set GEMINI_API_KEY for detailed analysis)',
    rootCause: 'Unable to determine root cause without AI analysis',
    errorType: 'unknown',
    confidence: 'low',
    suggestedFix: 'Review the error message and check the browser console for more details',
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
