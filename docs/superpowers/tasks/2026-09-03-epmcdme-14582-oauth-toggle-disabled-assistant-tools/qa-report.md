# QA Gate Report — epmcdme-14582-oauth-toggle-disabled-assistant-tools

**Branch**: EPMCDME-14587_remove-new-types-fix-bugs
**Runner**: npm (guide-first: `.ai-run/guides/quality-gates.md`)
**Status**: PASSED

## Gates

| Gate | Status | Command | Notes |
|------|--------|---------|-------|
| Lint | PASS | `npm run lint` | Clean (only pre-existing React-version eslint-plugin-react warning). |
| Type-check | PASS | `npm run typecheck` | exit 0. |
| License check | N/A | `npm run license-check` | No dependency change. |
| Secret detection | PASS | `npm run secrets:check` | `no leaks found`. |
| Unit tests | PASS | `npm run test:unit` | 475 files, **5012 passed**. |
| Integration tests | PASS | `npm run test:integration` | 39 files, **496 passed / 1 skipped**. |

## Failure detail
None.

## Drift signal
no
