# Technical Research

**Task**: projects, project-modal, project-details, description field, ProjectModal, project store, projects api
**Generated**: 2026-08-26T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-14336 — Make project description optional in the FE.

The backend contract (docs/superpowers/tasks/2026-08-26-optional-project-description/fe-contract.md in a sibling repo — the file is not in this repo, but I have its contents):

- POST /v1/projects: description becomes optional. Omitted, null, "", or whitespace-only → stored as null. >500 chars → 400/422.
- POST response: description now string | null (was string).
- PATCH /v1/projects/{projectName}: 
  - description omitted + clear_description omitted/false → unchanged
  - description = "text" → set
  - description = "" or whitespace-only → cleared (null)
  - clear_description = true (no description) → cleared
  - description = "text" AND clear_description = true → 422
  - description = null explicit → treated as omitted (does NOT clear); use clear_description:true or empty string
- PATCH response: description string | null.

FE work to do:
1. Remove `required` from Description field in ProjectModal (create + edit modes).
2. Edit modal: when user empties the description, send clear_description:true (or "").
3. Project details page: render "no value" placeholder when description is null.
4. Ensure all reads of project.description handle null.
5. Regenerate OpenAPI-derived types/clients after backend merge (may not apply — check if this repo has generated clients).

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/projectsManagement/ProjectModal.tsx` — single modal for both create and edit mode. Contains Yup validation schema, react-hook-form controller, and `handleFormSubmit`. This is the only `ProjectModal` component.
- `src/pages/settings/administration/ProjectDetailsPage.tsx` — project details page. Renders description at line 179 via `displayValue(project.description)`. Uses `ProjectModal` for editing (line 272–277). Passes `payload.description` directly to `projectsStore.updateProject` at line 109.
- `src/pages/settings/administration/projectsManagement/CostCenterProjectsManager.tsx` — uses `project.description || ''` in a client-side filter (line 121). Also has `description` as a table column key for display (line 65), type `DefinitionTypes.String`.
- `src/store/projects.ts` — Valtio store with `createProject` (POST `v1/projects`) and `updateProject` (PATCH `v1/projects/{id}`). The `updateProject` method currently passes `description: data.description` without `clear_description` (line 262).
- No generated OpenAPI clients exist in this repo. All types are hand-written in `src/types/entity/`.

### Architecture and Layers Affected

| Layer | Component |
|---|---|
| Form / UI | `ProjectModal.tsx` — Yup schema, react-hook-form, `<Textarea required>` |
| Page / Container | `ProjectDetailsPage.tsx` — edit flow orchestration, description render |
| Store / API | `src/store/projects.ts` — `createProject`, `updateProject` |
| Types | `src/types/entity/project.ts`, `src/types/entity/projectManagement.ts` |
| Secondary display | `CostCenterProjectsManager.tsx` — filter + table column |

### Integration Points

- `ProjectModal` is used in two places: `ProjectDetailsPage.tsx` (edit) and `ProjectsManagementFull.tsx` (create + edit from list). `ProjectsManagementFull.tsx` has no direct description-related code — it delegates to `ProjectModal` and `projectsStore`.
- `projectsStore.updateProject` is called from `ProjectDetailsPage.handleSaveProject` and `ProjectsManagementFull` (not verified in detail but expected from store usage pattern).
- `displayValue` utility (`src/utils/utils.ts` line 28) already handles `string | null | undefined` and returns `'-'` for falsy values — description render in `ProjectDetailsPage` is already null-safe.

### Patterns and Conventions

- **Clear-field pattern** already established for `display_name`: `clear_display_name: !!project && !trimmedDisplayName` sent in `handleFormSubmit`; store passes `clear_display_name: data.clear_display_name || undefined`. The same pattern must be replicated for `description` / `clear_description`.
- **Yup schema** is the single source of validation. The `required` constraint for description is at `ProjectModal.tsx:67`: `description: Yup.string().required('Description is required')`.
- `<Textarea required>` prop is a visual asterisk only — the actual gate is Yup. Both must be removed.
- Form internal type `ProjectModalFormValues.description` is `string` (non-nullable); after the change it can remain `string` (empty string represents "cleared") as long as the Yup schema is updated to not require it.

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/` exists per AGENTS.md. Relevant guides:
- `.ai-run/guides/patterns/state-management.md` — Valtio store patterns
- `.ai-run/guides/patterns/form-patterns.md` — react-hook-form and Yup patterns
- `.ai-run/guides/development/api-integration.md` — how stores call `api.ts`

No guide specifically covers the clear-field contract pattern, but `display_name` / `clear_display_name` in the existing code is the canonical reference implementation.

### Architectural Decisions

- The `clear_display_name` precedent (introduced in EPMCDME-13486, evidenced by the test at `ProjectModal.test.tsx:231`) establishes that clearing an optional string field uses a `clear_<field>: true` flag rather than sending `null` directly.
- Inline decision in `store/projects.ts:259–260`: `clear_display_name ? undefined : data.display_name` — the store strips the value when the clear flag is set, matching the backend contract.

### Derived Conventions

- Optional cleared fields: form always holds a string (empty or not); the submit handler derives `clear_<field>` from `!!project && !value`; the store passes `clear_<field>: data.clear_<field> || undefined`.
- `displayValue(value)` from `src/utils/utils.ts` is the standard null-placeholder utility; it already returns `'-'` for null.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/projectsManagement/__tests__/ProjectModal.test.tsx` — tests name/display_name independence, form submission shape, `clear_display_name` behavior, display_name max-length validation. Uses Vitest + React Testing Library.
- `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` — tests project loading, edit flow. Mock project fixture has `description: 'Project description'` (string, never null) at lines 78, 150, 177, 203.
- `src/store/__tests__/projects.test.ts` — store-level tests with description as a string in all fixtures; assertion at line 342: `expect(projectsStore.projects[0].description).toBe('New description')`.
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.editFlow.test.tsx` — edit flow integration test (likely asserts description is passed).

### Testing Framework and Patterns

- Vitest with React Testing Library. Two test projects (`unit`, `integration`) per `vitest.workspace.ts`.
- Mocks: `vi.mock` for stores, router, child components. `userEvent` for interaction.
- Test file convention: `__tests__/` sibling directories; test IDs match component `id` props (e.g. `data-testid="description"`).

### Coverage Gaps

- No test covering description = null in create mode (required validation currently prevents this path).
- No test verifying `clear_description: true` is sent when description is emptied in edit mode.
- `ProjectDetailsPage.test.tsx` never passes `description: null` — does not cover the null-display path.
- No test for description omitted on create (new optional scenario).
- `projects.test.ts` fixtures all use non-null description — store behavior with `clear_description` is untested.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables gating the description field. No feature flag for this feature.

### Configuration Files

No config changes required for this task.

### Feature Flags and Deployment Concerns

Not applicable.

---

## 6. Risk Indicators

- **Yup schema requires description at line 67** — `Yup.string().required('Description is required')` — must be changed to optional; currently blocks form submission with empty description in both create and edit modes.
- **`<Textarea required>` prop at `ProjectModal.tsx:219`** — visual asterisk still shown; must be removed alongside schema change.
- **`ProjectFormData.description` is `string | undefined`** (`ProjectModal.tsx:45`); `ProjectRequest.description` is `string | undefined` (`project.ts:68`). Neither declares `null` or `clear_description`. The `clear_description` field is entirely absent from both types — must be added.
- **`updateProject` in `store/projects.ts:262` passes `description: data.description`** without a `clear_description` flag. When the user clears description in edit mode, this sends `description: ""` (empty string), which the backend does clear — however, the `clear_description` flag is the more explicit contract. Either approach can be used but the flag approach mirrors the existing `clear_display_name` pattern and is safer.
- **`CostCenterProjectsManager.tsx:121`** — `project.description || ''` is already null-safe (no risk, but note it silently shows empty rather than a placeholder in the table column).
- **`ProjectPayload.description` in `projectManagement.ts:95`** is typed `string` (not optional, not nullable). This is a separate payload type from `ProjectRequest` in `project.ts`; if `ProjectPayload` is used anywhere for POST, it must also be updated to `string | null | undefined`.
- **`ProjectUpdatePayload.description` in `projectManagement.ts:101`** is `string | undefined` — missing `clear_description` field and `null` union. Needs updating.
- **`ProjectListItem.description` in `projectManagement.ts:35`** is already `string | null` — safe.
- **`Project.description` in `project.ts:50`** is already `string | null` — safe.
- **Test fixtures throughout assume non-null description**: `ProjectModal.test.tsx`, `ProjectDetailsPage.test.tsx`, `projects.test.ts` all hardcode `description: 'some string'`. Tests that submit the form with a description will still pass, but new tests for the optional/null paths are needed.
- **No generated OpenAPI clients** — task item 5 does not apply to this repo.
- **`ProjectsManagementFull.editFlow.test.tsx`** — likely asserts description is included in submission; may need updating if it asserts required validation fires on empty description.

---

## 7. Summary for Complexity Assessment

The change is localized to a well-defined vertical slice: one modal component (`ProjectModal.tsx`), one details page (`ProjectDetailsPage.tsx`), one store method (`updateProject` in `store/projects.ts`), and three type definitions (`project.ts`, `projectManagement.ts`). The description field currently touches approximately 8–10 files, with direct edits needed in 5–6 of them. The display-side (details page) is already null-safe via `displayValue`; only the write path requires substantive logic changes.

The task follows an established pattern: `clear_display_name` is the canonical reference for how to clear an optional string field in this codebase, and the same `clear_<field>: !!project && !value` + store passthrough pattern must be replicated for `clear_description`. No novel architectural patterns are introduced. The Yup schema change is straightforward; the `clear_description` wiring is a small addition to `handleFormSubmit` and `updateProject`.

The main risk is test coverage: all existing test fixtures hardcode non-null descriptions, and the test for required-description validation will need to be replaced with tests for optional behavior and the `clear_description` flag. The `ProjectPayload` and `ProjectUpdatePayload` types in `projectManagement.ts` are secondary concerns — they appear to be local payload types not used in the main submission flow (which uses `ProjectRequest` from `project.ts` and `ProjectFormData` from the modal), but they should be audited and updated for consistency.

---

## Where Changes Go

| FE Task | File(s) | Specific Location |
|---|---|---|
| 1. Remove `required` from Description (create + edit) | `ProjectModal.tsx` | Line 67: `Yup.string().required(...)` → `.optional()` or `.default('')`; Line 219: remove `required` prop from `<Textarea>` |
| 2. Edit modal: send `clear_description` when description emptied | `ProjectModal.tsx` | `handleFormSubmit` (~line 134): add `clear_description: !!project && !data.description.trim()`; `ProjectFormData` interface (line 41): add `clear_description?: boolean`; `project.ts` `ProjectRequest` (line 64): add `clear_description?: boolean` |
| 2 (cont.) Store wiring | `store/projects.ts` | `updateProject` (~line 262): add `clear_description: data.clear_description || undefined` to PATCH body |
| 3. Null description placeholder on details page | `ProjectDetailsPage.tsx` | Line 179: already uses `displayValue(project.description)` which returns `'-'` for null — **no change needed** |
| 4. Null-safe reads of project.description | `ProjectModal.tsx:102`, `CostCenterProjectsManager.tsx:121` | Both already use `|| ''` guard — **no change needed**; audit `ProjectPayload` / `ProjectUpdatePayload` in `projectManagement.ts` for type accuracy |
| 5. OpenAPI regeneration | N/A | No generated clients in this repo — task does not apply |
