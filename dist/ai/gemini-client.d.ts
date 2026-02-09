import { z } from 'zod';
/**
 * Reusable Gemini 2.5 Flash client for structured and unstructured generation.
 * Used for workflow planning (Phase 2), error diagnosis (Phase 4), and report generation (Phase 5).
 */
export declare class GeminiClient {
    private model;
    constructor(apiKey?: string);
    /**
     * Generate structured JSON output validated against a Zod schema
     */
    generateStructured<T>(prompt: string, schema: z.ZodType<T>): Promise<T>;
    /**
     * Generate plain text response (no schema constraints)
     */
    generateText(prompt: string): Promise<string>;
    /**
     * Generate structured JSON output with image input (multimodal)
     */
    generateStructuredWithImage<T>(prompt: string, schema: z.ZodType<T>, imagePath: string): Promise<T>;
}
