// Discovery pipeline orchestrator: crawl + elements + SPA + links + sitemap + workflows
import { SiteCrawler } from './crawler.js';
import { detectSPAFramework, interceptRouteChanges } from './spa-detector.js';
import { discoverElements, discoverHiddenElements } from './element-mapper.js';
import { validateLinks, createLinkValidationState } from './link-validator.js';
import { buildSitemap, printSitemapTree } from './sitemap-builder.js';
import { WorkflowPlanner } from '../planning/index.js';
import { generateHeuristicPlans } from '../planning/heuristic-planner.js';
import { GeminiClient } from '../ai/index.js';
import { BrowserManager } from '../browser/index.js';
import { ScreenshotManager } from '../screenshots/index.js';
import { ArtifactStorage } from '../artifacts/index.js';
export async function resolveWorkflowPlans(planPromise, sitemap) {
    if (!planPromise) {
        return {
            workflowPlans: generateHeuristicPlans(sitemap),
            usedHeuristicFallback: true,
        };
    }
    try {
        const workflowPlans = await planPromise;
        return {
            workflowPlans,
            usedHeuristicFallback: false,
        };
    }
    catch {
        return {
            workflowPlans: generateHeuristicPlans(sitemap),
            usedHeuristicFallback: true,
        };
    }
}
/**
 * Runs complete Phase 2 discovery pipeline: crawl, discover elements, detect SPA,
 * validate links, build sitemap, generate workflow plans.
 *
 * @param options Discovery configuration
 * @returns Complete discovery artifact with sitemap and workflow plans
 */
export async function runDiscovery(options) {
    const { targetUrl, sessionId, userHints = [], maxPages = 10, headless = true, onProgress = (msg) => console.log(msg) } = options;
    // Step 1: Initialize managers
    const browserManager = new BrowserManager({ headless });
    const screenshotManager = new ScreenshotManager();
    const artifactStorage = new ArtifactStorage();
    let spaFramework = { framework: 'none' };
    let spaRoutes = [];
    const allBrokenLinks = [];
    const linkValidationState = createLinkValidationState();
    try {
        // Step 2: Launch browser
        onProgress('Launching browser...');
        await browserManager.launch();
        // Block heavy resources during discovery (images, fonts, video, analytics)
        // Keep SVG — icon-only buttons need them for element discovery
        const ctx = browserManager.getContext();
        if (ctx) {
            await ctx.route('**/*.{png,jpg,jpeg,gif,webp,woff,woff2,ttf,mp4,mp3}', r => r.abort());
            await ctx.route('**/analytics**', r => r.abort());
            await ctx.route('**/gtag**', r => r.abort());
        }
        // Step 3: SPA Detection (first page only)
        onProgress(`Detecting SPA framework on ${targetUrl}...`);
        const spaDetectionPage = await browserManager.newPage(targetUrl, { networkIdleTimeout: 5000 });
        try {
            // Detect framework
            spaFramework = await detectSPAFramework(spaDetectionPage);
            if (spaFramework.framework !== 'none') {
                onProgress(`Detected ${spaFramework.framework} app${spaFramework.version ? ' v' + spaFramework.version : ''}`);
                // Intercept routes if SPA detected
                onProgress('Discovering client-side routes...');
                spaRoutes = await interceptRouteChanges(spaDetectionPage);
                if (spaRoutes.length > 0) {
                    onProgress(`Found ${spaRoutes.length} client-side routes`);
                }
            }
            else {
                onProgress('No SPA framework detected');
            }
        }
        finally {
            await spaDetectionPage.close();
        }
        // Step 4: Define pageProcessor callback
        // This is called by the crawler for each page BEFORE it closes the page
        let pageIndex = 0;
        const pageProcessor = async (page, url) => {
            pageIndex++;
            try {
                // Discover visible elements
                const visibleElements = await discoverElements(page, url);
                // Discover hidden elements (modals, dropdowns)
                const hiddenElements = await discoverHiddenElements(page, url);
                // Merge visible + hidden (deduplicate by selector/href)
                const mergedElements = {
                    forms: [...visibleElements.forms],
                    buttons: [...visibleElements.buttons],
                    links: [...visibleElements.links],
                    menus: [...visibleElements.menus],
                    otherInteractive: [...visibleElements.otherInteractive],
                };
                // Merge hidden forms
                for (const form of hiddenElements.forms) {
                    if (!mergedElements.forms.some(f => f.selector === form.selector)) {
                        mergedElements.forms.push(form);
                    }
                }
                // Merge hidden buttons
                for (const button of hiddenElements.buttons) {
                    if (!mergedElements.buttons.some(b => b.selector === button.selector)) {
                        mergedElements.buttons.push(button);
                    }
                }
                // Merge hidden links
                for (const link of hiddenElements.links) {
                    if (!mergedElements.links.some(l => l.href === link.href)) {
                        mergedElements.links.push(link);
                    }
                }
                // Merge hidden menus
                for (const menu of hiddenElements.menus) {
                    if (!mergedElements.menus.some(m => m.selector === menu.selector)) {
                        mergedElements.menus.push(menu);
                    }
                }
                // Merge other interactive
                for (const other of hiddenElements.otherInteractive) {
                    if (!mergedElements.otherInteractive.some(o => o.selector === other.selector)) {
                        mergedElements.otherInteractive.push(other);
                    }
                }
                // Capture screenshot
                const screenshotRef = await screenshotManager.capture(page, `page-${pageIndex}`);
                // Validate links
                const brokenLinksOnPage = await validateLinks(mergedElements.links, page, linkValidationState);
                allBrokenLinks.push(...brokenLinksOnPage);
                // Report progress
                onProgress(`  Crawled: ${url} (${pageIndex} pages found)`);
                // Return partial PageData to merge with crawler's base data
                return {
                    forms: mergedElements.forms,
                    buttons: mergedElements.buttons,
                    menus: mergedElements.menus,
                    otherInteractive: mergedElements.otherInteractive,
                    screenshotRef,
                    spaFramework,
                };
            }
            catch (error) {
                // Log warning but continue crawl
                console.warn(`Warning: Failed to process page ${url}:`, error instanceof Error ? error.message : String(error));
                return {
                    forms: [],
                    buttons: [],
                    menus: [],
                    otherInteractive: [],
                };
            }
        };
        // Step 5: Construct SiteCrawler with pageProcessor and additionalUrls
        const crawlerOptions = {
            maxPages,
            onPageCrawled: (url, count) => {
                // Progress already handled in pageProcessor
            },
            pageProcessor,
            additionalUrls: spaRoutes,
        };
        const crawler = new SiteCrawler(browserManager, crawlerOptions);
        // Step 6: Run crawler
        onProgress('Starting site crawl...');
        const crawlResult = await crawler.crawl(targetUrl, spaRoutes);
        // Update crawl result with our collected data
        crawlResult.brokenLinks = allBrokenLinks;
        crawlResult.totalLinksChecked = linkValidationState.checkedCount;
        crawlResult.spaDetected = spaFramework;
        onProgress(`Crawl complete: ${crawlResult.totalPagesDiscovered} pages discovered`);
        // Step 7: Build sitemap
        onProgress('Building sitemap...');
        const sitemap = buildSitemap(crawlResult.pages, targetUrl);
        console.log('\nSite Map:');
        console.log(printSitemapTree(sitemap));
        // Step 8: Generate workflow plans (overlapped with browser cleanup)
        let workflowPlans = [];
        // Check if GEMINI_API_KEY is set
        const geminiApiKey = process.env.GEMINI_API_KEY;
        // Fire off planning as a non-blocking promise (doesn't need browser)
        let planPromise = null;
        if (geminiApiKey) {
            onProgress('Generating workflow plans with AI...');
            const geminiClient = new GeminiClient(geminiApiKey);
            const workflowPlanner = new WorkflowPlanner(geminiClient);
            planPromise = workflowPlanner.generatePlans(sitemap, userHints);
        }
        // Meanwhile, close browser (planning doesn't need it)
        onProgress('Closing browser...');
        await browserManager.close();
        // Now await planning result (or generate heuristic plans)
        const { workflowPlans: resolvedPlans, usedHeuristicFallback } = await resolveWorkflowPlans(planPromise, sitemap);
        workflowPlans = resolvedPlans;
        if (usedHeuristicFallback) {
            if (planPromise) {
                console.warn('\nAI planning failed - using heuristic test plans');
            }
            else {
                console.warn('\nUsing heuristic test plans (set GEMINI_API_KEY for smarter AI-driven testing)');
            }
            if (workflowPlans.length > 0) {
                console.log('\nDiscovered Workflows (heuristic):');
                workflowPlans.forEach((plan, index) => {
                    console.log(`  ${index + 1}. ${plan.workflowName} (${plan.priority}) - ${plan.steps.length} steps`);
                });
            }
        }
        else if (workflowPlans.length > 0) {
            console.log('\nDiscovered Workflows:');
            workflowPlans.forEach((plan, index) => {
                console.log(`  ${index + 1}. ${plan.workflowName} (${plan.priority}) - ${plan.steps.length} steps`);
            });
        }
        else {
            console.log('\nNo workflows generated');
        }
        // Step 9: Save discovery artifact (after plans are ready)
        const artifact = {
            version: '1.0',
            stage: 'discovery',
            timestamp: new Date().toISOString(),
            sessionId,
            targetUrl,
            sitemap,
            crawlResult,
            workflowPlans,
            userHints,
        };
        onProgress('Saving discovery artifact...');
        await artifactStorage.save(artifact);
        // Step 10: Return artifact
        return artifact;
    }
    catch (error) {
        console.error('Discovery pipeline failed:', error instanceof Error ? error.message : String(error));
        throw error;
    }
    finally {
        // Always close browser even on error
        try {
            await browserManager.close();
        }
        catch {
            // Ignore cleanup errors
        }
    }
}
//# sourceMappingURL=discovery-pipeline.js.map