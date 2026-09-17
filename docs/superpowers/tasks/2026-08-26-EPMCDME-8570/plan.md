# EPMCDME-8570: Decorative Help Page Icons — Accessibility Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide decorative icons on the Help page from screen readers so they are not announced alongside the visible item name.

**Architecture:** Three rendering branches in a single component (`HelpItem.tsx`) each expose the item name to assistive technology — two via `alt={name}` on `<img>` tags and one via a bare `<Icon />` SVG with no suppression. Each branch gets the WCAG 2.1 SC 1.1.1 fix for pure decoration: `alt="" role="presentation"` on `<img>` elements and `aria-hidden="true"` on the SVG component. Two unit tests that assert the current buggy `alt={name}` output are updated to match the corrected behaviour.

**Tech Stack:** React 18, TypeScript 5, Vitest + React Testing Library

**Spec:** inline requirements (no spec file)

## Acceptance criteria

- `<img src={iconUrl}>` renders with `alt=""` and `role="presentation"`, not `alt={name}`.
- `<Icon />` renders with `aria-hidden="true"`.
- `<img src={DefaultIconPng}>` fallback renders with `alt=""` and `role="presentation"`, not `alt={name}`.
- Both previously-failing tests pass with the corrected assertions.
- No other files are changed.

## Global Constraints

- Decorative images: `alt=""` + `role="presentation"` (accessibility-patterns.md).
- Decorative SVGs: `aria-hidden="true"` (accessibility-patterns.md).
- Commit per task using the repository's existing convention.

---

### Task 1: Fix decorative-icon accessibility in HelpItem and update tests

**Files:**
- Modify: `src/pages/help/components/HelpItem.tsx:51-52`
- Modify: `src/pages/help/components/__tests__/HelpItem.test.tsx:92-116,139-158`
- Modify: `src/pages/help/components/__tests__/HelpSection.test.tsx:156-169`

**Interfaces:**
- Consumes: `HelpItemType` props — `iconUrl`, `icon`, `name` (unchanged).
- Produces: rendered `<img alt="" role="presentation">` and `<Icon aria-hidden="true" />` — tested via role/src/testid queries instead of `getByAltText(name)`.

`Test-first: yes — update tests to query by `role="img"` / `getByAltText('')` so they fail on the current `alt={name}` output, then pass after the fix.`

- [ ] **Step 1: Update HelpItem tests to assert corrected accessibility output**

In `src/pages/help/components/__tests__/HelpItem.test.tsx`:

Replace the `'renders iconUrl image when provided'` test (lines 91–96):
```tsx
it('renders iconUrl image when provided', () => {
  renderWithRouter(<HelpItem {...defaultProps} iconUrl="https://example.com/icon.png" />)
  const img = screen.getByRole('presentation')
  expect(img).toBeInTheDocument()
  expect(img).toHaveAttribute('src', 'https://example.com/icon.png')
  expect(img).toHaveAttribute('alt', '')
})
```

Replace the `'renders default avatar when no icon or iconUrl provided'` test (lines 98–105):
```tsx
it('renders default avatar when no icon or iconUrl provided', () => {
  renderWithRouter(<HelpItem {...defaultProps} />)
  const img = screen.getByRole('presentation')
  expect(img).toBeInTheDocument()
  expect(img).toHaveAttribute('src', 'ai-avatar.png')
  expect(img).toHaveAttribute('alt', '')
})
```

Replace the `'prioritizes iconUrl over custom icon'` test (lines 107–116) — change `getByAltText('Test Assistant')` to a role query:
```tsx
it('prioritizes iconUrl over custom icon', () => {
  renderWithRouter(
    <HelpItem {...defaultProps} iconUrl="https://example.com/icon.png" icon={TestIconSvg} />
  )
  const img = screen.getByRole('presentation')
  expect(img).toHaveAttribute('src', 'https://example.com/icon.png')
  expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument()
})
```

Replace the `'renders with all props combined'` test (lines 139–158) — change `getByAltText('Advanced Assistant')` to a role query:
```tsx
it('renders with all props combined', () => {
  renderWithRouter(
    <HelpItem
      name="Advanced Assistant"
      description="Full featured assistant"
      link="https://example.com/assistant"
      type="chat"
      buttonText="Start Chat"
      iconUrl="https://example.com/avatar.png"
      isExternal
    />
  )
  expect(screen.getByText('Advanced Assistant')).toBeInTheDocument()
  expect(screen.getByText('Full featured assistant')).toBeInTheDocument()
  expect(screen.getByText('Start Chat')).toBeInTheDocument()
  expect(screen.getByTestId('external-link-icon')).toBeInTheDocument()
  const img = screen.getByRole('presentation')
  expect(img).toHaveAttribute('src', 'https://example.com/avatar.png')
  expect(img).toHaveAttribute('alt', '')
})
```

- [ ] **Step 2: Update HelpSection test to assert corrected accessibility output**

In `src/pages/help/components/__tests__/HelpSection.test.tsx`:

Replace the `'handles items with iconUrl'` test (lines 156–169):
```tsx
it('handles items with iconUrl', () => {
  const itemsWithIconUrl: HelpItemType[] = [
    {
      name: 'Avatar Item',
      description: 'Item with avatar',
      link: '/avatar',
      type: 'chat',
      iconUrl: 'https://example.com/avatar.png',
    },
  ]
  renderWithRouter(<HelpSection {...defaultProps} items={itemsWithIconUrl} />)
  const img = screen.getByRole('presentation')
  expect(img).toHaveAttribute('src', 'https://example.com/avatar.png')
  expect(img).toHaveAttribute('alt', '')
})
```

- [ ] **Step 3: Run tests to verify they fail on current code**

```
npx vitest run src/pages/help/components/__tests__/HelpItem.test.tsx src/pages/help/components/__tests__/HelpSection.test.tsx
```

Expected: the four updated tests fail (unable to find element with role `presentation`).

- [ ] **Step 4: Apply the fix to HelpItem.tsx**

In `src/pages/help/components/HelpItem.tsx`, replace lines 51–52:

```tsx
{iconUrl && <img src={iconUrl} alt="" role="presentation" />}
{!iconUrl && (Icon ? <Icon aria-hidden="true" /> : <img src={DefaultIconPng} alt="" role="presentation" />)}
```

- [ ] **Step 5: Run tests to verify they pass**

```
npx vitest run src/pages/help/components/__tests__/HelpItem.test.tsx src/pages/help/components/__tests__/HelpSection.test.tsx
```

Expected: all tests in both files pass.
