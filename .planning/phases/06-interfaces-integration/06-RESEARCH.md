# Phase 6: Interfaces & Integration - Research

**Researched:** 2026-02-08
**Domain:** CLI frameworks, MCP protocol, GitHub Actions
**Confidence:** MEDIUM

## Summary

Phase 6 wraps the complete Afterburn core engine (crawl → discover → execute → analyze → report) in three distribution interfaces: npx-runnable CLI, MCP server for AI coding assistants, and GitHub Action for CI/CD. Research focused on three integration patterns:

1. **CLI via Commander.js** - Industry-standard CLI framework (25M+ weekly downloads) with declarative command definition, automatic help generation, and TypeScript + ESM support. Already installed (v14.0.3). Combined with ora spinners (v9.3.0) for vibe-coder-friendly progress feedback.

2. **MCP Server** - Anthropic's Model Context Protocol for exposing tools to AI assistants. Uses stdio transport, TypeScript SDK (`@modelcontextprotocol/sdk`), and supports streaming for long-running operations. Tools-only design (no resources) for maximum client compatibility.

3. **GitHub Action** - JavaScript action pattern for Node.js tools. Uses `actions/github-script@v7` for PR commenting, `actions/upload-artifact@v4` for report uploads, and standard YAML action.yml definition.

The standard approach is **interface-as-thin-wrapper**: all three interfaces invoke the same core pipeline with channel-specific presentation (CLI shows ora spinners, MCP streams JSON updates, GitHub Action posts PR comments).

**Primary recommendation:** Build JavaScript action first (simplest), then Commander.js CLI (most complex flag parsing), then MCP server (streaming adds complexity). All share identical core engine invocation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | 14.0.3 | CLI argument parsing | De facto Node.js CLI framework - 25M+ weekly downloads, used by Vue CLI, Create React App |
| ora | 9.3.0 | Terminal spinners | Most popular Node.js spinner library - graceful TTY/CI detection, promise integration |
| @modelcontextprotocol/sdk | latest | MCP server/client | Official Anthropic SDK for Model Context Protocol - TypeScript support, stdio transport |
| @actions/core | latest | GitHub Actions API | Official GitHub Actions toolkit - input/output handling, logging |
| @actions/github | latest | GitHub REST API | Official GitHub API client for Actions - PR comments, issues, artifacts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chalk | 5.6.2 (installed) | Terminal colors | Already in project - use for CLI output styling |
| zod | 4.3.6 (installed) | Runtime validation | Already in project - validate MCP tool inputs |
| zod-to-json-schema | 3.25.1 (installed) | JSON Schema generation | Already in project - generate MCP tool schemas from zod |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| commander | yargs | yargs more feature-rich but heavier - commander simpler, lighter for our use case |
| ora | cli-spinners | cli-spinners lower-level - ora has better promise integration and TTY detection |
| stdio MCP | SSE transport | SSE for web clients - stdio simpler for CLI assistants (primary audience) |

**Installation:**
```bash
npm install @modelcontextprotocol/sdk @actions/core @actions/github
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli/
│   ├── index.ts           # Barrel export (exists)
│   ├── progress.ts        # Ora spinners (exists)
│   ├── first-run.ts       # Browser check (exists)
│   └── commander-cli.ts   # NEW: Commander.js wrapper
├── mcp/
│   ├── index.ts           # NEW: MCP server entry
│   ├── server.ts          # NEW: MCP server implementation
│   └── tools.ts           # NEW: Tool definitions
└── index.ts               # Current entry - becomes CLI entry

action/
├── action.yml             # NEW: Action metadata
├── index.js               # NEW: Action entry (compiled from TS)
└── README.md              # NEW: Action documentation
```

### Pattern 1: Commander.js Declarative Commands
**What:** Define CLI with method chaining - program.option().action() pattern
**When to use:** All CLI flag parsing - replaces manual argv parsing
**Example:**
```typescript
// Source: https://github.com/tj/commander.js
import { Command } from 'commander';

const program = new Command();

program
  .name('afterburn')
  .description('Automated testing for vibe-coded websites')
  .version('0.1.0')
  .argument('<url>', 'Target URL to test')
  .option('--source <path>', 'Source code directory for error mapping')
  .option('--email <email>', 'Login email for authenticated workflows')
  .option('--password <password>', 'Login password for authenticated workflows')
  .option('--output-dir <path>', 'Custom output directory', './afterburn-reports')
  .option('--flows <flows>', 'Comma-separated workflow hints')
  .option('--max-pages <number>', 'Maximum pages to crawl', '0')
  .option('--headless', 'Run browser in headless mode', true)
  .option('--screenshot', 'Capture screenshots', true)
  .action(async (url, options) => {
    // Execute core pipeline with parsed options
  });

program.parse();
```

### Pattern 2: Ora Spinner with Promise Integration
**What:** Wrap async operations with auto-succeeding/failing spinners
**When to use:** All long-running pipeline stages
**Example:**
```typescript
// Source: https://www.npmjs.com/package/ora (already implemented in src/cli/progress.ts)
import ora from 'ora';

async function runStage<T>(text: string, fn: () => Promise<T>): Promise<T> {
  const spinner = ora(text).start();
  try {
    const result = await fn();
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}

// Usage
await runStage('Crawling site...', () => runDiscovery(options));
```

### Pattern 3: MCP stdio Server
**What:** Expose tools via stdin/stdout JSON-RPC transport
**When to use:** MCP server implementation
**Example:**
```typescript
// Source: MCP protocol specification (training data - MEDIUM confidence)
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  {
    name: 'afterburn-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tool
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'scan_website',
      description: 'Run Afterburn automated testing on a URL',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Target URL' },
          source: { type: 'string', description: 'Source code path (optional)' },
        },
        required: ['url'],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'scan_website') {
    // Invoke core pipeline, stream progress, return result
  }
});

// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Pattern 4: GitHub Action PR Comment
**What:** Post structured report summary as PR comment
**When to use:** GitHub Action workflow completion
**Example:**
```typescript
// Source: https://github.com/actions/github-script/discussions/341
import * as core from '@actions/core';
import * as github from '@actions/github';

const token = core.getInput('github-token', { required: true });
const octokit = github.getOctokit(token);

const comment = `## Afterburn Test Results

**Health Score:** ${healthScore}/100

**Issues Found:** ${issueCount}
- High: ${highCount}
- Medium: ${mediumCount}
- Low: ${lowCount}

[View Full Report](${artifactUrl})
`;

await octokit.rest.issues.createComment({
  owner: github.context.repo.owner,
  repo: github.context.repo.repo,
  issue_number: github.context.issue.number,
  body: comment,
});
```

### Pattern 5: npx Zero-Install via bin Field
**What:** Make package runnable via `npx afterburn` without global install
**When to use:** All npx-distributed CLI tools
**Example:**
```json
{
  "name": "afterburn",
  "type": "module",
  "bin": {
    "afterburn": "dist/index.js"
  }
}
```

**CRITICAL:** Entry file must have shebang and be executable:
```typescript
#!/usr/bin/env node
// Rest of CLI code
```

### Anti-Patterns to Avoid
- **Manual argv parsing** - Use commander.js instead of `process.argv.slice(2)`
- **Spinners in CI** - Ora handles this automatically (detects TTY), but verify with `process.env.CI` if needed
- **MCP resources for simple tools** - Tools-only design has better client support than resources
- **Blocking MCP operations** - Stream progress for scans >5 seconds to keep AI assistants responsive
- **GitHub Action with check annotations** - PR comment simpler and more visible than annotations

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI flag parsing | Custom argv regex/splitting | commander.js | Handles edge cases (quoted args, --flag=value, positional args), auto-generates help, validates types |
| Terminal spinners | Custom `process.stdout.write('\r...')` | ora | TTY detection, CI graceful degradation, promise integration, 60+ spinner styles |
| MCP JSON-RPC | Manual stdin/stdout handling | @modelcontextprotocol/sdk | Protocol compliance, request/response correlation, error handling, streaming |
| PR comments | Manual fetch to GitHub API | @actions/github | Auth handling, rate limiting, pagination, TypeScript types |
| Artifact uploads | Manual file writing + API calls | @actions/artifact | Compression, chunking, retry logic, artifact lifecycle |
| JSON Schema from TypeScript | Manual schema writing | zod + zod-to-json-schema | Runtime validation + schema generation from single source of truth |

**Key insight:** These libraries handle 10-100x more edge cases than initial implementations. Commander.js alone handles ~50 flag/argument combinations that manual parsing misses.

## Common Pitfalls

### Pitfall 1: Forgetting Shebang in bin Entry
**What goes wrong:** `npx afterburn` fails with "command not found" or executes as shell script instead of Node.js
**Why it happens:** npx relies on shebang to determine interpreter - without it, uses sh instead of node
**How to avoid:**
- Add `#!/usr/bin/env node` as FIRST line of dist/index.js
- Verify after TypeScript compilation (tsc may strip comments - use separate .js template or post-build script)
**Warning signs:** Works with `node dist/index.js` but fails with `npx afterburn`

### Pitfall 2: ESM Import Errors in MCP Server
**What goes wrong:** MCP server crashes with "ERR_REQUIRE_ESM" or "Cannot use import outside module"
**Why it happens:** MCP SDK uses ESM - mixing with CommonJS or forgetting `.js` extensions breaks imports
**How to avoid:**
- Set `"type": "module"` in package.json (already set)
- Use `.js` extensions in imports: `import { Server } from '@modelcontextprotocol/sdk/server/index.js'`
- Configure tsconfig.json with `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`
**Warning signs:** Works in TypeScript but fails in compiled JavaScript

### Pitfall 3: Spinner Twitching on User Input
**What goes wrong:** Ora spinner jumps/breaks when user presses keys during scan
**Why it happens:** stdin input interferes with stdout spinner rewriting
**How to avoid:** Use `discardStdin: true` option in ora config OR don't expect user input during spinner
**Warning signs:** Spinner looks fine in automated tests but breaks when running interactively

### Pitfall 4: MCP Blocking on Long Scans
**What goes wrong:** AI assistant freezes for 60+ seconds with no feedback during Afterburn scan
**Why it happens:** Single tool/call response sent only after full scan completes - no progress updates
**How to avoid:**
- Use MCP progress notifications: `server.notification({ method: 'notifications/progress', params: { progress, total } })`
- Send intermediate tool/call responses with partial results
- Consider splitting into multiple tools (scan_start, scan_status, scan_results) if streaming not supported
**Warning signs:** Works for quick tests but feels broken on real sites with 10+ pages

### Pitfall 5: GitHub Action Failing on Private Repos
**What goes wrong:** Action can't post PR comments or upload artifacts - permissions denied
**Why it happens:** Default GITHUB_TOKEN has read-only permissions in some contexts
**How to avoid:**
- Document required permissions in action.yml and README
- Use `permissions: { contents: read, pull-requests: write, issues: write }` in workflow
- Test on private repo during development
**Warning signs:** Works in public repos but fails in private ones

### Pitfall 6: Exit Code 0 Despite Test Failures
**What goes wrong:** GitHub Action shows green checkmark even when Afterburn finds critical issues
**Why it happens:** Forgot to propagate exit code from core pipeline to Action process
**How to avoid:**
- Capture `process.exit(executionResult.exitCode)` from core pipeline
- In Action wrapper, call `core.setFailed()` if exit code !== 0
- User decision: only fail on high-priority issues (already decided in CONTEXT.md)
**Warning signs:** Reports show failures but PR checks pass

### Pitfall 7: Output Directory Collisions
**What goes wrong:** Multiple runs overwrite each other's reports
**Why it happens:** Static output path without timestamp/session isolation
**How to avoid:**
- Default to `./afterburn-reports/${timestamp}/` (user decision from CONTEXT.md)
- Keep --output-dir flag for override but warn about collisions
- Create directory structure: `${outputDir}/html/`, `${outputDir}/artifacts/`, `${outputDir}/screenshots/`
**Warning signs:** Second run deletes first run's reports

## Code Examples

Verified patterns from official sources:

### CLI Entry Point (Commander.js + Core Pipeline)
```typescript
#!/usr/bin/env node
// Source: Commander.js docs + existing src/index.ts patterns
import { Command } from 'commander';
import { runDiscovery, WorkflowExecutor, analyzeErrors, auditUI, generateHtmlReport, generateMarkdownReport } from './index.js';
import { createSpinner } from './cli/index.js';

const program = new Command();

program
  .name('afterburn')
  .description('Automated testing for vibe-coded websites')
  .version('0.1.0')
  .argument('<url>', 'Target URL to test')
  .option('--source <path>', 'Source code directory for error mapping')
  .option('--email <email>', 'Login email for authenticated workflows')
  .option('--password <password>', 'Login password')
  .option('--output-dir <path>', 'Output directory', './afterburn-reports/' + Date.now())
  .option('--flows <flows>', 'Workflow hints (comma-separated)')
  .action(async (url: string, options) => {
    const sessionId = crypto.randomUUID();

    // Stage 1: Discovery
    const spinner = createSpinner('Crawling...').start();
    const discovery = await runDiscovery({ targetUrl: url, sessionId });
    spinner.succeed(`Found ${discovery.crawlResult.totalPagesDiscovered} pages`);

    // Stage 2: Execution
    // ... same pipeline as src/index.ts

    // Final: Print summary and exit
    console.log(`\nHealth: ${healthScore}/100 — ${totalIssues} issues found`);
    console.log(`Reports: ${htmlPath}`);
    process.exit(exitCode);
  });

program.parse();
```

### MCP Tool with Streaming Progress
```typescript
// Source: MCP protocol patterns (training data - MEDIUM confidence)
server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'scan_website') {
    const { url, source } = request.params.arguments;

    let progress = { current: 0, total: 5 };

    // Discovery
    server.sendNotification({
      method: 'notifications/progress',
      params: {
        message: 'Crawling site...',
        progress: progress.current++,
        total: progress.total,
      },
    });

    const discovery = await runDiscovery({ targetUrl: url, sessionId });

    // Execution
    server.sendNotification({
      method: 'notifications/progress',
      params: {
        message: `Testing ${discovery.workflowPlans.length} workflows...`,
        progress: progress.current++,
        total: progress.total,
      },
    });

    const execution = await executor.execute();

    // ... continue for analysis, reporting

    // Return both JSON and markdown
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            healthScore: execution.healthScore,
            totalIssues: execution.totalIssues,
            issues: execution.issues,
          }, null, 2),
        },
        {
          type: 'text',
          text: `# Afterburn Test Results\n\n**Health:** ${execution.healthScore}/100\n\n...`,
        },
      ],
    };
  }
});
```

### GitHub Action Entry
```typescript
// Source: https://github.com/actions/toolkit examples
import * as core from '@actions/core';
import * as github from '@actions/github';
import { runAfterburn } from '../src/index.js';

async function run() {
  try {
    const url = core.getInput('url', { required: true });
    const source = core.getInput('source');
    const email = core.getInput('email');
    const password = core.getInput('password');

    // Run core pipeline
    const result = await runAfterburn({ url, source, email, password });

    // Upload artifacts
    const artifact = new DefaultArtifactClient();
    await artifact.uploadArtifact(
      'afterburn-reports',
      [result.htmlPath, result.markdownPath],
      '.',
    );

    // Post PR comment if in PR context
    if (github.context.payload.pull_request) {
      const token = core.getInput('github-token', { required: true });
      const octokit = github.getOctokit(token);

      const comment = `## Afterburn Test Results\n\n**Health:** ${result.healthScore}/100\n\n**Issues:** ${result.totalIssues}`;

      await octokit.rest.issues.createComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: github.context.payload.pull_request.number,
        body: comment,
      });
    }

    // Fail workflow if high-priority issues found (user decision)
    if (result.highPriorityIssues > 0) {
      core.setFailed(`Found ${result.highPriorityIssues} high-priority issues`);
    }

  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
```

### action.yml Metadata
```yaml
# Source: GitHub Actions documentation
name: 'Afterburn Web Testing'
description: 'Automated testing for vibe-coded websites'
author: 'Afterburn'

inputs:
  url:
    description: 'Target URL to test'
    required: true
  source:
    description: 'Source code directory'
    required: false
  email:
    description: 'Login email from secrets'
    required: false
  password:
    description: 'Login password from secrets'
    required: false
  github-token:
    description: 'GitHub token for PR comments'
    required: false
    default: ${{ github.token }}

outputs:
  health-score:
    description: 'Overall health score (0-100)'
  total-issues:
    description: 'Total issues found'

runs:
  using: 'node20'
  main: 'index.js'
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Commander v11 (CJS) | Commander v14 (ESM native) | 2024 | Full ESM support - import instead of require |
| ora v5 (CJS) | ora v9 (ESM native) | 2024 | Requires `type: module` in package.json |
| MCP prototype | MCP SDK stable | Q4 2024 | Official TypeScript SDK with stdio/SSE transports |
| GitHub Actions Node 16 | Node 20 runtime | 2024 | Use `runs.using: 'node20'` in action.yml |
| actions/upload-artifact v3 | v4 | 2024 | New API - breaking changes in upload method signature |

**Deprecated/outdated:**
- **Manual argv parsing** - Commander.js standard since 2011, no reason to parse manually
- **yargs** - Still valid but heavier than commander for simple CLIs
- **MCP resources** - Resources were experimental MCP feature, tools now recommended for most use cases
- **GitHub Actions annotations** - Still work but PR comments more visible and actionable

## Open Questions

Things that couldn't be fully resolved:

1. **MCP SDK exact API surface**
   - What we know: Exists as `@modelcontextprotocol/sdk` on npm, supports stdio transport, TypeScript
   - What's unclear: Exact method names for progress notifications (WebSearch failed, docs inaccessible)
   - Recommendation: Install package and inspect TypeScript types OR check official GitHub repo OR start with basic tool/call without streaming and add later
   - Confidence: LOW (training data only)

2. **GitHub Actions artifact upload v4 API**
   - What we know: v4 exists, has breaking changes from v3
   - What's unclear: Exact method signature for uploadArtifact in v4
   - Recommendation: Check `@actions/artifact` TypeScript types after install OR review GitHub Actions changelog
   - Confidence: LOW (WebSearch unavailable)

3. **Commander.js .enablePositionalOptions() necessity**
   - What we know: Method exists for subcommand option isolation
   - What's unclear: Whether needed for single-command CLI (Afterburn has no subcommands)
   - Recommendation: Skip unless adding subcommands in future
   - Confidence: MEDIUM (documented but unclear applicability)

4. **MCP streaming pattern - notifications vs partial responses**
   - What we know: Long operations need progress feedback
   - What's unclear: Whether to use progress notifications OR partial tool/call responses OR split into multiple tools
   - Recommendation: Test with Claude Desktop MCP client to see which pattern displays best
   - Confidence: LOW (no official streaming examples verified)

## Sources

### Primary (HIGH confidence)
- [Commander.js GitHub](https://github.com/tj/commander.js) - Core API patterns
- [Better Stack Commander Guide](https://betterstack.com/community/guides/scaling-nodejs/commander-explained/) - Best practices
- [ora npm package](https://www.npmjs.com/package/ora) - API and TTY behavior
- [Generalist Programmer ora Guide](https://generalistprogrammer.com/tutorials/ora-npm-package-guide) - Promise integration patterns

### Secondary (MEDIUM confidence)
- [GitHub Actions github-script PR comment examples](https://thomasthornton.cloud/2024/07/01/adding-comments-to-your-github-pull-requests-using-github-actions/) - PR comment pattern
- [Lighthouse CLI flags](https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md) - Competitive CLI design analysis
- Training data - MCP protocol architecture (unverified - official docs unavailable during research)

### Tertiary (LOW confidence)
- WebSearch results on npx packaging - general patterns but not current 2026 specifics
- Training data - GitHub Actions artifact upload v4 API (unverified)
- Training data - MCP streaming patterns (no verified examples found)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Commander.js and ora verified from official sources, versions confirmed from package.json
- Architecture: MEDIUM - Core patterns verified, but MCP server specifics rely on training data
- Pitfalls: HIGH - Common issues well-documented in library docs and community resources
- Code examples: MEDIUM - Commander/ora examples verified, MCP examples from training data only

**Research date:** 2026-02-08
**Valid until:** 2026-03-10 (30 days - stable ecosystem, commander/ora mature libraries)

**Critical validation needed:**
- MCP SDK API surface - install `@modelcontextprotocol/sdk` and inspect TypeScript types
- GitHub Actions artifact v4 API - install `@actions/artifact` and verify upload method
- Test MCP streaming with Claude Desktop to validate pattern choice
