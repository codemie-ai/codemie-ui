# QA Report — EPMCDME-8827 Workflow Version History Frontend

**Branch:** `EPMCDME-8827_workflow-version-history-fe`  
**Merge base:** `origin/main`  
**Run at:** 2026-08-11T14:07:00Z  
**Overall:** `passed: false` (full suite blocked by pre-existing ESM environment failures)

## Gate results

| Gate | Command | Result | Notes |
|---|---|---|---|
| Lint | `npm run lint` | **PASS** (after `npm run lint:fix`) | Import-order auto-fixed in `EditWorkflowPage.tsx`; committed |
| Type-check | `npm run typecheck` | **PASS** | exit 0 |
| Unit | `npm run test:unit` | **FAIL** | 65 failed / 303 passed; failures are `ERR_REQUIRE_ESM` (refractor / quill / router graph), not feature assertions |
| Integration | `npm run test:integration` | **FAIL** | 31 failed / 4 passed; same `refractor` ESM collect-time crash across pages including `EditWorkflowPage.integration.test.tsx` |

## Affected / feature-scoped evidence

Commands actually run:

```bash
npm run lint
npm run lint:fix   # then lint retry → PASS
npm run typecheck
npm run test:unit
npm run test:unit -- src/store/__tests__/workflowVersions.test.ts \
  src/hooks/__tests__/useUnsavedChanges.resetBaseline.test.tsx \
  src/pages/workflows/components/__tests__/WorkflowForm.test.tsx \
  src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.test.tsx \
  src/pages/workflows/components/__tests__/WorkflowConfigField.test.tsx \
  src/pages/workflows/editor/configPanels/__tests__/YamlPanel.test.tsx \
  src/components/form/VersionedField/__tests__/VersionHistoryDiffView.test.tsx
npm run test:integration
```

**Affected unit result:** **PASS** — 7 files, 33 tests.

These cover store/rollback, shared diff extraction, dirty baseline reset, popup, YamlPanel + WorkflowConfigField entry points.

## Analysis

Full-suite unit/integration failures share the same root cause already observed during implementation:

`require() of ES Module .../refractor/lib/core.js from .../react-syntax-highlighter/...`

This is an environment/module-interop issue in the local Vitest graph (often via `@/router` / MarkdownEditor), not a failing assertion in the EPMCDME-8827 version-history changes. Failures span unrelated domains (analytics, skills, settings, chat, etc.).

**Recommendation:** Treat lint + typecheck + affected unit as the actionable quality bar for this change; accept full-suite FAIL as environmental unless CI on `origin/main` is green for the same suites.

## UI gate

`ui` script not configured in gate plan → **SKIPPED** (feature-verification not requested; `ui` flag was false for sdlc-standard).
