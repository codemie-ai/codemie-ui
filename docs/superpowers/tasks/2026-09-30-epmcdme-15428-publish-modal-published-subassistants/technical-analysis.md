# Technical Research

**Task**: assistant publish marketplace sub-assistants
**Generated**: 2026-09-30
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-15428 — Marketplace publish modal suggests publishing sub-assistants that are already available on Marketplace.

When a user publishes an assistant to Marketplace and it has sub-assistants already available on Marketplace, the Publish to Marketplace modal shows them in the Sub-Assistants section as unpublished candidates, selects them by default, and asks for categories. Expected: already-Marketplace-published sub-assistants are recognized as published, not selected by default, no category selection required for them, only unpublished sub-assistants selectable; if all are published, they are not shown as publish candidates; modal copy clearly explains which sub-assistants still need publishing; no regression for parents without sub-assistants or with only unpublished sub-assistants.
Affected: Assistant Publish to Marketplace modal, sub-assistant publishing selection logic, Marketplace publication status detection, sub-assistant category selection UI.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/assistants/AssistantActions/components/PublishToMarketplaceModal.tsx` — the modal. `handleValidate` calls `assistantsStore.validatePublishToMarketplace` and seeds `subAssistantsSettings` from every `response.sub_assistants` entry as `{assistant_id: sa.id, is_global: sa.is_global}`. `handlePublish` finds settings with `is_global` true and empty categories (effective categories = `s.categories` if defined, else `validationData.sub_assistants[].categories`) and opens a "Auto-populate Categories for Sub-Assistants" ConfirmationModal. `performPublish` fills empty categories from parent categories for every `is_global` setting and sends all settings. Renders `<SubAssistantSettings>` whenever `sub_assistants` is non-empty.
- `src/pages/assistants/AssistantActions/components/SubAssistantSettings/SubAssistantSettings.tsx` — Sub-Assistants section. Fixed InfoWarning copy: "Please, select sub-assistant(s) that will be published to Marketplace with assistant". A "Select All" row, one checkbox card per sub-assistant, and a collapsible per-sub-assistant `CategorySelector` shown when checked. `getIsGlobal` falls back to `sa.is_global ?? true`. `handleSelectAll` rebuilds settings for every sub-assistant (dropping categories). Initial expanded set is derived from `is_global`. No notion of "already published" beyond `is_global`.
- `src/types/entity/assistant.ts` (~349-392) — `SubAssistantInfo {id, name, description, is_global, icon_url?, categories?}`, `SubAssistantPublishSettings {assistant_id, is_global, toolkits?, mcp_servers?, categories?}`, `PublishValidationResponse {requires_confirmation, message, inline_credentials, assistant_id, sub_assistants?, quality_validation?, prompt_variables?}`. No dedicated "already published" field.
- `src/store/assistants.ts` (~617-651) — `validatePublishToMarketplace` (POST `v1/assistants/{id}/marketplace/publish/validate`) and `publishAssistantToMarketplace` (POST `.../marketplace/publish`, body `categories`, `sub_assistants_settings`, `ignore_recommendations`).
- Related: `src/pages/assistants/components/AssistantDetails/components/sidebar_details/SidebarSubassistants.tsx` uses `assistant.is_global` to detect Marketplace status for display — an existing UI-side precedent for reading the flag.
- Sibling modals (not sub-assistant related): `src/pages/skills/components/PublishToMarketplaceModal.tsx`, `src/pages/workflows/components/PublishWorkflowToMarketplaceModal.tsx`.

### Architecture and Layers Affected
Page-level component (modal) -> child presentational component (SubAssistantSettings) -> Valtio store methods -> `api` HTTP layer -> backend validate/publish endpoints. Types in `src/types/entity/assistant.ts`.

### Integration Points
- Backend validate endpoint response shape (`sub_assistants[]`) is the sole data source; the backend repo is not in this checkout, so whether `is_global` on a sub-assistant means "already on Marketplace" cannot be confirmed from the filesystem. The modal currently uses it as the initial checkbox value, which would explain "selected by default" for published ones only if the backend returns is_global true for them, and the UI has no other way to distinguish.
- `AssistantActions.tsx` mounts the modal.

### Patterns and Conventions
Local `useState` in modal; settings array lifted to parent via `onSettingsChange`; `CategorySelector` from `@/pages/assistants/components`; `Checkbox` from `@/components/form/Checkbox`; `InfoWarning` for copy; `nosonar` markers on clickable divs (AGENTS.md says ask before adding new ones).

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists. Relevant: `patterns/modal-patterns.md`, `components/component-patterns.md`, `patterns/state-management.md`, `development/api-integration.md`, `testing/testing-patterns.md`. Not deep-read; no guide found that mentions sub-assistant publishing (filename-level only).

### Architectural Decisions
None recorded for this feature.

### Derived Conventions
See Patterns above; the publish flow is contained in the two files.

---

## 4. Testing Landscape

### Existing Coverage
No test for `PublishToMarketplaceModal` (assistants) or `SubAssistantSettings`. Tests in `AssistantActions/components/__tests__/` cover ActionConfirmationModal, AssistantMenu, QualityValidationSummary; `AssistantActions/__tests__/AssistantActions.accessibility.test.tsx`. Workflow analogue exists: `src/pages/workflows/components/__tests__/PublishWorkflowToMarketplaceModal.test.tsx`.

### Testing Framework and Patterns
Vitest + React Testing Library, projects `unit` and `integration` (per AGENTS.md); tests live in `__tests__` next to the source.

### Coverage Gaps
Entire sub-assistant selection/category logic is untested. Tests are written only if the user asks (AGENTS.md).

---

## 5. Configuration and Environment

### Environment Variables
None relevant found.

### Configuration Files
None specific.

### Feature Flags and Deployment Concerns
None found.

---

## 6. Risk Indicators

- Speculative: the backend validate response may need to expose (or already exposes under `is_global`) a Marketplace-published indicator; the frontend cannot resolve this alone. Confirm the API contract first.
- `is_global` is overloaded in the UI: it is both the backend-reported sub-assistant state (`SubAssistantInfo.is_global`) and the user's "publish with parent" choice (`SubAssistantPublishSettings.is_global`); the seeding in `handleValidate` conflates them.
- `SubAssistantSettings.handleSelectAll` / `allSelected` iterate all sub-assistants and would need to be limited to unpublished ones; `handleSelectAll` also drops categories.
- `handlePublish` category-missing check and `performPublish` category auto-fill act on every `is_global` setting, so published sub-assistants would trigger the confirm dialog and be re-sent to the backend.
- Fixed copy in the InfoWarning and the "all published" case (component always renders header, Select All when list is non-empty) need handling; no tests protect regressions for no-sub-assistant or all-unpublished parents.
- Adding new `nosonar` markers requires asking first (AGENTS.md).

---

## 7. Summary for Complexity Assessment

The change is contained in the frontend publish flow: `PublishToMarketplaceModal.tsx`, `SubAssistantSettings.tsx`, and the `SubAssistantInfo` type in `src/types/entity/assistant.ts`. No store, routing, or configuration change is evident from the code. The store methods are pass-throughs.

The main technical uncertainty is data: the UI only sees a single `is_global` boolean per sub-assistant from the validate endpoint, so detection of Marketplace publication depends on the backend contract, which is outside this repo. Logic itself is small (seed settings, select-all, category check, auto-fill, copy), but spread over several handlers that all assume every listed sub-assistant is a candidate.

Test coverage for this area is nil (no tests for either component), so regression protection for parents with no or only unpublished sub-assistants would need new tests if requested. Overall a small-to-medium, single-module UI change with an API contract dependency as the key risk.

---

## 8. External References

None named by the task.
