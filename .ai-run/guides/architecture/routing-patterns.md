# Routing Patterns — codemie-ui

## Overview

- Router: **React Router v7.9.5** (`react-router` package — import from `'react-router'`, not `'react-router-dom'`)
- Strategy: **hash-based** (`createHashRouter`) — all paths live inside `#/`
- Route tree defined in a single file: `src/router.tsx`
- Entry point: `src/main.tsx:40` renders `<RouterProvider router={router} />`
- Route IDs are string constants in `src/constants/routes.ts`; reference by ID, not raw string

---

## Route Structure

### File layout

`src/router.tsx` declares one `RouteObject[]` array per domain feature, then spreads them
all into a single root route object (`src/router.tsx:552-591`).

```
src/router.tsx:16    import { createHashRouter, redirect, RouteObject } from 'react-router'
src/router.tsx:95    const chatRoutes: RouteObject[] = […]
src/router.tsx:118   const assistantRoutes: RouteObject[] = […]
src/router.tsx:186   const skillRoutes: RouteObject[] = […]
src/router.tsx:219   const integrationRoutes: RouteObject[] = […]
src/router.tsx:247   const dataSourceRoutes: RouteObject[] = […]
src/router.tsx:270   const katasRoutes: RouteObject[] = […]
src/router.tsx:308   const workflowRoutes: RouteObject[] = […]
src/router.tsx:366   const applicationRoutes: RouteObject[] = […]
src/router.tsx:384   const aiAdoptionConfigRoutes: RouteObject[] = […]
src/router.tsx:392   const settingsRoutes: RouteObject[] = […]
src/router.tsx:462   const awsSettingsRoutes: RouteObject[] = […]
src/router.tsx:517   const analyticsRoutes: RouteObject[] = […]
src/router.tsx:535   const otherRoutes: RouteObject[] = […]
src/router.tsx:552   export const routes: RouteObject[] = [{ path: '/', Component: App, … }]
src/router.tsx:591   export const router = createHashRouter(routes)
```

### Root route

```
id: 'root', path: '/', Component: App, ErrorBoundary: ErrorPage
  children: chatRoutes, assistantRoutes, skillRoutes, …
```

`App` renders `<Outlet />` which is replaced by the matched child route component.

### Auth routes (outside root, no nav shell)

```
src/router.tsx:574   { id: 'login-success', path: '/login-success', Component: LoginSuccessPage }
src/router.tsx:580   { id: 'sign-in', path: '/auth/sign-in', Component: SignInPage }
src/router.tsx:585   { id: 'sign-up', path: '/auth/sign-up', Component: SignUpPage }
```

These are siblings of the root route — they render without the main navigation layout.

### Loader-based redirect

`workflowRoutes` uses a loader to redirect `/workflows` to the default sub-route:
```
src/router.tsx:312  loader: () => redirect('/workflows/my')
```
This is the standard pattern for default sub-routes across the app.

---

## Navigation

### Declarative (Link component)

Import from `'react-router'`. Used for in-template links.

```
import { Link } from 'react-router'
<Link to='/assistants'>All Assistants</Link>
<Link to={`/assistants/${id}`}>View</Link>
```

### Programmatic (useNavigate)

```
import { useNavigate } from 'react-router'
// src/pages/settings/administration/MCPManagementPage.tsx:17-66
const navigate = useNavigate()
navigate('/assistants')           // push
navigate(-1)                      // go back — avoid on create/edit pages (see goBack section)
navigate('/path', { state: { from: 'source' } })   // with state
```

### Navigation with state

Pass state on navigate; read it with `useLocation`:
```
navigate('/assistants/new', { state: { from: 'marketplace' } })

import { useLocation } from 'react-router'
const location = useLocation()
const from = location.state?.from
```

### Navigating after a store action

Store methods return the new entity ID. The component navigates after awaiting the call.
Pattern: `src/pages/katas/NewKataPage.tsx:56` (useNavigate) + store returns id.

---

## Route Parameters

### URL params — useParams

```
import { useParams } from 'react-router'
// src/pages/katas/EditKataPage.tsx:44
const { kataId } = useParams<{ kataId: string }>()

// src/pages/skills/EditSkillPage.tsx:30
const { id } = useParams<{ id: string }>()

// src/pages/applications/ApplicationFederationPage.tsx:37
const { slug } = useParams<{ slug: string }>()
```

Always destructure with a typed generic. Guard against `undefined` before using the param in
store calls or `useEffect` dependencies.

### Query params — two variants

**Variant A — `react-router` native** (simple cases, no hash quirk):
```
import { useSearchParams } from 'react-router'
// src/pages/chat/hooks/useChatInitialPrompt.tsx:17
const [searchParams, setSearchParams] = useSearchParams()
const value = searchParams.get('tab') ?? 'all'
```

**Variant B — project custom hook** (hash-routing aware, persists to `sessionStorage`):
```
import { useSearchParams } from '@/hooks/useSearchParams'
// src/hooks/useSearchParams.ts:25
const [searchParams, setSearchParams, clearParams] = useSearchParams()
```

Use Variant B on list/filter pages where query params must survive page refresh.
Use Variant A for one-shot params that do not need persistence (e.g. chat initial prompt).

---

## "Go Back" Navigation (Create / Edit Pages)

`navigate(-1)` breaks when the user opens a create/edit page via a direct link or page refresh
because there is no browser history entry to go back to. Use feature-scoped `goBack*` utilities
instead.

### Pattern A — path-matching (multiple valid previous destinations)

```
// src/pages/assistants/utils/goBackAssistants.ts:25
export const goBackAssistants = (defaultPath = ASSISTANTS_DEFAULT) =>
  navigateBack(defaultPath, ASSISTANTS_DEFAULT, ASSISTANTS_PROJECT, …)
```

`navigateBack` (defined at `src/utils/helpers.ts:266`) checks `history.stack` for the last
matching route ID; if none, climbs the current URL path segment by segment.

### Pattern B — history stack (single destination)

```
// src/pages/skills/utils/goBackSkills.ts:24
export const goBackSkills = (router, defaultRoute = SKILLS_ALL) => {
  const prevRoute = history.stack[history.currentIndex - 1]
  if (prevRoute) { router.back(); return }
  router.push({ name: defaultRoute })
}
```

`history` is a Valtio proxy updated by `useHistoryStack` in `App.tsx`
(`src/hooks/appLevel/useHistoryStack.tsx:36`).

| Use | When |
|---|---|
| `goBackAssistants()` on `NewAssistantPage` | Multiple valid parent routes (project / marketplace / templates) |
| `goBackSkills(router)` on `NewSkillPage` | Single destination; legacy router object passed in |
| Direct `navigate(-1)` | Only inside pages where history is guaranteed (e.g. detail → edit flow inside one session) |

---

## Protected Routes

The project does not use a generic `ProtectedRoute` wrapper component. Protection is handled
by two complementary mechanisms:

**1. Enterprise edition gate** — entire route arrays are conditionally included at startup:
```
src/router.tsx:567  ...(isEnterpriseEdition() ? analyticsRoutes : [])
src/router.tsx:568  ...(isEnterpriseEdition() ? aiAdoptionConfigRoutes : [])
```

**2. Component-level role check** — admin-only UI is hidden inside the component using the
store snapshot:
```
src/pages/settings/AdministrationPage.tsx:25-30
const { user } = useSnapshot(userStore)
{user?.isAdmin ? <AdminToolsCard /> : null}
```

There is no `loader`-based redirect guard in the production codebase (the source guide shows it
as an illustrative pattern only). Actual protection is in-component or at build-time via
`isEnterpriseEdition()`.

---

## Code Splitting / Lazy Loading

The router does **not** use `React.lazy` or `import(…)` for route components. All page
components are statically imported at the top of `src/router.tsx` (lines 18-91). Bundle
splitting is handled by Vite/Rollup at build time, not by runtime lazy loading in the router.

---

## Route ID Constants

Route IDs serve double duty: they identify routes in the router config and are the strings
passed to `navigateBack` / `router.push({ name })`. Always use the constants, never inline strings.

```
src/constants/routes.ts:16-52
CHATS, ASSISTANTS_DEFAULT, ASSISTANT_DETAILS, NEW_WORKFLOW, VIEW_WORKFLOW,
EDIT_WORKFLOW, ANALYTICS, SKILLS_ALL, NEW_SKILL, SKILL_DETAILS …
```

URL builder utilities keep path construction off call sites:
```
src/pages/assistants/utils/getAssistantLink.tsx:18
  getAssistantLink(id) → `${getRootPath()}/#/assistants/${encodeURIComponent(id)}`
```

---

## Anti-Patterns (DO/DON'T)

| DO | DON'T |
|---|---|
| Import from `'react-router'` | Import from `'react-router-dom'` (separate package in v6; merged in v7) |
| Use `<Link>` for in-app navigation | Use `<a href='#/path'>` — bypasses router state |
| Use route ID constants from `src/constants/routes.ts` | Hardcode path strings at call sites |
| Use feature `goBack*` utilities on create/edit pages | Call `navigate(-1)` on pages reachable via direct link |
| Use `useParams<{ id: string }>()` with typed generic | Read `params.id` without typing |
| Guard `useEffect` with param check (`if (id)`) before fetching | Call store method with `undefined` |
| Use `useSearchParams` from `@/hooks/useSearchParams` for filter pages | Store filter state only in local component state |
| Use loader `redirect()` for default sub-routes | Add a catch-all `index` component that just calls `navigate` |
| Keep route arrays feature-scoped in `src/router.tsx` | Scatter route definitions across page files |
| Spread auth routes outside the root route object | Nest sign-in/sign-up under `App` (they must render without the nav shell) |
