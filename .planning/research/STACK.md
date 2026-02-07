# Technology Stack - Afterburn

**Project:** Afterburn - Automated Web Testing & UI Auditing CLI Tool
**Researched:** 2026-02-07
**Overall Confidence:** HIGH

---

## Executive Summary

This stack is optimized for a **7-day hackathon** delivering a production-quality CLI tool that:
- Runs via `npx afterburn URL` (zero-install experience)
- Functions as an MCP server (Claude integration)
- Works as a GitHub Action (CI/CD integration)
- Minimizes LLM API costs through strategic model selection and caching
- Generates beautiful reports (HTML + structured Markdown)

**Philosophy:** Proven, stable libraries over bleeding-edge. TypeScript for maintainability. Token-efficiency over raw capability.

---

## Recommended Stack

### 1. Core Language & Runtime

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **TypeScript** | 5.7+ | Primary language | **STRONG RECOMMEND**. TypeScript became GitHub's #1 language in Aug 2025 (80% adoption). Native compiler (tsgo) shows 8-10x speedups, with TS 7.0 (fully native) arriving early 2026. For a 7-day hackathon targeting production use, type safety prevents bugs during rapid development. |
| **Node.js** | 20+ LTS | Runtime | LTS support through April 2026. Required for npm distribution and MCP SDK compatibility. |

**Confidence:** HIGH (verified via [TypeScript official site](https://www.typescriptlang.org/), [usage trends](https://navanathjadhav.medium.com/typescript-vs-javascript-in-2026-when-should-you-actually-use-typescript-95da08708cc6))

**Alternative considered:** JavaScript - Only recommended for <3 month projects. Afterburn is designed for ongoing community use, making TypeScript the clear choice.

---

### 2. Browser Automation

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Playwright** | Latest | Headless browser automation, screenshot capture, workflow simulation | **STRONG RECOMMEND over Puppeteer**. Cross-browser support (Chromium, Firefox, WebKit) vs Puppeteer's Chrome-only. Built-in test runner, auto-wait for elements (reduces flakiness), out-of-process execution (handles multiple tabs/origins). Industry adoption: VS Code, Microsoft (Bing/Outlook), Disney+ Hotstar. Playwright handles navigation-heavy scenarios better (4.513s vs 4.784s), though Puppeteer is 30% faster for quick scripts—not relevant for Afterburn's crawling use case. |

**Confidence:** HIGH (verified via [Playwright official docs](https://playwright.dev/), [comparison studies](https://www.browserstack.com/guide/playwright-vs-puppeteer))

**Alternatives considered:**
- **Puppeteer**: Chrome-only, maintained by Google. Choose only if you need Chrome-specific DevTools features.
- **Selenium**: Legacy option, slower, more complex API.

**Key Playwright features for Afterburn:**
- Page.goto() with waitUntil options for dynamic content
- Screenshot API with fullPage support
- Network interception for monitoring requests
- Browser contexts (lightweight isolated sessions)
- Built-in tracing for debugging failed workflows

---

### 3. CLI Framework

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Commander.js** | 12+ | CLI argument parsing, command structure | **RECOMMENDED for hackathon speed**. Most popular Node.js CLI framework, simple API, excellent documentation. While Oclif offers better TypeScript support, Commander's lightweight nature (zero config) is ideal for a 7-day build. For production scaling beyond hackathon, consider migrating to Oclif. |

**Confidence:** MEDIUM (Commander version not verified, TypeScript integration bolted-on vs native)

**Alternatives considered:**
- **Oclif**: First-class TypeScript support, plugin system, auto-generated help. **Better long-term** but adds complexity for hackathon.
- **Yargs**: Declarative syntax, more verbose than Commander.
- **Optique** (2026): TypeScript-first with built-in shell completion (Bash/zsh/fish/PowerShell). Too new (insufficient production usage data).

**Recommendation:** Start with Commander for hackathon. Refactor to Oclif post-launch if plugin ecosystem becomes important.

---

### 4. Vision LLM for UI Analysis

| Model | Cost (per 1M tokens) | Purpose | Rationale |
|-------|---------------------|---------|-----------|
| **Gemini 2.5 Flash** | $0.30 input / $2.50 output | Primary UI analysis model | **OPTIMAL cost/quality balance**. 33x cheaper than GPT-4o. Recent Gemini 3 Flash adds "Agentic Vision" with code execution for screenshot manipulation, but 2.5 Flash sufficient for MVP. Supports context caching (75% cost reduction) and batch API (50% discount). |
| **GPT-4o Mini** | $0.15 input / $0.60 output | Fallback/experimentation | **Cheapest option** (16x cheaper than GPT-4o). Good for high-volume basic checks. Use for text extraction and simple pattern detection. |
| **Claude Sonnet 4.5** | $3 input / $15 output | Complex reasoning (optional) | Highest quality but 10x more expensive than Gemini Flash. **Only use if Gemini fails** on complex layouts. Prompt caching reduces costs 90% for repeated analysis. ⚠️ **Missing universal vision capabilities** across Claude tiers (noted limitation vs OpenAI). |

**Confidence:** HIGH (verified via official pricing pages: [Gemini](https://ai.google.dev/gemini-api/docs/pricing), [OpenAI](https://platform.openai.com/docs/pricing), [Claude](https://platform.claude.com/docs/en/about-claude/pricing))

**Token Optimization Strategies (CRITICAL for cost control):**

1. **Prompt Caching** (90% cost reduction on cached tokens)
   - Anthropic: Cache reads $0.30/M vs $3.00/M fresh (Sonnet)
   - Gemini: 75% cost reduction with context caching
   - **Strategy**: Cache system prompts defining UI audit criteria

2. **Batch Processing** (50% discount)
   - OpenAI & Anthropic both offer 50% off batch APIs
   - **Strategy**: Queue all screenshots, process in single batch

3. **Prompt Compression**
   - Tools like LLMLingua compress prompts 20x while preserving meaning
   - **Strategy**: Compress page context, keep UI criteria verbose

4. **Smart Model Routing** (60-80% savings)
   - Use GPT-4o Mini for text extraction
   - Use Gemini Flash for layout analysis
   - Escalate to Claude Sonnet only for ambiguous cases

5. **Image Optimization**
   - 1024×1024 image ≈ 700-1,300 tokens
   - **Strategy**: Resize screenshots to 1024px width, compress to WebP

**Expected costs for testing a 50-page site:**
- Gemini Flash only: ~$0.15–$0.30
- With GPT-4o Mini fallback: ~$0.10–$0.20
- With Claude Sonnet escalation: ~$0.50–$1.00 (worst case)

**Sources:**
- [LLM Cost Optimization Guide](https://www.cloudidr.com/blog/llm-pricing-comparison-2026)
- [Token Optimization Strategies](https://byteiota.com/llm-cost-optimization-stop-overpaying-5-10x-in-2026/)
- [Smart Routing ROI](https://medium.com/@ajayverma23/taming-the-beast-cost-optimization-strategies-for-llm-api-calls-in-production-11f16dbe2c39)

---

### 5. MCP Server SDK

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **@modelcontextprotocol/server** | 1.x (stable) | Build MCP server for Claude integration | **Official TypeScript SDK**. V1.x recommended for production (v2 pre-alpha, stable Q1 2026). Supports stdio transport (required for Claude Desktop). Includes auth helpers and Express/Hono middleware for HTTP transport. |
| **zod** | Latest | Schema validation | Required peer dependency for MCP SDK. Validates tool inputs/outputs. |

**Confidence:** HIGH (verified via [MCP TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk))

**MCP Server Design for Afterburn:**
```typescript
// Expose 3 capabilities:
// 1. Tool: afterburn_audit(url, options)
// 2. Resource: Audit reports (afterburn://reports/{id})
// 3. Prompt: Pre-written "Test my website" template

import { McpServer } from '@modelcontextprotocol/server';
```

**Transport options:**
- **stdio**: Required for Claude Desktop integration (pipes stdin/stdout)
- **HTTP**: Optional for web-based Claude clients (requires Express middleware)

---

### 6. HTML Report Generation

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Handlebars** | 4.7+ | HTML report templating | **RECOMMENDED**. Balances logic-less philosophy with built-in helpers (cleaner than EJS). Precompiled templates for fast rendering. Large ecosystem. Avoid Mustache (too restrictive) and EJS (mixes HTML/JS, harder to maintain). |
| **TailwindCSS** (CDN) | 3+ | Report styling | No build step required (use Play CDN). Beautiful defaults, responsive design. Generated reports are self-contained HTML files. |
| **Chart.js** | 4+ | Visual data representation | Lightweight charting for issue distribution, page load times, accessibility scores. Works directly in browser (no server-side rendering). |

**Confidence:** MEDIUM (Handlebars version not verified, choice based on ecosystem consensus)

**Report architecture:**
```
reports/
├── template.hbs          # Handlebars template
├── data.json            # Audit results (injected)
└── output.html          # Self-contained report with inline CSS/JS
```

**Alternatives considered:**
- **jsreport**: Overkill (200K+ installations, enterprise focus)
- **EJS**: Allows full JS in templates (anti-pattern for maintainability)
- **Pug**: Whitespace-sensitive, steeper learning curve

**Sources:**
- [Template Engine Comparison](https://codechronicle.medium.com/pros-and-cons-of-popular-javascript-templating-engines-e5d1e3d4504f)
- [Handlebars Official](https://handlebarsjs.com/)

---

### 7. Screenshot Comparison (Visual Regression)

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Pixelmatch** | 6+ | Visual diff for screenshots | **RECOMMENDED for MVP**. Pure JavaScript (no native deps), simple API, works everywhere. Playwright uses pixelmatch internally. Faster than odiff on small images (<5MP), which covers most web screenshots. For large-scale regression testing (18MP+), migrate to odiff (6x faster on big images). |

**Confidence:** HIGH (verified via [Pixelmatch GitHub](https://github.com/mapbox/pixelmatch), [odiff performance comparison](https://vizzly.dev/blog/honeydiff-vs-odiff-pixelmatch-benchmarks/))

**Performance data:**
- Pixelmatch: 7.712s for Cypress homepage (18MP)
- Odiff: 1.168s for same image (6x faster)
- Pixelmatch faster on <5MP images (most web screenshots)

**Alternative considered:**
- **odiff**: Written in Zig with SIMD optimizations (SSE2/AVX2/AVX512). **Upgrade path** for post-hackathon if processing hundreds of large screenshots. Requires native compilation (complicates npx distribution).

**Use case for Afterburn:**
- Compare before/after screenshots during workflow simulation
- Detect unintended visual regressions
- Generate diff images for HTML report

---

### 8. GitHub Action Integration

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **@actions/core** | Latest | GitHub Actions toolkit | Official SDK for inputs/outputs/logging. Enables `uses: afterburn-action` in workflows. |
| **@actions/github** | Latest | GitHub API access | Post audit results as PR comments, upload reports as artifacts. |

**Confidence:** HIGH (official GitHub tooling)

**GitHub Action structure:**
```yaml
# .github/workflows/afterburn.yml
name: Afterburn Audit
on: [pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: afterburn-action@v1
        with:
          url: https://preview-${{ github.event.pull_request.number }}.myapp.com
          report: markdown  # Post as PR comment
```

**Best practices (2026):**
- Use `needs` keyword for job dependencies (sequential execution)
- Leverage dynamic matrices for parallel testing
- Cache npm dependencies (`actions/cache`)
- Upload reports via `actions/upload-artifact`

**Sources:**
- [GitHub Actions Testing Guide](https://resources.github.com/learn/pathways/automation/essentials/application-testing-with-github-actions/)
- [Advanced Testing Strategies](https://mastersoftwaretesting.com/automation-academy/ci-cd-integration/github-actions-test-automation)

---

### 9. Package Distribution (npx)

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **npm** | N/A | Package registry | Universal distribution. `npx afterburn URL` downloads and runs without global install. |
| **TypeScript compiler** | 5.7+ | Transpile TS → JS | Ship compiled JS with type definitions. Set `"bin"` in package.json. |
| **tsup** (optional) | Latest | Zero-config bundler | Bundles TS to single executable. Alternative to tsc + manual bundling. |

**Confidence:** HIGH (standard npm distribution)

**package.json configuration:**
```json
{
  "name": "afterburn",
  "version": "1.0.0",
  "bin": {
    "afterburn": "./dist/cli.js"
  },
  "files": ["dist"],
  "engines": {
    "node": ">=20"
  }
}
```

**Distribution flow:**
1. Developer runs `npm install -g afterburn` OR `npx afterburn URL`
2. npm downloads package, caches locally
3. Executable runs from `node_modules/.bin/afterburn`

**Sources:**
- [Publishing npx Commands](https://www.sandromaglione.com/articles/build-and-publish-an-npx-command-to-npm-with-typescript)
- [Binary Distribution Guide](https://sentry.engineering/blog/publishing-binaries-on-npm)

---

### 10. Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **chalk** | 5+ | Colored terminal output | Status messages, error highlighting, progress indicators |
| **ora** | 8+ | Terminal spinners | Show "Crawling page..." during long operations |
| **fs-extra** | 11+ | File system utilities | Enhanced fs with promises, mkdirp, copy, etc. |
| **dotenv** | 16+ | Environment variables | Load API keys from `.env` file |
| **winston** | 3+ | Logging framework | Structured logs for debugging (file + console) |
| **marked** | 12+ | Markdown parser | Convert structured MD reports to HTML (optional) |
| **sharp** | 0.33+ | Image processing | Resize/compress screenshots before LLM analysis |
| **axios** | 1+ | HTTP client | Fetch sitemaps, robots.txt, external resources |

**Confidence:** MEDIUM (versions not verified individually, libraries widely adopted)

**Rationale for each:**
- **chalk/ora**: Essential for CLI UX (professional tool feel)
- **fs-extra**: Reduces boilerplate over native `fs` (promises, mkdirp)
- **winston**: Production-grade logging (vs console.log)
- **sharp**: Native image processing (faster than JS-only libs, critical for token cost reduction)
- **axios**: More robust than `fetch()` for error handling

---

## Alternatives Considered

### Why NOT Puppeteer?
| Criterion | Playwright | Puppeteer | Winner |
|-----------|-----------|-----------|--------|
| Browser support | Chromium, Firefox, WebKit | Chromium only | Playwright |
| Cross-browser testing | Built-in | Requires separate tools | Playwright |
| Auto-wait | Yes | Manual | Playwright |
| Performance (navigation-heavy) | 4.513s avg | 4.784s avg | Playwright |
| Maintained by | Microsoft | Google Chrome DevTools | Tie |

**Verdict:** Playwright's cross-browser support and auto-wait features outweigh Puppeteer's marginal speed advantage on quick scripts.

### Why NOT JavaScript (vs TypeScript)?
| Criterion | TypeScript | JavaScript | Winner |
|-----------|-----------|-----------|--------|
| Bugs caught at compile time | Yes | No | TypeScript |
| Refactoring safety | Excellent (types guide changes) | Poor (manual grep) | TypeScript |
| Team scalability | Easier onboarding (IntelliSense) | Requires more documentation | TypeScript |
| Build complexity | Requires tsc/tsup | Zero config | JavaScript |
| Performance (2026+) | Native compiler 8-10x faster | N/A | TypeScript |

**Verdict:** For a 7-day hackathon targeting production use, TypeScript's bug prevention and editor support justify the minimal build overhead.

### Why NOT Oclif (vs Commander)?
| Criterion | Commander.js | Oclif | Winner |
|-----------|-------------|-------|--------|
| Setup time | <5 min | ~30 min (generators, plugins) | Commander |
| TypeScript support | Bolted-on | First-class | Oclif |
| Plugin system | No | Yes | Oclif |
| Auto-documentation | Basic | Advanced (website generation) | Oclif |
| Hackathon speed | Excellent | Good | Commander |

**Verdict:** Commander for MVP. Migrate to Oclif if plugin ecosystem becomes important post-launch.

### Why NOT Claude for primary vision model?
| Criterion | Gemini Flash | Claude Sonnet | GPT-4o Mini | Winner |
|-----------|-------------|---------------|-------------|--------|
| Cost (input) | $0.30/1M | $3.00/1M | $0.15/1M | GPT-4o Mini |
| Cost (output) | $2.50/1M | $15.00/1M | $0.60/1M | GPT-4o Mini |
| Vision quality | Good | Excellent | Good | Claude |
| Context caching | 75% reduction | 90% reduction | 50% reduction | Claude |
| Vision availability | All tiers | ⚠️ Limited tiers | All tiers | Gemini/GPT |
| Agentic Vision | Yes (Gemini 3) | No | No | Gemini |

**Verdict:** Gemini Flash for primary (10x cheaper than Claude, "Agentic Vision" for complex layouts). GPT-4o Mini for high-volume basic checks. Claude Sonnet only for escalation.

---

## Installation Commands

```bash
# Core dependencies
npm install playwright commander handlebars zod @modelcontextprotocol/server

# Vision LLM SDKs (install based on model choice)
npm install @google-ai/generativelanguage  # Gemini
npm install openai                          # GPT-4o Mini
npm install @anthropic-ai/sdk               # Claude (optional)

# Supporting libraries
npm install chalk ora fs-extra dotenv winston axios sharp pixelmatch

# Dev dependencies
npm install -D typescript @types/node tsx tsup vitest

# GitHub Action dependencies (only for action package)
npm install @actions/core @actions/github
```

---

## Package Structure for npx Distribution

```
afterburn/
├── src/
│   ├── cli.ts                 # Main CLI entry point
│   ├── crawler/
│   │   ├── playwright-crawler.ts
│   │   └── sitemap-parser.ts
│   ├── llm/
│   │   ├── gemini-client.ts
│   │   ├── openai-client.ts
│   │   └── prompt-builder.ts
│   ├── mcp/
│   │   └── server.ts          # MCP server implementation
│   ├── report/
│   │   ├── html-generator.ts
│   │   └── markdown-generator.ts
│   └── types/
│       └── index.ts
├── templates/
│   └── report.hbs             # Handlebars template
├── dist/                      # Compiled JS (git-ignored)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Version Confidence Assessment

| Category | Confidence | Source | Notes |
|----------|-----------|--------|-------|
| Playwright | HIGH | Official docs, comparison studies | Current version not specified, use `@latest` |
| TypeScript | HIGH | Official site, adoption stats | Version 5.7+ confirmed, 7.0 native arriving Q1 2026 |
| Gemini Flash | HIGH | Official pricing page | 2.5 Flash at $0.30/$2.50, 3.0 Flash adds Agentic Vision |
| GPT-4o Mini | HIGH | OpenAI pricing page | $0.15/$0.60 per 1M tokens |
| Claude Sonnet | HIGH | Anthropic pricing page | $3/$15 per 1M tokens, limited vision availability |
| MCP SDK | HIGH | GitHub repository | v1.x stable, v2 pre-alpha (Q1 2026) |
| Commander.js | MEDIUM | Ecosystem consensus | Version 12+ assumed, not verified |
| Handlebars | MEDIUM | Ecosystem consensus | Version 4.7+ assumed, not verified |
| Pixelmatch | HIGH | GitHub + performance studies | Version 6+, Playwright uses internally |
| Supporting libs | LOW | General ecosystem knowledge | Versions not individually verified |

---

## Critical Success Factors

### 1. Token Cost Control (HIGHEST PRIORITY)
- **Risk**: Uncontrolled LLM usage bankrupts free tier users
- **Mitigation**:
  - Default to Gemini Flash ($0.30 input vs $3 Claude)
  - Implement prompt caching (90% cost reduction)
  - Batch process screenshots (50% discount)
  - Compress images with sharp before analysis (700-1,300 tokens per 1024px image)
  - Set hard token limits with `--max-tokens` flag

### 2. npx Distribution Reliability
- **Risk**: Native dependencies (sharp, odiff) fail on some platforms
- **Mitigation**:
  - Use pixelmatch (pure JS) for MVP
  - Test on Windows/Mac/Linux before publish
  - Provide prebuilt binaries for sharp (already handled by sharp team)

### 3. MCP Server Stability
- **Risk**: v1.x → v2 migration breaks Claude integration
- **Mitigation**:
  - Pin `@modelcontextprotocol/server@1.x` in package.json
  - Monitor v2 release (Q1 2026), test migration in separate branch
  - Document v2 breaking changes in CHANGELOG

### 4. Playwright Version Compatibility
- **Risk**: Playwright updates break existing workflows
- **Mitigation**:
  - Pin major version in package.json (`^1.0.0`)
  - Review Playwright changelogs before updating
  - Run integration tests against real websites (not just mocks)

---

## What NOT to Use (Anti-Recommendations)

| Technology | Why Avoid | Use Instead |
|------------|-----------|-------------|
| **Selenium** | Legacy, slow, complex API | Playwright |
| **Jest (for this project)** | Overkill for simple unit tests | Vitest (faster, ESM-native) |
| **Puppeteer** | Chrome-only, no auto-wait | Playwright |
| **EJS** | Mixes HTML/JS, maintainability issues | Handlebars |
| **Mustache** | Too restrictive (no helpers) | Handlebars |
| **jsreport** | Enterprise complexity | Handlebars + TailwindCSS |
| **Claude for primary vision** | 10x more expensive than Gemini | Gemini Flash |
| **GPT-4o (full model)** | 33x more expensive than Gemini | GPT-4o Mini |
| **JavaScript** | No type safety for production | TypeScript |
| **React/Vue for reports** | Requires build step, larger bundle | Static HTML + Handlebars |

---

## Post-Hackathon Migration Path

### Phase 2 (Month 1-3):
- **Commander → Oclif**: Add plugin system for custom audits
- **Pixelmatch → odiff**: Upgrade for large-scale regression testing
- **TailwindCSS CDN → Build Process**: Tree-shake unused styles

### Phase 3 (Month 4-6):
- **MCP SDK v1 → v2**: Migrate when stable release ships
- **Single LLM → Smart Router**: Implement decision tree (GPT-4o Mini → Gemini Flash → Claude Sonnet)
- **Local reports → Cloud storage**: Upload to S3/Cloudflare R2 with shareable URLs

### Phase 4 (Month 7+):
- **Standalone CLI → SaaS API**: Wrap CLI in REST API for web dashboard
- **Manual triggers → Scheduled crawls**: Cron-based monitoring
- **Community plugins**: Open plugin ecosystem via Oclif

---

## Sources Summary

### Official Documentation (HIGH Confidence)
- [Playwright Official Docs](https://playwright.dev/)
- [MCP TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [TypeScript Official Site](https://www.typescriptlang.org/)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [OpenAI API Pricing](https://platform.openai.com/docs/pricing)
- [Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing)

### Comparison Studies (MEDIUM Confidence)
- [Playwright vs Puppeteer (BrowserStack)](https://www.browserstack.com/guide/playwright-vs-puppeteer)
- [TypeScript vs JavaScript 2026](https://navanathjadhav.medium.com/typescript-vs-javascript-in-2026-when-should-you-actually-use-typescript-95da08708cc6)
- [LLM Pricing Comparison 2026](https://www.cloudidr.com/blog/llm-pricing-comparison-2026)
- [Template Engine Comparison](https://codechronicle.medium.com/pros-and-cons-of-popular-javascript-templating-engines-e5d1e3d4504f)

### Performance Benchmarks (HIGH Confidence)
- [Pixelmatch vs odiff Performance](https://vizzly.dev/blog/honeydiff-vs-odiff-pixelmatch-benchmarks/)
- [Playwright vs Puppeteer Speed Test](https://www.skyvern.com/blog/puppeteer-vs-playwright-complete-performance-comparison-2025/)

### Token Optimization (MEDIUM Confidence)
- [LLM Cost Optimization Guide](https://byteiota.com/llm-cost-optimization-stop-overpaying-5-10x-in-2026/)
- [Token Cost Reduction Strategies](https://medium.com/@ajayverma23/taming-the-beast-cost-optimization-strategies-for-llm-api-calls-in-production-11f16dbe2c39)

### GitHub Actions (HIGH Confidence)
- [GitHub Actions Testing Best Practices](https://resources.github.com/learn/pathways/automation/essentials/application-testing-with-github-actions/)
- [Advanced Testing Strategies](https://mastersoftwaretesting.com/automation-academy/ci-cd-integration/github-actions-test-automation)

---

## Final Recommendation

**Use this exact stack for the hackathon:**

```json
{
  "dependencies": {
    "playwright": "^1.48.0",
    "commander": "^12.0.0",
    "handlebars": "^4.7.8",
    "@modelcontextprotocol/server": "^1.0.0",
    "zod": "^3.23.8",
    "@google-ai/generativelanguage": "^3.1.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.1",
    "fs-extra": "^11.2.0",
    "dotenv": "^16.4.5",
    "axios": "^1.6.8",
    "sharp": "^0.33.3",
    "pixelmatch": "^6.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^20.0.0",
    "tsx": "^4.7.1",
    "tsup": "^8.0.2",
    "vitest": "^1.4.0"
  }
}
```

**Estimated build time:** 7 days (assuming 1 developer)
- Day 1-2: Playwright crawler + sitemap parsing
- Day 3-4: Gemini Flash integration + prompt engineering
- Day 5: HTML report generation (Handlebars + TailwindCSS)
- Day 6: MCP server + GitHub Action
- Day 7: Polish, docs, publish to npm

**Estimated API costs (development):**
- Testing 20 sites × 10 pages = 200 screenshots
- 200 × 1,300 tokens × $0.30/1M = **$0.08 total**

**Post-launch operational costs:**
- Average website: 50 pages × 1,300 tokens × $0.30/1M = **$0.02 per audit**
- With prompt caching: **$0.005 per audit** (75% reduction)

This stack prioritizes **hackathon speed, production quality, and minimal operating costs**. All choices are battle-tested and well-documented.
