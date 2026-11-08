# Architecture — codemie-ui

## Overview

CodeMie UI is a React / TypeScript / Vite SPA (versions in `package.json`) routed by `createBrowserRouter` under `import.meta.env.BASE_URL` (`src/router.tsx::router`), with
module federation (micro-frontend host), and dual-mode authentication (local email/password
or Keycloak SSO). All state is managed through Valtio proxy stores. All HTTP goes through a
single custom fetch-based API client. Styling is Tailwind CSS exclusively.

```
┌────────────────────────────────────────────────────────┐
│  Browser (history-routed SPA under BASE_URL)           │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Presentation layer                              │  │
│  │  src/pages/  ·  src/components/                 │  │
│  │  React Router v7  ·  PrimeReact  ·  Tailwind    │  │
│  └───────────────────┬──────────────────────────────┘  │
│                      │  store method call              │
│                      │  useSnapshot(store) read        │
│  ┌───────────────────▼──────────────────────────────┐  │
│  │  State layer  (Valtio proxies)                   │  │
│  │  src/store/*.ts                                  │  │
│  │  business logic · API orchestration · loading   │  │
│  └───────────────────┬──────────────────────────────┘  │
│                      │  api.get / api.post / …         │
│  ┌───────────────────▼──────────────────────────────┐  │
│  │  Integration layer                               │  │
│  │  src/utils/api.ts  (class API, single instance)  │  │
│  │  fetch() · auth headers · error normalisation    │  │
│  └───────────────────┬──────────────────────────────┘  │
│                      │ HTTP                            │
└──────────────────────┼─────────────────────────────────┘
                       ▼
              Backend REST API  (VITE_API_URL)
```

---

## Layer Responsibilities

| Layer | Responsibility | Key paths |
|---|---|---|
| **Pages** | Route-level components, compose feature UI | `src/pages/<feature>/` |
| **Components** | Reusable UI primitives and shared UI | `src/components/` |
| **Store** | Global state, API calls, business logic, error/loading | `src/store/*.ts` |
| **Integration** | HTTP, auth headers, redirect handling, error parsing | `src/utils/api.ts` |
| **Hooks** | Reusable React logic; no direct API calls (one exception, below) | `src/hooks/` |
| **Utils** | Pure functions, data transforms, URL builders | `src/utils/` |
| **Types** | Shared TypeScript interfaces and enums | `src/types/` |
| **Constants** | Named values; no magic strings/numbers | `src/constants/` |
| **Config** | Onboarding flow definitions and release notes | `src/configs/onboarding/index.ts::navigationIntroductionFlow` |
| **Authentication** | Local auth pages + Keycloak theme entry point | `src/authentication/` |

### What each layer must NOT do

| Layer | Forbidden |
|---|---|
| Page / Component | Call `api.*` directly; own business logic |
| Store | Render JSX; call `useNavigate`; import React components |
| Integration | Manage state; transform domain objects |
| Hook | Call `api.*` directly (one allowed exception, below); import Valtio stores from outside |
| Utils | Mutate global state; trigger side effects (one deliberate exception, below) |

**Utils exception — sign-in window helpers.** `src/utils/openSignInWindow.ts` and
`src/utils/watchSignInWindow.ts` are deliberate side-effecting helpers: they open a browser window,
poll the backend and send a diagnostics beacon (`src/utils/mcpAuthDiagnostics.ts`, the beacon they
share with the auth callback listener hook). They sit in `src/utils/` so the hooks and the chat store
use one copy of the window logic. They must still not import hooks, stores or components. New side
effects do not belong in Utils on this precedent.

**Hook exception — MCP auth prompt.** `src/hooks/useMCPAuthPrompt.ts::useMCPAuthPrompt` calls `api.post` on the row's
`initiate_url` to start an MCP sign-in. It is the one hook allowed to call `api.*`; a new hook calls a store method.

---

## Data Flow (Component → Store → API)

The canonical pattern is strictly three steps. Components observe the store snapshot; they
never touch the API client directly.

Step 1 — Page subscribes and triggers:
  `src/pages/assistants/AssistantsListPage.tsx::useSnapshot` (`useSnapshot` import)

Step 2 — Store owns the API call and state mutation:
  `src/store/assistants.ts::assistantsStore` (proxy definition), `src/store/assistants.ts::indexAssistants` (calls `api.get`)

Step 3 — Response is parsed with `.json()`, never `.data`:
  `src/store/assistants.ts::indexAssistants` (`.then((response) => response.json())`)

Error toasts come from the API layer: `makeRequest` calls `handleError` on a non-ok response unless the caller passes
`skipErrorHandling` (`src/utils/api.ts::handleError`); `indexAssistants` itself sets no `loading` or `error` field.

Session expiry: an opaque-redirect response calls `api.redirectHandler`, which `src/store/user.ts::redirectHandler` sets to
flip `userStore.isSessionExpired` (rendered by `src/App.tsx::SessionExpiredPopup`); a 401 under local auth goes to
`handleSessionExpired` instead, which saves the post-login redirect and navigates to `/auth/sign-in` (`src/utils/api.ts::handleSessionExpired`).

---

## Authentication Architecture

The two auth paths have separate entries; both render the shared `@/components` primitives (`Button`, `Input`):

| Path | Entry | Use case |
|---|---|---|
| Local auth | `src/authentication/local/SignInPage.tsx::SignInPage`, `src/authentication/local/SignUpPage.tsx::SignUpPage` | IdP provider `local` (`getIsLocalAuth()`) |
| Keycloak SSO | `src/authentication/keycloak-theme/keycloakify.tsx` (separate Vite entry) | Production; EPAM SSO via Azure Entra ID |

For Keycloak builds, set `VITE_ENTRY=keycloakify`; the `keycloak-entry` plugin in
`vite.config.ts:18` swaps the HTML entry to `index-keycloak.html` which renders only
the `KcPage` component — no router, no app shell.

The API client sends `credentials: 'include'` only when `getIsLocalAuth()` is true, i.e. the IdP provider is `local`
(`src/utils/utils.ts::getIsLocalAuth`); in local dev mode without local auth it sends a `user-id` header instead (`src/utils/api.ts::authHeaders`).

User state after login: `userStore.user.isAuthenticated` and `userStore.user.isAdmin`
(`src/types/entity/user.ts::isAuthenticated`), held on `src/store/user.ts::userStore`.

---

## Module Federation

Config: `vite.config.ts:37-43`.

- Host name: `codemie-ui-host`.
- Declared remote: `angular-upgrade-app` (value populated at runtime from `/applications` API).
- Remote apps are loaded in `src/pages/applications/ApplicationFederationPage.tsx` (route `applications/:slug`).
- Iframe fallback: `src/pages/applications/ApplicationIframePage.tsx` (route `applications/iframe/:slug`).
- React, react-dom, and react-router are in the shared list to prevent version conflicts.

To register a new remote: add an entry to the `remotes` object in `vite.config.ts`, then
create a page under `src/pages/applications/` that dynamically imports from it.

---

## Design Patterns

| Pattern | Description | Key reference |
|---|---|---|
| Valtio proxy store | `proxy<StoreType>(…)` — auto-reactive global state | `src/store/assistants.ts::assistantsStore` |
| `useSnapshot` read binding | Creates a frozen read-only snapshot inside components | `src/App.tsx::useSnapshot` |
| Typed store interface | Stores pass an interface to `proxy<T>(…)`; names vary (`AssistantsStoreType`, `ApplicationsStore`) and `costCentersStore` is a plain object | `src/store/assistants.ts::AssistantsStoreType` |
| Custom `API` class | `get/post/patch/put/delete` through `makeRequest`, plus `stream`, `postMultipart`, `putMultipart`, `downloadFileStream` | `src/utils/api.ts::makeRequest` |
| `navigateBack` utility | History-first back with path-matching fallback | `src/utils/helpers.ts::navigateBack` |
| Feature `goBack*` wrappers | Per-feature `navigateBack` call with allowed route IDs | `src/pages/assistants/utils/goBackAssistants.ts::goBackAssistants` |
| Route ID constants | Exported string constants consumed by both router and `navigateBack` | `src/constants/routes.ts::ASSISTANT_DETAILS` |
| `useHistoryStack` | Updates the `history` Valtio proxy that tracks the navigation stack | `src/hooks/appLevel/useHistoryStack.tsx::useHistoryStack` |
| `isEnterpriseEdition()` gate | Reads the `ENTERPRISE_EDITION` feature flag at call time; not referenced by `src/router.tsx` | `src/utils/enterpriseEdition.ts::isEnterpriseEdition` |
| `useFeatureFlag(name)` hook | Reads `settings.enabled` of the matching `appInfoStore.configs` entry; returns `[isEnabled, isConfigFetched]` | `src/hooks/useFeatureFlags.ts::useFeatureFlag` |
| Component-scoped files | Sub-components, utils, and tests collocated inside feature folder | `src/pages/workflows/editor/` |
| Workflow editor extraction | Complex canvas logic extracted to `utils/` to keep components slim | `src/pages/workflows/editor/utils/` |
| `ErrorBoundary` on root route | `ErrorPage` as `ErrorBoundary` prop on the root route object | `src/router.tsx::ErrorBoundary` |

---

## Feature Folder Convention

Each domain feature follows this layout. Deviations require justification.

```
src/pages/<feature>/
  <Feature>ListPage.tsx          route component — list view
  <Feature>DetailsPage.tsx       route component — detail view
  New<Feature>Page.tsx           route component — create form
  Edit<Feature>Page.tsx          route component — edit form
  components/                    feature-private components
    <Feature>Form/
    <Feature>List/
  utils/
    goBack<Feature>.ts           wraps navigateBack with allowed route IDs
    get<Feature>Link.ts          URL builder for this feature
  __tests__/                     co-located tests
```

Route array for the feature lives in `src/router.tsx` as `const <feature>Routes: RouteObject[]`
and is spread into the root children array (`src/router.tsx:552-571`).

---

## Extension Points (How to Add a New Feature)

1. **Types** — `src/types/entity/<feature>.ts` — define request/response interfaces.
2. **Constants** — add route IDs to `src/constants/routes.ts`; other magic values to `src/constants/<feature>.ts`.
3. **Store** — `src/store/<feature>.ts` — export `proxy<FeatureStoreType>(…)`. Add to `src/store/index.ts`.
4. **Pages** — follow the feature folder convention above.
5. **Routes** — add `const <feature>Routes: RouteObject[]` in `src/router.tsx`; spread into root children.
6. **Navigation** — add entry to `src/components/Navigation/Navigation.tsx`.
7. **Enterprise gate** — wrap route spread with `isEnterpriseEdition()` if needed (see `src/router.tsx:567`).
8. **Tests** — co-locate in `__tests__/` inside the feature folder.

---

## Cross-Cutting Concerns

| Concern | Where it lives | Notes |
|---|---|---|
| Error display | `toaster.error()` in store catch blocks | `src/utils/toaster.ts` |
| Session expiry | `api.redirectHandler` → `userStore.isSessionExpired` | `src/store/user.ts:33-35` |
| Unsaved changes | `UnsavedChangesProvider` + `useUnsavedChangesWarning` hook | `src/App.tsx:57` |
| Initial data fetch | `useInitialDataFetch` hook mounted in `App.tsx` | `src/hooks/appLevel/useInitialDataFetch.tsx` |
| Theme toggling | `usePrismThemeToggle` and `themeService` | `src/utils/themeService.ts` |

---

## Boundaries (DO/DON'T)

| DO | DON'T |
|---|---|
| Call `api.*` inside store methods only; the one hook exception is `src/hooks/useMCPAuthPrompt.ts::useMCPAuthPrompt` | Call `api.*` in components, hooks, or utils |
| Parse responses with `.json()` | Access `.data` (Axios pattern) — no Axios in this project |
| Use Tailwind classes for new component styles; the existing stylesheets in Mandatory Rules 1 of `.ai-run/guides/styling/styling-guide.md` are the exception | Add a new `.css`/`.scss` file or inline styles |
| Use `Popup` component for all dialogs | Import `Dialog` from PrimeReact directly |
| Read global state via `useSnapshot(store)` | Directly read or subscribe to the mutable proxy in JSX |
| Keep components under 300 lines; extract sub-components | Build monolithic page components |
| Use `??` for defaults | Use `\|\|` which coerces empty strings and zero |
| Use single quotes for strings | Use double quotes (ESLint enforces single quotes) |
| Store route IDs as constants in `src/constants/routes.ts` | Hardcode path strings at call sites |
| Use feature-scoped `goBack*` utilities on create/edit pages | Call `navigate(-1)` directly — breaks on refresh |
| Put business rules in store methods | Put domain logic in components or utils |
| Set `loading` and `error` fields on the store | Manage loading state in component `useState` |
