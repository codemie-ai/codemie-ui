# MCP Clone Confirmation Popup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the MCP clone flow's field-selection dialog with a minimal confirmation popup
that fires the existing bodiless clone endpoint as its only network call.

**Architecture:** Delete `MCPCopyValuesDialog`/its hook outright. Simplify `mcp.ts`'s
`cloneConfig` to a no-param, no-body POST. Simplify `useMCPManagement.ts`'s clone path to a single
call with no post-success modal open. Add an inline `ConfirmationModal` instance to
`MCPServerActions.tsx` (same pattern already used there for Delete), gated by local
`isCloning`/`isCloneConfirmVisible` state. `MCPServerModal` is untouched except for removing the
dead stripped-fields banner.

**Tech Stack:** React 18, TypeScript, Valtio, Vitest + RTL.

## Global Constraints

- No API call before the user confirms.
- No stripping/masking/placeholder logic anywhere in this flow (removal only).
- Reuse `ConfirmationModal` — no new modal primitive.
- `MCPServerModal`'s header/CTA/title get no new "Clone" mode.
- No post-success auto-open of any edit window; no second (update) call ever; no client-computed
  naming preview.
- Must not repeat `UnassignFromProjectConfirmationPopup`'s silent-failure gap — a toast is required
  on clone failure.
- Commit per task using the repository's existing convention
  (`.ai-run/guides/standards/git-workflow.md`).

---

## Acceptance criteria

- [ ] Clicking "Clone" opens a popup stating `Clone "{Original Name}"?` with Cancel and
      "Clone Server" actions; no API call has fired yet.
- [ ] Cancel closes the popup with no API call and no new list entry.
- [ ] Confirming fires `POST /v1/mcp-configs/{id}/clone` (no body) as the only network request;
      while in flight, both Cancel and "Clone Server" are disabled.
- [ ] On success: popup closes, no edit window opens, the list shows the new entry with the
      backend's name and values, unmasked.
- [ ] On failure: popup closes, a toast shows the clone failure message, no new entry appears.
- [ ] `MCPServerModal` carries no new mode/title/CTA; editing a clone is the existing Edit flow.
- [ ] The row's "Clone" action uses `clone.svg`; "Copy ID" keeps `copy.svg`.

---

### Task 1: Delete the field-selection dialog

**Files:**
- Delete: `src/pages/settings/administration/components/MCPCopyValuesDialog/index.tsx`
- Delete: `src/pages/settings/administration/components/MCPCopyValuesDialog/useMCPCopyValuesDialog.ts`
- Delete: `src/pages/settings/administration/components/MCPCopyValuesDialog/__tests__/MCPCopyValuesDialog.test.tsx`

**Test-first:** no — pure deletion; dangling imports are cleaned up in Task 3 and verified by that
task's test run.

- [ ] **Step 1:** Delete all three files above (`rm -r src/pages/settings/administration/components/MCPCopyValuesDialog`).
- [ ] **Step 2: Commit**

```bash
git add -A src/pages/settings/administration/components/MCPCopyValuesDialog
git commit -m "EPMCDME-15538: Remove MCP copy-values selection dialog"
```

---

### Task 2: Simplify `mcp.ts`'s `cloneConfig` to a bodiless call

**Files:**
- Modify: `src/store/mcp.ts:50` (interface signature), `src/store/mcp.ts:227-262` (implementation + doc comment)
- Modify: `src/types/entity/mcp.ts:64-66` (drop `MCPConfigCloneResponse`)
- Test: `src/store/__tests__/mcp.test.ts:174-260`

**Interfaces:**
- Produces: `mcpStore.cloneConfig(id: string): Promise<MCPConfig>` — no `copyValues` param, posts
  with no body.

**Test-first:** yes — rewrite the `mcpStore.cloneConfig` describe block first so it fails against
the current two-arg, `{ copy_values }`-posting implementation.

- [ ] **Step 1: Rewrite the failing tests** — replace the two call-shape tests at
  `src/store/__tests__/mcp.test.ts:210-250` with:

```ts
it('should clone a config and unshift it into configs', async () => {
  mockApiPost.mockResolvedValueOnce({ json: async () => cloneResponseFixture })
  const result = await mcpStore.cloneConfig('source-1')
  expect(result).toEqual(cloneResponseFixture)
  expect(mcpStore.configs[0]).toEqual(cloneResponseFixture)
  expect(mockApiPost).toHaveBeenCalledWith('v1/mcp-configs/source-1/clone')
})
```

  Also drop `stripped_fields`/`warnings` from `cloneResponseFixture` (lines 193-208) — the backend
  response is a plain `MCPConfig`.

- [ ] **Step 2:** Run `npx vitest run --project unit src/store/__tests__/mcp.test.ts`. Expect FAIL
  (current code still posts `{ copy_values: undefined }` and takes a second param).
- [ ] **Step 3: Implement.** In `src/store/mcp.ts`:
  - Line 50: `cloneConfig: (id: string) => Promise<MCPConfig>`
  - Line 248: `const response = await api.post(\`v1/mcp-configs/${id}/clone\`)`
  - Remove the `copyValues` parameter from the method signature (line 240) and its doc comment's
    `@param copyValues` / `@example` lines (227-239).
  - In `src/types/entity/mcp.ts`, delete the `MCPConfigCloneResponse` interface (lines 64-66).
- [ ] **Step 4:** Run the same test command. Expect PASS.
- [ ] **Step 5: Commit**

```bash
git add src/store/mcp.ts src/store/__tests__/mcp.test.ts src/types/entity/mcp.ts
git commit -m "EPMCDME-15538: Clone MCP config with no request body"
```

---

### Task 3: Simplify `useMCPManagement`'s clone path and `MCPManagementPage`

**Files:**
- Modify: `src/pages/settings/administration/hooks/useMCPManagement.ts` (lines 19, 30, 41, 43,
  111-164, 191-216)
- Modify: `src/pages/settings/administration/MCPManagementPage.tsx` (lines 31, 83-102, 182-196)
- Test: `src/pages/settings/administration/hooks/__tests__/useMCPManagement.test.ts:63-155`

**Interfaces:**
- Consumes: `mcpStore.cloneConfig(id: string): Promise<MCPConfig>` (Task 2).
- Produces: `handleCloneServer(server: MCPConfig): Promise<void>` — the hook's only clone entry
  point; always resolves (catches and toasts internally), never opens a modal.

**Test-first:** yes — replace the "clone flow" describe block first.

- [ ] **Step 1: Rewrite the failing tests.** Replace
  `src/pages/settings/administration/hooks/__tests__/useMCPManagement.test.ts:63-155` with:

```ts
describe('useMCPManagement - clone flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSnapshot.mockReturnValue(mcpStore as unknown as typeof mcpStore)
    vi.mocked(mcpStore.indexConfigs).mockResolvedValue([])
  })

  it('fires exactly one clone call and does not open the edit modal on success', async () => {
    vi.mocked(mcpStore.cloneConfig).mockResolvedValue({ ...baseServer, id: 'server-2' })
    const { result } = renderHook(() => useMCPManagement())
    await act(async () => {
      await result.current.handleCloneServer(baseServer)
    })
    expect(mcpStore.cloneConfig).toHaveBeenCalledTimes(1)
    expect(mcpStore.cloneConfig).toHaveBeenCalledWith('server-1')
    expect(result.current.showModal).toBe(false)
    expect(result.current.editingServer).toBeNull()
  })

  it('blocks a second concurrent call while the first is in flight', async () => {
    let resolveClone: (value: MCPConfig) => void = () => {}
    vi.mocked(mcpStore.cloneConfig).mockImplementation(
      () => new Promise((resolve) => { resolveClone = resolve })
    )
    const { result } = renderHook(() => useMCPManagement())
    let first: Promise<void>
    act(() => {
      first = result.current.handleCloneServer(baseServer)
      void result.current.handleCloneServer(baseServer)
    })
    expect(mcpStore.cloneConfig).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolveClone({ ...baseServer, id: 'server-2' })
      await first
    })
  })

  it('shows a toaster error and resolves without a new entry on failure', async () => {
    vi.mocked(mcpStore.cloneConfig).mockRejectedValue({ response: { data: { message: 'boom' } } })
    const { result } = renderHook(() => useMCPManagement())
    await act(async () => {
      await result.current.handleCloneServer(baseServer)
    })
    expect(toaster.error).toHaveBeenCalledWith('boom')
    expect(result.current.showModal).toBe(false)
    expect(result.current.editingServer).toBeNull()
  })
})
```

  Drop the `MCPConfigCloneResponse` import and the `config`/`stripped_fields` fixture overrides no
  longer needed on `baseServer`.

- [ ] **Step 2:** Run `npx vitest run --project unit src/pages/settings/administration/hooks/__tests__/useMCPManagement.test.ts`.
  Expect FAIL (current `handleCloneServer` branches on `hasCopyableValues` and opens the dialog
  instead of calling `cloneConfig` directly, and `runClone` opens the edit modal on success).
- [ ] **Step 3: Implement.** In `useMCPManagement.ts`:
  - Delete the `collectCopyValuePaths` import (line 19) and `hasCopyableValues` (lines 24-30).
  - Delete `cloneDialogServer` state (line 41) and `strippedFields` state (line 43).
  - Replace `runClone`/`handleCloneServer`/`handleConfirmClone`/`handleCloneDialogClose`
    (lines 111-164) with:

```ts
const handleCloneServer = useCallback(async (server: MCPConfig) => {
  if (cloningRef.current === server.id) return
  cloningRef.current = server.id
  setCloningId(server.id)
  try {
    await mcpStore.cloneConfig(server.id)
  } catch (error: any) {
    toaster.error(error?.response?.data?.message ?? error?.message)
  } finally {
    setCloningId(null)
    cloningRef.current = null
  }
}, [])
```

  - Update the return block (lines 191-216): drop `cloneDialogServer`, `strippedFields`,
    `handleConfirmClone`, `handleCloneDialogClose` from the returned object.
  - In `MCPManagementPage.tsx`: remove the `MCPCopyValuesDialog` import (line 31) and its render
    block (lines 190-196); remove `cloneDialogServer`, `handleConfirmClone`,
    `handleCloneDialogClose`, `strippedFields` from the hook destructure (lines 83-102) and stop
    passing `strippedFields` into `<MCPServerModal>` (line 187).
- [ ] **Step 4:** Run the same test command. Expect PASS.
- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/hooks/useMCPManagement.ts \
        src/pages/settings/administration/MCPManagementPage.tsx \
        src/pages/settings/administration/hooks/__tests__/useMCPManagement.test.ts
git commit -m "EPMCDME-15538: Simplify MCP clone to a single call, no auto-opened editor"
```

---

### Task 4: Remove the stripped-fields notice from `MCPServerModal`

**Files:**
- Modify: `src/pages/settings/administration/components/MCPServerModal/index.tsx:40, 44-54, 111-132`

**Test-first:** no — pure removal of a dead banner; no `MCPServerModal` test exercises it (none
exists per the technical analysis), and no new behavior is added.

- [ ] **Step 1: Implement.** Delete the `strippedFields` prop (line 40), the
  `showStrippedFieldsNotice` state and its `useEffect` (lines 44-54), and the notice `<div>` block
  (lines 111-132). Leave `getSubmitButtonText`/header untouched.
- [ ] **Step 2:** Run `npx vitest run --project unit src/pages/settings/administration/components/MCPServerModal`.
  Expect PASS (no existing test referenced the removed prop/banner).
- [ ] **Step 3: Commit**

```bash
git add src/pages/settings/administration/components/MCPServerModal/index.tsx
git commit -m "EPMCDME-15538: Drop dead stripped-fields notice from Edit MCP Server"
```

---

### Task 5: Add a `cancelDisabled` prop to the shared `ConfirmationModal`

**Files:**
- Modify: `src/components/ConfirmationModal/ConfirmationModal.tsx`

**Interfaces:**
- Produces: `ConfirmationModalProps.cancelDisabled?: boolean` — disables the Cancel button; default
  `false`, so every existing caller is unaffected.

**Test-first:** no — this is a single-line, backward-compatible prop addition with no existing
behavior to break; the new behavior is exercised by Task 6's popup test.

- [ ] **Step 1: Implement.** Add `cancelDisabled?: boolean` to `ConfirmationModalProps` (after
  line 31) and to the destructured props (default `false`). Add `disabled={cancelDisabled}` to the
  Cancel `<Button>` (around line 59-67).
- [ ] **Step 2:** Run `npx vitest run --project unit src/components/ConfirmationModal`. Expect PASS
  (no existing suite for this component is broken by an optional prop).
- [ ] **Step 3: Commit**

```bash
git add src/components/ConfirmationModal/ConfirmationModal.tsx
git commit -m "EPMCDME-15538: Allow disabling ConfirmationModal's Cancel button"
```

---

### Task 6: Wire the Clone confirmation popup into `MCPServerActions`

**Files:**
- Modify: `src/pages/settings/administration/components/MCPServerActions.tsx`
- Test: `src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx`
  (add `clone.svg?react` mock)
- Create: `src/pages/settings/administration/components/__tests__/MCPServerActions.clone.test.tsx`

**Interfaces:**
- Consumes: `onClone(server: MCPConfig): Promise<void>` (Task 3's `handleCloneServer`, which never
  throws) and `ConfirmationModalProps.cancelDisabled` (Task 5).

**Test-first:** yes — write the new test file against the current direct-call behavior first.

- [ ] **Step 1: Write the failing tests.** Create
  `src/pages/settings/administration/components/__tests__/MCPServerActions.clone.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { mcpServerNameId } from '@/utils/ariaIds'

import MCPServerActions from '../MCPServerActions'

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/info.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/copy.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/clone.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/utils/utils', async (orig) => ({ ...(await orig<object>()), copyToClipboard: vi.fn() }))
vi.mock('@/components/ConfirmationModal', () => ({
  default: ({ visible, header, confirmText, cancelText, confirmDisabled, cancelDisabled, onCancel, onConfirm }: any) =>
    visible ? (
      <div role="dialog" aria-label={header}>
        <button onClick={onCancel} disabled={cancelDisabled}>{cancelText}</button>
        <button onClick={onConfirm} disabled={confirmDisabled}>{confirmText}</button>
      </div>
    ) : null,
}))

const server = { id: 'mcp-1', name: 'My MCP Server' } as any

const open = () => fireEvent.click(screen.getByRole('button', { name: 'More options My MCP Server' }))

const renderActions = (onClone: ReturnType<typeof vi.fn>) =>
  render(
    <div>
      <span id={mcpServerNameId('mcp-1')}>My MCP Server</span>
      <MCPServerActions
        server={server}
        onViewDetails={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onClone={onClone}
        canClone
        cloning={false}
      />
    </div>
  )

describe('MCPServerActions — Clone confirmation popup', () => {
  it('opens the popup naming the server and fires no call yet', () => {
    const onClone = vi.fn().mockResolvedValue(undefined)
    renderActions(onClone)
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clone' }))
    expect(screen.getByRole('dialog', { name: 'Clone "My MCP Server"?' })).toBeInTheDocument()
    expect(onClone).not.toHaveBeenCalled()
  })

  it('Cancel closes the popup with no call', () => {
    const onClone = vi.fn().mockResolvedValue(undefined)
    renderActions(onClone)
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clone' }))
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClone).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Confirm fires exactly one call and disables both actions while in flight, then closes', async () => {
    let resolveClone: () => void = () => {}
    const onClone = vi.fn(() => new Promise<void>((resolve) => { resolveClone = resolve }))
    renderActions(onClone)
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clone' }))
    fireEvent.click(screen.getByText('Clone Server'))
    expect(onClone).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Clone Server')).toBeDisabled()
    expect(screen.getByText('Cancel')).toBeDisabled()
    resolveClone()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onClone).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2:** Run `npx vitest run --project unit src/pages/settings/administration/components/__tests__/MCPServerActions.clone.test.tsx`.
  Expect FAIL (no Clone confirmation popup exists yet; clicking "Clone" calls `onClone` directly).
- [ ] **Step 3: Implement.** In `MCPServerActions.tsx`:
  - Swap `CopySvg` import for a second import: add `import CloneSvg from '@/assets/icons/clone.svg?react'` alongside the existing `CopySvg` import (keep `CopySvg` for Copy ID).
  - Add state and handlers near `isDeleteConfirmationVisible` (lines 48-57):

```ts
const [isCloneConfirmationVisible, setIsCloneConfirmationVisible] = useState(false)
const [isCloning, setIsCloning] = useState(false)

const showCloneConfirmation = useCallback(() => setIsCloneConfirmationVisible(true), [])
const cancelClone = useCallback(() => setIsCloneConfirmationVisible(false), [])
const confirmClone = useCallback(async () => {
  setIsCloning(true)
  try {
    await onClone(server)
  } finally {
    setIsCloning(false)
    setIsCloneConfirmationVisible(false)
  }
}, [server, onClone])
```

  - Change the `Clone` menu action (lines 74-80): `icon: <CloneSvg className="w-[18px] h-3.5" />`,
    `onClick: showCloneConfirmation` (was `() => onClone(server)`).
  - Add a second `<ConfirmationModal>` next to the Delete one (after line 115):

```tsx
<ConfirmationModal
  visible={isCloneConfirmationVisible}
  onCancel={cancelClone}
  header={`Clone "${server.name}"?`}
  message="This creates a new MCP server configuration with every value copied verbatim."
  confirmText="Clone Server"
  onConfirm={confirmClone}
  confirmDisabled={isCloning}
  cancelDisabled={isCloning}
  hideIcon
/>
```

  - Add `vi.mock('@/assets/icons/clone.svg?react', () => ({ default: () => <span /> }))` to
    `MCPServerActions.accessibility.test.tsx`'s existing mock block (next to the `copy.svg` mock).
- [ ] **Step 4:** Run both
  `npx vitest run --project unit src/pages/settings/administration/components/__tests__/MCPServerActions.clone.test.tsx`
  and
  `npx vitest run --project unit src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx`.
  Expect PASS on both.
- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/components/MCPServerActions.tsx \
        src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx \
        src/pages/settings/administration/components/__tests__/MCPServerActions.clone.test.tsx
git commit -m "EPMCDME-15538: Confirm MCP clone via popup instead of a direct call"
```

---

## Negative-constraint pass

- No API call before confirm → Task 6's "opens the popup ... fires no call yet" test; `onClone` is
  only invoked from `confirmClone`, never from `showCloneConfirmation`.
- No stripping/masking/placeholder logic anywhere in this flow → Tasks 1-4 remove every such path
  (`isSensitiveKey`/`isSensitivePath` die with the deleted dialog; `stripped_fields` dies in Tasks
  2-4); nothing adds a replacement.
- No new modal primitive → Task 6 adds only another instance of the existing `ConfirmationModal`
  (Task 5 extends its props, not its primitive).
- No `MCPServerModal` mode/title/CTA change → Task 4 only deletes the dead banner; header/CTA text
  (`getSubmitButtonText`) is untouched by every task.
- No post-success auto-open of any window → Task 3's `handleCloneServer` never calls `setShowModal`
  or `setEditingServer`.
- No second network call ever → Task 2's `cloneConfig` and Task 3's `handleCloneServer` make
  exactly one `api.post` call per invocation; no task adds an `updateConfig` follow-up.
- No client-computed naming preview → no task reads or displays a name before the clone response
  returns; the popup header uses only the *source* server's existing name.
- Toast required on failure (unlike `UnassignFromProjectConfirmationPopup`) → Task 3's
  `handleCloneServer` keeps the `toaster.error(...)` call in its `catch` block, verified by that
  task's failure test.
