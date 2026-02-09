# Claude Code Project Memory

## Tech Stack
- **Runtime**: Node.js + TypeScript
- **Browser Automation**: Playwright (headless Chromium)
- **AI/Vision**: Gemini 2.5 Flash (vision + text analysis)
- **CLI**: Commander.js
- **Reports**: Handlebars (HTML), Markdown (AI report)
- **Accessibility**: axe-core
- **Platform**: Windows (use PowerShell syntax)

## Commands
```bash
npm test                    # Run all tests
npm run build               # Compile TypeScript
npx afterburn-cli <url>     # Run Afterburn locally
```

## Rules
- **Lead with simplicity**: Before exploring a complex solution, check if there's a 10-second native approach. Say it first.
- Add 1-2 line header comment to new files explaining purpose
- **TypeScript**: Run `tsc --noEmit` after significant changes to catch type errors early
- **Complex tasks**: Break into subtask checklist, confirm scope before executing
- **Token efficiency**: Minimize LLM API calls — use heuristics for DOM parsing, LLM only for judgment calls (workflow planning, UI analysis)
- **Subagents**: When spawning subagents, ALWAYS provide:
  - Clear context (what's the problem, what was already tried)
  - Explicit KPIs (measurable success criteria)
  - Verification goals (how to confirm the fix works)
  - Constraints (what NOT to touch)
- **Subagent output**: Verify each agent's output is non-empty before reporting success. Auto-retry once on crash/empty output.
- **Plans location**: Plans live in `plans/` at project root, NOT in `.planning/phases/`. Check there first.
- **Paths**: Use forward slashes in shell commands. Never use `\` in Bash — use PowerShell for path-sensitive ops if needed.

## Notes
- **Hackathon deadline**: Feb 14, 2026 (BridgeMind Vibeathon)
- **Target audience**: Vibe coders — plain English everywhere, zero jargon
- **Dual reports**: Always generate both HTML (human) and Markdown (AI) reports
- **Anti-bot stealth**: Always use playwright-extra stealth plugin — without it, tool fails on 60%+ of real sites
- **Production pushes**: Before pushing to prod, verify: secure, doesn't break existing code, just works. No half-baked deployments.

## Structure
```
C:\afterburn\
├── .claude/                # Claude Code config + GSD framework
├── .planning/              # Spec-driven planning docs
│   ├── PROJECT.md          # Project context and constraints
│   ├── REQUIREMENTS.md     # 34 requirements, traced to phases
│   ├── ROADMAP.md          # 7 phases with success criteria
│   ├── STATE.md            # Project memory
│   ├── config.json         # Workflow preferences
│   └── research/           # Domain research (5 files)
├── src/                    # Source code (TypeScript)
│   ├── core/               # Core engine (crawler, executor, analyzer)
│   ├── cli/                # CLI wrapper (Commander.js)
│   ├── mcp/                # MCP server wrapper
│   └── reports/            # Report generators (HTML + MD)
├── templates/              # Handlebars HTML report templates
└── action/                 # GitHub Action wrapper
```

## Architecture
Pipeline pattern: Crawler → Planner → Executor → Analyzer → Reporter
- Each stage produces JSON artifacts consumed by the next
- Three interfaces (CLI, MCP, GitHub Action) share one core engine
- Event-driven communication between pipeline stages
