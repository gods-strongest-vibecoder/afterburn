# Afterburn

## What This Is

A free, open-source CLI tool that automatically tests vibe-coded websites. Point it at a URL and it crawls every page, simulates real user workflows (signup, onboarding, project creation), finds bugs, provides UI improvement suggestions, and generates two reports — one in plain English for the developer, one structured for AI coding tools to read and fix the issues. Built for the BridgeMind Vibeathon 2026 hackathon.

## Core Value

Any vibe coder can run one command and instantly know what's broken on their site, why it matters, and exactly what to fix — no test-writing, no config, no expertise needed.

## Requirements

### Validated

(None yet — ship to validate)

### Active

#### Discovery & Crawling
- [ ] Crawl all reachable pages from a starting URL
- [ ] Discover all interactive elements: forms, buttons, links, navigation menus
- [ ] Map full site structure (page tree with URLs)
- [ ] Detect broken links and missing images (404s)

#### AI-Powered Workflow Simulation
- [ ] Auto-discover user workflows from page structure (signup → onboarding → dashboard)
- [ ] Support optional flow hints via `--flows "signup, checkout"` flag
- [ ] Fill forms with realistic generated data (names, emails, addresses)
- [ ] Click buttons, follow navigations, handle redirects
- [ ] Support authenticated testing via `--email` and `--password` flags
- [ ] Screenshot every page visited during workflows

#### Functional Testing
- [ ] Detect HTTP errors (500, 404, 403, etc.) with context
- [ ] Detect broken forms (submit triggers nothing — no network request, no navigation, no DOM change)
- [ ] Capture JavaScript console errors per page
- [ ] Detect dead buttons (click handlers that produce no effect)
- [ ] Detect broken images and missing assets

#### Error Diagnosis
- [ ] Analyze browser-side evidence for each error (HTTP response, console output, network requests, DOM state)
- [ ] Use AI to infer likely root cause from browser evidence
- [ ] Optional deep diagnosis: accept `--source ./path` to cross-reference errors with actual source code
- [ ] Pinpoint likely file and line when source code is provided

#### UI Audit
- [ ] Analyze page screenshots for layout issues (cramped elements, overlapping content)
- [ ] Detect poor contrast and readability problems
- [ ] Detect formatting issues (text cut off, misaligned elements)
- [ ] Provide improvement suggestions in plain English

#### Human Report (afterburn-report.html)
- [ ] Beautiful, standalone HTML file — no dependencies, opens in any browser
- [ ] Plain English language — zero jargon, zero error codes in main text
- [ ] Screenshots embedded for every issue found
- [ ] Prioritized to-do list: what to fix first and why
- [ ] UI improvement recommendations with visual examples
- [ ] Overall health score (X/Y checks passed)

#### AI Report (afterburn-ai-report.md)
- [ ] Structured Markdown designed for LLM consumption
- [ ] Technical error details: HTTP status, console errors, stack traces, network logs
- [ ] Reproduction steps for each bug (URL, action sequence, expected vs actual)
- [ ] Suggested fix strategies per issue
- [ ] Source code references when `--source` provided (file paths, line numbers)
- [ ] Saved to disk for user to feed into Claude Code / Cursor / Codex

#### CLI Interface
- [ ] Zero-install usage via `npx afterburn <url>`
- [ ] Live terminal output showing real-time crawl/test progress
- [ ] Clean, readable terminal output (not a wall of text)
- [ ] Exit code 0 = all clear, non-zero = issues found

#### MCP Server
- [ ] Expose Afterburn as an MCP tool for AI coding assistants
- [ ] AI tools can invoke scans programmatically (before committing, during dev)
- [ ] Returns structured results that AI can act on

#### GitHub Action
- [ ] Reusable GitHub Action that runs Afterburn on deploy
- [ ] Posts report as PR comment or workflow artifact
- [ ] Configurable: URL, auth credentials (via secrets), thresholds

### Out of Scope

- Paid/premium features — this is free and open source for the hackathon
- Mobile app testing — web apps only
- API-only testing (no UI) — Afterburn tests the user-facing experience
- Performance/load testing — functional correctness and UX only
- Auto-fixing bugs — Afterburn diagnoses and reports, it does not modify code
- Self-hosted dashboard or cloud service — CLI tool only
- Browser extension — CLI/MCP/Action only

## Context

### Competition
- **BridgeMind Vibeathon 2026** (Feb 1-14)
- $5,000 in Bitcoin prizes ($2,500 first place)
- Community-voted by 20,000+ Discord members (mix of experienced devs and non-technical builders)
- Judging criteria: Usefulness 40%, Impact 25%, Execution 20%, Innovation 15%
- Submission: public GitHub repo + 3-5 minute demo video
- "Practical beats flashy" — their exact words

### Target Audience
Vibe coders: people who use AI tools (Cursor, Bolt, v0, Lovable) to generate code. They ship fast but rarely test. When forms break or pages crash, they don't find out until a user bounces. They don't write tests. They don't know how to debug. They need tools that just work.

### Prior Research
Extensive competitive analysis confirmed no free CLI competitor exists:
- mabl, Rainforest QA: $100+/month, enterprise QA teams, manual test scripts
- CodeRabbit: reviews code, not running apps
- No tool does "point at URL → AI tests everything → plain English report" for free

### Demo Strategy
Full journey demo: audience watches Afterburn crawl and test a live vibe-coded app in real-time, discovers bugs, then shows both reports. Then feed the AI report to Claude Code, watch it fix the bugs, re-run Afterburn — everything passes. Before/after: anxiety → confidence.

## Constraints

- **Timeline**: 7 days (Feb 7-14, 2026) — hackathon deadline is hard
- **Open source**: Must be public GitHub repo
- **Team size**: 4+ people — scope accordingly
- **Zero config**: Must work with just a URL, no setup required
- **Token efficiency**: Minimize LLM token usage — use heuristics for DOM parsing/discovery, LLM only for workflow planning and UI analysis
- **Plain English**: All user-facing output must be understandable by someone who has never written code

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| AI engine: LLM + heuristics hybrid | Heuristics for DOM discovery (fast, free), LLM for workflow planning + UI audit (judgment needed) | — Pending |
| Dual reports: human HTML + AI markdown | Vibe coders need plain English; their AI tools need structured technical data | — Pending |
| Auth via CLI flags (--email/--password) | Simplest approach, user controls their own credentials | — Pending |
| Browser + optional source diagnosis | Works without code access; deeper diagnosis when source provided | — Pending |
| Playwright for browser automation | Battle-tested, headless Chrome, screenshots, network interception | — Pending |
| npx for distribution | Zero install, lowest friction for vibe coders | — Pending |
| All three form factors (CLI + MCP + GitHub Action) | CLI is core, MCP shows AI integration story, Action shows CI/CD — strong demo narrative | — Pending |

---
*Last updated: 2026-02-07 after initialization*
