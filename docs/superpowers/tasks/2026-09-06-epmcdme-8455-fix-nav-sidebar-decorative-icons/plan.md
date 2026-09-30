# EPMCDME-8455 Fix Nav Sidebar Decorative Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mark decorative SVG icons and the custom logo image inside collapsed Navigation Sidebar interactive elements as hidden from assistive technologies.

**Architecture:** Add `aria-hidden="true"` as a JSX prop at each SVG call site (Vite's `?react` plugin forwards the prop to the rendered `<svg>` root). Change the custom logo `<img alt="...">` to `alt=""` — the parent `<a>` already carries the accessible name via `aria-label`. No new components, no SVG asset edits, no state or routing changes.

**Tech Stack:** React 18, TypeScript 5, Vitest 1.6.1, React Testing Library.

## Global Constraints

- No changes to SVG asset files — aria attributes are JSX props only.
- No new abstraction components.
- No changes to Valtio stores or routing.
- Commit message format: `EPMCDME-8455: Capital sentence` (enforced by CI).
- Run tests via the `unit` vitest project: `npx vitest run --project unit --reporter verbose <file>`.

---

### Task 1: Fix NavigationLink icon wrapper

**Test-first:** yes — assert `aria-hidden="true"` on the icon `<div>` wrapper before adding it.

**Files:**
- Modify: `src/components/Navigation/NavigationSection/NavigationLink.tsx:92`
- Test: `src/components/Navigation/NavigationSection/__tests__/NavigationLink.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: nothing consumed by other tasks (each task is independent)

- [ ] **Step 1: Write the failing test**

Add this `it` block inside the existing `describe('icon rendering', ...)` block in `NavigationLink.test.tsx`:

```tsx
it('hides icon wrapper from assistive technologies', () => {
  const item = { label: 'Chat', icon: IconType.CHAT, route: '/chat' }
  renderWithRouter(<NavigationLink item={item} />)
  const icon = screen.getByTestId('chat-icon')
  expect(icon.parentElement).toHaveAttribute('aria-hidden', 'true')
})
```

Note: the existing SVG mocks in this file do NOT spread props (e.g. `() => <svg data-testid="chat-icon" />`), so `aria-hidden` will not appear on the `<svg>`. The fix is on the wrapper `<div>`, and `icon.parentElement` reaches it.

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run --project unit --reporter verbose src/components/Navigation/NavigationSection/__tests__/NavigationLink.test.tsx
```

Expected: FAIL — `Expected element to have attribute: aria-hidden="true"` (the wrapper `<div>` has no `aria-hidden` attribute yet).

- [ ] **Step 3: Add `aria-hidden="true"` to the icon wrapper `<div>`**

In `src/components/Navigation/NavigationSection/NavigationLink.tsx`, find the icon `<div>` at line ~92 and add the attribute:

```tsx
// Before
{Icon && (
  <div
    className={cn(
      'min-w-4.5 flex-shrink-0 transition-colors duration-100',
      isBottomSection
        ? ''
        : 'group-hover:text-text-specific-navigation-icon-hover text-text-specific-navigation-icon',
      !isBottomSection && isActiveRoute ? 'text-text-specific-navigation-icon-hover' : ''
    )}
  >
    <Icon />
  </div>
)}

// After
{Icon && (
  <div
    aria-hidden="true"
    className={cn(
      'min-w-4.5 flex-shrink-0 transition-colors duration-100',
      isBottomSection
        ? ''
        : 'group-hover:text-text-specific-navigation-icon-hover text-text-specific-navigation-icon',
      !isBottomSection && isActiveRoute ? 'text-text-specific-navigation-icon-hover' : ''
    )}
  >
    <Icon />
  </div>
)}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run --project unit --reporter verbose src/components/Navigation/NavigationSection/__tests__/NavigationLink.test.tsx
```

Expected: all tests PASS including the new `hides icon wrapper from assistive technologies` assertion.

- [ ] **Step 5: Commit**

```bash
git add src/components/Navigation/NavigationSection/NavigationLink.tsx
git add src/components/Navigation/NavigationSection/__tests__/NavigationLink.test.tsx
git commit -m "EPMCDME-8455: Hide decorative icon wrapper in NavigationLink from assistive technologies"
```

---

### Task 2: Fix NavigationExpandButton SidebarSvg

**Test-first:** yes — assert `aria-hidden="true"` on the sidebar SVG before adding it.

**Files:**
- Modify: `src/components/Navigation/NavigationExpandButton.tsx:43`
- Test: `src/components/Navigation/__tests__/NavigationExpandButton.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Write the failing test**

Add this `it` block at the end of the top-level `describe('NavigationExpandButton', ...)` in `NavigationExpandButton.test.tsx`:

```tsx
it('hides sidebar icon from assistive technologies', () => {
  render(<NavigationExpandButton onClick={mockOnClick} />)
  expect(screen.getByTestId('sidebar-icon')).toHaveAttribute('aria-hidden', 'true')
})
```

Note: the existing SVG mock DOES spread props — `(props: any) => <svg data-testid="sidebar-icon" {...props} />` — so `aria-hidden="true"` passed to `<SidebarSvg>` will appear on the rendered `<svg>` element.

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run --project unit --reporter verbose src/components/Navigation/__tests__/NavigationExpandButton.test.tsx
```

Expected: FAIL — `Expected element to have attribute: aria-hidden="true"` (the SVG has no `aria-hidden` attribute yet).

- [ ] **Step 3: Add `aria-hidden="true"` to `<SidebarSvg>`**

In `src/components/Navigation/NavigationExpandButton.tsx`, find `<SidebarSvg>` at line ~43:

```tsx
// Before
<SidebarSvg
  className={cn('min-w-4 transition-transform', {
    'rotate-180': !navigationExpanded,
  })}
/>

// After
<SidebarSvg
  aria-hidden="true"
  className={cn('min-w-4 transition-transform', {
    'rotate-180': !navigationExpanded,
  })}
/>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run --project unit --reporter verbose src/components/Navigation/__tests__/NavigationExpandButton.test.tsx
```

Expected: all tests PASS including the new `hides sidebar icon from assistive technologies` assertion.

- [ ] **Step 5: Commit**

```bash
git add src/components/Navigation/NavigationExpandButton.tsx
git add src/components/Navigation/__tests__/NavigationExpandButton.test.tsx
git commit -m "EPMCDME-8455: Hide SidebarSvg from assistive technologies in NavigationExpandButton"
```

---

### Task 3: Fix NavigationLogo SVGs and custom logo img

**Test-first:** yes — assert `aria-hidden="true"` on both theme SVGs and `alt=""` on the custom logo `<img>` before making the changes.

**Files:**
- Modify: `src/components/Navigation/NavigationLogo.tsx:51,56-57`
- Test: `src/components/Navigation/__tests__/NavigationLogo.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Write the three failing tests**

Add a new `describe` block at the end of the top-level `describe('NavigationLogo', ...)` in `NavigationLogo.test.tsx`:

```tsx
describe('decorative image accessibility', () => {
  afterEach(() => {
    delete (mockUseTheme as any).appearance
  })

  it('hides dark logo svg from assistive technologies', () => {
    mockUseTheme.isDark = true
    render(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
    expect(screen.getByTestId('logo-dark')).toHaveAttribute('aria-hidden', 'true')
  })

  it('hides light logo svg from assistive technologies', () => {
    mockUseTheme.isDark = false
    render(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
    expect(screen.getByTestId('logo-light')).toHaveAttribute('aria-hidden', 'true')
  })

  it('marks custom logo img as decorative with empty alt', () => {
    ;(mockUseTheme as any).appearance = {
      logoMode: 'custom',
      squareLogo: 'https://example.com/logo.png',
    }
    mockUseTheme.isDark = false
    const { container } = render(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('alt', '')
  })
})
```

Notes:
- The existing `logo-dark` and `logo-light` mocks spread props, so `aria-hidden` flows through.
- `mockUseTheme.appearance` is set inline and deleted in `afterEach` to avoid bleeding into other tests.
- The custom logo test uses `container.querySelector('img')` because `<img alt="">` is a presentational image excluded from `getByRole('img')` by default.
- The `afterEach` in this block cleans up `appearance` but `beforeEach` in the parent already runs `vi.clearAllMocks()` — the `afterEach` here handles the plain object property specifically.

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run --project unit --reporter verbose src/components/Navigation/__tests__/NavigationLogo.test.tsx
```

Expected: FAIL on all three new tests — `aria-hidden` is absent from SVGs; `alt` on the custom logo img is `"EPAM AI/Run Codemie logo"` not `""`.

- [ ] **Step 3: Add `aria-hidden="true"` to SVG logos and change custom logo `alt` to `""`**

In `src/components/Navigation/NavigationLogo.tsx`, update `renderLogo()`:

```tsx
// Before — SVG logos (lines 56-58)
if (isDark) return <LogoFullDarkSvg className="svg-logo-navigation h-[40px] w-[156px]" />
return <LogoFullLightSvg className="svg-logo-navigation h-[40px] w-[156px]" />

// After — SVG logos
if (isDark) return <LogoFullDarkSvg aria-hidden="true" className="svg-logo-navigation h-[40px] w-[156px]" />
return <LogoFullLightSvg aria-hidden="true" className="svg-logo-navigation h-[40px] w-[156px]" />

// Before — custom img (line 51)
<img
  src={customLogo}
  className={cn('h-[40px] object-contain', isExpanded ? 'w-[156px]' : 'w-[39px]')}
  alt="EPAM AI/Run Codemie logo"
/>

// After — custom img
<img
  src={customLogo}
  className={cn('h-[40px] object-contain', isExpanded ? 'w-[156px]' : 'w-[39px]')}
  alt=""
/>
```

Rationale for `alt=""`: the containing `<a>` has `aria-label="EPAM AI/Run Codemie logo"` which is the link's accessible name. A non-empty `alt` on the `<img>` would cause NVDA to announce the image separately. `alt=""` marks it as decorative and suppresses the announcement.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run --project unit --reporter verbose src/components/Navigation/__tests__/NavigationLogo.test.tsx
```

Expected: all tests PASS including the three new accessibility assertions.

- [ ] **Step 5: Run the full Navigation test suite to verify no regressions**

```bash
npx vitest run --project unit --reporter verbose src/components/Navigation
```

Expected: all Navigation tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Navigation/NavigationLogo.tsx
git add src/components/Navigation/__tests__/NavigationLogo.test.tsx
git commit -m "EPMCDME-8455: Hide decorative logo images from assistive technologies in NavigationLogo"
```
