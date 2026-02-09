// JSON file persistence for pipeline artifacts with versioning and cleanup
import { join } from 'node:path';
import fs from 'fs-extra';
/**
 * Manages JSON artifact storage with save/load/cleanup operations
 */
export class ArtifactStorage {
    baseDir;
    constructor(baseDir = '.afterburn/artifacts') {
        this.baseDir = baseDir;
        fs.ensureDirSync(this.baseDir);
    }
    /**
     * Saves an artifact as a versioned JSON file
     * @param artifact - Artifact with metadata
     * @returns Filepath where artifact was saved
     */
    async save(artifact) {
        const filename = `${artifact.stage}-${artifact.sessionId}.json`;
        const filepath = join(this.baseDir, filename);
        await fs.writeJson(filepath, artifact, { spaces: 2 });
        return filepath;
    }
    /**
     * Loads an artifact from storage
     * @param stage - Pipeline stage name
     * @param sessionId - Session UUID
     * @returns Parsed artifact
     * @throws Error if artifact not found
     */
    async load(stage, sessionId) {
        const filename = `${stage}-${sessionId}.json`;
        const filepath = join(this.baseDir, filename);
        if (!(await fs.pathExists(filepath))) {
            throw new Error(`Artifact not found: ${stage}-${sessionId}`);
        }
        return fs.readJson(filepath);
    }
    /**
     * Checks if an artifact exists
     * @param stage - Pipeline stage name
     * @param sessionId - Session UUID
     * @returns True if artifact file exists
     */
    async exists(stage, sessionId) {
        const filename = `${stage}-${sessionId}.json`;
        const filepath = join(this.baseDir, filename);
        return fs.pathExists(filepath);
    }
    /**
     * Lists all artifact files, optionally filtered by stage
     * @param stage - Optional stage prefix to filter by
     * @returns Array of artifact filenames
     */
    async list(stage) {
        const files = await fs.readdir(this.baseDir);
        const jsonFiles = files.filter((f) => f.endsWith('.json'));
        if (!stage) {
            return jsonFiles;
        }
        return jsonFiles.filter((f) => f.startsWith(`${stage}-`));
    }
    /**
     * Removes artifacts older than specified days based on file modification time
     * @param olderThanDays - Age threshold in days (default: 7)
     * @returns Count of deleted files
     */
    async cleanup(olderThanDays = 7) {
        const files = await this.list();
        const now = Date.now();
        const threshold = olderThanDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
        let deletedCount = 0;
        for (const file of files) {
            const filepath = join(this.baseDir, file);
            const stats = await fs.stat(filepath);
            const age = now - stats.mtimeMs;
            if (age > threshold) {
                await fs.unlink(filepath);
                deletedCount++;
            }
        }
        return deletedCount;
    }
}
//# sourceMappingURL=artifact-storage.js.map