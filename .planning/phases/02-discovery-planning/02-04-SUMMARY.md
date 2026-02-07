---
phase: 02-discovery-planning
plan: 04
subsystem: ai
tags: [gemini, ai, llm, zod, workflow-planning, structured-output]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: BrowserManager and artifact infrastructure
  - phase: 02-01
    provides: Discovery types (SitemapNode, WorkflowPlan, PageData)
provides:
  - GeminiClient wrapper for Gemini 2.5 Flash API with structured JSON output
  - WorkflowPlanner that generates test plans from sitemap using AI
  - Zod schemas for workflow plan validation
  - Token-efficient sitemap summarization (handles 50+ page sites)
affects: [02-05, 04-error-diagnosis, 05-reporting]

# Tech tracking
tech-stack:
  added: [@google/generative-ai, zod, zod-to-json-schema]
  patterns:
    - AI-powered workflow generation with confidence scoring
    - Structured JSON output validation with Zod schemas
    - Token-efficient content summarization for LLM prompts

key-files:
  created:
    - src/ai/gemini-client.ts
    - src/ai/index.ts
    - src/planning/plan-schema.ts
    - src/planning/workflow-planner.ts
    - src/planning/index.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Gemini 2.5 Flash for workflow planning (fast, cost-effective, structured output)"
  - "40K char limit for sitemap summarization prevents token overflow on large sites"
  - "Page prioritization: forms > buttons > menus > links (workflow-relevant content first)"
  - "Confidence scoring filters hallucinated steps (< 0.3) and flags uncertain ones (< 0.7)"
  - "Graceful degradation on API failures returns empty array instead of crashing"

patterns-established:
  - "GeminiClient reusable pattern: structured vs unstructured generation methods"
  - "Zod schema validation for AI output ensures type safety"
  - "Token-aware content truncation with importance-based prioritization"

# Metrics
duration: 8min
completed: 2026-02-07
---

# Phase 2 Plan 4: Gemini AI Integration & Workflow Planning Summary

**Gemini 2.5 Flash integration with Zod-validated structured output generates workflow test plans from sitemap data, handling 50+ page sites via token-efficient summarization**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-07T17:05:33Z
- **Completed:** 2026-02-07T17:13:49Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- GeminiClient wrapper supports structured JSON output with Zod schema validation
- WorkflowPlanner generates AI-powered test plans with step-by-step Playwright actions
- Token-efficient sitemap summarization stays within 40K chars for large sites (50+ pages)
- Confidence scoring filters low-quality steps and flags uncertain workflows
- User hints from --flows flag prioritized in workflow generation

## Task Commits

Each task was committed atomically:

1. **Task 1: Build Gemini client and Zod workflow schemas** - `e56c35f` (feat)
2. **Task 2: Build AI workflow planner** - `84c84b5` (feat)

**Plan metadata:** (will be committed after STATE.md update)

## Files Created/Modified
- `src/ai/gemini-client.ts` - Gemini 2.5 Flash API wrapper with structured/unstructured generation
- `src/ai/index.ts` - AI module barrel exports
- `src/planning/plan-schema.ts` - Zod schemas for WorkflowPlan and WorkflowStep validation
- `src/planning/workflow-planner.ts` - AI workflow plan generator from sitemap
- `src/planning/index.ts` - Planning module barrel exports
- `package.json` / `package-lock.json` - Added @google/generative-ai, zod, zod-to-json-schema

## Decisions Made

**1. Gemini 2.5 Flash as LLM provider**
- Fast response times (< 2s for workflow generation)
- Native structured JSON output support
- Cost-effective for hackathon budget

**2. 40K character limit for sitemap summarization**
- Prevents token overflow on large sites (50+ pages)
- Ensures all sites stay within Gemini context window
- Prioritizes workflow-relevant pages (forms, buttons, interactive elements)

**3. Confidence-based filtering strategy**
- Steps < 0.3 confidence filtered (likely hallucinated selectors)
- Workflows with any step < 0.7 flagged "[Low confidence - verify selectors]"
- Balances AI creativity with execution reliability

**4. Graceful degradation on API failures**
- Returns empty array instead of crashing pipeline
- Logs warnings for debugging
- Allows manual workflow specification fallback

**5. Page importance scoring algorithm**
- Forms weighted 10x (auth, search, contact critical workflows)
- Buttons 2x, menus 3x, links 0.5x
- Ensures most workflow-relevant pages included when truncating

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript Zod generic constraints**
- **Issue:** zod-to-json-schema expected `ZodType<any, ZodTypeDef, any>` but generic `ZodType<T>` had incompatible internals
- **Resolution:** Used `as any` cast for zodToJsonSchema parameter and explicit `as T` cast for parse result
- **Impact:** Type safety maintained at API boundaries, internal cast isolated to implementation

## User Setup Required

**External services require manual configuration.** See plan frontmatter:

**Service:** Gemini AI
**Why:** AI workflow plan generation using Gemini 2.5 Flash
**Environment variables:**
- `GEMINI_API_KEY` - Get from https://aistudio.google.com/apikey

**Verification:**
```bash
# Set in .env or export
export GEMINI_API_KEY="your-key-here"

# GeminiClient throws clear error if key missing:
# "GEMINI_API_KEY not set. Get one at https://aistudio.google.com/apikey"
```

## Next Phase Readiness

**Ready for Phase 2 integration (02-05):**
- GeminiClient tested and ready (structured + text generation)
- WorkflowPlanner generates plans from SitemapNode
- Token limits verified with test sitemaps
- Error handling covers API failures

**Future reuse:**
- Phase 4: GeminiClient.generateText() for error diagnosis
- Phase 5: GeminiClient.generateStructured() for report generation

**No blockers identified.**

---
*Phase: 02-discovery-planning*
*Completed: 2026-02-07*
