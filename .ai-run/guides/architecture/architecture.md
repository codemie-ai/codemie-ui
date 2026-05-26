# Architecture — codemie-ui

## Overview

CodeMie UI is a React 18.3.1 / TypeScript 5.8.3 / Vite 5.4.21 SPA with hash-based routing,
module federation (micro-frontend host), and dual-mode authentication (local email/password
or Keycloak SSO). All state is managed through Valtio proxy stores. All HTTP goes through a
single custom fetch-based API client. Styling is Tailwind CSS exclusively.

```
┌────────────────────────────────────────────────────────┐
│  Browser (hash-based SPA — #/route/path)               │
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
| **Hooks** | Reusable React logic; no direct API calls | `src/hooks/` |
| **Utils** | Pure functions, data transforms, URL builders | `src/utils/` |
| **Types** | Shared TypeScript interfaces and enums | `src/types/` |
| **Constants** | Named values; no magic strings/numbers | `src/constants/` |
| **Config** | Feature flags, onboarding flows, theming | `src/config/` |
| **Authentication** | Local auth pages + Keycloak theme entry point | `src/authentication/` |

### What each layer must NOT do

| Layer | Forbidden |
|---|---|
| Page / Component | Call `api.*` directly; own business logic |
| Store | Render JSX; call `useNavigate`; import React components |
| Integration | Manage state; transform domain objects |
| Hook | Call `api.*` directly; import Valtio stores from outside |
| Utils | Mutate global state; trigger side effects |

---

## Data Flow (Component → Store → API)

The canonical pattern is strictly three steps. Components observe the store snapshot; they
never touch the API client directly.

Step 1 — Page subscribes and triggers:
  `src/pages/assistants/AssistantsListPage.tsx:18` (`useSnapshot` import)

Step 2 — Store owns the API call and state mutation:
  `src/store/assistants.ts:156` (proxy definition), `:177` (`indexAssistants` method calling `api.get`)

Step 3 — Response is parsed with `.json()`, never `.data`:
  `src/store/assistants.ts:193` (`.then((response) => response.json())`)

Loading and error states are always properties on the store, set synchronously before and
after the async call. `toaster.error()` is called from the store on failure.

Session expiry handling lives in `src/store/user.ts:33-35`: `api.redirectHandler` sets
`userStore.isSessionExpired = true`, which `SessionExpiredPopup` observes.

---

## Authentication Architecture

Two independent auth paths share zero code:

| Path | Entry | Use case |
|---|---|---|
| Local auth | `src/authentication/local/SignInPage`, `SignUpPage` | Dev/standalone deployments |
| Keycloak SSO | `src/keycloakify.tsx` (separate Vite entry) | Production; EPAM SSO via Azure Entra ID |

For Keycloak builds, set `VITE_ENTRY=keycloakify`; the `keycloak-entry` plugin in
`vite.config.ts:18` swaps the HTML entry to `index-keycloak.html` which renders only
the `KcPage` component — no router, no app shell.

In production the app receives a Keycloak JWT session cookie automatically; the API client
reads it via `getIsLocalAuth()` to toggle `credentials: 'include'` (`src/utils/api.ts:128`).

User state after login: `userStore.user.isAuthenticated` and `userStore.user.isAdmin`
(`src/types/entity/user.ts:27-29`), populated in `src/store/user.ts:128-130`.

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
| Valtio proxy store | `proxy<StoreType>(…)` — auto-reactive global state | `src/store/assistants.ts:156` |
| `useSnapshot` read binding | Creates a frozen read-only snapshot inside components | `src/App.tsx:41` |
| Typed store interface | All stores have a named `interface *StoreType` before `proxy` | `src/store/assistants.ts:55` |
| Custom `API` class | `get/post/patch/put/delete/stream/postMultipart` methods | `src/utils/api.ts:85-117` |
| `navigateBack` utility | History-first back with path-matching fallback | `src/utils/helpers.ts:266` |
| Feature `goBack*` wrappers | Per-feature `navigateBack` call with allowed route IDs | `src/pages/assistants/utils/goBackAssistants.ts:25` |
| Route ID constants | Exported string constants consumed by both router and `navigateBack` | `src/constants/routes.ts` |
| `useHistoryStack` | Valtio proxy tracking navigation history stack | `src/hooks/appLevel/useHistoryStack.tsx:36` |
| `isEnterpriseEdition()` gate | Feature-flag to include/exclude route arrays at app start | `src/router.tsx:567-568` |
| `useFeatureFlag(name)` hook | Runtime feature flag from API; non-React context uses `src/utils/featureFlags` | `src/hooks/useFeatureFlags.ts:61` |
| Component-scoped files | Sub-components, utils, and tests collocated inside feature folder | `src/pages/workflows/editor/` |
| Workflow editor extraction | Complex canvas logic extracted to `utils/` to keep components slim | `src/pages/workflows/editor/utils/` |
| `ErrorBoundary` on root route | `ErrorPage` as `ErrorBoundary` prop on the root route object | `src/router.tsx:557` |

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
| Call `api.*` inside store methods only | Call `api.*` in components, hooks, or utils |
| Parse responses with `.json()` | Access `.data` (Axios pattern) — no Axios in this project |
| Use Tailwind classes for all styling | Write custom CSS or inline styles |
| Use `Popup` component for all dialogs | Import `Dialog` from PrimeReact directly |
| Read global state via `useSnapshot(store)` | Directly read or subscribe to the mutable proxy in JSX |
| Keep components under 300 lines; extract sub-components | Build monolithic page components |
| Use `??` for defaults | Use `\|\|` which coerces empty strings and zero |
| Use single quotes for strings | Use double quotes (ESLint enforces single quotes) |
| Store route IDs as constants in `src/constants/routes.ts` | Hardcode path strings at call sites |
| Use feature-scoped `goBack*` utilities on create/edit pages | Call `navigate(-1)` directly — breaks on refresh |
| Put business rules in store methods | Put domain logic in components or utils |
| Set `loading` and `error` fields on the store | Manage loading state in component `useState` |
