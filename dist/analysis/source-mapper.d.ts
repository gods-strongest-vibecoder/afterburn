import { SourceLocation } from './diagnosis-schema.js';
/**
 * Map a single error message to source code location
 * Returns null if source path invalid, timeout occurs, or no match found
 *
 * Uses a cancelled flag so that when the timeout fires, the ts-morph scanning
 * loop exits early and the Project reference is released for GC. Without this,
 * Promise.race would leave the AST work running and consuming CPU/memory
 * indefinitely on large codebases.
 */
export declare function mapErrorToSource(errorMessage: string, sourcePath: string): Promise<SourceLocation | null>;
/**
 * Map multiple errors to source locations in a single batch.
 * Shares 10-second timeout across all searches for efficiency.
 * Uses cancellation flag to stop work when timeout fires (same pattern as mapErrorToSource).
 */
export declare function mapMultipleErrors(errors: Array<{
    message: string;
}>, sourcePath: string): Promise<Map<string, SourceLocation>>;
