# Verify Application

$GIT_STATUS: git status --short
$PACKAGE_JSON: cat package.json 2>/dev/null | head -30

## Instructions

Run comprehensive verification to ensure code quality:

### Step 1: Lint Check
```bash
npm run lint
# or if no lint script:
npx eslint . --ext .js,.ts,.tsx,.jsx
```
- Report: PASS/FAIL with error count
- If FAIL: Show first 5 errors

### Step 2: Type Check (TypeScript projects)
```bash
npx tsc --noEmit
```
- Report: PASS/FAIL with error count
- If FAIL: Show first 3 type errors

### Step 3: Run Tests
```bash
npm test
# or:
npx vitest run
```
- Report: PASS/FAIL with test count
- If FAIL: Show failing test names

### Step 4: Build
```bash
npm run build
```
- Report: PASS/FAIL
- If FAIL: Show build error

### Step 5: Browser Verification (Web Apps)

If this is a web application:

1. Start dev server in background:
   ```bash
   npm run dev &
   ```

2. Wait for server to start (check localhost:5173 or :3000)

3. Use Playwright MCP to:
   - Navigate to the dev server URL
   - Take a screenshot
   - Check browser console for errors
   - Verify the page renders content

4. Stop the dev server

### Final Report

```
VERIFICATION SUMMARY
====================
Lint:        ✅ PASS / ❌ FAIL (X errors)
TypeScript:  ✅ PASS / ❌ FAIL (X errors)
Tests:       ✅ PASS / ❌ FAIL (X/Y passed)
Build:       ✅ PASS / ❌ FAIL
Browser:     ✅ PASS / ❌ FAIL (optional)
====================
Overall:     ✅ READY TO COMMIT / ❌ NEEDS FIXES
```

## Stop on First Failure

If any critical step fails (lint, types, tests), stop and report.
Don't continue to build if earlier steps failed.
