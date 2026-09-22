# Plan: Remove ZephyrSquad integration entirely (frontend)

Ticket: EPMCDME-10913 (reopened). PO rejected the prior "deprecate" approach (merged MR
codemie-ui!1626 — hide from picker, redirect, read-only banner) and asked for total
removal: config entry, deprecation machinery, and all downstream references gone.

Backend companion (codemie repo, same branch name) removes `CredentialTypes.ZEPHYR_SQUAD`
and the `deprecated` tool-catalog flag entirely — once both ship, the assistant-edit tool
list (PO complaint #1) stops listing ZephyrSquad automatically, since it's fully
backend/runtime-driven with no frontend list to edit. Nothing to do here for that surface.

## Task 1 — Delete the ZephyrSquad config entry and dead deprecation machinery

Test-first: yes — `settings.test.ts`'s `describe('deprecated credential type filtering')`
block currently passes; deleting the `zephyrsquad` config entry first (before touching the
helper functions) makes several of its assertions fail (RED — `isDeprecatedCredentialType`
would throw/return wrong values, `getAvailableCredentialsTypes` would no longer exclude
anything). Then delete the block itself and the dead-code helpers together (GREEN).

- `src/utils/settingsUIConfig.ts`: delete the `zephyrsquad` entry (lines ~615-635) from
  `CREDENTIAL_UI_MAPPING`. Leave the adjacent `zephyrscale` entry (~597-614) untouched —
  double-check the diff isolates exactly the `zephyrsquad` block.
- `src/types/settingsUI.ts`: remove `deprecated?: boolean` from `CredentialTypeConfig`
  (confirmed zero other consumers).
- `src/utils/settings.ts`: remove `isDeprecatedCredentialType()` entirely; remove the
  `deprecated`-filter clause from `getAvailableCredentialsTypes()` and
  `getTestableCredentialTypes()` (leave the rest of each function intact — they still do
  useful filtering/mapping beyond the deprecated check). Do NOT touch
  `getCredentialUIMapping()` — it never filtered deprecated entries; nothing to change.
- Delete `src/utils/__tests__/settings.test.ts` lines 524-573 (the whole
  `describe('deprecated credential type filtering')` block).

## Task 2 — Remove the deprecation-redirect hook and its call sites

Test-first: yes — no new test needed; removing
`src/pages/integrations/hooks/useDeprecationRedirect.ts` and deleting its test file first
would leave `NewUserIntegrationPage.tsx`/`NewProjectIntegrationPage.tsx` with a dangling
import — type-check (`tsc`) becomes the RED signal. Remove the two call sites to reach
GREEN.

- Delete `src/pages/integrations/hooks/useDeprecationRedirect.ts`.
- Delete `src/pages/integrations/hooks/__tests__/useDeprecationRedirect.test.tsx`.
- `src/pages/integrations/NewUserIntegrationPage.tsx`: remove the `useDeprecationRedirect`
  import and its call (~lines 26, 81).
- `src/pages/integrations/NewProjectIntegrationPage.tsx`: same (~lines 26, 83).

## Task 3 — Remove the deprecation guard from EditIntegrationActions

Test-first: yes — `EditIntegrationActions.test.tsx:48-55` ("renders nothing when the
credential type is deprecated") currently passes against live code; delete this one test
case (not the file) as part of removing the guard clause it exercises, keeping the other
4 test cases (Test/Save button rendering, onSave handler) green and unmodified.

- `src/pages/integrations/components/EditIntegrationActions.tsx`: remove the
  `isDeprecatedCredentialType` import (~line 18) and the
  `if (isDeprecatedCredentialType(credentialType)) return null` guard (~line 31). Preserve
  everything else in the file (`OAuthTestAction`, `TestIntegration`, Save button,
  testable-check logic) exactly as-is.
- `src/pages/integrations/components/__tests__/EditIntegrationActions.test.tsx`: delete
  only the test case at lines ~48-55.

## Task 4 — Mock data cleanup

Test-first: no.

- `mock-server/db.json`: remove the ZephyrSquad fixture record (~lines 12003-12013,
  `"credential_type": "ZephyrSquad"`). Leave the unrelated `zephyrconfig`/ZephyrScale
  entry (~line 16678) untouched.
- Do NOT touch `src/configs/releaseNotes.json` — historical changelog, not live code.

## Out of scope / explicitly not fixed here

- **PO complaint #1 (assistant-edit tool list)**: confirmed no frontend code path exists
  for this — it's fully backend-driven. Resolves once the backend removal (companion MR)
  ships. No frontend change needed or possible.
- Zephyr Scale (`zephyrscale`) — different, active integration, untouched throughout.

## Cross-repo coordination

Backend companion MR (codemie repo, branch `EPMCDME-10913_remove-zephyrsquad`) removes
`CredentialTypes.ZEPHYR_SQUAD` server-side. Cross-link both MRs; note in this MR's
description that a fresh ZephyrSquad write attempt against the old backend would now 404
the credential type rather than the previous 410 — acceptable since the PO wants full
removal and confirmed zero prod usage.
