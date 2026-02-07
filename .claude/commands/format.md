# Format Code

$MODIFIED_FILES: git diff --name-only HEAD
$STAGED_FILES: git diff --cached --name-only

## Instructions

Format the modified files using Prettier:

1. **Identify files to format**:
   - Use the modified files list above
   - Focus on: `.js`, `.ts`, `.tsx`, `.jsx`, `.json`, `.css`, `.md`

2. **Run Prettier**:
   ```bash
   npx prettier --write <files>
   ```

3. **Run ESLint fix** (if available):
   ```bash
   npx eslint --fix <files>
   ```

4. **Report results**:
   - List files that were formatted
   - Note any files that couldn't be formatted
   - Show any linting errors that couldn't be auto-fixed

## Skip Formatting

Skip these file types:
- Binary files
- Generated files (`*.min.js`, `dist/`, `build/`)
- Lock files (`package-lock.json`, `yarn.lock`)
- Config files that shouldn't change (`.eslintrc`, `tsconfig.json`)

## Example

```bash
npx prettier --write src/components/Button.tsx src/utils/helpers.ts
npx eslint --fix src/components/Button.tsx src/utils/helpers.ts
```
