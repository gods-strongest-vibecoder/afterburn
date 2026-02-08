// Discovery pipeline orchestrator: crawl + elements + SPA + links + sitemap + workflows

import type { Page } from 'playwright';
import { SiteCrawler } from './crawler.js';
import type { CrawlerOptions } from './crawler.js';
import { detectSPAFramework, interceptRouteChanges } from './spa-detector.js';
import { discoverElements, discoverHiddenElements } from './element-mapper.js';
import type { DiscoveredElements } from './element-mapper.js';
import { validateLinks } from './link-validator.js';
import { buildSitemap, printSitemapTree } from './sitemap-builder.js';
import { WorkflowPlanner } from '../planning/index.js';
import { generateHeuristicPlans } from '../planning/heuristic-planner.js';
import { GeminiClient } from '../ai/index.js';
import { BrowserManager } from '../browser/index.js';
import { ScreenshotManager } from '../screenshots/index.js';
import { ArtifactStorage } from '../artifacts/index.js';
import type {
  DiscoveryArtifact,
  PageData,
  BrokenLink,
  SPAFramework,
  CrawlResult,
  SitemapNode,
  WorkflowPlan
} from '../types/discovery.js';

export interface DiscoveryOptions {
  targetUrl: string;
  sessionId: string;
  userHints?: string[];      // from --flows flag
  maxPages?: number;         // 0 = unlimited (default)
  onProgress?: (message: string) => void;
}

/**
 * Runs complete Phase 2 discovery pipeline: crawl, discover elements, detect SPA,
 * validate links, build sitemap, generate workflow plans.
 *
 * @param options Discovery configuration
 * @returns Complete discovery artifact with sitemap and workflow plans
 */
export async function runDiscovery(options: DiscoveryOptions): Promise<DiscoveryArtifact> {
  const {
    targetUrl,
    sessionId,
    userHints = [],
    maxPages = 0,
    onProgress = (msg: string) => console.log(msg)
  } = options;

  // Step 1: Initialize managers
  const browserManager = new BrowserManager();
  const screenshotManager = new ScreenshotManager();
  const artifactStorage = new ArtifactStorage();

  let spaFramework: SPAFramework = { framework: 'none' };
  let spaRoutes: string[] = [];
  const allBrokenLinks: BrokenLink[] = [];

  try {
    // Step 2: Launch browser
    onProgress('Launching browser...');
    await browserManager.launch();

    // Step 3: SPA Detection (first page only)
    onProgress(`Detecting SPA framework on ${targetUrl}...`);
    const spaDetectionPage = await browserManager.newPage(targetUrl);

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
      } else {
        onProgress('No SPA framework detected');
      }
    } finally {
      await spaDetectionPage.close();
    }

    // Step 4: Define pageProcessor callback
    // This is called by the crawler for each page BEFORE it closes the page
    let pageIndex = 0;
    const pageProcessor = async (page: Page, url: string): Promise<Partial<PageData>> => {
      pageIndex++;

      try {
        // Discover visible elements
        const visibleElements = await discoverElements(page, url);

        // Discover hidden elements (modals, dropdowns)
        const hiddenElements = await discoverHiddenElements(page, url);

        // Merge visible + hidden (deduplicate by selector/href)
        const mergedElements: DiscoveredElements = {
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
        const brokenLinksOnPage = await validateLinks(mergedElements.links, page);
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
      } catch (error) {
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
    const crawlerOptions: CrawlerOptions = {
      maxPages,
      onPageCrawled: (url: string, count: number) => {
        // Progress already handled in pageProcessor
      },
      pageProcessor,
      additionalUrls: spaRoutes,
    };

    const crawler = new SiteCrawler(browserManager, crawlerOptions);

    // Step 6: Run crawler
    onProgress('Starting site crawl...');
    const crawlResult: CrawlResult = await crawler.crawl(targetUrl, spaRoutes);

    // Update crawl result with our collected data
    crawlResult.brokenLinks = allBrokenLinks;
    crawlResult.totalLinksChecked = allBrokenLinks.length;
    crawlResult.spaDetected = spaFramework;

    onProgress(`Crawl complete: ${crawlResult.totalPagesDiscovered} pages discovered`);

    // Step 7: Build sitemap
    onProgress('Building sitemap...');
    const sitemap: SitemapNode = buildSitemap(crawlResult.pages, targetUrl);

    console.log('\nSite Map:');
    console.log(printSitemapTree(sitemap));

    // Step 8: Generate workflow plans
    let workflowPlans: WorkflowPlan[] = [];

    // Check if GEMINI_API_KEY is set
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (geminiApiKey) {
      try {
        onProgress('Generating workflow plans with AI...');
        const geminiClient = new GeminiClient(geminiApiKey);
        const workflowPlanner = new WorkflowPlanner(geminiClient);

        workflowPlans = await workflowPlanner.generatePlans(sitemap, userHints);

        if (workflowPlans.length > 0) {
          console.log('\nDiscovered Workflows:');
          workflowPlans.forEach((plan, index) => {
            console.log(`  ${index + 1}. ${plan.workflowName} (${plan.priority}) - ${plan.steps.length} steps`);
          });
        } else {
          console.log('\nNo workflows generated');
        }
      } catch (error) {
        console.warn('Warning: Failed to generate workflow plans:', error instanceof Error ? error.message : String(error));
        console.warn('Continuing without workflow plans...');
      }
    } else {
      console.warn('\nUsing heuristic test plans (set GEMINI_API_KEY for smarter AI-driven testing)');
      workflowPlans = generateHeuristicPlans(sitemap);

      if (workflowPlans.length > 0) {
        console.log('\nDiscovered Workflows (heuristic):');
        workflowPlans.forEach((plan, index) => {
          console.log(`  ${index + 1}. ${plan.workflowName} (${plan.priority}) - ${plan.steps.length} steps`);
        });
      }
    }

    // Step 9: Save discovery artifact
    const artifact: DiscoveryArtifact = {
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

    // Step 10: Cleanup
    onProgress('Closing browser...');
    await browserManager.close();

    // Step 11: Return artifact
    return artifact;

  } catch (error) {
    console.error('Discovery pipeline failed:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    // Always close browser even on error
    try {
      await browserManager.close();
    } catch {
      // Ignore cleanup errors
    }
  }
}
