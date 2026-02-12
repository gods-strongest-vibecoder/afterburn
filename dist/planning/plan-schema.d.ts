import { z } from 'zod';
/**
 * Single step in a workflow plan
 */
export declare const WorkflowStepSchema: z.ZodObject<{
    action: z.ZodEnum<{
        select: "select";
        navigate: "navigate";
        click: "click";
        fill: "fill";
        wait: "wait";
        expect: "expect";
    }>;
    selector: z.ZodString;
    value: z.ZodOptional<z.ZodString>;
    expectedResult: z.ZodString;
    confidence: z.ZodNumber;
}, z.core.$strip>;
/**
 * Complete AI-generated workflow test plan
 */
export declare const WorkflowPlanSchema: z.ZodObject<{
    workflowName: z.ZodString;
    description: z.ZodString;
    steps: z.ZodArray<z.ZodObject<{
        action: z.ZodEnum<{
            select: "select";
            navigate: "navigate";
            click: "click";
            fill: "fill";
            wait: "wait";
            expect: "expect";
        }>;
        selector: z.ZodString;
        value: z.ZodOptional<z.ZodString>;
        expectedResult: z.ZodString;
        confidence: z.ZodNumber;
    }, z.core.$strip>>;
    priority: z.ZodEnum<{
        critical: "critical";
        important: "important";
        "nice-to-have": "nice-to-have";
    }>;
    estimatedDuration: z.ZodNumber;
}, z.core.$strip>;
/**
 * Gemini structured output wrapper (array of workflows)
 */
export declare const WorkflowPlansResponseSchema: z.ZodObject<{
    workflows: z.ZodArray<z.ZodObject<{
        workflowName: z.ZodString;
        description: z.ZodString;
        steps: z.ZodArray<z.ZodObject<{
            action: z.ZodEnum<{
                select: "select";
                navigate: "navigate";
                click: "click";
                fill: "fill";
                wait: "wait";
                expect: "expect";
            }>;
            selector: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
            expectedResult: z.ZodString;
            confidence: z.ZodNumber;
        }, z.core.$strip>>;
        priority: z.ZodEnum<{
            critical: "critical";
            important: "important";
            "nice-to-have": "nice-to-have";
        }>;
        estimatedDuration: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
