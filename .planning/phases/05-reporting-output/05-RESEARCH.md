# Phase 5: Reporting & Output - Research

**Researched:** 2026-02-07
**Domain:** HTML + Markdown report generation from test artifacts
**Confidence:** HIGH

## Summary

Phase 5 generates two complementary reports: a beautiful standalone HTML report for human vibe coders (plain English, embedded screenshots, prioritized to-do list) and a structured Markdown report for AI coding assistants (technical details, reproduction steps, source code references). Both consume artifacts from Phases 1-4 (discovery, execution, analysis) and require zero external dependencies when opened.

The dual-report strategy differentiates Afterburn from tools like Lighthouse (HTML-only) and pytest-html (developer-focused). Human reports target non-technical builders who used AI to create their sites. AI reports enable Claude/Cursor/Copilot to automatically fix issues.

**Primary recommendation:** Use Handlebars for HTML templating with inline base64 assets for true standalone capability. Use structured Markdown with frontmatter for AI consumption. Implement health score as weighted average across error severity, accessibility impact, and workflow success rate.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Handlebars** | 4.7+ | HTML template engine | Logic-less philosophy keeps templates maintainable. Precompiled templates, helpers for iteration/conditionals, large ecosystem. Balances simplicity and power better than EJS (too much JS) or Mustache (too restrictive). |
| **marked** | 14+ | Markdown generation | Lightweight Markdown compiler for generating structured AI reports. Supports GFM (tables, task lists), safe by default. 10M+ weekly downloads. |
| **sharp** | 0.34+ (already installed) | Image optimization | Convert screenshots to base64 for inline embedding. Handles PNG to WebP conversion. Native performance. |

**Installation:**
```bash
npm install handlebars marked
```

**Confidence:** HIGH (Handlebars official docs, marked npm registry)

**Alternatives Considered:**

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Handlebars | EJS | EJS mixes HTML/JS (harder to maintain), security risks with arbitrary code execution |
| Handlebars | Pug | Whitespace-sensitive syntax, steeper learning curve, less familiar to non-experts |
| marked | markdown-it | markdown-it is more extensible but heavier (300KB vs 20KB), overkill for simple generation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **date-fns** | 4+ | Date formatting | Format ISO timestamps in reports as "Feb 7, 2026 at 10:30 AM" |
| **cli-table3** | 0.6+ | Terminal tables | Print summary tables to CLI (optional enhancement) |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── reports/
│   ├── html-generator.ts       # HTML report generator (consumes Handlebars template)
│   ├── markdown-generator.ts   # Markdown report generator
│   ├── health-scorer.ts        # Calculate overall health score
│   ├── priority-ranker.ts      # Prioritize issues (high/medium/low)
│   └── index.ts                # Barrel exports
templates/
├── report.hbs                  # Main HTML template
├── partials/
│   ├── header.hbs              # Report header with health score
│   ├── issue-card.hbs          # Individual issue display
│   ├── screenshot.hbs          # Embedded screenshot display
│   └── footer.hbs              # Report footer
└── styles/
    └── report.css              # Inline CSS (no CDN dependencies)
```

### Pattern 1: Self-Contained HTML with Inline Assets

**What:** Embed all CSS, images, and JavaScript directly into HTML as base64 data URIs. Zero external dependencies.

**When to use:** For standalone reports that must open anywhere without internet or server.

**Why:**
- No broken asset links when file is moved
- Works offline, in email, in restricted environments
- Single file = easy sharing
- Critical for npx distribution (users won't have local server)

**Example:**
```typescript
// Source: Afterburn implementation
import sharp from 'sharp';
import fs from 'fs-extra';

async function embedScreenshot(pngPath: string): Promise<string> {
  const buffer = await fs.readFile(pngPath);
  const base64 = buffer.toString('base64');
  return `data:image/png;base64,${base64}`;
}

// In Handlebars template:
// <img src="{{screenshotDataUri}}" alt="{{issueDescription}}" />
```

**Caveat:** Only use for images <100KB. Base64 increases size by ~33%. For larger images, reference external WebP files with fallback.

**Sources:**
- [Data URIs | CSS-Tricks](https://css-tricks.com/data-uris/)
- [The Base64 Dilemma: When to Inline Images in CSS](https://dev.to/turkaykalenci/the-base64-dilemma-when-and-how-to-actually-inline-images-in-css-2i9p)
- [Quarto Self-Contained HTML](https://quarto.org/docs/output-formats/html-basics.html)

### Pattern 2: Health Score as Weighted Average

**What:** Calculate single 0-100 score from multiple test dimensions (errors, accessibility, performance, workflows).

**When to use:** For executive summary, trend tracking, pass/fail thresholds.

**Why:**
- Simple metric for "is my site healthy?"
- Enables comparison between runs
- Industry standard (Lighthouse uses 0-100 scoring)
- Plain English label: Good (80-100), Needs Work (50-79), Poor (0-49)

**Example:**
```typescript
// Source: Lighthouse accessibility scoring
interface HealthScore {
  overall: number;        // 0-100
  label: 'good' | 'needs-work' | 'poor';
  breakdown: {
    workflows: number;    // % workflows passed
    errors: number;       // 100 - (errors/checks * 100)
    accessibility: number; // Based on axe violations
    performance: number;  // Based on LCP thresholds
  };
}

function calculateHealthScore(
  executionArtifact: ExecutionArtifact,
  analysisArtifact: AnalysisArtifact
): HealthScore {
  // Workflow success rate (40% weight)
  const workflowsPassed = executionArtifact.workflowResults.filter(w => w.overallStatus === 'passed').length;
  const workflowScore = (workflowsPassed / executionArtifact.workflowResults.length) * 100;

  // Error severity score (30% weight)
  const totalErrors = executionArtifact.totalIssues;
  const errorScore = Math.max(0, 100 - (totalErrors * 2)); // -2 points per error

  // Accessibility score (20% weight)
  const criticalViolations = executionArtifact.pageAudits.reduce((sum, audit) =>
    sum + (audit.accessibility?.violations.filter(v => v.impact === 'critical').length || 0), 0);
  const accessibilityScore = Math.max(0, 100 - (criticalViolations * 10)); // -10 points per critical

  // Performance score (10% weight)
  const avgLCP = executionArtifact.pageAudits.reduce((sum, audit) =>
    sum + (audit.performance?.lcp || 0), 0) / executionArtifact.pageAudits.length;
  const performanceScore = avgLCP < 2500 ? 100 : avgLCP < 4000 ? 75 : 50;

  const overall = Math.round(
    workflowScore * 0.4 +
    errorScore * 0.3 +
    accessibilityScore * 0.2 +
    performanceScore * 0.1
  );

  return {
    overall,
    label: overall >= 80 ? 'good' : overall >= 50 ? 'needs-work' : 'poor',
    breakdown: { workflows: workflowScore, errors: errorScore, accessibility: accessibilityScore, performance: performanceScore }
  };
}
```

**Sources:**
- [Lighthouse Accessibility Score](https://developer.chrome.com/docs/lighthouse/accessibility/scoring)
- [Level Access Accessibility Health Score](https://client.levelaccess.com/hc/en-us/articles/4416169987735-Accessibility-health-score)
- [LambdaTest Accessibility Score](https://www.lambdatest.com/support/docs/accessibility-web-score/)

### Pattern 3: Issue Prioritization Matrix

**What:** Rank issues as High/Medium/Low priority based on severity + user impact.

**When to use:** For "What to fix first?" to-do list in human report.

**Why:**
- Not all issues are equal (critical workflow failure > minor contrast issue)
- Helps non-technical users focus effort
- Industry standard approach (JIRA, GitHub Issues use priority levels)

**Example:**
```typescript
// Source: Bug severity/priority best practices
type IssuePriority = 'high' | 'medium' | 'low';

interface PrioritizedIssue {
  priority: IssuePriority;
  summary: string;
  fixSuggestion: string;
  location: string;
  screenshotRef?: string;
}

function prioritizeIssues(
  diagnosedErrors: DiagnosedError[],
  uiAudits: UIAuditResult[]
): PrioritizedIssue[] {
  const prioritized: PrioritizedIssue[] = [];

  // High priority: Workflow-blocking errors (navigation, authentication, forms)
  for (const error of diagnosedErrors) {
    if (error.errorType === 'navigation' || error.errorType === 'authentication' || error.errorType === 'form') {
      prioritized.push({
        priority: 'high',
        summary: error.summary,
        fixSuggestion: error.suggestedFix,
        location: error.sourceLocation ? `${error.sourceLocation.file}:${error.sourceLocation.line}` : 'Unknown',
        screenshotRef: error.screenshotRef,
      });
    }
  }

  // Medium priority: Network errors, JavaScript errors
  for (const error of diagnosedErrors) {
    if (error.errorType === 'network' || error.errorType === 'javascript') {
      prioritized.push({
        priority: 'medium',
        summary: error.summary,
        fixSuggestion: error.suggestedFix,
        location: error.sourceLocation ? `${error.sourceLocation.file}:${error.sourceLocation.line}` : 'Unknown',
        screenshotRef: error.screenshotRef,
      });
    }
  }

  // Low priority: UI/UX issues (contrast, layout, formatting)
  for (const audit of uiAudits) {
    for (const layoutIssue of audit.layoutIssues) {
      if (layoutIssue.severity === 'high') {
        prioritized.push({
          priority: 'medium', // UI issues max out at medium
          summary: `Layout issue: ${layoutIssue.description}`,
          fixSuggestion: `Check ${layoutIssue.location}`,
          location: audit.pageUrl,
          screenshotRef: audit.screenshotRef,
        });
      } else {
        prioritized.push({
          priority: 'low',
          summary: `Layout issue: ${layoutIssue.description}`,
          fixSuggestion: `Check ${layoutIssue.location}`,
          location: audit.pageUrl,
          screenshotRef: audit.screenshotRef,
        });
      }
    }
  }

  return prioritized;
}
```

**Sources:**
- [Bug Severity and Priority Matrix](https://medium.com/hepsiburadatech/bug-severity-and-priority-matrix-ae14fb344559)
- [Bug Priority: How to Prioritize Bugs](https://brainhub.eu/library/bug-priority-how-to-prioritize-bugs)
- [Defect Severity and Priority in Testing](https://www.softwaretestinghelp.com/how-to-set-defect-priority-and-severity-with-defect-triage-process/)

### Pattern 4: Structured Markdown for AI Consumption

**What:** Use consistent Markdown structure with YAML frontmatter for machine-readable metadata.

**When to use:** For AI report consumed by Claude/Cursor/Copilot.

**Why:**
- YAML frontmatter = easy parsing by AI tools
- Markdown = human-readable fallback
- Tables, code blocks, lists = structured data
- Compatible with Google Conductor (stores context as Markdown), Claude projects, Cursor context

**Example:**
```typescript
// Source: Google Conductor pattern, SARA CLI tool
function generateMarkdownReport(
  executionArtifact: ExecutionArtifact,
  analysisArtifact: AnalysisArtifact,
  healthScore: HealthScore
): string {
  return `---
session_id: ${analysisArtifact.sessionId}
timestamp: ${analysisArtifact.timestamp}
target_url: ${executionArtifact.targetUrl}
health_score: ${healthScore.overall}
health_label: ${healthScore.label}
total_issues: ${executionArtifact.totalIssues}
ai_powered: ${analysisArtifact.aiPowered}
source_analysis: ${analysisArtifact.sourceAnalysisAvailable}
---

# Afterburn Test Report

**Target:** ${executionArtifact.targetUrl}
**Health Score:** ${healthScore.overall}/100 (${healthScore.label})
**Date:** ${new Date(analysisArtifact.timestamp).toLocaleString()}

## Summary

- **Workflows Tested:** ${executionArtifact.workflowResults.length}
- **Passed:** ${executionArtifact.workflowResults.filter(w => w.overallStatus === 'passed').length}
- **Failed:** ${executionArtifact.workflowResults.filter(w => w.overallStatus === 'failed').length}
- **Total Issues:** ${executionArtifact.totalIssues}

## Issues by Priority

${generateIssueTable(analysisArtifact.diagnosedErrors)}

## Technical Details

${generateTechnicalDetails(analysisArtifact.diagnosedErrors)}

## Source Code References

${generateSourceReferences(analysisArtifact.diagnosedErrors)}

## Reproduction Steps

${generateReproductionSteps(executionArtifact.workflowResults)}
`;
}
```

**Sources:**
- [Google Conductor: Context-Driven Gemini CLI](https://www.marktechpost.com/2026/02/02/google-releases-conductor-a-context-driven-gemini-cli-extension-that-stores-knowledge-as-markdown-and-orchestrates-agentic-workflows/)
- [SARA: Managing Markdown Requirements with Knowledge Graphs](https://dev.to/tumf/sara-a-cli-tool-for-managing-markdown-requirements-with-knowledge-graphs-nco)
- [Spec-driven Development: Markdown as Programming Language](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-using-markdown-as-a-programming-language-when-building-with-ai/)

### Pattern 5: Plain English Jargon-Free Messaging

**What:** Write error messages and suggestions as if explaining to someone who built their site with AI and doesn't know CSS/JavaScript deeply.

**When to use:** For all human-facing report content (summaries, fix suggestions, labels).

**Why:**
- Target audience: "vibe coders" who used Cursor/v0/Bolt to build sites
- Jargon destroys trust and usability
- Plain language improves comprehension for all skill levels
- Industry best practice (Plain Language Initiative, technical writing standards)

**Example:**
```typescript
// BAD: Technical jargon
"TypeError: Cannot read property 'style' of null at HTMLButtonElement.onClick (app.js:142)"

// GOOD: Plain English
"A button on your homepage stopped working. When clicked, it tries to change something that doesn't exist."

// BAD: Technical jargon
"WCAG 2.1 Level AA violation: Color contrast ratio 3.2:1 fails minimum threshold of 4.5:1 for normal text"

// GOOD: Plain English
"The text on your 'Get Started' button is hard to read. The gray color is too light against the white background."

// BAD: Technical jargon
"Network request to /api/users returned HTTP 404 with CORS preflight failure"

// GOOD: Plain English
"Your site tried to load user data but couldn't find it. This might break the dashboard."
```

**Implementation in diagnosis-schema.ts:**
```typescript
// Already implemented in Phase 4
export const ErrorDiagnosisSchema = z.object({
  summary: z.string().describe('One-sentence plain English summary of what went wrong'),
  rootCause: z.string().describe('Plain English explanation of the root cause'),
  suggestedFix: z.string().describe('Actionable next step in plain English'),
  // ...
});
```

**Sources:**
- [Plain Language Advances Technical Communication](https://centerforplainlanguage.org/plain-language-advances-technical-communication/)
- [How to Avoid Jargon in Technical Writing](https://www.vistaprojects.com/how-to-avoid-jargon/)
- [Reduce Complexity of Technical Language](https://idratherbewriting.com/simplifying-complexity/reducing-the-complexity-of-technical-language.html)
- [Avoid Jargon - Plain Language Principles](https://digital.gov/guides/plain-language/principles/avoid-jargon)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML template engine | Custom string concatenation | Handlebars | Edge cases: XSS vulnerabilities, escaping logic, partial reuse, helper functions. Handlebars has 10 years of battle-testing. |
| Markdown generation | Manual string building | marked + structured data objects | Edge cases: Table alignment, code block fencing, special character escaping, GFM extensions. |
| Date formatting | Custom date parsing | date-fns | Edge cases: Timezones, locales, relative time ("2 hours ago"), DST transitions. |
| Image optimization | Canvas API or imagemagick | sharp | Edge cases: Memory leaks, format conversion, EXIF preservation, progressive encoding. |
| Health score calculation | Ad-hoc formulas | Weighted scoring with domain-specific weights | Edge cases: Zero-division, missing data, negative scores, score inflation. Use proven Lighthouse-style weighting. |

**Key insight:** Report generation looks simple but has hidden complexity. Template engines handle XSS, escaping, partials, and helpers. Date libraries handle timezones and locales. Image libraries handle memory leaks and format quirks. Don't reinvent these.

## Common Pitfalls

### Pitfall 1: External Dependencies Break Offline Reports

**What goes wrong:** HTML report links to CDN for CSS (TailwindCSS CDN, Bootstrap CDN). Report breaks when opened offline or in restricted networks.

**Why it happens:** Developer tests report on machine with internet. Assumes CDN links work everywhere. User opens report on plane, in corporate network with CDN blocked, or email client that strips external resources.

**How to avoid:**
1. Inline all CSS using `<style>` tags in HTML
2. Base64-embed small images (<100KB) as data URIs
3. Test report in airplane mode before shipping
4. Use `<img src="data:image/png;base64,..." />` not `<img src="./screenshot.png" />`

**Warning signs:**
- Report looks unstyled when opened in email
- Screenshots show as broken images in some environments
- Works on localhost but fails when moved

**Sources:**
- [Quarto Self-Contained HTML](https://quarto.org/docs/output-formats/html-basics.html)
- [pytest-html Self-Contained Reports](https://pytest-html.readthedocs.io/en/latest/user_guide.html)

### Pitfall 2: Base64 Bloat Kills Performance

**What goes wrong:** HTML report is 50MB because every screenshot is base64-encoded at full resolution.

**Why it happens:** Base64 encoding increases size by ~33%. A 1MB PNG becomes 1.33MB. 20 screenshots = 26MB base64 data embedded in HTML. Browser hangs parsing massive HTML string.

**How to avoid:**
1. Resize screenshots to max 1200px width before embedding
2. Convert PNG to WebP (50% smaller) before base64 encoding
3. Only embed thumbnails as base64, link to full-size external files
4. Lazy-load screenshot sections with JavaScript
5. Set hard limit: embed only if image <100KB

**Warning signs:**
- HTML file >10MB
- Report takes >5 seconds to load in browser
- Browser tab consumes >500MB RAM
- Mobile browsers crash opening report

**Sources:**
- [Base64 Data URLs in HTML and CSS](https://www.debugbear.com/blog/base64-data-urls-html-css)
- [The Base64 Dilemma](https://dev.to/turkaykalenci/the-base64-dilemma-when-and-how-to-actually-inline-images-in-css-2i9p)

### Pitfall 3: Health Score Doesn't Match User Expectations

**What goes wrong:** Report shows "95/100 - Good" but site is completely broken (login doesn't work).

**Why it happens:** Health score weights performance/accessibility equally with functional errors. A site with perfect accessibility and fast load times gets 80/100 even if core workflows fail. User sees "Good" score and assumes everything works.

**How to avoid:**
1. Weight workflow success heavily (40-50% of total score)
2. Apply "veto" logic: Any critical workflow failure caps score at 50/100
3. Use plain English labels that match reality:
   - "Poor" for anything with workflow failures
   - "Needs Work" for sites with multiple errors
   - "Good" only for sites that actually work
4. Show breakdown: "Health Score: 45/100 - 2 critical workflows failed"

**Warning signs:**
- High score but user reports site is broken
- Score doesn't change when fixing major bug
- Score dominated by accessibility/performance, ignores functional errors

**Sources:**
- [Lighthouse Accessibility Scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring)
- [Level Access Health Score](https://client.levelaccess.com/hc/en-us/articles/4416169987735-Accessibility-health-score)

### Pitfall 4: Markdown Report Not Parseable by AI

**What goes wrong:** AI tool (Claude/Cursor) can't extract structured data from Markdown report. Has to guess at priorities, can't find source locations.

**Why it happens:** Markdown is plain text without machine-readable structure. Without YAML frontmatter or consistent formatting, AI must use fuzzy parsing. Tables don't have type information. Code blocks don't indicate language.

**How to avoid:**
1. Use YAML frontmatter for key metadata (session ID, health score, timestamps)
2. Use consistent heading hierarchy (H2 for sections, H3 for subsections)
3. Use tables with header rows for issue lists
4. Use code fences with language hints: ```typescript not ```
5. Include explicit labels: "**Priority:** High" not just emoji symbols
6. Test by parsing Markdown with marked or markdown-it to verify structure

**Warning signs:**
- AI tools ask clarifying questions about report content
- AI misinterprets priorities or locations
- AI can't find reproduction steps
- Manual copying/pasting required instead of automated fix suggestions

**Sources:**
- [Google Conductor: Markdown for AI Context](https://www.marktechpost.com/2026/02/02/google-releases-conductor-a-context-driven-gemini-cli-extension-that-stores-knowledge-as-markdown-and-orchestrates-agentic-workflows/)
- [Document Intelligence Supported Markdown Elements](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/concept/markdown-elements?view=doc-intel-4.0.0)

## Code Examples

Verified patterns from official sources:

### Handlebars Template with Inline CSS

```handlebars
<!-- Source: Handlebars official docs + self-contained HTML pattern -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Afterburn Report - {{targetUrl}}</title>
  <style>
    /* Inline CSS - no external dependencies */
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
    .health-score { font-size: 64px; font-weight: bold; }
    .health-good { color: #10b981; }
    .health-needs-work { color: #f59e0b; }
    .health-poor { color: #ef4444; }
    .issue-card { background: #f9fafb; border-left: 4px solid #6366f1; padding: 16px; margin: 16px 0; }
    .priority-high { border-left-color: #ef4444; }
    .priority-medium { border-left-color: #f59e0b; }
    .priority-low { border-left-color: #6366f1; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Afterburn Test Report</h1>
    <p>Tested: {{targetUrl}}</p>
    <p>Date: {{timestamp}}</p>

    <div class="health-score health-{{healthLabel}}">
      {{healthScore}}/100
    </div>
    <p>{{healthLabel}}</p>

    <h2>What to Fix First</h2>
    {{#each prioritizedIssues}}
    <div class="issue-card priority-{{priority}}">
      <h3>{{summary}}</h3>
      <p><strong>Why it matters:</strong> {{impact}}</p>
      <p><strong>How to fix:</strong> {{fixSuggestion}}</p>
      {{#if screenshotDataUri}}
      <img src="{{screenshotDataUri}}" alt="Screenshot" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 4px; margin-top: 12px;" />
      {{/if}}
    </div>
    {{/each}}
  </div>
</body>
</html>
```

### Markdown Report with YAML Frontmatter

```typescript
// Source: Google Conductor pattern, structured Markdown for AI
import { format } from 'date-fns';

function generateMarkdownReport(
  executionArtifact: ExecutionArtifact,
  analysisArtifact: AnalysisArtifact,
  healthScore: HealthScore,
  prioritizedIssues: PrioritizedIssue[]
): string {
  const timestamp = new Date(analysisArtifact.timestamp);

  // YAML frontmatter for machine-readable metadata
  const frontmatter = `---
session_id: ${analysisArtifact.sessionId}
timestamp: ${analysisArtifact.timestamp}
target_url: ${executionArtifact.targetUrl}
health_score: ${healthScore.overall}
health_label: ${healthScore.label}
total_issues: ${executionArtifact.totalIssues}
workflows_passed: ${executionArtifact.workflowResults.filter(w => w.overallStatus === 'passed').length}
workflows_total: ${executionArtifact.workflowResults.length}
ai_powered: ${analysisArtifact.aiPowered}
source_analysis: ${analysisArtifact.sourceAnalysisAvailable}
---`;

  // Structured Markdown body
  const body = `
# Afterburn Test Report

**Target:** ${executionArtifact.targetUrl}
**Health Score:** ${healthScore.overall}/100 (${healthScore.label})
**Date:** ${format(timestamp, 'PPpp')}

## Summary

| Metric | Value |
|--------|-------|
| Workflows Tested | ${executionArtifact.workflowResults.length} |
| Workflows Passed | ${executionArtifact.workflowResults.filter(w => w.overallStatus === 'passed').length} |
| Total Issues | ${executionArtifact.totalIssues} |
| Console Errors | ${executionArtifact.workflowResults.reduce((sum, w) => sum + w.errors.consoleErrors.length, 0)} |
| Network Failures | ${executionArtifact.workflowResults.reduce((sum, w) => sum + w.errors.networkFailures.length, 0)} |
| Broken Images | ${executionArtifact.workflowResults.reduce((sum, w) => sum + w.errors.brokenImages.length, 0)} |

## Issues (Prioritized)

${prioritizedIssues.map((issue, i) => `
### ${i + 1}. ${issue.summary}

- **Priority:** ${issue.priority.toUpperCase()}
- **Location:** ${issue.location}
- **Fix:** ${issue.fixSuggestion}
${issue.screenshotRef ? `- **Screenshot:** ${issue.screenshotRef}` : ''}
`).join('\n')}

## Reproduction Steps

${executionArtifact.workflowResults.filter(w => w.overallStatus === 'failed').map(workflow => `
### ${workflow.workflowName}

${workflow.stepResults.filter(s => s.status === 'failed').map(step => `
1. **Step ${step.stepIndex + 1}:** ${step.action} \`${step.selector}\`
   - **Error:** ${step.error}
   - **Evidence:**
     - Console errors: ${step.evidence?.consoleErrors.length || 0}
     - Network failures: ${step.evidence?.networkFailures.length || 0}
`).join('\n')}
`).join('\n')}

${analysisArtifact.sourceAnalysisAvailable ? `
## Source Code References

${analysisArtifact.diagnosedErrors.filter(e => e.sourceLocation).map(error => `
- **${error.summary}**
  - File: \`${error.sourceLocation!.file}:${error.sourceLocation!.line}\`
  - Context: \`\`\`typescript
${error.sourceLocation!.context}
\`\`\`
`).join('\n')}
` : ''}

---

*Generated by Afterburn ${analysisArtifact.aiPowered ? '(AI-powered)' : '(Basic mode)'} on ${format(timestamp, 'PPpp')}*
`;

  return frontmatter + '\n' + body;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CDN-linked CSS | Inline CSS in `<style>` tags | 2024+ (pytest-html, Quarto) | True standalone reports, works offline |
| Separate image files | Base64 inline for <100KB images | 2023+ | Self-contained HTML, no broken asset links |
| Plain Markdown | Markdown + YAML frontmatter | 2025+ (Google Conductor) | Machine-readable AI context |
| Technical jargon | Plain English error messages | 2026 (AI coding tools era) | Accessible to non-technical vibe coders |
| Single report format | Dual reports (HTML + Markdown) | 2026 (Afterburn innovation) | Serves both human and AI audiences |

**Deprecated/outdated:**
- External CSS/JS via CDN: Security risk (CSP), dependency on external services, breaks offline
- Unstructured plain text reports: Not parseable by AI tools, requires manual interpretation
- JSON-only reports: Not human-readable, requires separate viewer tool

## Open Questions

1. **HTML file size limits**
   - What we know: Base64 increases size by 33%, browsers handle 10-20MB HTML files
   - What's unclear: Optimal screenshot resolution for embedding (512px? 768px? 1024px?)
   - Recommendation: Start with 768px max width, add `--full-quality` flag for 1200px

2. **AI report parsing compatibility**
   - What we know: Claude/Cursor/Copilot can consume Markdown with frontmatter
   - What's unclear: Do they prefer tables, lists, or code blocks for issue data?
   - Recommendation: Use all three (table for summary, lists for details, code blocks for reproduction steps)

3. **Health score weighting**
   - What we know: Lighthouse uses weighted averages, axe-core uses impact levels
   - What's unclear: Optimal weight distribution for vibe-coded sites (workflows vs accessibility vs performance?)
   - Recommendation: Start with 40/30/20/10 (workflows/errors/accessibility/performance), collect feedback

4. **Plain English translation quality**
   - What we know: Phase 4 already generates plain English diagnoses via LLM
   - What's unclear: Does this need further simplification for reports?
   - Recommendation: Reuse Phase 4 diagnoses directly, add context ("This broke your login flow") in report

## Sources

### Primary (HIGH confidence)

- [Handlebars Official Documentation](https://handlebarsjs.com/guide/)
- [marked npm package](https://www.npmjs.com/package/marked)
- [Quarto Self-Contained HTML](https://quarto.org/docs/output-formats/html-basics.html)
- [Lighthouse Accessibility Scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring)
- [pytest-html User Guide](https://pytest-html.readthedocs.io/en/latest/user_guide.html)

### Secondary (MEDIUM confidence)

- [Data URIs | CSS-Tricks](https://css-tricks.com/data-uris/)
- [Bug Severity and Priority Matrix](https://medium.com/hepsiburadatech/bug-severity-and-priority-matrix-ae14fb344559)
- [Plain Language Advances Technical Communication](https://centerforplainlanguage.org/plain-language-advances-technical-communication/)
- [Google Conductor: Context-Driven Gemini CLI](https://www.marktechpost.com/2026/02/02/google-releases-conductor-a-context-driven-gemini-cli-extension-that-stores-knowledge-as-markdown-and-orchestrates-agentic-workflows/)
- [Level Access Accessibility Health Score](https://client.levelaccess.com/hc/en-us/articles/4416169987735-Accessibility-health-score)

### Tertiary (LOW confidence)

- [The Base64 Dilemma: When to Inline Images in CSS](https://dev.to/turkaykalenci/the-base64-dilemma-when-and-how-to-actually-inline-images-in-css-2i9p)
- [How to Avoid Jargon in Technical Writing](https://www.vistaprojects.com/how-to-avoid-jargon/)
- [SARA: Managing Markdown Requirements](https://dev.to/tumf/sara-a-cli-tool-for-managing-markdown-requirements-with-knowledge-graphs-nco)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Handlebars and marked are industry standard, versions verified
- Architecture: HIGH - Self-contained HTML is proven pattern (Quarto, pytest-html), Markdown with frontmatter used by Google Conductor
- Pitfalls: MEDIUM - Base64 bloat and offline breakage are documented issues, health score weighting requires domain expertise
- Plain English: HIGH - Plain language principles well-established, target audience validated by project context

**Research date:** 2026-02-07
**Valid until:** 30 days (stable domain, report generation patterns don't change rapidly)
