# Data Source Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Add a frontend-only Clone action that opens the create form prefilled from an existing Data Source and saves a new independent one.

**Architecture:** New route `/data-sources/:id/clone` renders `DataSourceClonePage`, which fetches `dataSourceStore.getIndexDetails(id)` and passes it to `DataSourceForm` via a new `cloneFrom` prop (never `index`). Prefill uses a pure mapper extracted from `useEditPopupForm.resetInitFormValues`, called with `isEditing: false`. Save goes through the existing create paths.

**Tech Stack:** React 18, TS, Valtio, react-hook-form + Yup, Vitest + RTL.

**Spec:** `C:/Epam/codemie-dev/codemie-ui/docs/superpowers/tasks/2026-10-16-datasource-clone/spec.md`

Commit per task using the repository's existing convention (ticket EPMCDME-15790). All paths below are relative to `src/`.

## Global Constraints

- Backend untouched; no new APIs, permission or analytics.
- `index` must never carry the clone source (`!!index` is edit mode and would update the original). `useIndexCreation.isEditMode = !!index` (`hooks/useCreateIndex.ts:54`) must stay false so every create branch is used.
- `MASKED_VALUE` (`constants/settings.ts`) must never be sent on create.
- Existing create/edit/re-index/details tests pass unchanged.
- In `DataSourceActions.tsx` `CopySvg` is already imported: alias the clone icon import (e.g. `CloneSvg`) or reuse it; do not collide.
- Test projects: only `*.integration.test.tsx` runs under `--project integration` (`vite.config.ts:134`); all other tests run with `--project unit`.

## Review Focus

- Untouched clone then leaving: no unsaved-changes prompt; edited clone prompts (provider forms may look dirty because `IndexProviderForm` prefills via `setValue` later).
- Source project not visible to the user: project left unselected.
- Provider SECRET fields blank and required; UUID/autofilled params and `otp` not copied.
- SharePoint OAuth token empty, save blocked until sign-in.
- Git / git_faq: `repoIndexType`, `vcs_type` survive.
- Deleted-provider and Bedrock sources: no saveable form. Missing/forbidden id: error state, nothing saved.

---

### Task 1: Clone prefill mapping

**Files:**
- Modify: `pages/dataSources/components/DataSourceForm/hooks/useEditPopupForm.ts` (`resetInitFormValues` is a closure at `:419-492`: hardcodes `isEditing: true`, `name = repo_name`, spreads provider base/create params raw at `:487-488`, defaults `uploadedFiles` from `defaults.uploaded_files` at `:386,:444`).
- Create: `.../DataSourceForm/utils/mapDetailsToFormValues.ts` and `buildCloneValues.ts`.
- Test: `.../hooks/__tests__/useEditPopupForm.clone.test.ts` (unit)

**Interfaces:**
- Produces: pure `mapDetailsToFormValues(defaults, { isEditing, providerSchema, defaultQueryProject })`; `resetInitFormValues` becomes a thin call to it (behavior unchanged for edit).
- Produces: `buildCloneValues(defaults, { providerSchema, isProjectVisible })` calling the mapper with `isEditing: false`, then: `name: ''`, `uploadedFiles: []`, drop provider params that are UUID/autofilled or `otp` (needs provider schema), blank SECRET params, drop identity/runtime fields per spec rule 4, keep `project` only if `userStore.isUserVisibleProject` (`store/user.ts:413`; same pattern as `NewAssistantPage.tsx:101`) else `''`.
- `useEditPopupForm` gains a flag/option selecting the clone mapper; the mapper is passed `defaults` with stable identity (the effect depends on `defaults`, gate is `defaults.id`).

- [ ] **Step 1: Failing tests:** (a) edit mapping unchanged (regression via existing `useEditPopupForm*.test.ts`); (b) clone result has `isEditing === false`, `name === ''`, no identity/runtime keys; (c) masked SECRET provider values become `''`, UUID/autofilled and `otp` dropped; (d) project kept when visible, `''` otherwise; (e) git keeps `repoIndexType`/`vcs_type`, git_faq keeps its type code; (f) file type `uploadedFiles` empty; (g) SharePoint `sharepointAccessToken` `''`; (h) `setting_id`, schedule, guardrails carried (confirm guardrail assignments hold no source id; strip if they do).
- [ ] **Step 2:** `npx vitest run --project unit <path>`; expect FAIL.
- [ ] **Step 3:** Extract mapper, add clone builder and hook option.
- [ ] **Step 4:** Rerun plus existing `useEditPopupForm.test.ts` and `useEditPopupForm.validation.test.ts`; expect PASS.

**Test-first: yes — clone values for a provider source with masked secret and a non-visible project return blank secret, empty name, unselected project, isEditing false.**

### Task 2: DataSourceForm clone mode

**Files:**
- Modify: `pages/dataSources/components/DataSourceForm/DataSourceForm.tsx`, `pages/dataSources/components/IndexProviderForm.tsx`, `.../IndexTypeProvider.tsx:40`, `hooks/useCreateIndex.ts` only if needed.
- Create: `.../DataSourceForm/__tests__/` (directory does not exist) with `DataSourceForm.clone.integration.test.tsx`.

**Interfaces:**
- Consumes: Task 1 clone mapper.
- Produces: `<DataSourceForm cloneFrom={details} />`: create mode, `index` undefined.

Steps:
- Add `cloneFrom?` prop. Pass `useEditPopupForm(index || cloneFrom || {...}, isEditing)` (`:149`) with the clone mapper selected by flag; `cloneFrom` defaults memoized (`useMemo`, never built inline); guard missing `cloneFrom.id`.
- Never set `index` in clone mode. Review each `DataSourceForm.tsx` gate for `cloneFrom`: name disabled (`:367`), divider (`:409`), type selector hidden (`:434`), content-processing selector (`:447`), Google branch (`:513`), `isProviderDeleted` (`:271-279`), memo comparator (`:738`, must also compare `cloneFrom?.id`).
- `IndexProviderForm` re-masks every SECRET field from its `values` prop (`:105`) and `IndexTypeProvider.tsx:40` passes `values={index?.provider_fields}`: in clone mode do NOT pass `values`, so secrets stay blank and required.
- Masked-value skip in `useCreateIndex` (`:575-587`) applies only in edit mode, so in clone mode blank secrets must fail validation and never be sent masked.
- Unsaved-changes baseline (`~:160`): use prefilled values; handle provider clones that become dirty after `IndexProviderForm`'s late `setValue` prefill.

- [ ] **Step 1: Failing tests:** with `cloneFrom`: name enabled and empty, type selector visible; submit calls a create store method (e.g. `createApplicationGitIndex`) and never an update; provider payload has no `MASKED_VALUE` and blank secret blocks submit; file clone with no files fails validation; untouched form (incl. provider) does not prompt on leave, editing name does.
- [ ] **Step 2:** `npx vitest run --project integration <path>`; expect FAIL.
- [ ] **Step 3:** Implement as above.
- [ ] **Step 4:** Rerun plus `DataSourceCreatePage.integration.test.tsx`; expect PASS.

**Test-first: yes — submitting a form rendered with `cloneFrom` calls a create store method and not an update; provider masked secret is never sent.**

### Task 3: Clone route and page

**Files:**
- Modify: `constants/routes.ts` (only `DATASOURCES`, `DATASOURCE_DETAILS` exist; add `CLONE_DATA_SOURCE = 'clone-data-source'`), `router.tsx:292-330` (route `/data-sources/:id/clone` in `dataSourceRoutes` under the same `FeatureGuard`, router `id` equal to the constant), `constants/pageTitles.ts` (~`:64`; assistant/workflow at `:37/:84`), `constants/helpLinks.ts` (~`:61`, `HelpPageId`; assistant/workflow at `:39/:47`).
- Create: `pages/dataSources/DataSourceClonePage.tsx` (model on `DataSourceEditPage.tsx`; headline "Clone Data Source").
- Test: `pages/dataSources/__tests__/DataSourceClonePage.test.tsx` (unit)

Note: assistant/workflow clone reuse their New page and detect clone from `:id` (`router.tsx:181/:458`); a separate page is chosen here because `DataSourceCreatePage` has no `id` param. Edit is pushed inline as `'/data-sources/${id}/edit'` (no route constant); clone navigation uses the same style.

**Interfaces:**
- Consumes: `dataSourceStore.getIndexDetails(id)` (`store/dataSources.ts:204`, returns `DataSourceDetailsResponse`, `types/entity/dataSource.ts:231`), `DataSourceForm cloneFrom`, `indexProviderSchemas` loaded in the store.

- [ ] **Step 1: Failing tests:** loading state; fetch by route id renders form with `cloneFrom` and empty name; rejected fetch / null result shows "Data source not found" and no form; Bedrock (`index_type` includes `bedrock`) or no-access shows a guard message and no form; provider source whose provider is deleted (`isProviderDeleted`, after schemas load) shows "provider no longer exists" and no saveable form.
- [ ] **Step 2:** `npx vitest run --project unit <path>`; expect FAIL.
- [ ] **Step 3:** Implement page, route, title and help entries; verify AICE-imported source project handling per spec rule 5 and note it in a test.
- [ ] **Step 4:** Rerun; expect PASS.

**Test-first: yes — clone route with id renders DataSourceForm with cloneFrom and empty name; failed fetch, Bedrock, and deleted-provider sources render no form.**

### Task 4: Clone entry points and visibility

**Files:**
- Create: `pages/dataSources/utils/canCloneDataSource.ts` — `canCloneDataSource(index, { hasCreatableProject })`: false when `index_type.toLowerCase().includes('bedrock')` (same check as `DataSourceDetails.tsx:184-187`; extract a tiny shared `isBedrockIndex` helper and use it in both) or no creatable project. No `isProviderDeleted` (list items have no `provider_fields`, `types/entity/dataSource.ts:177`).
- `hasCreatableProject` = `userStore.user.applications?.length || isAdmin` (`store/user.ts` ~`:413`).
- Modify: `pages/dataSources/components/DataSourceActions.tsx` (menu item "Clone", `hidden: !canClone`, aliased icon), `pages/dataSources/components/DataSourceDetails.tsx` (Clone button beside `handleEdit` at `:221`, button row ~`:440`; `router.push('/data-sources/${id}/clone')`). Clone shows for any source the user can view, not gated on `canEdit`.
- Test: `pages/dataSources/utils/__tests__/canCloneDataSource.test.ts` (mocks the user store), plus new cases in `components/__tests__/DataSourceActions.accessibility.test.tsx` and `DataSourceDetails.test.tsx`.

- [ ] **Step 1: Failing tests:** helper false for bedrock and for no creatable project (empty applications, non-admin), true for admin or with applications; menu shows "Clone" and click pushes the clone path with the id, hidden for bedrock; details button likewise; visible for a view-only user.
- [ ] **Step 2:** Run the three files with `--project unit`; expect FAIL.
- [ ] **Step 3:** Implement; share the helper across both surfaces.
- [ ] **Step 4:** Rerun including existing tests in those files; expect PASS.

**Test-first: yes — Clone menu item and details button route to the clone path for a normal source and are absent for a Bedrock source.**
