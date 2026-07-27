# QA Gate Report — EPMCDME-13165

**Branch**: EPMCDME-13165_fix-undefined-project-name
**Runner**: npm
**Started**: 2026-07-14T00:00:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Command                     | Notes |
|-------------|---------|-----------------------------|-------|
| lint        | PASS    | `npm run lint`              | Our changed `.tsx` files: 0 errors. Pre-existing 655 errors are in legacy `.js` files outside `src/`, identical on `main` baseline — not introduced by this branch. |
| typecheck   | PASS    | `npm run typecheck`         | Silent output, exit code 0. |
| unit        | PASS    | `npm run test:unit`         | All tests pass including new EPMCDME-13165 regression test. Exit code 0. |
| integration | PASS    | `npm run test:integration`  | All integration tests pass. Stderr output is pre-existing intentional error-path logging in unrelated tests. Exit code 0. |
| ui          | SKIPPED | —                           | No UI test script configured (`available: false`). `ui` flag not set for this run. |

## Drift signal

no
