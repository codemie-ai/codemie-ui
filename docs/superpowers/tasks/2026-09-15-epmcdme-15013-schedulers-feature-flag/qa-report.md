# QA Gate Report — EPMCDME-15013

**Branch**: EPMCDME-15013-schedulers-feature-flag
**Runner**: npm
**Started**: 2026-09-15T14:26:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Command                          | Notes                                           |
|-------------|---------|----------------------------------|-------------------------------------------------|
| lint        | PASS    | `npm run lint`                   | Exit 0; known React-version advisory warning only |
| typecheck   | PASS    | `npm run typecheck`              | Silent output, exit 0                           |
| secrets     | PASS    | `npm run secrets:check`          | `no leaks found`                                |
| license     | SKIPPED | `npm run license-check`          | No dependency changes                           |
| unit        | PASS    | `npm run test:unit:slnt`         | 551 files, 5658 tests passed                    |
| integration | PASS    | `npm run test:integration:slnt`  | 44 files, 526 passed, 1 skipped                 |
| ui          | SKIPPED | —                                | UI surface changed (Navigation.tsx) but no configured UI test script; feature-verification must provide browser evidence if required |

## Drift signal

no
