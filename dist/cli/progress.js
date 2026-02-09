// Reusable CLI progress utilities
import ora from 'ora';
/**
 * Creates an ora spinner with consistent styling.
 */
export function createSpinner(text) {
    return ora({
        text,
        color: 'cyan',
        spinner: 'dots',
    });
}
/**
 * Wraps an async function with a spinner that auto-succeeds or fails.
 * Returns the result of the async function on success.
 * Re-throws the error on failure after displaying spinner.fail().
 */
export async function withSpinner(text, fn) {
    const spinner = createSpinner(text).start();
    try {
        const result = await fn();
        spinner.succeed(`${text} done`);
        return result;
    }
    catch (error) {
        spinner.fail(`${text} failed`);
        throw error;
    }
}
//# sourceMappingURL=progress.js.map