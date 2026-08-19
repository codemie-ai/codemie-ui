# Technical Research

**Task**: datasource unsaved-changes form dirty-tracking initialization
**Generated**: 2026-08-18T00:00:00Z

---

## 1. Original Context

The unsaved changes popup appears because the form starts tracking changes too early, before its automatic default values are fully applied. On datasource creation, the name is auto-generated after the initial snapshot is taken, so the form looks modified even if the user did nothing. The fix is to start unsaved-change tracking only after initialization and auto-filling are complete, or otherwise exclude those auto-generated defaults from dirty comparison.

---

## 2. Codebase Findings

### Existing Implementations

- `src/hooks/useUnsavedChangesWarning.tsx` — Custom hook and context provider (`UnsavedChangesProvider`, `useUnsavedChanges`) that drives all unsaved-changes detection across the app. Captures an initial snapshot of form values and compares on every dirty-check call.
- `src/components/appLevel/UnsavedChangesPopup.tsx` — App-level popup that consumes `UnsavedChangesContext` and uses `react-router`'s `useBlocker` to intercept navigation. Renders `ConfirmationModal` when dirty state is detected.
- `src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx` — The datasource create/edit form component. Calls `useUnsavedChanges` at mount, passing `() => getValues()` as `getCurrentValues` and `compareFormData` as `comparator`.
- `src/pages/dataSources/components/DataSourceForm/hooks/useEditPopupForm.ts` — `useForm` wrapper that declares all field default values (including `name: ''`) and provides `resetInitFormValues` for the edit case.
- `src/pages/dataSources/utils/compareFormData.ts` — Custom comparator used by `useUnsavedChanges`. Normalizes `embeddingsModel`, `summarizationModel`, `projectName`, and `setting_id` when initially empty, but does **not** normalize `name`.
- `src/utils/settings.ts` (line 194) — `generateDefaultAlias(type: string): string` generates a timestamped name slug (e.g. `git-2026-08-18_10-30`).

### Architecture and Layers Affected

- **UI / Component layer**: `DataSourceForm.tsx`, `UnsavedChangesPopup.tsx`
- **Custom Hooks / Logic layer**: `useUnsavedChangesWarning.tsx` (context + hook), `useEditPopupForm.ts`
- **Utility layer**: `compareFormData.ts`, `settings.ts` (`generateDefaultAlias`)
- **No API, store, or routing layer** is involved in the fix.

### Integration Points

- `UnsavedChangesProvider` is mounted at the app level (`src/App.tsx`) and provides context to all form pages.
- `DataSourceForm` uses `useUnsavedChanges` from `useUnsavedChangesWarning`, passing `formId = FormIDs.DATA_SOURCE_FORM`.
- `WorkflowForm` (`src/pages/workflows/components/WorkflowForm.tsx`, line 162) uses the same `useUnsavedChanges` hook with a separate `compareWorkflowData` comparator — a sibling pattern to compare against.
- `SkillForm` (`src/pages/skills/components/SkillForm.tsx`) also uses `useUnsavedChanges`.

### Patterns and Conventions

- `useUnsavedChanges` captures `initialValues` once via `useState`, gated on `isReady && initialValues === null` (lines 147–152 in `useUnsavedChangesWarning.tsx`). The guard `isReady` evaluates as `getCurrentValues() !== null`.
- Since `getValues()` from react-hook-form always returns an object (never `null`), `isReady` is `true` immediately on first render — the snapshot is taken before any async initialization runs.
- The `compareFormData` comparator follows a normalization pattern: if a field was initially empty, set `normalizedInitial[field] = normalizedCurrent[field]` so the field is excluded from dirty comparison. Fields covered: `embeddingsModel`, `summarizationModel`, `projectName`, `setting_id`. The field `name` is **absent** from this list.
- Auto-name generation in `DataSourceForm.tsx` (lines 253–258): `setValue('name', generateDefaultAlias(indexType))` fires in a `useEffect` that depends on `indexType` and only runs when `!isEditing && !nameManuallyEdited.current`. This runs after the async `initialize()` completes (`setIsInitializing(false)`).
- Note: `ProjectSelector` already uses `{ shouldDirty: false }` in its `setValue` call (line 318–320 in `DataSourceForm.tsx`), but this guards react-hook-form's internal `formState.isDirty` — not the custom snapshot comparator.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/modal-patterns.md` — covers modal and popup patterns; relevant to `UnsavedChangesPopup`.
- `.ai-run/guides/patterns/form-patterns.md` — form handling conventions; relevant to `useEditPopupForm`.
- `.ai-run/guides/patterns/custom-hooks.md` — custom React hook patterns; relevant to `useUnsavedChanges`.
- `.ai-run/guides/patterns/state-management.md` — Valtio proxy store patterns; less directly relevant here since this issue is in hook-level state, not Valtio.

### Architectural Decisions

- No ADRs or inline decision markers found specific to the unsaved-changes system.
- The custom `compareFormData` comparator (rather than react-hook-form's built-in `formState.isDirty`) is an established pattern. The intent is apparent: normalize fields that are asynchronously filled to avoid false positives. The missing entry for `name` is the direct gap.

### Derived Conventions

- **Empty-field normalization pattern** in comparators: if `!initial.field || initial.field === ''`, set `normalizedInitial.field = normalizedCurrent.field`. Applied consistently to all async-populated fields in `compareFormData`.
- The `isReady` mechanism in `useUnsavedChanges` was intended to delay snapshot capture until the form has a non-null value, but it does not distinguish between "form has defaults" and "form has been fully initialized with async-populated values".
- The `resetInitFormValues` function in `useEditPopupForm` resets the form via react-hook-form's `reset()` for the **edit** case, but there is no equivalent mechanism to re-capture the snapshot in `useUnsavedChanges` after async initialization for the **create** case.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx` — Integration tests for the create flow. Uses `renderPage` + `mockAPI`. Has `waitForFormReady` helper, and tests type selection (Google Docs, Confluence), but does **not** include a test case asserting that no unsaved-changes dialog appears when the user has not interacted with the form.
- `src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.test.ts` — Unit tests for `useEditPopupForm`. Covers form initialization and validation; does not cover dirty-tracking or snapshot behavior.
- `src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.validation.test.ts` — Validation-focused tests; no dirty-tracking coverage.
- `src/pages/workflows/components/__tests__/WorkflowForm.test.tsx` — Has a test for unsaved changes popup in workflows (line found by keyword search) — reference for how to test this behavior.

### Testing Framework and Patterns

- Framework: Vitest + React Testing Library (RTL).
- Integration tests use `renderPage` from `src/test-utils/integration` and `mockAPI` for HTTP intercepts.
- User interactions via `@testing-library/user-event`.
- Fixtures/mocks: `vi.mock` for modules, `mockAPI` for REST endpoints.

### Coverage Gaps

- No test covering the regression: "unsaved-changes popup must NOT appear on a fresh create form when the user has not typed anything".
- No unit test for `compareFormData.ts` (the file has no sibling `*.test.*` file).
- No test for `useUnsavedChangesWarning.tsx` directly (no hook test file found).

---

## 5. Configuration and Environment

### Environment Variables

No environment variables are relevant to this fix. The form behavior is driven entirely by client-side logic.

### Configuration Files

No configuration files govern the dirty-tracking or auto-name generation logic.

### Feature Flags and Deployment Concerns

No feature flags or deployment concerns identified. This is a pure UI bug fix with no backend changes required.

---

## 6. Risk Indicators

- **No test for the regression path**: `DataSourceCreatePage.integration.test.tsx` does not assert clean state on fresh create form. The fix should be accompanied by a new test case.
- **No unit tests for `compareFormData.ts`**: The comparator is a pure function and trivially testable. Any change to it should add a dedicated test file.
- **Side-effect of Option A normalization**: Adding `name` to `compareFormData` normalization means that if a user clears the name field and then the initial snapshot was taken with an empty name, the clear would not be flagged as dirty. However, on the create form the initial snapshot is always `name: ''`, so clearing a manually-typed name back to `''` would still be considered non-dirty. This is the same trade-off already accepted for `embeddingsModel` etc. On the **edit** form, `initial.name` is always the stored repo name (from `defaults.repo_name`), so it is never `''` and the normalization guard does not trigger — no risk there.
- **Breadth of `useUnsavedChanges` callers**: `WorkflowForm` and `SkillForm` also call `useUnsavedChanges`. Any API extension to the hook (Option B) must not change behavior for those callers. The `isReady` option must default to `true` (or the existing `getCurrentValues() !== null` path) to be backward-compatible.
- **Spinner-to-form transition timing**: `DataSourceForm` returns a `<Spinner>` while `isInitializing` is `true`. The `useUnsavedChanges` hook is called unconditionally (before the early return for spinner), so the snapshot capture runs even while the spinner is shown. This is the structural cause of the race condition.

---

## 7. Summary for Complexity Assessment

The task touches the **UI / Component layer** (`DataSourceForm.tsx`), the **Custom Hook layer** (`useUnsavedChangesWarning.tsx`), and the **Utility layer** (`compareFormData.ts`). Two fix strategies exist with different file-change surfaces: Option A changes only `compareFormData.ts` (1 file, 3–4 lines) by adding `name` to the existing normalization pattern; Option B changes `useUnsavedChangesWarning.tsx` and `DataSourceForm.tsx` (2 files) by adding an `isReady` option to delay snapshot capture until after initialization. Either option also requires a new test in `DataSourceCreatePage.integration.test.tsx` and ideally a unit test file for `compareFormData.ts`.

The bug follows an already-understood pattern: the comparator explicitly normalizes several async-populated fields (`embeddingsModel`, `summarizationModel`, `projectName`, `setting_id`) to avoid false positives. The `name` field was simply omitted from that list when auto-name generation was introduced. Option A is therefore highly consistent with existing code — it is a gap-fill, not a design change. Option B is more robust and prevents the class of bug from recurring for any future auto-filled field, but requires extending the hook's public interface.

Test coverage posture for the affected area is mixed: the integration test suite covers the creation flow broadly but lacks the specific regression scenario. The `compareFormData` utility has no tests at all. The fix is low risk (no backend, no routing, no store changes), but the coverage gap is a delivery risk — a new test must accompany the fix to prevent silent regression.
