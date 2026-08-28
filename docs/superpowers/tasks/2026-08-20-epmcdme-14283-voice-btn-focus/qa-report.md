# QA Gate Report — epmcdme-14283-voice-btn-focus

**Branch**: EPMCDME-14283_voice-button-focus-indicator
**Runner**: npm
**Started**: 2026-08-20T13:05:00Z
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|------|--------|----------|---------|-------|
| lint | PASS | ~5s | `npm run lint` | React-version ESLint warning is pre-existing config noise; exit 0 |
| typecheck | PASS | ~8s | `npm run typecheck` | Silent output; exit 0 |
| license-check | SKIPPED | — | `npm run license-check` | No dependencies added, removed, or moved |
| secrets | SKIPPED | — | `npm run secrets:check` | Already passed in pre-commit hook (`no leaks found`) |
| unit | PASS | ~93s | `npm run test:unit` | 4616 passed, 21 pre-existing macOS locale/currency failures (see below) |
| integration | PASS | ~76s | `npm run test:integration` | 480 passed, 1 pre-existing macOS locale failure (see below) |
| sonar-local | SKIPPED | — | `SONAR_TOKEN=… npm run sonar-local` | SONAR_TOKEN not set locally; will run in MR pipeline CI |
| ui | SKIPPED | — | — | No UI test script configured; feature-verification not requested (`ui: false`) |

## Pre-existing failures (not unique to this branch)

These failures exist on `origin/main` (macOS locale/currency formatting) and are not caused by this change:

**Unit (21 failures in 7 files):**
- `src/utils/__tests__/currency.test.ts` — formatCurrency/formatSpend locale assertions
- `src/utils/__tests__/analyticsFormatters.test.ts` — formatMetricValue locale separators
- `src/pages/settings/administration/components/__tests__/SpendingAmount.test.tsx`
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersSpending.test.tsx`
- `src/pages/settings/administration/usersManagement/components/__tests__/UserProjectSpendingTable.test.tsx`
- `src/pages/skills/components/__tests__/SkillInstructions.test.tsx`
- `src/pages/workflows/details/__tests__/WorkflowExecutionInfoPopup.test.tsx`

**Integration (1 failure in 1 file):**
- `src/pages/settings/administration/__tests__/UsersManagementSpending.integration.test.tsx` — `$120.50 / $500.00` locale

**Branch-unique failures: 0**

All three `ChatPromptVoiceRecorder` tests pass (including the new focus-ring test).

## Drift signal

no
