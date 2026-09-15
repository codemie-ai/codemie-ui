# EPMCDME-14336 — Optional Project Description (FE)

## Goal

Make the project `description` field optional in the FE, matching the finalized backend contract. Users can create/save projects without a description, and can clear an existing description in the edit modal.

## Backend contract (summary)

- `POST /v1/projects`: `description` optional. Omitted / `null` / `""` / whitespace-only → stored as `null`. `>500` chars → `422`.
- `PATCH /v1/projects/{projectName}`:
  - `description` omitted, no `clear_description` → unchanged
  - `description: "text"` → set
  - `description: ""` or whitespace-only → cleared
  - `clear_description: true` (no description) → cleared
  - `description: "text"` + `clear_description: true` → `422` (mutually exclusive)
  - `description: null` (explicit) → treated as omitted (does NOT clear)
- Responses: `description` is now `string | null`.

## Scope of FE changes

1. **ProjectModal (create + edit)** — `src/pages/settings/administration/projectsManagement/ProjectModal.tsx`
   - Remove Yup `.required('Description is required')` on the description field.
   - Remove `required` prop from the Description `<Textarea>`.
   - In submit handler, when in **edit** mode and description was cleared (empty/whitespace) while the project previously had a description, send `clear_description: true`. Otherwise send `description` as-is (empty string is also acceptable per contract).
   - In **create** mode, send `description` as-is (empty string → backend coerces to `null`).

2. **Types** — reflect the new shape:
   - `ProjectRequest` (`src/types/project.ts`): `description?: string | null`.
   - `ProjectFormData` (`ProjectModal.tsx`): add `clear_description?: boolean` where the payload is constructed.
   - `ProjectPayload` (`src/store/projectManagement.ts`): `description?: string | null`.
   - `ProjectUpdatePayload` (`src/store/projectManagement.ts`): add `clear_description?: boolean`.

3. **Store passthrough** — `src/store/projects.ts::updateProject` — pass `clear_description` through to the PATCH body, mirroring the existing `clear_display_name` pattern.

4. **Read-site null safety**
   - `ProjectDetailsPage.tsx` already uses `displayValue(project.description)` → renders `'-'` placeholder for `null`. **No change needed.**
   - `CostCenterProjectsManager.tsx` already uses `project.description || ''`. **No change needed.**
   - Verify no other read sites assume a non-null string (search sweep during implementation).

5. **OpenAPI regeneration** — **N/A**, this repo has no generated clients.

## Non-goals

- No UI redesign of the modal or details page.
- No backend changes (owned by the BE ticket).
- No new placeholder styling — reuse existing `displayValue` behavior.

## Acceptance criteria

- [ ] Description field in ProjectModal shows no required indicator / validation error when empty (create + edit).
- [ ] Creating a project with no description succeeds; details page renders the `'-'` placeholder.
- [ ] Editing a project and clearing its previously-set description sends `clear_description: true` and results in a `null` description server-side.
- [ ] Editing a project without touching description does not send `clear_description` and leaves the value unchanged.
- [ ] Setting a new non-empty description on edit sends `description: "..."` without `clear_description`.
- [ ] Type-check passes.
- [ ] Existing tests updated: required-validation test removed/replaced; new tests cover empty-submit and clear_description behavior.
- [ ] `ProjectDetailsPage` test covers `description: null` fixture.

## Out-of-scope confirmations

- Whitespace-only trim is a backend concern; FE may send `""` or trimmed value — both produce `null`.
- Explicit `null` on PATCH is a footgun documented in the contract; FE will never send explicit `null`.
