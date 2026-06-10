# Fix Open Redirect Vulnerability in redirectHashRoutes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the open redirect (CWE-601) fix by sanitizing `window.location.pathname` to prevent protocol-relative URL attacks.

**Architecture:** Apply the same regex sanitization pattern (`replace(/^[/\\]+/, '')`) to both `pathname` and `hashPath` inputs before constructing the redirect URL. This ensures consistent defense against protocol-relative sequences like `//evil.com`.

**Tech Stack:** TypeScript, Vitest

**Related Ticket:** [EPMCDME-12556](https://jiraeu.epam.com/browse/EPMCDME-12556)

---

## File Structure

**Files to modify:**
- `src/utils/redirectHashRoutes.ts` - Add pathname sanitization (lines 20-21)
- `src/utils/__tests__/redirectHashRoutes.test.ts` - Add 5 new test cases for pathname attack vectors

---

## Task 1: Add test for protocol-relative pathname at root

**Test-first:** yes — Write failing test for `pathname: '//evil.com'` sanitization

**Files:**
- Modify: `src/utils/__tests__/redirectHashRoutes.test.ts:167-179`

- [ ] **Step 1: Write the failing test**

Add this test after line 166 (after the last existing test):

```typescript
  it('should sanitize protocol-relative pathname at root', () => {
    // Arrange
    stubLocation({ hash: '#/page', pathname: '//evil.com', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/page')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- redirectHashRoutes.test.ts`

Expected output: FAIL - test expects `/page` but gets `//evil.com/page`

- [ ] **Step 3: Commit the failing test**

```bash
git add src/utils/__tests__/redirectHashRoutes.test.ts
git commit -m "test: add failing test for pathname protocol-relative attack at root

EPMCDME-12556

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

## Task 2: Add test for protocol-relative pathname with sub-path

**Test-first:** yes — Write failing test for `pathname: '//evil.com/codemie'` sanitization

**Files:**
- Modify: `src/utils/__tests__/redirectHashRoutes.test.ts:180-192`

- [ ] **Step 1: Write the failing test**

Add this test after the previous test:

```typescript
  it('should sanitize protocol-relative pathname with sub-path', () => {
    // Arrange
    stubLocation({ hash: '#/page', pathname: '//evil.com/codemie', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/codemie/page')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- redirectHashRoutes.test.ts`

Expected output: FAIL - test expects `/codemie/page` but gets `//evil.com/codemie/page`

- [ ] **Step 3: Commit the failing test**

```bash
git add src/utils/__tests__/redirectHashRoutes.test.ts
git commit -m "test: add failing test for pathname protocol-relative attack with sub-path

EPMCDME-12556

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

## Task 3: Add test for triple-slash pathname

**Test-first:** yes — Write failing test for `pathname: '///evil.com'` sanitization

**Files:**
- Modify: `src/utils/__tests__/redirectHashRoutes.test.ts:193-205`

- [ ] **Step 1: Write the failing test**

Add this test after the previous test:

```typescript
  it('should sanitize triple-slash pathname', () => {
    // Arrange
    stubLocation({ hash: '#/page', pathname: '///evil.com', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/page')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- redirectHashRoutes.test.ts`

Expected output: FAIL - test expects `/page` but gets `///evil.com/page`

- [ ] **Step 3: Commit the failing test**

```bash
git add src/utils/__tests__/redirectHashRoutes.test.ts
git commit -m "test: add failing test for pathname triple-slash attack

EPMCDME-12556

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

## Task 4: Add test for backslash pathname variant

**Test-first:** yes — Write failing test for `pathname: '/\\evil.com'` sanitization

**Files:**
- Modify: `src/utils/__tests__/redirectHashRoutes.test.ts:206-218`

- [ ] **Step 1: Write the failing test**

Add this test after the previous test:

```typescript
  it('should sanitize backslash pathname variant', () => {
    // Arrange
    stubLocation({ hash: '#/page', pathname: '/\\evil.com', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/page')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- redirectHashRoutes.test.ts`

Expected output: FAIL - test expects `/page` but gets `/\\evil.com/page`

- [ ] **Step 3: Commit the failing test**

```bash
git add src/utils/__tests__/redirectHashRoutes.test.ts
git commit -m "test: add failing test for pathname backslash attack variant

EPMCDME-12556

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

## Task 5: Add test to verify legitimate sub-path behavior preserved

**Test-first:** yes — Write test to ensure fix doesn't break legitimate sub-path deployments

**Files:**
- Modify: `src/utils/__tests__/redirectHashRoutes.test.ts:219-231`

- [ ] **Step 1: Write the test**

Add this test after the previous test:

```typescript
  it('should preserve legitimate sub-path deployment behavior', () => {
    // Arrange
    stubLocation({ hash: '#/assistants', pathname: '/codemie/', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/codemie/assistants')
  })
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- redirectHashRoutes.test.ts`

Expected output: PASS - this test should pass with current implementation (verifies no regression)

- [ ] **Step 3: Commit the regression test**

```bash
git add src/utils/__tests__/redirectHashRoutes.test.ts
git commit -m "test: add regression test for legitimate sub-path behavior

EPMCDME-12556

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

## Task 6: Implement pathname sanitization fix

**Test-first:** yes — All failing tests from Tasks 1-4 now drive implementation

**Files:**
- Modify: `src/utils/redirectHashRoutes.ts:20-25`

- [ ] **Step 1: Add pathname sanitization**

Modify lines 20-25 in `src/utils/redirectHashRoutes.ts`:

**Before:**
```typescript
  const [hashPath, hashQuery] = hash.slice(2).split('?')
  const base = window.location.pathname.replace(/\/$/, '')
  const search = hashQuery ? `?${hashQuery}` : window.location.search
  // Strip leading slashes/backslashes to prevent protocol-relative open redirect (CWE-601)
  const safePath = hashPath.replace(/^[/\\]+/, '')
  window.location.replace(`${base}/${safePath}${search}`)
```

**After:**
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

Changes:
1. Line 21: Extract sanitized `pathname` by stripping leading slashes/backslashes
2. Line 22: Use sanitized `pathname` variable instead of `window.location.pathname` directly
3. Line 21: Add comment explaining pathname sanitization for CWE-601
4. Line 24: Update comment to clarify it applies to hash path (parallel to pathname comment)

- [ ] **Step 2: Run all tests to verify they pass**

Run: `npm test -- redirectHashRoutes.test.ts`

Expected output: All tests PASS, including:
- ✓ should sanitize protocol-relative pathname at root
- ✓ should sanitize protocol-relative pathname with sub-path
- ✓ should sanitize triple-slash pathname
- ✓ should sanitize backslash pathname variant
- ✓ should preserve legitimate sub-path deployment behavior
- ✓ All 13 existing tests continue to pass (lines 42-166)

- [ ] **Step 3: Run full test suite to check for regressions**

Run: `npm test`

Expected: All tests across the entire codebase pass

- [ ] **Step 4: Commit the implementation**

```bash
git add src/utils/redirectHashRoutes.ts
git commit -m "fix: sanitize pathname to prevent protocol-relative open redirect

Apply same sanitization pattern to window.location.pathname as used for
hashPath. This prevents attacks like https://app.com//evil.com#/page
where pathname contains protocol-relative sequences.

Fixes EPMCDME-12556

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

## Task 7: Verify complete solution

**Test-first:** no — Verification and documentation step

**Files:**
- Read: `src/utils/redirectHashRoutes.ts`
- Read: `src/utils/__tests__/redirectHashRoutes.test.ts`

- [ ] **Step 1: Review implementation against spec**

Verify:
1. Both `pathname` and `hashPath` use identical sanitization: `replace(/^[/\\]+/, '')`
2. Comments clearly explain both sanitizations reference CWE-601
3. All 5 new test cases from the spec are implemented (lines ~167-231)
4. All 13 existing tests still pass (lines 42-166)

- [ ] **Step 2: Run security test scenarios manually**

Check each attack vector from spec is blocked:
- `//evil.com` pathname → sanitized to empty or relative path
- `///evil.com` pathname → sanitized to empty or relative path
- `/\\evil.com` pathname → sanitized to empty or relative path
- Legitimate paths like `/codemie/` → preserved as `/codemie/assistants`

Expected: All attack vectors blocked, legitimate paths work

- [ ] **Step 3: Document completion**

Create summary of what was fixed for the Jira ticket:

```markdown
Vulnerability fixed. Applied consistent sanitization to both pathname and hashPath inputs using replace(/^[/\\]+/, '') pattern.

Implementation:
- src/utils/redirectHashRoutes.ts (lines 20-25): Added pathname sanitization
- src/utils/__tests__/redirectHashRoutes.test.ts: Added 5 new security test cases

All tests pass. Attack vectors verified blocked:
- Protocol-relative URLs (//evil.com)
- Triple-slash variants (///evil.com)  
- Backslash variants (/\\evil.com)

Legitimate sub-path deployments unaffected.
```

---

## Execution Notes

- **Total Tasks:** 7 (5 test tasks, 1 implementation task, 1 verification task)
- **Estimated Time:** 20-30 minutes
- **Dependencies:** None (single-file change with focused tests)
- **Risk:** Low - defense-in-depth fix with comprehensive test coverage

**Testing Strategy:**
- TDD approach: Write 4 failing tests first (Tasks 1-4)
- Add 1 regression test (Task 5) 
- Implement fix to make all tests pass (Task 6)
- Verify complete solution (Task 7)

**Commit Strategy:**
- Commit each failing test individually (helps with git bisect if issues arise)
- Commit implementation once all tests pass
- Clear atomic commits following conventional commit format
