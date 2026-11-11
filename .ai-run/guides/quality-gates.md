# Quality Gates

Run order is fastest-to-slowest.

## Full runs

| Command | Covers | Source |
|---|---|---|
| `npm run check:pre-commit` | generated-types drift (git diff on src/types/generated/), tsc --noEmit, eslint | package.json |
| `npm run build` | tsc --noEmit then vite build | package.json::build |
| `npm run test:coverage` | unit project with coverage, then integration project | package.json |
| `npm run all:fix` | prettier --write src/ and eslint --fix (writes, not a check) | package.json |
| `git commit (.husky/pre-commit)` | lint-staged (prettier, eslint --fix, tsc --noEmit, licence headers on staged files), license-headers:check, secrets:check, sonar-local | .husky/pre-commit |
| `MR pipeline (.gitlab-ci.yml)` | MR events only; target main waits on external ci-pipeline and compliance-report contexts via wait-ci-init; other targets run no-op; job bodies live in epm-cdme/codemie-gitlab-templates, not this repository | .gitlab-ci.yml::wait-ci-init |

---

### lint

**Run**: `npm run lint`
**Pass**: exit 0 (eslint reports no errors)
**Fail**: non-zero exit with eslint error lines
**Auto-fix**: `npm run lint:fix` — fixes auto-fixable issues (unused imports, quote style, trailing commas). Not all errors are auto-fixable; review remaining errors manually.
**Skip if**: Linting only non-`src/` files (e.g. pure config edits). Always run when touching `src/`.

### format

**Run**: `npx prettier --check src/`
**Pass**: exit 0
**Fail**: non-zero exit listing files that differ
**Auto-fix**: npm run format

### type-check

**Run**: `npm run typecheck`
**Pass**: exit 0, no output
**Fail**: non-zero exit with `error TS` lines
**Auto-fix**: None — fix TypeScript errors manually. Common causes: missing type annotations, mismatched prop types, incorrect generic parameters.
**Skip if**: Documentation-only changes (no `.ts`/`.tsx` files modified).

### test

**Run**: `npm run test:unit:slnt`
**Pass**: exit 0; read the `Test Files` line, a suite that fails to import adds nothing to the passed count
**Fail**: non-zero exit with FAIL lines
**Auto-fix**: None — fix the test or the component code. Run a single file with `npm run test:unit -- --reporter=verbose src/path/to/Foo.test.tsx`.
**Skip if**: Changes are limited to files with no corresponding unit tests (e.g. pure config, assets). When in doubt, run anyway.

### integration-test

**Run**: `npm run test:integration:slnt`
**Pass**: exit 0; read the `Test Files` line
**Fail**: non-zero exit with FAIL lines
**Auto-fix**: None — integration tests verify Component → Store → API flow. Fix the implementation or the test assertion.
**Skip if**: Changes are purely in standalone utility functions with no component or store involvement. When in doubt, run anyway.

### secret-scan

**Run**: `npm run secrets:check`
**Side effects**: pulls ghcr.io/gitleaks/gitleaks:v8.30.1 and runs a container mounting the repository
**Pass**: exit 0 from the gitleaks container
**Fail**: non-zero exit; "Secrets detected!" is printed for any non-zero gitleaks exit, image-pull failures included; exit 1 when no engine or daemon. Read the output, not the exit code: `Secrets detected!` is printed for any non-zero child exit, including a failed image pull, and the scan covers the working tree only, never git history — see `security/verification.md`.
**Auto-fix**: None. A credential that reached a commit is compromised and must be rotated by a human — deleting the line is not the fix.
**Skip if**: Never skip; it also runs automatically in the pre-commit hook and server-side as the MR pipeline's `gitleaks-scan` task.

### license-check

**Run**: `npm run license-check`
**Side effects**: npx may download license-checker
**Pass**: exit 0 with a licence summary
**Fail**: non-zero exit naming the package whose licence is outside the allow list
**Auto-fix**: None. Either the dependency is replaced or the allow list changes, and changing the allow list is a decision, not a fix.
**Skip if**: No dependency was added, removed, or moved. This gate is not in the pre-commit hook, so it only runs when you run it.

### static-analysis

**Run**: `npm run sonar-local`
**Side effects**: runs the full test:coverage suite and writes coverage/; uploads the branch analysis to the Sonar host
**Pass**: exit 0 after "Sonar scan completed successfully."
**Fail**: exit 1 on test failure, scanner error or failed quality gate (details printed), or on branch-resolution errors
**Skip if**: SONAR_TOKEN unset, or the Sonar host unreachable (exit 0, "Skipping Sonar scan because …")

### test-harness

**Run**: `npm run test-harness`
**Side effects**: runs the external codemie-test-harness suite (uvx) against the app on port 5173 and a running backend
**Pass**: Summary shows no failures (e.g. `42 passed`), exit code 0.
**Fail**: Paste the summary anyway and group failures by cause in the MR (see the template). Reproduce on `main` with the same complete config before calling a failure unrelated.
**Auto-fix**: None.
**Skip if**: Never. The `auto_epm-cdme_vcs` bot checks the `## Test harness` section of the MR; without it the MR fails the compliance check. Needs the stack up and `~/.codemie/test-harness.json`. A gate that could not run is unverified, not passed. Manual browser scenarios and screenshots: testing/local-verification.md.

## Pre-commit Gate (Automatic)

The Husky pre-commit hook runs these automatically on every `git commit`:

| Gate | Command | Notes |
|---|---|---|
| Staged file lint/format | `npx lint-staged` | Formats and lints only staged files |
| License headers | `npm run license-headers:check` | Checks tracked `src/` files with a JS, TS, CSS, SCSS or HTML extension for the Apache header |
| Secret detection | `npm run secrets:check` | gitleaks in a container over the working directory, not git history; exits 1 without scanning when no container engine or daemon runs |
| Sonar local scan | `npm run sonar-local` | Exits 0 without scanning when `SONAR_TOKEN` is unset or the host is unreachable; otherwise runs `test:coverage` and uploads the branch analysis |

These run automatically — you do not invoke them manually before committing.

---

## Full Pre-MR Checklist

```bash
npm run lint                   # Lint all files
npm run typecheck              # TypeScript check
npm run test:unit:slnt         # Unit tests
npm run test:integration:slnt  # Integration tests
```

All four must exit 0 before pushing and opening an MR. Then run the harness gate above and the scenarios in [testing/local-verification.md](testing/local-verification.md).
