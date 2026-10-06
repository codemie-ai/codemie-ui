# Technical Research

**Task**: feature-flags capability-fencing knowledge-bases datasources
**Generated**: 2026-09-08T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

Implement the frontend part of Jira ticket EPMCDME-14659.

Goal: Deliver the operator-facing surface this ticket owns: features that utilize Elasticsearch retrieval are disabled when no Elasticsearch is available. CodeMie is expected to work only with PostgreSQL without the pgvector extension.

Scope (frontend / capability fencing — this is the part we implement):
When retrieval is unavailable, Knowledge Bases, Datasources and Code Indexing must be absent from the UI — not visible, selectable, discoverable, or navigable through any entry point. The UI derives this directly from the backend's `get_enabled_components()` output; there must be NO separate frontend detection logic — it is purely gated on backend-provided feature flags. Non-retrieval functionality (e.g. chat with assistants that need none) continues working unaffected.

Backend feature flag ids introduced for this gating (values are the flag identifiers returned by the backend, presumably in some enabled-features/components payload consumed by the frontend):
- "knowledgeBases": "features:knowledgeBases"
- "datasources": "features:datasources"
- "codeIndexing": "features:codeIndexing"

Out of scope: the retrieval implementation itself; adding vector storage; feature gating of areas dependent on other Elasticsearch interaction not mentioned here.

Acceptance criteria (frontend-relevant):
- AC29: Knowledge bases, datasources and code indexing are absent from the product, not present-and-failing when used.
- AC29 (negative/UI corollary): Given retrieval is unavailable, when a user navigates the application, then knowledge bases, datasources and code indexing are not visible, selectable, discoverable, or navigable through any entry point (nav, routes, deep links, search, quick actions, etc.).

Depends on: EPMCDME-14564 (likely the backend ticket that introduces get_enabled_components()/the enabled-features payload this frontend work consumes).

---

## 2. Codebase Findings

### Existing Implementations

Feature-flag core (already generic, no new plumbing needed for new flag ids):
- `src/constants/featureFlags.ts` — `FEATURE_FLAGS` constant map (camelCase key → `'features:xxx'` string id) and the `FeatureFlag` union type derived from it. Currently 17 entries (e.g. `ENTERPRISE_EDITION`, `COST_CENTERS`, `BUDGET_MANAGEMENT`); no `KNOWLEDGE_BASES` / `DATASOURCES` / `CODE_INDEXING` entries exist yet.
- `src/hooks/useFeatureFlags.ts` — `useFeatureFlag(featureName: string): [isEnabled, isLoaded]`, reactive, reads `useSnapshot(appInfoStore).configs` and `.isConfigFetched`; plus a family of named wrapper hooks (`useMcpEnabled`, `useFavoritesEnabled`, `useEnterpriseEnabled`, etc.), each a one-line call to `useFeatureFlag(FEATURE_FLAGS.X)`.
- `src/utils/featureFlags.ts` — non-reactive mirror: `isFeatureEnabled(featureName): boolean` reads `appInfoStore.configs` directly (guards on `appInfoStore.isConfigFetched`), plus named wrappers (`isMcpEnabled`, `isCostCentersEnabled`, etc.).
- `src/utils/enterpriseEdition.ts` — `isEnterpriseEdition()` = `isFeatureEnabled(FEATURE_FLAGS.ENTERPRISE_EDITION)`.
- `src/utils/settings.ts` — `isConfigItemEnabled(config: readonly ConfigItem[], id: string): boolean`, a third lookup variant that takes an explicit config array (used by `FeatureGuard` and by `getCredentialUIMapping` to filter settings/credential pickers by flag).
- `src/components/FeatureGuard.tsx` — route-level guard component: `<FeatureGuard featureFlag={...}>{children}</FeatureGuard>`; on disabled flag it throws a synthetic `Error` with `{status: 404, ...}` fields, which React Router's `ErrorBoundary` renders as a 404 page.
- `src/store/appInfo.ts` (`appInfoStore`, referenced not opened directly) — holds `configs: ConfigItem[]` and `isConfigFetched: boolean`; this is the single Valtio store all flag-reading code (hook, util, guard) reads from — the plausible landing point for the backend's `get_enabled_components()` payload.
- `src/types/entity/configuration.ts` — `ConfigItem { id: string; settings: { enabled: boolean; ... } }` — the shape flag lookups match against by `id`.

Route table (`src/router.tsx`):
- `dataSourceRoutes` (lines 279–300) — 4 routes: `data-sources`, `data-source-details`, `edit-data-source`, `create-data-source`. None currently wrapped in `FeatureGuard` or otherwise conditional.
- Existing gating precedents in the same file:
  - Route-array-level: `...(isEnterpriseEdition() ? analyticsRoutes : [])` and `...(isEnterpriseEdition() ? aiAdoptionConfigRoutes : [])` when building the exported `routes` array — omits whole route families before the router is constructed.
  - Route-element-level: `<FeatureGuard featureFlag={FEATURE_FLAGS.COST_CENTERS}>...</FeatureGuard>` and `<FeatureGuard featureFlag={FEATURE_FLAGS.ENTERPRISE_EDITION}>...</FeatureGuard>` wrapping individual route `element`s (`cost-centers-management(-detail)`, `ai-adoption-config`, `analytics`, `analytics-new-dashboard`, `analytics-edit-dashboard`).

Navigation:
- `src/components/Navigation/Navigation.tsx` — builds `upperSecondaryItems` including a **"Data Sources"** entry (`route: router.resolve({ name: 'data-sources' }).fullPath`) unconditionally — no feature-flag check wraps it today. Contrast with the same array's `isEnterpriseEdition()`-gated "Analytics" push, and `upperItems`' `isSkillsEnabled`-gated "Skills" push, and the `favoritesItems` array which is built conditionally on `isFavoritesEnabled && isFavoritesPageEnabled`.
- Note: the "skills" flag check uses the literal string `useFeatureFlag('skills')`, not a `FEATURE_FLAGS` entry — an existing inconsistency in how flags are keyed across the codebase.

Datasources / Knowledge Bases / Code Indexing surface:
- `src/pages/dataSources/DataSourcesPage.tsx` — the list page mounted at route `data-sources`; single table listing all "datasource" entities regardless of underlying `index_type`.
- `src/utils/indexing.ts` — `isGitIndex`, `isCodeIndex`, `getFullIndexType`, `getIndexTypeDisplay` — internal helpers that classify a datasource row's `index_type` as code (git/svn), knowledge-base (`knowledge_base_*` prefix), provider, etc. **These three product concepts named in the ticket (Knowledge Bases, Datasources, Code Indexing) currently converge into one route family and one nav entry, differentiated only by `index_type` value on data already inside the `data-sources` page — there is no separate "Knowledge Bases" page/route/nav-item and no separate "Code Indexing" page/route/nav-item in the non-AWS UI today.**
- `src/pages/settings/aws/dataSources/{AwsDataSourcesPage,AwsDataSourcesList}.tsx` and the `settings/aws/data-sources(/:settingId)` routes — a **separate** AWS Bedrock vendor-integration concept, keyed by `VendorEntityType.knowledgebases`, reached via `SettingsTab.AWS_DATA_SOURCES`. This is a distinct feature from Elasticsearch-backed retrieval on its face.

### Architecture and Layers Affected

- **Routing layer** — `src/router.tsx` (route tree, existing `FeatureGuard`/conditional-spread gating patterns), `src/hooks/useVueRouter.tsx` (router facade).
- **Component layer** — `src/components/FeatureGuard.tsx` (reusable guard), `src/components/Navigation/Navigation.tsx` and `src/components/Navigation/NavigationSection/NavigationLink.tsx` (nav item rendering).
- **Hook layer** — `src/hooks/useFeatureFlags.ts`.
- **Utility layer** — `src/utils/featureFlags.ts`, `src/utils/enterpriseEdition.ts`, `src/utils/settings.ts` (`isConfigItemEnabled`, `getCredentialUIMapping`).
- **State layer** — `src/store/appInfo.ts` (`appInfoStore.configs` / `.isConfigFetched`) — the sync point for the backend feature/config payload.
- **Constants layer** — `src/constants/featureFlags.ts` (`FEATURE_FLAGS` map), `src/constants/routes.ts` (route id constants incl. `DATASOURCES = 'data-sources'`).
- **Page layer** — `src/pages/dataSources/*` (list/detail/create/edit pages and components), `src/pages/settings/aws/dataSources/*`.

### Integration Points

- `appInfoStore.configs` is the single point every flag-reading mechanism (`useFeatureFlag`, `isFeatureEnabled`, `isConfigItemEnabled`) consumes — matches the ticket's requirement that gating derive purely from a backend-provided payload with no separate frontend detection logic. New flag ids (`features:knowledgeBases`, `features:datasources`, `features:codeIndexing`) need no new fetch/store plumbing to become readable; they plug into the existing `ConfigItem[]` shape by `id`.
- `FeatureGuard` and the hook/util layer both key off the same string ids as `FEATURE_FLAGS` values — adding constants there is consistent with the rest of the codebase's convention, though not the only way flags are referenced (see the `'skills'` literal-string precedent).
- `getCredentialUIMapping` (`src/utils/settings.ts`) already filters settings/credential-type pickers by `config.featureFlag` via `isConfigItemEnabled` — a precedent if datasource-related credential types must also disappear from Integrations/Settings pickers, not just the dedicated Data Sources page/nav.

### Patterns and Conventions

- `FEATURE_FLAGS` is a flat `as const` object; every gated area so far adds one entry there and reads it either through a named hook/util wrapper or directly via `useFeatureFlag(FEATURE_FLAGS.X)` / `isFeatureEnabled(FEATURE_FLAGS.X)`.
- Route gating: two co-existing patterns in `src/router.tsx` — conditional array spread (for whole domains, e.g. Analytics, AI Adoption Config) and per-route `<FeatureGuard>` wrapping (for individual routes within an otherwise-always-registered domain, e.g. Cost Centers within Settings). Both throw/omit before the nav shell renders, satisfying "not navigable via deep link" since `FeatureGuard` throws regardless of how the route was reached.
- Nav gating: conditional item construction inside `useMemo` blocks in `Navigation.tsx` (`if (isSkillsEnabled) items.push(...)`, `isFavoritesEnabled && isFavoritesPageEnabled ? [...] : []`) — the "Data Sources" entry does not yet follow this pattern.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/routing-patterns.md` § "Protected Routes" explicitly documents both existing gating mechanisms found in code: route-array conditional spread (`...(isEnterpriseEdition() ? analyticsRoutes : [])`) and the `FeatureGuard` component, and states there is no generic `ProtectedRoute` wrapper — protection is in-component or at route-registration time.
- No guide specifically titled around feature flags exists in the guide index (`.ai-run/guides/README.md` catalog checked via file listing); flag-usage conventions are derived from code, not documented separately.

### Architectural Decisions

- None found beyond the routing-patterns guide's description of the two gating mechanisms above; no ADR files exist in this repo.

### Derived Conventions

- New capability flags are added as `FEATURE_FLAGS` entries, consumed via the reactive hook in components and the non-reactive util in non-React code, and enforced at both the route boundary (`FeatureGuard` or array-omission) and the navigation-entry boundary (conditional item construction) — this is the pattern every existing gated feature (Cost Centers, Analytics, AI Adoption Config, Skills, Favorites) follows, and the pattern this ticket's UI-fencing work would need to extend to the Data Sources domain to close the currently-unconditional nav link and route registration.

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/__tests__/FeatureGuard.test.tsx` — tests the `FeatureGuard` component.
- `src/utils/__tests__/featureFlags.test.ts` — tests the `isFeatureEnabled` family.
- `src/utils/__tests__/settings.test.ts` — covers `isConfigItemEnabled`-adjacent credential filtering (`getAvailableCredentialsTypes`, etc.), with `vi.mock('@/utils/enterpriseEdition', ...)` and `vi.mock('@/store/appInfo', ...)` as the established mocking pattern for flag-dependent code.

### Testing Framework and Patterns

- Vitest + `@testing-library/react` (`render`, `screen`, `userEvent`), `vi.fn()` / `vi.mock()` for store and module mocking. Two Vitest projects, `unit` and `integration` (per AGENTS.md / `vitest.workspace.ts`).
- Store mocking precedent for flag-dependent tests: `vi.mock('@/store/appInfo', () => ({ appInfoStore: { ... } }))` (seen in `settings.test.ts`) — the pattern to reuse for testing new Knowledge Bases/Datasources/Code Indexing gating.
- `src/hooks/__mocks__/useVueRouter.ts` — a manual mock module for router-dependent component tests (`mockRouterState`, `push`, `replace`, etc.), relevant for testing `Navigation.tsx` or route-composition behavior.

### Coverage Gaps

- No test file found for `src/components/Navigation/Navigation.tsx` (blast-radius flagged `⚠️ no covering tests found` for symbols it depends on, e.g. `FeatureFlagResult`, `useFeatureFlag`, `FeatureFlag`).
- No test file found for `src/pages/dataSources/DataSourcesPage.tsx`.
- No test file found for `src/router.tsx`'s route composition/gating logic (the conditional-spread and `FeatureGuard`-wrapping behavior itself).
- No test file found for `src/pages/settings/aws/dataSources/{AwsDataSourcesPage,AwsDataSourcesList}.tsx`.
- This matters directly for this ticket: the acceptance criterion is entirely about absence-from-every-entry-point, and none of the entry points involved (nav item, route registration, AWS knowledge-bases page) currently have regression coverage.

---

## 5. Configuration and Environment

### Environment Variables

- No environment variable governs this feature. Flag state flows entirely through the backend config/component payload landing in `appInfoStore.configs`, not through `import.meta.env.VITE_*` or `window._env_` (`src/types/global.ts` `EnvConfig` — `VITE_ENV`, `VITE_API_URL`, `VITE_APP_VERSION` — is an unrelated build/runtime config layer).

### Configuration Files

- None specific to this feature; `src/constants/featureFlags.ts` is the closest thing to a "configuration file" for flag ids, and it is a source file, not a runtime config file.

### Feature Flags and Deployment Concerns

- The three flag ids this ticket introduces (`features:knowledgeBases`, `features:datasources`, `features:codeIndexing`) do not yet exist anywhere in the frontend codebase (`FEATURE_FLAGS`, route table, or nav). Their runtime presence depends entirely on the backend ticket EPMCDME-14564 shipping matching ids in the `get_enabled_components()`/config payload that `appInfoStore` consumes.

---

## 6. Risk Indicators

- Knowledge Bases, Datasources, and Code Indexing — three concepts the ticket names separately — currently converge into a single route family (`data-sources`) and a single nav entry ("Data Sources"), differentiated internally only by `index_type` (via `src/utils/indexing.ts` helpers), not by distinct pages/routes/nav items. Speculative: reconciling three backend flag ids with one existing UI surface is a design decision (e.g., gate the single page/route/nav-item on a combination of the three flags, or something else) that belongs to spec/plan, not to this research.
- The AWS Bedrock "Knowledge Bases" surface (`src/pages/settings/aws/dataSources/*`, `VendorEntityType.knowledgebases`) is a distinct vendor-integration feature, not obviously dependent on Elasticsearch retrieval; the ticket's own "out of scope: feature gating of areas dependent on other Elasticsearch interaction not mentioned here" makes whether it's in scope ambiguous and worth a spec-level clarification.
- `Navigation.tsx`'s "Data Sources" nav link (`src/components/Navigation/Navigation.tsx` lines ~118–122) is added unconditionally today — a concrete, discovered gap directly on the AC's "not visible ... through any entry point" requirement.
- `dataSourceRoutes` (`src/router.tsx:279-300`) are spread into the exported `routes` array unconditionally, unlike `analyticsRoutes`/`aiAdoptionConfigRoutes`, which use the `...(flag() ? routes : [])` array-omission pattern — no existing gating touches these routes today, so deep-link/direct-URL access is currently unguarded for this domain.
- Two parallel flag-check APIs exist (`useFeatureFlag` reactive hook vs. `isFeatureEnabled` non-reactive util vs. `isConfigItemEnabled` explicit-array util) and are used inconsistently (e.g., `useFeatureFlag('skills')` bypasses the `FEATURE_FLAGS` constant entirely) — a convention choice to make explicitly rather than infer from a single call site.
- No test coverage exists today for `Navigation.tsx`, `DataSourcesPage.tsx`, or the router's gating composition — for a change whose entire purpose is "must never appear," this is a meaningful regression-safety gap independent of the feature's complexity.
- Discoverability beyond nav and routes (global search, quick actions) named in the AC's corollary was not surfaced by any research query — no dedicated search/quick-action index component was found in the areas explored; whether such a surface exists elsewhere in the app should be confirmed before implementation, since an unindexed area is not the same as a confirmed absence.

---

## 7. Summary for Complexity Assessment

The frontend mechanism this ticket needs already exists end-to-end and is exercised by multiple prior features: a Valtio store (`appInfoStore.configs`) fed by a backend config/component payload, a reactive hook (`useFeatureFlag`) and non-reactive util (`isFeatureEnabled`/`isConfigItemEnabled`) both keyed by string flag ids, a route-level guard component (`FeatureGuard`) with two established gating idioms (array-level omission and per-route wrapping) in `src/router.tsx`, and conditional nav-item construction in `Navigation.tsx`. Adding three new `FEATURE_FLAGS` entries and applying the same two idioms to the Data Sources route family and nav entry is consistent with at least four prior precedents (Cost Centers, Analytics, AI Adoption Config, Skills/Favorites) and touches a small, well-bounded set of files: `src/constants/featureFlags.ts`, `src/router.tsx`, `src/components/Navigation/Navigation.tsx`, and potentially `src/pages/settings/aws/dataSources/*` pending a scope clarification.

The main source of complexity is not mechanical but conceptual: the ticket names three distinct capabilities (Knowledge Bases, Datasources, Code Indexing) that the current UI does not represent as three distinct surfaces — they are sub-classifications of `index_type` inside one existing page/route/nav-item. How three backend flags map onto one existing UI surface (versus the UI needing to branch by `index_type` within that surface, or the AWS Bedrock "Knowledge Bases" page being a fourth, separately-scoped surface) is a design question this research surfaces but does not answer, and it materially affects file-change scope.

Test coverage posture is a secondary risk: `FeatureGuard` and the flag-check utilities themselves are tested, giving confidence the underlying primitive is sound, but none of the actual surfaces this ticket must hide (`Navigation.tsx`, `DataSourcesPage.tsx`, the router's route composition, and the AWS knowledge-bases page) have any existing test coverage, so verifying "absent through any entry point" will require new tests rather than extending existing ones.

---

## 8. External References

None named by the task. The task references Jira ticket EPMCDME-14564 as a dependency, but that is a ticket identifier, not a file path or URL resolvable in this repository — no source-of-truth file was named for `Read`.
