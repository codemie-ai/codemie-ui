# Technical Research — UI slice (codemie-ui)

**Sliced from**: ../../technical-analysis.md (codegraph, 2026-10-08). Review evidence: ../../review-input.md (line numbers at UI HEAD `19da01814`).
**Repo / branch**: `~/codemie-dev/codemie-ui`, `EPMCDME-14786_concurrent-collaboration-popup`
**Depends on**: backend child (error responses for user-management gate, personal-integration rejection, 404).

## Owner decisions (UI items)
- a3: hide the Share action when user management is disabled — existing `isUserManagementEnabled()` in `src/utils/featureFlags.ts` L81 (`FEATURE_FLAGS.USER_MANAGEMENT`). Search starts only at ≥ 2 characters (backend enforces too).
- a5: do NOT disable Share on the client for assistants with personal integrations. Handle backend rejections: grant rejected → show backend message in the popup; assistant save rejected (personal integration added while named grants exist) → show backend message on the form.
- a10: gate Share and owner-only fetches on real ownership (`created_by.id`, `creator` fallback) instead of `canEdit` (`src/utils/entity.ts` L37, used by `AssistantActions.tsx` L82,118). Correct the UI spec AC#1 wording.
- a11: won't fix — adds batched to Save, Remove fires immediately (UX decision, matches Jira).
- a12: `getSharedWith` (`src/store/assistants.ts` L1135) must propagate errors; popup (L96) shows an error with Retry and blocks editing the access list while load failed.
- a19: dialog title "Share assistant" (popup L202, currently "Share for Collaboration"); subtitle "Can chat and view setup; cannot edit". `StatusLabel.tsx` L65 returns null for non-owners → restore project-share status for project members.
- a20: one error toast per share/remove (double toast from store L1150 + `utils/api.ts` L391); sidebar `/shared-with` fetch (`AssistantDetailsSidebarSections.tsx` L93) gated on ownership; Remove buttons (popup L240) get an accessible label with the person's name.

## Code locations
- `src/pages/assistants/components/ShareAssistantPopup/ShareAssistantPopup.tsx` (+ `__tests__/ShareAssistantPopup.test.tsx`)
- `src/pages/assistants/AssistantActions/AssistantActions.tsx`
- `src/pages/assistants/components/AssistantList/AssistantCard/StatusLabel.tsx` (+ `__tests__/StatusLabel.test.tsx`)
- `src/pages/assistants/components/AssistantDetails/components/AssistantDetailsSidebarSections.tsx` (+ tests)
- `src/store/assistants.ts`, `src/utils/api.ts`, `src/utils/entity.ts`, `src/utils/featureFlags.ts`
- `src/pages/assistants/components/AssistantForm/AssistantForm.tsx` (L434 `hasUserSettings` memo has `|| true`, ownership check dead; L602-606 forces `shared=false`), `AssistantSetupSection.tsx` L133-154 (project-share switch disabled + InfoBox).

## Tests
Vitest + RTL. Existing: ShareAssistantPopup, StatusLabel, AssistantDetailsSidebarSections, AssistantGrid tests; `AssistantActions.accessibility.test.tsx` may assert action sets.

## Risks
- Ownership must use the same rule as the backend (`created_by.id`, creator fallback) or Share shows and then 403s.
- Toast ownership change in `utils/api.ts` may affect other callers — scope to sharing calls.
