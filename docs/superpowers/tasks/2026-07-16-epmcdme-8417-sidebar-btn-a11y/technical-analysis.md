# Technical Research

**Task**: sidebar toggle button accessibility aria-label a11y
**Generated**: 2026-07-16T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Fix EPMCDME-8417: The Hide Sidebar/Open Sidebar toggle button does not have an accessible name and does not change it after activation. Bug details: The sidebar toggle button does not have an accessible name — NVDA screen reader announces it as 'clickable' when focused via Arrow keys. After activating the button, the updated name and role is not announced by the screen reader. Expected: button should have aria-label of 'Hide Sidebar' when sidebar is expanded, and 'Open Sidebar' when sidebar is collapsed. After activation, screen reader should announce 'Open Sidebar, button' or 'Hide Sidebar, button' accordingly.

---

## 2. Codebase Findings

### Existing Implementations

- `/src/components/Sidebar/SidebarToggle.tsx` — The toggle button component. Renders a `<button type="button">` absolutely positioned on the left edge of the sidebar. Already has `aria-label={isOpen ? 'Hide Sidebar' : 'Open Sidebar'}` on line 60. The icon (`ChevronLeftSvg`) already has `aria-hidden="true"`.
- `/src/components/Sidebar/Sidebar.tsx` — Parent `<aside>` wrapper. Renders `<SidebarToggle />` as a child. Tracks `isVisible` state via a `subscribe(appInfoStore, ...)` call. Does not currently set `aria-expanded` or `aria-controls` on the aside.
- `/src/components/Sidebar/index.ts` — Re-exports `Sidebar` as default.
- `/src/store/appInfo.ts` — Valtio `proxy` store. Owns `sidebarExpanded: boolean`, persisted to `localStorage` under key `codemie-sidebar-expanded`. Exposes `toggleSidebar()` which flips the boolean and persists it.
- `/src/hooks/useSidebarOffsetClass.ts` — Derives a Tailwind offset class for the toggle button's `left` position based on both `sidebarExpanded` and `navigationExpanded`. Returns `null` until mounted; the toggle button renders nothing when `sidebarOffsetClass` is null (prevents flash on first render).

### Architecture and Layers Affected

- **UI Component layer**: `SidebarToggle.tsx` and `Sidebar.tsx` — the only files that need changes.
- **State layer**: `appInfoStore` in `src/store/appInfo.ts` — valtio proxy, no changes needed for this bug fix; state is already correct.
- **Hook layer**: `useSidebarOffsetClass` — no changes needed.

### Integration Points

- `SidebarToggle` subscribes to `appInfoStore` via valtio `subscribe()` (not `useSnapshot`). This is the root cause of the a11y announcement problem (see Risk Indicators).
- `Sidebar` also uses raw `subscribe()` rather than `useSnapshot`. Both components maintain local `useState` mirrors of the store value and manually call `setIsOpen`/`setIsVisible` from within the subscribe callback.
- The toggle button is rendered **inside** the `<aside>` element in `Sidebar.tsx`, which means `aria-controls` on the button could reference the aside's `id` to give screen readers the relationship.

### Patterns and Conventions

- **State-dependent aria-label**: `FavoriteButton` (`/src/components/FavoriteButton/FavoriteButton.tsx`, line 44) and `MarkdownEditor` (`/src/components/form/MarkdownEditor/MarkdownEditor.tsx`, line 239) both follow the same pattern: `aria-label={condition ? 'Label A' : 'Label B'}`. This is the established project convention.
- **aria-expanded on disclosure buttons**: `NavigationPinnedSection`, `OverflowButton`, `NavigationMore`, `ThoughtHeader`, and `TooltipButton` all use `aria-expanded={booleanState}` on their toggle buttons. This is the correct ARIA pattern for a button that shows/hides a region.
- **useSnapshot vs subscribe**: `NavigationExpandButton` (the analogous navigation toggle) uses `useSnapshot(appInfoStore)` from valtio for reactive rendering. `SidebarToggle` currently uses the older `subscribe` + local `useState` pattern instead, which can cause stale renders.
- **Icon accessibility**: All toggle buttons with icon-only content pair `aria-hidden="true"` on the SVG with a descriptive `aria-label` on the button. `SidebarToggle` already follows this.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guides found specifically for accessibility patterns. Conventions are derived from code exploration below.

### Architectural Decisions

- Valtio is the project's state management library (`proxy`, `subscribe`, `useSnapshot`). The preferred reactive pattern for components is `useSnapshot` rather than manual `subscribe` + `useState` (evidenced by `NavigationExpandButton` and other newer components).
- No ADR or inline decision comment was found for the subscribe-vs-useSnapshot choice in `SidebarToggle`.

### Derived Conventions

- Toggle buttons that show/hide a panel should carry both `aria-label` (describing the action, changing on state) and `aria-expanded` (describing the current state of the controlled region).
- SVG icons inside buttons should be `aria-hidden="true"`.
- `useSnapshot` is the preferred valtio hook for reactive component re-renders.

---

## 4. Testing Landscape

### Existing Coverage

- **No test file exists** for `SidebarToggle` or `Sidebar`. The `/src/components/Sidebar/` directory contains only three files: `SidebarToggle.tsx`, `Sidebar.tsx`, `index.ts` — no `__tests__` subdirectory.
- `NavigationExpandButton.test.tsx` (`/src/components/Navigation/__tests__/NavigationExpandButton.test.tsx`) is the closest analogue. It covers: rendering, button type, icon presence, click handler, state-dependent text, icon rotation, tooltip attributes, and state-change re-renders. This file is the direct template for a new `SidebarToggle.test.tsx`.

### Testing Framework and Patterns

- **Framework**: Vitest + `@testing-library/react` + `@testing-library/user-event`.
- **Valtio mocking**: Tests mock the entire `valtio` module (`vi.mock('valtio', ...)`) returning a stub `proxy`, `useSnapshot`, and `subscribe`. The `appInfoStore` module is separately mocked with a plain object carrying the initial state.
- **SVG mocking**: Icon imports (e.g. `*.svg?react`) are mocked via `vi.mock` to return a simple `<svg data-testid="...">` element.
- **Assertion style**: `expect(element).toHaveAttribute('aria-label', 'value')` and `expect(element).toHaveClass(...)` are used. `getByRole('button')` is the standard selector.

### Coverage Gaps

- `SidebarToggle` has zero test coverage.
- The `aria-label` correctness (both initial state and post-toggle state) is untested.
- The keyboard shortcut handler (`Ctrl+B`) is untested.
- The conditional render (returns nothing when `sidebarOffsetClass` is null) is untested.

---

## 5. Configuration and Environment

### Environment Variables

None. Sidebar state is persisted to `localStorage` under the key `codemie-sidebar-expanded` (default: `'true'`). No environment variable governs sidebar behavior.

### Configuration Files

- `appInfoStore` (`/src/store/appInfo.ts`) — the single source of truth for sidebar expanded state.

### Feature Flags and Deployment Concerns

None identified. No feature flag gates the sidebar toggle functionality.

---

## 6. Risk Indicators

- **`aria-label` is already present in the source** (`SidebarToggle.tsx` line 60). The bug report states the button has no accessible name. This discrepancy suggests either: (a) the `aria-label` was added on the current branch (`EPMCDME-8417_sidebar_btn_a11y`) as part of a prior partial fix, or (b) a rendering/hydration issue means the attribute is not reliably applied when `sidebarOffsetClass` is null on first render and the button is conditionally not mounted. Verify against the `main` branch diff before assuming the fix is complete.
- **`subscribe` instead of `useSnapshot`**: `SidebarToggle` uses `subscribe(appInfoStore, callback)` outside a `useEffect`, called on every render. This creates multiple subscriptions on re-renders and is not cleaned up (no return of an unsubscribe function at the component level — only the keydown handler is cleaned up). This may cause stale or missed updates, which would explain why the screen reader does not see the updated label after activation.
- **Missing `aria-expanded`**: The button currently only sets `aria-label`. WCAG success criterion 4.1.2 and the ARIA spec for disclosure buttons also recommend `aria-expanded` to communicate the current state of the controlled region to assistive technology. Without it, screen readers may not announce the state change even if the label updates.
- **Missing `aria-controls`**: The button has no `aria-controls` attribute linking it to the `<aside>` it controls. This is a secondary gap but improves screen reader navigation.
- **No test coverage for `SidebarToggle`** — any fix cannot be regression-protected without new tests.
- **`useSidebarOffsetClass` returns `null` on initial render** — the button is not mounted at all until the hook resolves, meaning a screen reader that scans on load would not find the button. This is a minor timing gap, not a functional bug, but worth noting.

---

## 7. Summary for Complexity Assessment

The fix touches a single component (`SidebarToggle.tsx`, ~85 lines) and potentially its parent (`Sidebar.tsx`, ~72 lines). The state management layer (`appInfoStore`) requires no changes. The fix is confined to two files in the UI component layer with no cross-module impact.

The core a11y issue has two dimensions. First, the `aria-label` attribute is already coded in the current branch but may not be surfaced correctly because of the `subscribe`-outside-`useEffect` pattern — replacing it with `useSnapshot` (as used in `NavigationExpandButton`) would make the component fully reactive and ensure React re-renders on store changes, which in turn forces assistive technology to observe the updated accessible name. Second, adding `aria-expanded` to the button is a straightforward one-line addition that follows an established project pattern used in at least five other components.

Test coverage for `SidebarToggle` is completely absent, so new tests must be written from scratch. The `NavigationExpandButton.test.tsx` file is a near-exact structural template: it mocks `valtio`, mocks `appInfoStore`, and covers the same state-dependent label/icon/attribute assertions that a `SidebarToggle.test.tsx` would need. Overall complexity is low — the implementation change is 2–5 lines; the test addition is the majority of the work (~60–80 lines following the existing template).
