# QA Gate Report — EPMCDME-8436

**Branch**: EPMCDME-8436_focus-order-config-sidebar  
**Runner**: npm  
**Started**: 2026-08-20T18:21:00Z  
**Status**: BLOCKED (pre-existing failure — not introduced by this branch)

## Gates

| Gate        | Status  | Command                    | Notes |
|-------------|---------|----------------------------|-------|
| lint        | PASS    | `npm run lint`             | Exit 0; pre-existing React version warning only |
| typecheck   | PASS    | `npm run typecheck`        | Silent, exit 0 |
| license     | SKIPPED | `npm run license-check`    | No dependency changes |
| secrets     | PASS    | `npm run secrets:check`    | "no leaks found" |
| unit        | FAIL    | `npm run test:unit`        | 1 pre-existing failure in `tooltip.test.ts` (verified broken on main before this branch via git stash) |
| integration | PASS    | `npm run test:integration` | 36 files, 483 passed, 1 skipped |

## Failure detail

```
FAIL  src/utils/__tests__/tooltip.test.ts
  > setupGlobalTooltip > installs the scoped close behaviour against the rendered tooltip instance

Test Files  1 failed | 427 passed (428)
Tests       1 failed | 4642 passed (4643)
```

Pre-existing failure confirmed: `git stash && npm run test:unit -- "tooltip.test.ts"` reproduced the same failure on the clean branch state (before this PR's changes).

## Drift signal

no
