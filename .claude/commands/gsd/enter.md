---
name: gsd:enter
description: Enter GSD mode - activates persistent GSD-aware behavior for this session
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Task
---

# Enter GSD Mode

You are activating GSD (Get Shit Done) mode. This makes all subsequent interactions GSD-aware until `/gsd:exit` is called.

## Step 1: Create Mode State

```javascript
// Write to .claude/cache/gsd-mode.json
const modeState = {
  active: true,
  started: new Date().toISOString(),
  project: process.cwd(),
  enteredBy: 'user'
};
```

Create the cache directory if needed and write the mode file:

```bash
# Ensure cache directory exists
mkdir -p .claude/cache

# The mode file will be created by writing JSON
```

Write the mode state to `.claude/cache/gsd-mode.json`:

```json
{
  "active": true,
  "started": "[CURRENT_ISO_TIMESTAMP]",
  "project": "[CURRENT_DIRECTORY]",
  "enteredBy": "user"
}
```

## Step 2: Load Project Context

Check if this is a GSD project:

```bash
# Check for planning directory
ls -la .planning/ 2>/dev/null || echo "NO_PLANNING_DIR"
```

### If `.planning/` exists:

Read the current state:
- `.planning/PROJECT.md` - What we're building
- `.planning/STATE.md` - Current position
- `.planning/ROADMAP.md` - Phase overview

Extract:
- Current phase number
- Current plan (if in progress)
- Recent decisions
- Any blockers

### If `.planning/` does NOT exist:

This is either a new project or non-GSD project.

## Step 3: Display Mode Activation

Present the activation confirmation:

### If existing GSD project:

```
## ✓ GSD Mode Activated

**Project:** [name from PROJECT.md]
**Current Phase:** [X] - [phase name]
**Status:** [from STATE.md]
**Progress:** [X/Y plans complete]

### Quick Actions
- Continue current work → just describe what to do
- Check full status → `/gsd:progress`
- Execute next plan → `/gsd:execute-phase [X]`
- Need to debug → `/gsd:debug [issue]`

### Mode Behaviors Now Active
- ✓ Atomic commits enforced
- ✓ Context budget monitoring
- ✓ Planning structure respected
- ✓ Subagent spawning for complex tasks

*Run `/gsd:exit` when done to leave GSD mode.*
```

### If new project (no .planning/):

```
## ✓ GSD Mode Activated

**Status:** No existing GSD project detected

### Getting Started
- Initialize new project → `/gsd:new-project`
- Map existing codebase → `/gsd:map-codebase`
- Quick one-off task → `/gsd:quick`

### Mode Behaviors Now Active
- ✓ Atomic commits enforced
- ✓ Context budget monitoring
- ✓ GSD command suggestions

*Run `/gsd:exit` when done to leave GSD mode.*
```

## Step 4: Set Session Behavior

From this point forward, operate with these persistent behaviors:

### Commit Pattern
Every code change results in an atomic commit:
```
feat(XX-YY): short description

- Detail 1
- Detail 2

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Context Monitoring
Track context usage and warn appropriately:
- At 50%: "Context at 50% - consider completing current task soon"
- At 65%: "Context at 65% - wrap up and consider /gsd:pause-work"
- At 75%+: "Context critical - please run /gsd:pause-work to save state"

### Task Routing
For complex tasks, spawn appropriate subagents:

| Task Type | Agent | When |
|-----------|-------|------|
| Execute a plan | gsd-executor | User says "execute" or "build" |
| Create a plan | gsd-planner | User describes new feature |
| Verify work | gsd-verifier | After plan completion |
| Debug issue | gsd-debugger | User reports bug/problem |
| Research topic | gsd-phase-researcher | Before complex planning |

### Proactive Suggestions
Suggest relevant /gsd:* commands based on context:
- After completing work → suggest `/gsd:verify-work`
- When stuck → suggest `/gsd:debug`
- For quick tasks → suggest `/gsd:quick`
- When pausing → suggest `/gsd:pause-work`

## Important

The mode state persists in `.claude/cache/gsd-mode.json`. The SessionStart hook (`gsd-mode-check.js`) reads this and injects GSD context into new sessions automatically.

This means:
- Closing and reopening Claude Code maintains GSD mode
- The mode is project-specific (stored in project's .claude/)
- Mode survives until explicitly exited with `/gsd:exit`
