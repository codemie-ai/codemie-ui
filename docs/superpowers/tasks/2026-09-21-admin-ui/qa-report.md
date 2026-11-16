# QA Gate Report — admin-ui

**Branch**: EPMCDME-15077_model-management_FE
**Runner**: npm (guide-first: .ai-run/guides/quality-gates.md)
**Started**: 2026-09-21T11:36:00Z
**Status**: BLOCKED (pre-existing lint error in dirty untracked file)

## Gates

| Gate        | Status  | Command                          | Notes |
|-------------|---------|----------------------------------|-------|
| lint        | FAIL    | `npm run lint`                   | 1 error in `src/hooks/useFeatureFlags.ts:123` — `react-hooks/rules-of-hooks`. File has 0 commits on this branch (`git diff origin/main...HEAD` returns empty for that file). Pre-existing issue in the dirty working tree; not introduced by this branch. Auto-fix attempted; not fixable automatically. |
| typecheck   | PASS    | `npm run typecheck`              | Silent, exit 0. |
| license     | SKIPPED | `npm run license-check`          | Skip if: no dependency changes. `package.json` unchanged on this branch. |
| secrets     | PASS    | `npm run secrets:check`          | `no leaks found`. |
| unit        | PASS    | `npm run test:unit:slnt`         | 575 test files, 5858 tests passed. |
| integration | PASS    | `npm run test:integration:slnt`  | 47 test files, 541 passed, 1 skipped (pre-existing). First run had 1 flaky timeout failure; two subsequent runs clean. |

## Failure detail

```
/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/hooks/useFeatureFlags.ts
  123:10  error  React Hook "useFeatureFlag" is called conditionally. React Hooks must be called
                 in the exact same order in every component render. Did you accidentally call a
                 React Hook after an early return?  react-hooks/rules-of-hooks

✖ 1 problem (1 error, 0 warnings)
```

**Context**: `src/hooks/useFeatureFlags.ts` is listed in the task instructions as a pre-existing dirty file. `git diff origin/main...HEAD -- src/hooks/useFeatureFlags.ts` returns empty — this file has no commits on this branch. The error pre-dates this work.

## Drift signal

no

## Branch changes: all green

All gates that exercise this branch's code pass:
- TypeScript: 0 errors across all 13 new/modified files
- Unit tests: 5858/5858 pass (575 test files)
- Integration: 541/541 pass (47 files, 1 pre-existing skip)
- No secrets
