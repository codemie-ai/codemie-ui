# QA Gate Report — epmcdme-14584-oauth-test-wrong-token

**Branch**: EPMCDME-14587_remove-new-types-fix-bugs
**Runner**: npm (guide-first: `.ai-run/guides/quality-gates.md`)
**Started**: 2026-09-03
**Status**: PASSED

## Gates

| Gate | Status | Command | Notes |
|------|--------|---------|-------|
| Lint | PASS | `npm run lint` | Failed first on import/order in the two Edit pages; guide auto-fix `npm run lint:fix` applied; re-run clean (only the pre-existing React-version eslint-plugin-react warning remains). |
| Type-check | PASS | `npm run typecheck` | `tsc --noEmit`, exit 0. |
| License check | N/A | `npm run license-check` | Skip-if honored: no dependency added/removed/moved. |
| Secret detection | PASS | `npm run secrets:check` | gitleaks v8.30.1 pulled and ran; `no leaks found`. |
| Unit tests | PASS | `npm run test:unit` | 474 files, **5007 passed**. |
| Integration tests | PASS | `npm run test:integration` | 39 files, **496 passed / 1 skipped**. |

## Failure detail

None (lint self-healed via the guide's documented auto-fix; all gates green on the current working tree).

## Drift signal

no
