# QA Gate Report — epmcdme-8827-assistants-parity-frontend

**Branch**: EPMCDME-8827_workflow-version-history-fe
**Runner**: npm
**Started**: 2026-08-13T06:38:00Z
**Status**: BLOCKED

## Gates

| Gate | Status | Duration | Command | Notes |
|------|--------|----------|---------|-------|
| lint | PASS | 29s | `npm run lint` | Exit 0. Pre-existing eslint-plugin-react version warning only. |
| typecheck | PASS | 21s | `npm run typecheck` | Silent, exit 0. |
| unit | FAIL | 91s | `npm run test:unit` | 3450 tests passed in 303 files. 66 files failed to collect with `ERR_REQUIRE_ESM` (`refractor` via `react-syntax-highlighter`). This-run files passed: `EditWorkflowPage.versionHistory.test.tsx` (2), `WorkflowVersionHistoryPopup.test.tsx` (5). Pre-existing environment issue; documented on the Aug 11 version-history task. |
| integration | FAIL | 31s | `npm run test:integration` | 14 tests passed in 4 files. 31 suites failed to collect with the same `refractor` ESM error, including `EditWorkflowPage.integration.test.tsx`. |

## Failure detail

Collect-time crash (representative):

```
Error: require() of ES Module node_modules/refractor/lib/core.js from
node_modules/react-syntax-highlighter/dist/cjs/prism-light.js not supported.
```

This-run unit coverage that did run: all 7 new/rewritten tests passed.

## Drift signal

no
