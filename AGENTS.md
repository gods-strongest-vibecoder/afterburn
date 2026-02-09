# AGENTS.md

Operational guide for coding agents working in `C:/afterburn`.

## Mission

Build and maintain **Afterburn**, a zero-config website testing tool that:
- Crawls sites and executes user-like workflows.
- Detects breakages (forms, dead buttons, console/network errors, accessibility issues, performance problems).
- Produces dual reports: HTML report for humans, Markdown report for AI coding assistants.

## Product Priorities

1. Reliability of bug detection over breadth of features.
2. Clear, actionable reports over raw data dumps.
3. Fast feedback loops for developers.
4. Zero-config defaults that work on real websites.

## Tech Stack

- Node.js 18+
- TypeScript
- Playwright + `playwright-extra` + stealth plugin
- Commander.js (CLI)
- Handlebars (HTML reports)
- Vitest (tests)
- Optional Gemini API integration for smarter planning/analysis

## Repository Map

- `src/core/` pipeline stages (crawler, planner, executor, analyzer)
- `src/reports/` report generation (HTML + Markdown)
- `src/cli/` CLI entry behavior and argument handling
- `src/mcp/` MCP server wrapper
- `templates/` Handlebars templates for HTML reports
- `action/` GitHub Action wrapper
- `tests/` automated tests
- `afterburn-reports/` scan outputs

## Core Commands

- `npm run build` compile TypeScript
- `npm test` run test suite
- `npm run test:watch` run tests in watch mode
- `npm run dev -- <url>` run CLI in dev mode
- `node dist/index.js <url>` run built CLI
- `npx afterburn-cli doctor` run environment pre-flight checks

## Non-Negotiables

- Keep output useful for both humans and AI tools.
- Preserve the pipeline contract: each stage must emit consumable artifacts for the next stage.
- Avoid unnecessary API calls; prefer deterministic heuristics where possible.
- Do not break existing CLI flags or report formats without updating tests/docs.
- Keep defaults safe and usable without API keys.

## Engineering Rules

- Make the smallest change that fully solves the problem.
- Favor pure functions and explicit types in pipeline logic.
- Add brief comments only where intent is not obvious.
- Maintain backward compatibility for public interfaces: CLI command behavior, Markdown report structure, Action inputs/outputs, and MCP tool contract.

## Testing Expectations

For non-trivial changes:
1. Run `npm run build`.
2. Run `npm test`.
3. If behavior changed, update or add tests in `tests/`.
4. If report format changed, validate generated report output.

## Definition of Done

A task is done when:
1. Code is implemented and builds cleanly.
2. Tests pass or failures are explained with clear scope.
3. User-facing docs are updated when behavior changes.
4. No regression is introduced in CLI, report generation, or pipeline handoffs.

## Common Pitfalls

- Breaking Markdown report structure that downstream AI tools parse.
- Introducing flaky Playwright timing assumptions.
- Overusing AI calls when rules/heuristics are enough.
- Changing scanner behavior without updating health score or issue prioritization logic.

## If You Are Unsure

1. Choose the simpler, safer implementation.
2. Preserve compatibility with existing outputs.
3. Add a targeted test to lock in behavior.
4. Document the tradeoff in the PR/commit message.
