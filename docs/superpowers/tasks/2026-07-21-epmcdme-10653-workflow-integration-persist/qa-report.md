# QA Gate Report — epmcdme-10653-workflow-integration-persist

**Branch**: EPMCDME-10653_workflow-tool-integration-not-saved
**Runner**: npm
**Started**: 2026-07-21T09:10:00Z
**Status**: PASSED

## Gates

| Gate | Source | Status | Duration | Command | Notes |
|---|---|---|---|---|---|
| lint | guide | PASS | 16s | `npm run lint` | eslint clean; single benign warning about React version in eslint-plugin-react settings (unrelated to diff). |
| typecheck | guide | PASS | ~15s | `npm run typecheck` | tsc --noEmit exits 0, silent. |
| unit | guide | PASS | 54s | `npm run test:unit` | 284 files / 3511 tests passed. Includes the new EPMCDME-10653 regression tests (both preserve/skip cases). |
| integration | guide | PASS | 29s | `npm run test:integration` | 15 files passed. Pre-existing stderr warnings around normalizeAssistant mock data — unrelated to this diff and present on main. |
| ui | guide | SKIPPED | — | (n/a) | no UI surface changed — diff is confined to src/hooks/useToolkitSelection.ts (pure hook logic) and its unit test. |
| license-headers | hook | PASS | ~5s | `npm run license-headers:check` | 1616 files checked, 0 missing. |
| secrets | hook | PASS | 20s | `npm run secrets:check` | gitleaks: no leaks found. |
| sonar-local | hook | SKIPPED | — | `npm run sonar-local` | Self-skipped: "Skipping Sonar scan because SONAR_TOKEN is not set." — enable locally by setting SONAR_TOKEN; CI will run it for real. |

## Failure detail

None.

## Drift signal

no
