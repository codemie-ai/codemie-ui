# Technical Research

**Task**: auth redirect marketplace assistant routing login
**Generated**: 2026-07-17T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Marketplace assistant shared link redirects unauthenticated users to the wrong assistant after login.

Bug description: When a Marketplace assistant link is shared with a user who is not logged in, the user is correctly redirected to the login page. However, after completing login, the user is redirected to a different assistant instead of the assistant from the originally shared link. If the user is already logged in before opening the shared link, the link works correctly and opens the expected Marketplace assistant.

Preconditions:
- A Marketplace assistant is available and can be opened via a direct shared link.
- The recipient user has access to the application.
- The recipient user is not logged in when opening the shared link.
- The same shared link works correctly when the user is already logged in.

Steps to Reproduce:
1. Copy or share a direct link to a specific Marketplace assistant.
2. Open the shared link in a browser/session where the user is not logged in.
3. Observe that the user is redirected to the login page.
4. Complete the login flow.
5. Observe which assistant page is opened after authentication.
6. Repeat the same flow while already logged in and open the same shared link.

Expected Result: After successful login, the user should be redirected to the exact Marketplace assistant from the originally shared link. The authentication flow should preserve the original target URL/route and restore it after login.

Actual Result: After login, the user is redirected to another assistant instead of the assistant from the shared link.

Acceptance Criteria:
- Unauthenticated users opening a shared Marketplace assistant link are redirected to login and then returned to the originally requested assistant.
- The original assistant ID/route from the shared link is preserved during the authentication flow.
- Authenticated users continue to open the correct assistant directly from the shared link.
- Users are not redirected to a different assistant after login.
- The fix is validated for both authenticated and unauthenticated user sessions.
- No regression is introduced for other Marketplace assistant navigation flows.

---

## 2. Codebase Findings

### Existing Implementations

- `src/utils/api.ts` — Central HTTP client. `handleSessionExpired()` (~line 371–382) is the trigger point for the bug: on a 401 response for the `v1/user` endpoint it calls `window.location.assign('/auth/sign-in')` — a hard browser navigation that discards the current URL entirely. For all other 401s it additionally sets `sessionStorage['sessionExpired'] = 'true'` (used only to show a toast, not to record the originating URL).
- `src/authentication/local/SignInPage.tsx` — Local auth sign-in form. `handleSignIn()` at line 45 calls `navigate('/')` unconditionally after a successful `authStore.login()`. There is no code to read a stored return URL. This is the second point where the original path is permanently lost.
- `src/store/auth.ts` — Valtio proxy store. `login()` POSTs to `/v1/local-auth/login`. Contains no URL-preservation logic.
- `src/store/user.ts` — Valtio proxy store. `loadUser()` calls `api.get('v1/user')`; wires `api.redirectHandler` to set `isSessionExpired = true` for the SSO/opaque-redirect path only. Does not persist the current URL before the redirect fires.
- `src/hooks/appLevel/useInitialDataFetch.tsx` — Calls `userStore.loadUser()` on app mount. Catches the resulting 401 and returns silently; the actual redirect is delegated to `api.handleSessionExpired`.
- `src/App.tsx` — Root layout. Renders `<Outlet />` only when `user` is truthy. No auth guard or redirect logic of its own.
- `src/router.tsx` — Defines all SPA routes using `createBrowserRouter`. Marketplace list at `assistants/marketplace` (id `assistants-marketplace`); individual assistants at `/assistants/:id` (id `assistant`) and `/assistants/:projectName/:slug` (id `assistant-by-slug`). Auth pages at `/auth/sign-in` and `/auth/sign-up` are declared outside the root `App` route object so they render without the main nav shell.
- `src/constants/routes.ts` — Route name constants: `ASSISTANTS_MARKETPLACE`, `ASSISTANT_DETAILS`, `ASSISTANT_BY_SLUG`.
- `src/pages/assistants/AssistantDetailsPage.tsx` — Renders any assistant (marketplace or project-scoped) by reading `id` or `slug`+`projectName` from route params. The target page for shared links.
- `src/pages/assistants/utils/getAssistantLink.tsx` — Builds share-link URLs. Uses human-readable `/assistants/{project}/{slug}` form by default; falls back to GUID `/assistants/{id}` when the assistant's `project` field is in `RESERVED_PROJECTS` (which includes `'marketplace'`).
- `src/main.tsx` — App entry point. Calls `redirectHashRoutes()` to convert legacy `#/path` hash URLs to browser-history paths before the router mounts. This shim fires before any auth check but does not persist the path before a potential 401 redirect.
- `src/utils/redirectHashRoutes.ts` — One-shot bootstrap shim; includes open-redirect sanitization added in a prior task (EPMCDME-12556). The sanitization logic here is relevant as a pattern for safe URL storage.
- `src/components/appLevel/SessionExpiredPopup.tsx` — SSO-only component; shown when `userStore.isSessionExpired` is true mid-session. Has a "Reload page" button that calls `window.location.reload()`, which preserves the current URL naturally. This component is not involved in the initial unauthenticated-load path.
- `src/store/__tests__/onboarding.restoreUrl.test.ts` — Tests the `onboardingStore` `entryUrl`/`restoreUrlOnComplete` pattern, which is the closest existing analogue to what the auth redirect fix needs to implement.

### Architecture and Layers Affected

- **HTTP Client / Integration layer** (`src/utils/api.ts`): The first place the originating URL is discarded. Needs to persist the current URL before calling `window.location.assign`.
- **Auth / Presentation layer** (`src/authentication/local/SignInPage.tsx`): The second place the URL is discarded. Needs to read the persisted URL and navigate to it instead of hardcoded `'/'`.
- **Router layer** (`src/router.tsx`): No change required; route definitions for `/assistants/:id` and `/assistants/:projectName/:slug` already exist and will handle restored navigation correctly.
- **User / Store layer** (`src/store/user.ts`, `src/hooks/appLevel/useInitialDataFetch.tsx`): No change required for the local auth path. The SSO path goes through a different flow (`api.redirectHandler` → `SessionExpiredPopup`) which works correctly because Keycloak embeds `redirect_uri` at the server level.

### Integration Points

- `api.makeRequest` → `handleSessionExpired` → `window.location.assign('/auth/sign-in')` (hard navigation, no state passed — this is the break point)
- `SignInPage.tsx` → `authStore.login()` → `navigate('/')` (no returnUrl consumed — second break point)
- `store/user.ts` → `api.redirectHandler` → `userStore.isSessionExpired = true` (SSO path only; works correctly)
- `main.tsx` → `redirectHashRoutes()` → router mount (legacy hash URL rewriting; fires before auth check)
- `getAssistantLink.tsx` → `RESERVED_PROJECTS` check → GUID or slug URL (affects the form of shared links but not the redirect bug itself)

### Patterns and Conventions

- Authentication is enforced at the API layer (401 handling in `api.ts`) and by `App.tsx` blocking the outlet, not via route-level `<PrivateRoute>` or `<RequireAuth>` components.
- Valtio `proxy` stores are used for all state (`authStore`, `userStore`, `onboardingStore`); `useSnapshot` for reactive reads in components.
- `sessionStorage` is already used for per-session ephemeral flags (`sessionExpired`). The same mechanism is the natural fit for a `postLoginRedirect` key.
- The `onboardingStore.entryUrl` / `restoreUrlOnComplete` pattern in `src/store/onboarding.ts` is a direct precedent: save a deep URL before an interstitial flow, restore it on completion.
- Open-redirect sanitization exists in `src/utils/redirectHashRoutes.ts` (added in EPMCDME-12556). Any URL saved for post-login restore must apply the same or equivalent sanitization before calling `navigate()`.
- `react-router`'s `useNavigate` / `navigate()` is used for SPA navigation; `window.location.assign` is used only for hard cross-page navigations (e.g., sign-in redirect). Post-login navigation should use `navigate()` to stay within the SPA.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `/Users/mykola_nehrych/WebstormProjects/codemie-ui/.ai-run/guides/architecture/routing-patterns.md` — documents the router setup, auth route placement, `goBackAssistants` pattern, and protected-route mechanism. **Stale on one point**: the guide states `createHashRouter` is used, but `src/router.tsx` uses `createBrowserRouter`. Directly relevant as context for the fix.
- `/Users/mykola_nehrych/WebstormProjects/codemie-ui/.ai-run/guides/architecture/architecture.md` — documents dual-mode auth architecture (local vs. Keycloak SSO), session-expiry handling (`api.redirectHandler` → `userStore.isSessionExpired`), and the Integration layer's role in redirect handling. Does not address URL preservation during auth redirect.
- All other guides in `.ai-run/guides/` — no auth/routing/marketplace content relevant to this task.

### Architectural Decisions

- **EPMCDME-12556** (`docs/superpowers/tasks/2026-06-02-epmcdme-12556-fix-open-redirect-hash-routes/technical-analysis.md`): Added open-redirect sanitization to `src/utils/redirectHashRoutes.ts`. Establishes the precedent that any URL manipulation in this codebase must guard against open-redirect attacks — directly applicable to the `postLoginRedirect` URL that will be stored and restored by this fix.
- No other recorded ADRs, `DECISION:`, or `HACK:` comments exist in the auth/routing domain.

### Derived Conventions

- URL preservation for interstitial flows is an established pattern (`onboardingStore.entryUrl`); the auth redirect fix should mirror it rather than invent a new mechanism.
- `sessionStorage` (not `localStorage`) is used for session-scoped flags; `postLoginRedirect` should follow the same storage choice.
- The sign-in page reads `sessionStorage['sessionExpired']` only to display a toast. A `sessionStorage['postLoginRedirect']` key would be read immediately after login and then removed — this is the same read-once-then-clear pattern.
- The routing guide must be updated after the fix to correct the `createHashRouter` vs. `createBrowserRouter` discrepancy and to document the new URL preservation convention.

---

## 4. Testing Landscape

### Existing Coverage

- `src/authentication/local/__tests__/SignInPage.integration.test.tsx` — tests sign-in form rendering and login success/failure. The success assertion explicitly checks that `navigate('/')` was called — this test will need to be updated to cover the returnUrl path.
- `src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx` — covers GUID and slug assistant detail pages, publish/unpublish to marketplace, back-navigation, pin/favorites. All scenarios run with a mocked authenticated user. No unauthenticated scenario.
- `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx` — covers marketplace tab rendering, filters, pagination, CRUD. All authenticated scenarios. No shared-link or unauthenticated path.
- `src/store/__tests__/onboarding.restoreUrl.test.ts` — tests `entryUrl` / `restoreUrlOnComplete` for post-onboarding URL restore. Closest analogue to the fix; only uses `/assistants/some-id` as fixture (not marketplace or slug paths).
- `src/utils/__tests__/redirectHashRoutes.test.ts` — tests legacy hash-URL rewriting. No auth interaction.
- `src/utils/__tests__/navigateBack.integration.test.ts` — tests `goBackAssistants` fallback for GUID and slug URLs. Not related to auth.
- `src/hooks/__tests__/useAuthCallbackListener.test.tsx` — tests MCP OAuth popup callback listener. Not related to this bug.

### Testing Framework and Patterns

- Vitest 1.6.1 with two projects: `unit` (mocked Valtio, fast) and `integration` (real Valtio, mocked fetch).
- React Testing Library 16.3.0 (`@testing-library/react`, `@testing-library/user-event` 14.6.1, `@testing-library/jest-dom` 6.6.3).
- jsdom 24.1.3 for unit; custom `vitest-env-integration.ts` for integration.
- `mockAPI(method, url, data, statusOrParams?)` from `src/test-utils/integration.tsx` — registers per-test `fetch` intercepts; global defaults for `v1/user`, `v1/config` in `setupTests.tsx`.
- `renderPage(path)` — creates a `createMemoryRouter` with real routes and renders `RouterProvider`.
- `useNavigate` replaced globally with a `navigate` vi.fn() spy in local-auth integration tests.
- `createAssistantFixture(overrides)` — inline factory for assistant API shapes.

### Coverage Gaps

1. **`api.handleSessionExpired` saving the current URL** — no test verifies what is (or is not) stored in `sessionStorage` before `window.location.assign('/auth/sign-in')` fires.
2. **`SignInPage` restoring a saved return URL after login** — the existing test asserts `navigate('/')` unconditionally; no test for the `postLoginRedirect` read-and-clear path.
3. **End-to-end unauthenticated shared-link flow** — no test at any level covers: visit `/assistants/{project}/{slug}` unauthenticated → redirect to sign-in → login → land on the originally requested assistant.
4. **`getAssistantLink` RESERVED_PROJECTS fallback for `'marketplace'` project** — the GUID fallback has no dedicated unit test.
5. **`App.tsx` outlet blocked for unauthenticated users** — no test verifies the app saves and restores the attempted route after authentication.

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_IDP_PROVIDER` — Controls auth mode (`keycloak` | `local`). Drives `getIsLocalAuth()`, which branches all auth flow logic including 401 handling, logout target, and credential mode. **The bug is specific to the `local` path**; the `keycloak` path is handled server-side by Keycloak's `redirect_uri`.
- `VITE_IS_EXTERNAL_LOGIN` — Declared in `EnvConfig` type and present in `config.js` defaults but **never read anywhere in application source**. It is absent from the Helm configmap template. If this was intended to control a redirect-after-login strategy, the implementation was never built.
- `VITE_IS_ENTERPRISE_EDITION` — Build-time flag; gates analytics and AI adoption config routes in `router.tsx`. Not related to this bug.
- `VITE_API_URL`, `VITE_ENV` — Standard base URL and environment label; not relevant to the fix.
- `BASE_URL` (Vite built-in) — Router basename passed to `createBrowserRouter`; relevant if the app is deployed at a sub-path (the saved return URL must be relative to this base).

### Configuration Files

- `config.js` — Runtime `window._env_` injection served with `Cache-Control: no-store`. Governs API URL, IDP provider, feature flags, MCP auth settings. No auth-redirect-specific config.
- `.env` — Build-time defaults; sets assistant slugs, workflow feature toggles, and empty Keycloak SSO keys for localhost.
- `nginx.conf` — SPA catch-all via `try_files $uri $uri/ /index.html`; no server-side auth redirect rules. All auth redirects are client-side.
- `deploy-templates/templates/configmap.yaml` — Helm ConfigMap; `VITE_IS_EXTERNAL_LOGIN` is absent from the structured keys and can only be injected via the untyped `extraConfig` map.

### Feature Flags and Deployment Concerns

- No feature flags govern the post-login redirect behavior — the fix will apply unconditionally to all local-auth deployments.
- Deployments where `VITE_IDP_PROVIDER = 'keycloak'` are unaffected by this fix (SSO works correctly already).
- The open-redirect sanitization pattern from EPMCDME-12556 must be applied to any URL read from `sessionStorage['postLoginRedirect']` before navigation, to prevent attackers from crafting a malicious `postLoginRedirect` value.
- Sub-path deployments (`BASE_URL` non-root): the saved URL should be stored as a relative path (`window.location.pathname + search + hash`) to avoid base-URL double-prefixing on restore.

---

## 6. Risk Indicators

- **No test coverage for the specific bug path**: `SignInPage.integration.test.tsx` actively asserts the broken behavior (`navigate('/')`). The existing test must be updated alongside the fix to avoid a regression back to the hardcoded root redirect.
- **Open-redirect exposure**: storing `window.location.pathname + search + hash` in `sessionStorage` and later calling `navigate(savedPath)` introduces an open-redirect vector if the stored value is ever an absolute URL or an attacker-controlled external URL. The sanitization logic in `src/utils/redirectHashRoutes.ts` (EPMCDME-12556) establishes the pattern; the same check must be applied here.
- **SSO path gap**: the bug report states the Keycloak path works correctly, which is confirmed — Keycloak manages `redirect_uri` server-side. However, `api.redirectHandler` → `SessionExpiredPopup` (the SSO session-expiry path) also does not preserve the current URL before reloading. This is a related but separate gap not covered by this ticket's acceptance criteria.
- **`routing-patterns.md` guide is stale**: the guide documents `createHashRouter` but the codebase uses `createBrowserRouter`. Any agent or developer reading the guide will get incorrect information about how routing works. The guide should be corrected as part of this task's documentation deliverable.
- **`VITE_IS_EXTERNAL_LOGIN` is a dead variable**: declared in `EnvConfig`, shipped in `config.js`, absent from Helm templates, and never consumed. If it was intended to control this redirect behavior, its absence is misleading. Its purpose should be either implemented or removed.
- **`handleSessionExpired` does not save URL for the `v1/user` 401 path**: uniquely for the user-load endpoint, the code calls `window.location.assign` directly without setting `sessionStorage['sessionExpired']`. This means the `sessionExpired` toast is never shown when the initial page load is blocked by auth. This is a minor UX inconsistency but not a blocker for the fix.
- **Legacy hash-URL shim fires before auth check** (`redirectHashRoutes` in `main.tsx`): if a shared link uses the legacy `#/assistants/...` form, the path is rewritten to browser-history format and then immediately lost when the 401 redirect fires. The fix must capture the URL after `redirectHashRoutes()` has run, which is already the case because `window.location.assign` is called from within the React app lifecycle (after `main.tsx` completes), not during the shim itself.
- **Thin test coverage for unauthenticated assistant page access in general**: neither `AssistantDetailsPage.integration.test.tsx` nor `AssistantsListPage.integration.test.tsx` has any unauthenticated scenario. This is a broader gap that increases the risk of regressions in this area.

---

## 7. Summary for Complexity Assessment

The bug is mechanically simple and is confined to two files at the boundary between the HTTP client layer and the presentation layer. The root cause has been precisely identified: `handleSessionExpired()` in `src/utils/api.ts` performs a hard browser navigation to `/auth/sign-in` via `window.location.assign()` without first saving the current URL, and `handleSignIn()` in `src/authentication/local/SignInPage.tsx` unconditionally calls `navigate('/')` after a successful login with no mechanism to read a stored return URL. The fix requires adding two small, symmetric pieces of logic: a write to `sessionStorage` in `api.ts` and a read-then-clear from `sessionStorage` in `SignInPage.tsx`. An existing analogue (`onboardingStore.entryUrl`) confirms the pattern is established in this codebase. No architectural changes are required; the router, store, or component tree does not need to be restructured.

The primary technical novelty introduced by the fix is the open-redirect sanitization step: any URL read from `sessionStorage` before a `navigate()` call must be validated as a same-origin relative path to prevent a stored-XSS or open-redirect attack. The precedent for this sanitization is already present in `src/utils/redirectHashRoutes.ts` (EPMCDME-12556), so the pattern is established and can be reused directly. The `BASE_URL` / sub-path concern is minor but must be handled: the URL should be stored as a relative path, not an absolute one.

Test coverage posture is the highest-risk area. The `SignInPage.integration.test.tsx` currently asserts the broken behavior (`navigate('/')`) and must be updated to cover the new returnUrl path — if the test is not updated, the fix will pass CI by accident rather than by proof. No end-to-end test exists for the exact unauthenticated shared-link flow. New test cases should cover: (a) `handleSessionExpired` writes `postLoginRedirect` to `sessionStorage`, (b) `SignInPage` reads and clears `postLoginRedirect` after login and navigates to it, and (c) `SignInPage` falls back to `'/'` when no `postLoginRedirect` is set. Total estimated change surface: 2 source files changed, 1 test file updated, 1 test file added, 1 guide file corrected — low complexity.
