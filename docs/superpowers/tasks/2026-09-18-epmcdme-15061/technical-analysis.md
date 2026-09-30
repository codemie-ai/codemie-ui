# Technical Analysis — EPMCDME-15061

## 1. Task Description

Bug: Analytics page — Toggle Sidebar button overlaps Users information tooltip.
The info tooltip next to the Users filter label is partially covered by the Toggle Sidebar button
at the boundary between the filters panel and the Analytics Dashboard.

## 2. Research Path

filesystem

## 3. Codebase Findings

### Components involved

- `src/pages/analytics/AnalyticsPage.tsx` — Analytics page root; renders `<Sidebar>` with `<AnalyticsFilters>` as its only child
- `src/pages/analytics/components/AnalyticsFilters.tsx` — Filter panel; renders `<FilterAccordionItem label="Users">` wrapping `<AnalyticsUserFilter>`
- `src/pages/analytics/components/AnalyticsUserFilter.tsx` — Users filter UI; renders `<Hint id="analytics-user-filter-hint" hint="..." />` inline in the filter label row
- `src/components/Hint/Hint.tsx` — Shared component; wraps PrimeReact `<Tooltip>` around an `<InfoSvg>` icon. Pre-fix: `appendTo="self"`; post-fix (commit 2ad623f17): `appendTo={() => document.body}`
- `src/components/Tooltip/Tooltip.tsx` — PrimeReact Tooltip thin wrapper; default `appendTo="self"`
- `src/components/Sidebar/Sidebar.tsx` — Sidebar shell; content wrapper has `z-[10] overflow-y-auto`; `<aside>` has `overflow-x-hidden`; ends with `<SidebarToggle />`
- `src/components/Sidebar/SidebarToggle.tsx` — Toggle button; positioned `absolute` with `z-10`; uses `data-tooltip-id="react-tooltip"` for its own tooltip
- `src/utils/tooltip.ts` — Mounts the global react-tooltip singleton at `document.body` with `z-[10000]`

### Root cause chain

1. `Sidebar.tsx:63` — `<aside>` has `overflow-x-hidden`, establishing a clip boundary
2. `Sidebar.tsx:86` — Content div has `z-[10]` (creates stacking context) + `overflow-y-auto` (clips absolutely positioned children)
3. `Hint.tsx` (pre-fix) — PrimeReact Tooltip had `appendTo="self"` → rendered in-place inside the sidebar content div → was clipped by overflow and buried under SidebarToggle's `z-10`
4. Fix (commit 2ad623f17): added `appendTo={() => document.body}` to the PrimeReact Tooltip in `Hint.tsx` → tooltip escapes to body, clears both overflow clip and stacking context

### Existing tests

- `src/components/Sidebar/__tests__/Sidebar.test.tsx` — render + width/collapse tests
- `src/components/Sidebar/__tests__/SidebarToggle.test.tsx` — toggle behavior, aria attributes, keyboard shortcut
- `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx` — interaction logic
- `src/pages/analytics/components/__tests__/AnalyticsFilters.test.tsx` — filter panel state
- **No test file exists for `src/components/Hint/Hint.tsx`**

## 4. Fix Status

Already applied in commit `2ad623f17` on branch `EPMCDME-15061_toggle-sidebar-button-overlaps-tooltip`.
The change is a one-file modification: `appendTo={() => document.body}` added to the PrimeReact Tooltip in `Hint.tsx`.
No schema, routing, store, or API changes involved.

## 5. Layers Touched

- `component` — Hint, Tooltip
- `shared-component` — Sidebar, SidebarToggle

## 6. Risk Indicators

- `src/components/Hint/Hint.tsx` has no test file; the `appendTo={() => document.body}` contract introduced by the fix is unverified by automated tests — a future refactor of `Hint` or the `Tooltip` wrapper could silently revert the behaviour.
- `src/components/Sidebar/Sidebar.tsx:86` retains `z-[10] overflow-y-auto` on the content wrapper; this is the structural root cause and will affect any future sidebar-rendered overlay that does not portal to body.

## 7. Summary

The bug is a CSS stacking-context and overflow-clip problem confined to two shared components. The fix (portaling the Hint tooltip to `document.body`) has already been applied at commit `2ad623f17`. No schema, routing, store, or API changes are involved. The change is global to the `Hint` component so every caller across all pages gets the corrected behaviour automatically.

Remaining gap: `Hint.tsx` has no unit test; the `appendTo` prop is a runtime contract and currently unverified. A regression would be silent until visually observed.
