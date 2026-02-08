---
phase: 06-interfaces-integration
plan: 02
subsystem: integration
tags: [mcp, model-context-protocol, stdio, ai-tools, zod]

# Dependency graph
requires:
  - phase: 06-01
    provides: Core engine with runAfterburn() function and AfterBurnResult type
  - phase: 05-reporting-output
    provides: HealthScore and PrioritizedIssue types with overall/fixSuggestion fields
provides:
  - MCP server with stdio transport exposing scan_website tool
  - Structured JSON + markdown response format for AI consumption
  - Progress notification support via MCP protocol
  - afterburn-mcp bin entry for MCP client configuration
affects: [06-03-github-action, demo-preparation]

# Tech tracking
tech-stack:
  added: ["@modelcontextprotocol/sdk@1.26.0"]
  patterns: ["MCP tool registration with zod schemas", "Dual-format responses (JSON + markdown)", "Best-effort progress notifications"]

key-files:
  created:
    - src/mcp/server.ts
    - src/mcp/tools.ts
    - src/mcp/index.ts
    - src/mcp/entry.ts
  modified:
    - package.json

key-decisions:
  - "Use McpServer high-level API instead of deprecated Server class"
  - "Import from @modelcontextprotocol/sdk/server/mcp.js not /server/index.js"
  - "Return both structured JSON and markdown in content array (dual-format response)"
  - "Progress notifications are best-effort - catch and log errors, don't fail scan"
  - "Error responses return isError:true without crashing server"

patterns-established:
  - "MCP tool handler pattern: args validation via zod, runAfterburn call, dual-format response"
  - "Progress callback forwarding: onProgress from engine → MCP notification when progressToken available"

# Metrics
duration: 13min
completed: 2026-02-08
---

# Phase 06 Plan 02: MCP Server Summary

**MCP server with scan_website tool exposing Afterburn via stdio for AI coding assistants (Claude, Cursor, Windsurf)**

## Performance

- **Duration:** 13 min
- **Started:** 2026-02-08T01:45:20Z
- **Completed:** 2026-02-08T01:58:24Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments
- MCP server starts via stdio and responds to JSON-RPC protocol
- scan_website tool accepts url (required), source, email, password, outputDir, maxPages (optional)
- Dual-format response: structured JSON for AI parsing + markdown summary for human reading
- Progress notifications sent when client provides progressToken
- Graceful error handling returns isError response without crashing server

## Task Commits

Each task was committed atomically:

1. **Task 1: Install MCP SDK and create server with tool definitions** - `0cf52df` (feat)

## Files Created/Modified
- `src/mcp/server.ts` - McpServer initialization with stdio transport
- `src/mcp/tools.ts` - scan_website tool definition and handler with dual-format response
- `src/mcp/index.ts` - Barrel export for MCP module
- `src/mcp/entry.ts` - Standalone entry point for afterburn-mcp bin
- `package.json` - Added afterburn-mcp bin entry and @modelcontextprotocol/sdk dependency

## Decisions Made

**1. Import from mcp.js not index.js**
- McpServer is exported from @modelcontextprotocol/sdk/server/mcp.js
- Server class (exported from index.js) is deprecated for advanced use only
- Rationale: Use recommended high-level API

**2. Dual-format response (JSON + markdown)**
- First content block: JSON.stringify of structured result
- Second content block: Markdown summary
- Rationale: AI tools can parse JSON, humans can read markdown, both get value

**3. Best-effort progress notifications**
- Check for progressToken in extra._meta
- Wrap server.notification in try/catch
- Rationale: Progress is nice-to-have, not critical. Don't fail scan if notification fails

**4. Error handling returns isError:true**
- Catch errors in tool handler
- Return content block with isError:true and error message
- Rationale: MCP server must stay responsive for subsequent requests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed import path for McpServer**
- **Found during:** Task 1 (Initial type checking)
- **Issue:** McpServer not exported from @modelcontextprotocol/sdk/server/index.js
- **Fix:** Changed import to @modelcontextprotocol/sdk/server/mcp.js
- **Files modified:** src/mcp/server.ts, src/mcp/tools.ts
- **Verification:** tsc --noEmit passes
- **Committed in:** 0cf52df (Task 1 commit)

**2. [Rule 1 - Bug] Fixed HealthScore and PrioritizedIssue property names**
- **Found during:** Task 1 (Type checking)
- **Issue:** Used `.score` instead of `.overall` and `.suggestedFix` instead of `.fixSuggestion`
- **Fix:** Corrected property names to match interfaces from reports/index.ts
- **Files modified:** src/mcp/tools.ts
- **Verification:** tsc --noEmit passes, types align with engine.ts exports
- **Committed in:** 0cf52df (Task 1 commit)

**3. [Rule 1 - Bug] Fixed notification method name**
- **Found during:** Task 1 (Type checking)
- **Issue:** Called server.sendNotification() but method is server.notification()
- **Fix:** Changed to server.notification()
- **Files modified:** src/mcp/tools.ts
- **Verification:** tsc --noEmit passes, MCP SDK types satisfied
- **Committed in:** 0cf52df (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs)
**Impact on plan:** All fixes were necessary for compilation and type correctness. No scope changes.

## Issues Encountered

**MCP SDK API discovery**
- Research flagged SDK API surface as LOW confidence
- Solution: Inspected actual TypeScript types in node_modules after install
- Verified McpServer location, constructor signature, registerTool method, notification API
- Approach worked well - real types are source of truth

## User Setup Required

None - no external service configuration required.

MCP clients (Claude Desktop, Cursor, Windsurf) configure afterburn-mcp via their settings files:
- Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Cursor: `.cursor/mcp.json`
- Windsurf: Similar JSON config

Example config:
```json
{
  "mcpServers": {
    "afterburn": {
      "command": "npx",
      "args": ["afterburn-mcp"]
    }
  }
}
```

## Next Phase Readiness

**Ready for:**
- Phase 06-03: GitHub Action wrapper (final interface)
- Demo preparation: MCP server can be demoed in Claude Desktop during hackathon presentation

**Blockers:**
- None

**Notes:**
- MCP server tested with smoke test (JSON-RPC initialize) - responds correctly
- Tool list will include scan_website with proper input schema
- Full integration test with actual scan will happen in demo phase
- Consider adding example MCP client configs to README in demo phase

---
*Phase: 06-interfaces-integration*
*Completed: 2026-02-08*
