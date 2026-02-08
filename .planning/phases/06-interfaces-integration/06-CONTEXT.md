# Phase 6: Interfaces & Integration - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Wrap the existing Afterburn core engine (crawl → discover → execute → analyze → report) in three distribution interfaces: CLI via npx, MCP server for AI coding assistants, and GitHub Action for CI/CD pipelines. The core engine is complete (Phases 1-5). This phase adds invocation layers — no new analysis or reporting capabilities.

</domain>

<decisions>
## Implementation Decisions

### CLI Experience
- Minimal ora spinners for each pipeline stage (Crawling... Discovering... Testing... Analyzing... Reporting...)
- No rich dashboard or multi-line progress — clean and uncluttered
- On completion: one-liner summary with health score + issue count (e.g., "Health: 78/100 — 3 issues found (1 high, 2 medium)")
- Then print report file paths
- Auto-download Chromium on first run with progress indicator (true zero-config experience)
- Exit code 0 when all checks pass, non-zero when issues found (already implemented in Phase 3)

### CLI Flags
- Claude's Discretion: Design flag set based on vibe-coder audience and competitive analysis
- Must include at minimum: url (positional), --source, --email, --password, --output-dir
- Additional power-user flags at Claude's discretion

### MCP Server Design
- Tools only — no MCP resources (simplicity, works with all MCP clients today)
- Claude's Discretion: Tool surface design (single tool vs granular tools)
- Return format: both structured JSON AND markdown summary — AI assistants get programmatic data plus human-readable context
- Streaming progress during long-running scans — partial results as scan progresses (pages found, issues detected)

### GitHub Action Config
- Post PR comment with health score summary + top issues + link to full report artifact
- No check run annotations — keep it simple with comment-only reporting
- Fail the workflow (block merge) only when high-priority (workflow-blocking) issues are found; medium/low issues warn but don't block
- Auth credentials via GitHub Secrets only (user stores email/password in repo secrets, Action reads from env vars)
- Claude's Discretion: What to upload as workflow artifacts

### Report Output Location
- Default output to dedicated folder: `./afterburn-reports/{timestamp}/`
- Keeps reports organized across multiple runs
- Overridable with --output-dir flag

### Claude's Discretion
- Cross-interface report format (identical vs channel-optimized)
- Engine sharing model (one engine with interface-specific options vs identical behavior)
- Whether to expose a programmatic JS/TS API (evaluate effort vs hackathon timeline)
- Artifact upload strategy for GitHub Action
- Additional CLI flags beyond the required minimum

</decisions>

<specifics>
## Specific Ideas

- CLI output should feel like a vibe coder's tool — not enterprise. Think "scan complete, here's what's broken" not "analysis pipeline terminated successfully"
- MCP streaming lets AI assistants show incremental progress to users instead of blocking for 60+ seconds
- GitHub Action PR comment should be scannable in 5 seconds — health score prominent, issues as bullet points, link to full report for details

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-interfaces-integration*
*Context gathered: 2026-02-08*
