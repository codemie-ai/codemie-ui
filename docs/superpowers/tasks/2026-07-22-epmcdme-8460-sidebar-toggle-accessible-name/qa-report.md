# QA Gate Report — epmcdme-8460-sidebar-toggle-accessible-name

**Branch**: EPMCDME-8460_sidebar-toggle-accessible-name
**Runner**: npm (guide-first: `.ai-run/guides/quality-gates.md`)
**Started**: 2026-07-22T12:04:00Z
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|------|--------|----------|---------|-------|
| lint | PASS | 19s | `npm run lint` | exit 0; only the pre-existing eslint-plugin-react "React version not specified" settings warning |
| typecheck | PASS | 15s | `npm run typecheck` | silent, exit 0 |
| unit | PASS | 62s | `npm run test:unit` | 3594/3594 passed under `LC_ALL=en_US.UTF-8`. Under the machine's system locale, 4 pre-existing tests fail (analyticsFormatters, ReleaseNotesPage, WorkflowExecutionInfoPopup — number/date formatting assumes en-US separators). Unrelated to this change: the branch diff touches only NavigationExpandButton.tsx + its test; all 4 pass with en-US locale forced. |
| integration | PASS | 53s | `npm run test:integration` | 372 passed, 1 skipped (pre-existing skip), `LC_ALL=en_US.UTF-8` |

## Failure detail

None. (Environmental note: the 4 locale-dependent unit tests above fail on non-en-US machines regardless of this branch; consider pinning the test locale in vitest config as a separate task.)

## Drift signal

no
