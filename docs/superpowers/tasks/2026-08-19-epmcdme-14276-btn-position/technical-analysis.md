# Technical Research

**Task**: integration datasource form IntegrationSection
**Generated**: 2026-08-19T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Fix inconsistent positioning of 'Add User Integration' and 'Refresh' buttons across different Datasource Types on the Integration Section / Create Assistant form. Currently the buttons appear before 'Model used for embeddings' for some datasource types, but after it for others (e.g. Git). The desired layout is the Git integration layout: buttons positioned AFTER 'Model used for embeddings' (when present), always at the bottom of the datasource form fields.

---

## 2. Codebase Findings

### Existing Implementations

The `IntegrationSection` component is a shared piece rendered inside each per-datasource-type form component. All IndexType form components live under:

`src/pages/dataSources/components/DataSourceForm/IndexTypeField/`

Files directly involved:

- `IndexTypeField/shared/IntegrationSection.tsx` — shared component rendering the integration dropdown (via `IntegrationSelector`) + Refresh button + helper text + `NewIntegrationPopup`. Does not render `FormAutocomplete` for embeddings — that is the responsibility of each IndexType host component.
- `IndexTypeField/shared/useIntegrationManager.ts` — hook managing the `showIntegrationPopup` open/close state. Shared by all IndexType components.
- `IndexTypeField/IndexTypeGit.tsx` — **reference / desired layout**. Renders `FormAutocomplete` (Model used for embeddings) BEFORE `<IntegrationSection>`, both wrapped inside a `div.form-wrapper`. `IntegrationSection` is last inside the wrapper.
- `IndexTypeField/IndexTypeSvn.tsx` — same correct pattern as Git: `FormAutocomplete` rendered before `<IntegrationSection>` inside the same `div.form-wrapper`. Buttons already at the bottom.
- `IndexTypeField/IndexTypeJira.tsx` — **inconsistent**: `<IntegrationSection>` rendered BEFORE `<FormAutocomplete>` (Model used for embeddings). Buttons appear above the embeddings field.
- `IndexTypeField/IndexTypeConfluence.tsx` — **inconsistent**: same pattern as Jira — `<IntegrationSection>` before `<FormAutocomplete>`.
- `IndexTypeField/IndexTypeXray.tsx` — **inconsistent**: same pattern as Jira — `<IntegrationSection>` before `<FormAutocomplete>`.
- `IndexTypeField/IndexTypeAzureDevOpsWorkItem.tsx` — **inconsistent**: same pattern — `<IntegrationSection>` before `<FormAutocomplete>`.
- `IndexTypeField/IndexTypeAzureDevOpsWiki.tsx` — **inconsistent**: same pattern — `<IntegrationSection>` before `<FormAutocomplete>`.
- `IndexTypeField/IndexTypeSharePoint.tsx` — **inconsistent**: `<IntegrationSection>` rendered inside an `authMethod === INTEGRATION` conditional block, which appears BEFORE the `<FormAutocomplete>` at the bottom of the component.
- `IndexTypeField/IndexTypeGoogle.tsx` — **special case**: `<IntegrationSection>` is at the very top (before even the Google Docs Link input), `<FormAutocomplete>` is last. This is a deliberate layout difference (auth integration must come first for Google OAuth). Needs careful review — may or may not need to change depending on product decision, but is architecturally different from the other types.
- `IndexTypeField/IndexTypeFile.tsx` — no `IntegrationSection` (file uploads have no OAuth integration). Not affected.
- `IndexTypeField/IndexTypeProvider.tsx` — likely the switch/dispatch component that mounts one of the above per datasource type. Not individually audited but not a source of the ordering bug.

### Architecture and Layers Affected

- **Presentation / Form layer** only. No store, no API, no service layer involvement.
- The fix is a pure JSX reordering within each IndexType component's return statement.
- All affected components are leaf form-field components: they receive props from a parent (`DataSourceForm`) and render fields. No callbacks need to change.

### Integration Points

- `IntegrationSection` depends on: `IntegrationSelector` (assistants toolkit component), `NewIntegrationPopup` (integrations page), `userSettingsStore` (Valtio store for refresh), `toaster` (utility).
- Each IndexType component receives props: `control`, `errors`, `filteredSettings`, `hasNoSettings`, `isDropdownShown`, `embeddingModels`, `projectName`, `onIntegrationCreated`.
- The fix does not touch any of these integration points — only JSX element ordering.

### Patterns and Conventions

- **Desired pattern** (from Git and SVN): `[datasource-specific fields]` → `FormAutocomplete (embeddingsModel)` → `<IntegrationSection ...>`. Both typically grouped inside a `div.form-wrapper` container.
- `IntegrationSection` renders its own outer `<div className="mt-3 mb-4">` and a `<NewIntegrationPopup>` portal, so it is self-contained for spacing.
- `FormAutocomplete` is used with `name="embeddingsModel"`, `control`, `id="embeddingsModel"`, `label="Model used for embeddings"`, and `options={embeddingModels}` consistently across all components — no divergence in its props.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/component-patterns.md` — covers component construction conventions.
- `.ai-run/guides/styling/styling-guide.md` — Tailwind conventions; relevant if spacing classes on `IntegrationSection` need adjustment after reorder.
- No domain-specific guide for datasource form layout exists.

### Architectural Decisions

No ADRs or inline architectural decision markers found relating to the ordering of integration vs. embedding-model fields.

### Derived Conventions

- The Git datasource (most complex, with summarization model, files filter, and optional integration) serves as the established reference layout.
- SVN follows the same convention independently, confirming it is the intended pattern.
- The wrapper `div.form-wrapper` seen in Git and SVN groups the embeddings model + integration section together visually. Jira/Confluence/Xray/AzureDevOps components do not use this wrapper — they place fields at root level.

---

## 4. Testing Landscape

### Existing Coverage

- `IndexTypeField/shared/__tests__/IntegrationSection.test.tsx` — unit tests for `IntegrationSection` in isolation. Covers: Add User Integration button visibility, Refresh button behavior, helper text variants, button alignment (h-8 classes), error toast on refresh failure. Does not assert the position of `IntegrationSection` relative to `FormAutocomplete`.
- `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx` — integration-level tests for the datasource creation page. May exercise full form rendering including IndexType switching.

### Testing Framework and Patterns

- Vitest with React Testing Library.
- Test wrapper pattern using `useForm` to provide `react-hook-form` context (seen in `IntegrationSection.test.tsx`).
- `vi.mock` for stores, toaster, and popup components.
- Tests are in `__tests__/` subdirectories co-located with the implementation.

### Coverage Gaps

- No existing test asserts that `IntegrationSection` is rendered *after* `FormAutocomplete` (embeddingsModel) in any IndexType component. The reordering fix is not covered by tests.
- There are no per-IndexType unit tests (no `IndexTypeJira.test.tsx`, `IndexTypeConfluence.test.tsx`, etc.) — the IndexType components are tested only through the integration-level `DataSourceCreatePage` test if at all.

---

## 5. Configuration and Environment

### Environment Variables

None relevant to this fix. No env vars govern form field ordering.

### Configuration Files

None relevant. `FormAutocomplete` and `IntegrationSection` receive all their data through props.

### Feature Flags and Deployment Concerns

- `IndexTypeSharePoint` reads a feature flag: `useFeatureFlag('features:sharepointCodeMieOAuth')` — this controls visibility of an authentication method radio option, not the embeddings field. The reordering of `FormAutocomplete` relative to `IntegrationSection` in SharePoint is independent of this flag.
- No other feature flags affect the affected components.

---

## 6. Risk Indicators

- **Five components have the inverted order** (IntegrationSection before FormAutocomplete): `IndexTypeJira`, `IndexTypeConfluence`, `IndexTypeXray`, `IndexTypeAzureDevOpsWorkItem`, `IndexTypeAzureDevOpsWiki`. All are mechanical reorderings — low risk individually.
- **IndexTypeSharePoint is more complex**: `IntegrationSection` is conditionally rendered inside `{authMethod === INTEGRATION && ...}`. The `FormAutocomplete` is currently the last element unconditionally. After the fix, `FormAutocomplete` must move above the `authMethod === INTEGRATION` block, so it always appears before the integration section regardless of auth method. This is slightly more involved than the other five.
- **IndexTypeGoogle edge case**: `IntegrationSection` is the very first element, before the Google Docs Link input. This is architecturally different (OAuth integration is a prerequisite for the rest of the Google form). Changing this ordering could affect product UX intentionally. Recommend confirming with the ticket whether Google is in scope. If it is, `FormAutocomplete` is already last — the order would become: Google Auth Integration → Google Docs Link → Info boxes → Model used for embeddings, which matches the desired pattern.
- **No test coverage for the ordering fix**: the fix will not be verified by existing tests. If the ticket requires test coverage, a new test asserting DOM order would need to be added to `DataSourceCreatePage.integration.test.tsx` or new per-IndexType unit tests.
- **Spacing classes may need review after reorder in SharePoint**: `IndexTypeSharePoint.tsx` has `<FormAutocomplete ... />` without a `rootClass` or wrapper `div` — it currently inherits flow layout. After moving it above the conditional auth blocks, spacing between it and the elements above (auth method radio group or sign-in widget) should be checked visually.
- **`div.form-wrapper` absent in Jira/Confluence/Xray/AzureDevOps**: Git and SVN use `div.form-wrapper` to group `FormAutocomplete` and `IntegrationSection`. The other four do not. The fix can be done without adding the wrapper (just swap order), but if visual grouping parity is desired, a wrapper would need adding.

---

## 7. Summary for Complexity Assessment

The task is a focused UI layout fix touching six files (IndexTypeJira, IndexTypeConfluence, IndexTypeXray, IndexTypeAzureDevOpsWorkItem, IndexTypeAzureDevOpsWiki, IndexTypeSharePoint) with a possible seventh (IndexTypeGoogle, pending scoping confirmation). In five of the six primary cases the fix is a mechanical swap of two adjacent JSX elements — moving `<FormAutocomplete name="embeddingsModel" ...>` from after `<IntegrationSection>` to before it. The reference implementation in `IndexTypeGit` and `IndexTypeSvn` provides an exact template. No store changes, no API changes, no hook changes, and no prop interface changes are required.

The one non-trivial case is `IndexTypeSharePoint`, where `IntegrationSection` is conditionally rendered inside an `authMethod` check. The `FormAutocomplete` must move above the entire conditional block so it always appears before integration-related content regardless of the selected auth method. This requires reading the component carefully to identify the correct insertion point above the `{authMethod === INTEGRATION && ...}` guard.

Test coverage for the ordering fix does not exist. The existing `IntegrationSection.test.tsx` tests the button behavior in isolation and will not be affected by this change. No new tests are strictly required for the ordering fix to be correct, but there is no automated regression safety for the layout. The task follows a well-established pattern (Git/SVN) and carries low technical risk overall — the main risk is the SharePoint conditional rendering and the Google datasource scoping question.
