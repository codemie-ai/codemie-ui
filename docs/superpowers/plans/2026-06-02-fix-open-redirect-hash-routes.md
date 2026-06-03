# Fix Open Redirect in redirectHashRoutes (CWE-601) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sanitize `hashPath` in `redirectHashRoutes.ts` to prevent protocol-relative open redirect (CWE-601) while keeping all existing hash-migration behaviour intact.

**Architecture:** Add a single `replace(/^[/\\]+/, '')` call on `hashPath` before it is interpolated into `window.location.replace()`. This eliminates the leading-slash attack vector (`#//evil.com` → `//evil.com`) and the backslash variant (`#/\evil.com`). No other files are touched.

**Tech Stack:** TypeScript, Vitest, `vi.stubGlobal` for mocking `window`.

---

## File Map

| File | Action | Change |
|---|---|---|
| `src/utils/redirectHashRoutes.ts` | Modify | +1 comment line, +1 `safePath` variable, update template literal |
| `src/utils/__tests__/redirectHashRoutes.test.ts` | Modify | +4 attack-vector test cases inside the existing `describe` block |

---

### Task 1: Write failing attack-vector tests

**Files:**
- Modify: `src/utils/__tests__/redirectHashRoutes.test.ts`

These four test cases describe the expected post-fix behaviour. They will **fail** against the current implementation — that is intentional.

- [ ] **Step 1: Add the four attack-vector test cases**

Open `src/utils/__tests__/redirectHashRoutes.test.ts`. After the last existing `it(...)` block (line 117, before the closing `})` of the `describe`), add:

```typescript
  it('should sanitize triple-slash hash to same-origin path at root', () => {
    // Arrange
    stubLocation({ hash: '#///evil.com', pathname: '/', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/evil.com')
  })

  it('should sanitize triple-slash hash to same-origin path in sub-path deployment', () => {
    // Arrange
    stubLocation({ hash: '#///evil.com', pathname: '/codemie/', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/codemie/evil.com')
  })

  it('should sanitize double-slash hash to same-origin path', () => {
    // Arrange
    stubLocation({ hash: '#//evil.com', pathname: '/', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/evil.com')
  })

  it('should sanitize backslash hash variant to same-origin path', () => {
    // Arrange
    stubLocation({ hash: '#/\\evil.com', pathname: '/', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/evil.com')
  })
```

- [ ] **Step 2: Run the new tests and verify they fail (RED)**

```bash
npm run test:unit -- --reporter=verbose src/utils/__tests__/redirectHashRoutes.test.ts
```

Expected: the 4 new tests FAIL, the 7 existing tests PASS.

Example failure for the double-slash case:
```
AssertionError: expected "//" to be "/evil.com"
```

If any of the new tests unexpectedly pass, the current code already handles that vector — double-check the hash input values in Step 1 and re-run.

---

### Task 2: Implement the fix and verify GREEN

**Files:**
- Modify: `src/utils/redirectHashRoutes.ts`
- Test: `src/utils/__tests__/redirectHashRoutes.test.ts` (no further edits — tests written in Task 1)

- [ ] **Step 1: Apply the sanitization**

Replace the entire contents of `src/utils/redirectHashRoutes.ts` with:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

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

The only functional change is the new `safePath` variable and the updated template literal (`safePath` instead of `hashPath`).

- [ ] **Step 2: Run the full test file and verify all 11 tests pass (GREEN)**

```bash
npm run test:unit -- --reporter=verbose src/utils/__tests__/redirectHashRoutes.test.ts
```

Expected: all 11 tests PASS (7 existing + 4 new).

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors or warnings for the two changed files.

If lint reports a quote-style issue (`'` vs `"`), fix it — the project enforces single quotes (ESLint rule).

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: exit 0 with no TypeScript errors.

- [ ] **Step 5: Run the full unit test suite**

```bash
npm run test:unit
```

Expected: all tests pass. This confirms no other unit tests regress.

- [ ] **Step 6: Commit**

```bash
git add src/utils/redirectHashRoutes.ts src/utils/__tests__/redirectHashRoutes.test.ts
git commit -m "EPMCDME-12556: Fix open redirect (CWE-601) in redirectHashRoutes"
```

Expected commit message passes Tekton CI regex:
`^(EPMCDME)-(?!0+)\d+:\s[A-Z][a-z]*.*` ✓
