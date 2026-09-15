# Plan — EPMCDME-14336 Optional Project Description (FE)

Reference: `spec.md`, `technical-analysis.md` in this directory.

## Tasks

### T1 — Store passthrough for `clear_description`
- **File:** `src/store/projects.ts` (`updateProject`, around line 261)
- **Change:** Mirror the existing `clear_display_name` handling for description:
  - `description: data.clear_description ? undefined : data.description`
  - `clear_description: data.clear_description || undefined`
- **Test-first: yes** — In `src/store/__tests__/projects.test.ts`, add a test asserting that when `updateProject` is called with `{ clear_description: true }` the PATCH body contains `clear_description: true` and omits `description`. Failing test drives adding the passthrough.

### T2 — Type additions
- **Files:**
  - `src/types/entity/project.ts::ProjectRequest` — add `clear_description?: boolean`; widen `description?: string` to `description?: string | null`.
  - `src/types/entity/projectManagement.ts::ProjectPayload` — `description?: string | null` (was required `string`).
  - `src/types/entity/projectManagement.ts::ProjectUpdatePayload` — add `clear_description?: boolean`; leave `description?: string` widened to `string | null` for consistency.
- **Test-first: no** — pure type declarations; verified by `tsc` catching downstream errors.

### T3 — ProjectModal: remove required + wire `clear_description`
- **File:** `src/pages/settings/administration/projectsManagement/ProjectModal.tsx`
- **Changes:**
  1. `validationSchema.description`: `Yup.string().required('Description is required')` → `Yup.string().max(500, 'Description cannot exceed 500 characters').default('')`.
  2. Remove `required` prop from Description `<Textarea>` (line 214).
  3. Extend `ProjectFormData` interface (line 41): add `clear_description?: boolean`.
  4. In `handleFormSubmit` (line 134): compute `const trimmedDescription = data.description?.trim()`. Send:
     - `description: trimmedDescription || undefined`
     - `clear_description: !!project && !trimmedDescription`
     (Mirrors the `display_name` / `clear_display_name` pattern.)
- **Test-first: yes** — In `ProjectModal.test.tsx`:
  - Remove/replace the current "Description is required" validation test with a positive test: submitting the create form with an empty description does NOT surface a validation error and `onSubmit` is called with `description: undefined` and `clear_description: false`.
  - Add an edit-flow test: opening the modal on a project that has a description, clearing the field, submitting → `onSubmit` receives `description: undefined, clear_description: true`.
  - Add a >500-char test if not already covered by the new max validator.
  Run all → RED for the missing behavior; implement to GREEN.

### T4 — Read-site null-safety sweep
- **Action:** grep for `.description` usages on project objects and confirm each site tolerates `null`/`undefined`.
- **Known safe (verified in tech analysis):**
  - `ProjectDetailsPage.tsx:179` uses `displayValue(project.description)`.
  - `CostCenterProjectsManager.tsx:121` uses `project.description || ''`.
- **Test-first: no** — this is a verification task. If a new unsafe read is discovered, treat it as a follow-up sub-task with its own failing test (fixture with `description: null`).

### T5 — Update integration tests for the "created without description" flow
- **File:** `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.test.tsx` (and `editFlow`).
- **Change:** If either test currently relies on filling the description field to submit the create/edit form, adjust so at least one flow succeeds with an empty description.
- **Test-first: yes** — extend or add a test path where description is left blank and creation still succeeds (mock backend returns 200 with `description: null`).

## Order

T1 → T3 → T2 (types fall out naturally when tests fail on new fields) → T4 → T5.

T2 is grouped with T3 in practice: I'll write the type changes as part of T3's GREEN step because TypeScript will demand them.

## Verification checklist (mapped to spec ACs)

- [ ] `npm run typecheck` clean.
- [ ] `ProjectModal.test.tsx`, `store/__tests__/projects.test.ts`, `ProjectsManagementFull.*.test.tsx` all pass.
- [ ] Manual verification is deferred to feature-verification (off by default; spec is straightforward enough that unit + integration tests cover the acceptance criteria).

## Out of scope

- Backend changes.
- OpenAPI regeneration (this repo has no generated clients).
- Redesign of the modal or details page.
