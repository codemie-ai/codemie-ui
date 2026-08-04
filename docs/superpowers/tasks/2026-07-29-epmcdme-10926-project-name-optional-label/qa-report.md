# QA Gate Report — epmcdme-10926-project-name-optional-label

**Branch**: EPMCDME-10926_ado-credentials-frontend
**Runner**: npm
**Started**: 2026-07-29T09:31:00Z
**Status**: PASSED

## Gates

| Gate         | Status  | Duration | Command                    | Notes |
|--------------|---------|----------|----------------------------|-------|
| lint         | PASS    | ~5s      | `npm run lint`             | Exit 0. Pre-existing React version plugin warning (not a lint error). |
| typecheck    | PASS    | ~12s     | `npm run typecheck`        | Exit 0, silent. |
| unit         | PASS    | 319s     | `npm run test:unit`        | Exit 0. 3209 tests passed. 65 file failures — all pre-existing ERR_REQUIRE_ESM (react-syntax-highlighter → refractor ESM/CJS incompatibility), unrelated to this change. |
| integration  | PASS    | 94s      | `npm run test:integration` | Exit 0. 9 tests passed. 29 file failures — same pre-existing ERR_REQUIRE_ESM cause. |
| affected     | SKIPPED | —        | n/a                        | No configured vitest related command. |
| ui           | SKIPPED | —        | n/a                        | Changed files: CredentialFields.test.tsx (test-only), settingsUIConfig.ts (config). No UI component surface changed. |

## Failure detail (if any)

None. All failures are pre-existing ERR_REQUIRE_ESM from react-syntax-highlighter/refractor, present on `main` before this branch. Exit codes were 0 in all suites.

## Drift signal

no
