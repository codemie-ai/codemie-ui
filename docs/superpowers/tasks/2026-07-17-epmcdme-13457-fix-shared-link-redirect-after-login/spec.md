# Spec — EPMCDME-13457: Fix Shared-Link Redirect After Login

## Problem

Unauthenticated users opening a shared Marketplace assistant link (e.g.
`/assistants/marketplace/my-assistant` or `/assistants/{guid}`) are redirected to
`/auth/sign-in` correctly, but after completing login they land on `/` (or the wrong
assistant) instead of the originally requested page.

Authenticated users opening the same link are unaffected. The SSO / Keycloak path is
unaffected — Keycloak manages `redirect_uri` server-side and already works correctly.

---

## Root Cause

Two sequential losses of the originating URL:

1. **`src/utils/api.ts` `handleSessionExpired()`** — on a 401 response, calls
   `window.location.assign('/auth/sign-in')` (hard browser navigation) without first
   persisting the current URL.

2. **`src/authentication/local/SignInPage.tsx` `handleSignIn()`** — after a successful
   login unconditionally calls `navigate('/')` with no logic to restore a saved URL.

---

## Constraints

- Use `sessionStorage` (not `localStorage`) — existing convention for per-session flags
  (`sessionExpired`).
- Store as a **router-space relative path**: the Vite `BASE_URL` prefix must be stripped
  before storage so that `navigate()` receives a path React Router can handle without
  doubling the sub-path prefix on sub-path deployments (`VITE_SUFFIX`).
- Apply open-redirect sanitization on consume: only accept values that start with `/` and
  are not protocol-relative (`//`) or backslash-relative (`/\`). Pattern established in
  EPMCDME-12556 (`src/utils/redirectHashRoutes.ts`).
- SSO / Keycloak path: no changes.
- `VITE_IS_EXTERNAL_LOGIN` is a dead variable — do not use.

---

## Approach

A dedicated `src/utils/postLoginRedirect.ts` utility module with two exported functions —
`savePostLoginRedirect()` and `consumePostLoginRedirect()`. All security-sensitive logic
(basename stripping, sanitization) lives in one testable file. Call sites are trivial
one-liners. This matches the existing `sessionExpired` read-once-then-clear convention
and the `onboardingStore.entryUrl` / `restoreUrlOnComplete` deep-URL-restore pattern.

---

## Data Flow

```
[User opens /assistants/marketplace/foo — unauthenticated]
  → app mounts → v1/user → 401
  → api.ts handleSessionExpired('v1/user')
      savePostLoginRedirect()          // stores '/assistants/marketplace/foo' (router-space)
      window.location.assign('/auth/sign-in')

[User submits credentials]
  → SignInPage.tsx handleSignIn()
      await authStore.login(data)      // succeeds
      consumePostLoginRedirect()       // reads '/assistants/marketplace/foo', clears key
      navigate('/assistants/marketplace/foo')

[No postLoginRedirect set — normal login flow]
  → consumePostLoginRedirect() returns null → navigate('/')   (unchanged behaviour)

[Already logged in — opens shared link directly]
  → v1/user succeeds → no redirect → no key written → unaffected
```

---

## New File — `src/utils/postLoginRedirect.ts`

```ts
const KEY = 'postLoginRedirect'

export function savePostLoginRedirect(): void {
  // Strip the Vite BASE_URL prefix so the stored path is in React Router space.
  // import.meta.env.BASE_URL is always '/' (root) or '/suffix/' (trailing slash guaranteed by Vite).
  // navigate() re-adds the basename internally, so storing the raw pathname would
  // double-prefix the path on sub-path deployments (VITE_SUFFIX).
  const base = import.meta.env.BASE_URL.slice(0, -1)  // '' or '/codemie'
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
  // Reject protocol-relative and backslash-relative URLs (CWE-601 open-redirect defence).
  if (!saved.startsWith('/') || saved.startsWith('//') || saved.startsWith('/\\')) return null
  return saved
}
```

### BASE_URL stripping — concrete traces

| Deployment | `BASE_URL` | `window.location.pathname` | stored |
|---|---|---|---|
| Root | `/` | `/assistants/marketplace/foo` | `/assistants/marketplace/foo` |
| Sub-path (`VITE_SUFFIX=/codemie`) | `/codemie/` | `/codemie/assistants/marketplace/foo` | `/assistants/marketplace/foo` |

In both cases `navigate(stored)` resolves correctly because React Router prepends `BASE_URL` internally.

---

## Change 1 — `src/utils/api.ts`

Add one call in `handleSessionExpired` before `window.location.assign`:

```ts
if (!isAuthPage) {
  savePostLoginRedirect()           // ← new
  window.location.assign('/auth/sign-in')
}
```

Import `savePostLoginRedirect` from `@/utils/postLoginRedirect`.

No other change to `api.ts`. The existing `getIsLocalAuth()` guard at the call site
(line 338) already ensures `handleSessionExpired` only fires on the local-auth path.

---

## Change 2 — `src/authentication/local/SignInPage.tsx`

Replace the hardcoded `navigate('/')` in `handleSignIn`:

```ts
await authStore.login(data)
const returnUrl = consumePostLoginRedirect()   // ← new
navigate(returnUrl ?? '/')                     // ← was: navigate('/')
```

Import `consumePostLoginRedirect` from `@/utils/postLoginRedirect`.

---

## Testing

### New: `src/utils/__tests__/postLoginRedirect.test.ts` (unit, Vitest)

| # | Case | Assertion |
|---|---|---|
| 1 | `savePostLoginRedirect` — root deployment | stores `pathname + search + hash` as-is |
| 2 | `savePostLoginRedirect` — sub-path (`BASE_URL = '/codemie/'`) | strips `/codemie` prefix before storing |
| 3 | `savePostLoginRedirect` — path is `/` | does NOT write to sessionStorage |
| 4 | `consumePostLoginRedirect` — key present, valid | returns value and removes the key |
| 5 | `consumePostLoginRedirect` — key absent | returns null |
| 6 | `consumePostLoginRedirect` — value is `//evil.com/path` | returns null |
| 7 | `consumePostLoginRedirect` — value is `/\evil` | returns null |

### Update: `src/authentication/local/__tests__/SignInPage.integration.test.tsx`

| Change | Detail |
|---|---|
| Rename existing success test | "navigates to / when no postLoginRedirect is set" — assertion unchanged |
| New | "navigates to stored postLoginRedirect after login" — seed `sessionStorage['postLoginRedirect'] = '/assistants/marketplace/foo'`; assert `navigate` called with that path |
| New | "clears postLoginRedirect from sessionStorage after login" — seed key; assert key is gone after login |
| New | "ignores invalid postLoginRedirect and falls back to /" — seed `'//evil.com'`; assert `navigate('/')` |

---

## Guide Fix

**`.ai-run/guides/architecture/routing-patterns.md`** — correct the stale line that states
`createHashRouter` is used; the codebase uses `createBrowserRouter` (since before
EPMCDME-12556). Add a brief note on the `postLoginRedirect` URL-restore convention.

---

## Files Changed

| File | Change |
|---|---|
| `src/utils/postLoginRedirect.ts` | New — save/consume utility with basename stripping and sanitization |
| `src/utils/api.ts` | +1 import, +1 call in `handleSessionExpired` |
| `src/authentication/local/SignInPage.tsx` | +1 import, +2 lines in `handleSignIn` |
| `src/utils/__tests__/postLoginRedirect.test.ts` | New — 7 unit test cases |
| `src/authentication/local/__tests__/SignInPage.integration.test.tsx` | 1 rename + 3 new cases |
| `.ai-run/guides/architecture/routing-patterns.md` | Stale-docs correction + convention note |

---

## Acceptance Criteria

- Unauthenticated users opening a shared Marketplace assistant link are redirected to login and then returned to the originally requested assistant.
- The original assistant ID/route is preserved during the authentication flow.
- Authenticated users continue to open the correct assistant directly from the shared link without any redirect.
- No regression for other Marketplace assistant navigation flows.
- Sub-path deployments (`VITE_SUFFIX`) behave identically to root deployments.
- An attacker-controlled `postLoginRedirect` value (e.g. `//evil.com`) is rejected and the user lands on `/`.
