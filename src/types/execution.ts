// Type definitions for workflow execution, error detection, and testing results

import { ScreenshotRef } from './artifacts.js';

/**
 * Collector for errors detected during workflow execution
 */
export interface ErrorCollector {
  consoleErrors: Array<{ message: string; url: string; timestamp: string }>;
  networkFailures: Array<{ url: string; status: number; method: string; resourceType: string }>;
  brokenImages: Array<{ url: string; selector: string; status: number }>;
}

/**
 * Evidence captured when a workflow step fails
 */
export interface ErrorEvidence {
  screenshotRef?: ScreenshotRef;
  consoleErrors: string[];
  networkFailures: Array<{ url: string; status: number }>;
  pageUrl: string;
  timestamp: string;
}

/**
 * Result of a single workflow step execution
 */
export interface StepResult {
  stepIndex: number;
  action: string;
  selector: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  evidence?: ErrorEvidence;
  skippedFields?: Array<{ selector: string; reason: string }>;
}

/**
 * Result of dead button detection test
 */
export interface DeadButtonResult {
  isDead: boolean;
  selector: string;
  reason?: string;
}

/**
 * Result of broken form detection test
 */
export interface BrokenFormResult {
  isBroken: boolean;
  formSelector: string;
  reason?: string;
  filledFields: number;
  skippedFields: number;
}

/**
 * Performance metrics captured from browser APIs
 */
export interface PerformanceMetrics {
  lcp: number;
  domContentLoaded: number;
  totalLoadTime: number;
  url: string;
}

/**
 * Individual accessibility violation found by axe-core
 */
export interface AccessibilityViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  nodes: number;
  helpUrl: string;
}

/**
 * Accessibility audit report for a single page
 */
export interface AccessibilityReport {
  url: string;
  violationCount: number;
  violations: AccessibilityViolation[];
  passes: number;
  incomplete: number;
}

/**
 * Result of executing a complete workflow
 */
export interface WorkflowExecutionResult {
  workflowName: string;
  description: string;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  stepResults: StepResult[];
  errors: ErrorCollector;
  overallStatus: 'passed' | 'failed';
  duration: number;
  pageScreenshotRef?: string; // PNG path of page at end of workflow (for report embedding)
}

/**
 * Complete execution artifact containing all test results
 */
export interface ExecutionArtifact {
  version: string;
  stage: string;
  timestamp: string;
  sessionId: string;
  targetUrl: string;
  workflowResults: WorkflowExecutionResult[];
  pageAudits: Array<{ url: string; accessibility?: AccessibilityReport; performance?: PerformanceMetrics }>;
  deadButtons: DeadButtonResult[];
  brokenForms: BrokenFormResult[];
  totalIssues: number;
  exitCode: number;
}
