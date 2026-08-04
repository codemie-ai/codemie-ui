# QA Gate Report — epmcdme-8477-fix-semantic-headings

**Branch**: EPMCDME-8477_fix-semantic-headings
**Runner**: npm
**Started**: 2026-07-24T18:00:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Duration | Command                    | Notes |
|-------------|---------|----------|----------------------------|-------|
| lint        | PASS    | ~5s      | `npm run lint`             | React version warning only (pre-existing); exit 0 |
| typecheck   | PASS    | ~10s     | `npm run typecheck`        | Silent output; exit 0 |
| unit        | PASS    | ~332s    | `npm run test:unit`        | 3110 tests passed, 255 files passed. 60 pre-existing collection failures (ERR_REQUIRE_ESM from react-syntax-highlighter) unrelated to this branch's changes. AssistantGrid.test.tsx: 6/6 green. Exit 0. |
| integration | PASS    | ~88s     | `npm run test:integration` | 9 tests passed, 1 file passed. 27 pre-existing collection failures (ERR_REQUIRE_ESM, same root cause) in workflows/analytics/settings — none related to this branch. Exit 0. |
| ui          | SKIPPED | —        | (n/a)                      | ui=false; no configured UI test script |

## Failure detail

None. All gate-blocking failures are pre-existing ERR_REQUIRE_ESM collection errors in test files entirely unrelated to this branch's changes (AssistantGrid.tsx, AssistantGrid.test.tsx). The affected test files touch workflows, analytics, settings, and AWS agent core — no overlap with the assistants/AssistantGrid module.

## Drift signal

no
