# Technical Research

**Task**: project-management datasource resource-counters feature-flag
**Generated**: 2026-10-20
**Research path**: filesystem

---

## 1. Original Context

Title: OSS standalone: hide the datasource icon for projects on the Project Management page

Description: The datasource icon is visible for projects on the Project Management page in the OSS standalone package. Hide the datasource icon for projects on this page in the OSS standalone package.
Preconditions: OSS standalone package running; user can access Project Management page; at least one project listed.
Steps: 1. Open Project Management page in OSS standalone. 2. View a project in the list. 3. Check whether a datasource icon is displayed.
Expected: datasource icon hidden for projects on the Project Management page. Actual: icon displayed.
Affected: OSS standalone package; Project Management page.
Acceptance Criteria:
1. The datasource icon is not displayed for any project on the Project Management page in the OSS standalone package.
2. Project entries remain visible on the page.

Comment (Sergey Grigorash, implementation note): The datasource icon in `ProjectResourceCounters` will be hidden based on the existing `features:datasources` flag. In standalone this flag is off by default (RETRIEVAL_BACKEND=none, so Elasticsearch is not configured). If someone configures Elasticsearch in a standalone deployment, the icon will appear again, in line with the rule that a feature is shown only when its flag is on and its dependencies are available.

Comment (Gokhan Ozdemir, open question to Aliaksei Lyzo, unanswered): should the hiding be extended to all datasource-related visibility, e.g. the navigation menu? (screenshot attached)

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/settings/administration/projectsManagement/ProjectResourceCounters.tsx` — renders five `ResourceCounterBadge`s per project: assistants, workflows, integrations, **datasource** (`DataSourceSvg`, count `c?.datasources_count`, tooltip "Data Sources", link `buildTo('data-sources')`), skills. It reads **no feature flag today**; the datasource badge is unconditional.
- `src/pages/settings/administration/projectsManagement/ResourceCounterBadge.tsx` — presentational `Link` with icon + count; no gating.
- Sole consumer of `ProjectResourceCounters`: `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:58` (import) and `:520` (`assignments` column renderer `(item) => <ProjectResourceCounters project={item} />`).
- Page selection: `src/pages/settings/administration/ProjectsManagementPage.tsx:28` — `isUserManagementEnabled ? <ProjectsManagementFull /> : <ProjectsManagementDefault />`, where the flag comes from `useUserManagementEnabled()` (`features:userManagement`). `ProjectsManagementDefault.tsx` renders only `AdminToolsCard` (no project list). So the badge is only reachable when `features:userManagement` is on.
- Count data: `project.counters` typed in `src/types/entity/project.ts:15-23` (`ProjectCounters` incl. `datasources_count: number`); `project.counters?` optional at `:55`.

### Feature Flag Read Mechanisms
- Reactive hook: `useFeatureFlag(name)` in `src/hooks/useFeatureFlags.ts:62-70` — reads `appInfoStore.configs` via `useSnapshot`, finds `c.id === name`, returns `[config?.settings?.enabled ?? false, isConfigFetched]`. Named wrappers in the same file (e.g. `useUserManagementEnabled`, `useBudgetManagementEnabled`) return `FeatureFlagResult`.
- Non-reactive: `isFeatureEnabled(name)` in `src/utils/featureFlags.ts` (with `isUserManagementEnabled`, `isCostCentersEnabled` etc. wrappers); `isConfigItemEnabled(config, id)` in `src/utils/settings.ts`.
- Constants: `src/constants/featureFlags.ts` — `USER_MANAGEMENT: 'features:userManagement'` (:21), `DATASOURCES: 'features:datasources'` (:45), `KNOWLEDGE_BASES` (:44), `CODE_INDEXING` (:46). No `DATASOURCES` constant is referenced in the projectsManagement folder today.
- Guard component: `src/components/FeatureGuard.tsx` (`featureFlags`, `match: 'all' | 'any'`, uses `isConfigItemEnabled`).
- Enterprise helper: `src/utils/enterpriseEdition.ts` → `isFeatureEnabled(FEATURE_FLAGS.ENTERPRISE_EDITION)`.

### Where the datasource surface is currently gated (for the menu question)
- `src/components/Navigation/Navigation.tsx:85-89` — reads `KNOWLEDGE_BASES`, `DATASOURCES`, `CODE_INDEXING` and computes `isDataSourcesSurfaceEnabled = kb || datasources || codeIndexing` (OR of three).
- `Navigation.tsx:138-140` — pushes the "Data Sources" nav item only when `isDataSourcesSurfaceEnabled`. Nav is therefore **not** gated by `features:datasources` alone.
- `src/router.tsx:287-327` — `dataSourcesSurfaceFlags = [KNOWLEDGE_BASES, DATASOURCES, CODE_INDEXING]`, `match="any"` `FeatureGuard` around all four `dataSourceRoutes` (`data-sources`, `data-sources/:id`, `data-sources/:id/edit`, `data-sources/create`).
- Same OR-of-three computation repeated in `src/pages/assistants/components/AssistantForm/AssistantForm.tsx:240-243` (+ title at :657-659), `.../AssistantForm/components/ContextSelector.tsx:231-236` (+ guard :245), and `src/pages/integrations/components/SettingsForm/CredentialFields.tsx:133-136` (+ `resource_type` filter :203).
- Precedent for flag-filtered credential pickers: `src/utils/settings.ts` `getCredentialUIMapping` / `isConfigItemEnabled` (not inspected in depth).

### Integration Points
- `ProjectsManagementFull` → `ProjectResourceCounters` → `ResourceCounterBadge` → `react-router` `Link` (via `useVueRouter().resolve`).
- `ProjectsManagementFull` already branches on `isUserManagementEnabled` inside the `actions` column (`:521-525`), i.e. flag hooks are already used inside this file's column renderers — a same-file precedent for per-cell gating.
- Count sum `calculateTotalAssignments` (`ProjectsManagementFull.tsx:84-93`) includes `datasources_count`; delete-eligibility logic consumes it (not visual).

### Patterns and Conventions
- Flag hook pattern: `const [isX] = useFeatureFlag(FEATURE_FLAGS.X)` inside component body (see Navigation.tsx:80-87, Avatar.tsx:44).
- Surface-level OR of the three data-source flags is the established convention for "data sources visible" across nav, routes, assistant form, and integration form. The per-badge `features:datasources`-only check proposed by the ticket would be the **first** place that uses one of the three flags in isolation.

---

## 3. Documentation Findings

### Guides and Architecture Docs
No `.ai-run/guides/` consulted for this research; repo docs in `docs/superpowers/tasks/` include prior work on the same flags:
- `docs/superpowers/tasks/2026-09-08-epmcdme-14659-feature-flags/spec.md` (:7-9, :57-60) — defines the three-flag OR rule for nav entry and four `dataSourceRoutes`.
- `docs/superpowers/tasks/2026-09-08-epmcdme-14659-feature-flags/plan.md` (:7-9, :43-45, :54-56) — the constants and router/nav gating; states flags are absent or `enabled: false` when no Elasticsearch is available.
- `docs/superpowers/tasks/2026-09-10-project-list-cost-center-view/technical-analysis.md` (:111-112, :230-231) — references `ProjectResourceCounters` and table-fixed layout risk.

### Architectural Decisions
- EPMCDME-14659 (per the spec above): datasource surfaces are shown when any of `features:knowledgeBases`, `features:datasources`, `features:codeIndexing` is enabled. This is the recorded decision this ticket departs from if it gates only on `features:datasources`.

### Derived Conventions
- Flags are backend-provided via `appInfoStore.configs` by string id; frontend performs no Elasticsearch detection. The ticket comment's "dependencies are available" is therefore represented only by the backend flag value.

---

## 4. Testing Landscape

### Existing Coverage
- No test imports `ProjectResourceCounters.tsx` directly.
- `src/pages/settings/administration/projectsManagement/__tests__/ResourceCounterBadge.test.tsx` — 4 cases (link, count, undefined→0, aria-label). Unaffected by a gate placed above the badge.
- `ProjectsManagementFull.test.tsx` — does **not** mock `ProjectResourceCounters`. It mocks `@/hooks/useFeatureFlags` with `useFeatureFlag: vi.fn(() => [false, true])` and `useUserManagementEnabled: [false, true]`. Fixture `datasources_count: 4` (≈ line 136). Describe block "resource counter links" (≈ :171-216) asserts real badge hrefs including **"data sources badge links to data-sources with project filter"** (≈ :209-215, `getByRole('link', { name: /data sources/i })`).
- Eight other `ProjectsManagementFull.*.test.tsx` files mock `ProjectResourceCounters` to `() => null` (deleteEligibility, editFlow, initialLoad, ownershipTransfer, pagination.integration, persistence, search; plus the flag-mocked pattern in each). These are unaffected by any gate.
- Existing flag-gated tests for datasources exist in `src/components/__tests__/FeatureGuard.test.tsx`, `src/__tests__/router.test.tsx`, `src/pages/dataSources/__tests__/*` (set `features:datasources` enabled via `appInfoStore.configs`).

### Testing Framework and Patterns
- Vitest + Testing Library; `vi.mock('@/hooks/useFeatureFlags', ...)` with `importOriginal` spread (ProjectsManagementFull.test.tsx); `mockAppInfoStore.configs = [{ id, settings: { enabled } }]` pattern (FeatureGuard.test, router.test).
- `useVueRouter` mocked with a `resolve` stub that echoes `query` into `searchParamsString`.

### Coverage Gaps
- No test asserts the datasource badge is hidden under any flag state.
- No test for `ProjectResourceCounters` in isolation.

---

## 5. Configuration and Environment

### Environment Variables
- `RETRIEVAL_BACKEND` (cited in ticket comment, value `none` in standalone) — not referenced in this frontend repo; backend-side. [INFERENCE: effect reaches the UI only through the backend's `configs` payload.]

### Configuration Files
- None in the frontend affecting this flag; flag values come from `appInfoStore` (`/v1/config` payload, see `NewAssistantPage.integration.test.tsx:1465` mock).

### Feature Flags and Deployment Concerns
- `features:datasources`: the ticket's chosen gate. Off by default in standalone per ticket comment (not verifiable in this repo).
- `features:userManagement`: required for the Full page (and thus the icon) to render at all. Its standalone default is not verifiable here; the ticket's "project entries remain visible" implies it is on in OSS.

---

## 6. Risk Indicators

- **Flag mismatch with the rest of the datasource surface (high impact for AC/menu question).** Ticket gates on `features:datasources` alone; nav, routes, assistant form and credential picker use `knowledgeBases || datasources || codeIndexing`. If `features:knowledgeBases` or `features:codeIndexing` is on while `features:datasources` is off, the badge disappears but the Data Sources nav entry and `/data-sources` routes remain. The reverse is not possible for routes. Decision needed; the ticket does not say which to follow.
- **Existing test will break.** `ProjectsManagementFull.test.tsx` "data sources badge links to data-sources" expects the badge while `useFeatureFlag` is mocked to `false`. Gating on `DATASOURCES` requires either flipping that mock for that case or asserting absence. Must be updated with the change.
- **Flicker on load.** `useFeatureFlag` returns `false` until `appInfoStore.configs` is populated; badge appears only after config fetch when enabled. Hidden-by-default is safe, but in deployments where the flag is on the icon will pop in. (`isConfigFetched` is available as second tuple element if the gate needs a loaded state.)
- **Hidden counts still affect behaviour.** `datasources_count` remains included in `calculateTotalAssignments` (`ProjectsManagementFull.tsx:84-93`) and delete-eligibility; hiding the badge makes a non-zero blocking count invisible in OSS. Not changed by this ticket, but worth noting (`ProjectsManagementFull.tsx:98-103` also carries a `datasources_count` label entry; its role was not traced).
- **Gate location.** Gating inside `ProjectResourceCounters` covers the page; gating in the column renderer would also work but would not be covered by a unit test of the component. Mocks in eight test files bypass the component entirely, so a gate inside the component cannot be exercised by them.
- **Dependency check is backend-only.** The ticket comment's "dependencies available" rule is not checked in the frontend; the icon depends solely on `features:datasources` in the config payload. If the backend reports the flag on without Elasticsearch, icon shows.
- **Navigation scope (open question).** Current nav behaviour: "Data Sources" entry is shown when any of the three flags is on (Navigation.tsx:88-89,138-140). Current behaviour is documented here; no change proposed by this research.
- Speculative: the Full page is only visible when `features:userManagement` is enabled; if OSS standalone defaults it off, the page renders `ProjectsManagementDefault` and the icon is already absent — the ticket's reproduction implies it is on.

---

## 7. Summary for Complexity Assessment

The change surface is small: one component (`ProjectResourceCounters.tsx`) with a single badge, plus test updates. Layers touched: settings/administration presentation only. Reuse points exist (`useFeatureFlag` hook, `FEATURE_FLAGS.DATASOURCES` constant, precedent of per-cell flag gating in `ProjectsManagementFull`). Novelty is low, but the flag choice is non-trivial because every other datasource surface uses an OR of three flags; the ticket's single-flag gate diverges from that convention and from the menu behaviour the open question asks about.

Test posture: no direct test for `ProjectResourceCounters`; `ProjectsManagementFull.test.tsx` has an assertion that will invert under the change and must be updated; eight sibling tests stub the component and are unaffected. Key risks are the flag-set mismatch (features:datasources vs the three-flag OR), the flicker before config fetch, and the invisible `datasources_count` still feeding delete eligibility. Acceptance criterion 2 (rows remain) is naturally satisfied because only the badge is conditioned.

---

## 8. External References

- Ticket comments reference a screenshot of the navigation menu (Gokhan Ozdemir's open question). Not accessible to this research agent; the nav behaviour above is taken from `Navigation.tsx` in this repo.
- No file path or directory was named as a source of truth by the task. "None named by the task" for file-system sources.
