# Domain Pitfalls: AI-Powered Web Testing CLI Tools

**Domain:** AI-powered automated web testing for vibe-coded websites
**Researched:** 2026-02-07
**Target:** 7-day hackathon → working demo with real reliability

---

## Critical Pitfalls

Mistakes that cause rewrites, demo failures, or render the tool unusable.

### Pitfall 1: Anti-Bot Detection Kills Every Run

**What goes wrong:** Website blocks Playwright immediately. Tool fails on 60%+ of real websites.

**Why it happens:** Playwright displays command line flags and inherent properties (like `navigator.webdriver`) that scream "I am a bot". Anti-bot systems detect when Chrome DevTools Protocol (CDP) is in use, which all automation tools use to control the browser. Modern websites use browser fingerprinting, behavioral analysis, and request inspection to identify automation.

**Consequences:**
- Demo fails on live websites
- Tool unusable for most vibe-coder targets (React apps on Vercel, etc.)
- Users abandon after first failed run
- "It works on my local dev server" syndrome

**Prevention:**
1. **Phase 1 (MVP):** Use `playwright-extra` with stealth plugin to hide automation flags
2. **Test on real targets early:** Don't just test on localhost—test on Netlify/Vercel deployed sites in Week 1
3. **Proxy rotation:** For demo reliability, support optional proxy pools
4. **Browser fingerprint randomization:** Spoof user agents, screen resolutions, installed plugins

**Detection (warning signs):**
- Getting 403/429 status codes on public sites
- Pages load blank or show CAPTCHA challenges
- Works locally but fails on deployed sites
- Detection increases as you scale (running multiple URLs)

**Phase mapping:** Phase 1 must address this or tool is DOA. Cannot defer.

**Sources:**
- [Avoiding Bot Detection with Playwright Stealth](https://brightdata.com/blog/how-tos/avoid-bot-detection-with-playwright-stealth)
- [How To Make Playwright Undetectable | ScrapeOps](https://scrapeops.io/playwright-web-scraping-playbook/nodejs-playwright-make-playwright-undetectable/)
- [Making Playwright scrapers undetected with open source solutions](https://substack.thewebscraping.club/p/playwright-scrapers-undetected)

---

### Pitfall 2: LLM Token Cost Explosion

**What goes wrong:** Tool costs $5-20 per URL scan. Users refuse to pay. Hackathon budget explodes.

**Why it happens:** Screenshot analysis is token-heavy. A 1024×1024 screenshot = ~700-1,300 tokens per image. Testing a 20-page site with screenshots = 14K-26K tokens input, before any analysis output. Vision models like GPT-4V or Claude charge per image token.

**Consequences:**
- $10+ cost per site scan makes tool impractical
- Demo budget burns in 30 minutes
- Users hit rate limits during trial
- "This should be free" user expectation violated

**Prevention:**
1. **Selective screenshots:** Only capture key pages (homepage, critical flows), not every page
2. **Image compression:** Resize screenshots to 512×512 or 768×768 before sending to LLM (≈175-442 tokens)
3. **Prompt caching:** Use Claude's prompt caching (90% cost reduction on repeated prompts)
4. **Tiered analysis:**
   - Fast mode: Text-only HTML analysis (no screenshots)
   - Full mode: Screenshots + vision analysis
5. **Free tier strategy:** Offer 3-5 scans/month free, limit pages per scan

**Detection (warning signs):**
- Demo API costs exceed $50 in first hour
- Single scan takes >30 seconds
- Token usage metrics show >50K tokens per URL

**Phase mapping:**
- Phase 1: Implement selective screenshots + compression
- Phase 2: Add prompt caching
- Phase 3: Tiered modes (if time permits)

**Sources:**
- [LLM API Pricing Calculator | Compare 300+ AI Model Costs](https://www.helicone.ai/llm-cost)
- [LLM Cost Estimation Guide: From Token Usage to Total Spend](https://medium.com/@alphaiterations/llm-cost-estimation-guide-from-token-usage-to-total-spend-fba348d62824)
- [Visual-based Web Scraping: Using power of multimodal LLMs](https://medium.com/@neurogenou/vision-web-scraping-using-power-of-multimodal-llms-to-dynamic-web-content-extraction-cdde758311ae)

---

### Pitfall 3: SPA Navigation Invisibility

**What goes wrong:** Tool only tests homepage. Misses 90% of React/Vue app functionality.

**Why it happens:** Single-page apps use client-side routing that doesn't trigger full page reloads. Traditional crawlers look for `<a href>` tags and follow them, but SPAs use JavaScript router libraries (React Router, Vue Router) that update the URL without network requests. Playwright's `page.url()` returns stale URLs because `page.click()` resolves before navigation completes.

**Consequences:**
- Reports say "site has 1 page" when it has 20 routes
- Misses entire dashboard areas, settings pages, checkout flows
- Users say "this is useless for my app"
- Demo looks shallow (only tests landing page)

**Prevention:**
1. **Wait for URL changes:** Use `page.waitForURL()` after clicks, not `page.url()`
2. **Detect SPA frameworks:** Check for React Router, Vue Router presence in initial HTML
3. **Client-side route extraction:** Execute JavaScript in page context to extract routes from router config
4. **Hybrid crawling:** Combine traditional link following with SPA route detection
5. **Wait for network idle:** Use `page.waitForLoadState('networkidle')` before analysis

**Detection (warning signs):**
- Page count in report is suspiciously low (1-3 pages for complex app)
- Navigation clicks don't change `page.url()` value
- Screenshots look identical after "navigation"
- Test duration is too short (20-page SPA tested in 10 seconds)

**Phase mapping:** Phase 2 (after MVP proves basic detection works)

**Sources:**
- [How to Wait for Single Page Navigation with Playwright and React Router](https://lab.amalitsky.com/posts/2022/wait-for-single-page-navigation-and-re-hydration-playwright-react/)
- [Navigations | Playwright](https://playwright.dev/docs/navigations)
- [Playwright page.url() Returns Previous URL Instead of Current](https://www.codestudy.net/blog/using-playwright-page-url-is-getting-a-previous-url-instead-of-the-current-url/)

---

### Pitfall 4: Hallucinated Test Actions

**What goes wrong:** AI reports clicking buttons that don't exist. False positives destroy trust.

**Why it happens:** Vision LLMs hallucinate at rates of 15-79%, even latest models. When asked to identify "login button", LLM may confidently report finding one when the screenshot just shows a blue rectangle. Newer AI systems hallucinate MORE, not less, according to NYT research. LLMs are trained to be helpful, so they'll "find" what you asked for even if it's not there.

**Consequences:**
- Report says "Tested login flow successfully" when no login exists
- Users distrust all tool output ("is ANY of this real?")
- False confidence in broken features
- Demo credibility destroyed when user spots obvious hallucination

**Prevention:**
1. **Verification pass:** After LLM identifies elements, re-check with Playwright selectors (`page.locator()`)
2. **Confidence scoring:** Require LLM to provide confidence scores, filter out <70% confidence
3. **Consistency testing:** Ask same question 2-3 times with different phrasing, flag contradictions
4. **Ground truth anchoring:** Provide HTML structure alongside screenshots to LLM
5. **Explicit uncertainty:** Train prompts to say "not found" rather than guessing
6. **Human-in-the-loop:** For hackathon demo, manually verify critical test paths

**Detection (warning signs):**
- Report describes elements that aren't in screenshot
- Same URL tested twice gives different page counts/features
- LLM identifies forms on static content pages
- Test "success" on pages that obviously failed

**Phase mapping:** Phase 1 must include basic verification. Phase 3 adds consistency testing.

**Sources:**
- [AI Hallucination: Compare top LLMs like GPT-5.2 in 2026](https://research.aimultiple.com/ai-hallucination/)
- [Minimize AI hallucinations and deliver up to 99% verification accuracy with Automated Reasoning checks](https://aws.amazon.com/blogs/aws/minimize-ai-hallucinations-and-deliver-up-to-99-verification-accuracy-with-automated-reasoning-checks-now-available/)
- [What are AI Hallucinations? How to Test?](https://testrigor.com/blog/ai-hallucinations/)

---

### Pitfall 5: npx Cold Start Death

**What goes wrong:** First run takes 2-5 minutes. User cancels, assumes tool is broken.

**Why it happens:** `npx afterburn URL` downloads package on first run. Playwright then downloads browser binaries (Chromium = 500MB+). User's terminal shows no progress indicator, just hangs.

**Consequences:**
- 60%+ of first-time users abandon during install
- HN/Reddit comments: "Doesn't work, just hangs forever"
- Demo starts with 2-minute awkward silence
- Viral potential killed by bad first impression

**Prevention:**
1. **Progress indicators:** Show download progress (use `ora` or similar spinner library)
2. **Install-only mode:** `npx afterburn --install` to pre-download browsers
3. **Docker option:** Provide Docker image with browsers pre-installed for instant runs
4. **Minimal browser:** Use `--only-shell` flag to download headless shell only (smaller)
5. **Clear first-run messaging:** "First run: Downloading browsers (500MB)... this takes 2-3 minutes"
6. **Smart defaults:** Only install Chromium, not Firefox/WebKit

**Detection (warning signs):**
- No output for >30 seconds after run command
- Users reporting "hangs" or "broken" in issues
- Demo audience gets restless during install

**Phase mapping:** Phase 1 (must work for demo). Add progress bars Day 1.

**Sources:**
- [Playwright browser download size installation optimization 2026](https://playwright.dev/docs/browsers)
- [How to Install Playwright: A Comprehensive Guide for 2026](https://www.testmu.ai/learning-hub/how-to-install-playwright/)
- [Writing Powerful Claude Code Skills with npx bun](https://magarcia.io/writing-powerful-claude-code-skills-with-npx-bun/)

---

## Moderate Pitfalls

Mistakes that cause delays, poor UX, or technical debt.

### Pitfall 6: Infinite Scroll Blindness

**What goes wrong:** Tool thinks page has 5 items when it has 500 (infinite scroll).

**Why it happens:** Infinite scroll only loads new content when you scroll down. Traditional scrapers fetch HTML once and parse—initial HTML contains just the first batch (10-30 items). Lazy loading further delays image/content loads until viewport proximity.

**Consequences:**
- Incomplete test coverage (misses 90% of content)
- Reports undercount products, blog posts, search results
- Can't test pagination-heavy sites (e-commerce, social feeds)

**Prevention:**
1. **Auto-scroll detection:** Check for infinite scroll indicators (scroll event listeners, intersection observers)
2. **Progressive scrolling:** Scroll to bottom in increments, wait for new content loads
3. **Height tracking:** Track page height before/after scroll, stop when height stabilizes
4. **Timeout limits:** Cap at 100 scrolls or 60 seconds to prevent infinite loops
5. **Explicit wait for images:** Use `page.waitForLoadState('networkidle')` after each scroll

**Detection (warning signs):**
- Product listing pages report 10 items when site shows "500 results"
- Screenshots only capture "above the fold" content
- Tool finishes suspiciously fast on content-heavy sites

**Phase mapping:** Phase 2 or Phase 3 (if time permits after core features work)

**Sources:**
- [How To Scroll Infinite Pages in Python | ScrapeOps](https://scrapeops.io/python-web-scraping-playbook/python-scroll-infinite-pages/)
- [What Is Infinite Scroll And How to Handle It Efficiently | Octoparse](https://www.octoparse.com/blog/scrape-infinite-scroll)
- [Handling Infinite Scrolling Websites with Selenium](https://prosperasoft.com/blog/web-scrapping/selenium/selenium-infinite-scrolling-scraping/)

---

### Pitfall 7: CAPTCHA Blocker

**What goes wrong:** Form tests fail because CAPTCHAs block submission.

**Why it happens:** Automated testing behavior (rapid, repeated, predictable interactions) is exactly what reCAPTCHA detects and blocks. Invisible reCAPTCHA triggers on suspicious behavior. CI/CD pipelines fail with no clear indication CAPTCHA was the cause.

**Consequences:**
- Can't test signup flows, contact forms, login pages
- Demo fails if testing popular sites (most use CAPTCHA)
- Report says "form broken" when it's actually CAPTCHA blocking bot

**Prevention:**
1. **CAPTCHA detection:** Check for reCAPTCHA script tags, CAPTCHA iframes in page
2. **Test mode keys:** For hackathon demo, use sites with test CAPTCHA keys or no CAPTCHA
3. **Report transparency:** Flag forms with CAPTCHA as "not tested (CAPTCHA protected)"
4. **Bypass in dev:** If testing own sites, add `DISABLE_RECAPTCHA=true` environment flag
5. **Alternative targets:** Focus on static sites and dashboards (fewer CAPTCHAs) vs public signup forms

**Detection (warning signs):**
- Form submissions hang indefinitely
- See reCAPTCHA challenge iframes in screenshots
- Form "submit" clicks don't trigger navigation
- Network logs show CAPTCHA verification requests

**Phase mapping:** Phase 1 must detect CAPTCHAs and skip gracefully (don't fail entire run)

**Sources:**
- [reCAPTCHA Testing in Automation: Challenges & Solutions Guide](https://quashbugs.com/blog/recaptcha-testing-automation-challenges-solutions)
- [ReCAPTCHA Bypass: Top Strategies for Test Automation](https://muuktest.com/blog/bypass-captcha-for-software-testing)
- [The 2026 Guide to Solving Modern CAPTCHA Systems for AI Agents](https://www.capsolver.com/blog/web-scraping/2026-ai-agent-captcha)

---

### Pitfall 8: Cookie Consent Blocker

**What goes wrong:** Tool can't interact with page because cookie banner covers everything.

**Why it happens:** GDPR requires explicit consent before loading non-essential cookies. Banner appears on first visit, often as full-screen overlay blocking all content. Automation tools on first visit always trigger cookie banners.

**Consequences:**
- Screenshots show cookie banner instead of actual content
- Click targets hidden behind overlay
- Tests fail due to "element not clickable" errors
- Page analysis is of cookie banner text, not actual site

**Prevention:**
1. **Auto-dismiss:** Detect common cookie banner selectors (Cookiebot, OneTrust, etc.), click "Accept All" or "Reject All"
2. **Privacy-first default:** Default to "Reject All" to minimize cookies (aligns with user privacy)
3. **Banner detection:** Check for fixed/overlay positioned elements covering >50% viewport
4. **Wait for dismissal:** After clicking dismiss, wait for banner to animate away before proceeding
5. **Screenshot timing:** Take screenshots AFTER banner dismissal

**Detection (warning signs):**
- Screenshots show cookie banners
- First element found is always "Accept cookies" button
- Test reports mention GDPR compliance text
- Click actions fail with "element obscured" errors

**Phase mapping:** Phase 1 (core MVP). Auto-dismiss Day 2-3.

**Sources:**
- [How to Test Cookie Consent and GDPR Compliance](https://medium.com/@case_lab/how-to-test-cookie-consent-and-gdpr-compliance-752c5eae3a3f)
- [Cookie Consent Automation: Simplify Compliance with Top Tools & Strategies](https://secureprivacy.ai/blog/cookie-consent-automation)
- [Consent banner best practices for GDPR compliance](https://support.cookiebot.com/hc/en-us/articles/4401873267090-Consent-banner-best-practices-for-GDPR-compliance)

---

### Pitfall 9: Shadow DOM Invisibility

**What goes wrong:** Tool can't find elements inside web components. Reports "no forms found" on pages with forms.

**Why it happens:** Shadow DOM encapsulates elements, making them invisible to standard DOM queries. Web components (lit-element, Stencil) use shadow DOM extensively. XPath doesn't work on shadow DOM at all. Closed shadow roots are completely inaccessible.

**Consequences:**
- Modern framework-built sites partially tested (misses components)
- Design systems using web components break tool
- Reports incorrect results ("no interactive elements" when page is interactive)

**Prevention:**
1. **Shadow root piercing:** Use Playwright's `>>` selector to pierce shadow DOM
2. **Detect shadow roots:** Check for `shadowRoot` on elements before analyzing
3. **Closed shadow DOM warning:** Flag pages with closed shadow roots as "partially testable"
4. **CSS selectors only:** Don't use XPath (it can't pierce shadow DOM)

**Detection (warning signs):**
- Empty analysis on sites built with Lit, Stencil, Salesforce Lightning
- Element counts suspiciously low on modern sites
- Screenshots show interactive elements that report says don't exist

**Phase mapping:** Phase 2 or Phase 3 (after core detection works)

**Sources:**
- [Unlocking Shadow DOM for Test Automation: A Tester's Guide](https://medium.com/@ArpitChoubey9/unlocking-shadow-dom-for-test-automation-a-testers-guide-to-the-web-s-hidden-ui-layers-cc9dc0698d97)
- [Playwright Tutorial: IFrame and Shadow DOM Automation](https://www.automatetheplanet.com/playwright-tutorial-iframe-and-shadow-dom-automation/)
- [Automation testing with shadow DOM elements | Katalon Docs](https://docs.katalon.com/katalon-studio/test-objects/web-test-objects/automation-testing-with-shadow-dom-elements)

---

### Pitfall 10: Report Storage Explosion

**What goes wrong:** After 10 tests, user has 5GB of screenshots on disk.

**Why it happens:** Full-page screenshots are 200KB-2MB each. Testing 20 pages = 4-40MB per run. Reports include all screenshots by default. No cleanup mechanism.

**Consequences:**
- Users' disk space fills up
- Git repos accidentally include huge screenshot folders
- CI/CD runs fail due to artifact size limits
- Sharing reports becomes impractical (email won't accept 50MB attachments)

**Prevention:**
1. **Image compression:** Use lossy compression for screenshots (WebP at 80% quality)
2. **Thumbnail previews:** Store 200×150px thumbnails in reports, link to full images
3. **Configurable retention:** `--keep-last 5` flag to auto-delete old reports
4. **Cloud upload option:** Optional S3/Cloudflare R2 upload for screenshots
5. **HTML-only mode:** Offer report mode with no screenshots (just findings text)

**Detection (warning signs):**
- `.afterburn/` folder grows to >1GB after few uses
- Report HTML files are >50MB
- Browser struggles to load report (too many large images)

**Phase mapping:** Phase 1 must implement basic compression. Cloud upload = post-hackathon.

**Sources:**
- [Screenshot Testing: A Detailed Guide | BrowserStack](https://www.browserstack.com/guide/screenshot-testing)
- [Enhance Test Reporting with Screenshots & Video Capturing](https://testomat.io/features/reporting-screenshots-video-capturing/)

---

### Pitfall 11: Inconsistent LLM Output

**What goes wrong:** Running same URL twice gives different results. Users lose trust.

**Why it happens:** LLMs are non-deterministic by default (`temperature > 0`). Same screenshot + same prompt = different analysis. Vision model might "see" a button first run, miss it second run. Randomness in how LLM describes findings.

**Consequences:**
- Can't reproduce bugs ("it passed yesterday")
- CI/CD unreliable (flaky tests)
- Users question all results ("which run is correct?")
- Demo looks unprofessional if results change

**Prevention:**
1. **Temperature = 0:** Use deterministic LLM settings (`temperature: 0`)
2. **Consistency validation:** Run same analysis twice, flag if results differ >20%
3. **Structured output:** Use JSON schema to force consistent response format
4. **Caching with TTL:** Cache LLM responses per URL hash for 24 hours
5. **Prompt engineering:** Use explicit instructions ("List exactly X items. No more, no less.")

**Detection (warning signs):**
- Same URL tested 3 times gives 3 different page counts
- Issue descriptions vary wildly between runs
- Demo shows different results than preparation run

**Phase mapping:** Phase 1 (critical for demo reliability). Set temperature=0 Day 1.

**Sources:**
- [AI Hallucination: Compare top LLMs like GPT-5.2 in 2026](https://research.aimultiple.com/ai-hallucination/)
- [15 AI Agent Observability Tools in 2026: AgentOps & Langfuse](https://research.aimultiple.com/agentic-monitoring/)

---

## Minor Pitfalls

Annoying issues that are fixable but waste time.

### Pitfall 12: Platform Fragmentation

**What goes wrong:** "Works on my Mac" but fails on Windows. Or vice versa.

**Why it happens:** Path separators differ (Windows `\` vs Unix `/`). Playwright browser binaries differ by OS. Windows Defender may block browser downloads. Permission issues on Linux/Mac.

**Consequences:**
- Demo fails on organizer's laptop (different OS)
- Users file "doesn't work" issues (forgot to mention their OS)
- Hackathon team can't collaborate (half on Mac, half on Windows)

**Prevention:**
1. **Use Node.js path module:** `path.join()` not string concatenation
2. **Test on both platforms:** Have one Windows and one Mac tester
3. **Docker fallback:** Provide Docker image for consistent environment
4. **CI on multiple OSes:** GitHub Actions matrix (ubuntu, macos, windows)

**Phase mapping:** Phase 1 (if team is cross-platform). Otherwise post-hackathon.

---

### Pitfall 13: Network Timeout Defaults

**What goes wrong:** Tool fails on slow sites or slow internet connections.

**Why it happens:** Playwright defaults to 30s timeout. Slow sites (large images, slow servers, poor hosting) exceed this. Hotel WiFi at hackathon venue is terrible.

**Consequences:**
- Works at home, fails at hackathon venue (slow WiFi)
- Can't test realistic slow-loading sites
- Reports timeout errors instead of actual issues

**Prevention:**
1. **Increase timeout:** Set to 60s for page loads
2. **Configurable:** `--timeout 90s` flag for user override
3. **Retry logic:** Retry failed pages once before reporting error
4. **Progressive timeout:** Start 30s, increase to 60s on retry

**Phase mapping:** Phase 1. Set reasonable defaults Day 1.

---

### Pitfall 14: Verbose Report Overload

**What goes wrong:** Report is 50 pages long. User can't find key insights.

**Why it happens:** LLM generates paragraph per finding. Including everything "just in case". No prioritization or severity ranking.

**Consequences:**
- Users don't read reports (too long)
- Critical issues buried in noise
- Reports feel like homework, not actionable insights

**Prevention:**
1. **Executive summary:** 5-bullet summary at top ("Top 5 Issues Found")
2. **Severity ranking:** Critical / High / Medium / Low labels
3. **Collapsible sections:** HTML report with expand/collapse for details
4. **Configurable verbosity:** `--verbose` flag for full details, default is concise
5. **Visual hierarchy:** Use color coding, icons, clear section headers

**Phase mapping:** Phase 1 (UX matters for demo). Polish report format Day 4-5.

**Sources:**
- [Enhance Test Reporting with Screenshots & Video Capturing](https://testomat.io/features/reporting-screenshots-video-capturing/)

---

## Hackathon-Specific Warnings

### Pitfall 15: Scope Creep in 7 Days

**What goes wrong:** Team tries to build full testing suite with 20 features. Ships nothing.

**Why it happens:** Excitement about possibilities. "Just one more feature" syndrome. No clear MVP definition. Launch dates drive decisions, but roadmap keeps expanding.

**Consequences:**
- Demo shows half-finished features (looks unpolished)
- Core functionality broken because time spent on nice-to-haves
- Stress, burnout, incomplete submission

**Prevention:**
1. **Define MVP Day 1:**
   - Core: CLI that tests 1 URL, generates 1 report type, detects basic issues
   - Not MVP: Multi-URL, dashboard, CI/CD integration, plugins
2. **Feature freeze Day 5:** No new features after Day 5. Polish only.
3. **Cut ruthlessly:** If feature isn't demo-critical, cut it
4. **Ship by Day 6:** Full day buffer for demo prep and bug fixes

**Phase mapping:** This IS the phase mapping problem. Prevent by strict MVP scope.

**Sources:**
- [MVP Hackathon: The Fast-Track Playbook for Organizing Innovation-Driven Hackathons](https://corporate.hackathon.com/articles/mvp-hackathon-the-fast-track-playbook-for-organizing-innovation-driven-hackathons)
- [Mastering the Art of Feature Phasing: Building a Successful MVP While Avoiding Scope Creep](https://www.starthawk.io/blog/post/mastering-the-art-of-feature-phasing-building-a-successful-mvp-while-avoiding-scope-creep)

---

### Pitfall 16: Demo-Driven Technical Debt

**What goes wrong:** Hardcoded values, skipped error handling, brittle code. "Works for demo" but not real-world.

**Why it happens:** Investor demo is tomorrow, so skip edge cases and focus on happy path. Launch pressure forces trade-offs. Temporary solutions become permanent.

**Consequences:**
- Demo succeeds but tool unusable post-hackathon
- Bug reports flood in after launch
- Code unmaintainable for future development
- Reputation damage ("vaporware, doesn't actually work")

**Prevention:**
1. **Targeted shortcuts:** Hardcode only demo-specific values (test URLs), not core logic
2. **Flag debt:** Add `// TODO: Remove hardcode before v1.0` comments
3. **Graceful degradation:** Tool should fail gracefully, not crash
4. **Post-hackathon plan:** Document what needs refactoring (don't forget)
5. **Test with real data:** Demo on real vibe-coded sites, not just localhost

**Phase mapping:** Minimize debt by good architecture Day 1-2. Don't rush core components.

**Sources:**
- [Technical debt: a strategic guide for 2026](https://monday.com/blog/rnd/technical-debt/)
- [2026 Predictions: It's the Year of Technical Debt (Thanks to Vibe-Coding)](https://www.salesforceben.com/2026-predictions-its-the-year-of-technical-debt-thanks-to-vibe-coding/)

---

### Pitfall 17: Live Demo Dependency Failure

**What goes wrong:** Demo fails because OpenAI API is down, WiFi is slow, or test site changed overnight.

**Why it happens:** Live demos depend on external services (LLM APIs, internet, target sites). Any can fail during demo. Murphy's Law applies.

**Consequences:**
- "Technical difficulties" kills demo momentum
- Judges/audience lose interest during troubleshooting
- Backup plan doesn't exist
- Perception: "tool is unreliable"

**Prevention:**
1. **Recorded demo video:** Pre-record 2-minute demo video as fallback
2. **Local fallback:** Cache example report to show if API/internet fails
3. **Stable test targets:** Use own deployed site (you control), not third-party sites
4. **Offline mode:** Generate report from cached screenshots if LLM API fails
5. **Pre-run checks:** Run `npx afterburn --doctor` 10 minutes before demo to verify setup
6. **Hotspot backup:** Have phone hotspot ready if venue WiFi fails

**Phase mapping:** Demo prep Day 6-7. Create fallbacks Day 6.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation Strategy |
|-------------|----------------|---------------------|
| Phase 1: MVP Core | Anti-bot detection | Use playwright-extra stealth from Day 1 |
| Phase 1: MVP Core | npx cold start UX | Add progress indicators immediately |
| Phase 1: MVP Core | Token cost explosion | Implement screenshot compression + selective capture |
| Phase 1: MVP Core | Cookie consent blockers | Auto-dismiss common banners |
| Phase 2: SPA Support | Client-side routing invisibility | Use waitForURL(), extract routes from router |
| Phase 2: SPA Support | Infinite scroll blindness | Progressive scrolling with height tracking |
| Phase 3: Reliability | LLM hallucinations | Verification pass, temperature=0, consistency checks |
| Phase 3: Reliability | CAPTCHA blockers | Detect and flag as "not testable" |
| Demo Prep | Live demo failures | Pre-record video, cache example reports |
| Demo Prep | Scope creep | Feature freeze Day 5, ruthless cuts |

---

## Summary: Top 5 Demo Killers

Prioritize preventing these if time is limited:

1. **Anti-bot detection** → Tool fails on most real sites
2. **npx cold start** → Users abandon before first run completes
3. **LLM hallucinations** → False results destroy trust
4. **Token cost explosion** → Users refuse to pay, demo budget explodes
5. **Live demo failures** → Demo day disaster (have fallbacks!)

---

## Research Confidence

| Category | Confidence Level | Notes |
|----------|-----------------|--------|
| Browser automation pitfalls | HIGH | Official Playwright docs + industry best practices |
| AI/LLM integration pitfalls | HIGH | 2026 research on hallucinations + vision model costs |
| Form testing challenges | MEDIUM | Documented CAPTCHA/rate limit issues, less on email verification |
| Report generation | MEDIUM | General testing best practices, not CLI-specific |
| CLI distribution | MEDIUM | npx/Playwright install docs, less on cold start UX |
| Hackathon constraints | LOW | Generic hackathon advice, not web testing specific |

---

## Open Questions for Phase Research

Issues that need deeper investigation during specific phases:

1. **Phase 2 (SPA Support):** Which SPA router libraries are most common? (React Router, Vue Router, Next.js router?) Prioritize detection accordingly.

2. **Phase 3 (Reliability):** What structured output schemas work best for consistent LLM responses? JSON Schema? TypeScript interfaces?

3. **Demo Prep:** What are the most reliable free LLM APIs for hackathon demo? (OpenAI rate limits vs Anthropic vs Groq?)

4. **Post-hackathon:** How to handle email verification in signup flows? (Temp email services? Partner with email testing platforms?)

---

**Last updated:** 2026-02-07
**Next review:** Before Phase 1 planning (to validate pitfall priorities)
