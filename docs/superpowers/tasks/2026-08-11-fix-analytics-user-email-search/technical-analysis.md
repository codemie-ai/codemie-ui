# Technical Research

**Task**: analytics users filter dropdown search email
**Generated**: 2026-08-11T14:05:00.000Z
**Research path**: codegraph

---

## 1. Original Context

Analytics filters: user is not shown when searching by email. The Users filter dropdown on the Analytics page shows 'No results found' when searching by email (e.g. kostiantyn_pshenychnyi1@epam.com), but the backend API /v1/analytics/users returns correct results. The API returns users with id and name fields. The UI dropdown is not rendering the returned users when the search term is an email address.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/analytics/components/AnalyticsFilters.tsx` — orchestrates user search, calls `getAnalyticsUsers`, passes `onSearchChange` to child; wires `onFilter` only when `isAdminPgSearch` is true (line 203)
- `src/pages/analytics/components/AnalyticsUserFilter.tsx` — renders the MultiSelect; passes `onFilter` only when `isAdmin` is true
- `src/store/user.ts` (lines 214–227) — `getAnalyticsUsers` fetches `/v1/analytics/users`, maps response through `formatUserOptions`
- `src/utils/user.ts` (lines 57–101) — `formatUserOptions`: groups users by `id`, builds label from `createdBy(user, true)` which uses `name` then `username` then `user_id`
- `src/utils/helpers.ts` (lines 165–175) — `createdBy`: returns `name || username || user_id || id` — email field is never used
- `src/components/form/MultiSelect/MultiSelect.tsx` (lines 379–392) — `onFilter` fires `onFilter?.(e.filter)` triggering the search callback; when `onFilter` is a function, PrimeReact's built-in client-side filter is also enabled simultaneously via `filter={typeof onFilter === 'function'}`

### Architecture and Layers Affected

- **API integration layer**: `src/store/user.ts` — `getAnalyticsUsers` API call and option mapping
- **Data transformation layer**: `src/utils/user.ts` — `formatUserOptions`, `src/utils/helpers.ts` — `createdBy`
- **Filter state / hook layer**: `src/hooks/useAnalyticsFilters.ts` — filter state management
- **UI filter panel**: `src/pages/analytics/components/AnalyticsFilters.tsx` — orchestration
- **UI dropdown**: `src/pages/analytics/components/AnalyticsUserFilter.tsx` — MultiSelect renderer
- **Shared component**: `src/components/form/MultiSelect/MultiSelect.tsx` — PrimeReact wrapper

### Integration Points

- PrimeReact `MultiSelect` component — built-in client-side filter runs on top of server results when `onFilter` prop is provided
- Backend REST API `/v1/analytics/users?search=<term>` — returns `{ id, name }` objects
- `valtio` reactive store — `src/store/user.ts`
- `lodash/debounce` — debounced API call on search term change

### Patterns and Conventions

- Server-side search is gated by `isAdminPgSearch = isAdmin && isUserManagementEnabled && !hasSelectedProjects`
- Non-admin path relies entirely on client-side PrimeReact label-substring filter
- `formatUserOptions` is the single transformation point from API response to dropdown `{ value, label }` items
- `createdBy(user, true)` is the label builder — resolves `name || username || user_id || id`

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/layered-architecture.md` — layered architecture guide; components → hooks → store → utils pattern applies
- `.ai-run/guides/agents/agent-tools.md` — not relevant
- No analytics-specific guide found

### Architectural Decisions

No ADRs found for the analytics filter pattern. The server-side vs client-side filter split (`isAdminPgSearch`) is a code-level decision without recorded rationale.

### Derived Conventions

- Shared `MultiSelect` component wraps PrimeReact and forwards an `onFilter` prop; callers are expected to manage the search state externally
- Option shapes follow `{ value: string, label: string }` pattern throughout the codebase
- Adding a `filterTemplate` or `filterBy` escape hatch to the shared `MultiSelect` follows the existing pattern of forwarding PrimeReact props

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx` — covers "Me" checkbox behavior and sticky options behavior
- `src/pages/analytics/components/__tests__/AnalyticsFilters.test.tsx` — covers filter panel rendering

### Testing Framework and Patterns

- vitest + `@testing-library/react`
- Tests mock store calls (valtio snapshot mocks) and assert rendered output
- No integration tests with the PrimeReact filter interaction found

### Coverage Gaps

- No test for email-based search in `AnalyticsUserFilter` — the exact broken path has no coverage
- No test asserting that server-returned options survive PrimeReact's client-side filter pass
- `formatUserOptions` utility has no unit tests for its label-building behavior

---

## 5. Configuration and Environment

### Environment Variables

- `isUserManagementEnabled` — feature flag controlling whether admin server-side search path is active (sourced from app config/feature flags store)

### Configuration Files

- No analytics-specific config files found

### Feature Flags and Deployment Concerns

- `isAdminPgSearch` gate: if `isUserManagementEnabled` is off, admin users also fall to client-side-only filtering
- The fix must not regress the non-email (display name) search path for both admin and non-admin modes

---

## 6. Risk Indicators

- **Double-filtering problem**: `MultiSelect.tsx` line 392 — when `onFilter` is provided, PrimeReact's built-in filter activates and re-filters server-returned results against the typed text. If the typed text (email) does not appear in any `label`, all results are hidden.
- **Email never in label**: `formatUserOptions` in `src/utils/user.ts` — the API `name` field is used as label; no email field is consumed. PrimeReact's client-side filter cannot match an email against a display-name label.
- **Non-admin path has no server-side search at all**: `AnalyticsFilters.tsx` line 203 — `onFilter` is only wired for `isAdminPgSearch`; non-admin users cannot search by email either, but that scope is a separate concern.
- **`@` as regex metacharacter**: Some PrimeReact versions apply a regex-based filter; an unescaped `@` in the search term may cause the filter to throw or match nothing.
- **No test coverage for the broken path**: The email search interaction is not tested; the fix must add coverage to prevent regression.
- **`createdBy` fallback chain**: `name || username || user_id || id` — if a user record has a display name, that is always the label regardless of how the user was searched. The label does not reflect the search term.
- **`filterBy` / `filterMatchMode` not exposed**: `MultiSelect.tsx` does not currently forward these PrimeReact props; the fix will need to either add them or use a `filterTemplate` escape hatch.

---

## 7. Summary for Complexity Assessment

The bug is caused by two compounding issues in the analytics user filter. First, `formatUserOptions` in `src/utils/user.ts` builds option labels from the user's display name only (`name || username || user_id || id`) and never includes the email address. Second, the shared `MultiSelect` component enables PrimeReact's built-in client-side filter whenever an `onFilter` callback is provided — this filter runs a text match against the `label` field of each option after the server returns results. When the user types an email address, the API returns the correct user, but PrimeReact then re-filters those results by matching the email string against display-name labels, finding no match and showing "No results found".

The fix scope is narrow: suppress PrimeReact's client-side re-filtering when server-side search is active. The recommended approach is to pass a custom `filterTemplate` or `filterMatchMode="custom"` with an always-true matcher to the underlying PrimeReact `MultiSelect` when the `onFilter` prop is present — this lets the API results pass through unmodified. The `MultiSelect` wrapper at `src/components/form/MultiSelect/MultiSelect.tsx` needs to forward `filterMatchMode` (or an equivalent escape hatch) to PrimeReact. The call site in `AnalyticsUserFilter.tsx` passes the flag when rendering in server-search mode.

Risk is low-to-medium. The change touches one shared component (`MultiSelect.tsx`) and one consumer (`AnalyticsUserFilter.tsx`). Regression risk exists for any other `MultiSelect` usage where client-side filtering is intentional — the fix must be opt-in at the call site, not a global default change. Test coverage for the email-search path needs to be added to `AnalyticsUserFilter.test.tsx`. The non-admin filter path (no `onFilter` wired) is out of scope per the ticket but is noted as a related gap.
