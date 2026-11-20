# Technical Research

**Task**: model override project members admin bulk-actions
**Generated**: 2026-10-07
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-15082 — User-Level Model Override (Story, Phase 2)

Context:
- Model access is layered platform → project → user. This story is Phase 2, scoped to the user tier.
- Access check (can the caller use the asset's selected model): the user's override applies regardless of asset scope — for a project-scoped asset, that project's user override applies; for a global (marketplace) asset, the user's override(s) across every project they belong to apply (merged for 2+ projects).
- Fallback (which model to use if access fails): determined purely by the asset's scope, independent of user overrides.
- User override wins over the project's model set at the access-check step.
- Platform-disabled models remain a hard stop at every scope.
- Out of scope: platform-level and project-level model configuration UI/logic; model resolution for callers with no user identity (webhooks).

Story: As a project or platform admin, I want to set model access overrides — expanding or narrowing a user's available models — for individual users or a bulk-selected group of users, and have those overrides honored when a user invokes an asset.

Acceptance criteria (frontend-relevant subset — this repo is codemie-ui, a React/TS frontend; runtime resolution logic in ACs 3-10 is backend/out of this repo's scope, but research should confirm what UI already exists and what's still missing):
1. Given a project admin is viewing a single user within their project, when they set a model access override for that user, then the override is saved and associated with that user within that project.
2. Given a project admin has selected multiple users (bulk selection), when they apply a model access override to the selection, then the same override is saved for every selected user.
(ACs 3-10 cover runtime resolution/enforcement — backend concern, not this UI repo, but note if any UI surfaces the "user notified before fallback" behavior from AC10.)

Linked ticket: EPMCDME-14349 — Project-Level Model Availability (status: Ready for Testing).
Linked MR already open: !4423 "Draft: EPMCDME-15082: User-Level Model Override" — this branch (EPMCDME-15082_user-level-model-override) already has uncommitted WIP touching: src/pages/settings/administration/ProjectDetailsPage.tsx, src/pages/settings/administration/components/projectsManagement/ProjectMembersBulkActions.tsx, src/pages/settings/administration/projectsManagement/ProjectMembersFilters.tsx, src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx, src/pages/settings/administration/projectsManagement/components/ProjectMemberModelOverrideModal.tsx (+its test), src/store/projectModelOverrides.ts (new), src/types/entity/userModelOverride.ts (new), src/constants/featureFlags.ts, and a new test file ProjectMembersModelFilter.test.tsx.

---

## 2. Codebase Findings

### Existing Implementations — already wired on this branch (uncommitted WIP, read live off disk)

- `src/types/entity/userModelOverride.ts` (new) — `UserModelOverride`, `SetUserModelOverridePayload` (`user_id`, `allowed_models`, `default_model?`), `BatchUserModelOverridePayload` (`operation: 'grant' | 'revoke'`, `user_ids`, `allowed_models?`, `default_model?`).
- `src/store/projectModelOverrides.ts` (new) — Valtio store `projectModelOverridesStore` with `listUserModelOverrides`, `getUserModelOverride`, `setUserModelOverride`, `deleteUserModelOverride`, `batchUserModelOverrides`. Hits `v1/projects/{projectName}/user-model-overrides[...]` via `api` (`src/utils/api.ts`), using the same `loading`/`error`/`toaster` pattern as sibling stores (e.g. `projectBudgetsStore`, `projectModelSettingsStore`).
- `src/pages/settings/administration/projectsManagement/components/ProjectMemberModelOverrideModal.tsx` — presentational modal, single component used for both single-user and bulk edit (determined by `users.length`). Loads the project's model catalog + settings (`appInfoStore.getLLMModels`, `projectModelSettingsStore.fetchSettings`), narrows to models allowed at the project tier (`getProjectModels`/`getConfigurableModels`/`isModelAvailable`), and for bulk shows per-model "mixed" state via `getBulkSetting`. Emits `onApply(overrides, defaultModel, hasCustomDefault)` — it does **not** call the store itself; persistence is the caller's job.
- `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx` — the integration point:
  - `openModelOverrides(members)` opens the modal for 1..N users (`setModelOverrideUsers`).
  - Row action menu "Override models" (visible when `isUserModelOverrideEnabled`) calls `openModelOverrides([user])` — **AC1 path**.
  - `onApply` handler (lines ~1006-1060): branches on `userIds.length === 1` → `projectModelOverridesStore.setUserModelOverride`, else → `projectModelOverridesStore.batchUserModelOverrides({ operation: 'grant', ... })`; symmetric delete/`batchUserModelOverrides({ operation: 'revoke' })` path when the user clears all overrides. Both paths call `loadModelOverrides()` to refresh local override state and `toaster.info`.
  - `loadModelOverrides()` fetches `listUserModelOverrides` + `getLLMModels`, builds per-user override/default/enabled maps consumed by the member list ("has override" icon, the Model Settings filter) — this is read, not AC1/2 write path.
  - `modelOverride` column renders an icon when `modelOverrideEnabled[user.id]` is true.
- `src/pages/settings/administration/components/projectsManagement/ProjectMembersBulkActions.tsx` — "Override models" bulk item added to the `NavigationMore` dropdown, gated on `isUserModelOverrideEnabled`, `onClick={onOverrideModels}` — **AC2 path**. `onOverrideModels` is supplied by the parent as `() => openModelOverrides(selected)`, so bulk and single-user share the same modal/store code path (`setUserModelOverride` only taken when exactly one user ends up selected).
- `src/pages/settings/administration/projectsManagement/ProjectMembersFilters.tsx` — adds a "Model Settings" filter (`all | custom | project`) gated on `isUserModelOverrideEnabled`, driving `matchesModelSettings` client-side filtering in `ProjectMembersManager`.
- `src/pages/settings/administration/ProjectDetailsPage.tsx` — reads `FEATURE_FLAGS.USER_MODEL_OVERRIDE` via `useFeatureFlag`, passes `isUserModelOverrideEnabled` down into `ProjectMembersManager`.
- `src/constants/featureFlags.ts` — new flag `USER_MODEL_OVERRIDE: 'features:userModelOverride'`, alongside the sibling (already-shipped) `PROJECT_MODEL_OVERRIDE: 'features:projectModelOverride'` used by the Models tab / `ProjectModelsSection.tsx` (out of scope per the ticket, EPMCDME-14349).

### Architecture and Layers Affected

- **Store layer** (`src/store/`): one new Valtio proxy store, consistent with existing per-domain stores (`projectBudgets.ts`, `projectModelSettings.ts`, `projectDisplayNames.ts`) — thin API wrapper + loading/error + toaster-on-failure.
- **Types layer** (`src/types/entity/`): one new entity file, mirrors shape of sibling override/settings types.
- **Page layer** (`src/pages/settings/administration/...`): `ProjectDetailsPage` (tab/flag plumbing) → `ProjectMembersManager` (state owner, API orchestration) → `ProjectMembersFilters` / `ProjectMembersBulkActions` (presentational, receive flag + callbacks) → `ProjectMemberModelOverrideModal` (presentational, emits intent via `onApply`).
- **Config/feature-flag layer** (`src/constants/featureFlags.ts` + `useFeatureFlag` hook in `src/hooks/useFeatureFlags.ts`).

### Integration Points

- `api.ts` (`src/utils/api.ts`) — single HTTP layer, used with `skipErrorHandling: true` + manual toaster calls, matching the repo convention described in `.ai-run/guides/development/api-integration.md`.
- `appInfoStore.getLLMModels()` — shared model catalog, also used by `ProjectModelsSection.tsx`/`projectModelConfiguration.ts` (the project-tier config this story explicitly treats as out of scope but reuses for narrowing).
- `projectModelSettingsStore.fetchSettings` — project-tier settings, read-only consumption here (never mutated by this feature, consistent with "project-level model configuration... out of scope").
- Backend endpoints assumed: `GET/POST v1/projects/{projectName}/user-model-overrides`, `GET/DELETE .../user-model-overrides/{userId}`, `POST .../user-model-overrides/batch` — these are store-layer assumptions already coded; no indication in this repo of whether the backend contract matches (backend is out of this repo's scope per AGENTS.md and the ticket).

### Patterns and Conventions

- Feature flags: declared in `FEATURE_FLAGS`, consumed through `useFeatureFlag`/`useXEnabled` hooks (`src/hooks/useFeatureFlags.ts`), threaded as a boolean prop down the component tree — same pattern as `PROJECT_MODEL_OVERRIDE`, `BUDGET_MANAGEMENT`, etc.
- Bulk actions: `NavigationMore` dropdown items array in a `useMemo`, each item optionally spread in based on a capability/flag boolean (`canManageBudgets ? [...] : []`) — the new "Override models" entry follows this exact shape.
- Single-vs-bulk unification: one modal component parameterized by `users.length`, one `onApply` callback that branches on count — same shape as `MemberAllocationOverrideModal`/`BulkBudgetOverrideModal` split elsewhere, except here it is unified into a single component rather than two.
- Store error handling: `loading`/`error` fields + `toaster.error` unless `silent` is passed — matches `projectBudgets.ts`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guide file specifically documents model-override UI; closest relevant guides are `.ai-run/guides/patterns/state-management.md` (Valtio store conventions) and `.ai-run/guides/development/api-integration.md` (API layer conventions) — this WIP already follows both as observed in code.

### Architectural Decisions

None recorded in guides for this feature. The project-tier model configuration (EPMCDME-14781, EPMCDME-14349) establishes the `ModelOption`/`ProjectModelSettings`/`projectModelConfiguration.ts` helpers that this user-tier feature reuses read-only, per the ticket's explicit scoping.

### Derived Conventions

Confirmed from code: feature-flagged capabilities are additive UI (new menu items, new filter options, new columns) rather than new routes/pages; new entity + store pairs are added per backend resource rather than extending an existing store.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersModelFilter.test.tsx` (new, on branch) — covers the "Model Settings" filter end-to-end against `ProjectMembersManager`: default (no filter) view, the budget/model-filter interaction regression, "Custom" filter, "Project" filter. Mocks `userStore.getUsers`, `projectModelOverridesStore.listUserModelOverrides`, `appInfoStore.getLLMModels`.
- `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectMemberModelOverrideModal.test.tsx` (modified, on branch) — exercises the modal itself (not read in full here, but blast-radius shows it is the only test exercising `getProjectModels`).
- `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` — existing integration test; is the test-of-record for `ProjectMembersManager`, `ProjectMembersBulkActions`, `ProjectMembersFilters` per codegraph's "tested via callers" annotations, but was not shown to assert on the model-override bulk/single flows specifically.

### Testing Framework and Patterns

Vitest + React Testing Library, two projects (`unit`/`integration`) per `vite.config.ts`; tests mock `@/utils/toaster` and stores directly on the Valtio proxy object (`store.method = vi.fn()...`), consistent with `.ai-run/guides/testing/testing-patterns.md`.

### Coverage Gaps

- **No test exercises the AC1 save path** — i.e. a single user, "Override models" row action → modal → `projectModelOverridesStore.setUserModelOverride` being called with the right payload and the UI reflecting the save (toast, icon, refreshed list).
- **No test exercises the AC2 bulk save path** — bulk-select users → "Override models" in `ProjectMembersBulkActions` → modal → `projectModelOverridesStore.batchUserModelOverrides({ operation: 'grant', user_ids, ... })`.
- **No store-level unit test** for `src/store/projectModelOverrides.ts` itself (no `src/store/__tests__/projectModelOverrides.test.*` found) — the five store methods' request shaping, error handling, and `silent` behavior are untested in isolation.
- **No dedicated test file** for `ProjectMembersBulkActions.tsx`'s "Override models" item visibility/gating (`isUserModelOverrideEnabled`), unlike budget bulk actions which get fuller coverage via `ProjectDetailsPage.test.tsx`.
- AC10 ("user notified before fallback") is explicitly backend/runtime and out of scope here; no UI surfaces this notification in the reviewed files, which is expected per the ticket.

---

## 5. Configuration and Environment

### Environment Variables

None specific to this feature; flags are server-delivered (`window._env_`/remote flag service via `useFeatureFlag`), not build-time env vars.

### Configuration Files

- `src/constants/featureFlags.ts` — `FEATURE_FLAGS.USER_MODEL_OVERRIDE = 'features:userModelOverride'` (new, uncommitted) sits alongside `FEATURE_FLAGS.PROJECT_MODEL_OVERRIDE`. Both are plain string keys resolved at runtime by the flag hook; no local toggle file controls their value.

### Feature Flags and Deployment Concerns

The entire feature (menu items, filter, modal, column icon) is additively gated behind `isUserModelOverrideEnabled`, consistent with how `PROJECT_MODEL_OVERRIDE` gates the Models tab. No migration or deployment-manifest concern visible in this repo; flag value itself is sourced server-side (out of this repo's control).

---

## 6. Risk Indicators

- Speculative: the backend contract (`v1/projects/{projectName}/user-model-overrides[...]`, batch `grant`/`revoke` semantics) is assumed by the already-written store code but not verified against any backend spec in this repo — a mismatch here would require store/type changes without touching UI logic.
- No test asserts the actual AC1/AC2 persistence calls (`setUserModelOverride` / `batchUserModelOverrides` invoked with correct payload) — current tests cover the filter/display path and the modal's internal state, not the save integration. This is the most concrete gap for finishing ACs 1 and 2 safely.
- No store-level unit test for `projectModelOverrides.ts` — the five methods' error paths (404-as-null in `getUserModelOverride`, `silent` toaster suppression) are unexercised.
- `ProjectMembersBulkActions.tsx`'s new "Override models" item has no dedicated visibility/gating test (flag off/on, permission gating via `canManageProject`).
- The feature appears functionally complete end-to-end in the UI (both single and bulk paths wired through one modal and one store) — the main remaining work looks like test coverage, not missing wiring, but this cannot be fully confirmed without reading the full `ProjectMemberModelOverrideModal.test.tsx` and `ProjectDetailsPage.test.tsx` contents, which were not read in full.

---

## 7. Summary for Complexity Assessment

The branch's uncommitted WIP already implements a functionally complete frontend slice for both AC1 (single-user override via a new row action) and AC2 (bulk override via a new bulk-actions menu item), sharing one presentational modal (`ProjectMemberModelOverrideModal`) and one new Valtio store (`projectModelOverridesStore`) that wraps a REST resource (`v1/projects/{projectName}/user-model-overrides`, plus a `batch` endpoint for grant/revoke). The wiring follows established repo conventions exactly: flag-gated capability threaded from `ProjectDetailsPage` down through `ProjectMembersManager` into `ProjectMembersFilters`/`ProjectMembersBulkActions`, Valtio store shaped like sibling stores (`projectBudgets.ts`), and a single modal parameterized by selection count rather than two separate components.

Primary layers touched are the admin project-members page tree, one store, and one type file — no routing, no new pages, no styling-system changes. Technical novelty is low: this closely mirrors the already-shipped project-tier model configuration (`ProjectModelsSection.tsx`/`projectModelConfiguration.ts`) and the existing bulk-budget-override flow, just at the user tier.

The principal risk and the most likely remaining work is test coverage, not missing implementation: no test currently exercises the actual save calls for either AC1 or AC2 (only the Model Settings filter and the modal's internal state are tested), and there is no store-level unit test for `projectModelOverrides.ts`. A secondary, unverifiable-from-this-repo risk is whether the backend's `user-model-overrides`/`batch` endpoints match the shapes already assumed by the store — confirming that contract is a backend/API-contract concern outside this repo.

---

## 8. External References

None named by the task — EPMCDME-15082 and EPMCDME-14349 are ticket references, not file paths or URLs resolvable from this filesystem; MR !4423 is a GitLab reference not read as a local path. No external files were named for this research.
