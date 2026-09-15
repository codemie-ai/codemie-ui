# QA Gate Report — EPMCDME-8554

**Branch**: EPMCDME-8554_focus-return-on-esc
**Runner**: npm
**Started**: 2026-09-03T13:20:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Command                     | Notes |
|-------------|---------|----------------------------|-------|
| lint        | PASS    | `npm run lint`              | Clean on committed code; lint error in untracked dev file `useFeatureFlags.ts` (not part of this branch) |
| typecheck   | PASS    | `npm run typecheck`         | Silent output, exit 0 |
| license     | SKIPPED | `npm run license-check`     | No dependencies added or removed |
| secrets     | PASS    | `npm run secrets:check`     | no leaks found |
| unit        | PASS    | `npm run test:unit`         | 470 test files, 4976 passed, 1 skipped |
| integration | PASS    | `npm run test:integration`  | 39 test files, 496 passed, 1 skipped |
| ui          | SKIPPED | —                           | UI surface changed but no configured Playwright/UI test script; manual browser smoke test recommended |

## Drift signal

no
