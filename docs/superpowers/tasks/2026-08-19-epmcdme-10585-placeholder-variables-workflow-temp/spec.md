# EPMCDME-10585 — Placeholder Variables for Workflow Templates (Frontend)

**Revision:** 2026-09-14. Aligns with backend materialization design. Feature never shipped — **drop** client-side extract/substitute/save guards and any `raw_yaml` usage; no backward compatibility.

## Problem Statement

Authors creating a workflow from a prebuilt template need to fill `${input:…}` slots before editing the create form. Doing extract/substitute in the browser duplicated rules the backend must own, and pairing that with save-time leftover checks fought the new rule that only **prebuilt templates** are validated for placeholders (via a backend call).

## Solution

On create-from-template:

1. Load the template by slug.
2. If `required_variables` is non-empty, show **Configure Template Variables**, then call **`POST …/prebuilt/{slug}/materialize`** with the values.
3. Merge the returned seed into the create form (`name` stays empty).
4. If `required_variables` is empty, seed the form from the GET response and skip the dialog and materialize.

On Save, only normal create validation runs — **no** leftover `${input:…}` scan in the UI and **no** expectation of backend `unresolved_placeholder` on create.

## User Stories

1. As a workflow author, I want a dialog listing required template variables, so that I know what to fill before the form opens.
2. As a workflow author, I want Apply to call the backend materialize API, so that substitution is correct without client YAML hacks.
3. As a workflow author, I want the create form to open with substituted execution YAML and description/start hint, so that I only need to name the workflow and adjust details.
4. As a workflow author, I want Cancel on the dialog to leave create-from-template (back / workflows list), so that I am not left on a blank form.
5. As a workflow author, I want empty required lists to skip the dialog, so that templates without slots stay one-step.
6. As a workflow author, I want materialize validation errors to keep the dialog open with my values, so that I can fix blanks or bad values.
7. As a workflow author, I want Save after materialize to use the normal create path, so that I am not blocked by placeholder leftover checks.
8. As a workflow author who pastes `${input:…}` into the editor after materialize, I want Save not to be blocked by the UI for that string, so that behaviour matches “no save-time placeholder validation.”
9. As a workflow author cloning or creating without a template, I want existing flows unchanged, so that placeholder work does not affect those paths.
10. As a developer, I want client extract/substitute helpers removed from the create-from-template path (and deleted if unused elsewhere), so that the branch does not keep two implementations.
11. As a developer, I want types and store methods for `required_variables` and materialize, so that the page does not scrape `raw_yaml`.
12. As a developer, I want tests that assert dialog → materialize → form, not client regex over template files.

## Implementation Decisions

### Architecture

- Backend owns discovery (`required_variables`) and materialization; UI collects values and displays results.
- Drop from this branch: scanning `raw_yaml` / `yaml_config` for tokens; `substitutePlaceholders` / `buildWorkflowFormFromSubstitutedTemplate` on create-from-template; save-time leftover guard; reliance on `unresolved_placeholder` for create.
- Keep popup UX (Apply fills form; does not POST create).
- Parallel BE/FE development; no production consumers of the old FE contract.

### Create-from-template flow

1. `getWorkflowTemplateBySlug(slug)`.
2. If `required_variables.length > 0` → open popup with those names; hold template metadata for merge.
3. On Apply → `materializeWorkflowTemplate(slug, values)` → on success `setTemplate({ …metadata, …seed, name: '' })`.
4. If `required_variables` empty → `setTemplate({ …data, name: '' })` using GET fields (no materialize).

### API usage

- GET: `required_variables: string[]`; ignore/remove `raw_yaml` from types for this feature.
- POST materialize: body `{ variables: Record<string, string> }`; response `{ yaml_config, description?, start_hint? }`.
- Map `missing_placeholder_variables` and `materialization_failed` to dialog-visible errors; do not treat them as form “issues” from create.

### Popup

- Reset field state when placeholder list or visibility changes (slug navigation).
- Client-side required/non-blank on Apply is OK for UX; backend remains authoritative.

### Modules

- Workflow types: `required_variables`; drop `raw_yaml` if nothing else needs it.
- Workflows store: materialize client method.
- NewWorkflowPage: rewrite fetch / Apply / submit as above.
- Helpers: remove placeholder extract/substitute/seed builders if unused after cleanup; remove their unit tests.
- backendErrorHandler tests: remove or replace `unresolved_placeholder` create-path expectations if obsolete.

## Testing Decisions

- Primary seam: **create-from-template page** (or its integration harness) with mocked store — non-empty vars → popup → materialize → form; empty vars → no popup; submit has no leftover-token guard.
- Secondary: popup reset/error display; store materialize wiring if not covered by the page.
- Prefer behaviour over asserting helper regex internals.
- Prior art: existing NewWorkflowPage / WorkflowPlaceholderValuesPopup / workflows store tests.

## Out of Scope

- Moving the popup to the template details page.
- Immediate create POST from Apply.
- Help/docs / Apply → Save label change.
- Authoring catalog templates in the UI.

## Further Notes

- Frozen backend contract lives in the codemie backend task `spec.md` (same ticket). Implement FE against that contract; coordinate on the shared feature branches.
- Do not keep dual paths “in case raw_yaml returns” — feature never shipped.
