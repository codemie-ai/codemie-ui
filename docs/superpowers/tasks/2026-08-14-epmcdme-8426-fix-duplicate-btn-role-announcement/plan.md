# Fix Duplicate Screen-Reader Role Announcement on Create Folder Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop NVDA from announcing the "Create folder" button's role twice ("Create folder, button  button") by replacing its `title` attribute with `aria-label` and hiding its decorative SVG icon from the accessibility tree.

**Architecture:** Single presentational-component change. No new files, no new dependencies, no architectural layers touched — this is a targeted JSX-attribute fix in `ChatSidebarLists.tsx` plus a matching test-mock extension and new assertions in `ChatSidebarLists.test.tsx`.

**Tech Stack:** React + TypeScript, Vitest + React Testing Library, Tailwind CSS.

## Global Constraints

- `aria-label` values use sentence case, matching existing project convention (`'Start chat'`, `'Delete item'`) — use `'Create folder'`, not `'Create Folder'`.
- Follow the project's Icon Button Pattern (`.ai-run/guides/patterns/accessibility-patterns.md`): icon-only buttons get `aria-label`; the icon inside gets `aria-hidden='true'`.
- Do not modify `ChatSidebarAccordion.tsx` or PrimeReact `pt` overrides — the outer wrapper already uses `role="treeitem"` and is not part of this bug.

---

### Task 1: Fix duplicate role announcement on the create-folder button

**Files:**
- Modify: `src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarLists.tsx:166-179`
- Modify: `src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarLists.test.tsx`

**Interfaces:**
- Consumes: existing `createFolderButton` JSX literal in `ChatSidebarLists.tsx` (no exported symbol, no external interface).
- Produces: no new exports. The `<button>` inside `createFolderButton` now exposes `aria-label="Create folder"` instead of `title="Create Folder"`; `<AddFolderSvg>` now has `aria-hidden="true"`.

Test-first: yes — new test asserting the create-folder button has `aria-label="Create folder"`, no `title` attribute, and its icon has `aria-hidden="true"`; this test fails against current code because the button currently has `title` (not `aria-label`) and the icon has no `aria-hidden`, and because the button isn't even rendered yet by the existing mock.

- [ ] **Step 1: Extend the `ChatSidebarAccordion` mock to render `headerContentTemplate`**

  In `src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarLists.test.tsx`, the current mock (lines 36-40) drops the `headerContentTemplate` prop, so the create-folder button is never rendered in this test file. Replace it with:

  ```tsx
  vi.mock('../ChatSidebarLists/ChatSidebarAccordion', () => ({
    default: ({ children, title, headerContentTemplate }: any) => (
      <div data-testid={`accordion-${title.toLowerCase()}`}>
        {headerContentTemplate}
        {children}
      </div>
    ),
  }))
  ```

- [ ] **Step 2: Write the failing test**

  Add this test to the `describe('ChatSidebarLists', ...)` block in the same file:

  ```tsx
  it('renders the create folder button with a single accessible name and no duplicate role source', () => {
    render(<ChatSidebarLists />)
    const createFolderButton = screen.getByRole('button', { name: 'Create folder' })
    expect(createFolderButton).toBeInTheDocument()
    expect(createFolderButton).not.toHaveAttribute('title')

    const icon = screen.getByTestId('folder-add-icon')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
  ```

- [ ] **Step 3: Run the test to verify it fails**

  Run: `npx vitest run src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarLists.test.tsx`
  Expected: FAIL — `getByRole('button', { name: 'Create folder' })` finds no match, because the button currently has `title="Create Folder"` (no `aria-label`) and no matching accessible name of `'Create folder'`.

- [ ] **Step 4: Implement the fix**

  In `src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarLists.tsx`, replace lines 166-179:

  ```tsx
  const createFolderButton = (
    <button
      type="button"
      title="Create Folder"
      className="flex items-center cursor-pointer"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setActivePopup('folder-form')
      }}
    >
      <AddFolderSvg className="opacity-80 hover:opacity-100" />
    </button>
  )
  ```

  with:

  ```tsx
  const createFolderButton = (
    <button
      type="button"
      aria-label="Create folder"
      className="flex items-center cursor-pointer"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setActivePopup('folder-form')
      }}
    >
      <AddFolderSvg aria-hidden="true" className="opacity-80 hover:opacity-100" />
    </button>
  )
  ```

- [ ] **Step 5: Run the test to verify it passes**

  Run: `npx vitest run src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarLists.test.tsx`
  Expected: PASS — both tests in the file (the pre-existing tree-container test and the new create-folder-button test) pass.

- [ ] **Step 6: Run the full ChatSidebar test suite to check for regressions**

  Run: `npx vitest run src/pages/chat/components/ChatSidebar`
  Expected: PASS — no regressions in `ChatSidebarAccordion.test.tsx`, `ChatListItem.test.tsx`, or other sibling tests, since this change does not touch shared components.

- [ ] **Step 7: Commit**

  ```bash
  git add src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarLists.tsx src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarLists.test.tsx
  git commit -m "EPMCDME-8426: Fix duplicate role announcement on create folder button"
  ```
