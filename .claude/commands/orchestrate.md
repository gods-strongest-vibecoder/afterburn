# Multi-Agent Orchestrator (Native CC)

Orchestrate complex tasks using parallel Task tool agents.

## Arguments
- `$ARGUMENTS` - The goal to accomplish

---

## ORCHESTRATION PROTOCOL

You are now the **Orchestrator**. Execute this protocol to accomplish: **$ARGUMENTS**

### PHASE 1: PLANNING

Spawn a Planner agent:

```
Task(
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "Plan task decomposition"
  prompt: [PLANNER_PROMPT below with goal=$ARGUMENTS]
)
```

**PLANNER_PROMPT:**
```
You are a Planning Agent. Decompose this goal into atomic, parallelizable tasks.

GOAL: $ARGUMENTS

OUTPUT FORMAT (JSON only, no explanation):
{
  "tasks": [
    {
      "id": "T1",
      "name": "Short name",
      "description": "What to implement",
      "deps": [],
      "files": ["path/to/file.ts"],
      "criteria": ["Acceptance criterion"]
    }
  ],
  "waves": [["T1","T2"], ["T3"]]
}

RULES:
- Max 5 files per task
- Each task = one commit
- deps = task IDs that must complete first
- waves = groups that can run in parallel
- Be specific, not vague
```

Store the plan in your working memory.

---

### PHASE 2: VERIFICATION

Spawn a Verifier agent:

```
Task(
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "Verify plan"
  prompt: [VERIFIER_PROMPT with plan from Phase 1]
)
```

**VERIFIER_PROMPT:**
```
You are a Verification Agent. Check if this plan is executable.

PLAN:
{paste plan JSON here}

CHECK:
1. No circular dependencies?
2. Files in parallel tasks don't conflict?
3. Each task is atomic (one session)?
4. Criteria are testable?

OUTPUT (JSON only):
{
  "approved": true/false,
  "issues": [{"task": "T1", "problem": "...", "fix": "..."}]
}
```

If `approved: false`, go back to Phase 1 with issues as feedback.
Max 3 verification loops, then ask user.

---

### PHASE 3: EXECUTION

Execute tasks wave by wave. For each wave, spawn Executors IN PARALLEL:

```
// SEND ALL IN ONE MESSAGE for parallel execution
Task(model: "sonnet", description: "Execute T1", prompt: [EXECUTOR_PROMPT for T1])
Task(model: "sonnet", description: "Execute T2", prompt: [EXECUTOR_PROMPT for T2])
```

**EXECUTOR_PROMPT:**
```
You are an Executor Agent. Implement exactly this task:

TASK: {task name}
DESCRIPTION: {task description}
FILES: {affected files}
CRITERIA: {acceptance criteria}

RULES:
- Implement ONLY what's described
- Make ONE atomic commit: "feat|fix(scope): description"
- Run tests if they exist
- Don't refactor unrelated code

OUTPUT (JSON only):
{
  "status": "done|failed|blocked",
  "files": ["modified/files.ts"],
  "commit": "feat(auth): add login endpoint",
  "notes": "any blockers or issues"
}
```

After each wave completes:
1. Check results
2. If any failed, retry once with error context
3. If still failed, note it and continue
4. Move to next wave

---

### PHASE 4: SUMMARY

After all waves complete, summarize:

```
## Orchestration Complete

Goal: $ARGUMENTS

Tasks: X completed, Y failed

Commits:
- feat(auth): add login endpoint
- feat(auth): add JWT validation
- ...

Issues:
- T3 failed: couldn't find X dependency
```

---

## STATE TRACKING

Track in your context:
- Current phase (plan/verify/execute)
- Plan JSON
- Verification attempts (max 3)
- Wave index
- Task statuses: pending/running/done/failed

---

## PARALLEL EXECUTION RULE

**CRITICAL**: To run agents in parallel, you MUST send multiple Task tool calls in a SINGLE response. Do NOT send them one at a time.

Good (parallel):
```
Response contains:
  Task(prompt="Execute T1")
  Task(prompt="Execute T2")
  Task(prompt="Execute T3")
```

Bad (sequential):
```
Response 1: Task(prompt="Execute T1")
Response 2: Task(prompt="Execute T2")
Response 3: Task(prompt="Execute T3")
```

---

## NOW EXECUTE

Begin orchestration for: **$ARGUMENTS**

Start with Phase 1: Planning.
