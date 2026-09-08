# QA Gate Report — epmcdme-14075-workflow-progress-hydrate

**Branch**: EPMCDME-14075_workflow-progress-hydrate
**Runner**: npm
**Started**: 2026-08-14T08:30:12Z
**Status**: BLOCKED

## Gates

| Gate | Status | Duration | Command | Notes |
|-------|--------|----------|---------|-------|
| lint | PASS | 34s | `npm run lint` | Exit 0. React version warning only (pre-existing). |
| typecheck | PASS | 27s | `npm run typecheck` | Silent, exit 0. |
| unit | FAIL | 114s | `npm run test:unit` | Exit 1. 3636 tests passed, 0 assertion failures. 81 files failed to *collect* with `ERR_REQUIRE_ESM` (`refractor` via `react-syntax-highlighter`, `quill` via `primereact/editor`). Same collect error existed on `ChatPage.test.tsx` before this branch's ChatPage change. Scoped tests for this change: 45 passed / 4 files. |
| integration | FAIL | 37s | `npm run test:integration` | Exit 1. 14 tests passed. 31 files failed to collect with the same `ERR_REQUIRE_ESM` (`refractor`). |

## Failure detail

Last lines of unit gate:

```
Error: require() of ES Module .../node_modules/refractor/lib/core.js from
.../node_modules/react-syntax-highlighter/dist/cjs/prism-light.js not supported.

Test Files  81 failed | 324 passed (405)
      Tests  3636 passed (3636)
     Errors  1 error
```

Last lines of integration gate:

```
Error: require() of ES Module .../node_modules/refractor/lib/core.js from
.../node_modules/react-syntax-highlighter/dist/cjs/prism-light.js not supported.

Test Files  31 failed | 4 passed (35)
      Tests  14 passed (14)
```

Changed-file confirmation (`npm run test:unit --` chatHelpers, chats.refreshWorkflowExecutionIds, useWorkflowExecutionPoll, ChatAiMessage): **45 passed**.

## Drift signal

no
