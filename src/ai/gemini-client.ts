// Gemini 2.5 Flash API client with structured JSON output support

import { GoogleGenerativeAI, GenerativeModel, type GenerateContentResult } from '@google/generative-ai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import fs from 'node:fs';
import { redactSensitiveData } from '../utils/sanitizer.js';

/**
 * Reusable Gemini 2.5 Flash client for structured and unstructured generation.
 * Used for workflow planning (Phase 2), error diagnosis (Phase 4), and report generation (Phase 5).
 */
export class GeminiClient {
  private model: GenerativeModel;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;

    if (!key) {
      throw new Error(
        'GEMINI_API_KEY not set. Get one at https://aistudio.google.com/apikey'
      );
    }

    const genAI = new GoogleGenerativeAI(key);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Generate structured JSON output validated against a Zod schema
   */
  async generateStructured<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
    try {
      // Convert Zod schema to JSON Schema for Gemini
      const jsonSchema = zodToJsonSchema(schema as any, { name: 'ResponseSchema' });

      // Configure model for structured JSON output
      const result: GenerateContentResult = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: jsonSchema as any,
        },
      });

      // Extract text response
      const responseText = result.response.text();

      // Parse JSON
      const jsonData = JSON.parse(responseText);

      // Validate against Zod schema
      const validated = schema.parse(jsonData) as T;

      return validated;
    } catch (error) {
      if (error instanceof Error) {
        // Security: Sanitize error message to prevent API key leakage
        const sanitizedMessage = redactSensitiveData(error.message);
        throw new Error(`Gemini API error: ${sanitizedMessage}`);
      }
      throw new Error('Gemini API error: Unknown error occurred');
    }
  }

  /**
   * Generate plain text response (no schema constraints)
   */
  async generateText(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      if (error instanceof Error) {
        // Security: Sanitize error message to prevent API key leakage
        const sanitizedMessage = redactSensitiveData(error.message);
        throw new Error(`Gemini API error: ${sanitizedMessage}`);
      }
      throw new Error('Gemini API error: Unknown error occurred');
    }
  }

  /**
   * Generate structured JSON output with image input (multimodal)
   */
  async generateStructuredWithImage<T>(
    prompt: string,
    schema: z.ZodType<T>,
    imagePath: string
  ): Promise<T> {
    try {
      // Read image file as base64
      const base64Data = fs.readFileSync(imagePath, { encoding: 'base64' });

      // Convert Zod schema to JSON Schema for Gemini
      const jsonSchema = zodToJsonSchema(schema as any, { name: 'ResponseSchema' });

      // Configure model for structured JSON output with image
      const result: GenerateContentResult = await this.model.generateContent({
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
          responseSchema: jsonSchema as any,
        },
      });

      // Extract text response
      const responseText = result.response.text();

      // Parse JSON
      const jsonData = JSON.parse(responseText);

      // Validate against Zod schema
      const validated = schema.parse(jsonData) as T;

      return validated;
    } catch (error) {
      if (error instanceof Error) {
        // Security: Sanitize error message to prevent API key leakage
        const sanitizedMessage = redactSensitiveData(error.message);
        throw new Error(`Gemini API error: ${sanitizedMessage}`);
      }
      throw new Error('Gemini API error: Unknown error occurred');
    }
  }
}
