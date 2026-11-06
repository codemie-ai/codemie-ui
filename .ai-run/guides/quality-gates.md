# Quality Gates

Run order is fastest-to-slowest.

## Full runs

| Command | Covers | Source |
|---|---|---|
| `npm run check:pre-commit` | check:generated-types, typecheck, lint | package.json |
| `npm run test:coverage` | unit tests with istanbul coverage, then integration tests | package.json |
| `.husky/pre-commit` | lint-staged, license-headers:check, secrets:check, sonar-local | .husky/pre-commit |
| `MR pipeline (external)` | pre-ci-guard waits for ci-pipeline and compliance-report on MRs targeting main; job bodies in epm-cdme/codemie-gitlab-templates | .gitlab-ci.yml |

---

### license-check

**Run**: `npm run license-check`
**Side effects**: may download license-checker via npx
**Pass**: exit 0 with summary
**Fail**: non-zero exit naming the package and licence

### license-headers

**Run**: `npm run license-headers:check`
**Pass**: exit 0
**Fail**: exit 1; 'Missing license header: <file>' lines
**Auto-fix**: npm run license-headers:fix

### lint

**Run**: `npm run lint`
**Pass**: exit 0
**Fail**: non-zero exit with eslint error lines
**Auto-fix**: npm run lint:fix

### generated-types

**Run**: `npm run check:generated-types`
**Side effects**: rewrites src/types/generated/marketplaceManagement.ts
**Pass**: exit 0 (no diff)
**Fail**: git diff exits 1 when generated types drift
**Auto-fix**: npm run generate:types

### type-check

**Run**: `npm run typecheck`
**Pass**: exit 0, no output
**Fail**: non-zero exit with TS error lines

### secret-scan

**Run**: `npm run secrets:check`
**Side effects**: pulls the gitleaks image
**Pass**: exit 0
**Fail**: exit = gitleaks exit code; exit 1 when no container engine is found (after printing 'skipping') or the daemon is not running

### test-unit

**Run**: `npm run test:unit:slnt`
**Pass**: exit 0
**Fail**: non-zero exit; FAIL lines

### test-integration

**Run**: `npm run test:integration:slnt`
**Pass**: exit 0
**Fail**: non-zero exit; FAIL lines

> **Read the output, not the exit code.** The script pulls the gitleaks image at run time (tag: `GITLEAKS_IMAGE` in `scripts/validate-secrets.mjs`) and prints `Secrets detected! Please remove sensitive data before committing.` whenever the child exits non-zero — including when the image could not be pulled. It also scans the working tree only, never git history. Both traps: [`security/verification.md`](security/verification.md).

---

### Test Harness (MR compliance gate)

**Run**: `npm run test-harness`

**Pass**: Summary shows no failures (e.g. `42 passed`), exit code 0.

**Fail**: Paste the summary anyway and group failures by cause in the MR (see the template). Reproduce on `main` with the same complete config before calling a failure unrelated.

**Auto-fix**: None.

**Skip if**: Never. The `auto_epm-cdme_vcs` bot checks the `## Test harness` section of the MR; without it the MR fails the compliance check. Needs the stack up and `~/.codemie/test-harness.json`. A gate that could not run is unverified, not passed. Manual browser scenarios and screenshots: [testing/local-verification.md](testing/local-verification.md).

---

## Pre-commit Gate (Automatic)

The Husky pre-commit hook runs these automatically on every `git commit`:

| Gate | Command | Notes |
|---|---|---|
| Staged file lint/format | `npx lint-staged` | Formats and lints only staged files |
| License headers | `npm run license-headers:check` | Checks all source files for license header |
| Secret detection | `npm run secrets:check` | Scans for accidentally committed secrets |
| Sonar local scan | `npm run sonar-local` | Local SonarQube static analysis |

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
