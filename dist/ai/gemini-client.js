// Gemini 2.5 Flash API client with structured JSON output support
import { GoogleGenerativeAI } from '@google/generative-ai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import fs from 'node:fs';
/**
 * Reusable Gemini 2.5 Flash client for structured and unstructured generation.
 * Used for workflow planning (Phase 2), error diagnosis (Phase 4), and report generation (Phase 5).
 */
export class GeminiClient {
    model;
    constructor(apiKey) {
        const key = apiKey || process.env.GEMINI_API_KEY;
        if (!key) {
            throw new Error('GEMINI_API_KEY not set. Get one at https://aistudio.google.com/apikey');
        }
        const genAI = new GoogleGenerativeAI(key);
        this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }
    /**
     * Generate structured JSON output validated against a Zod schema
     */
    async generateStructured(prompt, schema) {
        try {
            // Convert Zod schema to JSON Schema for Gemini
            const jsonSchema = zodToJsonSchema(schema, { name: 'ResponseSchema' });
            // Configure model for structured JSON output
            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: jsonSchema,
                },
            });
            // Extract text response
            const responseText = result.response.text();
            // Parse JSON
            const jsonData = JSON.parse(responseText);
            // Validate against Zod schema
            const validated = schema.parse(jsonData);
            return validated;
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Gemini API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
     * Generate plain text response (no schema constraints)
     */
    async generateText(prompt) {
        try {
            const result = await this.model.generateContent(prompt);
            return result.response.text();
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Gemini API error: ${error.message}`);
            }
            throw error;
        }
    }
    /**
     * Generate structured JSON output with image input (multimodal)
     */
    async generateStructuredWithImage(prompt, schema, imagePath) {
        try {
            // Read image file as base64
            const base64Data = fs.readFileSync(imagePath, { encoding: 'base64' });
            // Convert Zod schema to JSON Schema for Gemini
            const jsonSchema = zodToJsonSchema(schema, { name: 'ResponseSchema' });
            // Configure model for structured JSON output with image
            const result = await this.model.generateContent({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt },
                            { inlineData: { mimeType: 'image/png', data: base64Data } },
                        ],
                    },
                ],
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: jsonSchema,
                },
            });
            // Extract text response
            const responseText = result.response.text();
            // Parse JSON
            const jsonData = JSON.parse(responseText);
            // Validate against Zod schema
            const validated = schema.parse(jsonData);
            return validated;
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Gemini API error: ${error.message}`);
            }
            throw error;
        }
    }
}
//# sourceMappingURL=gemini-client.js.map