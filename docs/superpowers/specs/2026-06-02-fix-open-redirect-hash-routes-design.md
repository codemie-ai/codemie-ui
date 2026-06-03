# Fix Open Redirect in redirectHashRoutes (CWE-601)

**Ticket**: EPMCDME-12556
**Date**: 2026-06-02
**Branch**: EPMCDME-12556_fix-open-redirect-hash-routes

---

## Problem

`src/utils/redirectHashRoutes.ts` is a one-shot Vue→React migration shim that runs at bootstrap (`main.tsx`) to redirect users who bookmarked legacy hash-based routes (e.g. `/#/assistants/123`) to the equivalent browser-history path (`/assistants/123`).

SnykSAST (CWE-601) flagged that `hashPath`, derived from `window.location.hash`, flows unsanitized into `window.location.replace()`. A crafted hash like `#///evil.com` causes:

```
hash.slice(2)          → "//evil.com"        (after stripping "#/")
base (pathname = "/")  → ""                  (trailing slash stripped)
window.location.replace("" + "/" + "//evil.com")
  → window.location.replace("//evil.com")    ← protocol-relative, navigates off-site
```

The `hash.startsWith('#/')` guard does not prevent this because `#///evil.com` passes the check. Backslash variants (`#/\evil.com`) are also affected on browsers that normalise `\` to `/` in URL resolution.

---

## Fix

### Implementation — `src/utils/redirectHashRoutes.ts`

Add one sanitization step after splitting the hash path, stripping any leading `/` or `\` characters:

```typescript
export const redirectHashRoutes = () => {
  const { hash } = window.location
  if (!hash.startsWith('#/')) return

  const [hashPath, hashQuery] = hash.slice(2).split('?')
  const base = window.location.pathname.replace(/\/$/, '')
  const search = hashQuery ? `?${hashQuery}` : window.location.search
  // Strip leading slashes/backslashes to prevent protocol-relative open redirect (CWE-601)
  const safePath = hashPath.replace(/^[/\\]+/, '')
  window.location.replace(`${base}/${safePath}${search}`)
}
```

**Why this is safe for benign inputs**: All legitimate route segments (`assistants`, `chats/123`, `skills`) carry no leading slash after `hash.slice(2)` — `replace(/^[/\\]+/, '')` is a no-op on them. Sub-path deployments (via `VITE_SUFFIX`, e.g. `/codemie/`) are unaffected because they operate on `window.location.pathname`, not `hashPath`.

**Why this resolves the attack**: `//evil.com` → `evil.com` after strip → final URL becomes `/evil.com` (same-origin relative path). `\evil.com` → `evil.com` → `/evil.com`. Protocol-relative navigation is no longer possible.

### Tests — `src/utils/__tests__/redirectHashRoutes.test.ts`

Four new test cases added to the existing `describe` block, using the existing `stubLocation` helper and AAA pattern:

| # | Hash input | Pathname | Expected `replace()` arg |
|---|---|---|---|
| 1 | `#///evil.com` | `/` | `/evil.com` (not `//evil.com`) |
| 2 | `#///evil.com` | `/codemie/` | `/codemie/evil.com` |
| 3 | `#//evil.com` | `/` | `/evil.com` |
| 4 | `#/\evil.com` | `/` | `/evil.com` |

All seven existing tests pass unchanged.

---

## Scope

| File | Change |
|---|---|
| `src/utils/redirectHashRoutes.ts` | +1 line (sanitization) + 1 line (comment) |
| `src/utils/__tests__/redirectHashRoutes.test.ts` | +4 test cases |

No changes to `main.tsx`, `router.tsx`, stores, components, or configuration.

---

## Quality Gate

```
npm run lint
npm run typecheck  (if available as standalone)
npm run test:unit
```

All gates must pass green before the MR is opened.

---

## Out of Scope

- URL-encoded slash variants (`%2F%2F`): not exploitable via string concatenation and not flagged by the SAST scanner. Belongs in a separate hardening ticket if deemed necessary.
- `new URL()` origin validation: appropriate for origin-sensitive message handlers (see `useAuthCallbackListener.ts`), overkill for this one-shot shim.
