#!/usr/bin/env node
// GSD Mode Inject - PreToolUse hook for Task tool
// Injects GSD mode context into subagent prompts when in GSD mode

const fs = require('fs');
const path = require('path');
const os = require('os');

// Read hook input from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Only process Task tool calls
    if (data.tool_name !== 'Task') {
      // Pass through unchanged
      process.stdout.write(JSON.stringify(data));
      return;
    }

    // Check if GSD mode is active
    const cwd = process.cwd();
    const homeDir = os.homedir();
    const projectModeFile = path.join(cwd, '.claude', 'cache', 'gsd-mode.json');
    const globalModeFile = path.join(homeDir, '.claude', 'cache', 'gsd-mode.json');

    let mode = null;
    if (fs.existsSync(projectModeFile)) {
      mode = JSON.parse(fs.readFileSync(projectModeFile, 'utf8'));
    } else if (fs.existsSync(globalModeFile)) {
      mode = JSON.parse(fs.readFileSync(globalModeFile, 'utf8'));
    }

    // If not in GSD mode, pass through unchanged
    if (!mode || !mode.active) {
      process.stdout.write(JSON.stringify(data));
      return;
    }

    // Read current project state
    const stateFile = path.join(cwd, '.planning', 'STATE.md');
    let currentPhase = 'unknown';
    let projectName = 'Unknown Project';

    if (fs.existsSync(stateFile)) {
      const stateContent = fs.readFileSync(stateFile, 'utf8');
      const phaseMatch = stateContent.match(/Phase:\s*(\d+)/i);
      if (phaseMatch) currentPhase = phaseMatch[1];
    }

    const projectFile = path.join(cwd, '.planning', 'PROJECT.md');
    if (fs.existsSync(projectFile)) {
      const projectContent = fs.readFileSync(projectFile, 'utf8');
      const nameMatch = projectContent.match(/^#\s*(.+)/m);
      if (nameMatch) projectName = nameMatch[1].trim();
    }

    // Inject GSD context into the subagent prompt
    const gsdContext = `
<gsd-subagent-context>
## GSD Mode Active

You are operating as a subagent within an active GSD session.

**Project:** ${projectName}
**Current Phase:** ${currentPhase}
**Mode Started:** ${mode.started}

### Subagent Rules
1. Follow atomic commit patterns: \`type(XX-YY): description\`
2. Be concise - don't pad responses
3. Update STATE.md if you make significant progress
4. Report blockers immediately
5. Focus on your specific task

### On Completion
Return clear status: Success | Partial | Blocked | Failed
</gsd-subagent-context>

`;

    // Check if this is a GSD subagent (gsd-* type)
    const subagentType = data.tool_input?.subagent_type || '';
    const isGsdAgent = subagentType.startsWith('gsd-');

    // Inject context into prompt
    if (data.tool_input && data.tool_input.prompt) {
      // For GSD agents, prepend the context
      // For non-GSD agents, add a lighter context note
      if (isGsdAgent) {
        data.tool_input.prompt = gsdContext + data.tool_input.prompt;
      } else {
        // Add minimal context for non-GSD subagents
        const minimalContext = `[GSD Mode Active - Project: ${projectName}, Phase: ${currentPhase}]\n\n`;
        data.tool_input.prompt = minimalContext + data.tool_input.prompt;
      }
    }

    // Output modified data
    process.stdout.write(JSON.stringify(data));

  } catch (e) {
    // On error, pass through unchanged
    process.stdout.write(input);
  }
});
