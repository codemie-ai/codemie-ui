# Technical Research

**Task**: project history modal activity budget
**Generated**: 2026-10-29
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-14326 follow-up: In the project activity history modal, add Budget before, Budget after, and Difference to the existing expanded event details. Compute difference as after minus before. Positive differences green with explicit plus sign and optional upward triangle; negative differences red with minus sign and optional downward triangle; zero neutral. Preserve zero values; missing/invalid values must not fabricate a difference or crash. Keep existing details, filters, pagination and API behavior unchanged. EPMCDME-14328 (backend budget audit) is not implemented yet and has no finalized payload contract — need to inspect the CURRENT local demo event attributes actually returned by the API today and choose one explicit minimal before/after field contract, documenting it as provisional (since the real contract from EPMCDME-14328 doesn't exist yet). No production backend auditing or migrations are in scope. The local project is a demo; may need to inspect local PostgreSQL seed/demo data for project activity history events and consider adding clearly marked synthetic events covering positive/negative/zero/missing-value difference cases for manual verification, without touching existing history rows or real budget balances. Local Docker stack lives in the parent directory; API on localhost:8080, UI on localhost:5173. Backend work for the activity trail is on branch EPMCDME-14325_project-scoped-activity-trail (a sibling repo).

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/projectsManagement/components/ProjectActivityHistoryModal.tsx` — the modal itself (EPMCDME-14326). Renders the filter bar, `Table`, and `renderExpandedRow(item)` (lines 106-121), which calls `getEventAttributeRows(item)` and renders each `{label, value}` pair as a plain row. This is the exact function the new Budget before/after/Difference rows need to extend or sit alongside.
- `src/utils/activityEventPresentation.tsx` — presentation helpers shared by the modal:
  - `PresentableActivityEvent` — structural interface with `attributes?: Record<string, unknown> | null`.
  - `getEventAttributeRows(event)` — turns `event.attributes` into generic humanized `{label, value}` rows via `formatAttributeValue`, which already special-cases keys matching `AMOUNT_KEY_HINT = /(^|_)(amount|budget|spend)($|_)/i` by formatting them with `formatCurrency`. Any `*_budget*` attribute key already renders as currency through this path today, generically, with no before/after/diff semantics.
  - `getEventDisplayLabel`, `getEventTargetLabel`, `getEventActorLabel` — used by the table's custom column renderers.
- `src/types/entity/projectActivityEvent.ts` — `ActivityEventListItem` (lines 30-45): `attributes?: Record<string, unknown>`, i.e. an open bag with no typed budget fields. `ProjectActivityEventsResponse`, `ProjectActivityEventsParams`, `mapActivityEventPagination` are also here; none reference budget before/after.
- `src/store/projectActivityEvents.ts` — `createProjectActivityEventsStore()`. Calls `api.get('v1/projects/{projectName}/activity-events', { params, skipErrorHandling, signal })` and `.../activity-events/metadata`. No transformation of `attributes` happens here — the raw JSON `attributes` object from the backend passes straight through to `ActivityEventListItem`.
- `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectActivityHistoryModal.test.tsx` — existing test fixtures use `attributes: { role: 'viewer' }` style objects; no budget-before/after fixture exists yet.

### Architecture and Layers Affected

- **Presentation/formatting layer**: `src/utils/activityEventPresentation.tsx` is where a new budget-diff-aware row builder most naturally extends `getEventAttributeRows` (or a new sibling function called from `renderExpandedRow`).
- **Component layer**: `ProjectActivityHistoryModal.tsx`'s `renderExpandedRow` — the only call site that needs to render the new three rows (or a composed row) with color/sign/icon.
- **Type layer**: `src/types/entity/projectActivityEvent.ts` (`ActivityEventListItem.attributes`) — currently untyped (`Record<string, unknown>`); any explicit before/after key names chosen provisionally would be read out of this bag, not added as new typed top-level fields, unless the implementation chooses to extend the interface.
- **No router, store-API-call, or pagination layer changes are implied** — the task explicitly keeps filters/pagination/API behavior unchanged, and the existing architecture already passes `attributes` through untouched.

### Integration Points

- Backend endpoint actually called: `GET v1/projects/{projectName}/activity-events` and `GET .../activity-events/metadata`, implemented in the sibling backend repo (`codemie`) by `src/codemie/rest_api/routers/project_activity_events_router.py`, serializing `ActivityEventListItem` (see `src/codemie/rest_api/models/activity_event.py`): `attributes: dict[str, Any] | None` — a fully open bag, matching the UI type.
- No other internal module currently reads or writes a budget-before/after attribute shape anywhere in the UI.

### Patterns and Conventions

- **Currency formatting**: `formatCurrency` (`@/utils/currency`) is the existing convention for rendering budget/amount numbers; `formatSpend` is a sibling used in `SpendingAmount.tsx`.
- **Threshold-based coloring (inline style, not Tailwind classes)**: `getHardLimitSpendColor` (`src/pages/settings/administration/projectsManagement/components/budgetSpending.ts`) calls `getStatusColor` (`src/pages/analytics/components/widgets/RatioWidget/utils.ts`) to return a raw color string applied via inline `style={{ color }}` — this is the one existing "colored budget number" pattern in the codebase, and it is inline-style-based, not Tailwind-class-based.
- **No existing green/red delta or trend-arrow component.** Grepping the whole `src/` tree for `pi-caret`, `pi-arrow`, `lucide`, `TrendingUp/Down`, `triangle/Triangle` found zero matches. No `lucide-react` dependency is installed (only `primereact@10.9.5` / PrimeIcons). If an upward/downward triangle icon is used, it must come from PrimeIcons' existing icon set (e.g. `pi-caret-up`/`pi-caret-down`/`pi-sort-up`/`pi-sort-down` — the exact available icon names were not individually verified against the installed PrimeIcons version) or be a small inline SVG/CSS triangle; no reusable trend-icon component exists to import.
- **Styling guide's semantic color tokens** (`.ai-run/guides/styling/styling-guide.md`): `text-error` (maps to `text-red-500` semantically), `bg-success-primary`/`text-success-primary` (or `-secondary`), `border-border-error`, `text-text-error`, `icon-error`. The guide explicitly prefers semantic tokens (`text-error`, `bg-success-*`) over raw `text-red-*`/`bg-green-*`/`bg-green-*`/`text-green-*`, though the guide also lists `bg-red-*`/`text-red-*`/`bg-green-*`/`text-green-*` as a recognized raw-Tailwind fallback pattern (line ~153-154). `tailwind.config.ts` defines `success.primary`/`success.secondary` and `error.DEFAULT`/`error.hover` design tokens (around lines 420-459) built from `c['green']` / `c['red']` palette entries.
- **Badge pattern for small inline markers**: `DetailsBadge` (`@/components/details/DetailsBadge`), used by `BudgetOverrideIndicator.tsx` for a small pill-style "Overridden" marker next to a value — a plausible reusable shell for a "+/−" diff badge, though it is not itself a colored-delta component.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/styling/styling-guide.md` — covers the semantic color tokens above; no mention of activity-history, budget-diff, or trend-indicator patterns specifically.
- No guide under `.ai-run/guides/` discusses the activity-history modal, budget-event attributes, or EPMCDME-14326/14328 by name.

### Architectural Decisions

- No ADRs or inline `NOTE:`/`HACK:`/`DECISION:` markers were found referencing budget-before/after or activity-event attribute contracts in either repo.
- The comment at `ProjectActivityHistoryModal.tsx` lines 59-60 ("Maps fallback domain backend values to user-facing labels") documents an existing provisional-contract pattern (`DOMAIN_FALLBACK_VALUES`/`DOMAIN_FALLBACK_LABELS`) used when backend metadata is unavailable — a precedent for how this codebase already marks "best guess until the backend is authoritative" values.

### Derived Conventions

- Budget-shaped attribute keys are detected today purely by regex on the key name (`AMOUNT_KEY_HINT`), not by a fixed schema — i.e., the existing code already tolerates arbitrary/unknown attribute key names for budget-like numbers rather than requiring a fixed contract.
- `formatAttributeValue` returns `'—'` for `null`/`undefined` values — the established convention for "missing" is an em-dash, not a thrown error or a fabricated `0`.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectActivityHistoryModal.test.tsx` — covers filters, pagination, expand/collapse, domain fallback labels, actor selector reuse; its `attributes` fixtures are simple (e.g. `{ role: 'viewer' }`) and do not exercise any budget-before/after/diff shape.
- `src/utils/__tests__/activityEventPresentation.test.tsx` — covers `getEventAttributeRows`/`formatAttributeValue`/label helpers, including the amount-key-hint currency formatting, but not a before/after-diff computation.
- No test anywhere computes an after-minus-before difference, applies a sign/color rule, or renders a trend icon.

### Testing Framework and Patterns

- Vitest + React Testing Library, two projects (`unit`/`integration`) per `vite.config.ts`. The existing modal test uses RTL queries (`screen.getByText`, `within(...)`) against mocked store data (no MSW/fetch mocking visible in the excerpt reviewed — store methods appear to be directly mocked/stubbed).

### Coverage Gaps

- No existing unit test for a before/after/diff formatter (sign, color class, zero/negative/positive/missing/invalid cases) — this is new ground entirely.
- No existing test fixture carries a budget-before/after attribute shape, so new fixtures will need to be authored for both the presentation-helper tests and the modal's expanded-row test.

---

## 5. Configuration and Environment

### Environment Variables

- None specific to activity history or budget-diff found. The modal/store layer takes `projectName` as a prop/argument; no env flags control attribute presentation.

### Configuration Files

- `tailwind.config.ts` defines the `success`/`error` color token groups referenced above; no activity-history-specific config file exists.

### Feature Flags and Deployment Concerns

- `src/hooks/useFeatureFlags.ts` / `src/constants/featureFlags.ts` exist in the codebase for other features; no existing flag gates the activity-history modal or its expanded-row content, and the task does not request one.
- Local stack: parent directory `docker-compose.yaml` (`/Users/Anton_Rubanovskii/Projects/EPM-SDAI/CDME/docker-compose.yaml`) defines a `postgres` service (`POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=password`, `POSTGRES_DB=postgres`) and a `codemie` backend service exposing port `8080` (`uvicorn codemie.rest_api.main:app --port=8080`) plus a UI dev service exposing `5173`, matching the ports the task names. No seed-data file for `activity_events` was found by name (`find ... -iname "*seed*"` in the backend repo surfaced only unrelated skill-bundle seeders); demo/synthetic activity-event rows would need to be inserted directly (e.g. via a one-off SQL/script against the `activity_events` table) rather than via an existing seed mechanism.

---

## 6. Risk Indicators

- **No finalized backend payload contract exists.** In the sibling backend repo (`codemie`, currently checked out on `EPMCDME-14325_project-scoped-activity-trail`), `ProjectBudgetService.update_project_budget` (the main budget-update path) emits `attributes={"updated_fields": sorted(changed_fields.keys())}` only — field *names* that changed, never before/after numeric values (`src/codemie/service/budget/project_budget_service.py:1281`). Every other budget-related activity-event call site inspected (`budget.created/deleted/reset/rebalanced/stopped/restored`, user/project budget assignment created/deleted) attaches only identifiers (`budget_id`, `category`, `user_id`, `project_name`) or allocation amounts for *assignment* events (`allocated_max_budget`/`allocated_soft_budget` at line 1511-1514) — none attach a before-value alongside an after-value for the same field. Confirms the task's premise: no real demo data today carries a budget-before/after pair; any UI contract chosen is provisional and must be documented as such, and synthetic demo rows will need fabricated `attributes` to exercise the new UI at all.
- Speculative: the minimal provisional field-name contract the implementation chooses (e.g. `budget_before`/`budget_after`, or `previous_value`/`new_value`) is a design decision for the spec/plan stage, not a discovered fact — nothing in either repo today names such fields.
- **No reusable trend/delta/triangle-icon component exists.** A green/red-with-sign-and-optional-triangle indicator must be built from scratch; only PrimeIcons (no `lucide-react`) is available as an icon source, and no existing icon name for a triangle/caret was verified in use elsewhere in this codebase.
- **`attributes` is a fully untyped bag end-to-end** (backend `dict[str, Any] | None`, frontend `Record<string, unknown>`), so a missing/invalid before/after value is a normal, expected shape, not an edge case — the new formatter must treat absence as the default path, consistent with `formatAttributeValue`'s existing `'—'`-for-null convention, and must not throw on non-numeric values.
- **Currency/zero-value formatting**: `formatCurrency`/`formatSpend` were not inspected for how they render `0` vs `null` — worth checking before relying on them for "preserve zero values," since the task explicitly calls out zero as a case that must not be dropped or treated as missing.
- No existing test harness or fixture covers this scenario, so new tests are additive (lower regression risk) but there is no precedent test to pattern-match against for the diff-specific sign/color logic.

---

## 7. Summary for Complexity Assessment

This is a small, additive change confined to two layers: the presentation-helper module `src/utils/activityEventPresentation.tsx` (where a budget-diff row builder would live, alongside the existing `getEventAttributeRows`/`formatAttributeValue`) and the modal's `renderExpandedRow` in `ProjectActivityHistoryModal.tsx` (the single render call site). No router, store, API-call, filter, or pagination code needs to change — the task explicitly scopes those out, and the existing data flow already passes the untyped `attributes` bag from backend to UI untouched, so the new fields just need to be read out of that same bag under whatever key names the implementation decides on.

The main technical novelty is the complete absence of groundwork: no backend payload contract (EPMCDME-14328 doesn't exist), no existing before/after attribute naming anywhere in the sibling backend repo's current budget-event call sites (confirmed by direct inspection — `update_project_budget` only logs *which* fields changed, never their old/new values), and no reusable green/red/triangle trend-indicator component or icon precedent in the frontend. Every piece — the provisional field-name contract, the diff computation, the sign/color/icon rendering, and any synthetic demo rows for manual verification — is new work with no existing pattern to extend, even though the amount of code involved is small.

Test coverage posture is a clean gap rather than a regression risk: the existing modal and presentation-helper tests use simple non-budget attribute fixtures, so new tests for the diff formatter (positive/negative/zero/missing/invalid) and an updated expanded-row test are purely additive. The main risk callouts for planning are (1) the provisional contract must be clearly marked as such per the task's own instruction, since `tech-lead-stand-in`/spec/plan will otherwise read a chosen field name as a discovered constraint, and (2) "preserve zero" and "don't fabricate on missing/invalid" need explicit unit coverage because the existing `formatAttributeValue` convention (em-dash for null) is the only related precedent and it does not itself address diffing.

---

## 8. External References

- **Sibling backend repo, branch `EPMCDME-14325_project-scoped-activity-trail`** — resolved at `/Users/Anton_Rubanovskii/Projects/EPM-SDAI/CDME/codemie`, currently checked out on exactly that branch (confirmed via `git branch`/`git status`). Facts pulled from it:
  - Endpoint consumed by the UI: `GET v1/projects/{project_name}/activity-events` and `.../activity-events/metadata`, implemented in `src/codemie/rest_api/routers/project_activity_events_router.py`.
  - Response item model `ActivityEventListItem` (`src/codemie/rest_api/models/activity_event.py:75-89`): `attributes: dict[str, Any] | None = None` — fully open, no budget-specific fields defined.
  - `ActivityEvent` ORM row (`src/codemie/service/activity/activity_models.py:93-129`) stores `attributes` as a `JSONB` column with no schema beyond "a dict."
  - Confirmed current attribute payload for the main budget-update event type (`budget.project_budget.updated`, `BudgetManagementEvent.PROJECT_BUDGET_UPDATED`): `attributes={"updated_fields": sorted(changed_fields.keys())}` (`src/codemie/service/budget/project_budget_service.py:1281`) — only the *names* of changed fields (e.g. `["max_budget", "soft_budget"]`), never their before/after numeric values. All other budget-domain activity-event call sites surveyed in the same file and in `budget_service.py` attach only identifiers/category/allocation-amount attributes, never a before-and-after pair for the same field.
  - `EVENT_TAXONOMY` (`src/codemie/service/activity/activity_taxonomy.py`) lists every known `event_type` → (label, category); all budget-domain event types are categorized `"Budget"`.
  - No seed script named `*seed*` touches the `activity_events` table (search limited to that name pattern); demo/synthetic rows would need direct insertion.
- **Local Docker stack** — `/Users/Anton_Rubanovskii/Projects/EPM-SDAI/CDME/docker-compose.yaml`: confirms `postgres` service (`POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=password`, `POSTGRES_DB=postgres`), backend `codemie` service on port `8080` (`uvicorn codemie.rest_api.main:app --port=8080 --reload`), UI dev service on port `5173` — matches the ports named in the task.
- EPMCDME-14328 itself — not resolvable: the task states it is not implemented and has no finalized payload contract; no ticket content, branch, or payload spec for it was found in either repo.
