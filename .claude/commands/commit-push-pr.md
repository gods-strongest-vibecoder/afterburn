# Commit, Push, and Create PR

$GIT_STATUS: git status --short
$GIT_BRANCH: git rev-parse --abbrev-ref HEAD
$RECENT_COMMITS: git log -5 --oneline --no-decorate
$BASE_BRANCH: git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main"

## Instructions

Based on the git status and changes above:

1. **Stage all changes** - `git add -A`

2. **Create commit** with conventional commit format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `refactor:` for code changes that don't add features or fix bugs
   - `docs:` for documentation changes
   - `chore:` for maintenance tasks

3. **Push to remote** - `git push -u origin $GIT_BRANCH`

4. **Create PR** using `gh pr create`:
   - Title: Use the commit message subject
   - Body: Include summary of changes, test plan
   - Base: Use $BASE_BRANCH or main/master

5. **Return the PR URL** so the user can review it

## Quality Checks

Before committing, verify:
- No sensitive files (`.env`, credentials, secrets)
- No debug code left behind (`console.log`, `debugger`)
- Changes are related and cohesive (split if needed)
