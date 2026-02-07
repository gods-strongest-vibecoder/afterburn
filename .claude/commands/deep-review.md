# Security & Quality Review

$GIT_DIFF: git diff HEAD~1..HEAD --name-only
$GIT_STAGED: git diff --cached --name-only
$GIT_STATUS: git status --short
$RECENT_COMMITS: git log -3 --oneline --no-decorate

## Instructions

**MODEL REQUIREMENT**: This review MUST be performed by Claude Opus for thorough security analysis. Use `model: "opus"` if spawning a sub-agent.

### Step 1: Determine Scope

Based on arguments provided:
- **Default (no args)**: Review files from `$GIT_DIFF`
- **--staged**: Review files from `$GIT_STAGED`
- **--files <paths>**: Review the specified file paths

If no files to review (empty diff), inform user and exit.

### Step 2: Read All Files in Scope

Read each file completely. For very large files (>500 lines), prioritize:
- Functions handling user input (request params, body, query)
- Authentication/authorization middleware and checks
- Database queries and ORM operations
- File system operations (read, write, delete)
- External API calls and webhook handlers
- Cryptographic operations (hashing, encryption, token generation)

### Step 3: Security Analysis

Apply the OWASP-inspired security checklist below:

**A. Injection**: SQL, NoSQL, command, XSS, template, path traversal
**B. Auth & Authz**: Hardcoded creds, missing auth, broken authorization
**C. Sensitive Data**: Secrets in code, logging PII, verbose errors
**D. Misconfiguration**: CORS, security headers, debug mode
**E. Rate Limiting**: Missing throttling, resource exhaustion, ReDoS
**F. Cryptographic**: Weak hashing, timing attacks, predictable random
**G. File Operations**: Arbitrary read/write, path traversal

For each issue found, note:
- Severity (CRITICAL/HIGH/MEDIUM/LOW)
- File path and line number
- Code snippet showing the issue
- Why it's a problem (impact)
- How to fix it

### Step 4: Implementation Quality Analysis

Apply the quality checklist below:

**A. Error Handling**: Uncaught exceptions, silent failures
**B. Edge Cases**: Null handling, empty collections, boundaries
**C. Type Safety**: `any` usage, unsafe casts, missing types
**D. Resources**: Unclosed connections, memory leaks, missing cleanup
**E. Organization**: God functions, deep nesting, magic numbers
**F. Logic**: Inverted conditions, dead code, off-by-one

### Step 5: Generate Report

Output the structured report:

```
=== OPUS SECURITY & QUALITY REVIEW ===
Date: [current ISO timestamp]
Scope: [what was reviewed]
Files Reviewed: [count]
Model: Claude Opus

--- CRITICAL FINDINGS ---
[List all CRITICAL issues - must fix before merge]

--- HIGH SEVERITY ---
[List HIGH issues - should fix soon]

--- MEDIUM SEVERITY ---
[List MEDIUM issues - address when possible]

--- LOW SEVERITY ---
[List LOW issues - nice to fix]

--- SUMMARY ---
| Severity | Count |
|----------|-------|
| Critical | N     |
| High     | N     |
| Medium   | N     |
| Low      | N     |

VERDICT: [FAIL | PASS WITH WARNINGS | PASS]

--- RECOMMENDATIONS ---
[Priority action items]
```

### Step 6: Determine Verdict

- **FAIL**: Any CRITICAL finding exists
- **PASS WITH WARNINGS**: HIGH or MEDIUM findings, no CRITICAL
- **PASS**: Only LOW findings or clean

### Step 7: Follow-Up Guidance

Based on verdict:
- **FAIL**: User must fix CRITICAL issues before proceeding. Do not suggest committing.
- **PASS WITH WARNINGS**: Safe to merge, but track HIGH/MEDIUM items for follow-up.
- **PASS**: Ready for `/verify` and `/commit-push-pr`.

## Usage Examples

```bash
# Review recent changes (most common)
/deep-review

# Review only staged files
/deep-review --staged

# Review specific files
/deep-review --files src/api/auth.ts src/middleware/cors.ts

# Full module review
/deep-review --files src/auth/**/*.ts
```

## Integration

After `/deep-review` passes:
1. Run `/verify` for functional testing
2. Run `/commit-push-pr` to create PR
3. Include review summary in PR description if significant findings were addressed
