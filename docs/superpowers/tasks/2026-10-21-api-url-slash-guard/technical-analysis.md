# Technical Research

**Task**: api url makeRequest
**Generated**: 2026-10-21
**Research path**: codegraph

---

## 1. Original Context

there is a problem with the api url generation as described in Jira EPMCDME-16242 (Bug: "Schedulers: duplicated slash in schedulers api URL causes 404 in local development"; requests /v1/schedulers/filter-options and /v1/scheduler-runs hit `/api//v1/...`). Acceptance criteria: 1) filter-options request uses a correctly formed URL with no duplicated slash; 2) filter options load successfully in local development; 3) production behavior unchanged. Instead of trying to fix incorrectly defined schedules URLs I want to fix the root cause of the issue - `makeRequest()` function in api.ts. This function constructs url from base url and url parameter without any guard. Instead of blind concatenation there should be added a logic that will check function param content for slashes and add one more slash only when needed to avoid duplication. Also we need to define several tests with and without leading slashes in input params.

---

## 2. Codebase Findings

### Existing Implementations
- `src/utils/api.ts` - singleton `API` class (`export default new API()`). `BASE_URL` set in constructor: `window?._env_?.VITE_API_URL || import.meta.env.VITE_API_URL`.
- `makeRequest(url, method, body?, options)` (line 310) builds `let fullUrl = \`${this.BASE_URL}/${url}\`` (line 319), then appends `?querystring` from `options.params`, then `fetch(fullUrl, ...)`. `get/post/patch/put/delete` all delegate to it.
- The same blind concatenation `\`${this.BASE_URL}/${url}\`` is repeated in three other methods: `fetchMultipart` (line 181; used by `postMultipart`/`putMultipart`), `stream` (line 229), `downloadFileStream` (line 268). These are outside the stated scope (makeRequest) but share the defect.
- `handleSessionExpired(url)` (line 402) compares the raw `url` to `'v1/user'`; it receives the original, un-normalised url from `makeRequest` (line 381).
- Offending callers with leading slash (the bug source):
  - `src/store/schedulers.ts`: `api.get('/v1/schedulers', ...)` (130), `api.get('/v1/schedulers/filter-options')` (149), `api.patch(\`/v1/schedulers/${id}\`)` (162). Contrast `api.delete(\`v1/settings/user/${id}\`)` (175) which has no slash.
  - `src/store/schedulerRuns.ts`: `api.get('/v1/scheduler-runs', ...)` (141), `/v1/scheduler-runs/${runId}` (159), delete (164).
  - Convention elsewhere (guide examples, `fetchMultipart`/`downloadFileStream` tests): no leading slash, e.g. `'assistants'`, `'v1/files/123'`.

### Architecture and Layers Affected
- Single HTTP layer: `src/utils/api.ts` (utils layer). Consumed by Valtio stores in `src/store/*` (schedulers, schedulerRuns and many more; blast radius reported as 5 in-file callers and tests via ~40 caller tests).

### Integration Points
- Stores call `api.*`; `window._env_` (runtime `config.js`) and `import.meta.env.VITE_API_URL` supply base. `getIsLocalAuth`/`getMode` from `@/utils/utils` used for credentials/headers (unrelated to URL).

### Patterns and Conventions
- Tests and callers in the repo mostly pass urls without a leading slash; `BASE_URL` carries no trailing slash in the local env (`'/api'`). Whether production `BASE_URL` can have a trailing slash is not visible in the repo (runtime `config.js` comes from the image).

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/development/api-integration.md` - shows `api.get('assistants')` style (no leading slash); custom fetch wrapper, calls live in stores.
- `.ai-run/guides/testing/testing-patterns.md`, `quality-gates.md` - test/gate conventions (not read in full).

### Architectural Decisions
- None recorded about URL joining.

### Derived Conventions
- Relative path without leading slash is the de facto convention.

---

## 4. Testing Landscape

### Existing Coverage
- `src/utils/__tests__/api.test.ts` covers `handleError`, `formatErrorMessage`, `parseContentDispositionFilename`, `sanitizeFileName`, `downloadFileStream`. It has NO `makeRequest` tests and no URL-construction assertions.
- `src/utils/__tests__/api.postLoginRedirect.integration.test.ts` exercises the api layer for redirect behaviour.
- `src/store/schedulers`: `src/pages/schedulers/__tests__/SchedulerFilters.test.tsx` only; store-level URL assertions not found.

### Testing Framework and Patterns
- Vitest + React Testing Library (projects `unit`, `integration`). `api.test.ts` mocks fetch via `global.fetch = vi.fn().mockResolvedValue({...})` and uses `vi.clearAllMocks()` in `beforeEach`; `toaster` is auto-mocked (via `src/setupTests.tsx`, currently modified in the working tree). Pattern for new tests: assign `global.fetch`, call `api.get(...)`, assert `fetch` first arg.

### Coverage Gaps
- No tests for `makeRequest` URL building, with or without leading slash, or with `params`.
- `BASE_URL` value under test is not set in `api.test.ts`; the singleton reads it at construction, so a test either asserts relative to `api.BASE_URL` or overrides `api.BASE_URL` on the instance.

---

## 5. Configuration and Environment

### Environment Variables
- `VITE_API_URL` (build time) and `window._env_.VITE_API_URL` (runtime, typed in `src/types/global.ts` `EnvConfig`). `.env` and `.env.local` both set `VITE_API_URL='/api'`, `VITE_ENV='local'`.

### Configuration Files
- `.env`, `.env.local`; `vite.config.ts` (`test.projects`, not read).

### Feature Flags and Deployment Concerns
- Runtime `config.js` served from the image overrides the build value; production base URL value not visible here.

---

## 6. Risk Indicators

- `makeRequest` is the central path for nearly all API calls; any change affects the whole app (large blast radius, ~40 caller tests).
- Production behaviour must remain unchanged (AC3): inputs without a leading slash must yield exactly the previous `${BASE_URL}/${url}`.
- Three sibling methods (`fetchMultipart`, `stream`, `downloadFileStream`) share the same concatenation; the ticket scopes only `makeRequest`, so they stay defective unless handled. Speculative: a shared private helper would be one way to cover them.
- `handleSessionExpired(url)` compares to `'v1/user'`; a `/v1/user` caller would not match that check (pre-existing, only matters if normalisation is not applied to that argument).
- Edge cases for tests: empty url, base with trailing slash, multiple leading slashes, absolute `http(s)://` url (current code would also prefix them), params combined with leading slash.
- `src/setupTests.tsx` and `.codemie/codemie-cli.config.json` are modified in the working tree, unrelated to this task.

---

## 7. Summary for Complexity Assessment

The change is confined to one layer, the utils HTTP client `src/utils/api.ts`, with one test file (`src/utils/__tests__/api.test.ts`) to extend. The defect is a single line (line 319) of blind template concatenation in `makeRequest`; the scheduler stores (`src/store/schedulers.ts`, `src/store/schedulerRuns.ts`) pass leading-slash paths, which the requester intends to leave untouched. Three sibling methods repeat the same concatenation but are outside the stated scope.

Technical novelty is low (string joining, no new dependencies, no config change). Test posture: the api module has a test file and a working fetch-mock pattern, but zero existing coverage of URL construction, so new tests are needed from scratch. The principal risk is the very large blast radius of `makeRequest` combined with the AC that production behaviour must not change; inputs without a leading slash must produce identical URLs.

---

## 8. External References

None named by the task (the Jira ticket EPMCDME-16242 is cited by key only; no path or URL to read).
