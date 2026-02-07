# SEO Blog Batch Generator

Process the keyword queue and generate multiple blog posts.

## Input
$ARGUMENTS - Optional: number of posts to generate (default: 1), or "all" for entire queue

## Process

### Step 1: Load Playbook (MANDATORY FIRST)
**CRITICAL: Before generating ANY content, read the ENTIRE playbook:**

```
Read file: C:\claude_code\.claude\seo-playbook.md
```

This contains ALL formatting rules, required elements, and the complete checklist.
**Do not proceed without reading it.**

### Step 2: Load Queue
Read `projects/testimonial-intelligence/content/blog/seo-queue.json`

### Step 3: Select Keywords
Pick the next N pending keywords by priority (high > medium > low).

### Step 4: For Each Keyword

1. **Research phase:**
   - Check existing posts to avoid overlap
   - Use WebSearch to find 2-3 REAL statistics with sources
   - Identify 3-5 internal linking opportunities

2. **Plan structure:**
   - Outline contrarian H2s
   - Plan the math example section
   - Plan the anecdote
   - Plan the contrarian FAQ answer

3. **Generate article following playbook:**
   - Use correct frontmatter (`date`, NOT `publishedAt`)
   - Include ALL required elements:
     - Contrarian H2s
     - Concrete math example
     - Specific anecdote (Problem → Cause → Fix → Result)
     - Vivid analogy
     - "Here's a challenge:" engagement
     - "Vanity metric" callout
     - Numbered product feature list
   - 6-8 blockquotes
   - Bold all statistics
   - 3-5 internal links

4. **Run quality checklist** (all 25 items from playbook)

5. **Save to** `content/blog/[slug].mdx`

6. **Update queue** - set status to "generated" with date

### Step 5: Review Summary
Output table of all generated posts:

| Keyword | Title | Words | Checklist | File |
|---------|-------|-------|-----------|------|
| ... | ... | ... | X/25 | ... |

### Step 6: Publish Option
Ask user: "Ready to publish these posts?"

If yes:
1. Update `seo-queue.json` status to "published"
2. Git commit: `content(blog): add [N] SEO articles`
3. Optionally push to remote

## Quality Gates (from Playbook)
Each article must pass ALL checks:

**Structure:**
- [ ] Word count 2,500-3,000
- [ ] 6-8 H2 sections (1-2 contrarian)
- [ ] 2-4 H3 per H2
- [ ] FAQ 3+ questions (1 contrarian)
- [ ] CTA with `* * *` break

**Formatting:**
- [ ] 6-8 blockquotes
- [ ] 1-2 tables
- [ ] Bold all statistics
- [ ] Bullet lists with bold lead-ins
- [ ] Strategic italics

**SEO:**
- [ ] Keyword in title + first 100 words + H2s
- [ ] 3-5 internal links
- [ ] 2-4 external links
- [ ] 4-6 real statistics

**Content (REQUIRED):**
- [ ] 1 concrete math example
- [ ] 1 specific anecdote
- [ ] 1 vivid analogy
- [ ] "Here's a challenge:" engagement
- [ ] "Actionable intelligence" callback
- [ ] "Vanity metric" callout
- [ ] Numbered product feature list (3 steps)

**Tone:**
- [ ] No AI slop (em dashes, unlock, leverage, game-changer)
- [ ] Contractions throughout
- [ ] "My take" opinions

## Example Usage
```
/seo-blog-batch        # Generate 1 post from queue
/seo-blog-batch 3      # Generate 3 posts
/seo-blog-batch all    # Process entire queue
```

## Playbook Location
`C:\claude_code\.claude\seo-playbook.md` - READ THIS FIRST, EVERY TIME
