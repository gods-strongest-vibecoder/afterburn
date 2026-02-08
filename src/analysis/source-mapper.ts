// Cross-references browser errors with TypeScript/JavaScript source code using AST analysis

import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import fs from 'fs-extra';
import { SourceLocation } from './diagnosis-schema.js';

/**
 * Extract search terms from error messages to find relevant code locations
 */
function extractSearchTerms(errorMessage: string): string[] {
  // Strip common error prefixes
  let cleaned = errorMessage
    .replace(/^(Error|TypeError|ReferenceError|SyntaxError|RangeError):\s*/i, '')
    .trim();

  const terms: Set<string> = new Set();

  // Extract quoted strings (between ', ", or `)
  const quotedRegex = /['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = quotedRegex.exec(cleaned)) !== null) {
    terms.add(match[1]);
  }

  // Extract identifiers after "Cannot read property" / "Cannot read properties of"
  const propertyMatch = cleaned.match(/Cannot read propert(?:y|ies)(?: of)? ['"`]?(\w+)['"`]?/i);
  if (propertyMatch) {
    terms.add(propertyMatch[1]);
  }

  // Extract identifiers before "is not a function" / "is not defined"
  const functionMatch = cleaned.match(/(\w+)\s+is not (?:a function|defined)/i);
  if (functionMatch) {
    terms.add(functionMatch[1]);
  }

  // Extract URL path segments that look like route handlers
  const pathMatch = cleaned.match(/\/([a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*)/gi);
  if (pathMatch) {
    pathMatch.forEach(p => {
      const segments = p.split('/').filter(s => s && s.length > 2);
      segments.forEach(seg => terms.add(seg));
    });
  }

  // Extract camelCase and PascalCase identifiers
  const identifierRegex = /\b([a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*|[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)*)\b/g;
  while ((match = identifierRegex.exec(cleaned)) !== null) {
    terms.add(match[1]);
  }

  // Filter out common words and noise
  const stopWords = new Set(['undefined', 'null', 'object', 'string', 'number', 'the', 'of', 'is', 'at', 'in', 'on', 'to', 'a', 'an']);
  const filtered = Array.from(terms).filter(term =>
    term.length > 2 && !stopWords.has(term.toLowerCase())
  );

  // Sort by length (longer = more specific = search first)
  return filtered.sort((a, b) => b.length - a.length);
}

/**
 * Map a single error message to source code location
 * Returns null if source path invalid, timeout occurs, or no match found
 *
 * Uses a cancelled flag so that when the timeout fires, the ts-morph scanning
 * loop exits early and the Project reference is released for GC. Without this,
 * Promise.race would leave the AST work running and consuming CPU/memory
 * indefinitely on large codebases.
 */
export async function mapErrorToSource(
  errorMessage: string,
  sourcePath: string
): Promise<SourceLocation | null> {
  let cancelled = false;
  let projectRef: Project | null = null;

  // 10-second timeout protection — sets cancellation flag and releases ts-morph Project
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      cancelled = true;
      projectRef = null; // Release for GC
      resolve(null);
    }, 10000);
  });

  const searchPromise = async (): Promise<SourceLocation | null> => {
    try {
      // Validate source path exists
      if (!await fs.pathExists(sourcePath)) {
        console.warn(`[source-mapper] Source path does not exist: ${sourcePath}`);
        return null;
      }

      // Initialize ts-morph project
      projectRef = new Project({
        skipAddingFilesFromTsConfig: true,
      });

      // Try to load from tsconfig.json
      const tsconfigPath = path.join(sourcePath, 'tsconfig.json');
      if (await fs.pathExists(tsconfigPath)) {
        projectRef.addSourceFilesFromTsConfig(tsconfigPath);
      } else {
        // Fallback: manually add .ts/.tsx/.js/.jsx files
        const patterns = [
          path.join(sourcePath, '**/*.ts'),
          path.join(sourcePath, '**/*.tsx'),
          path.join(sourcePath, '**/*.js'),
          path.join(sourcePath, '**/*.jsx'),
        ];
        projectRef.addSourceFilesAtPaths(patterns);
      }

      if (cancelled) return null;

      const sourceFiles = projectRef.getSourceFiles();
      if (sourceFiles.length === 0) {
        console.warn(`[source-mapper] No source files found in: ${sourcePath}`);
        return null;
      }

      // Extract search terms from error message
      const searchTerms = extractSearchTerms(errorMessage);
      if (searchTerms.length === 0) {
        return null;
      }

      // Search all source files for matches
      interface Match {
        file: string;
        line: number;
        context: string;
        score: number;
      }

      const matches: Match[] = [];

      for (const sourceFile of sourceFiles) {
        // Check cancellation between files to avoid wasted CPU on timeout
        if (cancelled) return null;

        const filePath = sourceFile.getFilePath();

        // Search function declarations and arrow functions
        sourceFile.getFunctions().forEach(fn => {
          const name = fn.getName();
          if (name && searchTerms.some(term => name.includes(term))) {
            const score = searchTerms.some(term => name === term) ? 10 : 5;
            matches.push({
              file: filePath,
              line: fn.getStartLineNumber(),
              context: fn.getText().slice(0, 200),
              score,
            });
          }
        });

        // Search arrow functions in variable declarations
        sourceFile.getVariableDeclarations().forEach(varDecl => {
          const name = varDecl.getName();
          const initializer = varDecl.getInitializer();
          if (initializer?.getKind() === SyntaxKind.ArrowFunction) {
            if (searchTerms.some(term => name.includes(term))) {
              const score = searchTerms.some(term => name === term) ? 10 : 5;
              matches.push({
                file: filePath,
                line: varDecl.getStartLineNumber(),
                context: varDecl.getText().slice(0, 200),
                score,
              });
            }
          }
        });

        // Search class declarations
        sourceFile.getClasses().forEach(cls => {
          const name = cls.getName();
          if (name && searchTerms.some(term => name.includes(term))) {
            const score = searchTerms.some(term => name === term) ? 10 : 5;
            matches.push({
              file: filePath,
              line: cls.getStartLineNumber(),
              context: cls.getText().slice(0, 200),
              score,
            });
          }
        });

        // Search string literals
        sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral).forEach(str => {
          const text = str.getLiteralText();
          if (searchTerms.some(term => text.includes(term))) {
            matches.push({
              file: filePath,
              line: str.getStartLineNumber(),
              context: str.getParent()?.getText().slice(0, 200) || text,
              score: 3,
            });
          }
        });
      }

      // Return highest-scoring match
      if (matches.length === 0) {
        return null;
      }

      matches.sort((a, b) => b.score - a.score);
      const best = matches[0];

      return {
        file: path.relative(sourcePath, best.file),
        line: best.line,
        context: best.context,
      };
    } catch (error) {
      // Graceful degradation on any ts-morph errors
      console.warn(`[source-mapper] Failed to analyze source:`, error);
      return null;
    } finally {
      projectRef = null; // Ensure GC can collect ts-morph resources
    }
  };

  // Race between search and timeout
  return Promise.race([searchPromise(), timeoutPromise]);
}

/**
 * Map multiple errors to source locations in a single batch.
 * Shares 10-second timeout across all searches for efficiency.
 * Uses cancellation flag to stop work when timeout fires (same pattern as mapErrorToSource).
 */
export async function mapMultipleErrors(
  errors: Array<{ message: string }>,
  sourcePath: string
): Promise<Map<string, SourceLocation>> {
  const results = new Map<string, SourceLocation>();
  let cancelled = false;
  let projectRef: Project | null = null;

  // 10-second timeout for entire batch — cancels ongoing work and frees ts-morph memory
  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      cancelled = true;
      projectRef = null;
      resolve();
    }, 10000);
  });

  const batchSearchPromise = async (): Promise<void> => {
    try {
      // Validate source path exists
      if (!await fs.pathExists(sourcePath)) {
        console.warn(`[source-mapper] Source path does not exist: ${sourcePath}`);
        return;
      }

      // Initialize ts-morph project ONCE
      projectRef = new Project({
        skipAddingFilesFromTsConfig: true,
      });

      const tsconfigPath = path.join(sourcePath, 'tsconfig.json');
      if (await fs.pathExists(tsconfigPath)) {
        projectRef.addSourceFilesFromTsConfig(tsconfigPath);
      } else {
        const patterns = [
          path.join(sourcePath, '**/*.ts'),
          path.join(sourcePath, '**/*.tsx'),
          path.join(sourcePath, '**/*.js'),
          path.join(sourcePath, '**/*.jsx'),
        ];
        projectRef.addSourceFilesAtPaths(patterns);
      }

      if (cancelled) return;

      const sourceFiles = projectRef.getSourceFiles();
      if (sourceFiles.length === 0) {
        return;
      }

      // Search for each error
      for (const error of errors) {
        if (cancelled) return;

        const searchTerms = extractSearchTerms(error.message);
        if (searchTerms.length === 0) continue;

        interface Match {
          file: string;
          line: number;
          context: string;
          score: number;
        }

        const matches: Match[] = [];

        for (const sourceFile of sourceFiles) {
          if (cancelled) return;

          const filePath = sourceFile.getFilePath();

          // Search functions
          sourceFile.getFunctions().forEach(fn => {
            const name = fn.getName();
            if (name && searchTerms.some(term => name.includes(term))) {
              const score = searchTerms.some(term => name === term) ? 10 : 5;
              matches.push({
                file: filePath,
                line: fn.getStartLineNumber(),
                context: fn.getText().slice(0, 200),
                score,
              });
            }
          });

          // Search arrow functions
          sourceFile.getVariableDeclarations().forEach(varDecl => {
            const name = varDecl.getName();
            const initializer = varDecl.getInitializer();
            if (initializer?.getKind() === SyntaxKind.ArrowFunction) {
              if (searchTerms.some(term => name.includes(term))) {
                const score = searchTerms.some(term => name === term) ? 10 : 5;
                matches.push({
                  file: filePath,
                  line: varDecl.getStartLineNumber(),
                  context: varDecl.getText().slice(0, 200),
                  score,
                });
              }
            }
          });

          // Search classes
          sourceFile.getClasses().forEach(cls => {
            const name = cls.getName();
            if (name && searchTerms.some(term => name.includes(term))) {
              const score = searchTerms.some(term => name === term) ? 10 : 5;
              matches.push({
                file: filePath,
                line: cls.getStartLineNumber(),
                context: cls.getText().slice(0, 200),
                score,
              });
            }
          });

          // Search string literals
          sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral).forEach(str => {
            const text = str.getLiteralText();
            if (searchTerms.some(term => text.includes(term))) {
              matches.push({
                file: filePath,
                line: str.getStartLineNumber(),
                context: str.getParent()?.getText().slice(0, 200) || text,
                score: 3,
              });
            }
          });
        }

        // Store best match
        if (matches.length > 0) {
          matches.sort((a, b) => b.score - a.score);
          const best = matches[0];
          results.set(error.message, {
            file: path.relative(sourcePath, best.file),
            line: best.line,
            context: best.context,
          });
        }
      }
    } catch (error) {
      console.warn(`[source-mapper] Batch analysis failed:`, error);
    } finally {
      projectRef = null; // Ensure GC can collect ts-morph resources
    }
  };

  // Race between batch search and timeout
  await Promise.race([batchSearchPromise(), timeoutPromise]);
  return results;
}
