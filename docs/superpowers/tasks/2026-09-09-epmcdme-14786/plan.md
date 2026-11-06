# EPMCDME-14786: Share Assistant with Selected Users — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Share for Collaboration" action and modal that lets assistant owners grant/revoke per-user access via four new backend endpoints.

**Architecture:** New types file (`src/types/entity/sharing.ts`) → four new methods on `assistantsStore` → new `ShareAssistantPopup` component under `src/pages/assistants/components/ShareAssistantPopup/` → Share action item added to `AssistantActions`. The owner filter, modal wrapper, chip-select, and toast patterns are all already established.

**Tech Stack:** React 18 · TypeScript 5 · Valtio · PrimeReact MultiSelect · `Popup` component · `toaster` utility

**Spec:** `docs/superpowers/tasks/2026-09-09-epmcdme-14786/spec.md`

## Global Constraints

- Modal wrapper: always `src/components/Popup/Popup.tsx`, never raw PrimeReact Dialog.
- API calls only in `src/store/assistants.ts` — components never call `api.*` directly.
- Owner gate: `canEdit(assistant)` from `src/utils/entity.ts`.
- DELETE with body: call `api.delete(url, body)` — do **not** call `.json()` on the response unless backend confirms a body.
- Commit per task using the repository's existing convention (ticket prefix `EPMCDME-14786`).

---

### Task 1: Add sharing type interfaces

**Files:**
- Create: `src/types/entity/sharing.ts`

**Interfaces:**
- Produces: `SharedWithUser`, `SharableUser` — consumed by Tasks 2 and 3.

**Test-first: no** — type declarations have no runtime behaviour.

- [ ] **Step 1: Create `src/types/entity/sharing.ts`**

```ts
export interface SharedWithUser {
  id: string
  name: string
  email: string
  picture?: string
}

export interface SharableUser {
  id: string
  name: string
  email: string
  picture?: string
}
```

- [ ] **Step 2: Commit**

Stage `src/types/entity/sharing.ts` and commit with message `feat(EPMCDME-14786): add sharing type interfaces`.

---

### Task 2: Add four sharing methods to assistantsStore

**Files:**
- Modify: `src/store/assistants.ts` — `AssistantsStoreType` interface (lines ~69–200) and the `assistantsStore` proxy body.

**Interfaces:**
- Consumes: `SharedWithUser`, `SharableUser` from `src/types/entity/sharing.ts`.
- Produces:
  - `assistantsStore.getSharedWith(id: string): Promise<SharedWithUser[]>`
  - `assistantsStore.shareWith(id: string, userIds: string[]): Promise<void>`
  - `assistantsStore.removeShare(id: string, userIds: string[]): Promise<void>`
  - `assistantsStore.getSharableUsers(id: string, query: string): Promise<SharableUser[]>`

**Test-first: no** — store methods follow the established `api.*` pattern already tested at the HTTP layer; no business logic branches.

- [ ] **Step 1: Import new types in `src/store/assistants.ts`**

Add to the existing type-import block near the top of the file:

```ts
import { SharedWithUser, SharableUser } from '@/types/entity/sharing'
```

- [ ] **Step 2: Add method signatures to `AssistantsStoreType`**

Inside the `AssistantsStoreType` interface body, append:

```ts
getSharedWith: (id: string) => Promise<SharedWithUser[]>
shareWith: (id: string, userIds: string[]) => Promise<void>
removeShare: (id: string, userIds: string[]) => Promise<void>
getSharableUsers: (id: string, query: string) => Promise<SharableUser[]>
```

- [ ] **Step 3: Add method implementations to `assistantsStore` proxy**

Inside the `assistantsStore = proxy<AssistantsStoreType>({...})` body, append after the last method:

```ts
async getSharedWith(id) {
  const response = await api.get(`v1/assistants/${id}/shared-with`)
  return response.json() as Promise<SharedWithUser[]>
},

async shareWith(id, userIds) {
  await api.post(`v1/assistants/${id}/share`, { user_ids: userIds })
},

async removeShare(id, userIds) {
  await api.delete(`v1/assistants/${id}/share`, { user_ids: userIds })
},

async getSharableUsers(id, query) {
  const response = await api.get(`v1/assistants/${id}/sharable-users?q=${encodeURIComponent(query)}`)
  return response.json() as Promise<SharableUser[]>
},
```

- [ ] **Step 4: Commit**

Stage `src/store/assistants.ts` and `src/types/entity/sharing.ts`, commit with message `feat(EPMCDME-14786): add sharing store methods`.

---

### Task 3: Build ShareAssistantPopup component

**Files:**
- Create: `src/pages/assistants/components/ShareAssistantPopup/ShareAssistantPopup.tsx`
- Create: `src/pages/assistants/components/ShareAssistantPopup/index.ts`

**Interfaces:**
- Consumes:
  - `assistantsStore.getSharedWith`, `assistantsStore.shareWith`, `assistantsStore.removeShare`, `assistantsStore.getSharableUsers`
  - `SharedWithUser`, `SharableUser` from `src/types/entity/sharing`
  - `Popup` from `src/components/Popup/Popup.tsx` (`visible`, `onHide`, `header`, `footerContent`)
  - `MultiSelect` from `src/components/form/MultiSelect/MultiSelect.tsx` (`display="chip"`, `onFilter`, `options`, `value`, `onChange`, `optionLabel`, `optionValue`)
  - `UserAvatar` from `src/pages/settings/administration/usersManagement/components/UserAvatar.tsx` (`src`, `name`, `size`)
  - `Button` from `src/components/Button/Button.tsx` (`variant`, `onClick`, `disabled`)
  - `ButtonType` from `src/constants`
  - `toaster` from `src/utils/toaster`
  - `userStore` from `src/store/user` (for owner filter: `userStore.user?.userId`)
- Produces: `ShareAssistantPopup` — consumed by Task 4.

**Test-first: yes** — failing test: render the popup with `visible={true}`, verify the header "Share for Collaboration" is present, the Share button is disabled when no users are selected and none are removed, and Cancel calls `onHide` without any store call.

- [ ] **Step 1: Write the failing test at `src/pages/assistants/components/ShareAssistantPopup/__tests__/ShareAssistantPopup.test.tsx`**

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ShareAssistantPopup from '../ShareAssistantPopup'

const mockAssistant = {
  id: 'asst-1',
  name: 'Test Assistant',
} as any

vi.mock('@/store/assistants', () => ({
  assistantsStore: {
    getSharedWith: vi.fn().mockResolvedValue([]),
    getSharableUsers: vi.fn().mockResolvedValue([]),
    shareWith: vi.fn().mockResolvedValue(undefined),
    removeShare: vi.fn().mockResolvedValue(undefined),
  },
}))
vi.mock('@/store/user', () => ({ userStore: { user: { userId: 'owner-1' } } }))
vi.mock('@/utils/toaster', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

describe('ShareAssistantPopup', () => {
  const onHide = vi.fn()

  beforeEach(() => { vi.clearAllMocks() })

  it('renders the header', async () => {
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    expect(await screen.findByText('Share for Collaboration')).toBeInTheDocument()
  })

  it('Share button is disabled when nothing is pending', async () => {
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share for Collaboration')
    expect(screen.getByRole('button', { name: /^Share$/ })).toBeDisabled()
  })

  it('Cancel calls onHide without API calls', async () => {
    const { assistantsStore } = await import('@/store/assistants')
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share for Collaboration')
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }))
    expect(onHide).toHaveBeenCalled()
    expect(assistantsStore.shareWith).not.toHaveBeenCalled()
    expect(assistantsStore.removeShare).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `npx vitest run src/pages/assistants/components/ShareAssistantPopup/__tests__/ShareAssistantPopup.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/pages/assistants/components/ShareAssistantPopup/ShareAssistantPopup.tsx`**

```tsx
import React, { useState, useEffect, useRef } from 'react'

import Button from '@/components/Button/Button'
import MultiSelect, { MultiSelectOptionType } from '@/components/form/MultiSelect/MultiSelect'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import UserAvatar from '@/pages/settings/administration/usersManagement/components/UserAvatar'
import { assistantsStore } from '@/store/assistants'
import { userStore } from '@/store/user'
import { Assistant } from '@/types/entity/assistant'
import { SharableUser, SharedWithUser } from '@/types/entity/sharing'
import toaster from '@/utils/toaster'

interface ShareAssistantPopupProps {
  visible: boolean
  assistant: Assistant | null
  onHide: () => void
}

const ShareAssistantPopup: React.FC<ShareAssistantPopupProps> = ({ visible, assistant, onHide }) => {
  const [sharedWith, setSharedWith] = useState<SharedWithUser[]>([])
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [selectedUsers, setSelectedUsers] = useState<SharableUser[]>([])
  const [searchOptions, setSearchOptions] = useState<MultiSelectOptionType[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!visible || !assistant) return
    setSharedWith([])
    setRemovedIds(new Set())
    setSelectedUsers([])
    setSearchOptions([])
    assistantsStore
      .getSharedWith(assistant.id)
      .then((users) => {
        const currentUserId = userStore.user?.userId
        setSharedWith(users.filter((u) => u.id !== currentUserId))
      })
      .catch(() => toaster.error('Failed to load shared users.'))
  }, [visible, assistant])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleFilter = (query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query || !assistant) {
      setSearchOptions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await assistantsStore.getSharableUsers(assistant.id, query)
        const sharedIds = new Set(sharedWith.map((u) => u.id))
        const filtered = results.filter((u) => !sharedIds.has(u.id))
        setSearchOptions(
          filtered.map((u) => ({ label: u.name, value: u.id, email: u.email, picture: u.picture }))
        )
      } catch {
        setSearchOptions([])
      }
    }, 300)
  }

  const handleRemove = (userId: string) => {
    setRemovedIds((prev) => new Set([...prev, userId]))
    setSharedWith((prev) => prev.filter((u) => u.id !== userId))
  }

  const handleShare = async () => {
    if (!assistant) return
    setIsSaving(true)
    try {
      const calls: Promise<void>[] = []
      if (selectedUsers.length > 0) {
        calls.push(assistantsStore.shareWith(assistant.id, selectedUsers.map((u) => u.id)))
      }
      if (removedIds.size > 0) {
        calls.push(assistantsStore.removeShare(assistant.id, [...removedIds]))
      }
      await Promise.all(calls)
      toaster.success('Assistant sharing updated.')
      onHide()
    } catch {
      toaster.error('Failed to update sharing. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const canShare = selectedUsers.length > 0 || removedIds.size > 0

  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button variant={ButtonType.BASE} onClick={onHide} disabled={isSaving}>
        Cancel
      </Button>
      <Button variant={ButtonType.PRIMARY} onClick={handleShare} disabled={!canShare || isSaving}>
        {isSaving ? 'Sharing…' : 'Share'}
      </Button>
    </div>
  )

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header="Share for Collaboration"
      footerContent={footerContent}
      className="w-[560px]"
    >
      <div className="flex flex-col gap-4">
        <MultiSelect
          display="chip"
          placeholder="Search users by name or email"
          options={searchOptions}
          value={selectedUsers.map((u) => u.id)}
          optionLabel="label"
          optionValue="value"
          onFilter={handleFilter}
          onChange={(e) => {
            const ids: string[] = e.value
            setSelectedUsers((prev) => {
              const kept = prev.filter((u) => ids.includes(u.id))
              const addedIds = ids.filter((id) => !prev.some((u) => u.id === id))
              const added = addedIds.flatMap((id) => {
                const opt = searchOptions.find((o) => o.value === id)
                if (!opt) return []
                return [{ id, name: String(opt.label), email: String(opt.email ?? ''), picture: opt.picture as string | undefined }]
              })
              return [...kept, ...added]
            })
          }}
          fullWidth
        />

        {sharedWith.length > 0 && (
          <div>
            <p className="text-xs text-text-quaternary mb-2">People With Access</p>
            <ul className="flex flex-col gap-2">
              {sharedWith.map((user) => (
                <li key={user.id} className="flex items-center gap-3">
                  <UserAvatar src={user.picture} name={user.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-text-secondary truncate">{user.email}</p>
                  </div>
                  <Button
                    variant={ButtonType.BASE}
                    onClick={() => handleRemove(user.id)}
                    disabled={isSaving}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Popup>
  )
}

export default ShareAssistantPopup
```

- [ ] **Step 4: Create `src/pages/assistants/components/ShareAssistantPopup/index.ts`**

```ts
export { default } from './ShareAssistantPopup'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/pages/assistants/components/ShareAssistantPopup/__tests__/ShareAssistantPopup.test.tsx`
Expected: all three tests PASS.

- [ ] **Step 6: Commit**

Stage all new files under `src/pages/assistants/components/ShareAssistantPopup/` and commit with message `feat(EPMCDME-14786): add ShareAssistantPopup component`.

---

### Task 4: Wire Share action into AssistantActions

**Files:**
- Modify: `src/pages/assistants/AssistantActions/AssistantActions.tsx`

**Interfaces:**
- Consumes: `ShareAssistantPopup` default export from `src/pages/assistants/components/ShareAssistantPopup`.
- Consumes: `canEditAssistant` (already computed at line 79).

**Test-first: yes** — failing test: render `AssistantActions` with an assistant that has `user_abilities: ['write']`, verify a "Share" menu item exists; render with no abilities, verify it is absent.

- [ ] **Step 1: Write the failing test**

Add a new `describe` block to the existing test file `src/pages/assistants/AssistantActions/__tests__/AssistantActions.accessibility.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event'

// append to existing vi.mock list at the top of the file:
// vi.mock('@/pages/assistants/components/ShareAssistantPopup', () => ({ default: () => null }))
// vi.mock('@/assets/icons/share.svg?react', () => ({ default: () => <span /> }))
// (add these two mocks to the existing mock block)

describe('Share action visibility', () => {
  it('shows Share action for owners (user_abilities includes write)', async () => {
    const user = userEvent.setup()
    render(
      <AssistantActions
        assistant={makeAssistant({ user_abilities: ['write'] })}
      />
    )
    await user.click(screen.getByRole('button', { name: /More options/ }))
    expect(await screen.findByText('Share')).toBeInTheDocument()
  })

  it('hides Share action for non-owners', async () => {
    const user = userEvent.setup()
    render(<AssistantActions assistant={makeAssistant({ user_abilities: [] })} />)
    await user.click(screen.getByRole('button', { name: /More options/ }))
    expect(screen.queryByText('Share')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `npx vitest run src/pages/assistants/AssistantActions/__tests__/AssistantActions.accessibility.test.tsx`
Expected: FAIL — "Share" is not in the document.

- [ ] **Step 3: Add Share icon import to `AssistantActions.tsx`**

Add after the existing SVG import block (around line 26):

```ts
import ShareSvg from '@/assets/icons/share.svg?react'
```

If `share.svg` does not exist in `src/assets/icons/`, use a nearby icon (e.g. `copy-link.svg`) as a placeholder and note it in the commit message; the design team can swap it.

- [ ] **Step 4: Add `isSharePopupVisible` state and import the popup**

After the existing `useState` line (line 58–60), add:

```tsx
const [isSharePopupVisible, setIsSharePopupVisible] = useState(false)
```

Add import near the other component imports:

```tsx
import ShareAssistantPopup from '../components/ShareAssistantPopup'
```

- [ ] **Step 5: Add Share action item to `assistantActions` array**

Insert after the `clone` item (after line 110) in the `assistantActions` array:

```tsx
{
  id: 'share',
  label: 'Share',
  icon: <ShareSvg />,
  isVisible: canEditAssistant,
  onClick: () => setIsSharePopupVisible(true),
},
```

- [ ] **Step 6: Render `ShareAssistantPopup` in the JSX return**

Add after the closing `</PublishToMarketplaceModal>` tag (around line 184), before the final closing `</>`:

```tsx
<ShareAssistantPopup
  visible={isSharePopupVisible}
  assistant={assistant}
  onHide={() => setIsSharePopupVisible(false)}
/>
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/pages/assistants/AssistantActions/__tests__/AssistantActions.accessibility.test.tsx`
Expected: all tests PASS (including the pre-existing accessibility tests).

- [ ] **Step 8: Commit**

Stage `src/pages/assistants/AssistantActions/AssistantActions.tsx` and the test file, commit with message `feat(EPMCDME-14786): add Share action to AssistantActions`.

---

### Task 5: Add mock-server routes for local development

**Files:**
- Modify: `mock-server/db.json` — add four new route stubs for the sharing endpoints.

**Test-first: no** — mock data, not logic.

- [ ] **Step 1: Inspect the current state of `mock-server/db.json`**

The file has uncommitted changes (per git status). Check `git diff mock-server/db.json` before editing to understand what is already in flight and avoid merge conflicts.

- [ ] **Step 2: Add sharing route entries**

In the `mock-server/db.json` routes object (or equivalent structure), add entries that let the local mock server respond to:

- `GET /v1/assistants/:id/shared-with` → `[]` (empty array)
- `POST /v1/assistants/:id/share` → `{}` (200 OK)
- `DELETE /v1/assistants/:id/share` → `{}` (200 OK)
- `GET /v1/assistants/:id/sharable-users` → sample array:

```json
[
  { "id": "u-sample-1", "name": "Alice Example", "email": "alice@example.com", "picture": null },
  { "id": "u-sample-2", "name": "Bob Example", "email": "bob@example.com", "picture": null }
]
```

Follow the exact structure already used by other assistant endpoints in `db.json`. If the mock server uses `json-server`, the route format is the standard `routes.json` or inline `db` shape — match whatever the existing assistant entries use.

- [ ] **Step 3: Commit**

Stage `mock-server/db.json`, commit with message `feat(EPMCDME-14786): add mock-server routes for sharing endpoints`.

---

## Negative-constraint pass

| Constraint | Where | Status |
|---|---|---|
| Do not confuse `shared: boolean` (marketplace) with per-user sharing | `ShareAssistantPopup` never reads or writes `assistant.shared`; types are in separate `sharing.ts` file | honored |
| No external sharing | No UI or API path for external users is added | honored |
| No permission-level change for existing shared users | Remove-only actions; no PATCH/PUT endpoint consumed | honored |
| No bulk-share from multi-selection | Feature is scoped to single-assistant action menu | honored |
| No real-time updates (no polling/WebSocket) | `getSharedWith` is called once on modal open; no interval/subscription | honored |
| No email notifications | No notification call anywhere in the plan | honored |
| No changes to `shared: boolean` or marketplace logic | `AssistantActions` changes are additive only | honored |
| No nginx/Dockerfile/pipeline changes | No such files modified | honored |
| Owner never appears in People With Access | Task 3 filters `userStore.user?.userId` from `getSharedWith` results | honored |
