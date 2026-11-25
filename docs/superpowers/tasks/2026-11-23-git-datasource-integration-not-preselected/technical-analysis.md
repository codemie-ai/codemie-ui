# Technical Research

**Task**: datasource git integration selector
**Generated**: 2026-11-23
**Research path**: filesystem

---

## 1. Original Context

When a user starts creating a Git datasource, the integration field is already set to an existing integration. It should be unselected and show the placeholder text "Integration for Git".
Preconditions: user can access datasource creation flow; at least one integration exists that could be pre-selected.
Steps: open datasource creation flow, choose Git datasource type, observe integration field.
Expected: integration field is empty and shows placeholder "Integration for Git".
Actual: pre-selected with an existing integration.
Affected: Git datasource creation UI, integration selector field.
Acceptance Criteria: field empty when Git datasource creation flow starts; shows placeholder "Integration for Git"; users can still select an integration manually.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/dataSources/components/DataSourceForm/hooks/useEditPopup.ts` (lines ~111-149): a `useEffect` keyed on `[projectName, indexType]`. When `getSettingOptions(indexType)` returns exactly one setting, and the form is not an unchanged edit, it calls `setValue('setting_id', newSettingOptions[0].id)` for an explicit list of index types that includes `INDEX_TYPES.GIT`. This is the pre-selection mechanism. If the count is not 1 and the project differs, it sets `setting_id` to `undefined`.
- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeGit.tsx`: Git fields. Renders `IntegrationSection` with `integrationLabel="Integration for Git"`, `integrationPlaceholder="Integration for Git"`, `isRequired={false}`. The placeholder already exists.
- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/shared/IntegrationSection.tsx`: `Controller name="setting_id"`. It finds the selected setting in `filteredSettings[datasourceType]` by id and passes it as `value` to `IntegrationSelector`. `onChange` sets `setting?.id ?? ''`.
- `src/pages/assistants/components/AssistantForm/components/Toolkits/IntegrationSelector.tsx`: shared selector. It takes `value`, `placeholder` and `settingsDefinitions`, and derives auto mode from `!value`.
- `src/pages/dataSources/components/DataSourceForm/hooks/useEditPopupForm.ts`: form defaults (`setting_id: ''` near line 406) and the Yup schema. `setting_id` is not required for GIT or GIT_FAQ (comment: public repos need no integration).
- `src/pages/dataSources/components/DataSourceForm/utils/mapDetailsToFormValues.ts` (line 86): `setting_id: defaults?.setting_id ?? ''`. Used for clone and edit.
- `src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx`: wires `useEditPopup` output into the `IndexTypeField` components (lines ~500-710).
- `src/pages/dataSources/utils/compareFormData.ts` (line 46): treats an empty initial `setting_id` as equal to the current value. This is relevant to dirty-state checks.
- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeFaq.tsx` handles `GIT_FAQ` (`git_faq`) and is also in the auto-select path as a separate type. The effect list names GIT but not GIT_FAQ.

### Architecture and Layers Affected
UI form layer (React Hook Form), within the datasource form hook `useEditPopup`. No API, store or backend change is evidenced. `userSettingsStore` is read only.

### Integration Points
- `userSettingsStore` (`@/store/userSettings`) via `useSnapshot`, which provides `settings[indexType]`.
- `isOAuthProviderSetting` from `@/utils/settings` filters OAuth integrations out.
- The auto-select block is shared with Jira, Xray, Confluence, XWiki, SVN, Azure DevOps, SharePoint and Google, so a change there can affect those types.
- Git history: `47166d660 EPMCDME-14214: Keep datasource integration cleared on edit` previously added the edit-mode guard in the same effect.

### Patterns and Conventions
Per-type behaviour is selected by chained `indexType ===` comparisons. Field components receive `control` and `filteredSettings` as props. Constants come from `@/constants/dataSources`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists. Relevant guides are `patterns/state-management.md` and `patterns/form-patterns.md` (not read in depth), plus `testing/testing-patterns.md`. AGENTS.md says to write tests only when the user explicitly asks.

### Architectural Decisions
Inline comment in `useEditPopupForm.ts`: Git-based types are intentionally not required to have an integration, because public repositories need no integration.

### Derived Conventions
Edit mode does not auto-select unless the project changed (EPMCDME-14214). Auto-select applies on create.

---

## 4. Testing Landscape

### Existing Coverage
- `hooks/__tests__/useEditPopup.test.ts`: tests single-integration auto-select. Case "still auto-selects on create" uses Jira, with one matching setting, and asserts `setValue('setting_id', 'only-id')`. The test uses `renderHook` with mocked `valtio` `useSnapshot` and a mocked `userSettingsStore`.
- `IndexTypeField/shared/__tests__/IntegrationSection.test.tsx`: covers the section.
- `hooks/__tests__/useEditPopupForm.test.ts` and `useEditPopupForm.clone.test.ts`: form defaults and clone, where clone carries `setting_id`.
- `utils/__tests__/compareFormData.test.ts`.

### Testing Framework and Patterns
Vitest with Testing Library (`renderHook`), `vi.mock` for stores, and a `vi.fn` `getValues`/`watch`/`setValue` harness.

### Coverage Gaps
No test covers Git auto-select behaviour in `useEditPopup`. There is no component-level test of Git create that checks the selector is empty.

---

## 5. Configuration and Environment

### Environment Variables
None relevant found.

### Configuration Files
None relevant.

### Feature Flags and Deployment Concerns
None found.

---

## 6. Risk Indicators

- The auto-select effect is shared by about ten datasource types. Speculative: changing it for Git only, or removing GIT from the list, leaves the other types unchanged. A broader change would alter their behaviour and the existing "still auto-selects on create" test.
- The effect only runs for exactly one eligible setting, so the reported bug may reproduce only in that case. With several settings, `setting_id` is not set by this effect. Other pre-selection sources were not found, but the runtime path was not exercised.
- Clone (`mapDetailsToFormValues`) intentionally carries `setting_id`. Speculative: the Git change should not affect clone or edit.
- GIT_FAQ (`git_faq`) is a related Git type. The ticket mentions only "Git", so its scope is ambiguous.
- Placeholder text "Integration for Git" already exists in `IndexTypeGit.tsx`. Acceptance is likely met once `setting_id` stays empty, but this needs verification in the UI.
- Git integration is optional (`isRequired={false}`, not required by the schema), so an empty field is a valid submission.

---

## 7. Summary for Complexity Assessment

The change lives in one UI layer: the datasource form's `useEditPopup` hook (`useEditPopup.ts`), which auto-fills `setting_id` when exactly one matching integration exists, with `INDEX_TYPES.GIT` in the list of types it applies to. The Git field component and `IntegrationSection` already use the "Integration for Git" placeholder, and manual selection already works through `IntegrationSelector`. The probable file surface is one source file plus its test.

There is little technical novelty. The risk is the shared effect, which also serves Jira, Confluence, SharePoint and others, so a change must stay scoped to Git. Whether GIT_FAQ should be included is unclear.

Test posture is reasonable. `useEditPopup.test.ts` has a ready harness, but it only covers Jira and has no Git case. The guides are present and no configuration or backend work is indicated.

---

## 8. External References

None named by the task.
