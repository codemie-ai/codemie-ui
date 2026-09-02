# Technical Research

**Task**: release-notes deployment-versions dates frontend
**Generated**: 2026-08-04T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-10701: Display deployment date of each version in release notes for the current environment. When generating Release Notes page, invoke the /v1/deployment-versions endpoint and merge dates: if a date appears at the endpoint should use it, otherwise use release date as usual. The backend /v1/deployment-versions endpoint is located in the ../codemie folder (sibling directory). Change only the frontend part.

---

## 2. Codebase Findings

### Existing Implementations

Release notes feature files:

- `src/store/appInfo.ts` (lines 221-225) — `appInfoStore.loadReleaseNotes()`: the only place release notes data is loaded. Currently a purely synchronous method that assigns a static bundled JSON import (`src/configs/releaseNotes.json`) to `this.appReleases` and reads `viewedAppReleaseVersion` from localStorage. No HTTP call is made today. **This is the primary file to change.**
- `src/pages/releaseNotes/ReleaseNotesPage.tsx` — Page component that reads `appReleases` from `appInfoStore` via `useSnapshot(appInfoStore)`. Iterates the array and renders `release.version`, `release.date` (guarded with `{release.date && ...}`), and `release.issues`. No data fetching; purely presentational over store state.
- `src/pages/releaseNotes/components/IssueList.tsx` — Renders per-type issue lists (BUG / STORY). Exports `Issue` interface. Not affected by this task.
- `src/configs/releaseNotes.json` — Bundled static JSON array. Schema: `{ version: string, date?: string, issues: Array<{ key, title, link, type }> }`. Dates are optional YYYY-MM-DD strings. This file continues to be the source for versions and fallback dates.
- `src/components/appLevel/AutoPopupManager.tsx` — Calls `appInfoStore.loadReleaseNotes()` then checks `appInfoStore.isAppReleaseNew()` on mount to decide whether to show a "new release" popup. Since `loadReleaseNotes` becomes async, the `await` already exists in the return type signature (`Promise<any[]>`); the caller must `await` it correctly.
- `src/utils/helpers.ts` (lines 76-95) — `formatDateTime(dateString, 'day')` uses Luxon `dt.toLocaleString(DateTime.DATE_FULL)`. Accepts any ISO 8601 string (both `YYYY-MM-DD` and full `YYYY-MM-DDTHH:mm:ssZ` are handled by `parseDate`). No change needed here; the function already handles full ISO timestamps from the backend.

### Architecture and Layers Affected

| Layer | Component | Change Needed |
|-------|-----------|---------------|
| Store / State | `src/store/appInfo.ts` — `loadReleaseNotes()` | Yes — add `api.get('v1/deployment-versions')` call and merge logic |
| Page / View | `src/pages/releaseNotes/ReleaseNotesPage.tsx` | No structural change; `release.date` guard already handles merged dates |
| Static Data | `src/configs/releaseNotes.json` | No change; remains the source for versions and fallback dates |
| Utility | `src/utils/helpers.ts` — `formatDateTime` | No change; already handles full ISO timestamps |
| App bootstrap | `src/components/appLevel/AutoPopupManager.tsx` | Audit required — must verify `loadReleaseNotes()` is awaited before `isAppReleaseNew()` check |

### Integration Points

- **`GET /v1/deployment-versions`** (new): Called via `api.get('v1/deployment-versions')` in `loadReleaseNotes`. Returns `{ deployments: Array<{ version: string, deployedAt: string }> }`. Field name on the wire is `deployedAt` (camelCase; the Python model uses `deployed_at` internally but `alias_generator=to_camel` serializes it as camelCase). Dates are ISO 8601 strings with timezone (e.g. `"2026-07-20T12:34:56Z"`). Requires auth (standard session cookie). Empty state returns `{ deployments: [] }` with HTTP 200.
- **`api` singleton** (`src/utils/api.ts`): Used for all HTTP calls in `appInfoStore`. Pattern: `const response = await api.get('v1/deployment-versions'); const data = await response.json()`. Base URL is `/api` by default, proxied to `http://localhost:8080` in dev. No `Authorization: Bearer` header — auth is cookie-based in production.
- **`src/configs/releaseNotes.json`** (existing): Static import; provides the canonical version list and fallback `date` values.

### Patterns and Conventions

- **Valtio store pattern**: All state in `appInfoStore` is managed via `proxy<AppInfoStoreType>`. Async methods mutate `this.*` directly. Consumers use `useSnapshot(appInfoStore)` for reactivity.
- **API call pattern** (from `loadAppInfo`, `fetchCustomerConfig`, and others in `appInfo.ts`):
  ```ts
  try {
    const response = await api.get('v1/some-endpoint')
    const data = await response.json()
    this.someField = data.someValue
  } catch (error) {
    console.error('Error description:', error)
    // graceful degradation — return fallback value
  }
  ```
  `appInfoStore` does NOT expose `loading` or `error` state fields for any of its bootstrap methods. Errors are logged to console and the store gracefully degrades. The new call should follow this same silent-catch pattern, falling back to the JSON-only dates if the endpoint is unavailable.
- **Date merge rule** (from ticket): `if (deployedAt present for version) use deployedAt; else use release.date from JSON`. Implementation approach: build a `Map<string, string>` from `data.deployments` keyed by `version`, then map over `releaseNotes` to construct `appReleases` with `date` overridden by `deployedAt` when present.
- **`formatDateTime` compatibility**: The helper's `parseDate` function uses Luxon's `DateTime.fromISO`, which correctly parses both `"2026-08-03"` (local date) and `"2026-07-20T12:34:56Z"` (UTC datetime). No change needed.

---

## 3. Documentation Findings

### Guides and Architecture Docs

Guides found under `C:\Users\KonstantinShnyrkov\Work\codemie-dev\codemie-ui\.ai-run\guides\`:

| Guide | Relevance |
|-------|-----------|
| `.ai-run/guides/patterns/state-management.md` | Canonical Valtio store pattern; async method template with loading/error rules |
| `.ai-run/guides/development/error-handling-patterns.md` | Store-layer error handling conventions; try/catch/finally; when to use toaster vs. console.error |
| `.ai-run/guides/development/api-integration.md` | API call conventions: `await response.json()`, no `.data` accessor |
| `.ai-run/guides/architecture/architecture.md` | General architecture reference |
| `.ai-run/guides/project.md` | Project identity: `codemie-ui-next`, Jira prefix `EPMCDME`, MR target `main` |

### Architectural Decisions

- `appInfoStore` intentionally does not expose `loading` / `error` state for bootstrap-phase data fetches. The pattern across all existing async store methods is graceful degradation: catch errors, log to console, return a safe fallback. This is consistent across `loadAppInfo`, `fetchCustomerConfig`, `fetchToolConfigs`, and `getLLMModels`. The new `v1/deployment-versions` call should follow this same pattern — if the call fails, fall back to dates from `releaseNotes.json` with no user-visible error.
- Release notes data is intentionally loaded from a static JSON to avoid a network dependency at startup. The new endpoint call adds a network dependency only to the `loadReleaseNotes()` path, which is already declared `async`.

### Derived Conventions

- Never use `.data` on an API response — always call `await response.json()`.
- `appInfoStore` methods that fetch data silently catch and return safe defaults. No toaster is used for bootstrap errors.
- Type loosely in the store (`any[]` for `appReleases`) — there is no shared `AppRelease` interface. The task can introduce one as an improvement, but it is not required to match existing conventions.
- The `Release` interface (version, date, issues) is defined locally in the test file only. A new `AppRelease` type should be added to the store or a shared types file if type safety is desired.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/releaseNotes/__tests__/ReleaseNotesPage.test.tsx` — 31 tests covering rendering, date display, issue grouping, viewed-version tracking, and empty states. The store is fully mocked via `vi.mock('@/store/appInfo', ...)` — tests are insulated from the actual `loadReleaseNotes` implementation.
- `src/pages/releaseNotes/components/__tests__/IssueList.test.tsx` — 5 tests for the IssueList component.
- `src/store/__tests__/appInfo.test.ts` — 14 tests covering only `fetchToolConfigs`. No tests for `loadReleaseNotes`, `loadAppInfo`, `setViewedAppVersion`, or `isAppReleaseNew`.

### Testing Framework and Patterns

- **Runner**: Vitest 1.6.1, jsdom environment
- **Libraries**: `@testing-library/react` 16.3.0, `@testing-library/jest-dom` 6.6.3, `@testing-library/user-event` 14.6.1
- **Setup files**: `setupTests.tsx` (base; localStorage mock, global fetch mock, router mock), `setupTests.unit.ts` (vi.mocks `@/utils/api` globally for unit tests), `setupTests.integration.ts` (raises async timeout)
- **API mocking pattern** (from `appInfo.test.ts`):
  ```ts
  const mockGet = vi.fn()
  vi.mock('@/utils/api', () => ({ default: { get: (...args) => mockGet(...args) } }))
  const okResponse = (data) => ({ json: () => Promise.resolve(data) })
  mockGet.mockResolvedValue(okResponse({ deployments: [...] }))
  ```
- **Store mock in component tests** (from `ReleaseNotesPage.test.tsx`):
  ```ts
  vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
  ```
  `mockAppInfoStore.appReleases` is a plain array mutated per-test in `beforeEach`.

### Coverage Gaps

- `loadReleaseNotes()` in `appInfoStore` has zero test coverage. Adding the `v1/deployment-versions` call and merge logic here is entirely untested territory.
- No test verifies that deployment dates override JSON dates when present.
- No test verifies that JSON dates are preserved as fallback when `deployedAt` is absent.
- No test verifies behavior when `v1/deployment-versions` returns `{ deployments: [] }`.
- No test verifies behavior when `v1/deployment-versions` throws (network error / 401).
- The `ReleaseNotesPage.test.tsx` date tests use hardcoded `appReleases` with `date: '2025-07-11'`; they will continue to pass unchanged since they mock the store, not the HTTP layer.
- `AutoPopupManager` calls `loadReleaseNotes()` — no test for the timing of `isAppReleaseNew()` relative to `loadReleaseNotes()` completing.

---

## 5. Configuration and Environment

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `/api` | Base URL for all `api.get(...)` calls; configurable at runtime via `window._env_.VITE_API_URL` |
| `VITE_ENV` | `local` | Controls auth header mode: `local` sends `user-id: dev-codemie-user` instead of cookies |

### Configuration Files

- `.env` — default env values; `VITE_API_URL=/api`
- `vite.config.ts` — dev proxy: `/api` → `http://localhost:8080` (strips `/api` prefix). So `api.get('v1/deployment-versions')` in dev sends `GET /api/v1/deployment-versions` which proxies to `GET http://localhost:8080/v1/deployment-versions`.

### Feature Flags and Deployment Concerns

- No feature flags exist for the release notes feature.
- The `v1/deployment-versions` endpoint requires standard session auth. In `local` dev mode, the `user-id` header substitutes for cookie auth. This is handled automatically by `api.ts`'s `authHeaders()` method and requires no special configuration for this task.
- The endpoint returns `{ deployments: [] }` (not a 404) when no deployment records exist — the merge logic must handle an empty `deployments` array gracefully, falling back entirely to JSON dates.

---

## 6. Risk Indicators

- **`loadReleaseNotes()` has no tests** — the entire new implementation (API call + merge logic) lands in zero-coverage code. New store-level tests are needed for the happy path, the fallback path (empty `deployments`), and the error path.
- **`appReleases: any[]` is loosely typed** — merging `deployedAt` into the release objects without a typed `AppRelease` interface risks silent property name errors at build time. Introducing an `AppRelease` interface in `appInfo.ts` (or a shared types file) is advisable.
- **`AutoPopupManager` calls `loadReleaseNotes()` then immediately reads `isAppReleaseNew()`** — today this is safe because `loadReleaseNotes` is synchronous. After the change, the method is truly async. If `AutoPopupManager` does not `await` the call, `isAppReleaseNew()` will run before `appReleases` is populated with merged dates. Audit `AutoPopupManager.tsx` before completing the task.
- **`formatDateTime` handles full ISO timestamps** — `"2026-07-20T12:34:56Z"` will be parsed correctly by `DateTime.fromISO` in Luxon. The `'day'` style calls `dt.toLocaleString(DateTime.DATE_FULL)`, so users will see "July 20, 2026" for a deployment date. This is the intended behavior per the ticket. No change needed to the helper.
- **Date string type change** — `release.date` in `releaseNotes.json` is a short `YYYY-MM-DD` string. After merging, it becomes a full ISO 8601 datetime string (`"2026-07-20T12:34:56Z"`) for versions that have a deployment record. The existing `formatDateTime(release.date, 'day')` call in `ReleaseNotesPage.tsx` handles both formats transparently via Luxon. No UI change needed.
- **No retry or timeout on `v1/deployment-versions`** — `api.ts` makes no provision for retries or per-call timeouts. Consistent with all other `appInfoStore` calls; the risk is low since a failure silently falls back to JSON dates.
- **Silent fallback behavior may be surprising** — if the endpoint is unreachable (e.g., backend not deployed), the UI silently shows JSON dates without any indicator that deployment dates are unavailable. This matches the existing store error-handling convention but could confuse operators during incidents.
- **No `loading` state exposed** — `loadReleaseNotes` will now be truly async (network call), but the store pattern does not expose a loading flag. `ReleaseNotesPage` and `AutoPopupManager` will show stale/empty data until the promise resolves. This matches the existing pattern for all other `appInfoStore` bootstrap calls.

---

## 7. Summary for Complexity Assessment

This task touches a single architectural layer: the Valtio store (`src/store/appInfo.ts`). The primary file change is confined to the `loadReleaseNotes()` method (currently lines 221-225, 5 lines). The implementation adds one `api.get('v1/deployment-versions')` call, builds a `Map<version, deployedAt>` from the response, and merges dates into the `releaseNotes` JSON array before assigning to `this.appReleases`. A secondary audit is required for `AutoPopupManager.tsx` to confirm the `await` chain is correct once `loadReleaseNotes` does real async work. The `ReleaseNotesPage` component requires no changes: `{release.date && formatDateTime(release.date, 'day')}` already handles both short (`YYYY-MM-DD`) and full ISO timestamp strings through Luxon.

The task follows a firmly established pattern in this codebase: every other async method in `appInfoStore` uses the same two-line `api.get` / `response.json()` pattern with a silent try/catch fallback. There is no novel architectural pattern to introduce. The response shape from the backend is confirmed: `{ deployments: [{ version: string, deployedAt: string }] }` with camelCase field names. The merge rule is straightforward: a `Map` lookup with a fallback to the JSON `date` field. Estimated file change surface is 1-2 files changed, 15-25 lines added.

Test coverage posture is the primary risk: `loadReleaseNotes()` is completely untested today, and the new logic (API call + merge) introduces three distinct paths (deployment date present, absent, and endpoint error) that all need new tests. The `ReleaseNotesPage.test.tsx` suite is comprehensive and will continue to pass unchanged (it mocks the store). New tests belong in `src/store/__tests__/appInfo.test.ts`, following the `mockGet` / `okResponse` pattern already established there for `fetchToolConfigs`. Overall complexity is low: one store method change, one audit, new store-level tests, and a confirmed backward-compatible date utility.
