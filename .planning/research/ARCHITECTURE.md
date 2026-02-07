# Architecture Patterns: Afterburn

**Domain:** AI-powered web testing CLI tool
**Researched:** 2026-02-07
**Confidence:** HIGH

## Executive Summary

Afterburn should follow a **modular pipeline architecture** with event-driven communication between components. This architecture is proven in similar tools (Lighthouse, Cypress, Playwright) and enables the three form factors (CLI, MCP server, GitHub Action) to share a single core engine while maintaining clean boundaries between discovery, planning, execution, analysis, and reporting phases.

The recommended pattern uses:
- **Component-based design** with clear single responsibilities
- **Event streaming** for real-time progress updates
- **Artifact pipelines** where each stage produces reusable outputs for downstream stages
- **Plugin architecture** for future extensibility

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     INTERFACE LAYER                          │
│  ┌──────────┐  ┌───────────────┐  ┌─────────────────┐     │
│  │   CLI    │  │  MCP Server   │  │ GitHub Action   │     │
│  │ Wrapper  │  │    Wrapper    │  │    Wrapper      │     │
│  └────┬─────┘  └───────┬───────┘  └────────┬────────┘     │
└───────┼────────────────┼──────────────────┬─┼──────────────┘
        │                │                  │ │
        └────────────────┴──────────────────┘ │
                         │                    │
┌────────────────────────┼────────────────────┼──────────────┐
│                   CORE ENGINE               │              │
│                                             │              │
│  ┌──────────────────────────────────────────▼───────────┐ │
│  │              Event Bus / Orchestrator                 │ │
│  │    (coordinates pipeline, emits progress events)      │ │
│  └──┬──────┬──────┬──────┬──────┬──────┬──────┬────────┘ │
│     │      │      │      │      │      │      │           │
│  ┌──▼───┐ ┌▼────┐ ┌▼────┐ ┌▼───┐ ┌▼───┐ ┌▼───┐ ┌▼──────┐ │
│  │Crawl │ │Plan │ │Exec │ │Diag│ │UI  │ │Rpt │ │Screen │ │
│  │Disc. │ │Work │ │utor │ │Eng │ │Aud │ │Gen │ │Mgmt   │ │
│  │Engine│ │flow │ │     │ │ine │ │itor│ │    │ │       │ │
│  └──┬───┘ └──┬──┘ └──┬──┘ └──┬─┘ └──┬─┘ └──┬─┘ └───────┘ │
│     │        │       │       │      │      │              │
│  ┌──▼────────▼───────▼───────▼──────▼──────▼───────────┐ │
│  │              Artifact Storage                         │ │
│  │  (page structure, test plans, execution logs,         │ │
│  │   screenshots, error reports, final reports)          │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         │
                         │
┌────────────────────────┼─────────────────────────────────────┐
│                EXTERNAL DEPENDENCIES                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Playwright  │  │ LLM Provider │  │ File System  │      │
│  │   Browser    │  │ (OpenAI/     │  │  (temp dir)  │      │
│  │  Automation  │  │  Anthropic)  │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Component Boundaries

| Component | Responsibility | Input | Output | Communicates With |
|-----------|---------------|-------|--------|-------------------|
| **CLI Wrapper** | Parse args, display terminal output, handle user interaction | Command-line args | Exit code, formatted output | Core Engine |
| **MCP Server Wrapper** | Expose tools via MCP protocol, handle JSON-RPC | MCP requests | MCP responses | Core Engine |
| **GitHub Action Wrapper** | Read workflow inputs, post comments, artifacts | Workflow env vars | Action outputs, artifacts | Core Engine |
| **Event Bus / Orchestrator** | Coordinate pipeline stages, emit progress events, manage state | Configuration object | Progress events | All components |
| **Crawler/Discovery Engine** | Find pages, forms, buttons, interactive elements on site | Starting URL, depth limit | Sitemap artifact (JSON) | Orchestrator, Workflow Planner |
| **Workflow Planner** | Analyze sitemap, decide test order, generate test scenarios | Sitemap artifact | Test plan artifact (JSON) | Orchestrator, Executor, LLM Provider |
| **Executor** | Run Playwright scripts, capture states, handle errors | Test plan artifact | Execution log artifact (JSON) | Orchestrator, Diagnostic Engine, Screenshot Manager, Playwright |
| **Diagnostic Engine** | Analyze errors, cross-reference source code, suggest fixes | Execution log artifact, error details | Diagnostic report artifact (JSON) | Orchestrator, Report Generator, LLM Provider |
| **UI Auditor** | Analyze screenshots for layout/design issues | Screenshot files | UI audit artifact (JSON) | Orchestrator, Report Generator, LLM Provider, Screenshot Manager |
| **Report Generator** | Create HTML + Markdown reports | All artifacts | HTML + MD files | Orchestrator, File System |
| **Screenshot Manager** | Capture, optimize, store, reference screenshots | Capture requests | Screenshot references | File System, Executor, UI Auditor |
| **Artifact Storage** | Persist intermediate outputs, enable resume capability | Any artifact | Artifact by ID | All components |

## Data Flow

### Phase 1: Discovery
```
URL Input → Crawler/Discovery Engine
  ↓ (emits: crawl.started, crawl.progress, crawl.complete)
Sitemap Artifact → Artifact Storage
  ↓
Event: discovery.complete
```

**Sitemap Artifact Structure:**
```json
{
  "version": "1.0",
  "baseUrl": "https://example.com",
  "crawledAt": "2026-02-07T10:30:00Z",
  "pages": [
    {
      "url": "/",
      "title": "Home",
      "interactiveElements": [
        { "type": "button", "selector": "#cta", "text": "Get Started" }
      ],
      "forms": [
        { "action": "/signup", "method": "POST", "fields": [...] }
      ]
    }
  ]
}
```

### Phase 2: Planning
```
Sitemap Artifact → Workflow Planner
  ↓ (calls LLM with batched requests)
Test Plan Artifact → Artifact Storage
  ↓
Event: planning.complete
```

**Test Plan Artifact Structure:**
```json
{
  "version": "1.0",
  "strategy": "critical-path-first",
  "tests": [
    {
      "id": "test-001",
      "name": "Homepage loads and CTA is visible",
      "priority": "high",
      "steps": [
        { "action": "navigate", "url": "/" },
        { "action": "waitFor", "selector": "#cta" },
        { "action": "screenshot", "name": "homepage" }
      ]
    }
  ]
}
```

### Phase 3: Execution
```
Test Plan Artifact → Executor
  ↓ (runs Playwright, captures screenshots)
  ├→ Screenshot Manager (stores images)
  ↓
Execution Log Artifact → Artifact Storage
  ↓
Event: execution.complete
```

**Execution Log Artifact Structure:**
```json
{
  "version": "1.0",
  "testResults": [
    {
      "testId": "test-001",
      "status": "passed|failed|error",
      "duration": 2340,
      "screenshots": ["homepage-abc123.png"],
      "error": { "message": "...", "stack": "..." }
    }
  ]
}
```

### Phase 4: Diagnosis
```
Execution Log Artifact → Diagnostic Engine
  ↓ (calls LLM to analyze errors)
Diagnostic Report Artifact → Artifact Storage
  ↓
Event: diagnosis.complete
```

**Diagnostic Report Artifact Structure:**
```json
{
  "version": "1.0",
  "diagnostics": [
    {
      "testId": "test-001",
      "issue": "Timeout waiting for selector",
      "rootCause": "Element loaded via lazy JS",
      "suggestion": "Add explicit wait for network idle",
      "confidence": "high"
    }
  ]
}
```

### Phase 5: UI Audit
```
Screenshot Files → UI Auditor
  ↓ (calls LLM with vision API)
UI Audit Artifact → Artifact Storage
  ↓
Event: audit.complete
```

**UI Audit Artifact Structure:**
```json
{
  "version": "1.0",
  "audits": [
    {
      "screenshot": "homepage-abc123.png",
      "issues": [
        {
          "type": "contrast",
          "severity": "medium",
          "description": "Button text has low contrast ratio (3.2:1)",
          "location": "CTA button"
        }
      ]
    }
  ]
}
```

### Phase 6: Report Generation
```
All Artifacts → Report Generator
  ↓
HTML Report + MD Report → File System
  ↓
Event: reporting.complete
```

## Patterns to Follow

### Pattern 1: Event-Driven Pipeline with Artifact Persistence

**What:** Each stage produces immutable artifacts stored in a central location. Components communicate via events, not direct calls.

**When:** Use for all major pipeline stages (discovery, planning, execution, etc.)

**Why:**
- Enables resume capability (restart from any stage)
- Simplifies debugging (inspect artifacts at each stage)
- Allows parallel processing where possible
- Supports multiple output formats (CLI, MCP, GitHub Action) reading same artifacts

**Example:**
```typescript
// Orchestrator emits events
orchestrator.on('discovery.complete', async (artifact) => {
  await artifactStorage.save('sitemap', artifact);
  orchestrator.emit('planning.started', artifact);
});

// Components listen and react
workflowPlanner.on('planning.started', async (sitemap) => {
  const plan = await workflowPlanner.createPlan(sitemap);
  orchestrator.emit('planning.complete', plan);
});
```

**Source:** [Event-Driven Architecture - Microsoft Azure](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven), [Solace EDA Patterns](https://solace.com/event-driven-architecture-patterns/)

### Pattern 2: Continuous Batching for LLM Calls

**What:** Instead of sequential LLM requests, batch related prompts and process them concurrently with shared KV cache.

**When:** Use in Workflow Planner (analyzing multiple pages), Diagnostic Engine (analyzing multiple errors), UI Auditor (analyzing multiple screenshots).

**Why:**
- 23× higher throughput vs static batching
- Reduced token costs via prompt caching
- Lower latency for end-to-end pipeline

**Example:**
```typescript
// Bad: Sequential calls
for (const page of pages) {
  await llm.analyzePage(page); // Slow, expensive
}

// Good: Continuous batching
const batchedAnalysis = await llm.batchAnalyze(pages, {
  batchSize: 10,
  cacheKeyPrefix: 'page-analysis'
});
```

**Source:** [LLM Continuous Batching](https://machinelearningatscale.substack.com/p/llm-serving-1-continuous-batching), [NVIDIA LLM Optimization](https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/)

### Pattern 3: Two-Layer Screenshot Caching

**What:** Store screenshots in two formats: WebP for sharing/display (small), PNG for source truth (lossless).

**When:** Use in Screenshot Manager for all captured images.

**Why:**
- 25-35% smaller files vs PNG alone
- Faster report generation and loading
- Preserves quality for vision API analysis

**Example:**
```typescript
class ScreenshotManager {
  async capture(page: Page, name: string): Promise<ScreenshotRef> {
    const pngBuffer = await page.screenshot({ type: 'png' });
    const webpBuffer = await sharp(pngBuffer).webp().toBuffer();

    return {
      id: generateId(),
      name,
      pngPath: await this.store(pngBuffer, `${name}.png`),
      webpPath: await this.store(webpBuffer, `${name}.webp`),
      size: { png: pngBuffer.length, webp: webpBuffer.length }
    };
  }
}
```

**Source:** [WebP for Screenshots](https://lifetips.alibaba.com/tech-efficiency/choose-the-right-image-format-for-screenshots)

### Pattern 4: Microkernel Plugin Architecture

**What:** Core engine provides essential operations, plugin modules add specific features without altering core.

**When:** Design for future extensibility (e.g., adding new audit types, custom reporters, third-party integrations).

**Why:**
- Add/modify features without impacting core
- Independent development and updates
- Community can contribute plugins

**Example:**
```typescript
// Core defines plugin interface
interface AuditorPlugin {
  name: string;
  audit(artifacts: Artifacts): Promise<AuditResult>;
}

// Plugins register themselves
class AccessibilityAuditor implements AuditorPlugin {
  name = 'accessibility';
  async audit(artifacts) {
    // Custom audit logic
  }
}

// Core loads and executes plugins
class UIAuditor {
  private plugins: AuditorPlugin[] = [];

  registerPlugin(plugin: AuditorPlugin) {
    this.plugins.push(plugin);
  }

  async runAudits(artifacts) {
    return Promise.all(
      this.plugins.map(p => p.audit(artifacts))
    );
  }
}
```

**Source:** [Plugin Architecture Pattern](https://www.devleader.ca/2023/09/07/plugin-architecture-design-pattern-a-beginners-guide-to-modularity/), [Microkernel Architecture](https://www.sayonetech.com/blog/software-architecture-patterns/)

### Pattern 5: Streaming Terminal Output with Progress Bars

**What:** Real-time progress updates to CLI using spinners, progress bars, and status lines.

**When:** Use in CLI Wrapper to show pipeline progress.

**Why:**
- Users know something is happening
- Clear feedback for long operations
- Professional CLI UX

**Example:**
```typescript
import cliProgress from 'cli-progress';

const progressBar = new cliProgress.SingleBar({
  format: 'Discovery |{bar}| {percentage}% | {value}/{total} pages',
});

orchestrator.on('crawl.progress', ({ current, total }) => {
  if (!progressBar.isActive) progressBar.start(total, 0);
  progressBar.update(current);
});

orchestrator.on('crawl.complete', () => {
  progressBar.stop();
});
```

**Source:** [CLI Progress Patterns](https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays), [cli-progress npm](https://www.npmjs.com/package/cli-progress)

### Pattern 6: MCP Intent Multiplexing with Command Pattern

**What:** MCP server exposes high-level intent-based tools (e.g., `test_website`) rather than low-level primitives.

**When:** Use in MCP Server Wrapper to provide clean AI-agent interface.

**Why:**
- Reduces LLM reasoning complexity
- Encapsulates orchestration logic
- Provides guardrails and validation

**Example:**
```typescript
// Bad: Low-level tools
mcp.tool('crawl_site', ...);
mcp.tool('plan_tests', ...);
mcp.tool('execute_tests', ...);
// AI must orchestrate these correctly

// Good: Intent-based composite tool
mcp.tool('test_website', {
  description: 'Automatically test a website end-to-end',
  parameters: {
    url: 'string',
    options: { depth: 'number', focus: 'string' }
  },
  handler: async ({ url, options }) => {
    // Server orchestrates full pipeline
    const sitemap = await crawler.discover(url, options.depth);
    const plan = await planner.plan(sitemap, options.focus);
    const results = await executor.run(plan);
    const report = await reporter.generate(results);
    return report;
  }
});
```

**Source:** [Two Essential Patterns for MCP Servers](https://shaaf.dev/post/2026-01-08-two-essential-patterns-for-buildingm-mcp-servers/), [MCP Architecture Patterns](https://developer.ibm.com/articles/mcp-architecture-patterns-ai-systems/)

## Anti-Patterns to Avoid

### Anti-Pattern 1: Tightly Coupled Components

**What:** Components directly importing and calling each other (e.g., Executor directly calling Diagnostic Engine).

**Why bad:**
- Can't reuse components independently
- Hard to test in isolation
- Prevents resume capability

**Instead:** Use event-driven communication via Orchestrator. Components emit events, Orchestrator routes them.

**Source:** [Event-Driven vs Coupled Systems](https://www.confluent.io/learn/event-driven-architecture/)

### Anti-Pattern 2: Sequential LLM Calls Without Batching

**What:** Making individual LLM API calls for each page/error/screenshot analysis.

**Why bad:**
- 23× slower throughput
- Higher token costs (no cache reuse)
- Poor user experience (long wait times)

**Instead:** Use continuous batching to process multiple items concurrently with shared context.

**Source:** [LLM Batching Optimization](https://latitude-blog.ghost.io/blog/scaling-llms-with-batch-processing-ultimate-guide/)

### Anti-Pattern 3: Storing Only PNG Screenshots

**What:** Saving all screenshots as PNG without compression.

**Why bad:**
- 33% larger bundle sizes
- Slower report loading
- Unnecessary storage costs

**Instead:** Store both WebP (for display) and PNG (for source truth). Use WebP by default.

**Source:** [Image Format Optimization](https://lifetips.alibaba.com/tech-efficiency/choose-the-right-image-format-for-screenshots)

### Anti-Pattern 4: Rebuilding Pipeline for Each Form Factor

**What:** Separate implementations for CLI, MCP, and GitHub Action.

**Why bad:**
- 3× maintenance burden
- Inconsistent behavior across interfaces
- Duplicate bug fixes

**Instead:** Single Core Engine, thin wrappers for each interface. Wrappers only handle I/O format translation.

**Source:** [CLI Architecture Layering](https://www.confluent.io/blog/how-we-designed-and-architected-the-confluent-cli/)

### Anti-Pattern 5: Synchronous Blocking Operations

**What:** Waiting for each pipeline stage to complete before starting the next (e.g., waiting for all tests to finish before starting diagnostics).

**Why bad:**
- Wastes time on independent operations
- Can't show partial results
- Poor perceived performance

**Instead:** Stream results as they arrive. Start diagnostics as soon as first error occurs, generate partial reports, etc.

**Source:** [Async Patterns for CLI](https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays)

## Scalability Considerations

| Concern | At 10 pages | At 100 pages | At 1000 pages |
|---------|-------------|--------------|---------------|
| **Discovery** | Simple BFS crawl | Parallel workers, depth limit | Distributed crawling, robots.txt respect, rate limiting |
| **Screenshot Storage** | In-memory → disk | WebP compression, cleanup | S3/cloud storage, lazy loading, CDN |
| **LLM Calls** | Sequential acceptable | Batch in groups of 10 | Continuous batching, prompt caching, fallback models |
| **Report Size** | Single HTML file | Paginated sections | Separate files per page, lazy-loaded charts |
| **Memory Usage** | Load all artifacts | Stream artifacts, GC between stages | Database-backed artifacts, lazy evaluation |

## Build Order Implications

### Foundation (Week 1, Days 1-2)
**Build order:** Core Engine → Artifact Storage → Event Bus

**Rationale:** These are dependencies for all other components. Without event infrastructure, can't build pipeline.

**Key decision:** Choose between in-memory storage (simpler, faster for hackathon) vs file-based storage (enables resume, better for debugging).

**Recommendation:** File-based storage using JSON files in temp directory. Enables powerful debugging during hackathon.

### Discovery & Planning (Week 1, Days 3-4)
**Build order:** Crawler/Discovery Engine → Workflow Planner

**Rationale:** Must discover site structure before planning tests. Crawler is self-contained, good first component.

**Key decision:** Depth of crawling (shallow scan vs deep exploration) affects planning phase.

**Recommendation:** Start with fixed depth (2-3 levels), make configurable later.

### Execution & Capture (Week 1, Days 5-6)
**Build order:** Screenshot Manager → Executor

**Rationale:** Executor depends on Screenshot Manager for capturing state. Screenshot management is well-defined, build first.

**Key decision:** Whether to batch screenshots or process one-by-one.

**Recommendation:** Process sequentially during execution, optimize later.

### Analysis (Week 2, Day 1)
**Build order:** Diagnostic Engine → UI Auditor (in parallel)

**Rationale:** Both depend on execution artifacts but are independent of each other. Can build in parallel.

**Key decision:** How deep should diagnostics go? Simple error parsing vs AI-powered root cause analysis?

**Recommendation:** Start with simple error extraction, enhance with LLM analysis once basic pipeline works.

### Reporting (Week 2, Day 2)
**Build order:** Report Generator

**Rationale:** All artifacts exist, reporting is straightforward template rendering.

**Key decision:** Single report format or dual (HTML + MD)?

**Recommendation:** Build HTML first (easier to visualize), add MD export as template transformation.

### Interfaces (Week 2, Days 3-7)
**Build order:** CLI Wrapper → MCP Server → GitHub Action

**Rationale:** CLI is simplest, test end-to-end flow. MCP builds on working CLI. GitHub Action is configuration wrapper around CLI.

**Key decision:** Whether to build all three or focus on one.

**Recommendation:** CLI first (most direct testing). MCP second (demonstrates AI integration). GitHub Action if time permits (mostly YAML).

## Multi-Form-Factor Strategy

### Shared Core Engine

All three interfaces (CLI, MCP, GitHub Action) share **identical** core engine code. No duplication.

```
afterburn/
├── core/                    # Shared engine
│   ├── orchestrator.ts
│   ├── crawler.ts
│   ├── planner.ts
│   ├── executor.ts
│   ├── diagnostics.ts
│   ├── auditor.ts
│   └── reporter.ts
├── interfaces/
│   ├── cli/                 # Thin wrapper
│   │   ├── index.ts         # Parse args, format output
│   │   └── progress.ts      # Terminal UI
│   ├── mcp/                 # Thin wrapper
│   │   ├── server.ts        # MCP protocol handler
│   │   └── tools.ts         # Tool definitions
│   └── github-action/       # Thin wrapper
│       ├── action.yml       # GitHub Action metadata
│       └── index.ts         # Read inputs, post outputs
└── artifacts/               # Shared storage
```

### Interface Responsibilities

**CLI Wrapper:**
- Parse command-line arguments → configuration object
- Display progress bars and spinners
- Format final output to terminal
- Exit with appropriate code

**MCP Server Wrapper:**
- Expose tools via JSON-RPC
- Validate tool parameters
- Stream progress as notifications
- Return results as structured data

**GitHub Action Wrapper:**
- Read workflow inputs from environment
- Call core engine with configuration
- Post results as PR comments
- Upload reports as artifacts

**Critical Rule:** Wrappers ONLY handle I/O format translation. All business logic lives in core engine.

**Source:** [CLI Architecture Layering](https://www.confluent.io/blog/how-we-designed-and-architected-the-confluent-cli/), [GitHub Actions Reusable Workflows](https://oneuptime.com/blog/post/2026-01-25-github-actions-reusable-workflows/view)

## LLM Integration Patterns

### Token Optimization Strategy

**1. Prompt Caching (Anthropic) / Cached KV (OpenAI)**
- Cache system prompt with domain knowledge
- Cache sitemap structure across test planning
- Reduces costs by 90% for repeated context

**2. Semantic Caching Layer**
- Cache LLM responses by semantic similarity
- Use vector embeddings to detect similar queries
- Effective for similar page structures (e.g., many product pages)

**3. Tiered Model Routing**
- Simple tasks (extracting element text) → Fast small model
- Complex tasks (root cause analysis) → Powerful model
- Vision tasks (UI auditing) → Vision-enabled model

**Example:**
```typescript
class LLMRouter {
  async analyzePage(page: Page) {
    // Simple extraction → fast model
    const elements = await this.fastModel.extract(page.html);

    // Complex reasoning → powerful model
    const issues = await this.powerfulModel.diagnose(elements);

    return { elements, issues };
  }
}
```

**Source:** [LLM Cost Optimization](https://redis.io/blog/machine-learning-inference-cost/), [Multi-Layer Caching](https://medium.com/@zeneil_writes/smart-caching-for-fast-llm-tools-coldstarts-hotcontext-part-1-5f52aca27e96)

### Batching Strategy

**Continuous Batching:**
- Don't wait for all items to arrive
- Process items as they stream in
- Dynamically manage batch sizes based on latency

**Best for:**
- Workflow Planner analyzing pages as crawler discovers them
- Diagnostic Engine processing errors as tests fail
- UI Auditor processing screenshots as executor captures them

**Source:** [Continuous Batching for LLMs](https://machinelearningatscale.substack.com/p/llm-serving-1-continuous-batching)

## Efficient Screenshot Management

### Storage Strategy

**Capture Phase:**
1. Take screenshot as PNG (Playwright default)
2. Immediately convert to WebP with `sharp`
3. Store both versions (PNG for analysis, WebP for display)
4. Generate unique ID (hash of PNG for deduplication)

**Reference Phase:**
```typescript
interface ScreenshotRef {
  id: string;           // Unique identifier
  name: string;         // Human-readable name
  pngPath: string;      // Absolute path to PNG
  webpPath: string;     // Absolute path to WebP
  width: number;        // Dimensions
  height: number;
  capturedAt: string;   // ISO timestamp
}
```

**Display Phase:**
- HTML reports use WebP (25-35% smaller)
- Vision API uses PNG (lossless quality)
- Markdown reports link to WebP with PNG fallback

### Cleanup Strategy

**During Run:**
- Keep all screenshots (needed for auditing)

**After Run:**
- Keep only screenshots referenced in reports
- Delete unreferenced screenshots after 24 hours
- Option to keep all via `--keep-screenshots` flag

**Source:** [Screenshot Management Best Practices](https://lifetips.alibaba.com/tech-efficiency/choose-the-right-image-format-for-screenshots)

## Streaming Terminal Output

### Real-Time Progress Pattern

Use **hierarchical progress** for multi-stage pipeline:

```
Afterburn: Testing https://example.com

✓ Discovery    [████████████████████] 100% | 47 pages found
⠙ Planning     [████████░░░░░░░░░░░░]  45% | Analyzing page structure...
  Execution    [░░░░░░░░░░░░░░░░░░░░]   0% | Waiting...
  Diagnostics  [░░░░░░░░░░░░░░░░░░░░]   0% | Waiting...
  UI Audit     [░░░░░░░░░░░░░░░░░░░░]   0% | Waiting...
  Reporting    [░░░░░░░░░░░░░░░░░░░░]   0% | Waiting...
```

**Implementation:**
- Use `cli-progress` for progress bars
- Use `ora` for spinners during uncertain operations
- Emit events from orchestrator, CLI wrapper renders them

**Key Insight:** In non-TTY environments (CI/CD), fall back to line-based logging. Detect with `process.stdout.isTTY`.

**Source:** [CLI Progress Best Practices](https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays), [cli-progress npm](https://www.npmjs.com/package/cli-progress)

## Technology Integration Notes

### Playwright Architecture

Playwright uses **out-of-process architecture** aligned with modern browsers. Key components:

- **Browser:** Instance of browser (Chromium/Firefox/WebKit)
- **BrowserContext:** Isolated environment (like incognito), create many per browser
- **Page:** Single tab within context

**For Afterburn:**
- Create single Browser instance (expensive)
- Create new BrowserContext per test (cheap, isolated)
- Reuse contexts when possible for performance

**Source:** [Playwright Architecture](https://github.com/microsoft/playwright), [Playwright Guide](https://www.browserstack.com/guide/playwright-architecture)

### Lighthouse Inspiration

Lighthouse's architecture provides proven patterns for web auditing:

- **Gatherers:** Collect raw data from page (DOM, network logs, traces)
- **Audits:** Analyze gathered data, produce scores
- **Report:** Render results in multiple formats

**For Afterburn:**
- **Crawler** = Lighthouse's Gatherers (collect page structure)
- **Workflow Planner** = Custom logic (Lighthouse doesn't auto-generate tests)
- **UI Auditor** = Lighthouse's Audits (but using LLM vision instead of heuristics)

**Source:** [Lighthouse Architecture](https://github.com/GoogleChrome/lighthouse/blob/main/docs/architecture.md)

## Summary: Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Component Communication** | Event-driven via orchestrator | Enables loose coupling, resume capability, streaming output |
| **Data Persistence** | File-based JSON artifacts | Debugging, resume, multi-format support |
| **LLM Integration** | Continuous batching + caching | 23× throughput, 90% cost reduction |
| **Screenshot Format** | Dual (PNG + WebP) | Balance quality and size |
| **Plugin System** | Microkernel architecture | Future extensibility without core changes |
| **Multi-Format Strategy** | Shared core, thin wrappers | No duplication, consistent behavior |
| **Progress Display** | Streaming with progress bars | Professional UX, real-time feedback |

## Build Order: Dependency Graph

```
[Core Engine] ← Foundation for everything
    ↓
[Artifact Storage + Event Bus] ← Required by all components
    ↓
[Crawler/Discovery Engine] ← First pipeline stage
    ↓
[Screenshot Manager] ← Needed by Executor
    ↓
[Workflow Planner] ← Depends on Crawler output
    ↓
[Executor] ← Depends on Planner + Screenshot Manager
    ↓
[Diagnostic Engine + UI Auditor] ← Both depend on Executor, can build in parallel
    ↓
[Report Generator] ← Depends on all artifacts
    ↓
[CLI Wrapper] ← First interface, tests full pipeline
    ↓
[MCP Server] ← Builds on working CLI
    ↓
[GitHub Action] ← Configuration wrapper, build if time permits
```

**Critical Path:** Core → Storage → Crawler → Planner → Executor → Reporter → CLI

**Parallel Opportunities:**
- Diagnostic Engine + UI Auditor (both depend on Executor)
- MCP Server + GitHub Action (both wrap core)

## Sources

### Playwright Architecture & Browser Automation
- [Playwright Architecture Explained](https://www.browserstack.com/guide/playwright-architecture)
- [Playwright vs Selenium: 2026 Architecture Review](https://dev.to/deepak_mishra_35863517037/playwright-vs-selenium-a-2026-architecture-review-347d)
- [Playwright GitHub Repository](https://github.com/microsoft/playwright)
- [Building Scalable Testing Architecture with Playwright](https://dev.to/gustavomeilus/automation-with-playwright-building-a-scalable-testing-architecture-4cbo)

### CLI Architecture & Design Patterns
- [Designing the Confluent CLI](https://www.confluent.io/blog/how-we-designed-and-architected-the-confluent-cli/)
- [CLI Interface Guidelines](https://clig.dev/)
- [Software Architecture Patterns 2026](https://www.sayonetech.com/blog/software-architecture-patterns/)

### Web Crawler Architecture
- [Design a Web Crawler - System Design Guide](https://www.systemdesignhandbook.com/guides/design-a-web-crawler-system-design/)
- [Best Open-Source Web Crawlers in 2026](https://www.firecrawl.dev/blog/best-open-source-web-crawler)
- [Web Crawler Architecture - GeeksforGeeks](https://www.geeksforgeeks.org/design-web-crawler-system-design/)

### LLM Integration & Optimization
- [Mastering LLM Techniques: Inference Optimization - NVIDIA](https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/)
- [LLM Serving: Continuous Batching](https://machinelearningatscale.substack.com/p/llm-serving-1-continuous-batching)
- [Scaling LLMs with Batch Processing](https://latitude-blog.ghost.io/blog/scaling-llms-with-batch-processing-ultimate-guide/)
- [Smart Caching for Fast LLM Tools](https://medium.com/@zeneil_writes/smart-caching-for-fast-llm-tools-coldstarts-hotcontext-part-1-5f52aca27e96)
- [Machine Learning Inference Cost Optimization](https://redis.io/blog/machine-learning-inference-cost/)

### Screenshot Management
- [Choose the Right Image Format for Screenshots](https://lifetips.alibaba.com/tech-efficiency/choose-the-right-image-format-for-screenshots)

### Plugin Architecture
- [Plugin Architecture Design Pattern](https://www.devleader.ca/2023/09/07/plugin-architecture-design-pattern-a-beginners-guide-to-modularity/)
- [Optimizing Software Architecture with Plugins - ArjanCodes](https://arjancodes.com/blog/best-practices-for-decoupling-software-using-plugins/)

### Terminal Output & Progress Display
- [CLI UX Best Practices: Progress Displays - Evil Martians](https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays)
- [cli-progress npm package](https://www.npmjs.com/package/cli-progress)

### MCP Server Implementation
- [Model Context Protocol Architecture Overview](https://modelcontextprotocol.io/docs/learn/architecture)
- [MCP Architecture Patterns for Multi-Agent Systems - IBM](https://developer.ibm.com/articles/mcp-architecture-patterns-ai-systems/)
- [Two Essential Patterns for Building MCP Servers](https://shaaf.dev/post/2026-01-08-two-essential-patterns-for-buildingm-mcp-servers/)
- [How to Build an MCP Server: Architecture Guide](https://www.invatechs.com/blog/how-to-build-an-mcp-server-architecture-guide)

### GitHub Actions Architecture
- [GitHub Actions: Early February 2026 Updates](https://github.blog/changelog/2026-02-05-github-actions-early-february-2026-updates/)
- [How to Create Reusable Workflows in GitHub Actions](https://oneuptime.com/blog/post/2026-01-25-github-actions-reusable-workflows/view)
- [Best Practices for Reusable Workflows](https://www.incredibuild.com/blog/best-practices-to-create-reusable-workflows-on-github-actions)

### Error Diagnostics & Code Analysis
- [Visual Studio 2026 Debugging with Copilot](https://devblogs.microsoft.com/visualstudio/visual-studio-2026-debugging-with-copilot/)
- [Top Java Code Analysis Tools 2026](https://zencoder.ai/blog/best-java-code-analysis-tools-for-developers)

### Report Generation
- [Generating Reports with Markdown](https://agateau.com/2020/generating-reports-with-python-markdown-and-entr/)
- [R Markdown: Dynamic Reports and Presentations](https://medium.com/@sdshwetadixit/r-markdown-a-gateway-to-dynamic-reports-and-presentations-f37b58e7f0e)

### Web Form Testing
- [Automated Form Testing Best Practices](https://bugbug.io/blog/test-automation/automated-form-testing/)
- [Top Web Automation Tools for 2026](https://www.testmuai.com/learning-hub/web-automation-tools/)
- [Automation Testing Trends for 2026](https://testguild.com/automation-testing-trends/)

### AI Visual UI Analysis
- [6 Best AI Tools for UI Design That Work in 2026](https://emergent.sh/learn/best-ai-tools-for-ui-design)
- [UI Design Trends 2026: Patterns Shaping Modern Websites](https://landdding.com/blog/ui-design-trends-2026)
- [Turning Screenshots into Data: Screenshot Understanding](https://medium.com/data-science-collective/turning-screensots-int-data-html-126bdcaa4821)

### Event-Driven Architecture
- [Event-Driven Architecture Patterns - Solace](https://solace.com/event-driven-architecture-patterns/)
- [Event-Driven Architecture - Confluent](https://www.confluent.io/learn/event-driven-architecture/)
- [Event-Driven Architecture - Microsoft Azure](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven)
- [4 Event-Driven Architecture Patterns - Ably](https://ably.com/topic/event-driven-architecture-patterns)

### Similar Tool Architectures
- [Lighthouse Architecture Documentation](https://github.com/GoogleChrome/lighthouse/blob/main/docs/architecture.md)
- [Cypress Architecture Overview](https://www.toolsqa.com/cypress/what-is-cypress/)
- [Architecture Breakdown: Selenium, Cypress, Playwright](https://www.testingmavens.com/blogs/architecture-breakdown-selenium-cypress-and)
