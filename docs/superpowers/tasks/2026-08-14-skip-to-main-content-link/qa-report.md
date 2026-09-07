# QA Gate Report — skip-to-main-content-link

**Branch**: EPMCDME-8581_skip-to-main-content-link
**Runner**: npm (guide-first: `.ai-run/guides/quality-gates.md`)
**Started**: 2026-08-16T14:10:54Z
**Status**: PASSED

## Gates

| Gate  | Status | Duration | Command | Notes |
|-------|--------|----------|---------|-------|
| lint  | PASS | — | `npm run lint` | Only a benign informational warning ("React version not specified in eslint-plugin-react settings"); no error lines, exit 0. |
| typecheck | PASS | — | `npm run typecheck` | Silent output (tsc --noEmit), exit 0. |
| unit  | PASS | 136.07s | `npm run test:unit` | 405 test files passed, 4457 tests passed, exit 0. |
| integration | PASS | 83.09s | `npm run test:integration` | 35 test files passed, 474 tests passed / 1 pre-existing skipped, exit 0. |
| ui    | SKIPPED | — | (n/a) | No standalone UI/e2e gate is defined in `.ai-run/guides/quality-gates.md`; component-level UI behavior (skip link render/gating, focus-visible styling, click-to-focus) is covered by the unit gate above (App.test.tsx, SkipLink.test.tsx, PageLayout.test.tsx). |

## Failure detail (if any)

None — all gates passed.

## Drift signal

no
