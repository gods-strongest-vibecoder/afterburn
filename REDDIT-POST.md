# Reddit Post Drafts for Afterburn Launch

## Title Options
- **A)** I built a free CLI that crawls your site, clicks every button, and tells you what's broken
- **B)** Vibe coders don't write tests. So I built a tool that tests for them -- zero config, one command
- **C)** I made a free tool that fills out your forms, clicks your buttons, and generates a bug report in plain English

**Recommended:** Title A for r/webdev, Title B for r/SideProject

---

## Post Body

If you build with Cursor, Bolt, v0, or Lovable, you probably ship fast and test never. I'm the same way. Forms break, buttons do nothing, images 404 -- and I don't find out until someone on Twitter tells me my signup page is broken.

So I built **Afterburn**. You point it at a URL, it crawls your entire site, fills out your forms, clicks every button, and generates a bug report. One command, zero config:

```
npx afterburn-cli https://your-site.com
```

**What it actually does:**

1. Crawls every page (handles SPAs -- React, Next.js, Vue, Svelte, etc.)
2. Plans test workflows automatically -- signup flows, checkout, login
3. Fills forms with realistic data, clicks buttons, follows navigation
4. Catches: broken forms, dead buttons, JS errors, 404s, missing images, broken links, accessibility violations, slow loads
5. Generates two reports: one in plain English for you, one in structured Markdown you can feed directly to Claude/Cursor/ChatGPT to auto-fix the bugs

**How the dual report works:**

The HTML report gives you a health score (0-100) and a prioritized to-do list in plain English -- "your newsletter form doesn't submit," "7 buttons do nothing when clicked," "4 images are missing." No error codes, no stack traces.

The Markdown report is structured for AI tools. Feed it to your coding assistant and it can read the reproduction steps and fix the issues automatically.

**What it doesn't do:** It doesn't auto-fix your code (it reports, you fix -- or your AI fixes). Visual analysis requires a Gemini API key, but the core tool works without any API keys at all.

It works as a CLI, an MCP tool for AI coding assistants, and a GitHub Action for CI/CD.

Free. Open source. MIT licensed. No account, no signup, no API key required to start.

GitHub: https://github.com/gods-strongest-vibecoder/afterburn

Would love honest feedback -- what's missing? What would make this actually useful for your workflow?

---

## Posting Strategy

| Day | Platform | Title | Time |
|-----|----------|-------|------|
| Day 1 (Tue) | r/SideProject | Title B | 9-10am EST |
| Day 1 (Tue) | Twitter/X | Thread with demo GIF | Same day |
| Day 2 (Wed) | r/webdev | Title A | 10am-12pm EST |
| Day 2 (Wed) | BridgeMind Discord | Showcase channel | Same day |
| Day 3 (Thu) | Hacker News | "Show HN: Afterburn" | 8-10am EST |
| Day 3 (Thu) | r/ChatGPTCoding | Title B variant | Same day |

## GitHub Repo Description (max 150 chars)
"One command finds every bug on your website. Zero config, dual reports (human + AI), free and open source."

## GitHub Topics
testing, website-testing, playwright, accessibility, vibe-coding, cli-tool, developer-tools, automation, mcp, ai-tools, bug-detection, qa-automation, open-source
