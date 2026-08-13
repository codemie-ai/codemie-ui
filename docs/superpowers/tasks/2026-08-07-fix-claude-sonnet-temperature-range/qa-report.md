# QA Gate Report — EPMCDME-13882

**Branch**: `EPMCDME-13882_fix-claude-sonnet-temperature-range`
**Runner**: `npm`
**Started**: 2026-08-07T12:05:00Z
**Status**: PASSED

## Gates

| Gate | Source | Status | Duration | Command | Notes |
|---|---|---|---|---|---|
| lint | guide | PASS | 9s | `npm run lint` | Only a settings warning (React version). |
| typecheck | guide | PASS | 7s | `npm run typecheck` | `tsc --noEmit`, no output. |
| unit | guide | PASS | 29s | `npm run test:unit` | 3989 tests / 335 files, all green. |
| integration | guide | PASS | 22s | `npm run test:integration` | 455 tests / 30 files, 1 pre-existing skip. |
| license-headers | hook | PASS | <1s | `npm run license-headers:check` | 1710 files, 0 missing headers. |
| secrets | hook | PASS | 4s | `npm run secrets:check` | Gitleaks scanned 16.1 MB; no leaks. Docker (colima) running locally. |
| sonar-local | hook | SKIPPED | <1s | `npm run sonar-local` | Self-skipped: `[sonar-local] Skipping Sonar scan because SONAR_TOKEN is not set.` — enable by exporting `SONAR_TOKEN` before commit, or let CI run it against SonarQube. |
| ui | guide | SKIPPED | — | (n/a) | UI surface changed but no dedicated `test:ui` script in `package.json`; feature-verification owns browser evidence. |
| test-harness | (pre-MR) | **PASS** | 4m 8s | `npm run test-harness` | Green after rebase onto latest `origin/main` + `poetry install` + fresh `npm run build`. **Final: `71 passed, 1 xfailed, 1 xpassed, 0 failed in 248.05s`.** Progression: run 1 blocked by dev-server login mismatch (70 setup errors); run 2 on preview build with stale DIAL key → 17 failures (chat LLM timeouts); run 3 with fresh DIAL key → 11 failures (upstream drift); **run 4 after `git rebase origin/main` closed all 11** — upstream had shipped fixes for the exact failure clusters (EPMCDME-13942 marketplace sort, EPMCDME-10889 clone counter, EPMCDME-13270 chat panel re-implementation, and related). Rebase re-applied all 14 EPMCDME-13882 commits with zero conflicts (only NewAssistantPage.integration.test.tsx was co-modified, git 3-way merged cleanly). Temperature helper + both form schemas + both render layers survived intact. Full log: `test-harness.log` (attached to MR). |

## Failure detail

None. All required gates pass.

## Drift signal

no
