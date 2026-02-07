# Phase 2: Discovery & Planning - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Automatically discover a website's complete structure (all pages, client-side routes, interactive elements) and use AI to generate realistic workflow test plans — all without user configuration. Crawling, element mapping, SPA route detection, AI workflow identification, and broken link detection. Execution of workflows is Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Crawl behavior
- Exhaustive crawl — follow every internal link until no new pages are found
- Same domain only — subdomains treated as external links
- No hard page cap — warn the user after 50 pages that crawl may take a while, but continue
- External links: Claude's Discretion on whether to HEAD-check or just record

### Element mapping
- Capture all interactive elements + navigation: forms, buttons, links, menus, dropdowns, tabs, modals
- Trigger and map hidden elements — click buttons, hover menus, open modals to discover full UI surface
- Sitemap structured as hierarchical tree showing navigation relationships (Home → Dashboard → Settings)
- Full field inventory for forms: type, name, required/optional, placeholder text per field

### AI workflow generation
- Show discovered workflows and ask user for confirmation before Phase 3 executes them
- User's --flows hints supplement auto-discovery (don't replace) — prioritize user-specified flows
- Use Gemini 2.5 Flash for workflow plan generation (consistent with overall LLM stack)
- Generate step-by-step plans with selectors — each step includes action, target selector, expected result

### SPA detection strategy
- Intercept History API (pushState/popState) + click all navigation elements to trigger client-side routing
- Detect SPA framework (React, Vue, Next.js, etc.) and adapt discovery strategy per framework
- Visit one example of each dynamic route pattern (/users/123) and note the pattern exists — don't enumerate all IDs
- Render wait strategy: Claude's Discretion

### Claude's Discretion
- External link handling (HEAD-check vs record-only)
- Render wait strategy for SPAs (NetworkIdle + DOM stability vs fixed timeout vs hybrid)
- Exact crawl concurrency and rate limiting
- How to surface framework detection to the user

</decisions>

<specifics>
## Specific Ideas

- Target audience is vibe coders — crawl progress and discovered workflows should be presented in plain English, not technical jargon
- Workflow plans should be prescriptive enough that Phase 3's executor can follow them mechanically without additional AI calls
- The hierarchical sitemap is a key artifact — downstream phases (3, 4, 5) all consume it

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-discovery-planning*
*Context gathered: 2026-02-07*
