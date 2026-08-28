# Technical Research

**Task**: create folder button chat sidebar accessibility aria-label button role
**Generated**: 2026-08-14
**Research path**: filesystem

---

## 1. Original Context

Bug EPMCDME-8426: [4.1.2] The role of the 'Create folder' button is announced by the screen reader two times.

Preconditions: the NVDA is turned ON.

Steps to reproduce:
1. Open https://codemie.lab.epam.com/#/.
2. Using the Tab key, navigate to the "Create folder" button.
3. Listen to the screen reader announcement.

Actual result: The screen reader announces an accessible role of the "Create folder" button two times - "Create folder, button  button".
Expected result: The screen reader should not announce an extra infromation. The button should be annoucned as: "Create folder, button".

Labels: Chats_Sidebar, Frontend, accessibility_issue, codemie_contribute.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarLists.tsx:166-179` — defines `createFolderButton`, a native `<button>` with `title="Create Folder"` (no `aria-label`), wrapping `<AddFolderSvg>` which has no `aria-hidden`.
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarAccordion.tsx` — renders `headerContentTemplate` (which is `createFolderButton`) inside the PrimeReact `AccordionTab` header, itself inside an `<a role="treeitem">` (pt.headerAction override) — confirmed this outer element uses `role="treeitem"`, not `role="button"`, so it is not a contributor to the duplicate "button" text.
- `src/assets/icons/folder-add.svg` — plain decorative SVG, no `role`, no `<title>` element, no `aria-hidden`.

### Architecture and Layers Affected
Single presentational component layer: `ChatSidebarLists.tsx` (page-level component). No store, API, or routing layers touched.

### Integration Points
None beyond the existing `ChatSidebarAccordion` → PrimeReact `AccordionTab` header slot, already in place.

### Patterns and Conventions
- The project's accessibility guide (`.ai-run/guides/patterns/accessibility-patterns.md`, "Icon Button Pattern") mandates `aria-label` on icon-only buttons and `aria-hidden="true"` on the icon inside, e.g.:
  ```tsx
  <Button aria-label='Start chat' onClick={handleChatClick}>
    <ChatSvg aria-hidden='true' />
  </Button>
  ```
- This exact pattern is already applied elsewhere in the same feature area: `ChatListItem.tsx:123` sets `aria-hidden="true"` on `PinnedSvg`, confirmed by its test (`ChatListItem.test.tsx:122`).
- `createFolderButton` is the only icon-only button in `ChatSidebarLists.tsx` still using `title` instead of `aria-label`, and the only one whose icon lacks `aria-hidden`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/patterns/accessibility-patterns.md` — directly governs this fix. Pre-Delivery Checklist requires: "Icon-only buttons have `aria-label`" and "Decorative SVGs: `aria-hidden='true'`".

### Architectural Decisions
None beyond the accessibility guide's established Icon Button Pattern.

### Derived Conventions
- `aria-label` values use sentence case (e.g. `'Start chat'`, `'Delete item'`) — the fix should use `'Create folder'`, not `'Create Folder'`.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarLists.test.tsx` — covers `role="tree"` / `aria-label="Chats"` on the container only. Does not render or assert on the create-folder button because it mocks `ChatSidebarAccordion` in a way that drops `headerContentTemplate`.
- `src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarAccordion.test.tsx` — covers `role="treeitem"`, `aria-expanded`, `aria-owns`. Does not exercise `headerContentTemplate` content.

### Testing Framework and Patterns
Vitest + React Testing Library. SVG imports are mocked via `vi.mock` to a `<span data-testid="...">`. Heavy dependencies (accordion wrapper) are mocked in `ChatSidebarLists.test.tsx`.

### Coverage Gaps
The `ChatSidebarAccordion` mock in `ChatSidebarLists.test.tsx` must be extended to render `headerContentTemplate` so the create-folder button becomes visible to the test, then two assertions added:
1. The create-folder `<button>` has `aria-label="Create folder"` and no `title` attribute.
2. The `AddFolderSvg` icon has `aria-hidden="true"`.

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
`.eslintrc.cjs` — no `jsx-a11y` plugin detected, so this class of issue is not caught by lint; must be verified manually/via test.

### Feature Flags and Deployment Concerns
None.

---

## 6. Risk Indicators

- Low risk: single-file, single-component change with a well-established in-repo precedent (`ChatListItem.tsx`'s `PinnedSvg`).
- The existing `ChatSidebarAccordion` mock in `ChatSidebarLists.test.tsx` does not render `headerContentTemplate` — the test mock needs a small extension before the new assertions can be added, or the assertions should target `ChatSidebarLists` with the accordion unmocked / a fixed mock.
- No `jsx-a11y` ESLint rule exists to prevent regression of this pattern elsewhere; out of scope for this bug fix but worth noting.

---

## 7. Summary for Complexity Assessment

This is a small, single-file accessibility fix confined to `ChatSidebarLists.tsx` (the `createFolderButton` JSX literal, lines 166-179). The fix replaces `title="Create Folder"` with `aria-label="Create folder"` and adds `aria-hidden="true"` to the nested `<AddFolderSvg>`, matching the project's documented Icon Button Pattern and an existing working precedent (`ChatListItem.tsx`'s `PinnedSvg`) in the same directory tree.

Test coverage for this exact button is currently absent because the sibling test file's accordion mock drops the `headerContentTemplate` slot. The task requires a small test extension (either fixing the mock to render `headerContentTemplate`, or adding a targeted test) alongside the implementation to cover the new `aria-label`/`aria-hidden` attributes and absence of `title`. No architectural, integration, or configuration risk; complexity is low.
