# Afterburn Comprehensive Audit and Handoff

Date: 2026-02-11
Repo: `https://github.com/gods-strongest-vibecoder/afterburn`
Audit method: parallel sub-agent review across architecture, security, test/reliability, CLI/MCP/report compatibility, performance/runtime, and release hygiene.

## 1) Consolidated Findings (Prioritized)

### Critical
1. Navigation step origin validation breaks first `navigate` from new pages (`about:blank` mismatch).
- File: `src/execution/step-handlers.ts`
- Impact: workflows fail early.

2. Planner-generated selectors (`getByRole(...)` style) are incompatible with executor calls (`page.click/fill` expecting valid selector syntax).
- Files: `src/planning/workflow-planner.ts`, `src/execution/step-handlers.ts`
- Impact: AI-generated plans fail at execution.

### High
3. No fallback to heuristic planner when Gemini planning fails.
- File: `src/discovery/discovery-pipeline.ts`
- Impact: recoverable AI outage becomes scan failure.

4. Execution artifact saved before merging broken links; persisted artifact can be stale.
- Files: `src/execution/workflow-executor.ts`, `src/core/engine.ts`
- Impact: report/MCP/action can miss issues.

5. Exit code and `totalIssues` not recomputed after broken-link merge.
- Files: `src/execution/workflow-executor.ts`, `src/core/engine.ts`
- Impact: false success exit code.

6. Link validation uses module-global counter that persists across scans.
- File: `src/discovery/link-validator.ts`
- Impact: later scans silently under-check links.

7. SSRF protection incomplete for hostnames resolving to private/loopback IPs.
- Files: `src/core/validation.ts`, `src/discovery/link-validator.ts`, `src/mcp/tools.ts`, `action/index.ts`
- Impact: internal network probing risk.

8. GitHub Action is not release-safe (unbundled dependencies, dist coupling, source/build drift).
- Files: `action/index.js`, `action/index.ts`, `action/action.yml`, `package.json`
- Impact: runtime failures in real GitHub Actions usage.

9. README Action usage path mismatches metadata location.
- Files: `README.md`, `action/action.yml`
- Impact: broken setup for users.

10. End-to-end test suite is non-deterministic (live Wikipedia dependency) and currently failing by timeout.
- File: `tests/e2e/full-pipeline.test.ts`
- Impact: unreliable CI signal.

### Medium
11. Report/Action text encoding issues (`â...` mojibake) in user-facing output.
- Files: `README.md`, `templates/report.hbs`, `src/reports/priority-ranker.ts`, `action/action.yml`

12. Markdown/report sanitization gaps can leak sensitive URL query params and allow markdown-structure injection.
- Files: `src/reports/markdown-generator.ts`, `src/mcp/tools.ts`, `action/index.ts`

13. HTML report screenshot embedding runs unbounded concurrency (`Promise.all`), risking high memory/CPU usage.
- File: `src/reports/html-generator.ts`

14. Pipeline timeout is fixed at 5 minutes and does not scale with `maxPages`.
- File: `src/core/engine.ts`

15. Unit and E2E tests are mixed under one `npm test`; no coverage thresholds.
- Files: `vitest.config.ts`, `package.json`

16. MCP JSON output lacks explicit schema version and truncation metadata.
- File: `src/mcp/tools.ts`

### Low
17. `totalLinksChecked` appears to track broken links count, not actual checked count.
- File: `src/discovery/discovery-pipeline.ts`

18. Artifact `sessionId` path traversal hardening incomplete in read paths.
- File: `src/artifacts/artifact-storage.ts`

19. README/report docs drift (report filenames, action readiness notes, static passing badge).
- Files: `README.md`

## 2) Implementation Plan (Execution Order)

### Phase A: Correctness and Reliability Blockers
1. Fix first-navigation origin validation.
2. Align planner/executor selector contract:
- Accept and execute Playwright-compatible selectors (`role=`, `text=`, CSS).
- Add compatibility translation only if needed for existing plan artifacts.
3. Reinstate heuristic fallback on Gemini planner failure.
4. Merge broken links before final execution artifact persistence.
5. Recompute `totalIssues` and `exitCode` after merge.
6. Make link-validation counters per-scan state.

Deliverable: deterministic core pipeline behavior with accurate issue/exit semantics.

### Phase B: Security and Data Safety
1. Centralize URL validation with DNS resolution checks against private/reserved ranges (IPv4 + IPv6).
2. Enforce validation at all entry points (CLI, MCP, Action, link redirects).
3. Unify sanitization logic (single shared sanitizer path).
4. Redact sensitive query params in markdown/action/mcp outputs.
5. Escape markdown inline fields used in report sections.
6. Harden artifact load/exists path handling.

Deliverable: no known SSRF bypass and consistent secret-safe output.

### Phase C: Test System and Determinism
1. Split test scripts/config:
- `test:unit` as default fast gate.
- `test:e2e` for deterministic local fixture runs.
2. Replace live-network E2E dependency with local fixture site (`test-site`).
3. Keep optional opt-in external smoke test behind explicit flag.
4. Add targeted regression tests for Phase A/B fixes.
5. Add coverage reporting + threshold gates for core modules.

Deliverable: stable CI and actionable red/green feedback.

### Phase D: Action/Release/Contract Hardening
1. Bundle GitHub Action runtime (self-contained entrypoint).
2. Remove or eliminate dist-coupling in Action runtime path.
3. Add release guardrails:
- `prepack`/`prepublishOnly` to build core + action.
- drift check ensuring `action/index.ts` and generated output stay synced.
4. Fix `fail-on` contract (`high|medium|low|never`) and remove ambiguous `critical` behavior unless fully implemented.
5. Add MCP output metadata (`schema_version`, truncation fields).

Deliverable: reproducible release and stable public contracts.

### Phase E: Docs and Performance Follow-through
1. Fix mojibake and normalize encoding.
2. Reconcile README with actual action path, report filenames, and readiness status.
3. Bound HTML screenshot embedding concurrency and cap heavy workloads.
4. Make scan timeout configurable or `maxPages`-aware.

Deliverable: production-facing polish with safer performance defaults.

## 3) Success KPIs

### Correctness KPIs
1. First step `navigate` no longer fails due to `about:blank` origin mismatch.
2. AI-planned selectors execute successfully in executor tests.
3. Gemini failure path always falls back to heuristic plans.
4. Broken links are present in persisted execution artifact.
5. Exit code is `1` when broken links exist even with no workflow errors.

### Security KPIs
1. URL validation rejects localhost/private/reserved destinations after DNS resolve.
2. Redirect destination checks apply same SSRF policy.
3. No tokens/secrets appear in markdown report or action summary snapshots.
4. Artifact load path traversal attempts are rejected.

### Test/CI KPIs
1. `npm run build` passes.
2. `npm run test:unit` passes consistently.
3. `npm run test:e2e` runs against local deterministic fixture and passes.
4. Coverage thresholds enforced for critical folders.

### Release/Contract KPIs
1. Bundled Action runs in clean environment without local repo build assumptions.
2. Action `fail-on` behavior matches documented values.
3. MCP JSON includes schema version and truncation metadata.
4. README examples match actual runnable behavior.

## 4) Verification Checklist (Must Run After Fixes)

1. `npm.cmd run build`
2. `npm.cmd run test:unit`
3. `npm.cmd run test:e2e`
4. `npm.cmd test` (if retained as umbrella command)
5. `npm.cmd run build:action`
6. `git diff -- action/index.js` (or equivalent no-drift check)
7. `npx afterburn-cli doctor`
8. Local CLI smoke:
- `npm.cmd run dev -- http://localhost:<fixture-port> --max-pages 5`
- confirm `Health: <n>/100` and both report files generated
9. Action smoke (local simulation or workflow test)
10. Encoding sanity:
- `rg -n "â" README.md templates action src/reports`

## 5) Prompt For Next Codex Session

Use this prompt verbatim:

```text
You are working in C:/afterburn on the Afterburn project.

Objective:
Implement the comprehensive audit fixes in phased order, with tests and verification, while preserving public contracts unless explicitly updated (CLI flags, report markdown structure, MCP tool contract, Action behavior).

Context:
- Repo: https://github.com/gods-strongest-vibecoder/afterburn
- Date baseline: 2026-02-11 audit
- Existing known failure: `npm test` fails due to network-dependent E2E timeout in `tests/e2e/full-pipeline.test.ts`.
- Build baseline currently passes: `npm run build`.

Priority fixes (must do first):
1) Fix first-navigation origin check bug in `src/execution/step-handlers.ts`.
2) Align planner selector output and executor selector expectations (`src/planning/workflow-planner.ts`, `src/execution/step-handlers.ts`).
3) Ensure heuristic fallback when Gemini planner fails (`src/discovery/discovery-pipeline.ts`).
4) Persist execution artifact only after broken-link merge, then recompute `totalIssues` and `exitCode` (`src/execution/workflow-executor.ts`, `src/core/engine.ts`).
5) Remove global cross-run link validation counter bleed (`src/discovery/link-validator.ts`).

Security/data-safety fixes:
6) Harden SSRF validation with DNS resolution + private/reserved IP blocking across CLI/MCP/Action/discovery redirects.
7) Unify sanitizer usage and redact sensitive URL query params in markdown/action/MCP outputs.
8) Add markdown inline escaping where user/content fields are rendered.
9) Harden artifact path handling against traversal.

Test/CI fixes:
10) Split test lanes (`test:unit`, `test:e2e`) and make `npm test` deterministic.
11) Replace live-network E2E dependency with local fixture-based deterministic test(s).
12) Add regression tests for all critical/high fixes above.
13) Add coverage thresholds for critical modules.

Action/release fixes:
14) Bundle GitHub Action runtime and remove fragile dist/repo coupling.
15) Fix action docs/path mismatch and `fail-on` contract (`high|medium|low|never` unless implementing real critical severity).
16) Add release/build guardrails (`prepack` or `prepublishOnly`, drift checks).

Performance/docs polish:
17) Limit screenshot embed concurrency in HTML report generation.
18) Make timeout configurable or scale by max pages.
19) Fix mojibake/encoding and README drift (report filenames/action readiness).
20) Add MCP response schema version + truncation metadata.

Constraints:
- Make smallest safe changes that fully solve each issue.
- Preserve backward compatibility unless tests/docs are updated in the same change.
- Prefer deterministic heuristics over extra AI calls.
- Keep comments brief and only where needed.

Success KPIs:
- `npm run build` passes.
- `npm run test:unit` passes.
- `npm run test:e2e` passes deterministically (no live external website dependency).
- `npm test` behavior/documentation is consistent with chosen split.
- Action build and runtime are self-contained and reproducible.
- Critical bug regressions are covered by tests.
- No secret-bearing URLs in report/action outputs.
- README and Action usage instructions are accurate.

Verification commands to run and report:
1. npm.cmd run build
2. npm.cmd run test:unit
3. npm.cmd run test:e2e
4. npm.cmd run build:action
5. npx afterburn-cli doctor
6. relevant smoke scan command against local fixture
7. summarize changed files and exact test results

Output format:
- Start with prioritized findings addressed and what remains.
- Then list exact file changes.
- Then include command outputs summary.
- Then list residual risks or follow-up tasks.
```
