// Zod schemas for AI-generated workflow plans (structured output validation)

import { z } from 'zod';

/**
 * Single step in a workflow plan
 */
export const WorkflowStepSchema = z.object({
  action: z.enum(['navigate', 'click', 'fill', 'select', 'wait', 'expect'])
    .describe('Action to perform'),
  selector: z.string()
    .describe('Playwright selector for the target element (prefer role-based)'),
  value: z.string().optional()
    .describe('Value to fill or select'),
  expectedResult: z.string()
    .describe('What should happen after this step'),
  confidence: z.number().min(0).max(1)
    .describe('How confident are you this step will work (0-1)'),
});

/**
 * Complete AI-generated workflow test plan
 */
export const WorkflowPlanSchema = z.object({
  workflowName: z.string()
    .describe('Human-readable name like "User Signup Flow"'),
  description: z.string()
    .describe('What this workflow tests in plain English'),
  steps: z.array(WorkflowStepSchema).min(1).max(20)
    .describe('Step-by-step test actions'),
  priority: z.enum(['critical', 'important', 'nice-to-have'])
    .describe('Importance level'),
  estimatedDuration: z.number()
    .describe('Estimated seconds to execute'),
});

/**
 * Gemini structured output wrapper (array of workflows)
 */
export const WorkflowPlansResponseSchema = z.object({
  workflows: z.array(WorkflowPlanSchema),
});
