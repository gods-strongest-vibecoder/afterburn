import type { ArtifactMetadata } from '../types/artifacts.js';
/**
 * Manages JSON artifact storage with save/load/cleanup operations
 */
export declare class ArtifactStorage {
    private readonly baseDir;
    private currentSessionId?;
    constructor(baseDir?: string);
    private buildFilename;
    /**
     * Saves an artifact as a versioned JSON file
     * @param artifact - Artifact with metadata
     * @returns Filepath where artifact was saved
     */
    save<T extends ArtifactMetadata>(artifact: T): Promise<string>;
    /**
     * Loads an artifact from storage
     * @param stage - Pipeline stage name
     * @param sessionId - Session UUID
     * @returns Parsed artifact
     * @throws Error if artifact not found
     */
    load<T extends ArtifactMetadata>(stage: string, sessionId: string): Promise<T>;
    /**
     * Checks if an artifact exists
     * @param stage - Pipeline stage name
     * @param sessionId - Session UUID
     * @returns True if artifact file exists
     */
    exists(stage: string, sessionId: string): Promise<boolean>;
    /**
     * Lists all artifact files, optionally filtered by stage
     * @param stage - Optional stage prefix to filter by
     * @returns Array of artifact filenames
     */
    list(stage?: string): Promise<string[]>;
    /**
     * Removes artifacts older than specified days based on file modification time.
     * Excludes artifacts from the current session.
     * @param olderThanDays - Age threshold in days (default: 7). Set to 0 to clean all old artifacts.
     * @returns Count of deleted files
     */
    cleanup(olderThanDays?: number): Promise<number>;
}
