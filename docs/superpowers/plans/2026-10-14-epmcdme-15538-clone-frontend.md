# EPMCDME-15538 Frontend: Clone MCP Config With Empty Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking "Clone" on an MCP server configuration opens the same form used for editing, pre-filled from the source config but with the Name field empty, and the user must type a name before it can be saved (the existing "Name is required" / backend 400 duplicate-name validation already enforces this — unchanged). The server-suggested "Copy N of {Name}" name is no longer fetched or shown.

**Architecture:** `MCPManagementPage` → `useMCPManagement` (modal open/close + submit orchestration) → `MCPServerModal` / `useMCPServerModal` (the shared Add/Edit/Clone form) → `mcpStore` (API calls). Today, clicking the Clone menu item calls `mcpStore.fetchSuggestedCloneName(id)` first (showing a disabled/loading state on that row's menu item) and only then opens the modal with the name pre-filled to the suggested value. This plan removes that entire fetch-before-open step — the modal now opens immediately — and changes the Clone form's initial name to `''` instead of the source config's name or a suggested name. The duplicate-name error on submit already surfaces through the existing generic `onSubmit` rejection → toast path shared by Add/Edit/Clone, so no change is needed there (confirmed: the backend's clone duplicate-name check already 400s before persisting, and `useMCPServerModal`'s `onFormSubmit` catch-all already toasts any non-Response rejection and leaves a Response rejection to the API layer's own toast).

**Tech Stack:** React 18, TypeScript 5, react-hook-form + yup, Valtio, Vitest + React Testing Library (`unit` and `integration` projects).

## Global Constraints

- The Name field stays **required** in all three modes (Add, Edit, Clone) — this plan does not relax `mcpServerSchema`'s `name` validation, and submitting the Clone form with an empty name must still be blocked client-side (confirmed required behavior — empty names must never be saved). Only the Clone form's *initial* value changes from "pre-filled" to `''`.
- No network call happens between clicking "Clone" and the modal appearing — the modal opens synchronously from data already in the row.
- `tsconfig.json` has `noUnusedLocals: true` and `noUnusedParameters: true` — every step below must leave the touched files free of unused imports/vars, since `npm run typecheck` enforces this.
- Run `npm run typecheck` after each task (fast and catches the unused-local/prop-shape mistakes this refactor is prone to), and the full pre-MR checklist (`npm run lint`, `npm run typecheck`, `npm run test:unit:slnt`, `npm run test:integration:slnt`) before the final commit — see `.ai-run/guides/quality-gates.md`.

---

### Task 1: Clone form opens with an empty Name field

**Files:**
- Modify: `src/pages/settings/administration/components/MCPServerModal/__tests__/MCPServerModal.clone.test.tsx`
- Modify: `src/pages/settings/administration/components/MCPServerModal/useMCPServerModal.ts`
- Modify: `src/pages/settings/administration/components/MCPServerModal/index.tsx`
- Modify: `src/pages/settings/administration/MCPManagementPage.tsx`

**Interfaces:**
- Consumes: `cloneSource: MCPConfig | null` (already a prop of `MCPServerModal`/`useMCPServerModal`, unchanged) — the config being cloned, used to pre-fill every field *except* name.
- Produces: `MCPServerModal` and `useMCPServerModal` no longer accept a `suggestedName` prop at all (removed from both prop interfaces). Task 2 relies on this: it removes the last caller that computes a suggested name, and must not re-introduce the prop.

- [ ] **Step 1: Write the failing test — Clone mode starts with an empty Name field**

In `src/pages/settings/administration/components/MCPServerModal/__tests__/MCPServerModal.clone.test.tsx`, replace the single test with:

```tsx
describe('MCPServerModal — Clone mode', () => {
  it('opens titled "Clone MCP Server", submit reads "Clone Server", name starts empty', () => {
    render(
      <MCPServerModal
        visible
        mode="clone"
        server={null}
        cloneSource={cloneSource}
        onHide={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    )

    expect(screen.getByRole('dialog', { name: 'Clone MCP Server' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clone Server' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name', { exact: false })).toHaveValue('')
  })

  it('still pre-fills the other fields from the clone source', () => {
    render(
      <MCPServerModal
        visible
        mode="clone"
        server={null}
        cloneSource={cloneSource}
        onHide={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    )

    expect(screen.getByLabelText('Link to MCP documentation', { exact: false })).toHaveValue(
      cloneSource.server_home_url
    )
  })

  it('blocks submit with a required-name error when the empty name is left untouched', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <MCPServerModal
        visible
        mode="clone"
        server={null}
        cloneSource={cloneSource}
        onHide={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Clone Server' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
```

(Leave the `cloneSource` fixture object and the two `vi.mock` calls above the `describe` block untouched — only the test bodies change, and the `suggestedName` prop is simply no longer passed. Add `fireEvent` to the existing `@testing-library/react` import at the top of the file if it isn't imported yet.)

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/pages/settings/administration/components/MCPServerModal/__tests__/MCPServerModal.clone.test.tsx`

Expected: the first test FAILS — `getByLabelText('Name', ...)` currently has value `'Foo'` (falls back to `cloneSource.name` since no `suggestedName` is passed), not `''`. The second and third tests PASS already (unrelated field, and the required-name validation is pre-existing and untouched by this task) — they're regression locks for behavior this task must not break.

- [ ] **Step 3: Make the Clone branch always reset the name to empty, and drop the `suggestedName` prop**

In `src/pages/settings/administration/components/MCPServerModal/useMCPServerModal.ts`:

Change the props interface — remove the `suggestedName` line:

```ts
interface UseMCPServerModalProps {
  visible: boolean
  mode: 'add' | 'edit' | 'clone'
  server: MCPConfig | null
  cloneSource?: MCPConfig | null
  onHide: () => void
  onSubmit: (data: Partial<MCPConfigRequest>) => Promise<void>
}
```

Change `getResetValuesForMode` — drop the `suggestedName` parameter and always use `''` for the clone branch:

```ts
const getResetValuesForMode = (
  mode: 'add' | 'edit' | 'clone',
  server: MCPConfig | null,
  cloneSource: MCPConfig | null | undefined
) => {
  if (mode === 'edit' && server) {
    return getFormValuesFromServer(server)
  }
  if (mode === 'clone' && cloneSource) {
    return { ...getFormValuesFromServer(cloneSource), name: '' }
  }
  return getDefaultFormValues()
}
```

Change the hook's own destructuring and effect to match — remove `suggestedName` from the props destructure and from the `getResetValuesForMode` call and its dependency array:

```ts
export const useMCPServerModal = ({
  visible,
  mode,
  server,
  cloneSource,
  onHide,
  onSubmit,
}: UseMCPServerModalProps) => {
  // ...unchanged body above this point...

  useEffect(() => {
    if (!visible) return
    reset(getResetValuesForMode(mode, server, cloneSource))
  }, [visible, mode, server, cloneSource, reset])

  // ...unchanged body below this point...
```

- [ ] **Step 4: Remove the now-dead `suggestedName` prop from `MCPServerModal`'s own interface**

In `src/pages/settings/administration/components/MCPServerModal/index.tsx`, remove the `suggestedName?: string` line from `MCPServerModalProps`:

```ts
interface MCPServerModalProps {
  visible: boolean
  mode: 'add' | 'edit' | 'clone'
  server: MCPConfig | null
  cloneSource?: MCPConfig | null
  onHide: () => void
  onSubmit: (data: Partial<MCPConfigRequest>) => Promise<void>
}
```

(The component spreads `props` straight into `useMCPServerModal(props)`, so no other line in this file references `suggestedName` — nothing else to change here.)

- [ ] **Step 5: Stop passing the now-removed prop from the page**

In `src/pages/settings/administration/MCPManagementPage.tsx`, remove `suggestedCloneName` from the `useMCPManagement()` destructure:

```ts
  const {
    showModal,
    modalMode,
    editingServer,
    cloneSource,
    fetchingCloneNameId,
    activeCloneId,
    detailsServer,
    handleAddMCPServer,
    handleEditServer,
    handleModalClose,
    handleModalSubmit,
    handleDeleteServer,
    handleCloneMenuClick,
    handleViewDetails,
    handleCloseDetails,
    handleEditFromDetails,
    handleDeleteFromDetails,
  } = useMCPManagement()
```

and remove the `suggestedName={suggestedCloneName}` line from the `<MCPServerModal ... />` usage:

```tsx
        <MCPServerModal
          visible={showModal}
          mode={modalMode}
          server={editingServer}
          cloneSource={cloneSource}
          onHide={handleModalClose}
          onSubmit={handleModalSubmit}
        />
```

`useMCPManagement` itself still returns `suggestedCloneName` and `fetchingCloneNameId` at this point in the plan (Task 2 removes them) — that's fine, a caller is allowed to destructure only part of a hook's return value.

- [ ] **Step 6: Run the test again to verify it passes**

Run: `npx vitest run --project unit src/pages/settings/administration/components/MCPServerModal/__tests__/MCPServerModal.clone.test.tsx`

Expected: both tests PASS.

- [ ] **Step 7: Type-check and run the full MCPServerModal + MCPManagementPage test files**

Run: `npm run typecheck`

Expected: exit 0 — confirms no stray reference to the removed `suggestedName` prop remains anywhere (it would show as `error TS2322` or `error TS2353` at a call site, or `error TS6133` for an unused import/var under `noUnusedLocals`).

Run: `npx vitest run --project unit src/pages/settings/administration/components/MCPServerModal/__tests__ src/pages/settings/administration/__tests__/MCPManagementPage.canClone.test.tsx`

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/pages/settings/administration/components/MCPServerModal/__tests__/MCPServerModal.clone.test.tsx \
        src/pages/settings/administration/components/MCPServerModal/useMCPServerModal.ts \
        src/pages/settings/administration/components/MCPServerModal/index.tsx \
        src/pages/settings/administration/MCPManagementPage.tsx
git commit -m "$(cat <<'EOF'
EPMCDME-15538: Clone form starts with an empty Name field

Cloning an MCP server now pre-fills every field from the source
config except Name, which starts empty and must be filled in by the
user (the existing required-name validation and backend duplicate-
name check are unchanged). Drops the now-unused suggestedName prop
from MCPServerModal/useMCPServerModal.
EOF
)"
```

---

### Task 2: Remove the suggested-clone-name fetch — Clone opens the modal immediately

**Files:**
- Modify: `src/store/mcp.ts`
- Modify: `src/store/__tests__/mcp.test.ts`
- Modify: `src/pages/settings/administration/hooks/useMCPManagement.ts`
- Modify: `src/pages/settings/administration/hooks/__tests__/useMCPManagement.test.ts`
- Modify: `src/pages/settings/administration/MCPManagementPage.tsx`
- Modify: `src/pages/settings/administration/utils/columnRenderers.tsx`
- Modify: `src/pages/settings/administration/components/MCPServerActions.tsx`
- Modify: `src/pages/settings/administration/components/__tests__/MCPServerActions.clone.test.tsx`
- Modify: `src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx`

**Interfaces:**
- Consumes: `mcpStore.cloneConfigFromForm(id, data)` (unchanged — still called from `handleModalSubmit` on form submit).
- Produces: `useMCPManagement()` no longer returns `suggestedCloneName` or `fetchingCloneNameId`. `handleCloneMenuClick(server: MCPConfig): void` becomes synchronous (no longer `Promise<void>`) — it sets `cloneSource`/`modalMode`/`showModal` directly, with no `await`. The row-level "this clone is in flight" signal is renamed from `cloningNameFetchPending` to `cloneDisabled` on `MCPServerActionsProps` and in `columnRenderers.tsx`, and now reflects only "this row's Clone modal is already open" (`activeCloneId === item.id`) rather than "a name fetch is pending OR the modal is open".

- [ ] **Step 1: Write the failing store test change — remove the method's test coverage**

In `src/store/__tests__/mcp.test.ts`, delete the entire `describe('mcpStore.fetchSuggestedCloneName', ...)` block (both its `it(...)` cases and its `beforeEach`/`afterEach`).

- [ ] **Step 2: Write the failing hook test changes — Clone click is synchronous and opens the modal with no fetch**

In `src/pages/settings/administration/hooks/__tests__/useMCPManagement.test.ts`:

Remove `fetchSuggestedCloneName: vi.fn(),` from the `vi.mock('@/store/mcp', ...)` factory.

Replace the whole `describe('useMCPManagement - clone flow', ...)` block with:

```ts
describe('useMCPManagement - clone flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSnapshot.mockReturnValue(mcpStore as unknown as typeof mcpStore)
    vi.mocked(mcpStore.indexConfigs).mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens the modal in clone mode immediately, with no record created and no store call', () => {
    const { result } = renderHook(() => useMCPManagement())

    act(() => {
      result.current.handleCloneMenuClick(baseServer)
    })

    expect(mcpStore.cloneConfigFromForm).not.toHaveBeenCalled()
    expect(result.current.showModal).toBe(true)
    expect(result.current.modalMode).toBe('clone')
    expect(result.current.cloneSource).toEqual(baseServer)
  })

  it('submits via cloneConfigFromForm exactly once in clone mode, not createConfig/updateConfig', async () => {
    vi.mocked(mcpStore.cloneConfigFromForm).mockResolvedValue({ ...baseServer, id: 'server-2' })
    const { result } = renderHook(() => useMCPManagement())

    act(() => {
      result.current.handleCloneMenuClick(baseServer)
    })

    await act(async () => {
      await result.current.handleModalSubmit({ name: 'My Clone' })
    })

    expect(mcpStore.cloneConfigFromForm).toHaveBeenCalledTimes(1)
    expect(mcpStore.cloneConfigFromForm).toHaveBeenCalledWith('server-1', {
      name: 'My Clone',
    })
    expect(mcpStore.createConfig).not.toHaveBeenCalled()
    expect(mcpStore.updateConfig).not.toHaveBeenCalled()
  })
})
```

(This drops the two rejection-handling tests entirely — `handleCloneMenuClick` no longer awaits anything or can reject, so "the name fetch rejects" is no longer a reachable case. `toaster` stays imported in this file for the untouched `describe('useMCPManagement - submit warnings', ...)` block below it.)

- [ ] **Step 3: Run both test files to verify they fail**

Run: `npx vitest run --project unit src/store/__tests__/mcp.test.ts src/pages/settings/administration/hooks/__tests__/useMCPManagement.test.ts`

Expected: `mcp.test.ts` now has no `fetchSuggestedCloneName` tests to fail on (it simply won't reference the method — this file should still pass as-is, since removing tests doesn't make remaining ones fail; proceed to the hook file). `useMCPManagement.test.ts` FAILS: `handleCloneMenuClick` is still `async` and still calls `mcpStore.fetchSuggestedCloneName` internally (undefined in this mock now, since it was removed from the factory) — the new synchronous-call tests will fail because `handleCloneMenuClick(baseServer)` inside a non-`async act(() => ...)` won't have completed the still-async implementation before the assertions run, and/or will throw on calling the now-undefined mock.

- [ ] **Step 4: Remove `fetchSuggestedCloneName` from the store**

In `src/store/mcp.ts`, remove this line from the `MCPStore` interface:

```ts
  /** Fetch a server-suggested name for cloning a configuration (read-only) */
  fetchSuggestedCloneName: (id: string) => Promise<string>
```

and remove the entire method implementation (search for `async fetchSuggestedCloneName`):

```ts
  /**
   * Fetches a server-suggested name for cloning a configuration
   * Pure read: does not mutate `configs` or `pagination`.
   *
   * @param id - The unique identifier of the configuration to suggest a clone name for
   * @returns Promise resolving to the suggested name
   * @throws Error if configuration not found or API request fails
   *
   * @example
   * ```typescript
   * const suggestedName = await mcpStore.fetchSuggestedCloneName('config-123')
   * ```
   */
  async fetchSuggestedCloneName(id: string) {
    this.error = null

    try {
      const response = await api.get(`v1/mcp-configs/${id}/suggested-clone-name`)
      const result = await response.json()

      return result.suggested_name
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to fetch suggested clone name: ${contextualError}`
      console.error('MCP Store Error (fetchSuggestedCloneName):', error)
      throw error
    }
  },
```

- [ ] **Step 5: Make `handleCloneMenuClick` synchronous and drop the suggested-name state**

In `src/pages/settings/administration/hooks/useMCPManagement.ts`:

Remove the `suggestedCloneName`/`setSuggestedCloneName` state, the `fetchingCloneNameId`/`setFetchingCloneNameId` state, and the `cloneRequestRef` (it existed solely to disambiguate overlapping name-fetch requests, which can no longer overlap since there is no fetch):

```ts
export const useMCPManagement = () => {
  const { pagination } = useSnapshot(mcpStore)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'clone'>('add')
  const [editingServer, setEditingServer] = useState<MCPConfig | null>(null)
  const [cloneSource, setCloneSource] = useState<MCPConfig | null>(null)
  const [detailsServer, setDetailsServer] = useState<MCPConfig | null>(null)
  // The row whose Clone modal is currently open, so its menu item stays disabled for the
  // whole lifetime of the open draft, preventing a second click from discarding in-progress edits.
  const activeCloneId = useMemo(
    () => (showModal && modalMode === 'clone' ? cloneSource?.id ?? null : null),
    [showModal, modalMode, cloneSource]
  )
```

Remove the `useRef` import if nothing else in the file uses it (check with `grep -n "useRef" src/pages/settings/administration/hooks/useMCPManagement.ts` — it was only used for `cloneRequestRef`):

```ts
import { useState, useEffect, useCallback, useMemo } from 'react'
```

Update `handleAddMCPServer` and `handleEditServer` to drop the now-removed `cloneRequestRef.current += 1` line (it was only there to invalidate an in-flight name fetch):

```ts
  const handleAddMCPServer = useCallback(() => {
    setEditingServer(null)
    setModalMode('add')
    setShowModal(true)
  }, [])

  const handleEditServer = useCallback((server: MCPConfig) => {
    setEditingServer(server)
    setModalMode('edit')
    setShowModal(true)
  }, [])
```

Update `handleModalClose` to drop `setSuggestedCloneName(undefined)`:

```ts
  const handleModalClose = useCallback(() => {
    setShowModal(false)
    setEditingServer(null)
    setCloneSource(null)
    setModalMode('add')
  }, [])
```

Replace `handleCloneMenuClick` with a synchronous version:

```ts
  // Clone handlers
  const handleCloneMenuClick = useCallback((server: MCPConfig) => {
    setCloneSource(server)
    setModalMode('clone')
    setShowModal(true)
  }, [])
```

Update the hook's return object — remove `suggestedCloneName` and `fetchingCloneNameId`:

```ts
  return {
    // State
    showModal,
    modalMode,
    editingServer,
    cloneSource,
    activeCloneId,
    detailsServer,
    // Modal handlers
    handleAddMCPServer,
    handleEditServer,
    handleModalClose,
    handleModalSubmit,
    // Delete handlers
    handleDeleteServer,
    // Clone handlers
    handleCloneMenuClick,
    // Details handlers
    handleViewDetails,
    handleCloseDetails,
    handleEditFromDetails,
    handleDeleteFromDetails,
  }
```

`toaster` stays imported — it is still used by `handleModalSubmit`'s warning toast and `onFormSubmit` elsewhere in the modal; re-check with `grep -n "toaster" src/pages/settings/administration/hooks/useMCPManagement.ts` after this edit to confirm it is still referenced in this file (it is — `handleModalSubmit` doesn't use it directly, but keep this grep as a safety check since `noUnusedLocals` will fail the build otherwise. If the grep shows no remaining reference, remove the `import toaster from '@/utils/toaster'` line too.)

- [ ] **Step 6: Update `MCPManagementPage.tsx`'s destructure and the `columnRenderers` call**

In `src/pages/settings/administration/MCPManagementPage.tsx`, remove `fetchingCloneNameId` from the `useMCPManagement()` destructure (it already lost `suggestedCloneName` in Task 1):

```ts
  const {
    showModal,
    modalMode,
    editingServer,
    cloneSource,
    activeCloneId,
    detailsServer,
    handleAddMCPServer,
    handleEditServer,
    handleModalClose,
    handleModalSubmit,
    handleDeleteServer,
    handleCloneMenuClick,
    handleViewDetails,
    handleCloseDetails,
    handleEditFromDetails,
    handleDeleteFromDetails,
  } = useMCPManagement()
```

and remove `fetchingCloneNameId` from the `createColumnRenderers` call and its `useMemo` dependency array:

```ts
  const customRenderColumns = useMemo(
    () =>
      createColumnRenderers({
        handleEditServer,
        handleDeleteServer: handleDeleteServerWrapper,
        handleViewDetails,
        onCloneClick: handleCloneMenuClick,
        canClone,
        activeCloneId,
      }),
    [
      handleEditServer,
      handleDeleteServerWrapper,
      handleViewDetails,
      handleCloneMenuClick,
      canClone,
      activeCloneId,
    ]
  )
```

`onCloneClick: handleCloneMenuClick` here now points at a synchronous function; `ColumnRenderersProps.onCloneClick` is currently typed `(server: MCPConfig) => Promise<void>` — this is addressed in Step 7 alongside the rest of `columnRenderers.tsx`.

- [ ] **Step 7: Rename `cloningNameFetchPending`/`fetchingCloneNameId` to `cloneDisabled` in `columnRenderers.tsx` and update `onCloneClick`'s type**

In `src/pages/settings/administration/utils/columnRenderers.tsx`:

```ts
interface ColumnRenderersProps {
  handleEditServer: (server: MCPConfig) => void
  handleDeleteServer: (server: MCPConfig) => void
  handleViewDetails: (server: MCPConfig) => void
  onCloneClick: (server: MCPConfig) => void
  canClone: boolean
  activeCloneId: string | null
}

export const createColumnRenderers = ({
  handleEditServer,
  handleDeleteServer,
  handleViewDetails,
  onCloneClick,
  canClone,
  activeCloneId,
}: ColumnRenderersProps) => ({
  // ...name/categories/description/is_public/is_active renderers unchanged...

  actions: (item: MCPConfig) => (
    <MCPServerActions
      server={item}
      onEdit={handleEditServer}
      onDelete={handleDeleteServer}
      onViewDetails={handleViewDetails}
      onCloneClick={onCloneClick}
      canClone={canClone}
      cloneDisabled={activeCloneId === item.id}
    />
  ),
})
```

- [ ] **Step 8: Rename the prop in `MCPServerActions.tsx` and loosen `onCloneClick`'s type**

In `src/pages/settings/administration/components/MCPServerActions.tsx`:

```ts
interface MCPServerActionsProps {
  server: MCPConfig
  onViewDetails: (server: MCPConfig) => void
  onEdit: (server: MCPConfig) => void
  onDelete: (server: MCPConfig) => void
  onCloneClick: (server: MCPConfig) => void
  canClone: boolean
  cloneDisabled: boolean
}

const MCPServerActions: FC<MCPServerActionsProps> = ({
  server,
  onViewDetails,
  onEdit,
  onDelete,
  onCloneClick,
  canClone,
  cloneDisabled,
}) => {
  const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] = useState(false)

  const showDeleteConfirmation = useCallback(() => {
    setIsDeleteConfirmationVisible(true)
  }, [])

  const confirmDelete = useCallback(() => {
    setIsDeleteConfirmationVisible(false)
    onDelete(server)
  }, [server, onDelete])

  const handleCloneClick = useCallback(() => {
    onCloneClick(server)
  }, [server, onCloneClick])
```

and update the `menuActions` entry:

```ts
    {
      title: 'Clone',
      icon: <CopySvg className="w-[18px] h-3.5" />,
      onClick: handleCloneClick,
      disabled: cloneDisabled,
      hidden: !canClone,
    },
```

`handleCloneClick` no longer needs a `.catch(() => {})` — `onCloneClick` is synchronous now and cannot reject.

- [ ] **Step 9: Update the two `MCPServerActions` test files for the renamed, now-synchronous prop**

In `src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx`, update the helper and the three tests:

```ts
const renderActions = (onCloneClick: (server: any) => void, cloneDisabled = false) =>
  render(
    <div>
      <span id={mcpServerNameId('mcp-1')}>My MCP Server</span>
      <MCPServerActions
        server={server}
        onViewDetails={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCloneClick={onCloneClick}
        canClone
        cloneDisabled={cloneDisabled}
      />
    </div>
  )

describe('MCPServerActions — Clone menu item', () => {
  it('clicking Clone calls onCloneClick directly with no dialog ever appearing', () => {
    const onCloneClick = vi.fn()
    renderActions(onCloneClick)
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clone' }))
    expect(onCloneClick).toHaveBeenCalledTimes(1)
    expect(onCloneClick).toHaveBeenCalledWith(server)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is disabled while this row\'s clone modal is already open', () => {
    const onCloneClick = vi.fn()
    renderActions(onCloneClick, true)
    open()
    const cloneItem = screen.getByRole('menuitem', { name: 'Clone' })
    expect(cloneItem).toBeDisabled()
    fireEvent.click(cloneItem)
    expect(onCloneClick).not.toHaveBeenCalled()
  })
})
```

(Drop the third test, `'returns to normal state and shows no dialog when onCloneClick rejects'` — `onCloneClick` can no longer reject, so there is nothing left to assert there.)

In `src/pages/settings/administration/components/__tests__/MCPServerActions.clone.test.tsx`, read the file first and rename every `cloningNameFetchPending` prop occurrence to `cloneDisabled` (same mechanical rename as above); if that file's `onCloneClick` mocks use `.mockResolvedValue(undefined)`, change them to plain `vi.fn()` since the prop type is no longer a `Promise`-returning function.

- [ ] **Step 10: Run the full set of touched test files**

Run: `npx vitest run --project unit src/store/__tests__/mcp.test.ts src/pages/settings/administration/hooks/__tests__/useMCPManagement.test.ts src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx src/pages/settings/administration/components/__tests__/MCPServerActions.clone.test.tsx src/pages/settings/administration/__tests__/MCPManagementPage.canClone.test.tsx src/pages/settings/administration/components/MCPServerModal/__tests__`

Expected: all PASS.

- [ ] **Step 11: Type-check and run lint**

Run: `npm run typecheck`

Expected: exit 0 — in particular, confirms no leftover `cloningNameFetchPending`/`fetchingCloneNameId`/`fetchSuggestedCloneName`/`suggestedCloneName` reference anywhere (grep as a belt-and-braces check: `grep -rn "cloningNameFetchPending\|fetchingCloneNameId\|fetchSuggestedCloneName\|suggestedCloneName" src/` should return nothing).

Run: `npm run lint`

Expected: exit 0.

- [ ] **Step 12: Run the full pre-MR test suites**

Run: `npm run test:unit:slnt`

Run: `npm run test:integration:slnt`

Expected: both exit 0, summary shows `X passed` with no failures.

- [ ] **Step 13: Commit**

```bash
git add src/store/mcp.ts \
        src/store/__tests__/mcp.test.ts \
        src/pages/settings/administration/hooks/useMCPManagement.ts \
        src/pages/settings/administration/hooks/__tests__/useMCPManagement.test.ts \
        src/pages/settings/administration/MCPManagementPage.tsx \
        src/pages/settings/administration/utils/columnRenderers.tsx \
        src/pages/settings/administration/components/MCPServerActions.tsx \
        src/pages/settings/administration/components/__tests__/MCPServerActions.clone.test.tsx \
        src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx
git commit -m "$(cat <<'EOF'
EPMCDME-15538: open Clone modal immediately, drop name-suggestion fetch

Clicking Clone no longer calls the backend for a suggested
"Copy N of <name>" and no longer shows a loading/disabled state while
that fetch is in flight — the form now opens synchronously (Task 1
already made it start with an empty Name). The per-row disabled
signal is renamed cloningNameFetchPending -> cloneDisabled and now
means only "this row's Clone modal is already open".
EOF
)"
```
