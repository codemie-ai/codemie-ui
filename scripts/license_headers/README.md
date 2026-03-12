# Apache License Header Checker

Automated checking and fixing of Apache License 2.0 headers in CodeMie UI source files.

## Overview

This tool ensures all source files in the CodeMie UI project have proper Apache License 2.0 headers. It integrates with the existing development workflow and CI pipeline.

## Quick Start

### Fix and Check (Recommended)

**Fix all files and verify:**
```bash
npm run license-headers:fix
```

**Fix specific file and verify:**
```bash
npm run license-headers:fix src/components/MyComponent.tsx
```

This command:
1. Adds headers to files missing them (`--fix`)
2. Verifies all files have headers (`--check`)

### Individual Commands

**Check only (no changes):**
```bash
npm run license-headers:check                      # All files
npm run license-headers:check src/App.tsx          # Single file
```

**Fix only (add headers):**
```bash
npm run license-headers:fix                        # All files
npm run license-headers:fix src/components/        # Directory
```

### Run Full Verification (CI mode)

The license check can be integrated into your CI pipeline:

```bash
npm run license-headers:check
```

This will:
- Check all source files for Apache license headers
- Return exit code 1 if any files are missing headers
- Return exit code 0 if all files have headers

## Usage

### Command Line

The script can be run directly:

```bash
# Check all files (CI-friendly - returns non-zero if headers missing)
node scripts/license_headers/check_license_headers.mjs --check

# Check specific file(s)
node scripts/license_headers/check_license_headers.mjs --check src/App.tsx
node scripts/license_headers/check_license_headers.mjs --check src/components/

# Fix all files (adds headers to files)
node scripts/license_headers/check_license_headers.mjs --fix

# Fix specific file(s)
node scripts/license_headers/check_license_headers.mjs --fix src/App.tsx

# Quiet mode (for CI)
node scripts/license_headers/check_license_headers.mjs --check --quiet
```

### npm Scripts

Integrated with package.json:

```bash
# Combined: fix + check (recommended)
npm run license-headers                     # All files

# Individual commands
npm run license-headers:check                       # Check only
npm run license-headers:fix                         # Fix only
```

## What Files Are Checked?

### Included Files

The tool checks source files in:
- **`src/`** - All source code (includes subdirectories):
  - `src/components/` - React components ✓
  - `src/pages/` - Page components ✓
  - `src/hooks/` - Custom React hooks ✓
  - `src/store/` - State management ✓
  - `src/utils/` - Utility functions ✓
  - `src/types/` - TypeScript types ✓

### File Types

- **TypeScript files** (`.ts`, `.tsx`)
- **JavaScript files** (`.js`, `.jsx`, `.mjs`, `.cjs`)
- **Stylesheets** (`.css`, `.scss`)

### Excluded Files

The following are automatically excluded:

**Auto-generated code** (Apache guideline: lacks creative content):
- `*.d.ts` - TypeScript declaration files (auto-generated)
- `*.min.js`, `*.min.css` - Minified files

**Infrastructure and configuration**:
- `node_modules/` - Dependencies
- `dist/`, `build/` - Build output
- `deploy-templates/` - Deployment templates
- `templates/` - Templates

**Configuration files** (lacking creative content):
- `package.json`, `package-lock.json`
- `tsconfig.json`, `vite.config.ts`
- `.eslintrc.*`, `.prettierrc`
- `tailwind.config.js`, `postcss.config.js`

**Build artifacts and caches**:
- `node_modules/` - Dependencies
- `dist/`, `build/` - Build directories
- `coverage/` - Test coverage reports

**Documentation**:
- `README.md`, `CHANGELOG.md` - Project documentation
- `LICENSE*`, `NOTICE*` - License files

## Header Format

### TypeScript/JavaScript Files (`.ts`, `.tsx`, `.js`, `.jsx`)

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
```

### CSS Files (`.css`)

```css
/*
 * Copyright 2026 EPAM Systems, Inc. ("EPAM")
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
```

### SCSS Files (`.scss`)

```scss
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
```

## Smart Header Insertion

The tool intelligently handles special cases:

### Preserves Shebang Lines
```javascript
#!/usr/bin/env node
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// ...
```

## Workflow Integration

### Developer Workflow

1. **Write code** (headers optional during development)
2. **Run `npm run license-headers:fix`** before committing
3. **Review changes** and stage files
4. **Commit** as usual

### CI/CD Integration

Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Check license headers
  run: npm run license-headers:check
```

Or in your CI script:

```bash
npm run license-headers:check || (echo "Missing license headers. Run 'npm run license-headers:fix' locally." && exit 1)
```

## Troubleshooting

### "Missing license headers" error in CI

**Solution:**
1. Run locally: `npm run license-headers:fix`
2. Review the changes
3. Commit and push

### File not being checked

**Possible reasons:**
- File is in excluded directory (e.g., `node_modules/`, `dist/`)
- File extension not supported
- File too small (< 5 non-empty lines)
- File is a configuration file (e.g., `package.json`)

### Can't write to file

**Solution:**
- Check file permissions
- Ensure file is not read-only
- Close any editors that might have the file open

## Performance

- **Execution time**: Depends on project size
  - Small project (100 files): ~1-2 seconds
  - Medium project (500 files): ~3-5 seconds
  - Large project (1000+ files): ~10-15 seconds
- **Memory usage**: ~50-100 MB
- **Git operations**: Only reads git tracked files (fast)

## Exit Codes

- **0**: Success (all files have headers or all fixes applied)
- **1**: Failure (missing headers in --check mode, or write errors in --fix mode)

## Customization

### Changing the License Text

Edit `scripts/license_headers/license_template.txt` to change the license header text.

### Adding File Types

Edit `check_license_headers.mjs` and update the `COMMENT_STYLES` object with new file extensions and their comment styles.

### Excluding Files/Directories

Edit the exclusion lists in `check_license_headers.mjs`:
- `EXCLUDE_FILES` - Specific filenames to exclude
- `EXCLUDE_EXTENSIONS` - File extensions to exclude
- `EXCLUDE_DIR_PREFIXES` - Directory paths to exclude

## Integration with Pre-commit Hooks

You can add license checking to your pre-commit hooks:

```bash
# In .husky/pre-commit or similar
npm run license-headers:check
```

This will prevent commits if license headers are missing.
