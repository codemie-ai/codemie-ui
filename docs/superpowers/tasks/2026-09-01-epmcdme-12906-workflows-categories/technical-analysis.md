# Technical Research

**Task**: workflows categories assistants filters
**Generated**: 2026-09-01T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Implement EPMCDME-12906 - Workflows: add optional Categories field to Workflow Configuration + category filter in My/All Workflows sidebar. Full ticket: Add an optional Categories field to the Workflow creation/edit Workflow Configuration section (same UX as Assistant Categories), and add a Categories filter to the My Workflows / All Workflows left sidebar to filter workflows by category. Categories field behavior: multi-select dropdown, optional (0 categories), up to 3 categories max (same constraint as Assistants). API: POST/PUT /api/workflows with categories: string[] (0-3 items); GET /api/workflows?filters={categories:[...]}. Categories source: same endpoint/store as Assistant Categories — reuse that component and data.

---

## 2. Codebase Findings

### Existing Implementations

**Categories filter in WorkflowsFilters — partially implemented, gated off:**
- `src/pages/workflows/components/WorkflowsFilters.tsx` — already declares a `categories` entry in `filterDefinitions` (lines 186-195) and reads `assistantCategories` from `assistantsStore`. However, a guard at line 235-237 removes it for any scope that is not `'marketplace'`: `if (definition.name === 'categories') { return false }`. The filter logic, URL sync, and store dispatch are all present and functioning for the marketplace case. `INITIAL_WORKFLOWS_FILTERS` in `src/pages/workflows/constants.ts` already includes `categories: [] as string[]`.

**Categories loading in WorkflowsFilters — marketplace-only:**
- The `useEffect` in `WorkflowsFilters` (line 127-141) calls `assistantsStore.getAssistantCategories()` only when `scope === 'marketplace'`. For `my`, `all`, and `favorites` scopes the store method is never called, so `assistantCategories` stays empty.

**MarketplaceCategories — the canonical reusable field component:**
- `src/pages/assistants/components/AssistantForm/components/MarketplaceCategories.tsx` — a `forwardRef` component wrapping PrimeReact `MultiSelect` via `@/components/form/MultiSelect`. It calls `assistantsStore.getAssistantCategories()` on mount, enforces the 3-category maximum with an inline error message, shows a loading state, and renders a per-option description tooltip. This is the component used by `CategoriesField` in the assistant form.

**CategoriesField (assistant form thin wrapper):**
- `src/pages/assistants/components/AssistantForm/components/AssistantSetup/CategoriesField.tsx` — one-liner wrapper around `MarketplaceCategories`, adding an `isAIGenerated` marker prop. Not needed for workflows unless AI-generation is in scope.

**CategorySelector (alternative wrapper, simpler):**
- `src/pages/assistants/components/CategorySelector/CategorySelector.tsx` — reads `assistantsStore.assistantCategories` without calling `getAssistantCategories()` itself. Less self-contained than `MarketplaceCategories`. Not preferred for this task.

**assistantsStore — shared categories source:**
- `src/store/assistants.ts` — `assistantCategories: AssistantCategory[]` and `getAssistantCategories()` (calls `GET v1/assistants/categories`). Already used by both `AssistantFilters` and `WorkflowsFilters`. No workflow-specific store changes needed for the data source.

**Workflow form — categories field absent:**
- `src/pages/workflows/components/WorkflowFormFields.tsx` — renders all workflow setup fields (name, description, start_hint, project, shared, guardrail_assignments, icon_url, yaml_config). No `categories` field. No import of `MarketplaceCategories` or any category component.
- `src/pages/workflows/components/WorkflowForm.tsx` — maintains `workflowFields` state (line 96-104). `categories` is not in that state object. `getFormValues()` (line 194-207) returns the `workflowFields` snapshot directly; a missing `categories` key means it is never sent to the API.
- `src/pages/workflows/components/workflowSchema.ts` — `WorkflowFormValues` interface and `baseWorkflowSchema` (Yup): neither includes `categories`. The schema is shared with the visual editor's `ConfigPanel`.

**Workflow type — open but untyped for categories:**
- `src/types/entity/workflow.ts` — the `Workflow` interface contains `[key: string]: any` (index signature), so a `categories` payload round-trips without a TypeScript error, but the field is not explicitly declared.

**Visual editor propagation path:**
- `src/pages/workflows/editor/ConfigPanel.tsx` — `getWorkflowFields()` returns `WorkflowFormValues`. This value feeds `WorkflowForm.workflowFields`. If `WorkflowFormValues` is extended with `categories`, the visual editor path carries it through automatically once `ConfigPanel`'s `GeneralConfigTab` form is updated.

**Workflow store — filters already wired:**
- `src/store/workflows.ts` `indexWorkflows` serialises `this.workflowsFilters` as `filters=<encoded JSON>` and sends it to `GET v1/workflows`. `categories` in the filter object is already cleanly passed through `makeCleanObject`.

### Architecture and Layers Affected

| Layer | Component | Change type |
|---|---|---|
| Type definitions | `src/types/entity/workflow.ts` | Add explicit `categories?: string[]` to `Workflow` |
| Form schema | `src/pages/workflows/components/workflowSchema.ts` | Add `categories` to `WorkflowFormValues` and `baseWorkflowSchema` |
| Form fields (text editor path) | `src/pages/workflows/components/WorkflowFormFields.tsx` | Add `Controller` + `MarketplaceCategories`, defaultValue |
| Form state (visual editor path) | `src/pages/workflows/components/WorkflowForm.tsx` | Add `categories` to `workflowFields` state and `getFormValues` |
| Visual editor config panel | `src/pages/workflows/editor/ConfigPanel.tsx` / `GeneralConfigTab` | Render field so `getWorkflowFields()` returns `categories` |
| Sidebar filter | `src/pages/workflows/components/WorkflowsFilters.tsx` | Remove the `categories` guard for `my`/`all`; add `getAssistantCategories()` call for those scopes |

### Integration Points

- `assistantsStore.getAssistantCategories()` — `GET v1/assistants/categories`; already called by marketplace workflow scope and all assistant-facing filters. Must also be called for `my`/`all`/`favorites` workflow scopes once the filter is un-gated.
- `workflowsStore.indexWorkflows()` — serialises `workflowsFilters` and sends `filters` param to backend. No changes needed; `categories` in the filter object passes through today.
- `workflowsStore.createWorkflow` / `updateWorkflow` — pass the form payload verbatim to the API. Once `categories` appears in `getFormValues()` output it is automatically included in POST/PUT.

### Patterns and Conventions

- Form fields use `react-hook-form` `Controller` wrapping a controlled component. See every existing field in `WorkflowFormFields.tsx` for the exact pattern.
- Yup `baseWorkflowSchema` uses `.shape()` chaining; adding an optional array follows the same pattern as `start_hint` (optional, nullable).
- Filter definitions are built in the `filterDefinitions` `useMemo` inside `WorkflowsFilters`; adding a scope condition to the `.filter()` predicate is the established pattern.
- Category data is loaded via `assistantsStore.getAssistantCategories()` and read from `assistantsStore.assistantCategories`. No separate categories store is needed for workflows.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/component-patterns.md` — covers component construction and placement conventions.
- `.ai-run/guides/patterns/state-management.md` — Valtio store and hook conventions.
- `.ai-run/guides/development/api-integration.md` — backend call conventions; relevant for confirming `makeCleanObject` / filter serialisation behaviour.

### Architectural Decisions

No ADR or inline decision comments found in the touched files. The pattern of reusing `assistantsStore.assistantCategories` for workflow filters is already established in the marketplace scope branch of `WorkflowsFilters`.

### Derived Conventions

- Reuse `MarketplaceCategories` directly rather than duplicating it. `CategoriesField` in the assistant form is itself a thin wrapper over `MarketplaceCategories`, confirming the component is the canonical unit.
- Filter options arrays are built from `assistantsStore.assistantCategories` via `useMemo` inside the filter component — already done in `WorkflowsFilters` line 76-79.
- `getAssistantCategories()` is called inside the filter component's `useEffect`, scoped per scope condition — the same pattern should govern the new scope additions.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/workflows/components/__tests__/WorkflowFormFields.test.tsx` — unit test for `WorkflowFormFields`. Tests form rendering and validation. Mocks `WorkflowConfigField`, `GuardrailAssignmentPanel`, `ProjectSelector`. Does not test categories; will need a new case once the field is added.
- `src/pages/workflows/components/__tests__/WorkflowForm.test.tsx` — unit test for `WorkflowForm`. Mocks `WorkflowFormFields` entirely. May need a new case to verify `categories` is included in `getFormValues()` output.
- `src/pages/workflows/components/__tests__/WorkflowsFilters.test.tsx` — unit test. Already mocks `assistantsStore: { assistantCategories: [], getAssistantCategories: vi.fn() }`. Currently has no assertion that `categories` filter appears for `my`/`all` scopes; this gap will need a test.
- `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx` — integration test; covers filter application flow. No categories-specific case.

### Testing Framework and Patterns

- Vitest with React Testing Library (`@testing-library/react`), two projects: `unit` and `integration`.
- Unit tests use `vi.mock` to replace stores and child components; stores are shallow-proxied.
- Integration tests use `mockAPI` and `renderPage` helpers from `src/test-utils/integration`.
- Filter tests assert on `filterDefinitions` passed to the mocked `Filters` component.

### Coverage Gaps

- No test verifies that the `categories` filter is shown for `my` or `all` scopes.
- No test covers `getAssistantCategories()` being called for non-marketplace workflow scopes.
- No test for the categories field in `WorkflowFormFields` (greenfield addition).
- No test that `categories` is included in the payload passed to `createWorkflow`/`updateWorkflow`.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables are specific to the categories feature. The `assistantsStore` uses the shared `api` client which reads `window._env_.VITE_APP_SERVER_URL` at runtime.

### Configuration Files

No feature-flag gate found for categories. The filter guard in `WorkflowsFilters` is a hard code condition, not a feature flag. The visual editor is gated by `isVisualEditorEnabled(configs)`, which checks `appInfoStore.configs`; categories are unaffected by that flag.

### Feature Flags and Deployment Concerns

No flag gates the categories feature. Enabling the filter for `my`/`all` scopes is purely a code change.

---

## 6. Risk Indicators

- **WorkflowForm visual editor path is a second surface.** `WorkflowForm.tsx` has two code paths: the `WorkflowFormFields` text-editor path and the `WorkflowNodeEditor` + `ConfigPanel` visual-editor path. The `workflowFields` state and `getFormValues()` both need `categories`. If the `ConfigPanel` / `GeneralConfigTab` is not updated, the visual editor will silently drop categories on save.
- **`WorkflowFormValues` is shared with `ConfigPanel`.** `src/pages/workflows/editor/ConfigPanel.tsx` imports `WorkflowFormValues` from `workflowSchema.ts`. Extending the interface automatically makes `categories` available in `getWorkflowFields()`, but the `GeneralConfigTab` render (not yet examined) must also include the field for it to populate.
- **`getAssistantCategories()` not called for `my`/`all` scopes.** Without adding the call to the `useEffect` branch for those scopes, `categoriesOptions` stays empty and the filter renders with no choices. This is a runtime-silent failure (empty multiselect, no error).
- **Yup schema default for `categories`.** If `categories` is added to `baseWorkflowSchema` without a `.default([])` transform, submitting a form that never touched the categories field may omit the key from validated output, sending nothing to the API rather than an empty array. Review `cleanObject`/`makeCleanObject` to confirm empty arrays are preserved or stripped as intended.
- **`Workflow` index signature.** The `[key: string]: any` on `Workflow` means TypeScript will not catch mismatches between the API payload type and the display type; explicit typing adds safety but is optional for correctness.
- **No test for categories in form submission.** The `WorkflowFormFields.test.tsx` and `WorkflowForm.test.tsx` mocks are shallow; CI will not catch a missing `categories` in the submitted payload without a new test.

---

## 7. Summary for Complexity Assessment

The task splits cleanly into two sub-changes with very different effort profiles. The **sidebar filter** is approximately 80% already implemented: `WorkflowsFilters.tsx` already declares the `categories` filter definition, reads `categoriesOptions` from `assistantsStore.assistantCategories`, wires the URL/store/pagination reset correctly, and initialises `INITIAL_WORKFLOWS_FILTERS` with `categories: []`. The only missing pieces are (a) removing the `if (definition.name === 'categories') { return false }` guard for `my`/`all`/`favorites` scopes and (b) adding `assistantsStore.getAssistantCategories()` to the `useEffect` branch for those scopes. The filter delta is a handful of lines in one file.

The **form field** is a greenfield addition touching a chain of files: `workflowSchema.ts` (type and Yup schema), `WorkflowFormFields.tsx` (render + Controller + `MarketplaceCategories`), `WorkflowForm.tsx` (state tracking in `workflowFields` + `getFormValues`), `src/types/entity/workflow.ts` (explicit type), and the visual editor's `ConfigPanel` / `GeneralConfigTab` (to close the second code path). The reusable component — `MarketplaceCategories.tsx` — already handles loading, max-3 enforcement, option tooltip rendering, and the `getAssistantCategories()` call, so no new UI component needs to be written. The main risk is the visual editor path, which is a parallel execution branch that would silently drop `categories` if not updated alongside the text-editor path.

Test coverage has a modest gap: existing unit tests for `WorkflowFormFields`, `WorkflowForm`, and `WorkflowsFilters` do not assert on categories behaviour, and the `WorkflowsFilters` mock already stubs `getAssistantCategories` and `assistantCategories`. The integration test for `WorkflowsListPage` does not exercise a categories filter. Coverage for the new field will need to be added (at minimum a `WorkflowFormFields` test verifying the field renders and its value flows through `getValues()`).

---

## 8. External References

None named by the task.
