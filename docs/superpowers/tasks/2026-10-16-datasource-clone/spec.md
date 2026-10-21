# Spec: Clone a Data Source (EPMCDME-15790)

Story: `C:/Epam/codemie-dev/docs/stories/2026-10-16-datasource-clone/story.md` (decisions D1-D9 settled). Size M (17/36). Repo: `codemie-ui` only; backend is read-only reference.

## Intent

Users can start a new Data Source from an existing one: a Clone action opens the normal creation form prefilled with the source's configuration, the user supplies a unique name, edits, and saves through the existing per-type create paths. Mirrors assistant/workflow clone (route + GET + strip identity + reuse create). No backend change.

## Behavior

1. **Entry points.** A "Clone" item in `DataSourceActions.tsx` (list menu) and a button in `DataSourceDetails.tsx` (button row). Both navigate to a new clone route (`/data-sources/:id/clone`, route-name constant in `constants/routes.ts`, entry in `dataSourceRoutes` in `router.tsx` under the same `FeatureGuard`, title/help entries in `pageTitles.ts` / `helpLinks.ts`). Use an icon import name that does not collide with the existing `CopySvg` ("Copy ID").
2. **Visibility.** Shown only when the user can view the source (list/details already imply it), the user can work in at least one project they may create in (D5, via existing user-project helper), and the source is not Bedrock (detected by `index_type` containing `bedrock`). A provider source whose provider definition is deleted cannot be detected from the list item, so Clone stays visible and the clone page blocks it with a clear "provider no longer exists" message instead of opening a saveable form. Direct navigation to the clone route without access shows the existing not-found/forbidden handling (GET `v1/index/{id}` enforces READ) and never saves anything.
3. **Prefill.** The clone page fetches via `dataSourceStore.getIndexDetails(id)` and renders `DataSourceForm` through a new prop (e.g. `cloneFrom`), separate from `index`. Prefill reuses the field mapping in `useEditPopupForm.resetInitFormValues` but with `isEditing: false`, empty `name`, and `index` undefined, so the form stays in create mode (type selectable, name editable, create Yup schema, create endpoints). Passing the source as `index` is forbidden: it would update the original.
4. **Fields not copied.** Identity and runtime state (`id`, `name`, dates, states, processed files/info, error, tokens usage, `created_by`/`updated_by`, `user_abilities`, `aice_datasource_id`, etc., per technical-analysis section 6). Provider auto-generated UUID params are not copied.
5. **Project (D6).** Keep the source's project if the user can access it; otherwise leave unselected. For imported code-exploration sources (D9) verify project handling during implementation.
6. **Secrets (D8).** Provider SECRET fields are blank and required; the masked value (`MASKED_VALUE`) must never be sent on create. Integration ids (`setting_id`) are prefilled (references only).
7. **Token-only fields.** SharePoint Microsoft OAuth `sharepointAccessToken` is not stored; the user must sign in again before saving.
8. **File type (D2).** Settings prefilled, file list empty, create-mode minimum-file validation applies; save requires uploading files.
9. **Schedule and guardrails (D7).** Carried over and editable; confirm at implementation that they hold no source id reference.
10. **Save/leave.** Save uses the existing create flow (health check, per-type endpoint, server-side duplicate-name 409 per project). Leaving without saving creates nothing; the unsaved-changes prompt behaves as in normal creation (name starts empty; `compareFormData` baseline must be the prefilled values so an untouched clone does not misfire, and an edited one prompts).

## Acceptance criteria

See story AC list; the spec-level verifiable points are: Clone visible/hidden per rule 2; form prefilled with empty name; save creates a new independent record and the original is unchanged; secrets blank; file list empty; duplicate-name and validation errors identical to create; existing create/edit/re-index/details flows unchanged.

## Testing expectations

New tests for: clone prefill hook/mapping (including secret blanking and excluded fields), form in clone mode calling create (not update), action visibility rules, clone page. Existing datasource tests must pass unchanged.

## Non-goals

- Backend changes, new APIs, a new "create Data Source" permission, or backend duplicate-name checks.
- Copying uploaded file content or any secret values.
- Cloning Bedrock knowledge bases.
- Carrying over indexing state, usage stats, ownership or history.
- Bulk cloning, cross-project cloning into inaccessible projects.
- Clone-usage analytics (`source_assistant_id` equivalent).
- Fixing the pre-existing missing project access check on KB create endpoints.
- Refactoring the form beyond separating clone mode from edit mode.

## Risks

- `index` truthiness is the edit-mode switch in about 10 places in `DataSourceForm.tsx`/`useCreateIndex.ts`; wrong wiring updates the source.
- Thin existing test coverage on prefill and `useCreateIndex`.
- Git (`repoIndexType`, `vcs_type`) and git_faq mapping must survive prefill.
