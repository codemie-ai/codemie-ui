# EPMCDME-16025 FE: Project-level CLI Analytics toggle and status

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Edit Project toggle "Enable CLI Analytics" + Overview "CLI Analytics: Enabled/Disabled", with the key never serialized for non-writers.
**Architecture:** Visibility = the loaded project carries `cli_analytics_enabled` (BE `can_view`). Writable = `user.isAdmin || user.isMaintainer` (BE sets `is_admin` for maintainers). The key reaches the wire only via a dirty check for writers; otherwise `undefined` (dropped by `JSON.stringify`, `src/utils/api.ts:208-220`).
**Tech Stack:** React, react-hook-form + yup, valtio stores, Vitest + Testing Library.

## Global Constraints
- Commit per task using the repository's convention: `EPMCDME-16025: <Capital sentence>`, no trailing period, trailers `Generated with AI` and `Co-Authored-By: codemie-ai <codemie.ai@gmail.com>`. Stage explicit paths only. Never touch or stage `src/pages/commandCenter/` (user's untracked work). No push, no MR.
- Every new source/test file gets the repo copyright header (`license-headers:check`).
- Hint text verbatim: "Allow analytics ingestion for this project. Turning this off discards incoming analytics; existing data remains available."
- Do not use `ProjectRoleBE.PLATFORM_ADMIN` or the `isMaintainer`-only gate (ProjectModal.tsx:252) for the write decision.

## Acceptance criteria
- GA and Maintainer see an enabled Edit toggle and the Overview status; saved value is sent and survives reload (AC2).
- Project Admin of this project sees a disabled toggle plus status; no other role sees either (AC3, AC4).
- Saving other fields as Project Admin sends no `cli_analytics_enabled` key (AC5); nothing but a changed writer value ever sends it.
- Create mode renders no toggle and sends `undefined`; personal projects render no toggle.
- `npm run typecheck`, `npm run lint` and the targeted tests below pass.

## Assumptions (veto at plan approval)
- **E1** Personal projects: the toggle is NOT rendered for personal projects (ticket scopes the initial UI to shared projects and says personal projects remain disabled); the Overview status still shows the API value (false) when the field is present.
- **E2** Instance flag: the toggle and status are shown regardless of the FE feature flag `features:cliAnalytics` (admins must be able to pre-enable pilot projects; the BE enforces the instance gate at ingest). Known deviation from hiding the Analytics tab.
- **E3** Create mode: the toggle appears only in Edit Project (per the ticket); create sends `undefined`.
- **E4** Send policy: for writers send the field only when its value changed from the loaded project value (dirty); never for non-writers.
- **E5** Visibility rule: show toggle/status iff the loaded project carries the key (`cli_analytics_enabled !== undefined`), mirroring BE can_view; editable iff `isAdmin || isMaintainer`; a Project Admin of this project gets the toggle rendered disabled with the status; the disabled tooltip uses the wrapping-span precedent (ProjectModal.tsx:180-188) because native disabled inputs show no tooltips. The `isMaintainer`-only gate used for `enforce_member_spend_limits` is NOT copied.
- Placement: right after Description (insert at ProjectModal.tsx:230, before Cost center).

## Role x surface matrix
Roles (fixtures): **GA** `{isAdmin:true,isMaintainer:false}` key present; **Maint** `{isAdmin:true,isMaintainer:true}` key present; **PA-this** `{isAdmin:false}`, `applicationsAdmin:[project]`, key present; **PA-other** same flags, `applicationsAdmin:[other]`, key ABSENT; **Member** no flags, key absent; **Auditor** `{isAuditor:true}`, key absent.

| Role | Edit toggle | Overview status | PATCH on save of other fields | PATCH on toggle change | Create mode |
|---|---|---|---|---|---|
| GA | M1 enabled | O1 shown | S1 key undefined | S2 key = new value | C1 no toggle, undefined |
| Maint | M2 enabled | O1 shown | S1 | S2 | C1 |
| PA-this | M3 rendered, disabled, value shown | O1 shown | S3 key undefined | S4 cannot change (disabled; submit gated, payload undefined) | C1 |
| PA-other | M4 not rendered | O2 absent | S3 | n/a | C1 |
| Member | M4 | O2 | S3 | n/a | C1 |
| Auditor | M4 | O2 | S3 | n/a | C1 |

Extra cells: M5 writer + personal project -> not rendered (E1); O3 personal + key `false` -> "Disabled" shown; O4 `true` -> "Enabled"; S5 writer toggles on then back off (not dirty) -> undefined; S6 store PATCH body contains the key iff passed (`true`, `false`, absent).

## Task 1: Types and Overview status
**Files:** Modify `src/types/entity/project.ts:46-79` (`Project`, `ProjectRequest`), `src/types/entity/projectManagement.ts:33-62` (`ProjectListItem`; `ProjectUpdatePayload` :107-116 only if grep shows it is used); `projectsManagement/ProjectOverviewSection.tsx` (after the Admins `InfoItem`, :409). Create `projectsManagement/__tests__/ProjectOverviewSection.test.tsx`.
**Test-first:** yes — rendering `ProjectOverviewSection` with `cli_analytics_enabled: true` shows `CLI Analytics` / `Enabled` fails before the change; O1-O4 cover the rest.
- [ ] Add `cli_analytics_enabled?: boolean` to the types above. Never default it to `false` anywhere.
- [ ] Write O1-O4 using the minimal props of `ProjectOverviewSection` (props :196-208); mock what the component's imports require (see how `ProjectDetailsPage.test.tsx` mocks around it).
- [ ] Render `<InfoItem label="CLI Analytics" value={project.cli_analytics_enabled ? 'Enabled' : 'Disabled'} />` only when `project.cli_analytics_enabled !== undefined`. No feature-flag read (E2).
- [ ] Run the Overview test, then commit (`EPMCDME-16025: Show the CLI analytics status in the project overview`).

## Task 2: Edit Project toggle (render and read-only)
**Files:** Modify `ProjectModal.tsx` (`ProjectFormData` :42-52, `ProjectModalFormValues` :54-60, defaults :89-95, both `reset` branches :100-114, JSX at :230); test `__tests__/ProjectModal.test.tsx` (Switch mock :109-113).
**Test-first:** yes — M1 fails first (`switch-cli_analytics_enabled` absent).
- [ ] Extend the Switch mock additively: keep the wrapper `data-testid="switch-<id>"` + label, add an inner `<input type="checkbox" role="switch" data-testid="switch-input-<id>" checked={!!value} disabled={disabled} onChange={onChange} />`. This is a shared fixture, but only inside this one test file; existing tests assert only on the wrapper testid, so they stay valid. Required because the current mock ignores `disabled`/`value`.
- [ ] Add `cli_analytics_enabled?: boolean` to `ProjectFormData`; form value default `false`; `reset` maps `!!project.cli_analytics_enabled` (edit) and `false` (create).
- [ ] Derive `showCliAnalytics = isEdit && project.cli_analytics_enabled !== undefined && project.project_type !== ProjectType.PERSONAL` and `canWriteCliAnalytics = isAdmin || isMaintainer`.
- [ ] Render a `Controller` + `Switch` (`id="cli_analytics_enabled"`, `label="Enable CLI Analytics"`, hint verbatim, `disabled={!canWriteCliAnalytics}`, `styledDisabled`) when `showCliAnalytics`; when read-only wrap it in a `<span data-tooltip-id="react-tooltip" data-tooltip-content="Only Global Administrators and Maintainers can change this setting">`.
- [ ] Write M1-M5 (tests per cell above), run `ProjectModal.test.tsx`, commit (`EPMCDME-16025: Add the CLI analytics toggle to Edit Project`).

## Task 3: Leak paths (all four submit paths)
**Files:** Modify `ProjectModal.tsx:135-156` (`handleFormSubmit`), `src/store/projects.ts:224-254` (`createProject`) and `:261-274` (`updateProject` body), `ProjectDetailsPage.tsx:189-198` (`handleSaveProject`). Tests: `ProjectModal.test.tsx`, `src/store/__tests__/projects.test.ts` (extend `createProject` :174 and `updateProject` :237 blocks), `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` (near :219-265), `projectsManagement/__tests__/ProjectsManagementFull.editFlow.test.tsx`.
**Test-first:** yes — S2 (writer change reaches `onSubmit`) fails first; S1/S3/C1/S5/S6 lock the negative paths.
- [ ] Path 1, `handleFormSubmit`: add to the `onSubmit` payload `cli_analytics_enabled: showCliAnalytics && canWriteCliAnalytics && data.cli_analytics_enabled !== !!project?.cli_analytics_enabled ? data.cli_analytics_enabled : undefined`. The value is a boolean or `undefined`, never `false`/`null` by default, and `undefined` in create mode.
- [ ] Path 2, `updateProject`: add `cli_analytics_enabled: data.cli_analytics_enabled` to the whitelist (passes `undefined` through untouched).
- [ ] Path 3, `ProjectDetailsPage.handleSaveProject`: add `cli_analytics_enabled: payload.cli_analytics_enabled` to the field-by-field payload.
- [ ] Path 4, `createProject`: after `...data` set `cli_analytics_enabled: undefined`, so create can never send the key (E3), even for a writer.
- [ ] Write tests: S1, S3, C1 (ProjectModal `onSubmit` has `cli_analytics_enabled === undefined`, asserted with `toBeUndefined()` on the payload, not `objectContaining`); S2, S5; S6 and a `createProject` body assertion on the mocked `api.patch`/`api.post` call (`not.toHaveProperty` after JSON round trip); details-page `updateProject` called with the key for a writer payload and `undefined` otherwise; editFlow forwards the modal payload unchanged.
- [ ] Run the four test files, commit (`EPMCDME-16025: Keep the CLI analytics flag out of non-writer requests`).

## Negative-constraint pass
- Project Admin cannot change: T2 `disabled`, T3 path 1 `canWrite`. Other fields must not submit it: S3, S4. `platform_admin` not a writer: Global Constraints, T3 uses `isAdmin || isMaintainer` only. Personal stays disabled: E1/M5, no enabling path. Instance flag preserved: BE-side; FE does not touch it (E2 deviation stated). No push/MR: header. Edit-only: E3/C1. Non-goals: none beyond these.

## Verification (unit + static; run targeted, ask before the full suite)
- `npm run test:unit -- src/pages/settings/administration/projectsManagement/__tests__/ProjectOverviewSection.test.tsx src/pages/settings/administration/projectsManagement/__tests__/ProjectModal.test.tsx src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.editFlow.test.tsx src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx src/store/__tests__/projects.test.ts`
- `npm run typecheck`; `npx eslint <changed files> --ext .ts,.tsx`; `npm run license-headers:check`.
- Layer-B/E2E, **NOT RUN unless done**: the isolated live BE (http://127.0.0.1:18080) is served by an nginx image carrying the built UI of baseline fd947fc38, NOT this branch. Browser verification of this FE requires rebuilding that image from the FE branch; keep it a separate, user-visible, optional step. Executable proof here is unit/component tests + tsc + eslint. MR-time `npm run test-harness` and screenshots are out of scope (no MR).

## Known unverified items
- Whether `features:cliAnalytics` reaches `appInfoStore` for non-admin roles (moot under E2, which does not read it).
- Pre-commit hook (`.husky/pre-commit`) runs `npm run sonar-local`; its local tooling/network needs are unverified, and a failure must be reported, not bypassed.
- That the PATCH response includes the field for Project Admin (BE `visible_value`) was read in code, not exercised live.
