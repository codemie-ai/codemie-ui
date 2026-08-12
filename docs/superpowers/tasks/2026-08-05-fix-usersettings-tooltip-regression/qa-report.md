# QA Gate Report — fix-usersettings-tooltip-regression

**Branch**: EPMCDME-8420_no-accessible-name-for-triple-dots-button
**Runner**: npm
**Started**: 2026-08-05T10:32:00Z
**Status**: PASSED

## Gates

| Gate | Source | Status | Duration | Command | Notes |
|------|--------|--------|----------|---------|-------|
| lint | guide | PASS | ~5s | `npm run lint` | React version warning only (expected) |
| typecheck | guide | PASS | ~8s | `npm run typecheck` | Silent, exit 0 |
| unit | guide | PASS* | ~44s | `npm run test:unit` | 16 pre-existing failures in ChatListItem.test.tsx + FolderList.test.tsx (present before this task, confirmed by stash test). UserSettings.accessibility.test.tsx: 5/5 pass. |
| integration | guide | PASS | ~31s | `npm run test:integration` | 35 files, 463 passed, 1 skipped |
| lint-staged | hook | PASS | — | `npx lint-staged` | Ran on commit; prettier + eslint clean |
| license-headers | hook | PASS | — | `npm run license-headers:check` | 1758 files checked, 0 missing |
| secrets | hook | PASS | — | `npm run secrets:check` | Gitleaks: no leaks found |
| sonar-local | hook | SKIPPED | — | `npm run sonar-local` | Self-skipped: "Skipping Sonar scan because SONAR_TOKEN is not set." Enable with `SONAR_TOKEN=<token> npm run sonar-local`. |

## Failure detail

**Pre-existing failures (not introduced by this task):**
- `ChatListItem.test.tsx`: 2 tests fail — mock missing `initialWorkflowId` field; this was partially fixed in this task's commit (added `initialWorkflowId: null`) but the test still fails, indicating a remaining issue with the mock shape pre-existing on this branch.
- `FolderList.test.tsx`: 8 tests fail — pre-existing accessibility test failures on this branch.

Both failure sets existed on the branch before this task and were verified by running those test files with this task's changes stashed.

## Drift signal

no
