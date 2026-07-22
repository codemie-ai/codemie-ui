# EPMCDME-13457: Fix Shared-Link Redirect After Login — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the original URL when an unauthenticated user opens a shared Marketplace assistant link, so they land on the correct assistant after logging in.

**Architecture:** A new `postLoginRedirect.ts` utility writes the current URL to `sessionStorage` (with `BASE_URL` prefix stripped) before the hard `window.location.assign` redirect to `/auth/sign-in`. After a successful login, `SignInPage.tsx` reads, validates, and clears that key, then navigates to the saved path instead of the hardcoded `/`.

**Tech Stack:** React 18, React Router v7.9.5 (`createBrowserRouter` with `basename`), Valtio, Vitest 1.6.1, React Testing Library 16, jsdom.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/utils/postLoginRedirect.ts` | Create | `savePostLoginRedirect()` — write router-space path to sessionStorage; `consumePostLoginRedirect()` — read, validate, clear |
| `src/utils/__tests__/postLoginRedirect.test.ts` | Create | 7 unit tests for the new utility (BASE_URL stripping, sanitization, read-once-then-clear) |
| `src/utils/__tests__/api.postLoginRedirect.test.ts` | Create | 2 unit tests: sessionStorage written before assign; not written when already on sign-in page |
| `src/utils/api.ts` | Modify | +1 import, +1 call to `savePostLoginRedirect()` in `handleSessionExpired` |
| `src/authentication/local/SignInPage.tsx` | Modify | +1 import, replace `navigate('/')` with `navigate(consumePostLoginRedirect() ?? '/')` |
| `src/authentication/local/__tests__/SignInPage.integration.test.tsx` | Modify | Add `beforeEach` sessionStorage clear; rename existing success test; add 3 new cases |
| `.ai-run/guides/architecture/routing-patterns.md` | Modify | Correct stale `createHashRouter` reference; add `postLoginRedirect` convention note |

---

## Task 1: Create `postLoginRedirect.ts` utility

**Test-first: yes — failing tests assert `sessionStorage['postLoginRedirect']` is written/read before the implementation exists.**

**Files:**
- Create: `src/utils/__tests__/postLoginRedirect.test.ts`
- Create: `src/utils/postLoginRedirect.ts`

---

- [ ] **Step 1: Write the failing unit tests**

Create `src/utils/__tests__/postLoginRedirect.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  consumePostLoginRedirect,
  savePostLoginRedirect,
} from '@/utils/postLoginRedirect'

describe('postLoginRedirect', () => {
  // jsdom's window.location is non-configurable — use delete+reassign (same pattern as
  // src/components/appLevel/__tests__/SessionExpiredPopup.test.tsx:52-54)
  const originalLocation = window.location

  function stubLocation(pathname: string, search = '', hash = '') {
    delete (window as any).location
    // @ts-expect-error: location override for testing
    window.location = { ...originalLocation, pathname, search, hash }
  }

  afterEach(() => {
    sessionStorage.clear()
    // @ts-expect-error: location override for testing
    window.location = originalLocation
    ;(import.meta.env as Record<string, string>).BASE_URL = '/'
  })

  // ─── savePostLoginRedirect ────────────────────────────────────────────────

  describe('savePostLoginRedirect', () => {
    it('stores pathname+search+hash as-is on a root deployment (BASE_URL="/")', () => {
      ;(import.meta.env as Record<string, string>).BASE_URL = '/'
      stubLocation('/assistants/marketplace/foo', '?ref=share', '#top')

      savePostLoginRedirect()

      expect(sessionStorage.getItem('postLoginRedirect')).toBe(
        '/assistants/marketplace/foo?ref=share#top'
      )
    })

    it('strips the BASE_URL prefix on a sub-path deployment (BASE_URL="/codemie/")', () => {
      ;(import.meta.env as Record<string, string>).BASE_URL = '/codemie/'
      stubLocation('/codemie/assistants/marketplace/foo', '?ref=share', '')

      savePostLoginRedirect()

      expect(sessionStorage.getItem('postLoginRedirect')).toBe(
        '/assistants/marketplace/foo?ref=share'
      )
    })

    it('does NOT write to sessionStorage when the path is "/"', () => {
      stubLocation('/', '', '')

      savePostLoginRedirect()

      expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
    })
  })

  // ─── consumePostLoginRedirect ─────────────────────────────────────────────

  describe('consumePostLoginRedirect', () => {
    it('returns the stored value and removes the key', () => {
      sessionStorage.setItem('postLoginRedirect', '/assistants/marketplace/foo')

      const result = consumePostLoginRedirect()

      expect(result).toBe('/assistants/marketplace/foo')
      expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
    })

    it('returns null when no key is set', () => {
      expect(consumePostLoginRedirect()).toBeNull()
    })

    it('rejects a protocol-relative URL ("//evil.com/path") and returns null', () => {
      sessionStorage.setItem('postLoginRedirect', '//evil.com/path')

      expect(consumePostLoginRedirect()).toBeNull()
    })

    it('rejects a backslash-relative URL ("/\\\\evil") and returns null', () => {
      sessionStorage.setItem('postLoginRedirect', '/\\evil')

      expect(consumePostLoginRedirect()).toBeNull()
    })
  })
})
```

- [ ] **Step 2: Run the tests to confirm RED**

```bash
npm run test:unit -- postLoginRedirect
```

Expected: 7 failures — `Cannot find module '@/utils/postLoginRedirect'`

- [ ] **Step 3: Implement `src/utils/postLoginRedirect.ts`**

Create `src/utils/postLoginRedirect.ts`:

```ts
const KEY = 'postLoginRedirect'

export function savePostLoginRedirect(): void {
  // Strip the Vite BASE_URL prefix so the stored path is in React Router space.
  // BASE_URL is always '/' (root) or '/suffix/' (Vite guarantees trailing slash).
  // navigate() re-adds the basename internally; storing the raw pathname would
  // double-prefix the path on sub-path (VITE_SUFFIX) deployments.
  const base = import.meta.env.BASE_URL.slice(0, -1) // '' or '/codemie'
  const raw = window.location.pathname + window.location.search + window.location.hash
  const routerPath = base && raw.startsWith(base) ? raw.slice(base.length) : raw
  if (routerPath && routerPath !== '/') {
    sessionStorage.setItem(KEY, routerPath)
  }
}

export function consumePostLoginRedirect(): string | null {
  const saved = sessionStorage.getItem(KEY)
  sessionStorage.removeItem(KEY)
  if (!saved) return null
  // Reject protocol-relative and backslash-relative paths (CWE-601 open-redirect defence).
  if (!saved.startsWith('/') || saved.startsWith('//') || saved.startsWith('/\\')) return null
  return saved
}
```

- [ ] **Step 4: Run the tests to confirm GREEN**

```bash
npm run test:unit -- postLoginRedirect
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/postLoginRedirect.ts src/utils/__tests__/postLoginRedirect.test.ts
git commit -m "EPMCDME-13457: add postLoginRedirect utility (save/consume with BASE_URL strip)"
```

---

## Task 2: Wire `savePostLoginRedirect()` into `api.ts`

**Test-first: yes — a new unit test verifies `sessionStorage['postLoginRedirect']` is written when a 401 fires on a non-auth path, before the implementation change is made.**

**Files:**
- Create: `src/utils/__tests__/api.postLoginRedirect.test.ts`
- Modify: `src/utils/api.ts`

---

- [ ] **Step 1: Write the failing unit test**

Create `src/utils/__tests__/api.postLoginRedirect.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted mocks — must appear before any imports that pull in api.ts
vi.mock('@/utils/utils', () => ({
  getIsLocalAuth: () => true,
  getMode: () => 'production',
}))
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn() } }))

import api from '@/utils/api'

describe('api.handleSessionExpired — postLoginRedirect integration', () => {
  // jsdom's window.location is non-configurable — use delete+reassign (same pattern as
  // src/components/appLevel/__tests__/SessionExpiredPopup.test.tsx:52-54)
  const originalLocation = window.location
  const mockAssign = vi.fn()

  function stubLocation(pathname: string, search = '', hash = '') {
    delete (window as any).location
    // @ts-expect-error: location override for testing
    window.location = { ...originalLocation, pathname, search, hash, assign: mockAssign }
  }

  beforeEach(() => {
    sessionStorage.clear()
    mockAssign.mockReset()
    stubLocation('/assistants/marketplace/foo', '?ref=share')
    // Mock fetch to return a plain 401 (not MCP / broker auth) so handleSessionExpired fires
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        type: 'basic',
        ok: false,
        status: 401,
        clone: () => ({ json: () => Promise.resolve({}) }),
        headers: { get: () => null },
      })
    )
  })

  afterEach(() => {
    // @ts-expect-error: location override for testing
    window.location = originalLocation
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('writes postLoginRedirect to sessionStorage before redirecting on 401', async () => {
    await api.get('v1/some-resource').catch(() => {})

    expect(sessionStorage.getItem('postLoginRedirect')).toBe(
      '/assistants/marketplace/foo?ref=share'
    )
    expect(mockAssign).toHaveBeenCalledWith('/auth/sign-in')
  })

  it('does NOT write postLoginRedirect when already on the sign-in page', async () => {
    stubLocation('/auth/sign-in')

    await api.get('v1/some-resource').catch(() => {})

    expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to confirm RED**

```bash
npm run test:unit -- api.postLoginRedirect
```

Expected: 2 failures — `sessionStorage.getItem('postLoginRedirect')` returns null (the call isn't made yet).

- [ ] **Step 3: Add the import and call to `api.ts`**

At the top of `src/utils/api.ts`, add the import after the existing local imports (around line 22):

```ts
import { savePostLoginRedirect } from '@/utils/postLoginRedirect'
```

In `handleSessionExpired` (currently lines 371–382), add one call before `window.location.assign`:

```ts
  private handleSessionExpired(url: string): void {
    const isUserEndpoint = url === 'v1/user'
    const isAuthPage = window.location.pathname === '/auth/sign-in'

    if (!isUserEndpoint) {
      sessionStorage.setItem('sessionExpired', 'true')
    }

    if (!isAuthPage) {
      savePostLoginRedirect()
      window.location.assign('/auth/sign-in')
    }
  }
```

- [ ] **Step 4: Run the test to confirm GREEN**

```bash
npm run test:unit -- api.postLoginRedirect
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/api.ts src/utils/__tests__/api.postLoginRedirect.test.ts
git commit -m "EPMCDME-13457: save postLoginRedirect URL before sign-in redirect in api.ts"
```

---

## Task 3: Wire `consumePostLoginRedirect()` into `SignInPage.tsx`

**Test-first: yes — update `SignInPage.integration.test.tsx` to assert the new post-login navigation behaviour before touching `SignInPage.tsx`.**

**Files:**
- Modify: `src/authentication/local/__tests__/SignInPage.integration.test.tsx`
- Modify: `src/authentication/local/SignInPage.tsx`

---

- [ ] **Step 1: Update the integration tests**

Replace the entire content of `src/authentication/local/__tests__/SignInPage.integration.test.tsx` with:

```ts
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { navigate, renderPage, mockAPI } from '@/test-utils/integration'
import toaster from '@/utils/toaster'

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'password123'
const TEST_WRONG_PASSWORD = 'wrongpassword'

describe('SignInPage — Integration', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  const fillAndSubmit = async (password = TEST_PASSWORD) => {
    const user = userEvent.setup()
    renderPage('/auth/sign-in')

    await user.type(screen.getByLabelText('Email address'), TEST_EMAIL)
    await user.type(screen.getByLabelText('Password'), password)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sign in to your account' })).not.toBeDisabled()
    )

    await user.click(screen.getByRole('button', { name: 'Sign in to your account' }))
  }

  it('renders sign in form with all required elements', () => {
    renderPage('/auth/sign-in')

    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in to your account' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument()
    expect(screen.getByText('Welcome to CodeMie')).toBeInTheDocument()
  })

  it('navigates to / when no postLoginRedirect is set', async () => {
    mockAPI('POST', 'v1/local-auth/login', {})

    await fillAndSubmit()

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/')
    })
  })

  it('navigates to the stored postLoginRedirect URL after login', async () => {
    sessionStorage.setItem('postLoginRedirect', '/assistants/marketplace/my-assistant')
    mockAPI('POST', 'v1/local-auth/login', {})

    await fillAndSubmit()

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/assistants/marketplace/my-assistant')
    })
  })

  it('clears postLoginRedirect from sessionStorage after successful login', async () => {
    sessionStorage.setItem('postLoginRedirect', '/assistants/marketplace/my-assistant')
    mockAPI('POST', 'v1/local-auth/login', {})

    await fillAndSubmit()

    await waitFor(() => {
      expect(navigate).toHaveBeenCalled()
    })
    expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
  })

  it('ignores invalid postLoginRedirect and falls back to / (protocol-relative attack vector)', async () => {
    sessionStorage.setItem('postLoginRedirect', '//evil.com/steal')
    mockAPI('POST', 'v1/local-auth/login', {})

    await fillAndSubmit()

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/')
    })
  })

  it('shows error toast when login fails', async () => {
    mockAPI('POST', 'v1/local-auth/login', { error: { message: 'Invalid credentials' } }, 401)

    await fillAndSubmit(TEST_WRONG_PASSWORD)

    await waitFor(() => {
      expect(toaster.error).toHaveBeenCalledWith('Invalid credentials')
    })
  })
})
```

- [ ] **Step 2: Run the tests to confirm RED**

```bash
npm run test:integration -- SignInPage
```

Expected: 3 new tests fail — `navigate` is still called with `'/'` regardless of the sessionStorage key; the `//evil.com` test passes by accident but for the wrong reason.

- [ ] **Step 3: Update `SignInPage.tsx`**

In `src/authentication/local/SignInPage.tsx`, add the import after the existing imports:

```ts
import { consumePostLoginRedirect } from '@/utils/postLoginRedirect'
```

Replace the `handleSignIn` function body (currently lines 42–59):

```ts
  const handleSignIn = async (data: SignInFormData, setError: UseFormSetError<SignInFormData>) => {
    try {
      await authStore.login(data)
      const returnUrl = consumePostLoginRedirect()
      navigate(returnUrl ?? '/')
    } catch (e) {
      if (e instanceof ValidationError) {
        const items = e.fieldErrors
          .map(({ msg }) => `<li class="mt-1.5">${msg.charAt(0).toUpperCase() + msg.slice(1)}</li>`)
          .join('')
        toaster.error(`Validation error<br><ul>${items}</ul>`)
        e.fieldErrors.forEach(({ field, msg }) => {
          setError(field as keyof SignInFormData, { message: msg })
        })
      } else if (e instanceof Error) {
        toaster.error(e.message)
      }
    }
  }
```

- [ ] **Step 4: Run the tests to confirm GREEN**

```bash
npm run test:integration -- SignInPage
```

Expected: all 6 tests pass.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/authentication/local/SignInPage.tsx src/authentication/local/__tests__/SignInPage.integration.test.tsx
git commit -m "EPMCDME-13457: restore postLoginRedirect URL after sign-in"
```

---

## Task 4: Fix `routing-patterns.md` guide

**Test-first: no — documentation change only.**

**Files:**
- Modify: `.ai-run/guides/architecture/routing-patterns.md`

---

- [ ] **Step 1: Correct the stale router-type references**

In `.ai-run/guides/architecture/routing-patterns.md`, replace the stale strategy line and the stale code block references. The current guide says:

```
Strategy: **hash-based** (`createHashRouter`) — all paths live inside `#/`
```

and

```
src/router.tsx:16    import { createHashRouter, redirect, RouteObject } from 'react-router'
...
src/router.tsx:591   export const router = createHashRouter(routes)
```

Replace the overview section with:

```markdown
- Router: **React Router v7.9.5** (`react-router` package — import from `'react-router'`, not `'react-router-dom'`)
- Strategy: **browser history** (`createBrowserRouter`) — paths use the HTML5 History API; no `#/` prefix
- Basename: `import.meta.env.BASE_URL` (set by `VITE_SUFFIX` in sub-path deployments); `navigate()` paths must be basename-relative — React Router prepends the basename internally
- Route tree defined in a single file: `src/router.tsx`
- Entry point: `src/main.tsx:40` renders `<RouterProvider router={router} />`
- Route IDs are string constants in `src/constants/routes.ts`; reference by ID, not raw string
```

Replace the stale code block in the file layout section:

```
src/router.tsx:16    import { createBrowserRouter, redirect, RouteObject } from 'react-router'
src/router.tsx:95    const chatRoutes: RouteObject[] = […]
...
src/router.tsx:693   export const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })
```

- [ ] **Step 2: Add the `postLoginRedirect` URL-restore convention**

Append a new section at the end of `.ai-run/guides/architecture/routing-patterns.md`:

```markdown
---

## Post-Login URL Restore

When an unauthenticated user lands on a deep link, the API layer redirects them to `/auth/sign-in`
via `window.location.assign` — a hard navigation that loses the originating URL. Restore it by:

1. **Before the hard navigation** (`api.ts handleSessionExpired`): call `savePostLoginRedirect()`
   from `src/utils/postLoginRedirect.ts`. It writes `pathname + search + hash` to
   `sessionStorage['postLoginRedirect']`, with the `BASE_URL` basename prefix stripped so the
   value is always in React Router path space.

2. **After a successful login** (`SignInPage.tsx handleSignIn`): call `consumePostLoginRedirect()`
   which reads, validates (same-origin relative path only — CWE-601 guard), clears the key, and
   returns the path. Pass the result to `navigate()`, falling back to `'/'` when absent.

Pattern established by EPMCDME-13457. Prior analogue: `onboardingStore.entryUrl` /
`restoreUrlOnComplete` in `src/store/onboarding.ts`.

| DO | DON'T |
|---|---|
| Store basename-relative paths (`savePostLoginRedirect` handles stripping) | Store `window.location.href` (absolute) or pass it raw to `navigate()` |
| Validate with `consumePostLoginRedirect` before navigating | Read `sessionStorage['postLoginRedirect']` directly and call `navigate()` without sanitization |
| Clear the key immediately after reading | Leave the key set — it's a one-shot flag |
```

- [ ] **Step 3: Commit**

```bash
git add .ai-run/guides/architecture/routing-patterns.md
git commit -m "EPMCDME-13457: correct createHashRouter stale docs; add postLoginRedirect convention"
```
