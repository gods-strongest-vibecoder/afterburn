# SEO Blog Generator

Generate an Outrank-style SEO blog post for Credibly.

## Input
$ARGUMENTS - Primary keyword and optional secondary keywords

## Process

### Step 1: Load Playbook (MANDATORY)
**CRITICAL: You MUST read the entire playbook before writing anything.**

```
Read file: C:\claude_code\.claude\seo-playbook.md
```

This playbook contains ALL rules for:
- Frontmatter format (use `date`, NOT `publishedAt`)
- Voice & tone requirements
- Forbidden AI slop words
- Structure patterns (contrarian H2s, math examples, anecdotes)
- Formatting rules (bold stats, blockquotes, bullet patterns)
- Internal linking strategy
- Product mention guidelines
- Complete checklist

**Do not skip or summarize the playbook. Read it fully.**

### Step 2: Research Phase
Before writing, gather context:
1. Check existing blog posts in `projects/testimonial-intelligence/content/blog/` to avoid overlap
2. Identify 3-5 internal links:
   - `/blog` (general)
   - `/tools/wall-of-love`
   - `/tools/testimonial-email-generator`
   - Related existing articles
3. Use WebSearch to find 2-3 authoritative external sources for statistics
   - Get REAL numbers (don't make them up)
   - Note the source for citation

### Step 3: Plan Article Structure
Before writing, outline:
- 1-2 contrarian/provocative H2s ("Everyone Is Lying About...", "The Hidden X Destroying Your Y")
- 1 section with concrete math example
- 1 specific anecdote (Problem → Cause → Fix → Result)
- 1 vivid analogy
- FAQ with at least 1 contrarian answer

### Step 4: Write Article
Follow the playbook structure exactly:

```yaml
---
title: "[Generated Title - keyword in first half]"
description: "[150-160 char meta description with keyword]"
date: "YYYY-MM-DD"
author: "Credibly Team"
keywords: ["primary keyword", "secondary", "tertiary"]
---
```

**Opening (first 3 paragraphs):**
- Hook: "Let's be honest/real..."
- Pain point callout
- "The problem isn't X. It's Y."

**Body (6-8 H2 sections):**
- At least 1-2 contrarian H2 headlines
- 2-4 H3 subsections per H2
- Blockquotes every 300-400 words ("My take:", "I've found...")
- Bold all statistics
- Bullet lists with bold lead-ins

**Required elements:**
- 1 concrete math example with actual calculations
- 1 anecdote: "I once worked with a [company] that saw a **X% change**..."
- 1 vivid analogy
- 1 "Here's a challenge:" direct engagement
- 1 "vanity metric" callout
- Numbered product feature list (3 steps)

**FAQ section:**
- 3+ questions
- At least 1 with contrarian/unexpected answer
- Include blockquote in at least 1 answer

**CTA:**
```markdown
* * *

### [Benefit-focused heading]

[CTA paragraph with Credibly mention]

[Start your free trial of Credibly today](https://getcredibly.org) [value prop].
```

### Step 5: Quality Checklist
Verify ALL requirements from the playbook:

**Structure:**
- [ ] 2,500-3,000 words
- [ ] 6-8 H2 sections (1-2 contrarian)
- [ ] 2-4 H3 per major section
- [ ] FAQ with 3+ questions (1 contrarian)
- [ ] CTA with `* * *` break

**Formatting:**
- [ ] 6-8 blockquotes ("My take:", "I've found...")
- [ ] 1-2 comparison tables
- [ ] Bold ALL statistics
- [ ] Bullet lists with bold lead-ins
- [ ] Strategic italics for emphasis

**SEO:**
- [ ] Keyword in title, first 100 words, 2-3 H2s
- [ ] 3-5 internal links (natural anchor text)
- [ ] 2-4 external links with sources
- [ ] 4-6 statistics (real, not made up)
- [ ] Meta description 150-160 chars

**Content (NEW REQUIREMENTS):**
- [ ] At least 1 concrete math example
- [ ] At least 1 specific anecdote
- [ ] At least 1 vivid analogy
- [ ] "Here's a challenge:" engagement
- [ ] "Actionable intelligence" callback
- [ ] "Period." emphasis on key point
- [ ] "Vanity metric" callout
- [ ] Numbered product feature list

**Tone:**
- [ ] Contractions throughout
- [ ] No AI slop (unlock, leverage, game-changer, em dashes)
- [ ] Confident "My take" opinions
- [ ] Specific, not generic

### Step 6: Save Article
Save to: `projects/testimonial-intelligence/content/blog/[slug].mdx`

(Save directly to blog folder, not drafts, unless user specifies otherwise)

### Step 7: Commit & Push
After saving, commit and push to production:
```bash
cd projects/testimonial-intelligence
git add content/blog/[slug].mdx
git commit -m "content(blog): add [title]"
git push origin master
```

### Step 8: Submit for Google Indexing
After push succeeds, submit the URL for instant indexing:
```bash
curl -X POST https://getcredibly.org/api/indexing \
  -H "Content-Type: application/json" \
  -d '{"url": "https://getcredibly.org/blog/[slug]"}'
```

Or if local/testing:
```typescript
import { indexBlogPost } from '@/lib/google-indexing'
await indexBlogPost('[slug]')
```

### Step 9: Report
Output summary:
- Title
- Word count
- Primary keyword
- Checklist compliance (X/25 items)
- File location
- Git commit hash
- Indexing status (submitted/skipped)

## Example Usage
```
/seo-blog best testimonial software for small business
/seo-blog how to get more google reviews
/seo-blog social proof examples ecommerce
```

## Remember
- **READ THE FULL PLAYBOOK FIRST** - it has everything
- Research REAL statistics (WebSearch)
- Internal links should feel natural
- Product mentions are helpful, not salesy
- The playbook is at: `C:\claude_code\.claude\seo-playbook.md`
