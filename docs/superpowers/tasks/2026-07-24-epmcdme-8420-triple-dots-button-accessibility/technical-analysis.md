# Technical Research

**Task**: accessibility aria chats sidebar triple-dots menu button
**Generated**: 2026-07-24T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

Fix accessibility issues with the triple-dot '⁝' (vertical ellipsis) button in the chats sidebar. The button that opens a popup with options does not have an accessible name, state and appropriate aria-haspopup attribute.

Requirements:
- Add aria-expanded='true/false' based on popup open/closed state
- Add aria-controls referring to the list of menu items
- Add aria-haspopup='true'
- Add a unique accessible name using aria-labelledby combining: IDREF1 (button's own 'More Options' label) + IDREF2 (the chat/folder name element ID)
- Screen reader should announce: 'More Options Chat 1, button, collapsed' when closed, 'More Options Chat 1, button, expanded' when open
- Scope: affects all '⁝' buttons next to chat buttons AND folder buttons in chats sidebar

---

## 2. Codebase Findings

### Existing Implementations

- `src/components/NavigationMore/NavigationMore.tsx` — shared triple-dot trigger + floating menu; built with `@floating-ui/react`. Already sets `aria-haspopup="menu"` (not `"true"`) and `aria-expanded={show}` on the trigger button. Missing: no `id` on the inner `<div role="menu">`, no `aria-controls` on the trigger, and no `aria-labelledby` support — only a static `aria-label={dataTooltipContent || 'More options'}`. 28 callers app-wide.
- `src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx` — renders each chat row; mounts `<NavigationMore>` (line 119) next to the chat name button (line 103). The chat name button has no `id` attribute. NavigationMore receives no accessible-name props beyond defaults.
- `src/pages/chat/components/ChatSidebar/FolderList/FolderList.tsx` — renders folder accordion tabs; mounts `<NavigationMore>` (line 147) next to the folder name `<p>` (line 140). The `<p>` has no `id`. Folder key is already slug-normalized (line 129–131) using `folder.toLowerCase().replace(/[^a-z0-9]+/g, '-')`.
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarLists.tsx` — orchestrates chat and folder lists; passes `chatActions` down; no accessibility logic.
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarAccordion.tsx` — section headers use `role="treeitem"`, `aria-expanded`, `aria-owns` — the established aria-tree pattern for this sidebar.
- `src/components/Popup/Popup.tsx` — primereact Dialog modal; uses `useId()` + `aria-labelledby` pattern for header IDs — shows the project convention for stable ID generation.
- `src/components/NavigationMore/__tests__/NavigationMore.test.tsx` — existing test suite; `openMenu()` at line 30–32 queries `getByRole('button', { name: 'More options' })`. This will break if `aria-label` is removed in favour of `aria-labelledby`.

### Architecture and Layers Affected

- **Shared UI** (`src/components/NavigationMore/`) — the triple-dot trigger and floating menu implementation; needs `menuId`, `aria-controls`, and optional `labelledBy` prop
- **Feature page components** (`ChatListItem`, `FolderList`) — callers that must supply element IDs and the compound `aria-labelledby` value
- **Sidebar orchestration** (`ChatSidebarLists`, `ChatSidebarAccordion`) — no changes required; aria-tree root (`role="tree"`) and item (`role="treeitem"`) wiring remains untouched

### Integration Points

- `@floating-ui/react` `useInteractions` / `getReferenceProps()` — spread onto the trigger button; explicit aria props placed AFTER this spread already wins (existing `aria-label`, `aria-haspopup`, `aria-expanded` are all post-spread). `aria-controls` and `aria-labelledby` must follow the same order.
- `FloatingPortal` — renders the menu outside the trigger's DOM subtree. `aria-controls` linking by ID is the correct ARIA mechanism here; `aria-owns` is not appropriate (element is still in the same document).
- `primereact/accordion` passthrough (`pt`) — used in `FolderList` to inject aria attributes on rendered elements; the `<NavigationMore>` inside the `header()` render prop has access to the same scope as the folder name `<p>`, so DOM IDs generated there are accessible.

### Patterns and Conventions

- **Stable ID generation**: `useId()` (React 18) used in `Popup.tsx` — same approach should be used in `NavigationMore` to generate the `menuId` for `aria-controls`.
- **aria-tree pattern**: `role="tree"` on root, `role="treeitem"` on accordion headers and chat `<li>` elements, `aria-expanded` + `aria-owns` on section accordion headers — established in `ChatSidebarAccordion`.
- **Compound `aria-labelledby`**: space-separated IDREF list (e.g., `"more-options-{id} chat-name-{id}"`) is the standard ARIA technique for multi-element labels. First IDREF provides the verb label ("More Options"), second provides the context (chat or folder name).
- **Folder slug normalization**: already done at `FolderList.tsx` line 129–131 — reuse `folder.toLowerCase().replace(/[^a-z0-9]+/g, '-')` for folder-specific IDs.
- **Aria value clarification**: `aria-haspopup="menu"` (current) is more specific and correct per the ARIA 1.2 spec than `"true"` (which is an alias for `"menu"` in some implementations). The requirement says `"true"` but `"menu"` is already in place and is the better value — confirm with team before changing.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/` — no dedicated accessibility guide found. The project's AGENTS.md table lists architecture, API, database, and testing guides but no accessibility or ARIA guide.
- No ADRs or design docs covering the aria-tree pattern in the sidebar were found; the existing pattern in `ChatSidebarAccordion.tsx` and `ChatListItem.tsx` is the de-facto standard.

### Architectural Decisions

- No formal ADR. The use of `role="treeitem"`, `aria-owns`, and `aria-expanded` in the sidebar accordion was applied inline in `ChatSidebarAccordion.tsx` without recorded rationale.
- `@floating-ui/react` chosen over primereact `Popup`/`OverlayPanel` for `NavigationMore` — the floating menu renders via `FloatingPortal`, meaning the menu DOM node is detached from the trigger; `aria-controls` is required to bridge this gap for assistive technologies.

### Derived Conventions

- Accessible names follow `aria-label` pattern across most components; `aria-labelledby` appears only in `Popup.tsx`. The compound `aria-labelledby` approach required here is new to this component family.
- Where `useId()` is used (`Popup.tsx`), it is called unconditionally at component top-level, conforming to Rules of Hooks.
- Hidden label elements for purely contextual ARIA text are not currently used anywhere in the codebase — a visually hidden `<span>` with "More Options" text is a new pattern that should be consistent with the project's existing `sr-only` utility class usage (check Tailwind config for `sr-only`).

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/NavigationMore/__tests__/NavigationMore.test.tsx` — covers: menu open/close on button click, hidden items, `role="menu"` / `role="menuitem"` on rendered elements, `hideOnClickInside` behavior. Uses `getByRole('button', { name: 'More options' })` as the primary query — this will break once `aria-labelledby` replaces the static `aria-label`.
- No test files exist for `ChatListItem`, `FolderList`, or `ChatSidebarLists` — confirmed by codegraph blast-radius warnings on those components.

### Testing Framework and Patterns

- Framework: **vitest** + `@testing-library/react`
- Patterns: `render()` + `screen` queries; `userEvent` for click interactions; no custom fixtures or mock factories specific to this domain
- `NavigationMore.test.tsx` opens the menu with `fireEvent.click(openButton)` and asserts on `getByRole('menu')` — straightforward DOM assertions

### Coverage Gaps

- `ChatListItem` — no tests; changes to how IDs are generated and passed to `NavigationMore` will be completely uncovered
- `FolderList` — no tests; same gap
- `ChatSidebarLists` — no tests
- The new `aria-controls` → `id` linkage in `NavigationMore` is not covered by existing tests (no assertion that `aria-controls` value matches the menu element's `id`)
- The new `aria-labelledby` compound name is not covered

---

## 5. Configuration and Environment

### Environment Variables

- None relevant to this UI change.

### Configuration Files

- `vite.config.ts` — frontend build config; no impact on this change
- Tailwind config — check for `sr-only` utility (standard Tailwind includes it); needed if a visually hidden "More Options" `<span>` is used

### Feature Flags and Deployment Concerns

- No feature flags gating the accessibility changes.
- No deployment concerns; purely frontend DOM/ARIA changes.

---

## 6. Risk Indicators

- **28 callers of NavigationMore** — the `NavigationMoreProps` interface change (adding optional `labelledBy` prop) is backward-compatible. However, all 28 existing callers that do not pass `labelledBy` will continue using `aria-label` fallback; none of them will get the new compound name automatically. No regression risk, but the fix is incomplete for callers outside the chat sidebar scope unless they are also updated.
- **Existing NavigationMore test queries by `aria-label` text** (`getByRole('button', { name: 'More options' })`): if `aria-label` is removed when `labelledBy` is present, the test's `openMenu()` helper will throw and ALL NavigationMore tests will fail. The test must be updated alongside the component.
- **`getReferenceProps()` spread ordering** — `@floating-ui/react` may inject aria props through this spread. Placing `aria-controls` and `aria-labelledby` AFTER `{...getReferenceProps()}` in JSX is required for them to win; the existing code does this correctly for `aria-label`/`aria-haspopup`/`aria-expanded` — must maintain the same ordering.
- **`FloatingPortal` DOM detachment** — the floating menu is rendered outside the trigger's parent in the DOM. Browsers correctly follow `aria-controls` cross-subtree, but the `menuId` must be applied to the actual rendered menu container, not to a wrapper outside the portal.
- **No tests for `ChatListItem` or `FolderList`** — ID generation logic and `aria-labelledby` wiring will ship without test coverage unless tests are added.
- **Folder slug collision risk** — if two folders share the same normalized slug (e.g., "My Folder" and "My-Folder"), their IDs will collide. Consider using a stable unique folder identifier from the data model instead of a name-derived slug, if one is available.
- **`aria-haspopup` value mismatch** — requirement specifies `"true"`, current code uses `"menu"`. Both are valid per ARIA spec (`"true"` maps to `"menu"`), but changing to `"true"` is a regression in specificity. Flag for team decision before implementation.
- **No accessibility guide in `.ai-run/guides/`** — conventions must be inferred from code; risk of future drift if not documented after this fix.

---

## 7. Summary for Complexity Assessment

This task touches two architectural layers: the **Shared UI layer** (`NavigationMore` component, 28 callers) and the **Feature Page layer** (`ChatListItem` and `FolderList`). The change surface is small but requires coordinated edits across three files (`NavigationMore.tsx`, `ChatListItem.tsx`, `FolderList.tsx`) plus one test file (`NavigationMore.test.tsx`). No store, API, routing, or build changes are needed.

The task introduces one pattern that is new to this component family — compound `aria-labelledby` with a generated `menuId` (via `useId()`) and visually hidden label spans — though precedent exists in `Popup.tsx`. The `@floating-ui/react` interaction layer adds a subtlety: aria props must be placed after the `getReferenceProps()` spread, but the existing code already demonstrates this ordering. The `FloatingPortal` DOM detachment means `aria-controls` is the only valid linking mechanism, ruling out simpler parent-child ARIA relationships. No novel patterns or architectural decisions are required beyond matching these existing conventions.

Test coverage posture is mixed: `NavigationMore` itself has unit tests that will break and need updating; `ChatListItem` and `FolderList` have zero tests, so the ID-generation and prop-wiring changes in those files ship untested. The main risk factors are (1) the 28-caller blast radius of the `NavigationMoreProps` interface change (mitigated by backward-compatible optional prop), (2) the guaranteed breakage of the existing `NavigationMore` test query that must be fixed as part of this task, and (3) the lack of coverage on the feature-page callers.
