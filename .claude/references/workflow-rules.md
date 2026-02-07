# Workflow Rules Reference

Detailed explanations for rules in CLAUDE.md.

## TypeScript Type Checking

**Rule:** Run `tsc --noEmit` after significant changes.

**What it does:** Checks all TypeScript files for type errors without building. A quick sanity check.

**Why:** With large-scale refactoring (19K+ TS operations typical), one wrong type can break 50 files downstream. Catching it immediately prevents hour-long debugging sessions later.

**Example:** You rename a param from `userId: string` to `userId: number`. Without the check, 12 other files break silently until you discover it much later.

**When to run:**
- After renaming types, interfaces, or function signatures
- After upgrading dependencies
- After refactoring multiple files
- Before committing significant changes

---

## Complex Task Breakdown

**Rule:** For multi-step tasks, create subtask checklist and confirm scope before executing.

**Why:** Sessions often end "partially achieved" because tasks are too big. Time gets spent planning, then context/time runs out before finishing.

**What this fixes:** By listing subtasks upfront and confirming, you can scope work to what's completable. Say "just do steps 1-3" instead of watching a 10-step plan get 40% done.

**Example:**
- Bad: "upgrade Next.js" → Claude plans 5 phases → finishes 2 → session ends → half-broken state
- Good: "upgrade Next.js" → Claude plans 5 phases → you approve Phase 1 only → Phase 1 completes and commits → progress saved

**Checklist format:**
```
[ ] Step 1: description
[ ] Step 2: description
[ ] Step 3: description
```

Confirm which steps to execute before starting work.
