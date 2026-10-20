# QA Gate Report — epmcdme-8561-announce-uploaded-file

**Branch**: EPMCDME-8561_announce-uploaded-file
**Merge base**: 1bf0010d79aa3b9fafd4b2e5e570609ddb7d417f
**Runner**: npm (gates resolved from `.ai-run/guides/quality-gates.md`, plus the Husky pre-commit chain)
**Started**: 2026-09-03T11:18:00Z
**Status**: PASSED

## Gates

| Gate | Source | Status | Duration | Command | Notes |
|------|--------|--------|----------|---------|-------|
| lint | guide | PASS | ~30s | `npm run lint` | no violations; only the pre-existing "React version not specified" plugin warning |
| typecheck | guide | PASS | ~25s | `npm run typecheck` | `tsc --noEmit`, silent |
| license-check | guide | SKIPPED | — | `npm run license-check` | guide's "Skip if": no dependency added, removed or moved (package.json and the lockfile are untouched by this diff) |
| secrets | guide | PASS | 34s | `npm run secrets:check` | gitleaks really ran — scanned 92.28 MB, `no leaks found`; not a self-skip |
| unit | guide | PASS | 123s | `npm run test:unit` | 499 files, 5242 passed, 1 skipped — includes the 13 new tests |
| integration | guide | PASS | 69s | `npm run test:integration` | 40 files, 500 passed, 1 skipped |
| build | guide | PASS | ~15s | `npm run build:prod` | typecheck + vite build; only the pre-existing >500 kB chunk-size advisory |
| license-headers | hook | PASS | ~10s | `npm run license-headers:check` | 1982 files checked, 0 missing headers |
| sonar-local | hook | SKIPPED | — | `npm run sonar-local` | self-skipped: the runner prints "Skipping Sonar scan because SONAR_TOKEN is not set" and exits 0, so the pre-commit pass proves nothing; only the MR pipeline's `sonar` task settles this |
| ui | guide | SKIPPED | — | (n/a) | UI surface changed but the project configures no browser UI test script; `feature-verification` owes the browser evidence |

## Failure detail

None — no gate failed.

## Still owed (only CI can settle)

- `license-check` was skipped by the guide's own rule; the MR pipeline re-runs it server-side.
- Sonar only runs server-side here (no local `SONAR_TOKEN`), so its quality gate can only be settled by the MR pipeline. Its first run failed on the committed Playwright evidence script, which carried hardcoded local test credentials; the script now reads them from `CODEMIE_USER` / `CODEMIE_PASSWORD`.
- The Tekton MR pipeline re-runs `gitleaks-scan` server-side.
- Browser/assistive-technology proof of the announcement is not a mechanical gate: it is produced by `feature-verification` (accessibility-tree evidence, not DOM `textContent`).

## Drift signal

no — the implementation matches `plan.md`: the pure builder `buildFileAnnouncements(previousNames, currentNames, maxFiles)` and the name-identity diff in `FilesDropzone` carry the exact signatures the plan specified.
