# Technical Research

**Task**: assistants marketplace sorting UI conditional-rendering
**Generated**: 2026-08-07T13:42:00+03:00
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-13942 — Marketplace sorting options are shown on the Project Assistants page

Summary: Marketplace sorting options are shown on the Project Assistants page

Description: Marketplace-related sorting and ordering options are displayed on the Project Assistants page. These sorting and ordering options are applicable only to the Assistant Marketplace page and should not be shown on any other assistants page. The controls should be visible only in the Assistant Marketplace context.

Preconditions: User logged into CodeMie; access to Assistants section; Assistant Marketplace sorting options from EPMCDME-9984 available in UI.

Steps: Open Assistants → Project Assistants → observe sorting/ordering controls; compare with Assistant Marketplace.

Expected: Marketplace sorting/ordering only on Assistant Marketplace; Project Assistants (and other assistants pages) do not show marketplace-specific controls.

Actual: Marketplace sorting/ordering shown on Project Assistants.

Affected: Project Assistants page, Assistant Marketplace page, marketplace sorting/ordering controls, frontend visibility/conditional rendering, Assistants section UI.

Acceptance Criteria:
- Marketplace sorting/ordering visible only on Assistant Marketplace
- Project Assistants does not show marketplace-specific sorting/ordering
- Other assistants pages do not show them unless explicitly required
- Marketplace sorting from EPMCDME-9984 remains functional
- UI visibility logic covered by regression tests for Marketplace and Project Assistants
- No regression in Marketplace listing/filtering/searching/sorting

Additional instruction from user: commit only changed files.

---

## 2. Codebase Findings

### Existing Implementations

- **Shared list page (not separate pages):** `src/pages/assistants/AssistantsListPage.tsx` renders all assistant tabs. Tab → scope mapping:
  - `AssistantTab.ALL` (Project Assistants) → `ASSISTANT_INDEX_SCOPES.VISIBLE_TO_USER`
  - `AssistantTab.MARKETPLACE` → `ASSISTANT_INDEX_SCOPES.MARKETPLACE`
  - Also: Templates, Favorites scopes
- **Routes** (`src/router.tsx`):
  - `assistants` / `assistants/project` → `AssistantsListPage` with `AssistantTab.ALL`
  - `assistants/marketplace` → same page with `AssistantTab.MARKETPLACE`
- **Navigation labels** (`AssistantsNavigation.tsx`): `ALL` → "Project Assistants"; `MARKETPLACE` → "Marketplace"
- **Primary bug locus:** `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx`
  - Defines `sort_by` (Select: Usage / Likes / Dislikes / Name) and `sort_order` (RadioGroup: Desc / Asc)
  - Scope gating in `filterDefinitions` `.filter()` (~lines 194–207):

```194:207:src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx
      ].filter((definition) => {
        if (activeScope === ASSISTANT_INDEX_SCOPES.TEMPLATES) {
          return false
        }
        if (activeScope === ASSISTANT_INDEX_SCOPES.MARKETPLACE) {
          return (
            definition.name === CREATED_BY ||
            definition.name === CATEGORIES ||
            definition.name === 'sort_by' ||
            definition.name === 'sort_order'
          )
        }
        return definition
      }),
```

| `activeScope` | Filters shown today |
|---|---|
| `templates` | None |
| `marketplace` | Created by, Categories, **Sort by**, **Sort order** |
| `visible_to_user` (Project Assistants), `favorites`, other | **All** definitions including **Sort by / Sort order** |

- **Root cause:** Non-marketplace branch uses `return definition` (truthy object), so marketplace sort controls are **not** excluded on Project Assistants / Favorites.
- **Filter state:** `src/pages/assistants/hooks/useAssistantFilters.ts` — includes `sort_by` / `sort_order`; strips `sort_order` when `sort_by` absent; persists per key `assistants.${scope}`
- **Defaults:** `FILTER_INITIAL_STATE` in `src/constants/assistants.ts` — `sort_by: null`, `sort_order: 'desc'`
- **API:** `src/store/assistants.ts` `indexAssistants` appends `&sort_by=` / `&sort_order=` when `sort_by` is truthy (not marketplace-scoped in store)
- **Prior feature (EPMCDME-9984):** `docs/superpowers/tasks/2026-07-23-epmcdme-9984-add-marketplace-sorting/` (code-review JSON only)
- **Other consumer of `AssistantFilters`:** `src/pages/favorites/FavoritesPage.tsx` (scope `favorites`) — also gets sort controls via the same fall-through

### Architecture and Layers Affected

| Layer | Components |
|---|---|
| **Page / Routing** | `AssistantsListPage`, `router.tsx`, `AssistantsNavigation` — already pass correct `activeScope`; no route change needed |
| **UI / Filters** | `AssistantFilters` — **primary fix**; shared `src/components/Filters` |
| **Hooks** | `useAssistantFilters` — optional follow-up for clearing persisted sort on non-marketplace scopes |
| **Store / API** | `assistantsStore.indexAssistants` — keep marketplace sort params; no change required for visibility if UI stops setting sort on project scope |

### Integration Points

- Shared Filters UI: `src/components/Filters/Filters.tsx` (PrimeReact Accordion)
- Select/RadioGroup: `src/components/form/Select`, `src/components/form/RadioGroup` (PrimeReact Dropdown; not antd)
- Filter persistence: `src/utils/filters.ts` (`FILTER_ENTITY.ASSISTANTS` + scope)
- List data: valtio `assistantsStore` → `GET v1/assistants?...&sort_by=&sort_order=`
- Favorites path reuses `AssistantFilters` but favorites API (`store/favorites.ts`) does not send sort params
- Parallel domains (Skills/Workflows marketplace filters) do **not** expose sort UI — assistants is the outlier

### Patterns and Conventions

- One shared list page + tab/`activeScope` prop (not separate Marketplace page component)
- Scope-based filter allowlists: full definition list, then `.filter()` by scope (same pattern as `SkillsFilters` / `WorkflowsFilters`)
- Marketplace uses a **whitelist**; non-marketplace currently returns every definition
- Conditional rendering guidance in `.ai-run/guides/components/component-patterns.md`

### Recommended touch points for the fix

1. **Primary:** `AssistantFilters.tsx` — in the non-marketplace / non-templates branch, exclude `sort_by` and `sort_order` (only keep them when `activeScope === MARKETPLACE`). Align with allowlist style used for marketplace.
2. **Tests:** Extend `AssistantsListPage.integration.test.tsx` to assert "SORT BY" / "SORT ORDER" visible on `/assistants/marketplace` and absent on `/assistants` (Project Assistants). Optionally Favorites.
3. **Optional:** Clear persisted `sort_by`/`sort_order` for `visible_to_user` if already stored — UI hide alone may leave stale sort params if filter state retains them.

---

## 3. Documentation Findings

### Guides and Architecture Docs

Relevant frontend guides under `.ai-run/guides/`:
- `components/component-patterns.md` — conditional rendering; AssistantsListPage cited
- `components/component-organization.md` — page-scoped filters under `src/pages/assistants/components/`
- `patterns/state-management.md` — Component → Store → API
- `testing/testing-patterns.md` — Vitest unit/integration, co-located `__tests__/`
- `quality-gates.md` — lint → typecheck → unit → integration
- `development/constants-usage.md` — scope enums
- `architecture/architecture.md` — AssistantsListPage / assistants store examples

Note: Root `AGENTS.md` still lists backend guide paths that are **not** present on disk in this UI repo; use the frontend `.ai-run/guides/` set above.

### Architectural Decisions

- No formal ADRs for marketplace sorting or EPMCDME-13942
- EPMCDME-9984 left code-review artifacts only (`code-review-final.json`, `code-review-check.json`):
  - Strip `sort_order` when `sort_by` absent (reset/`isReset`)
  - Canonical `AssistantFilters` type from `useAssistantFilters.ts`
  - `sort_by` / `sort_order` required on the interface
- CHANGELOG.md has no entries for EPMCDME-9984 or EPMCDME-13942

### Derived Conventions

- Feature UI stays under `src/pages/assistants/components/`
- Hook owns filter persistence/URL; component builds `filterDefinitions` from `activeScope`
- Store only sends sort query params when `sort_by` is set
- Integration tests: one page → one `*.integration.test.tsx` using `renderPage` + `mockAPI`

---

## 4. Testing Landscape

### Existing Coverage

| File | What it covers |
|---|---|
| `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx` | Project/Marketplace/Favorites/Templates load, search, pagination, project filter chip — **no sort UI visibility assertions** |
| `src/store/__tests__/assistants.test.ts` | URL-encodes `sort_by` / `sort_order` in `indexAssistants` |
| `src/utils/__tests__/filters.test.ts` | `getInitialAssistantFilters` / `checkEmptyFilters` — **no** sort fields |
| `src/components/Filters/__tests__/Filters.test.tsx` | Generic Filters rendering |

No dedicated `AssistantFilters` or `useAssistantFilters` test files. Grep under assistants `__tests__` found **no** matches for `sort_by` / `sort_order` / "SORT BY".

### Testing Framework and Patterns

- Vitest 1.6.1 with unit + integration projects (`vitest.workspace.ts`)
- `@testing-library/react` + `user-event` + jest-dom
- Integration utils: `src/test-utils/integration` — `renderPage(path)`, `mockAPI`
- Select helpers: `src/test-utils/component-interactions/select.ts`
- UI labels render uppercased via Filters accordion → **"SORT BY"**, **"SORT ORDER"**

### Coverage Gaps

1. No assertion that sort controls appear on Marketplace
2. No assertion that sort controls are hidden on Project Assistants (EPMCDME-13942 regression target)
3. No assertion for Favorites / Templates sort visibility
4. No UI test applying sort and verifying API query params
5. No unit tests for `AssistantFilters` scope-based definition filtering
6. `useAssistantFilters` sort_order strip/reset untested

---

## 5. Configuration and Environment

### Environment Variables

No env vars gate marketplace sorting. Unrelated assistant slug envs (`VITE_ONBOARDING_ASSISTANT_SLUG`, etc.) and `VITE_API_URL` do not affect sort UI.

### Configuration Files

- Scopes / defaults: `src/constants/assistants.ts` (`ASSISTANT_INDEX_SCOPES`, `FILTER_INITIAL_STATE`)
- Tabs: `src/constants/index.ts` (`AssistantTab`)
- Feature flags: `src/constants/featureFlags.ts` — none for marketplace sorting
- Runtime config `GET v1/config` gates Favorites tab / remote assistant create — **not** sorting

### Feature Flags and Deployment Concerns

- **Only runtime switch for sort visibility:** `activeScope` in `AssistantFilters`
- No Helm/ConfigMap/deploy toggle for this bug — pure UI conditional-rendering fix
- Client persistence: filters stored as `assistants.${scope}`; stale `sort_by` on Project Assistants scope may still be sent to API if values remain in state after UI hide

---

## 6. Risk Indicators

- **Confirmed visibility bug:** `AssistantFilters.tsx` fall-through `return definition` shows marketplace `sort_by`/`sort_order` on Project Assistants (`visible_to_user`) and Favorites
- **No existing test coverage** for sort UI visibility on Marketplace vs Project Assistants — AC requires regression tests
- **No dedicated `AssistantFilters` unit tests** — scope filter logic is untested
- **Stale persisted sort state risk:** hiding UI alone may leave `sort_by` in `useAssistantFilters` / localStorage for `assistants.visible_to_user`, and store will still append sort query params when `sort_by` is set
- **Favorites also affected** via same shared component — AC says "other assistants pages" must not show marketplace controls unless required
- **No ADR/spec for EPMCDME-13942** — intent inferred from ticket + 9984 review artifacts
- **codegraph unavailable** — research used filesystem Explore threads only; repo may not be indexed
- **AGENTS.md vs on-disk guides mismatch** — backend guide table in AGENTS.md does not match this UI repo's frontend guides
- Thin but actionable requirements — AC is clear; risk is incomplete scope (Favorites) if fix only targets Project Assistants

---

## 7. Summary for Complexity Assessment

This is a focused frontend visibility bug in a single shared filter component. The architectural surface is small: one primary file (`AssistantFilters.tsx`) with a broken scope allowlist, plus regression tests in the existing `AssistantsListPage.integration.test.tsx`. Routes, navigation, and page wiring already pass the correct `activeScope`; Marketplace sorting (EPMCDME-9984) remains in the same definitions array and should stay on the marketplace whitelist.

Technical novelty is low — the fix follows the established marketplace whitelist / Skills-Workflows filter pattern (exclude `sort_by`/`sort_order` unless `activeScope === MARKETPLACE`). Estimated change surface: ~1 implementation file, ~1 integration test file, optionally a small persistence cleanup in `useAssistantFilters` if stale sort params are a concern. No feature flags, env vars, or deploy config involved.

Test coverage posture is mixed-to-weak for this domain: store URL-encoding for sort params exists, but **zero** UI assertions for sort visibility. Key risk factors for scoring: (1) shared component also used by Favorites, (2) possible stale localStorage sort params after UI hide, (3) AC-mandated dual-page regression tests that do not exist today. Overall this is a low-to-moderate complexity conditional-rendering fix with clear root cause and localized touch points.
