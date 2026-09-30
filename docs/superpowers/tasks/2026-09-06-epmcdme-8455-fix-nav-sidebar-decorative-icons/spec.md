# Spec: EPMCDME-8455 — Fix decorative icons in the collapsed Navigation Sidebar

## Problem

Decorative SVG images inside interactive elements (NavLink, expand button, logo link) in the
collapsed Navigation Sidebar are exposed to assistive technologies. NVDA can focus them separately
from their parent interactive element using Arrow keys and announces them as "graphic". The fix is
to mark them as decorative so AT skips them entirely.

## Approach

Add `aria-hidden="true"` as a JSX prop at each SVG call site (Vite's `?react` plugin forwards the
prop to the rendered `<svg>` root). For the custom logo `<img>`, change `alt` to `""` — the
parent `<a>` already carries the accessible name via `aria-label`, making the image redundant.

No new components, no SVG asset edits, no state or routing changes.

## Changes

### `src/components/Navigation/NavigationSection/NavigationLink.tsx`

Add `aria-hidden="true"` to the icon wrapper `<div>` (line 92).

The `NavLink`'s accessible name comes from its `<span>` child (always in the DOM, hidden with
`opacity-0` when collapsed). The SVG icon inside the `<div>` is purely decorative in all states.

```tsx
// Before
<div className={cn(...)}>
  <Icon />
</div>

// After
<div aria-hidden="true" className={cn(...)}>
  <Icon />
</div>
```

### `src/components/Navigation/NavigationExpandButton.tsx`

Add `aria-hidden="true"` to `<SidebarSvg>` (line 43).

The `<button>` has `aria-label={navigationExpanded ? 'Hide Menu' : 'Show Menu'}`, so the SVG is
decorative.

```tsx
// Before
<SidebarSvg className={cn(...)} />

// After
<SidebarSvg aria-hidden="true" className={cn(...)} />
```

### `src/components/Navigation/NavigationLogo.tsx`

Two changes in `renderLogo()`:

1. Add `aria-hidden="true"` to `<LogoFullDarkSvg>` and `<LogoFullLightSvg>` (lines 56–57).
2. Change `alt="EPAM AI/Run Codemie logo"` → `alt=""` on the custom logo `<img>` (line 51).

The parent `<a>` carries `aria-label="EPAM AI/Run Codemie logo"`, making both the SVG and the
custom img decorative.

```tsx
// Before — SVG logos
if (isDark) return <LogoFullDarkSvg className="svg-logo-navigation h-[40px] w-[156px]" />
return <LogoFullLightSvg className="svg-logo-navigation h-[40px] w-[156px]" />

// After — SVG logos
if (isDark) return <LogoFullDarkSvg aria-hidden="true" className="svg-logo-navigation h-[40px] w-[156px]" />
return <LogoFullLightSvg aria-hidden="true" className="svg-logo-navigation h-[40px] w-[156px]" />

// Before — custom img
<img src={customLogo} className={cn(...)} alt="EPAM AI/Run Codemie logo" />

// After — custom img
<img src={customLogo} className={cn(...)} alt="" />
```

## Out of scope

- `NavigationMore` — not rendered in `Navigation.tsx`; separate shared utility
- `NavigationPinnedSection`, `NavigationProfile`, `NavigationAssistants` — already correct
- SVG asset source files — no edits needed

## Test coverage

New assertions in three existing test files:

| File | Assertion |
|---|---|
| `NavigationSection/__tests__/NavigationLink.test.tsx` | Icon wrapper `<div>` has `aria-hidden="true"` |
| `__tests__/NavigationExpandButton.test.tsx` | `SidebarSvg` element has `aria-hidden="true"` |
| `__tests__/NavigationLogo.test.tsx` | Dark/light logo SVG has `aria-hidden="true"`; custom `<img>` has `alt=""` |

Existing SVG mocks spread props (`(props) => <svg data-testid="..." {...props} />`), so no mock
changes are needed — the attributes flow through automatically.

## Acceptance criteria

1. NVDA no longer announces Navigation Sidebar icons as "graphic" when navigating the collapsed
   sidebar with Arrow keys.
2. Each interactive element is announced with its accessible name only (label text or `aria-label`
   value).
3. All three affected components have test assertions confirming decorative image attributes.
4. No regression in the existing Navigation test suite.
