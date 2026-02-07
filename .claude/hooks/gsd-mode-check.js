#!/usr/bin/env node
// GSD Mode Check - SessionStart hook
// Checks if GSD mode is active and injects context into the session

const fs = require('fs');
const path = require('path');
const os = require('os');

const homeDir = os.homedir();
const cwd = process.cwd();

// Mode file locations (check project first, then global)
const projectModeFile = path.join(cwd, '.claude', 'cache', 'gsd-mode.json');
const globalModeFile = path.join(homeDir, '.claude', 'cache', 'gsd-mode.json');

// Planning files
const stateFile = path.join(cwd, '.planning', 'STATE.md');
const roadmapFile = path.join(cwd, '.planning', 'ROADMAP.md');
const projectFile = path.join(cwd, '.planning', 'PROJECT.md');

function getModeFile() {
  if (fs.existsSync(projectModeFile)) return projectModeFile;
  if (fs.existsSync(globalModeFile)) return globalModeFile;
  return null;
}

function readMode() {
  const modeFile = getModeFile();
  if (!modeFile) return null;

  try {
    const content = fs.readFileSync(modeFile, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

function extractCurrentPhase(stateContent) {
  // Extract phase from STATE.md
  const phaseMatch = stateContent.match(/Phase:\s*(\d+)/i);
  return phaseMatch ? phaseMatch[1] : 'unknown';
}

function extractProgress(stateContent) {
  // Extract progress percentage if present
  const progressMatch = stateContent.match(/Progress:.*?(\d+)%/i);
  return progressMatch ? progressMatch[1] : null;
}

function extractProjectName(projectContent) {
  // Extract project name from PROJECT.md
  const nameMatch = projectContent.match(/^#\s*(.+)/m);
  return nameMatch ? nameMatch[1].trim() : 'Unknown Project';
}

// Main execution
const mode = readMode();

if (mode && mode.active) {
  let context = {
    project: 'Unknown',
    phase: 'unknown',
    progress: null,
    planningExists: fs.existsSync(path.join(cwd, '.planning')),
    stateExists: fs.existsSync(stateFile)
  };

  // Read project info
  if (fs.existsSync(projectFile)) {
    try {
      const projectContent = fs.readFileSync(projectFile, 'utf8');
      context.project = extractProjectName(projectContent);
    } catch (e) {}
  }

  // Read state info
  if (fs.existsSync(stateFile)) {
    try {
      const stateContent = fs.readFileSync(stateFile, 'utf8');
      context.phase = extractCurrentPhase(stateContent);
      context.progress = extractProgress(stateContent);
    } catch (e) {}
  }

  // Output GSD mode context for Claude to see
  const output = `<gsd-mode active="true" since="${mode.started}">
# GSD Mode Active

You are operating in GSD (Get Shit Done) mode. Follow these patterns strictly:

## Project Context
- Project: ${context.project}
- Current Phase: ${context.phase}
${context.progress ? `- Progress: ${context.progress}%` : ''}
- Planning directory: ${context.planningExists ? 'exists' : 'NOT FOUND - run /gsd:new-project'}

## Enforced Behaviors
1. **Atomic Commits**: Every code change = one focused commit
   - Format: \`feat|fix|docs|refactor(XX-YY): description\`
   - Include: \`Co-Authored-By: Claude <noreply@anthropic.com>\`

2. **Context Budget**: Monitor usage carefully
   - 0-50%: Full speed ahead
   - 50-70%: Warn user, consider wrapping up current task
   - 70%+: Stop new work, suggest /gsd:pause-work

3. **Planning Files**: Respect the structure
   - Read STATE.md before starting work
   - Never modify PLAN.md during execution (immutable specs)
   - Update STATE.md after significant progress
   - Write SUMMARY.md after completing plans

4. **Subagent Spawning**: For complex tasks, spawn appropriate agents
   - gsd-executor: Plan execution
   - gsd-planner: Creating plans
   - gsd-verifier: Checking goal achievement
   - gsd-debugger: Systematic debugging

5. **Command Suggestions**: Proactively suggest /gsd:* commands
   - Stuck? → /gsd:debug
   - Done with phase? → /gsd:verify-work
   - Need a break? → /gsd:pause-work
   - Quick task? → /gsd:quick

## Exit Mode
Run \`/gsd:exit\` to leave GSD mode and return to normal Claude behavior.
</gsd-mode>`;

  console.log(output);
}
