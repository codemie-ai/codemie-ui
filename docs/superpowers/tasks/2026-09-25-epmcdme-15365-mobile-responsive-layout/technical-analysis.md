# Technical Research

**Task**: Responsive phone and tablet adaptation of CodeMie UI, following the Figma "mobile" section
**Generated**: 2026-09-25T15:10:00Z
**Research path**: manual source audit + live inspection of the running app (`http://localhost:5173`)

---

## 1. Original Context

- Adapt the application for modern phones (~360–430px) and portrait tablets (~744–834px), following
  the Figma "mobile" section (file `JSNEJLYXrX6qhc9ygB5QgJ`, node `15127:51409`).
- Hard constraint: the desktop web app (~50k users) must not change — no logic, style or behaviour
  change at desktop widths.
- Keep the change set small, reuse existing components, no rewrite. Pages that cannot be fully adapted
  (workflow editor) get best effort.
- Second feedback round: chat toolbar clipping the Skills control, oversized AI message metadata, text
  overlap on "Create New Skill", AI Katas and the Analytics dashboard not adapted, login page not
  adapted. Chats, conversations and assistants are the priority mobile flows.

## 2. Codebase Findings

### Existing Implementations

| Area | Where | Relevant behaviour |
|---|---|---|
| App shell | `src/App.tsx` | Navigation rail + `<Outlet />` + floating `HelpPanel`; `html/body/#app` sized with `h-screen` |
| Navigation | `src/components/Navigation/*` | Fixed left rail, expand state in `appInfoStore.navigationExpanded`; `NavigationMore` positions with Floating UI |
| Page sidebars | `src/components/Sidebar/Sidebar.tsx` | Inline 308px (`w-sidebar`) column, collapsed via `appInfoStore.sidebarExpanded` and `SidebarToggle` (Ctrl+B), toggle offset from `useSidebarOffsetClass` |
| Execution history | `src/pages/workflows/details/WorkflowExecutions/WorkflowExecutions.tsx` | Its own 308px `<aside>` + `SidebarToggle`, not built on `Sidebar` |
| Page header | `src/components/Layouts/Layout/PageLayout.tsx` | Fixed 56px header: back button, title, `rightContent` |
| Tables | `src/components/Table/*` | `<table>` with `TableColHeader` (sort buttons, page "select all"), `TableCell`, expandable rows; used by data sources, admin pages, analytics |
| Chat | `src/pages/chat/ChatPage.tsx` | `react-resizable-panels` v4 (pixel sizes): chat list panel, chat area, configuration panel; sync hooks `useChatSidebarResize`, `useChatConfigResize` |
| Chat prompt / messages | `ChatPrompt*`, `ChatAiMessage.tsx` | Toolbar with attach, tools, model, skills, tool-call policy; AI header with 40px avatar and "Processed in: …s / date" |
| Dialogs | `src/components/Popup/Popup.tsx` | PrimeReact `Dialog` with fixed min/max widths |
| Cards | `src/components/Card/Card.tsx` | Fixed `h-card` height, single-row footer |
| Login | `src/components/Layouts/StandaloneLayout/StandaloneLayout.tsx` | Absolute logo + centred 400px form; also used by the Keycloak theme |
| Onboarding | `AutoPopupManager.tsx`, `src/configs/onboarding/*` | Auto-starts the navigation tour for first-time SSO users and offers first-visit page tours; steps target desktop elements (nav links, `data-onboarding`), the tooltip centres itself when a target is missing |

### Architecture and Layers Affected

UI layer plus the existing `appInfoStore` (Valtio). No API, backend, routing or persistence change.

### Integration Points

- `react-router` location changes: overlays have to close on navigation.
- `window.matchMedia`: one query shared by JS and Tailwind (`max-lg:` compiles to
  `@media not all and (min-width: 1024px)`).
- PrimeReact overlays and Floating UI popovers are portalled to `<body>`, above any app overlay.
- `react-resizable-panels` panels are imperatively synced to store state only when that state changes.

### Patterns and Conventions

- Tailwind 3.4 with semantic colour tokens; `cn()` = `clsx` + `tailwind-merge`, so a later class wins.
- Valtio stores own shared state and its mutators; hooks in `src/hooks`, constants in `src/constants`.
- No responsive layout exists yet: `sm:`/`lg:` variants appear only in a few grids. There is no
  precedent for a mobile shell.

## 3. Documentation Findings

- `AGENTS.md`: every gate runs individually; tests are written only on explicit request; formatting is
  hook-driven; ask before new dependencies or `nginx.conf` changes.
- `styling-guide.md`, `component-patterns.md`, `accessibility-patterns.md`: Tailwind utilities with
  semantic tokens, reuse existing components, labelled controls.
- Figma "mobile" section: 56px top bar (logo, sidebar button, section switcher), full-screen navigation
  overlay, page sidebars and right-hand panels as full-width overlays, table rows as cards, back-arrow
  header on detail pages.

## 4. Testing Landscape

- Vitest with React Testing Library, `unit` and `integration` projects.
- `src/setupTests.tsx:99` stubs `window.matchMedia` with `matches: false`, so every existing test
  renders the desktop layout. Desktop behaviour stays covered; mobile branches are not exercised by
  the current suites.
- `src/__tests__/App.test.tsx` mocks `react-router` with only `Outlet`, so a new component imported by
  `App` that uses the router has to be mocked there.

## 5. Configuration and Environment

- No environment variables, feature flags or runtime config (`window._env_`) involved.
- `index.html` viewport meta needs `interactive-widget=resizes-content` so the on-screen keyboard
  resizes the layout rather than covering the chat prompt.
- Mobile Safari: `100vh` ignores browser toolbars (use `100dvh`), and fields under 16px trigger zoom on focus.

## 6. Risk Indicators

- **Desktop regression** — shared components (`Table`, `Sidebar`, `PageLayout`, `Popup`, `Card`,
  `Navigation`) render on nearly every page. Every mobile change must be gated by `max-lg:`/`max-sm:` or
  the media-query hook, and desktop class sets must stay identical.
- **Breakpoint crossing** — resizing a desktop window or rotating a tablet across 1024px switches the
  chat page between two element trees, which remounts it. The panel sync effects must re-run when
  the desktop panels mount again.
- **Onboarding** — tours target desktop-only elements.
- **Selection and sorting** — the table header is the only place that renders sort and "select all".
- **No mobile test coverage** — the global `matchMedia` stub keeps tests on the desktop branch.

## 7. Summary for Complexity Assessment

UI-only change across the app shell, navigation, sidebars, tables, dialogs, chat, forms, analytics,
katas, workflows and login: about 60 files, new layout abstractions (mobile shell state, top bar, card
list), no new dependencies. The main risk is keeping desktop unchanged while shared components gain a
second layout.
