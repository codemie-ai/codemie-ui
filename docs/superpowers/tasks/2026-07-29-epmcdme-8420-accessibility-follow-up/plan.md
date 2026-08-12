# EPMCDME-8420 Accessibility Follow-up — Plan

## Task 1 — Fix AssistantMenu test fixture

**File:** `src/pages/assistants/AssistantActions/components/__tests__/AssistantMenu.test.tsx`

**Test-first:** yes — existing test `'passes contextId to NavigationMore as aria-labelledby on trigger button'` passes with the dangling ARIA ref; stricter assertions must fail until the context element is rendered.

**Changes:**
- Wrap render in a fragment that includes `<span id="test-context-id">Test Assistant</span>`.
- Change `getByRole` query from regex `/More options/i` to exact `'More options Test Assistant'`.
- Add `expect(document.getElementById('test-context-id')).toBeInTheDocument()`.
- Add `expect(trigger).not.toHaveAttribute('aria-label')`.
- Change `aria-labelledby` assertion to exact equality: `${trigger.id} test-context-id`.

**Verification:** `npx vitest run "AssistantMenu.test"` — 7 tests pass.

---

## Task 2 — Migrate 5 callers to contextId

**Test-first:** no — component smoke tests already cover these files; accessibility coverage added in Task 3.

**WorkflowsList.tsx:**
Replace `<NavigationMore data-tooltip-content={workflow.name} .../>` in the
`navigationSlot` render with a fragment: add sr-only span `id=\`workflow-name-${workflow.id}\``
then pass `contextId` to `NavigationMore`. Add fallback `|| 'Workflow'`.

**MCPServerCard.tsx:**
Add `useId` to React import. Call `const nameId = useId()`. Add `id={nameId}` to
the existing `<h4>`. Replace `data-tooltip-content={mcpServer.name}` with
`contextId={nameId}`.

**MCPServerDetail.tsx:**
Add `import { useId } from 'react'`. Call `const nameId = useId()`. Inside the
`!isUnavailable` branch, wrap the `<MCPToolkitTestProvider>` block in a fragment and
prepend `<span id={nameId} className="sr-only">{server.name || 'MCP Server'}</span>`.
Replace `data-tooltip-content={server.name}` with `contextId={nameId}`.

**UserSettings.tsx / ProjectSettings.tsx:**
Convert the `actions` arrow-renderer to a block body. Derive
`contextId = \`user-setting-name-${item.id}\`` (or `project-setting-name-`).
Render `<><span id={contextId} className="sr-only">{accessibleName}</span>
<NavigationMore contextId={contextId} .../></>`
where `accessibleName = item.alias || item.credential_type || 'Integration'`.

**Verification:** `npx vitest run "WorkflowsList.test"` — 1 test passes.

---

## Task 3 — Replace synthetic tests with real caller tests

**Test-first:** yes — write failing tests against real production components before callers are wired.

**File: `WorkflowActions.accessibility.test.tsx`** (update)
Remove synthetic Pattern B (manual table render) and Pattern C (manual
`NavigationMore` with `data-tooltip-content`) describe blocks. Retain Pattern A
(real `WorkflowActions` wiring) and Pattern D (two concurrent instances).

**File: `UserSettings.accessibility.test.tsx`** (create)
Mock `Table` to call `customRenderColumns.actions(item)` for each item in `items`.
Mock all non-NavigationMore dependencies. Use real NavigationMore. Supply two
settings: one with `alias: 'GitHub Token'` and one with empty alias and
`credential_type: 'jira'`. Assert:
- `getByRole('button', { name: 'More options GitHub Token' })` in DOM.
- `getByRole('button', { name: 'More options jira' })` in DOM.
- No `aria-label` on either trigger.
- Exact two-token `aria-labelledby` for each.
- `getElementById(ctx1id)` text = "GitHub Token"; `getElementById(ctx2id)` text = "jira".
- Triggers have different IDs and different `aria-labelledby` values.
- Neither trigger references the other row's context target.

**File: `MermaidDiagram.accessibility.test.tsx`** (create)
Use `vi.useFakeTimers()`. Mock `filesStore.getMermaidFile` to resolve with an
SVG string. In each test: `render(<MermaidDiagram code="..." />)`, then
`await act(async () => { vi.advanceTimersByTime(350); await Promise.resolve() })`.
Assert:
- `getByRole('button', { name: 'Export diagram' })` in DOM.
- `aria-label="Export diagram"`.
- No `aria-labelledby`.
- `aria-haspopup="menu"`.

**Verification:** `npx vitest run "WorkflowActions.accessibility" "UserSettings.accessibility" "MermaidDiagram.accessibility"` — 12 tests pass.

---

## Task 4 — FolderList ID hardening

**Test-first:** yes — update `aria-owns` assertions in the higher-level test to the new format first; they fail until the production change lands.

**`ChatSidebar/__tests__/FolderList.test.tsx`:**
Update `aria-owns` assertion from `'chat-tree-folder-group-0-work'` to
`'chat-tree-folder-group-Work'` and similarly for Personal. Add a new test for
A/B vs A-B uniqueness.

**`FolderList.tsx`:**
In the `.map()` callback, remove the `folderIndex` parameter. Change:
```tsx
const folderKey = `${folderIndex}-${folder.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
```
to:
```tsx
const folderKey = encodeURIComponent(folder)
```

**`FolderList/__tests__/FolderList.test.tsx`:**
Update existing assertions from `folder-name-0-my-folder` format to
`folder-name-My%20Folder` format.

**Verification:** `npx vitest run "FolderList"` — all tests pass.

---

## Task 5 — FolderList relationship hardening

**Test-first:** yes — write the full collision and stability test suite before asserting anything that requires the new ID format to be in place.

**`FolderList/__tests__/FolderList.test.tsx`** (rewrite with expanded coverage):

Add mocks:
- `primereact/accordion` — simplified stub that always renders content and exposes
  `aria-owns` on a `data-testid="folder-header"` div.
- `../../ChatList/ChatList` — `({ id }) => <ul id={id} role="group" />` to keep
  group elements in DOM independent of accordion state.

**Collision suite** (`['A/B', 'A-B']`):
- Find triggers via `getByRole('button', { name: 'More options A/B' })` and `'More options A-B'`.
- Exact `aria-labelledby`: `${slashTrigger.id} folder-name-A%2FB` and
  `${dashTrigger.id} folder-name-A-B`.
- `getElementById('folder-name-A%2FB')` — in DOM, textContent "A/B".
- `getElementById('folder-name-A-B')` — in DOM, textContent "A-B".
- Unique context IDs; unique group IDs.
- Group elements via `getElementById('chat-tree-folder-group-A%2FB')` — role="group".
- Header `aria-owns` via `getAllByTestId('folder-header').map(h => h.getAttribute('aria-owns'))`.
- No cross-referencing between A/B and A-B.

**Stability suite** (`['Work','Personal']` → insert → reorder):
- After each rerender, `getByRole('button', { name: 'More options Work' })` returns
  a button with exact `aria-labelledby = \`${trigger.id} folder-name-Work\``.
- `getElementById('folder-name-Work')` — in DOM, text "Work".
- `getElementById('chat-tree-folder-group-Work')` — in DOM, role="group".
- Header `aria-owns = 'chat-tree-folder-group-Work'` found via `getAllByTestId`.

**Verification:** `npx vitest run "FolderList"` — 18 tests pass across 2 files.

---

## Validation summary

| Command | Result |
|---|---|
| `npx vitest run "FolderList"` | 18 passed |
| `npx vitest run "NavigationMore.test"` | 14 passed |
| `npx vitest run "ChatListItem.test"` | 18 passed |
| `npx vitest run "AssistantMenu.test"` | 7 passed |
| `npx vitest run "WorkflowActions.accessibility"` | 4 passed |
| `npx vitest run "UserSettings.accessibility"` | 5 passed |
| `npx vitest run "MermaidDiagram.accessibility"` | 3 passed |
| `npx tsc --noEmit` | 0 errors |
| `npx eslint <changed files>` | 0 errors |
| Pre-commit hooks (license, secrets, sonar) | all passed |
