# Fix Open Redirect Vulnerability in redirectHashRoutes (EPMCDME-12556)

**Date:** 2026-06-09  
**Status:** Approved  
**Related Ticket:** [EPMCDME-12556](https://jiraeu.epam.com/browse/EPMCDME-12556)

## Problem Statement

The scanner correctly identified an open redirect vulnerability in `src/utils/redirectHashRoutes.ts`. While the previous fix (commit adb8c267) sanitized `hashPath` to prevent protocol-relative URLs from the hash portion, it left `window.location.pathname` unsanitized.

### Vulnerability

An attacker can craft a URL where `pathname` contains protocol-relative sequences:

```
https://yourapp.com//evil.com#/page
```

**Attack flow:**
1. `pathname` = `//evil.com`
2. `base` = `//evil.com` (only trailing slash removed)
3. `safePath` = `page` (sanitized from hash)
4. Result: `window.location.replace('//evil.com/page')` → redirects to `https://evil.com/page`

### Root Cause

Line 21 uses `window.location.pathname` directly without sanitization:
```typescript
const base = window.location.pathname.replace(/\/$/, '')
```

## Solution

Apply the same sanitization pattern to `pathname` before using it as the base path.

### Implementation

**Current code (lines 20-25):**
```typescript
const [hashPath, hashQuery] = hash.slice(2).split('?')
const base = window.location.pathname.replace(/\/$/, '')
const search = hashQuery ? `?${hashQuery}` : window.location.search
// Strip leading slashes/backslashes to prevent protocol-relative open redirect (CWE-601)
const safePath = hashPath.replace(/^[/\\]+/, '')
window.location.replace(`${base}/${safePath}${search}`)
```

**Fixed code:**
```typescript
const [hashPath, hashQuery] = hash.slice(2).split('?')
// Strip leading slashes/backslashes from pathname to prevent protocol-relative open redirect (CWE-601)
const pathname = window.location.pathname.replace(/^[/\\]+/, '')
const base = pathname.replace(/\/$/, '')
const search = hashQuery ? `?${hashQuery}` : window.location.search
// Strip leading slashes/backslashes from hash path
const safePath = hashPath.replace(/^[/\\]+/, '')
window.location.replace(`${base}/${safePath}${search}`)
```

### Changes Summary

1. Extract `pathname` sanitization into a separate line before the `base` calculation
2. Apply the same regex pattern `replace(/^[/\\]+/, '')` to strip leading slashes/backslashes
3. Update comment to clarify both inputs are sanitized

## Testing Strategy

### New Test Cases

Add tests for pathname-based attack vectors:

1. **Protocol-relative pathname at root:**
   - Input: `pathname: '//evil.com'`, `hash: '#/page'`
   - Expected: `/page` (not `//evil.com/page`)

2. **Protocol-relative pathname with sub-path:**
   - Input: `pathname: '//evil.com/codemie'`, `hash: '#/page'`
   - Expected: `/codemie/page` (not `//evil.com/codemie/page`)

3. **Triple-slash pathname:**
   - Input: `pathname: '///evil.com'`, `hash: '#/page'`
   - Expected: `/page`

4. **Backslash pathname variant:**
   - Input: `pathname: '/\\evil.com'`, `hash: '#/page'`
   - Expected: `/page`

5. **Legitimate sub-path unaffected:**
   - Input: `pathname: '/codemie/'`, `hash: '#/assistants'`
   - Expected: `/codemie/assistants` (existing behavior preserved)

### Existing Tests

All existing tests in `src/utils/__tests__/redirectHashRoutes.test.ts` (lines 42-166) should continue to pass, including the hash-based attack vector tests (lines 120-166).

## Security Considerations

- **Consistent sanitization:** Both untrusted inputs (`pathname` and `hashPath`) now receive identical sanitization
- **Defense in depth:** Even if server configuration prevents `//evil.com` paths, the application code is now safe
- **No breaking changes:** Legitimate paths are unaffected; only malicious protocol-relative sequences are stripped

## Deployment

No special deployment considerations. This is a client-side fix in a utility function.
