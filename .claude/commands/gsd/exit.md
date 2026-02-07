---
name: gsd:exit
description: Exit GSD mode and return to normal Claude behavior
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Exit GSD Mode

You are exiting GSD mode. This will return Claude to normal behavior.

## Step 1: Check Current State

Read the mode file to confirm we're in GSD mode:

```bash
cat .claude/cache/gsd-mode.json 2>/dev/null || echo "NOT_IN_GSD_MODE"
```

If not in GSD mode, respond:
```
You're not currently in GSD mode. Nothing to exit.

To enter GSD mode, run `/gsd:enter`.
```

## Step 2: Check for Unsaved Work

If `.planning/STATE.md` exists, check if there's work in progress:

Read STATE.md and look for:
- Active phase with incomplete plans
- "In progress" status
- Recent work that might not be committed

### If work in progress detected:

Ask the user:

```
## Work in Progress Detected

**Current Phase:** [X] - [name]
**Status:** [incomplete plans/uncommitted changes]

Would you like to save your progress before exiting?
```

Options:
1. **Save and exit** - Run /gsd:pause-work first, then exit
2. **Exit without saving** - Just exit (work stays but no handoff created)
3. **Cancel** - Stay in GSD mode

Use AskUserQuestion tool with these options.

## Step 3: Deactivate Mode

Update the mode file to inactive:

Write to `.claude/cache/gsd-mode.json`:

```json
{
  "active": false,
  "started": "[ORIGINAL_START_TIME]",
  "ended": "[CURRENT_ISO_TIMESTAMP]",
  "project": "[PROJECT_PATH]",
  "exitedBy": "user"
}
```

Alternatively, delete the mode file entirely:

```bash
rm .claude/cache/gsd-mode.json 2>/dev/null
```

## Step 4: Display Exit Confirmation

### If save was requested (option 1):

First execute the pause-work workflow, then:

```
## ✓ GSD Mode Exited

**Session Duration:** [calculated from started to now]
**Work Saved:** Yes - handoff created at .planning/phases/[XX]/.continue-here.md

### Session Summary
- Phase [X]: [status]
- Plans completed: [N]
- Commits made: [N]

### To Resume Later
Run `/gsd:enter` then `/gsd:resume-work` to pick up where you left off.

---
*You are now in normal Claude mode.*
```

### If no save requested (option 2) or no work in progress:

```
## ✓ GSD Mode Exited

**Session Duration:** [calculated from started to now]

### What Happened This Session
- [Brief summary if available from STATE.md]

### To Return to GSD
Run `/gsd:enter` to re-enter GSD mode.

---
*You are now in normal Claude mode.*
```

## Step 5: Clear Session Behaviors

From this point forward:
- No longer enforce atomic commit patterns (unless user asks)
- No longer monitor context budget aggressively
- No longer auto-suggest /gsd:* commands
- No longer spawn GSD subagents automatically
- Return to normal Claude Code behavior

## Edge Cases

### Multiple Projects
If user has been working across multiple projects, only exit mode for current directory.

### Uncommitted Git Changes
If there are uncommitted changes:

```
## Warning: Uncommitted Changes

You have uncommitted changes in your working directory:
[list files]

These will remain uncommitted. Consider:
- Committing them now
- Stashing them: `git stash`
- Or leaving as-is

Proceed with exit?
```

### Corrupted Mode File
If mode file is corrupted or unreadable:

```bash
rm -f .claude/cache/gsd-mode.json
```

Then confirm:
```
## ✓ GSD Mode Reset

Mode file was corrupted and has been removed.
You are now in normal Claude mode.
```
