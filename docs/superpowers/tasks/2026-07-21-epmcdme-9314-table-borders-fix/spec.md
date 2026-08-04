# Spec: EPMCDME-9314 — Fix table borders/sliders on Integrations and Data Sources pages

## Problem

Three visual bugs affect the `Table` component used on both the Integrations and Data Sources pages:

1. **Horizontal scrollbar invisible (Chrome/Safari)**: The table's horizontal scroll container (`overflow-auto` div inside `Table.tsx`) lacks the `show-scroll` class. A global WebKit rule in `main.scss` hides all scrollbars on descendants of `#app` unless they carry `.show-scroll`. The result is an invisible horizontal scrollbar in Chrome/Safari; in Firefox it renders as an unstyled native bar.

2. **Horizontal scrollbar hidden behind the fixed pagination bar**: Even after adding `.show-scroll`, the scroll container auto-sized to include the table's `mb-[80px]` bottom margin, pushing the scroll container's bottom edge (and thus the scrollbar track) behind the fixed `Pagination` component (`z-40`). The `mb-[80px]` on the `<table>` was intended to reserve pagination space within the scrollable area, but it inflated the scroll container height so its bottom sat below the pagination top.

3. **Pagination bar flashes misaligned on initial mount**: `useSidebarOffsetClass` initializes state to `null`. The `update()` logic runs inside `useEffect`, which fires after the first render. For one render cycle the fixed `Pagination` bar has no `left-*` class and spans full-width from the viewport's left edge.

All three issues manifest on Integrations (UserSettings, ProjectSettings tabs) and Data Sources because all three views share the same `Table` component.

## Acceptance Criteria

- Horizontal scrollbar on the table is visible and styled (matches the `.show-scroll` style in `main.scss`) in Chrome, Firefox, and Safari on both affected pages.
- Horizontal scrollbar track is accessible above the fixed pagination bar — not hidden behind it.
- Scrolling within the table moves only table content; the page, sidebar, and filters panel remain fixed (no page-level horizontal overflow).
- Pagination bar renders at the correct left offset from the first mount — no flash or jump visible.
- No regression on other pages that use `Table` (e.g. any page with `embedded={true}` must not gain a scrollbar or change height).

## Solution

### Fix 1 — `src/components/Table/Table.tsx`: add `show-scroll`

Add `show-scroll` to the non-embedded scroll container class:

```tsx
// Before
<div className={cn('w-full grow', { 'overflow-auto min-h-[300px]': !embedded })}>

// After
<div className={cn('w-full grow', { 'overflow-auto min-h-[300px] show-scroll': !embedded })}>
```

`embedded` tables do not render the scroll container with `overflow-auto`, so they are unaffected.

### Fix 2 — `src/components/Table/Table.tsx`: move pagination reserve outside the scroll container

The root cause of the scrollbar-behind-pagination issue was `mb-[80px]` on the `<table>` element living *inside* the `overflow-auto` container. This inflated the scroll container's auto-sized height so its bottom edge extended behind the fixed pagination bar.

Fix: remove `mb-[80px]` from the `<table>` and add `pb-20` to the outer wrapper instead. The padding-bottom sits *outside* the scroll container in the layout, reserving the same 80px for the pagination zone without affecting the scroll container height:

```tsx
// Before
<div className="w-full relative flex flex-col">
  ...
  <table className={cn('mt-4 ... mb-[80px]', ...)}>

// After
<div className={cn('w-full relative flex flex-col', { 'pb-20': !embedded && !!pagination })}>
  ...
  <table className={cn('mt-4 ...', ...)}>
```

`pb-20` only applies when the fixed pagination bar is present (`!embedded && !!pagination`), leaving embedded tables and pagination-free tables unchanged.

### Fix 3 — `src/hooks/useSidebarOffsetClass.ts`

Extract the offset computation into a pure helper and initialize state from it synchronously:

```ts
const computeOffsetClass = (): string => {
  if (!appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded) return 'left-navbar'
  if (appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded)
    return 'left-[calc(theme(spacing.navbar)+theme(spacing.sidebar))]'
  if (!appInfoStore.sidebarExpanded && appInfoStore.navigationExpanded)
    return 'left-navbar-expanded'
  return 'left-[calc(theme(spacing.navbar-expanded)+theme(spacing.sidebar))]'
}

// Initialize synchronously from current store state — eliminates the null-on-first-render flash
const [offsetClass, setOffsetClass] = useState<string>(() => computeOffsetClass())
```

The `update()` body becomes `setOffsetClass(computeOffsetClass())`. The Valtio subscription and `useEffect` wiring are unchanged. The type narrows from `string | null` to `string`.

## Scope

| File | Change |
|---|---|
| `src/components/Table/Table.tsx` | Add `show-scroll` to scroll container; add `pb-20` to outer wrapper when paginated; remove `mb-[80px]` from table |
| `src/hooks/useSidebarOffsetClass.ts` | Extract `computeOffsetClass`, change `useState` init (4–6 lines) |

No new dependencies, no config changes, no new components.

## Verification

Manual visual check in Chrome and Firefox on:
- Integrations page → UserSettings tab
- Integrations page → ProjectSettings tab
- Data Sources page

Confirm:
- At a viewport narrower than the table's full column width, a styled horizontal scrollbar track is visible at the bottom of the table, clearly above the pagination bar.
- Scrolling horizontally moves only the table content — sidebar, filters, and header remain fixed.
- Pagination bar shows at the correct left offset on first page load with no full-width flash.
- Pages using `<Table embedded={true}>` have no scrollbar and no height change.
