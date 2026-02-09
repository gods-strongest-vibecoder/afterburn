# Afterburn

[![npm version](https://img.shields.io/npm/v/afterburn)](https://www.npmjs.com/package/afterburn)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-191%20passing-brightgreen)]()

Automated website testing for vibe coders. Point it at a URL, get a bug report. Zero config.

**One command finds broken forms, dead buttons, JS crashes, missing images, accessibility issues -- and generates a fix list for your AI coding tool.**

```bash
npx afterburn https://your-site.com
```

Afterburn crawls your site, simulates real user workflows (signup, login, checkout), finds bugs, and generates two reports: one for you to read, one for your AI coding tool to fix.

## Why

You ship fast with Cursor, Bolt, v0, or Lovable. But you don't write tests. When forms break or pages crash, you don't find out until users bounce. Afterburn catches those bugs before your users do.

## What it finds

- Broken forms that don't submit
- Dead buttons that do nothing when clicked
- JavaScript errors and console crashes
- HTTP errors (404s, 500s, failed API calls)
- Broken images and missing assets
- Broken links
- Accessibility violations (WCAG 2.1 AA)
- UI issues (bad contrast, overlapping elements, tiny text)
- Slow page loads and poor LCP scores

## Install

```bash
# No install needed - run directly
npx afterburn https://your-site.com

# Or install globally
npm install -g afterburn
```

Afterburn downloads a browser automatically on first run.

## Usage

```bash
# Basic scan
npx afterburn https://your-site.com

# Test login flows
npx afterburn https://your-site.com --email test@example.com --password mypass123

# Hint at specific workflows to test
npx afterburn https://your-site.com --flows "signup, checkout, profile edit"

# Limit crawl depth
npx afterburn https://your-site.com --max-pages 10

# Point at your source code for file:line bug mapping
npx afterburn https://your-site.com --source ./src

# Show the browser window (useful for debugging)
npx afterburn https://your-site.com --no-headless

# Detailed output
npx afterburn https://your-site.com --verbose
```

### Environment variables

```bash
# Avoid exposing credentials in shell history
export AFTERBURN_EMAIL=test@example.com
export AFTERBURN_PASSWORD=mypass123
npx afterburn https://your-site.com
```

## Reports

Every scan generates two reports:

**HTML Report** (for you) — Plain English. No jargon. Shows a health score, prioritized issue list with screenshots, and "how to fix" guidance.

**Markdown Report** (for AI tools) — Structured with YAML frontmatter. Feed it to Claude, ChatGPT, or Cursor and it can fix the bugs automatically.

Reports are saved to `./afterburn-reports/{timestamp}/`.

### Sample output

See what Afterburn produces when scanning a test app with 20+ intentional defects (broken forms, dead buttons, missing images, console errors, accessibility violations):

- [Sample HTML report](demo-cache/report.html) — Health score, prioritized issues, fix suggestions
- [Sample Markdown report](demo-cache/report.md) — Structured for AI coding tools
- [Terminal output](demo-cache/terminal-output.txt) — What you see in the CLI

## How it works

```
Your URL -> Crawl all pages -> Plan test workflows -> Execute tests -> Analyze failures -> Generate reports
```

1. **Crawl** — Discovers all pages, forms, buttons, and links. Handles SPAs (React, Next.js, Vue, Angular, Svelte).
2. **Plan** — Uses AI (Gemini 2.5 Flash) to generate smart test workflows, or falls back to heuristic planning if no API key is set.
3. **Execute** — Runs each workflow in a real browser: fills forms, clicks buttons, follows navigation. Captures screenshots, console errors, and network failures.
4. **Analyze** — Diagnoses root causes with AI vision analysis. Falls back to pattern matching without an API key.
5. **Report** — Generates a health score (0-100) and prioritized fix list in both HTML and Markdown.

### AI is optional

Afterburn works without any API keys. Set `GEMINI_API_KEY` for smarter workflow planning and AI-powered diagnosis, but the tool runs a full test suite either way using heuristic planning and pattern-matching analysis.

```bash
# Optional: enable AI-powered planning and diagnosis
export GEMINI_API_KEY=your-key-here
```

## Known Limitations

- **First run downloads a browser** (~200MB, one-time). Subsequent runs are instant.
- **Visual analysis requires GEMINI_API_KEY**. Without it, Afterburn skips screenshot-based UI analysis and relies on axe-core plus pattern matching.
- **SPA support is experimental**. React, Next.js, Vue, Angular, Svelte, and Astro are detected, but complex client-side routing may not be fully exercised.
- **Desktop viewport only**. Tests run at 1280x720. Mobile viewport testing is planned for v2.
- **AI mode unlocks smarter plans**. Without an API key, workflow planning uses heuristics that cover common patterns. Gemini generates more targeted test plans.

## How is this different?

| Feature | Afterburn | Lighthouse | axe-core | mabl |
|---------|-----------|------------|----------|------|
| Zero config (no test writing) | Yes | Yes | Needs integration | No |
| Crawls entire site | Yes | Single page | No | Yes |
| Form filling and submission testing | Yes | No | No | Yes |
| Dead button detection | Yes | No | No | No |
| Plain English reports | Yes | Partial | No | Yes |
| AI report for coding tools | Yes | No | No | No |
| Free and open source | Yes | Yes | Yes | No |
| CI/CD integration | GitHub Action | CI plugin | CI plugin | SaaS |

## GitHub Action

Add automated testing to your CI pipeline:

```yaml
name: Afterburn
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: gods-strongest-vibecoder/afterburn@main
        with:
          url: https://your-staging-site.com
          source: ./src
          fail-on: high  # Fail PR on high-severity issues
```

The action posts a summary comment on your PR and uploads reports as artifacts.

### Action inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `url` | Yes | — | URL to test |
| `source` | No | — | Source code path for file:line mapping |
| `email` | No | — | Login email (use GitHub Secrets) |
| `password` | No | — | Login password (use GitHub Secrets) |
| `github-token` | No | `github.token` | Token for PR comments |
| `fail-on` | No | `high` | Fail threshold: `high`, `medium`, `low`, `never` |

### Action outputs

| Output | Description |
|--------|-------------|
| `health-score` | Overall health score (0-100) |
| `total-issues` | Total issues found |
| `high-issues` | High-priority issue count |

## MCP Server

Use Afterburn as a tool inside AI coding assistants (Claude, etc.):

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

This exposes a `scan_website` tool that returns structured results your AI assistant can act on.

## Pre-flight check

Verify your environment is ready before scanning:

```bash
npx afterburn doctor
```

Checks Node.js version, browser installation, API key, and network connectivity.

## CLI reference

```
Usage: afterburn [options] <url>

Arguments:
  url                    URL to test

Options:
  -V, --version          output the version number
  --source <path>        Source code directory for pinpointing bugs
  --email <email>        Login email (or set AFTERBURN_EMAIL env var)
  --password <password>  Login password (or set AFTERBURN_PASSWORD env var)
  --output-dir <path>    Custom output directory
  --flows <hints>        Comma-separated workflow hints (e.g., "signup, checkout")
  --max-pages <n>        Max pages to crawl (default: 50, max: 500)
  --no-headless          Show browser window
  --verbose              Show detailed progress output
  -h, --help             display help for command

Commands:
  doctor                 Run pre-flight environment checks
```

## Health score

The health score (0-100) is weighted:

| Category | Weight | What it measures |
|----------|--------|------------------|
| Workflows | 40% | Did test workflows complete without errors? |
| Errors | 30% | HTTP errors, console crashes, broken resources |
| Accessibility | 20% | WCAG 2.1 AA violations |
| Performance | 10% | Page load times, LCP scores |

If any workflow fails completely, the score is capped at 50 regardless of other results.

## Tech stack

- [Playwright](https://playwright.dev/) — Browser automation with stealth mode
- [Gemini 2.5 Flash](https://ai.google.dev/) — AI vision and workflow planning (optional)
- [axe-core](https://github.com/dequelabs/axe-core) — Accessibility testing
- [Commander.js](https://github.com/tj/commander.js) — CLI framework
- [Handlebars](https://handlebarsjs.com/) — HTML report templates
- [ts-morph](https://github.com/dsherret/ts-morph) — Source code mapping
- [sharp](https://sharp.pixelplumbing.com/) — Screenshot compression

## License

MIT
