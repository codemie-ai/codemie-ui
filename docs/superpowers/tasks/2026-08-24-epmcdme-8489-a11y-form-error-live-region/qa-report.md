# QA Gate Report — epmcdme-8489-a11y-form-error-live-region

**Branch**: EPMCDME-8489_a11y-form-error-live-region
**Runner**: npm (guide-first, `.ai-run/guides/quality-gates.md`)
**Started**: 2026-08-24T14:48Z
**Status**: PASSED

## Gates

| Gate                | Source | Status  | Duration | Command                     | Notes |
|---------------------|--------|---------|----------|-----------------------------|-------|
| lint                | guide  | PASS    | ~30s     | `npm run lint`              | Clean. |
| typecheck           | guide  | PASS    | ~40s     | `npm run typecheck`         | Clean. |
| license-check       | guide  | SKIPPED | —        | `npm run license-check`     | Guide "Skip if": no dependency added, removed, or moved in this branch. |
| secrets:check       | guide+hook | PASS | 1m57s   | `npm run secrets:check`     | `no leaks found` (89.65 MB scanned). |
| test:unit           | guide  | PASS    | 148s     | `npm run test:unit`         | 4695 passed / 4695. |
| test:integration    | guide  | PASS    | 128s     | `npm run test:integration`  | 487 passed / 488 (1 pre-existing skip). |
| husky pre-commit    | hook   | PASS    | —        | `lint-staged`, `license-headers:check`, `secrets:check`, `sonar-local` | Every commit on this branch went through the hook successfully; `sonar-local` self-skipped (no `SONAR_TOKEN`), recorded here as a hook signal. |

## Failure detail

None.

## Drift signal

no
