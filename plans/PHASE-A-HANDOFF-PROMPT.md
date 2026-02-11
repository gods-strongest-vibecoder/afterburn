# Phase A Handoff Prompt

```text
You are working in C:/afterburn on the Afterburn project.

Goal:
Implement Phase A reliability/correctness fixes with minimal, safe changes and regression tests.

Scope (Phase A only):
1) Fix first-navigation origin validation bug in `src/execution/step-handlers.ts` where first `navigate` can fail from `about:blank`.
2) Align planner/executor selector contract:
   - Update planner guidance to output selector formats executor can run.
   - Add backward-compatible handling for legacy `getByRole(...)`/`getByLabel(...)` style selectors so execution does not fail.
3) Ensure Gemini planning failures fall back to heuristic plans in discovery.
4) Ensure execution artifact persistence happens after broken-link merge (so persisted data is final).
5) Recompute `totalIssues` and `exitCode` after broken-link merge.
6) Remove cross-run bleed from link validation global counters (state must be per scan).

Constraints:
- Keep CLI/report/MCP contracts backward compatible unless explicitly updated.
- Keep changes small and explicit.
- Add targeted tests for each bug fix.

Required tests:
- Step handler regression test for first navigate from fresh page.
- Selector normalization/compatibility test for legacy selector formats.
- Discovery planning fallback test (Gemini failure => heuristic plans returned).
- Engine merge/recompute test validating broken links affect persisted totals/exit code.
- Link validator state test proving no counter bleed across separate scan states.

Verification commands:
1. npm.cmd run build
2. npm.cmd test -- tests/unit (or equivalent unit lane)
3. npm.cmd test -- tests/e2e (only if deterministic/local fixture)
4. Summarize changed files and test outcomes.

Output format:
- First: which Phase A items are complete.
- Second: exact file changes with purpose.
- Third: test command results.
- Fourth: residual risks or follow-up.
```
