# Quick Commit

$GIT_STATUS: git status --short
$GIT_DIFF_STAT: git diff --stat HEAD

## Instructions

Create a quick commit for the current changes:

1. **Review the changes** in the git status above

2. **Stage all changes** - `git add -A`

3. **Create commit** with conventional commit format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `refactor:` for code refactoring
   - `docs:` for documentation
   - `chore:` for maintenance
   - `style:` for formatting changes

4. **Commit message guidelines**:
   - Subject line: 50 chars max, imperative mood
   - Body (if needed): Explain "why" not "what"
   - Include `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>` if Claude made significant contributions

5. **Do NOT push** - This is just a quick local commit

## Example

```bash
git add -A && git commit -m "feat: add user authentication

Implements JWT-based auth with refresh tokens.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```
