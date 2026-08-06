# Technical Research

**Task**: configuration tab resize panel chat sidebar resizable
**Generated**: 2026-07-22T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-9820 — Make the configuration tab in the chat view resizable. The configuration tab is a right-side panel that slides in when clicking the 'Configuration' button in the chat header. It currently has a fixed width. We need to add a drag-to-resize handle on its left edge so users can widen or narrow the panel. The new width should apply immediately with no visual artifacts. Content must reflow gracefully. Other UI areas must not be broken. The user must be able to reset to default width. Session persistence is optional.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/chat/components/ChatConfiguration/ChatConfiguration.tsx` — The panel component itself. Renders an `<aside>` with `id="chat-configuration-panel"`. Width is controlled entirely by Tailwind classes: `w-96 max-w-96` when open, `w-0` when closed. Transition is via `transition-all duration-150 ease-in-out`. An inner `div` is hardcoded to `w-96 pl-2 pr-2`.
- `src/pages/chat/ChatPage.tsx` — The layout host. The `<aside>` is placed as a direct child in a `flex h-full` container alongside the chat content area (`grow min-w-0`). No panel group wrapping today.
- `src/pages/chat/hooks/useChatConfiguration.tsx` — All configuration panel state: `isConfigVisible` (boolean), `toggleConfigVisibility`, `closeConfig`, `openConfigForm`, `closeConfigForm`. Width is not part of this hook's state. No storage of panel dimensions.
- `src/pages/chat/hooks/useChatContext.tsx` — React context that distributes `UseChatConfigReturn` (from `useChatConfiguration`) to child components. Width state would need to be added here or as a new parallel hook.
- `src/pages/chat/components/ChatHeader/ChatHeader.tsx` — Renders the "Configuration" button (`<Button variant="secondary" aria-expanded={isConfigVisible} aria-controls="chat-configuration-panel">`). Calls `attemptToggleConfigVisibility`. A "reset width" button could also live here or on the panel's drag handle.

### Architecture and Layers Affected

| Layer | Component | Impact |
|-------|-----------|--------|
| UI — Panel | `ChatConfiguration.tsx` | Width control, drag handle mount point, inner content width |
| UI — Layout Host | `ChatPage.tsx` | May need `<Group>` wrapper from `react-resizable-panels` if that approach is used |
| State — Hook | `useChatConfiguration.tsx` | Width state + reset callback, or a new co-located `useChatConfigPanel.ts` |
| State — Context | `useChatContext.tsx` / `ChatContextValue` type | Expose panel width and reset to any consumer needing it |
| UI — Header | `ChatHeader.tsx` | Optional: reset-to-default button |

### Integration Points

- **`react-resizable-panels` (v4.11.2)** — Already a project dependency. Two usage sites exist:
  - `src/pages/workflows/WorkflowDetailsPage.tsx` — Uses `Panel` + `Group` (vertical orientation) with `ResizableSeparator`.
  - `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/WorkflowDrawerState.tsx` — Uses `Panel` + `Group` (horizontal orientation).
  - `src/components/ResizableSeparator/ResizableSeparator.tsx` — Shared wrapper around `react-resizable-panels/Separator`. Uses `ew-resize` cursor for horizontal separators.
- **`useWorkflowDrawer` hook** (`src/pages/workflows/details/WorkflowDrawer/useWorkflowDrawer.tsx`) — Established pattern for pixel-based panel resize with `localStorage` persistence via `useDefaultLayout({ id, storage: localStorage })`.
- **`useInputWidth` hook** (`src/hooks/useInputWidth.ts`) — Uses `ResizeObserver` to track element width. Demonstrates the project's established approach to dimension tracking.
- **`src/utils/storage.ts`** — `localStorage`-backed key/value store using compound `userId_key` keys. Used by `useChatConfiguration` for skills and tools config. Same pattern applies if panel width persistence is desired.

### Patterns and Conventions

1. **Panel slide animation**: Currently achieved by switching `w-0` ↔ `w-96 max-w-96` on the `<aside>`. With a resizable panel the width becomes dynamic; the open/close toggle must coexist with a CSS variable or inline `width` style.
2. **`react-resizable-panels` Group approach**: Wrapping the flex container in `<Group orientation="horizontal">` with the main content area as one `<Panel>` and `ChatConfiguration` as another is the established pattern (workflow details page). The `ResizableSeparator` component handles the drag handle visuals. This approach requires the parent layout to become a `Group`.
3. **Custom drag hook approach (alternative)**: A `mousedown`/`mousemove`/`mouseup` hook on a thin `div` placed at the left edge of the `<aside>` can track delta-X and mutate a `panelWidth` state variable. This is lighter but requires manual clamping and cursor management. The `UnifiedBudgetDragBar` (`src/pages/settings/administration/components/UnifiedBudgetDragBar.tsx`) demonstrates this pattern for a multi-segment drag bar — it uses `pointerdown/pointermove/pointerup` events directly.
4. **Tailwind `w-*` vs inline style**: The current `w-96 max-w-96` approach cannot represent dynamic widths. The implementation must switch to either a CSS custom property (`style={{ width: panelWidth }}`) or let `react-resizable-panels` manage the panel size through its own layout engine.
5. **Content reflow**: The inner `div` currently hardcodes `w-96`. It must become `w-full` once the outer `<aside>` width is variable.
6. **Styling rules**: No inline styles is the project's stated preference (`.ai-run/guides/styling/styling-guide.md`), but the `react-resizable-panels` library injects inline `style` on panels itself. The custom drag approach would require `style={{ width: panelWidth }}` which is an exception; teams have accepted this in `WorkflowDrawerState`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/styling/styling-guide.md` — "Tailwind CSS only. No inline styles." Critical constraint: dynamic widths from drag interaction are a known exception via `react-resizable-panels` (library-managed) or via `style={{ width }}` in hooks.
- `.ai-run/guides/components/reusable-components.md` — Catalog of shared components; `ResizableSeparator` is not listed (it is used internally by workflow pages), confirming it is an internal utility not an officially catalogued shared component.
- `.ai-run/guides/patterns/custom-hooks.md` — Defines hook naming, location, and extraction rules. A `useChatConfigPanelWidth` hook in `src/pages/chat/hooks/` or co-located with the component would be correct per the guide.
- `.ai-run/guides/patterns/accessibility-patterns.md` — Requires interactive elements to be keyboard-reachable. Resize handles exposed via `react-resizable-panels` carry ARIA `role="separator"` and keyboard support natively. A custom drag div needs explicit `role="separator"`, `aria-orientation`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and keyboard arrow-key handling.

### Architectural Decisions

- The `WorkflowDetailsPage` established the pattern of using `react-resizable-panels` `<Group>` to wrap co-resident panels within the same flex row. The `ChatPage` layout (`<div className="flex h-full">`) is structurally identical and can follow the same wrapping approach.
- `useWorkflowDrawer` established the pattern of saving panel layout to `localStorage` via `useDefaultLayout({ id: `...-${userId}`, storage: localStorage })` — a per-user key convention that matches `src/utils/storage.ts` compound key usage elsewhere.

### Derived Conventions

- Panel open/close toggle is separate from resize — the `isConfigVisible` boolean controls visibility; width is orthogonal. Both must be preserved.
- When the panel is closed (`isConfigVisible = false`), the width should reset to zero visually (the `<aside>` collapses) but the stored/current width value should be preserved so re-opening restores the last-used width.
- Default panel width in the codebase is `w-96` = 384px (6 × 64px). This is the reset target.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfiguration.test.tsx` — 5 test cases (Vitest + React Testing Library). Tests check: `w-0` class when collapsed, `w-96` class when expanded, loading state switch, assistant form switch, assistant list display. All tests assert specific Tailwind width classes.
- `src/pages/chat/__tests__/ChatPage.test.tsx` — Integration-style test for `ChatPage`. Mocks `useChatConfiguration`; does not test panel dimensions.
- `src/pages/chat/hooks/__tests__/useChatConfiguration.storageGuards.test.ts` — Tests the hook's localStorage storage guard logic.
- `src/pages/chat/hooks/__tests__/useAssistantFeatures.test.ts` — Tests feature flag evaluation; no layout concern.

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1 + `@testing-library/react` 16.3.0 + `@testing-library/jest-dom` 6.6.3.
- **Two test projects**: `unit` (jsdom, mocked Valtio + stores) and `integration` (real Valtio, mocked API). New tests for this feature belong in `unit`.
- **Setup**: `setupTests.tsx` provides mocked `localStorage`, `ResizeObserver`, `IntersectionObserver`, `matchMedia`. All needed globals for testing resize behavior are already stubbed.
- **Mocking pattern**: `vi.hoisted` + `vi.mock` with module factories. Stores are mocked via `useSnapshot` override.
- **Fixture pattern**: Inline `const mock*` objects in `vi.hoisted` block; reset in `beforeEach`.
- **`react-resizable-panels` in tests**: The library requires `getBoundingClientRect` to return non-zero dimensions; jsdom returns zeros. Tests should mock the panel at the `react-resizable-panels` module level or test the hook in isolation from the panel rendering.

### Coverage Gaps

1. `ChatConfiguration.test.tsx` asserts `w-96` class — this test will break once the panel uses dynamic width instead of a Tailwind class. It must be updated to assert the panel renders and has appropriate `aria-*` attributes rather than a specific pixel class.
2. No existing test for the drag handle's presence, interactivity, or keyboard behavior.
3. No test for width persistence to `localStorage` (if implemented).
4. No test for the "reset to default" action.
5. `useChatConfiguration.tsx` hook has no direct unit test (only `storageGuards` is covered); a `useChatConfigPanelWidth` hook extracted from it would need its own test.

---

## 5. Configuration and Environment

### Environment Variables

None identified specifically for this feature. The panel visibility and resize state will be entirely client-side.

### Configuration Files

- `tailwind.config.ts` — Defines the spacing scale and theme tokens. The default width `w-96` = `24rem` = 384px is a standard Tailwind utility. Min/max clamping values should use Tailwind scale units where possible or explicit pixel constants in the hook.
- `vitest.workspace.ts` — Defines `unit` and `integration` test projects; no changes needed.

### Feature Flags and Deployment Concerns

- No feature flag gating is required. This is a pure UI enhancement.
- No server-side or API changes needed.

---

## 6. Risk Indicators

- **Existing `ChatConfiguration.test.tsx` assertions will break** — The 5 existing tests check `w-96` and `w-0` Tailwind classes directly. These will fail once width becomes dynamic (inline style or library-managed). These tests must be updated as part of the implementation.
- **`react-resizable-panels` + jsdom incompatibility** — The library uses `getBoundingClientRect` and `ResizeObserver` to compute pixel sizes; jsdom returns zero. Tests that render a full `<Group>/<Panel>` tree may fail or produce incorrect sizes. Either mock the library in tests or test the hook in isolation.
- **Inner `div` hardcoded to `w-96`** — `ChatConfiguration.tsx` line 48: `<div className="flex flex-col w-96 pl-2 pr-2 h-full">`. This must change to `w-full` or the content will overflow when the panel is narrowed. This is a required change to avoid visual artifacts.
- **Styling guide conflict** — The guide says no inline styles; `react-resizable-panels` injects `style` attributes on panels and so does any `style={{ width: panelWidth }}` approach. The workflow pages already accept this exception; it should be documented in the implementation.
- **Two-approach decision needed** — The `react-resizable-panels` Group approach requires restructuring `ChatPage.tsx` (wrapping the flex row in `<Group>`). The custom drag hook approach leaves `ChatPage.tsx` unchanged but requires manual a11y and cursor work. Neither approach is trivially simpler; the `react-resizable-panels` approach is more consistent with the codebase.
- **`WorkflowExecutionConfiguration` (analog panel in workflows)** — That panel (`src/pages/workflows/details/configuration/WorkflowExecutionConfiguration.tsx`) has the identical `w-96 max-w-96` / `w-0` pattern but is NOT in scope. Care should be taken not to accidentally change it, but the implementation may serve as a future template.
- **Content reflow for `ChatConfigAssistantForm`** — The form within the panel (`ChatConfigAssistants/ChatConfigAssistantForm.tsx`) may have internal fixed-width elements that need audit once the panel is resizable.
- **No min/max constraints defined** — The task does not specify minimum or maximum panel widths. Clamping values must be decided during implementation (suggest: min ~280px, max ~640px, default 384px).

---

## 7. Summary for Complexity Assessment

This task touches a focused set of files: the `ChatConfiguration.tsx` panel component, its parent `ChatPage.tsx` layout, the `useChatConfiguration` hook (or a new sibling hook), and the existing `ChatConfiguration.test.tsx` test suite that will require updates. The architectural layers involved are: UI component, layout host, React state hook, and (optionally) localStorage persistence. No API, store, or server-side changes are needed.

The primary technical risk is choosing between two valid approaches. The `react-resizable-panels`-based approach (`<Group>` wrapping in `ChatPage.tsx` + `Panel` + `ResizableSeparator`) is a direct extension of the pattern already used in `WorkflowDetailsPage.tsx` and `useWorkflowDrawer.tsx`, giving it strong precedent and built-in keyboard/ARIA support. The downside is it requires restructuring `ChatPage.tsx`'s flex row into a panel group. The custom-drag-hook approach (similar to `UnifiedBudgetDragBar`) is more surgical but requires manual pointer event handling, cursor management, clamping, and a full ARIA implementation for the separator. Given the existing `ResizableSeparator` component and `useWorkflowDrawer` precedent, the library approach is lower risk.

The test coverage posture is mixed. Five unit tests exist for `ChatConfiguration`, but they will all require updates because they directly assert Tailwind width class names that will no longer apply once width is dynamic. The testing infrastructure (mocked `localStorage`, `ResizeObserver`, jsdom) is adequate, but `react-resizable-panels` in jsdom may require module-level mocking. The "reset to default width" requirement adds one new test case. Overall complexity is moderate: established patterns exist, the surface area is small, but test migrations and the approach decision add non-trivial work.
