# EPMCDME-8233: Copy Button WCAG 2.5.8 Target Size Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring three "Copy" icon buttons up to WCAG 2.2 SC 2.5.8's 24×24 px minimum interactive target size, add reliable accessible names via `aria-label`, and add a visible focus outline.

**Architecture:** Pure presentation-layer Tailwind class changes to two components (`ProfileCard.tsx` and `NavigationProfile.tsx`). No shared component is introduced — the fix adds `inline-flex items-center justify-center min-w-[24px] min-h-[24px]` plus focus-ring classes directly to each button. Existing `title` attributes are kept alongside `aria-label` so tooltip behaviour is preserved.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest + React Testing Library

## Global Constraints

- Commit format: `EPMCDME-8233: Capital sentence` (CI enforced — first word after colon must start uppercase)
- Tailwind only — no inline styles, no CSS modules
- Keep `title` attribute alongside `aria-label` (tooltip UX preserved, screen-reader name is `aria-label`)
- Do NOT change the visual icon size (`w-3` stays on `<CopySvg>`)
- Test runner: Vitest (`npx vitest run <path>`)
- Focus ring pattern from codebase: `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-accent rounded-sm`

---

### Task 1: Fix ProfileCard.tsx copy button + create smoke test

**Test-first: yes — failing test asserts `aria-label="Copy user ID"` on the button before it exists**

**Files:**
- Modify: `src/pages/settings/components/ProfileCard.tsx:43-50`
- Create: `src/pages/settings/components/__tests__/ProfileCard.test.tsx`

**Interfaces:**
- Consumes: `ProfileCard` default export from `../ProfileCard`; `copyToClipboard` from `@/utils/helpers`
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Create the test file with a failing test**

Create `src/pages/settings/components/__tests__/ProfileCard.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ProfileCard from '../ProfileCard'

const mockCopyToClipboard = vi.fn()

vi.mock('@/assets/icons/copy.svg?react', () => ({
  default: () => <svg data-testid="copy-icon" />,
}))

vi.mock('@/assets/images/avatar.jpg', () => ({
  default: 'avatar.jpg',
}))

vi.mock('@/utils/helpers', () => ({
  copyToClipboard: mockCopyToClipboard,
}))

const mockUser = {
  userId: 'user-abc-123',
  name: 'Jane Smith',
  picture: null,
} as any

describe('ProfileCard — copy button accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has aria-label "Copy user ID" on the copy button', () => {
    render(<ProfileCard user={mockUser} />)
    expect(screen.getByLabelText('Copy user ID')).toBeInTheDocument()
  })

  it('copy button has min-w-[24px] and min-h-[24px] classes', () => {
    render(<ProfileCard user={mockUser} />)
    const btn = screen.getByLabelText('Copy user ID')
    expect(btn.className).toContain('min-w-[24px]')
    expect(btn.className).toContain('min-h-[24px]')
  })

  it('copy button has a focus-visible ring class', () => {
    render(<ProfileCard user={mockUser} />)
    const btn = screen.getByLabelText('Copy user ID')
    expect(btn.className).toContain('focus-visible:ring-1')
  })

  it('calls copyToClipboard with userId when clicked', () => {
    render(<ProfileCard user={mockUser} />)
    fireEvent.click(screen.getByLabelText('Copy user ID'))
    expect(mockCopyToClipboard).toHaveBeenCalledWith('user-abc-123', 'User ID copied to clipboard')
  })
})
```

- [ ] **Step 2: Run the test — verify it FAILS**

```bash
npx vitest run src/pages/settings/components/__tests__/ProfileCard.test.tsx
```

Expected output: test fails because `aria-label="Copy user ID"` does not exist yet on the button (query throws `Unable to find a label with the text of: Copy user ID`).

- [ ] **Step 3: Fix ProfileCard.tsx**

In `src/pages/settings/components/ProfileCard.tsx`, replace lines 43–50:

```tsx
        <button
          aria-label="Copy user ID"
          title="Copy user ID"
          className="inline-flex items-center justify-center min-w-[24px] min-h-[24px] hover:opacity-80 ml-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-accent rounded-sm"
          type="button"
          onClick={copyUserID}
        >
          <CopySvg className="w-3" />
        </button>
```

- [ ] **Step 4: Run the test — verify it PASSES**

```bash
npx vitest run src/pages/settings/components/__tests__/ProfileCard.test.tsx
```

Expected output: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/components/ProfileCard.tsx src/pages/settings/components/__tests__/ProfileCard.test.tsx
git commit -m "EPMCDME-8233: Fix copy button target size and accessibility in ProfileCard"
```

---

### Task 2: Fix NavigationProfile.tsx copy buttons + update tests

**Test-first: yes — add new failing assertions for `aria-label` before patching the component**

**Files:**
- Modify: `src/components/Navigation/NavigationProfile.tsx:146-165`
- Modify: `src/components/Navigation/__tests__/NavigationProfile.test.tsx`

**Interfaces:**
- Consumes: existing mock setup from the test file (mockCopyToClipboard, mockUser already in scope)
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Add failing assertions to NavigationProfile.test.tsx**

Append these two `it` blocks inside the existing `describe('NavigationProfile', ...)` block (after the last existing `it` at line 222):

```tsx
  it('copy buttons have aria-label accessible names', () => {
    render(<NavigationProfile isExpanded={false} />)
    expect(screen.getByLabelText('Copy username')).toBeInTheDocument()
    expect(screen.getByLabelText('Copy user ID')).toBeInTheDocument()
  })

  it('copy buttons meet 24px minimum target size via Tailwind classes', () => {
    render(<NavigationProfile isExpanded={false} />)
    const copyUsernameBtn = screen.getByLabelText('Copy username')
    const copyUserIdBtn = screen.getByLabelText('Copy user ID')
    expect(copyUsernameBtn.className).toContain('min-w-[24px]')
    expect(copyUsernameBtn.className).toContain('min-h-[24px]')
    expect(copyUserIdBtn.className).toContain('min-w-[24px]')
    expect(copyUserIdBtn.className).toContain('min-h-[24px]')
  })
```

- [ ] **Step 2: Run the updated test file — verify new tests FAIL, existing tests still PASS**

```bash
npx vitest run src/components/Navigation/__tests__/NavigationProfile.test.tsx
```

Expected: the 2 new tests fail (`Unable to find a label`); all pre-existing tests still pass (the `title` attribute remains untouched at this point).

- [ ] **Step 3: Fix NavigationProfile.tsx — Copy username button (lines 146–152)**

Replace:
```tsx
                <button
                  className="ml-1 text-text-primary hover:opacity-80"
                  title="Copy username"
                  onClick={copyUserName}
                >
                  <CopySvg className="w-3" />
                </button>
```

With:
```tsx
                <button
                  aria-label="Copy username"
                  className="inline-flex items-center justify-center min-w-[24px] min-h-[24px] ml-1 text-text-primary hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-accent rounded-sm"
                  title="Copy username"
                  type="button"
                  onClick={copyUserName}
                >
                  <CopySvg className="w-3" />
                </button>
```

- [ ] **Step 4: Fix NavigationProfile.tsx — Copy user ID button (lines 158–165)**

Replace:
```tsx
                <button
                  className="ml-1 text-text-primary hover:opacity-80"
                  title="Copy user ID"
                  onClick={copyUserID}
                >
                  <CopySvg className="w-3" />
                </button>
```

With:
```tsx
                <button
                  aria-label="Copy user ID"
                  className="inline-flex items-center justify-center min-w-[24px] min-h-[24px] ml-1 text-text-primary hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-accent rounded-sm"
                  title="Copy user ID"
                  type="button"
                  onClick={copyUserID}
                >
                  <CopySvg className="w-3" />
                </button>
```

- [ ] **Step 5: Run all NavigationProfile tests — verify all PASS**

```bash
npx vitest run src/components/Navigation/__tests__/NavigationProfile.test.tsx
```

Expected: all tests pass — the 2 new `aria-label` tests now pass; all pre-existing `getByTitle` tests still pass because the `title` attribute was not removed.

- [ ] **Step 6: Commit**

```bash
git add src/components/Navigation/NavigationProfile.tsx src/components/Navigation/__tests__/NavigationProfile.test.tsx
git commit -m "EPMCDME-8233: Fix copy button target size and accessibility in NavigationProfile"
```

---

## Self-Review Checklist

- [x] ProfileCard.tsx button: `min-w-[24px] min-h-[24px]`, `aria-label="Copy user ID"`, focus ring ✓
- [x] NavigationProfile.tsx username button: `min-w-[24px] min-h-[24px]`, `aria-label="Copy username"`, focus ring ✓
- [x] NavigationProfile.tsx user ID button: `min-w-[24px] min-h-[24px]`, `aria-label="Copy user ID"`, focus ring ✓
- [x] `title` attribute kept on all three buttons (tooltip UX preserved) ✓
- [x] Visual icon size `w-3` unchanged ✓
- [x] Commit format `EPMCDME-8233: Capital sentence` used ✓
- [x] `type="button"` added to NavigationProfile buttons (missing before) ✓
- [x] Existing `getByTitle` tests still pass (title not removed) ✓
- [x] New tests for ProfileCard (previously zero coverage) ✓
