// AI-powered workflow plan generator from sitemap data
import { WorkflowPlansResponseSchema } from './plan-schema.js';
/**
 * Generates realistic user workflow test plans from sitemap using Gemini AI.
 * Plans include step-by-step actions with Playwright selectors and confidence scores.
 */
export class WorkflowPlanner {
    gemini;
    constructor(geminiClient) {
        this.gemini = geminiClient;
    }
    /**
     * Generate workflow test plans from sitemap structure
     * @param sitemap Hierarchical sitemap tree from Phase 2 discovery
     * @param userHints Optional user-specified workflows to prioritize (from --flows flag)
     * @returns Array of workflow plans sorted by priority
     */
    async generatePlans(sitemap, userHints) {
        try {
            // Create condensed sitemap summary for LLM (token-efficient)
            const sitemapSummary = this.summarizeSitemap(sitemap, { maxChars: 40000 });
            // Build prompt with sitemap and user hints
            let prompt = `You are analyzing a website to identify realistic user workflows that should be tested.

SITE STRUCTURE:
${sitemapSummary}
`;
            if (userHints && userHints.length > 0) {
                prompt += `
USER-SPECIFIED WORKFLOWS TO PRIORITIZE:
${userHints.map(hint => `- ${hint}`).join('\n')}
`;
            }
            prompt += `
Generate workflow test plans for this website. For each workflow:

1. Identify a realistic user journey (signup, login, checkout, search, contact form, navigation, etc.)
2. Create step-by-step plan using Playwright selectors
3. Prefer role-based selectors: getByRole('button', { name: 'Sign Up' }), getByLabel('Email')
4. Include expected result for each step (what the user should see after the action)
5. Assign confidence 0-1 for each step (1.0 = selector definitely exists, 0.5 = guessing)
6. Assign priority: critical (auth, core features), important (secondary features), nice-to-have (edge cases)

Focus on workflows that a real user would actually do. Skip admin/internal paths.
If user provided hints, those workflows are top priority.

Return JSON with a "workflows" array.`;
            // Call Gemini with structured output
            let response;
            try {
                response = await this.gemini.generateStructured(prompt, WorkflowPlansResponseSchema);
            }
            catch (error) {
                // Retry once with simpler prompt if JSON parsing fails
                console.warn('Gemini API call failed, retrying with simpler prompt:', error);
                const simplerPrompt = `Analyze this website and generate 3-5 realistic user workflow test plans.

${sitemapSummary}

Return JSON with a "workflows" array where each workflow has: workflowName, description, steps (action, selector, value, expectedResult, confidence), priority, estimatedDuration.`;
                response = await this.gemini.generateStructured(simplerPrompt, WorkflowPlansResponseSchema);
            }
            // Post-process workflows
            const workflows = response.workflows
                .map(workflow => {
                // Filter out very low-confidence steps (likely hallucinated)
                const filteredSteps = workflow.steps.filter(step => step.confidence >= 0.3);
                // Flag workflows with low-confidence steps
                const hasLowConfidence = filteredSteps.some(step => step.confidence < 0.7);
                const description = hasLowConfidence
                    ? `${workflow.description} [Low confidence - verify selectors]`
                    : workflow.description;
                // Determine source
                const isUserHint = userHints?.some(hint => workflow.workflowName.toLowerCase().includes(hint.toLowerCase()) ||
                    workflow.description.toLowerCase().includes(hint.toLowerCase())) ?? false;
                return {
                    ...workflow,
                    description,
                    steps: filteredSteps,
                    source: isUserHint ? 'user-hint' : 'auto-discovered',
                };
            })
                // Remove workflows with no valid steps
                .filter(workflow => workflow.steps.length > 0)
                // Sort by priority
                .sort((a, b) => {
                const priorityOrder = { critical: 0, important: 1, 'nice-to-have': 2 };
                const aPriority = priorityOrder[a.priority];
                const bPriority = priorityOrder[b.priority];
                // User hints first within same priority
                if (aPriority === bPriority) {
                    if (a.source === 'user-hint' && b.source !== 'user-hint')
                        return -1;
                    if (a.source !== 'user-hint' && b.source === 'user-hint')
                        return 1;
                }
                return aPriority - bPriority;
            });
            return workflows;
        }
        catch (error) {
            // Graceful degradation: don't crash, return empty array
            console.warn('Failed to generate workflow plans:', error);
            return [];
        }
    }
    /**
     * Create condensed text summary of sitemap for LLM prompt
     * Truncates at maxChars to stay within token limits
     */
    summarizeSitemap(node, options) {
        const maxChars = options?.maxChars ?? 40000;
        let output = '';
        let charCount = 0;
        let pageCount = 0;
        let truncated = false;
        // Sort pages by importance: forms first, then interactive elements, then depth
        const sortedPages = this.collectPages(node).sort((a, b) => {
            const aScore = this.getPageImportance(a.pageData);
            const bScore = this.getPageImportance(b.pageData);
            if (aScore !== bScore)
                return bScore - aScore; // Higher score first
            return a.depth - b.depth; // Shallower first
        });
        // Add pages until we hit the char limit
        for (const page of sortedPages) {
            const pageSummary = this.formatPageSummary(page, page.depth);
            if (charCount + pageSummary.length > maxChars) {
                truncated = true;
                break;
            }
            output += pageSummary;
            charCount += pageSummary.length;
            pageCount++;
        }
        // Add truncation notice if needed
        if (truncated) {
            const remaining = sortedPages.length - pageCount;
            output += `\n... and ${remaining} more pages (truncated for brevity). Focus workflows on the pages shown above.\n`;
        }
        return output;
    }
    /**
     * Recursively collect all pages from sitemap tree
     */
    collectPages(node) {
        const pages = [node];
        for (const child of node.children) {
            pages.push(...this.collectPages(child));
        }
        return pages;
    }
    /**
     * Score page importance for prioritization
     * Higher score = more likely to contain important workflows
     */
    getPageImportance(pageData) {
        let score = 0;
        // Forms are high priority (auth, search, contact, etc.)
        score += pageData.forms.length * 10;
        // Buttons indicate interactions
        score += pageData.buttons.length * 2;
        // Menus and other interactive elements
        score += pageData.menus.length * 3;
        score += pageData.otherInteractive.length * 1;
        // Links indicate navigation structure
        score += Math.min(pageData.links.length, 20) * 0.5;
        return score;
    }
    /**
     * Format a single page as text summary
     */
    formatPageSummary(node, depth) {
        const indent = '  '.repeat(depth);
        const { pageData } = node;
        let summary = `${indent}Page: ${pageData.title} (${node.path})\n`;
        // Forms
        if (pageData.forms.length > 0) {
            const formDescriptions = pageData.forms.map(form => this.formatForm(form));
            summary += `${indent}  Forms: ${formDescriptions.join('; ')}\n`;
        }
        // Buttons
        if (pageData.buttons.length > 0) {
            const visibleButtons = pageData.buttons.filter(b => b.visible).slice(0, 10); // Limit to avoid token bloat
            const buttonTexts = visibleButtons.map(b => `"${b.text}"`).join(', ');
            summary += `${indent}  Buttons: ${buttonTexts}\n`;
        }
        // Menus
        if (pageData.menus.length > 0) {
            const menuTexts = pageData.menus.slice(0, 5).map(m => `"${m.text}"`).join(', ');
            summary += `${indent}  Menus: ${menuTexts}\n`;
        }
        // Link counts
        const internalLinks = pageData.links.filter(l => l.isInternal).length;
        const externalLinks = pageData.links.filter(l => !l.isInternal).length;
        summary += `${indent}  Links: ${internalLinks} internal, ${externalLinks} external\n`;
        summary += '\n';
        return summary;
    }
    /**
     * Format form as concise description
     */
    formatForm(form) {
        const fieldNames = form.fields.map(f => f.name || f.label).filter(Boolean).slice(0, 8);
        return `${form.method} form (${fieldNames.join(', ')})`;
    }
}
//# sourceMappingURL=workflow-planner.js.map