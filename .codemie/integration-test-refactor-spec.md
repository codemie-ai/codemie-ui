# Integration Test Infrastructure Refactor — Spec

## Goal

Unified `mockAPI` + `renderPage(path)` interface. No manual fetch spy setup in tests.

---

## New Test Interface

```ts
// Before (current)
describe('SignInPage', () => {
  let fetchSpy: MockInstance<...>
  beforeEach(() => { fetchSpy = vi.spyOn(global, 'fetch') })
  afterEach(() => { fetchSpy.mockRestore() })

  it('navigates on login', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true } as Response)
    renderPage(<SignInPage />)
    ...
  })
})

// After (target)
describe('SignInPage', () => {
  it('navigates on login', async () => {
    mockAPI('POST', 'v1/local-auth/login', {})
    renderPage('/auth/sign-in')
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'))
  })
})
```

---

## `mockAPI` Interface

```ts
// POST/DELETE — no query params needed
mockAPI('POST', 'v1/local-auth/login', responseData)
mockAPI('DELETE', 'v1/assistants/123', null)

// GET without params — prefix match on path, matches any query params
mockAPI('GET', 'v1/assistants', responseData)
// matches: v1/assistants?page=0&scope=... ✅
// matches: v1/assistants?scope=created_by_user&page=1 ✅
// does NOT match: v1/assistants/user ❌ (sub-paths are excluded from prefix match)

// GET with params — matches only when query params match (order-insensitive)
mockAPI('GET', 'v1/assistants', responseData, { page: 0, scope: 'created_by_user' })
// matches:     v1/assistants?page=0&scope=created_by_user ✅
// not matches: v1/assistants?page=1&scope=created_by_user ❌

// Error response — pass HTTP status as 4th argument (number)
mockAPI('POST', 'v1/local-auth/login', { error: { message: 'Invalid credentials' } }, 401)
```

### Signature

```ts
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// Overloads
mockAPI(method: Method, url: string, data: unknown, status?: number): void
mockAPI(method: Method, url: string, data: unknown, params?: Record<string, unknown>): void
```

- 4th argument is an **object** → query params for exact matching (GET only)
- 4th argument is a **number** → HTTP status code (default: `200`)
- 4th argument **omitted** → prefix match on url (query params only, not sub-paths), status `200`

### Matching Logic in fetch mock

```
1. Normalize request URL → extract bare path (no query string) + query params separately
2. Iterate requestRegistry:
   a. Entry has params → path must equal regPath AND all params must match (order-insensitive)
   b. Entry has no params → path === regPath (sub-paths excluded because path strips query string)
3. Nothing found → check globalDefaults (path === defaultPath) → return null (status 200)
```

### Known Limitations

- **Factory functions not supported.** `mockAPI` only accepts static `data`. The previous
  `mockRequest(method, url, (body) => computed)` factory pattern is removed. For dynamic
  responses based on request body, use a separate `vi.spyOn(global, 'fetch')` in that specific test.
- **Post-navigation rendering not testable.** `useNavigate` is mocked globally to a spy — the spy
  records calls but does not update the router's history. Tests can assert
  `expect(navigate).toHaveBeenCalledWith('/path')` but cannot assert that the target page renders
  after navigation.

---

## Architecture

### How fetch is called in the codebase

1. `@/utils/api` wrapper (`api.get`, `api.post`, etc.)
   - Calls `fetch(${this.BASE_URL}/${url}, ...)` internally via `makeRequest`
   - `BASE_URL = window?._env_?.VITE_API_URL || import.meta.env.VITE_API_URL`
   - In test env (jsdom): `BASE_URL` is `undefined` → URL becomes `"undefined/v1/user"`

2. `authStore.login` / `authStore.register` — raw `fetch` calls:
   - `fetch(\`${api.BASE_URL}/v1/local-auth/login\`, ...)`
   - Same `BASE_URL` issue → `"undefined/v1/local-auth/login"`

### Unified mock strategy

Mock `global.fetch` once in `setupTests.tsx` via `vi.stubGlobal('fetch', fetchMock)`.
Both call sites (api wrapper + raw fetch in auth store) go through the same mock.

Unit tests are insulated via `vi.mock('@/utils/api')` in `setupTests.unit.ts` — the module mock
intercepts before fetch is reached, so unit tests are unaffected by the global fetch mock.

URL normalisation strips any prefix before `v1/` to handle all `BASE_URL` forms:
```ts
const normalizeUrl = (url: string): string => {
  let rawPath: string
  try {
    rawPath = new URL(url).pathname
  } catch {
    // Relative or malformed: "/api/v1/user", "/v1/user", "undefined/v1/user"
    const firstSlash = url.indexOf('/')
    rawPath = firstSlash !== -1 ? url.slice(firstSlash) : '/' + url
  }
  // Strip leading slashes, then strip any prefix before "v1/"
  const withoutLeading = rawPath.replace(/^\/+/, '')
  const v1Idx = withoutLeading.indexOf('v1/')
  return v1Idx !== -1 ? withoutLeading.slice(v1Idx) : withoutLeading
}

const parseQueryParams = (url: string): Record<string, string> => {
  try {
    return Object.fromEntries(new URL(url).searchParams)
  } catch {
    const qIdx = url.indexOf('?')
    if (qIdx === -1) return {}
    return Object.fromEntries(new URLSearchParams(url.slice(qIdx + 1)))
  }
}
```

---

## Files to Change

### 1. `src/router.tsx`

Extract route config into a named export so tests can reuse it with `createMemoryRouter`:

```ts
// Before
export const router = createHashRouter([...routesArray...])

// After
export const routes: RouteObject[] = [...routesArray...]
export const router = createHashRouter(routes)
export default router
```

### 2. `src/test-utils/_mock-state.ts`

Registry stores a Response factory + optional params for matching:

```ts
interface RegistryEntry {
  factory: (body?: unknown) => Response
  params?: Record<string, unknown>
}

export const requestRegistry = new Map<string, RegistryEntry>()
export const navigate = vi.fn()
```

Key format: `"METHOD:path"` e.g. `"GET:v1/assistants"`, `"POST:v1/local-auth/login"`

### 3. `src/setupTests.tsx`

Remove `vi.mock('@/utils/api', ...)` entirely — unit tests get their own api mock in `setupTests.unit.ts`.
Add global fetch mock that reads from `requestRegistry` with prefix + params matching:

```ts
const globalDefaults: Record<string, () => unknown> = {
  'v1/llm_models': () => [],
  'v1/embeddings_models': () => [],
  'v1/config': () => [],
  'v1/assistants/user': () => [],
  'v1/assistants/categories': () => [...],
  'v1/user': () => ({ applications: [] }),
  'v1/settings/user/available': () => [],
  'v1/conversations/folders/list': () => [],
}

const fetchMock = vi.fn().mockImplementation(
  async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl = String(input instanceof Request ? input.url : input)
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const path = normalizeUrl(rawUrl)
    const actualParams = parseQueryParams(rawUrl)

    let body: unknown
    try {
      const raw = init?.body ?? (input instanceof Request ? await input.text() : undefined)
      body = typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch { body = undefined }

    for (const [key, entry] of requestRegistry) {
      const colonIdx = key.indexOf(':')
      const regMethod = key.slice(0, colonIdx)
      const regPath = key.slice(colonIdx + 1)
      if (regMethod !== method) continue
      if (entry.params) {
        // Exact path + all specified params must match (order-insensitive)
        const paramsMatch =
          path === regPath &&
          Object.entries(entry.params).every(([k, v]) => String(actualParams[k]) === String(v))
        if (paramsMatch) return entry.factory(body)
      } else {
        // Prefix match — query params only, NOT sub-paths (regPath + '/' excluded)
        if (path === regPath || path.startsWith(regPath + '?')) {
          return entry.factory(body)
        }
      }
    }

    for (const [defaultPath, defaultFactory] of Object.entries(globalDefaults)) {
      if (path === defaultPath || path.startsWith(defaultPath + '?')) {
        return new Response(JSON.stringify(defaultFactory()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify(null), { status: 200 })
  }
)

vi.stubGlobal('fetch', fetchMock)

afterEach(() => {
  requestRegistry.clear()
  navigateMock.mockClear()
  fetchMock.mockClear()
  cleanup()
})
```

Keep all other mocks: `SettingsLayout`, `useVueRouter`, `toaster`, `react-router` (navigate spy).

### 4. `src/setupTests.unit.ts`

Add `vi.mock('@/utils/api')` so unit tests are insulated from the global fetch mock:

```ts
// Existing mocks (valtio, storage) stay unchanged.
// Add:
vi.mock('@/utils/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/utils/api')>()
  return {
    default: {
      get: vi.fn().mockResolvedValue({ status: 200, json: () => Promise.resolve(null) }),
      post: vi.fn().mockResolvedValue({ status: 200, json: () => Promise.resolve(null) }),
      put: vi.fn().mockResolvedValue({ status: 200, json: () => Promise.resolve(null) }),
      delete: vi.fn().mockResolvedValue({ status: 200, json: () => Promise.resolve(null) }),
      patch: vi.fn().mockResolvedValue({ status: 200, json: () => Promise.resolve(null) }),
      handleError: mod.default.handleError,
    },
  }
})
```

### 5. `src/test-utils/integration.tsx`

Replace `renderPage(<Component />, opts)` with `renderPage(path: string)`.
Replace `mockRequest` → `mockAPI` with new overloaded signature.

```ts
import { render, type RenderResult } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/router'
import { requestRegistry } from './_mock-state'

export { navigate } from './_mock-state'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export function mockAPI(method: Method, url: string, data: unknown, status?: number): void
export function mockAPI(method: Method, url: string, data: unknown, params?: Record<string, unknown>): void
export function mockAPI(
  method: Method,
  url: string,
  data: unknown,
  paramsOrStatus: Record<string, unknown> | number = 200
): void {
  const status = typeof paramsOrStatus === 'number' ? paramsOrStatus : 200
  const params = typeof paramsOrStatus === 'object' ? paramsOrStatus : undefined

  const factory = () =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })

  requestRegistry.set(`${method}:${url}`, { factory, params })
}

export const renderPage = (path: string): RenderResult => {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(<RouterProvider router={router} />)
}
```

### 6. `src/authentication/local/__tests__/SignInPage.integration.test.tsx`

Remove: `fetchSpy`, `MockInstance` import, `beforeEach`/`afterEach` with spy setup.
Use: `mockAPI` + `renderPage('/auth/sign-in')`.

```ts
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { navigate, renderPage, mockAPI } from '@/test-utils/integration'
import toaster from '@/utils/toaster'

describe('SignInPage — Integration', () => {
  it('renders all form elements', () => {
    renderPage('/auth/sign-in')
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in to your account' })).toBeInTheDocument()
  })

  it('navigates to / on successful login', async () => {
    mockAPI('POST', 'v1/local-auth/login', {})
    // fillAndSubmit()
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'))
  })

  it('shows error toast on failed login', async () => {
    mockAPI('POST', 'v1/local-auth/login', { error: { message: 'Invalid credentials' } }, 401)
    // fillAndSubmit(wrongPassword)
    await waitFor(() => expect(toaster.error).toHaveBeenCalledWith('Invalid credentials'))
  })
})
```

### 7. `src/authentication/local/__tests__/SignUpPage.integration.test.tsx`

Same approach — remove spy boilerplate, use `mockAPI` + `renderPage('/auth/sign-up')`.

---

## What Does NOT Change

- `vitest.workspace.ts` — stays as-is
- `vite.config.ts` — stays as-is
- `package.json` scripts — stays as-is
- `vi.mock('react-router', ...)` in setupTests.tsx — stays (navigate spy)
- `vi.mock('@/utils/toaster', ...)` — stays
- `vi.mock(SettingsLayout)` — stays
- `vi.mock('@/hooks/useVueRouter')` — stays
- Existing valtio + storage mocks in `setupTests.unit.ts` — stay as-is

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| `BASE_URL = undefined` → `"undefined/v1/user"` | catch branch: `rawPath = /v1/user` → `v1/user` |
| `BASE_URL = ""` → `"/v1/user"` | catch branch: `rawPath = /v1/user` → `v1/user` |
| `BASE_URL = "/api"` → `"/api/v1/user"` | catch branch: `rawPath = /api/v1/user` → strips to `v1/user` |
| `BASE_URL = "http://test-api"` → `"http://test-api/v1/user"` | `new URL(...).pathname` = `"/v1/user"` → `v1/user` |
| `BASE_URL = "http://host/api"` → `"http://host/api/v1/user"` | `new URL(...).pathname` = `"/api/v1/user"` → strips to `v1/user` |
| GET without params → prefix match (query only) | `v1/assistants` matches `v1/assistants?page=0&scope=...` but NOT `v1/assistants/user` |
| GET with params → exact path + params match | query param order does not matter |
| Error response | `mockAPI('POST', 'url', errorBody, 401)` → `response.ok = false` |
| Auth pages (sign-in, sign-up) | Top-level routes — App not rendered (intentional, auth has no Navigation) |
| App-level pages (assistants, etc.) | App renders → `useInitialDataFetch` fires → covered by globalDefaults |
| Two mocks for the same url | Last `mockAPI` call wins (Map overwrites) |
| Unit tests calling api methods | `vi.mock('@/utils/api')` in setupTests.unit.ts intercepts before fetch is reached |
