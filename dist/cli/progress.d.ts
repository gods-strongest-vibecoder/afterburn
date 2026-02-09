import { Ora } from 'ora';
/**
 * Creates an ora spinner with consistent styling.
 */
export declare function createSpinner(text: string): Ora;
/**
 * Wraps an async function with a spinner that auto-succeeds or fails.
 * Returns the result of the async function on success.
 * Re-throws the error on failure after displaying spinner.fail().
 */
export declare function withSpinner<T>(text: string, fn: () => Promise<T>): Promise<T>;
