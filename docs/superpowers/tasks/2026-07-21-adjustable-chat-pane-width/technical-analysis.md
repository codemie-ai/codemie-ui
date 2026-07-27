# Technical Research

**Task**: sidebar chat pane resizable width react-resizable-panels
**Generated**: 2026-07-21
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-10137: Allow adjustable width for the chat pane to improve chat discoverability. Currently the chat pane on the left side is too narrow, making it difficult for users to locate the right chat, especially when chat titles exceed the visible width. Increasing the width or allowing users to adjust the pane size will improve usability and navigation efficiency.

Preconditions: User is logged into the application. The chat pane is visible on the left sidebar.

Scenarios of Use:
1. User hovers over the border separating the chat pane from the main area.
2. User is able to click and drag the border to adjust the width of the chat pane.
3. User can expand the pane to view longer chat titles.
4. User can reduce the width to reclaim more workspace if desired.

Expected Result: The chat pane width is resizable by the user. Adjustments persist for the session or as preferred.

Acceptance Criteria:
- Chat pane width can be adjusted by dragging its border.
- Minimum and maximum widths are enforced to preserve UI stability.
- Pane width persists at least for the session.
- No loss of functionality or information in chat navigation when resizing.

Prior manual research already exists (from a previous session) pointing at these locations — verify and expand on these, don't just repeat them at face value:
- Fixed width: src/components/Sidebar/Sidebar.tsx:44-57 uses Tailwind tokens w-sidebar/max-w-sidebar, defined as sidebar: '308px' in tailwind.config.ts:547
- react-resizable-panels (^4.11.2) already a dependency, used for Workflows drawer: src/pages/workflows/WorkflowDetailsPage.tsx:17,218 (Panel/Group, onResize)
- src/components/ResizableSeparator/ResizableSeparator.tsx — existing Tailwind-styled drag-handle wrapping the lib's Separator
- src/pages/workflows/details/WorkflowDrawer/useWorkflowDrawer.tsx:22-84 — precedent hook: useDefaultLayout, min/collapsed sizes, save-before-collapse/restore-on-expand, per-user localStorage persistence (DRAWER_SIZE_STORAGE_KEY, keyed by userId)
- Collapse/expand: SidebarToggle.tsx (Ctrl+B) toggles appInfoStore.sidebarExpanded (src/store/appInfo.ts), consumed by Sidebar.tsx and useSidebarOffsetClass.ts
- Styling: Tailwind only, no styled-components/CSS modules

Please verify these findings against current source, identify exact line numbers/current state (code may have moved since the prior research), and identify any additional risk areas: other places that reference the fixed sidebar width (e.g. main content offset calculations, responsive breakpoints, tests), and concrete min/max width value recommendations based on what similar precedent (useWorkflowDrawer) uses.

---

## 2. Codebase Findings

### Existing Implementations

- `src/components/Sidebar/Sidebar.tsx` (72 lines) — generic sidebar shell, sole consumer is `ChatSidebar`. Fixed width applied at line 50 (`'w-sidebar max-w-sidebar': isVisible`, `'w-0': !isVisible`) and line 57 (`min-w-sidebar w-sidebar max-w-sidebar` on inner div). `isVisible` (lines 34, 38) mirrors `appInfoStore.sidebarExpanded` via manual `subscribe`. Renders `<SidebarToggle />` at line 67.
- `src/pages/chat/components/ChatSidebar/ChatSidebar.tsx` (110 lines) — **the actual chat pane in scope for this ticket**; wraps `Sidebar` (line 52), title "Chats", new-chat button, assistants/workflows shortcuts, search, `ChatSidebarLists`.
- `tailwind.config.ts` — width token `sidebar: '308px'` at line 547 (spacing scale), alongside `'workflow-exec-sidebar': '308px'` (line 544), `'sidebar-collapsed': '380px'` (line 542, "72px navbar + 308px sidebar"), `'sidebar-expanded': '505px'` (line 543, "196px navbar-expanded + 309px sidebar"). Separate `sidebar` *color* tokens exist at lines 224, 308, 326 (unrelated). `boxShadow.sidebar` at line 539. `transitionProperty.width = 'width'` exists (enables `transition-width`, useful for smooth resize animation, but not needed for drag-resize itself).
- `src/pages/workflows/WorkflowDetailsPage.tsx` — precedent usage of `react-resizable-panels`. Imports `Panel, Group` (line 17), `ResizableSeparator` (line 21), `useWorkflowDrawer`/`MIN_COLLAPSED_SIZE` (line 38). JSX at lines 188–232: `<Group orientation="vertical" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged}>` wraps a `Panel` (`defaultSize={75} minSize={53}`), `<ResizableSeparator orientation="vertical" />`, and a second `Panel` with `panelRef`, `defaultSize={25}`, `minSize={MIN_COLLAPSED_SIZE}`, `collapsible`, `collapsedSize={MIN_COLLAPSED_SIZE}`, `onResize={handleResize}`.
- `src/pages/workflows/details/WorkflowDrawer/useWorkflowDrawer.tsx` (84 lines) — **the hook pattern to replicate**. Exports `MIN_COLLAPSED_SIZE = 50` (line 22). Local consts `DRAWER_SIZE_STORAGE_KEY = 'workflow-drawer-size'` (23), `MIN_EXPANDED_SIZE = 150` (24). Uses `useDefaultLayout({ id: \`workflow-drawer-${userId}\`, storage: localStorage })` (33–36) from the lib for auto layout persistence, plus manual `localStorage.setItem/getItem` keyed by `${DRAWER_SIZE_STORAGE_KEY}-${userId}` (54, 67) to remember pre-collapse size and restore on expand. `handleResize` (38–46) flips `isDrawerExpanded` based on `panelSize.inPixels <= MIN_COLLAPSED_SIZE`. `handleDrawerExpandChange` (48–74) imperatively calls `panelRef.current?.expand()/resize()/collapse()` via `PanelImperativeHandle`.
- `src/components/ResizableSeparator/ResizableSeparator.tsx` (35 lines) — thin Tailwind wrapper around the lib's `Separator`; prop `orientation: 'horizontal' | 'vertical'`. Vertical = `ns-resize` cursor (panel-stacking axis for horizontal splitter); horizontal = `ew-resize` cursor (line 30). **For a left-sidebar/main-area split, use `orientation="horizontal"`** (gives the `ew-resize` left-right drag cursor) — note the naming refers to panel-stacking axis, not cursor direction; easy to get backwards.
- `src/store/appInfo.ts` — `sidebarExpanded: boolean` field (line 50) in `AppInfoStoreType`; persisted via `SIDEBAR_EXPANDED_KEY = 'codemie-sidebar-expanded'` (line 26); `getStoredSidebarExpanded()` (30–31, default `'true'`); actions `toggleSidebar()` (237–240) and `setIsSidebarExpanded()` (242–247), both plain localStorage read/write (not `useDefaultLayout`).
- `src/components/Sidebar/SidebarToggle.tsx` (84 lines) — Ctrl+B/Cmd+B shortcut (lines 26, 33) calls `appInfoStore.toggleSidebar()`; positioned via `useSidebarOffsetClass()` (line 50).
- `src/hooks/useSidebarOffsetClass.ts` (46 lines) — computes a Tailwind class for absolute-positioned elements' `left` offset, hardcoding `theme(spacing.sidebar)` in two branches (lines 28, 32).
- `src/utils/helpers.ts` lines 359–381 — `getSidebarMaxWidthClass()` and `getSidebarOffsetClass()`, both hardcode `theme(spacing.sidebar)` (362, 366, 374, 378) — duplicate logic vs. the hook above, same fixed-width assumption.
- `src/components/appLevel/Gradient.tsx` line 28 — consumes `getSidebarMaxWidthClass()` to size a background gradient overlay's max-width; would go stale if sidebar width becomes dynamic.
- `src/pages/workflows/details/WorkflowExecutions/WorkflowExecutions.tsx` lines 34, 73 — separate, unrelated fixed sidebar (`w-workflow-exec-sidebar`) gated by the same `sidebarExpanded` boolean and coincidentally the same 308px value via its own token — do not conflate with the chat pane change.
- `src/pages/chat/components/ChatHeader/ChatHeader.tsx` lines 43, 94 — reads `sidebarExpanded` to conditionally render a "show sidebar" affordance; only depends on the boolean, not the width value, so likely unaffected by resize.
- `src/hooks/useReactFlowDnD.tsx` line 103 — reads `sidebarExpanded` for workflow-canvas DnD offset math; boolean dependency only, unrelated page, low risk but worth a final check.
- `package.json` — confirmed `"react-resizable-panels": "^4.11.2"` (line 81), `"valtio": "2.1.5"` (line 90), `"tailwindcss": "3.4.17"` (line 125), `"tailwindcss-themer": "4.1.1"` (line 126). No `zustand` in the repo — valtio is the sole state-management library.

### Architecture and Layers Affected

- **Presentation/shell**: `Sidebar.tsx` (generic wrapper) and `ChatSidebar.tsx` (chat-specific consumer) — width classes live here.
- **Resize mechanics**: `react-resizable-panels` (`Group`, `Panel`, `Separator`) plus the local `ResizableSeparator.tsx` wrapper.
- **Resize orchestration hook**: new hook mirroring `useWorkflowDrawer.tsx` (e.g. `useChatSidebarResize` or similar), colocated near `ChatSidebar`.
- **Global app state (valtio)**: `appInfoStore` — `sidebarExpanded` boolean, toggle/persist actions; a new `sidebarWidth`-related field is a natural extension point, or width can live purely in the resize hook + `useDefaultLayout`'s own localStorage persistence (as `useWorkflowDrawer` does).
- **Derived-offset utilities**: `useSidebarOffsetClass.ts`, `helpers.ts` (`getSidebarMaxWidthClass`, `getSidebarOffsetClass`) — consumers of the fixed-width Tailwind token; these must be updated to use a runtime value (CSS custom property or inline style) since Tailwind `theme()` values are compile-time constants and can't reflect a drag-adjusted width.
- **Styling/tokens**: `tailwind.config.ts` spacing scale (`sidebar: '308px'` and derived tokens).

### Integration Points

- `react-resizable-panels@^4.11.2` — internal dependency, already used for `WorkflowDrawer`; reuse rather than add anything new.
- Cross-file dependents on the fixed sidebar width token or `sidebarExpanded` boolean (risk of missed offset updates): `Sidebar.tsx:50,57`, `SidebarToggle.tsx:25,35,44,46-48`, `useSidebarOffsetClass.ts:25-32`, `helpers.ts:359-381`, `Gradient.tsx:28`, `appInfo.ts:26,30-31,50,237-247`, `ChatHeader.tsx:43,94`, `WorkflowExecutions.tsx:34,73` (separate sidebar, same value, don't conflate), `useReactFlowDnD.tsx:103`, `tailwind.config.ts:542-547`.
- No CSS custom property (`--sidebar-width` or similar) currently exists for sidebar width — introducing one is the cleanest way to keep `Gradient.tsx`/`helpers.ts` offset math in sync with a runtime-variable width, since compile-time Tailwind tokens can't express a drag-adjusted value.

### Patterns and Conventions

- react-resizable-panels v4 API: `<Group orientation="horizontal|vertical" defaultLayout onLayoutChanged>` + `<Panel id defaultSize minSize collapsible collapsedSize onResize panelRef>` + `<Separator>` (wrapped locally as `ResizableSeparator`).
- `useDefaultLayout({ id, storage })` from the library auto-persists/restores the whole group layout per `id` — this is the built-in session-persistence mechanism; `useWorkflowDrawer` keys it `workflow-drawer-${userId}`, so the chat pane should use an analogous `chat-sidebar-${userId}` id.
- Additional manual min/max enforcement beyond `minSize`/`maxSize` props: `MIN_COLLAPSED_SIZE`/`MIN_EXPANDED_SIZE` constants plus `PanelImperativeHandle.resize()/collapse()/expand()/getSize()` calls.
- Collapse state kept in local React state (`isDrawerExpanded`), driven by an `onResize` threshold check (`panelSize.inPixels <= MIN_COLLAPSED_SIZE`), separate from but analogous to the app-wide valtio `sidebarExpanded` boolean already used for the chat sidebar's expand/collapse (Ctrl+B) toggle — the two mechanisms (drag-resize state vs. show/hide toggle) will need reconciling so Ctrl+B and drag-resize don't fight each other.
- Styling is 100% Tailwind utility classes via `cn()`/`classNames()` helpers — no CSS modules or styled-components anywhere in this domain.
- Local storage key-naming is inconsistent across the codebase (see Section 5) — `useWorkflowDrawer` uses `${KEY}-${userId}` (hyphen suffix), the shared `src/utils/storage.ts` utilities use `${userId}_${key}` (underscore prefix), and `appInfo.ts` uses flat global keys with no userId. Recommend following the `useWorkflowDrawer` precedent exactly, since it's the direct pattern this ticket extends, while noting it's not the dominant convention.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/state-management.md` — high relevance. Mandates Component → Store → API layering, valtio `proxy` stores in `src/store/`, `useSnapshot` in components, never mutate the snapshot directly. Applies directly to any new width-persistence state.
- `.ai-run/guides/components/component-organization.md` — high relevance. Directory placement rules (shared vs. page-scoped), 300-line hard cap per file, extract `use<Name>.ts` hook when logic grows, `index.ts` re-export pattern.
- `.ai-run/guides/architecture/architecture.md` — checked, no sidebar/resize-specific content.
- `.ai-run/guides/styling/styling-guide.md`, `.ai-run/guides/theme-management.md` — exist but not read in depth; likely relevant for drag-handle styling conventions (see `ResizableSeparator` for the existing precedent).
- Correction to AGENTS.md assumption: this repo's `.ai-run/guides/` is **not** backend-only — it has dedicated frontend categories (`architecture/`, `components/`, `development/`, `patterns/`, `styling/`, `testing/`).

### Architectural Decisions

- No ADR/DECISION-marked files found anywhere in the repo.
- A task folder for this exact ticket already exists at `docs/superpowers/tasks/2026-07-21-adjustable-chat-pane-width/.state.json` (flow `sdlc-light`, branch `EPMCDME-10137_adjustable-chat-pane-width`, phase `main`) — contains only the state file, no prior spec/plan or recorded decisions.

### Derived Conventions

- State management: **valtio** (`proxy` + `useSnapshot`), not Zustand/Redux/Context. `appInfoStore` already holds `sidebarExpanded` persisted via localStorage under `codemie-sidebar-expanded` — same pattern should extend to any new width-related state if it needs to live in global store rather than a local hook.
- Resizing precedent: `react-resizable-panels` v4 already used for `WorkflowDrawer`, demonstrating `useDefaultLayout`, `PanelImperativeHandle` ref, `MIN_COLLAPSED_SIZE`/`MIN_EXPANDED_SIZE` constants, `handleResize`/`onLayoutChanged` callbacks, manual localStorage save/restore keyed by userId.
- Shared drag-handle component `ResizableSeparator.tsx` should be reused rather than building a new one.
- Chat sidebar (`ChatSidebar.tsx`) is currently **not** wrapped in any `Panel`/`Group` — no existing width-resize wiring exists for it; this is new integration work using `WorkflowDrawer` as the template, not a refactor of existing resize code.
- Component organization: hook logic extracted into `use<ComponentName>.ts` (e.g. `useWorkflowDrawer.tsx`), directory-scoped under `src/pages/<feature>/components/` or `src/components/<Component>/`.

---

## 4. Testing Landscape

### Existing Coverage

- `Sidebar.tsx` — zero test coverage, no `__tests__` directory under `src/components/Sidebar/`.
- `ResizableSeparator.tsx` — zero test coverage.
- `useWorkflowDrawer.tsx` — zero test coverage (sibling dirs `WorkflowDrawerList/`, `WorkflowDrawerState/` do have `__tests__`, but the hook itself does not).
- `appInfo.ts` (appInfoStore) — zero test coverage, despite `src/store/__tests__/` containing ~18 tests for other stores. This is notable: it already holds the exact localStorage-backed boolean pattern (`sidebarExpanded`/`SIDEBAR_EXPANDED_KEY`) this ticket's width persistence would extend, but there's no existing test to model a new test on.
- `WorkflowDetailsPage.tsx` — zero test coverage.
- No test anywhere in the repo exercises `react-resizable-panels`' `Panel`/`PanelGroup`/`onResize`/`onCollapse` behavior — zero test files reference the library despite 5+ source files using it.
- `src/pages/chat/__tests__/ChatPage.test.tsx:108` — mocks `ChatSidebar` entirely (`vi.mock`), so no coverage of sidebar width/resize behavior via that entry point either.
- `src/components/appLevel/__tests__/Gradient.test.tsx:22,104,109,112` — mocks and asserts `getSidebarMaxWidthClass()` output; **will need updating** if that function's behavior changes for a resizable chat sidebar.
- `src/pages/workflows/__tests__/WorkflowDetailsPage.integration.test.tsx:143` — has a `describe('Execution Sidebar', ...)` block; useful as an integration-test template for resize/collapse behavior, though it targets the (different) execution drawer, not the chat pane.

### Testing Framework and Patterns

- vitest 1.6.1, `@testing-library/react` 16.3.0, `@testing-library/jest-dom` 6.6.3, `@testing-library/user-event` 14.6.1, `@vitest/coverage-istanbul` 1.6.1.
- Two vitest projects: `unit` and `integration` (`vite.config.ts`, scripts `test:unit`/`test:integration`), with separate setup files `src/setupTests.tsx` (shared, jsdom), `src/setupTests.unit.ts`, `src/setupTests.integration.ts`.
- `src/setupTests.tsx:79` globally mocks `global.ResizeObserver` — a prerequisite for `react-resizable-panels` to function in jsdom, already satisfied.
- Store test pattern (`src/store/__tests__/userSettings.test.ts`): `vi.mock('@/utils/api', ...)`, reset singleton valtio state manually in `beforeEach`, `vi.clearAllMocks()`/`vi.restoreAllMocks()` in `afterEach`.
- Hook + localStorage pattern (`src/hooks/__tests__/useSearchHistory.test.ts`): `localStorage.clear()` in `beforeEach`, direct assertions against real jsdom `Storage` (not a mock library), `renderHook`/`act` from RTL, `vi.mock('@/store/user', ...)` for dependent stores.
- Integration tests seed localStorage directly (`localStorage.setItem(key, JSON.stringify(...))`) before render to simulate persisted state.
- No factory/builder library — fixtures are inline object literals per test file.

### Coverage Gaps

- No established pattern anywhere for simulating drag-resize or asserting min/max width enforcement on `Panel`/`Group` — will need to be built from scratch for this ticket, though the `ResizeObserver` jsdom prerequisite is already in place.
- No precedent test for a new width-persistence localStorage key, despite `appInfoStore`'s existing `sidebarExpanded` pattern being directly analogous.

---

## 5. Configuration and Environment

### Environment Variables

None identified specific to sidebar/layout — this is purely client-side UI state, no env-var involvement.

### Configuration Files

- `tailwind.config.ts` — width tokens (see below) and breakpoints (`theme.extend.screens`): `card-grid-2: 1300px`, `card-grid-3: 1600px`, `view-details-bp: 1200px` — none tie to sidebar width; no mobile/collapse-on-small-screen media query found tied to the sidebar in config itself (would need separate verification in layout components if mobile behavior is in scope).
- `src/utils/helpers.ts:359-369` (`getSidebarMaxWidthClass`) and `:371+` (`getSidebarOffsetClass`) — compute Tailwind arbitrary-value classes like `max-w-[calc(theme(spacing.navbar)+theme(spacing.sidebar))]`; these hardcode the fixed width and will go stale once width becomes runtime-variable.
- `src/store/appInfo.ts` — valtio store holding `sidebarExpanded`/`navigationExpanded` booleans + localStorage persistence; not currently width-aware.
- `src/utils/featureFlags.ts` + `appInfoStore.configs` — `isFeatureEnabled()` mechanism backed by a customer-config API; no existing flag for sidebar/layout resize.

### Width tokens (tailwind.config.ts, `theme.extend.spacing`)

- `sidebar: '308px'` (line ~547) — base sidebar width consumed as `w-sidebar`/`max-w-sidebar`/`min-w-sidebar`.
- `'sidebar-collapsed': '380px'` (line 542) — navbar(collapsed) + sidebar combined.
- `'sidebar-expanded': '505px'` (line 543) — navbar(expanded) + sidebar combined.
- `'workflow-exec-sidebar': '308px'` (line 544) — separate, unrelated token, same value, used by `WorkflowExecutions.tsx`.
- `navbar: '72px'`, `'navbar-expanded': '196px'`.
- `boxShadow.sidebar` (line 539), `transitionProperty.width = 'width'` (enables `transition-width`).
- No pre-existing "min-w" / drag-range token exists — today min==max==308px, no drag range currently defined anywhere.

### Feature Flags and Deployment Concerns

- No feature flag currently gates sidebar width/layout; a new one (e.g. `features:resizableChatSidebar`) would be needed only if staged rollout is desired — not implied by the ticket.
- `react-resizable-panels@^4.11.2` is already a dependency — **no new dependency needed**.
- Storage-key convention is inconsistent across the codebase — three different patterns coexist: flat global keys (`appInfo.ts`'s `codemie-sidebar-expanded`), `${userId}_${key}` underscore-prefix (`src/utils/storage.ts`, `src/utils/storage/index.ts`), and `${key}-${userId}` hyphen-suffix (`useWorkflowDrawer`'s `DRAWER_SIZE_STORAGE_KEY`). Recommend following the `useWorkflowDrawer` precedent exactly (hyphen-suffix, direct localStorage calls, `userId ?? 'default'` fallback) since it's the pattern being directly extended — e.g. a new `CHAT_SIDEBAR_WIDTH_STORAGE_KEY` keyed as `` `${CHAT_SIDEBAR_WIDTH_STORAGE_KEY}-${userId}` ``.
- Compile-time Tailwind width tokens (`theme(spacing.sidebar)`) cannot express a runtime drag-adjusted value — this is a real architectural constraint, not just a styling nuance. A CSS custom property (e.g. `--sidebar-width`, set via inline style or read from the `Group`'s layout state) is the recommended approach to keep `Gradient.tsx` and `helpers.ts` offset calculations in sync.

### Recommended min/max values (based on `useWorkflowDrawer` precedent)

- Precedent uses `MIN_COLLAPSED_SIZE = 50` and `MIN_EXPANDED_SIZE = 150` (pixels) for the workflow drawer panel.
- Current fixed chat sidebar width is `308px`. A reasonable min for the chat pane (to keep title truncation from looking broken and nav icons usable) is likely higher than the drawer's `150px` floor — the drawer is a narrower auxiliary panel; the chat pane holds full chat-list rows with titles, so a min around `240–260px` and a max around `480–560px` (bounded loosely by the existing `sidebar-expanded: 505px` combined token) is a defensible starting range, but this must be confirmed with design/product — no explicit design spec value was found in the ticket or codebase. Flag this as an open question for the planning phase.

---

## 6. Risk Indicators

- Zero test coverage across every file this task touches (`Sidebar.tsx`, `ChatSidebar.tsx`, `ResizableSeparator.tsx`, `useWorkflowDrawer.tsx`, `appInfo.ts`) — no template exists in-repo for testing `react-resizable-panels` drag/resize/collapse behavior; test infrastructure (`ResizeObserver` mock) is present but unexercised.
- `getSidebarMaxWidthClass()`/`getSidebarOffsetClass()` (`src/utils/helpers.ts:359-381`) and `useSidebarOffsetClass.ts:25-32` hardcode the Tailwind compile-time token `theme(spacing.sidebar)` — these will silently go stale (produce wrong offsets) once sidebar width becomes runtime-variable, unless refactored to use a CSS custom property or inline style. This is the single largest correctness risk in the task.
- `Gradient.tsx:28` consumes `getSidebarMaxWidthClass()` — a visual regression risk if that function isn't updated in lockstep.
- Storage-key naming convention is inconsistent across the codebase (3 different patterns) — implementer must consciously choose to follow `useWorkflowDrawer`'s convention rather than the more common `src/utils/storage.ts` convention, or inconsistency compounds.
- No design-specified min/max pixel values found anywhere (ticket, guides, or code) — only the `useWorkflowDrawer` analog (`50`/`150px`) exists as a reference point for a different, narrower panel. Needs product/design confirmation before implementation.
- Coexistence of two resize/collapse mechanisms: the app-wide valtio `sidebarExpanded` boolean (Ctrl+B toggle, `SidebarToggle.tsx`) and the new local `Panel`/`onResize` collapse-threshold state (`useWorkflowDrawer` pattern) need explicit reconciliation so keyboard-toggle and drag-to-collapse don't produce inconsistent UI state.
- `WorkflowExecutions.tsx` uses a separate-but-same-valued (`308px`) sidebar token (`workflow-exec-sidebar`) and the same `sidebarExpanded` boolean — risk of accidentally coupling or confusing the two sidebars during implementation; they must remain independent.
- `filesystem fallback` used for all research (no codegraph tool access in this session) — findings are Grep/Read-based and were cross-verified by an independent thread (Thread A), but a live codegraph symbol graph was not available to catch indirect references beyond text search.

---

## 7. Summary for Complexity Assessment

This task touches the presentation layer (`Sidebar.tsx`, `ChatSidebar.tsx`), a new resize-orchestration hook (new file, modeled directly on the existing `useWorkflowDrawer.tsx`, ~80 lines), the shared `ResizableSeparator.tsx` component (reused as-is, no changes expected), and at minimum two derived-offset utility functions (`useSidebarOffsetClass.ts`, `helpers.ts`'s `getSidebarMaxWidthClass`/`getSidebarOffsetClass`) that currently hardcode a compile-time Tailwind width token and must be converted to consume a runtime value. Expect roughly 6–9 files touched: `Sidebar.tsx`, `ChatSidebar.tsx`, a new hook file, `useSidebarOffsetClass.ts`, `helpers.ts`, `tailwind.config.ts` (new min/max/CSS-var-related tokens if any), possibly `Gradient.tsx` (consumer of the offset utility), plus new test files.

Technical novelty is low-to-moderate: the core resize mechanism (`react-resizable-panels`, `Group`/`Panel`/`Separator`/`useDefaultLayout`, `PanelImperativeHandle`) is an established, working precedent in this exact codebase (`WorkflowDrawer`), so the primary implementation work is integration and adaptation rather than new pattern design. The genuine novel piece is converting the sidebar's width dependents from compile-time Tailwind tokens to a runtime-variable width (CSS custom property or inline style) — this is a real architectural shift for `helpers.ts` and `useSidebarOffsetClass.ts`, not a copy-paste of the drawer pattern, and is the most likely source of subtle bugs (stale offsets, gradient misalignment) if missed.

Test coverage posture is uniformly poor: none of the directly relevant files (`Sidebar.tsx`, `ChatSidebar.tsx`, `ResizableSeparator.tsx`, `useWorkflowDrawer.tsx`, `appInfoStore`) have any existing tests, and no test in the repo exercises `react-resizable-panels` behavior at all despite the library being used in production code for months. This means test-writing for this feature has no in-repo template to build from — it will need original test scaffolding for jsdom-based drag/resize simulation, which raises effort even though the underlying `ResizeObserver` mock prerequisite is already globally configured. Key risk factors for complexity scoring: (1) no confirmed min/max pixel values from design, (2) the compile-time-to-runtime width token migration touching multiple downstream consumers, (3) reconciling two independent collapse mechanisms (Ctrl+B boolean vs. drag-to-collapse threshold), and (4) zero existing test coverage to extend from.
