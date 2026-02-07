# SEO Blog Post Verification

Cross-check a blog post against ALL playbook requirements.

## Input
$ARGUMENTS - Path to the blog post file to verify

## Process

### Step 1: Load Files
1. Read the blog post from the provided path
2. **Read the FULL playbook:** `C:\claude_code\.claude\seo-playbook.md`

### Step 2: Automated Checks
Analyze the post against EVERY requirement:

#### Frontmatter Check
- [ ] Uses `date` field (NOT `publishedAt`)
- [ ] Title 50-70 chars with keyword in first half
- [ ] Description 150-160 chars
- [ ] Keywords array with 3-5 terms
- [ ] Author is "Credibly Team"

#### Structure Metrics
- [ ] **Word count:** [actual] (target: 2,500-3,000)
- [ ] **H2 sections:** [count] (target: 6-8)
- [ ] **Contrarian H2s:** [count] (target: 1-2) - look for "Everyone Is...", "Hidden...", "...Is Weaker Than You Think"
- [ ] **H3 subsections:** [count] (target: 2-4 per H2)
- [ ] **FAQ questions:** [count] (target: 3+)
- [ ] **Contrarian FAQ answer:** [yes/no] - unexpected twist answer
- [ ] **CTA section:** present with `* * *` break

#### Formatting Metrics
- [ ] **Blockquotes:** [count] (target: 6-8) - "My take:", "I've found..."
- [ ] **Tables:** [count] (target: 1-2)
- [ ] **Bold statistics:** [count] (target: 4-6) - all numbers bolded
- [ ] **Bullet lists with bold lead-ins:** [count]
- [ ] **Strategic italics:** [yes/no] - emphasis on key words

#### SEO Metrics
- [ ] **Keyword in title:** [yes/no]
- [ ] **Keyword in first 100 words:** [yes/no]
- [ ] **Keyword in H2s:** [count] (target: 2-3)
- [ ] **Internal links:** [count] (target: 3-5) - list destinations
- [ ] **External links:** [count] (target: 2-4) - list sources

#### Content Elements (NEW - CRITICAL)
- [ ] **Concrete math example:** [yes/no] - actual calculation shown
- [ ] **Specific anecdote:** [yes/no] - "I once worked with..." with metric
- [ ] **Vivid analogy:** [yes/no] - concrete comparison
- [ ] **"Here's a challenge:":** [yes/no] - direct reader engagement
- [ ] **"Actionable intelligence" callback:** [yes/no] - after examples
- [ ] **"Period." emphasis:** [yes/no] - statement ending with finality
- [ ] **"Vanity metric" callout:** [yes/no] - labeling something as worthless
- [ ] **Numbered product feature list:** [yes/no] - 3-step format

#### Tone Checks
- [ ] **Contractions used:** [yes/no] - you're, it's, don't, etc.
- [ ] **First person opinions:** [yes/no] - "My take", "I've seen"
- [ ] **AI slop detected:** [list violations]
  - Em dashes (—)
  - "In today's..."
  - "Unlock/leverage/harness"
  - "Game-changer/revolutionary/cutting-edge"
  - "Seamless/robust"

### Step 3: Score
Calculate compliance score: **[X/30]** checks passing

Grade:
- 28-30: Excellent - ready to publish
- 24-27: Good - minor fixes needed
- 20-23: Fair - several improvements required
- <20: Needs rewrite

### Step 4: Detailed Recommendations
List specific fixes needed with examples:

```
1. [Issue]: Missing concrete math example
   → Add: Show actual calculation like "200/10,000 x 100 = 2%"

2. [Issue]: No contrarian H2
   → Change: "Understanding Metrics" → "Why Your Metrics Are Lying to You"

3. [Issue]: Using "publishedAt" instead of "date"
   → Fix: Change frontmatter field name
```

### Step 5: Output Report
Format as clear table:

| Category | Score | Status |
|----------|-------|--------|
| Structure | X/7 | ✅/⚠️/❌ |
| Formatting | X/5 | ✅/⚠️/❌ |
| SEO | X/5 | ✅/⚠️/❌ |
| Content Elements | X/8 | ✅/⚠️/❌ |
| Tone | X/5 | ✅/⚠️/❌ |
| **TOTAL** | **X/30** | **Grade** |

## Example Usage
```
/seo-verify projects/testimonial-intelligence/content/blog/wall-of-love-that-converts.mdx
/seo-verify content/blog/conversion-rate-for-sales.mdx
```

## Quick Mode
If called without arguments after writing a post, verify the most recently modified `.mdx` file in `content/blog/`.

## Playbook Reference
All requirements come from: `C:\claude_code\.claude\seo-playbook.md`
