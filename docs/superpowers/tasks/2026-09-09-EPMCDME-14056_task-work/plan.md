# EPMCDME-14056 — AddUserModal User Search Debounce

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Debounce `handleUserSearch` in `AddUserModal.tsx` so `/users?search` fires at most once
per 300 ms burst, with out-of-order response protection matching the `UserEmailAutocomplete`
pattern.

**Architecture:** Replicate the `useRef` pattern already present in `UserEmailAutocomplete.tsx`:
`debounceRef` delays the network call; `requestIdRef` discards stale responses; both are cancelled
in `resetFormState` and the unmount effect. No other file changes are required.

**Tech Stack:** React 18 · TypeScript 5 · Vitest 1.6.1 + React Testing Library
(`vi.useFakeTimers` / `vi.advanceTimersByTimeAsync`)

**Spec:** Inline requirements — EPMCDME-14056

## Acceptance criteria

- [ ] Typing in the Project Management Add User search field does not trigger a `/users?search`
      request on every keystroke.
- [ ] A single `/users?search` request fires after the 300 ms debounce window elapses.
- [ ] Search results are updated correctly for the final typed value.
- [ ] Selecting a user and submitting the form continues to work.
- [ ] No regression to members table, role selection, or project assignment request.

## Global Constraints

- Debounce via `useRef` + `setTimeout`/`clearTimeout` at 300 ms — **not** `lodash.debounce`.
- Do not modify `MultiSelect.tsx`, `userStore`, or `ProjectMembersManager.tsx`.
- Commit per task using the repository's existing convention.

---

### Task 1: Debounce `handleUserSearch` and add request-ID guard

Test-first: yes — `userStore.searchUsers` is not called for three rapid `onFilter` invocations
fired within the 300 ms debounce window

**Files:**
- Modify: `src/pages/settings/administration/components/AddUserModal.tsx`
- Create: `src/pages/settings/administration/components/__tests__/AddUserModal.test.tsx`

- [ ] **Step 1: Create the test file with three failing debounce tests**

`src/pages/settings/administration/components/__tests__/AddUserModal.test.tsx` — new file.
Mirror the mock structure from `ProjectSelector.test.tsx`: stub `MultiSelect` to capture
`onFilter`, `onChange`, and `options`; stub `Popup` as a passthrough; mock
`userStore.searchUsers`.

```tsx
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockSearchUsers = vi.fn()
vi.mock('@/store/user', () => ({ userStore: { searchUsers: mockSearchUsers } }))

let capturedOnFilter: ((v: string) => void) | undefined
let capturedOnChange: ((e: any) => void) | undefined
let capturedPopupSubmit: (() => void) | undefined
let capturedOptions: any[] = []

vi.mock('@/components/form/MultiSelect', () => ({
  default: ({ onFilter, onChange, options }: any) => {
    capturedOnFilter = onFilter
    capturedOnChange = onChange
    capturedOptions = options ?? []
    return <div />
  },
}))
vi.mock('@/components/Popup', () => ({
  default: ({ children, onSubmit }: any) => {
    capturedPopupSubmit = onSubmit
    return <div>{children}</div>
  },
}))

import AddUserModal from '../AddUserModal'

beforeEach(() => {
  mockSearchUsers.mockReset()
  mockSearchUsers.mockResolvedValue([])
  capturedOptions = []
})

describe('AddUserModal debounce', () => {
  afterEach(() => vi.useRealTimers())

  it('suppresses backend calls during rapid typing', async () => {
    vi.useFakeTimers()
    render(<AddUserModal visible onHide={vi.fn()} onSubmit={vi.fn()} />)
    capturedOnFilter?.('a')
    await vi.advanceTimersByTimeAsync(100)
    capturedOnFilter?.('ab')
    await vi.advanceTimersByTimeAsync(100)
    capturedOnFilter?.('abc')
    expect(mockSearchUsers).not.toHaveBeenCalled()
  })

  it('fires exactly once after the window elapses', async () => {
    vi.useFakeTimers()
    render(<AddUserModal visible onHide={vi.fn()} onSubmit={vi.fn()} />)
    capturedOnFilter?.('a')
    await vi.advanceTimersByTimeAsync(100)
    capturedOnFilter?.('ab')
    await vi.advanceTimersByTimeAsync(100)
    capturedOnFilter?.('abc')
    await vi.advanceTimersByTimeAsync(300)
    expect(mockSearchUsers).toHaveBeenCalledTimes(1)
    expect(mockSearchUsers).toHaveBeenCalledWith('abc', 10)
  })

  it('ignores stale responses when a newer request completes first', async () => {
    let resolveFirst!: (v: any[]) => void
    let resolveSecond!: (v: any[]) => void
    mockSearchUsers
      .mockReturnValueOnce(new Promise<any[]>(r => { resolveFirst = r }))
      .mockReturnValueOnce(new Promise<any[]>(r => { resolveSecond = r }))

    vi.useFakeTimers()
    render(<AddUserModal visible onHide={vi.fn()} onSubmit={vi.fn()} />)

    // Fire first search and let debounce elapse
    capturedOnFilter?.('ab')
    await vi.advanceTimersByTimeAsync(300)

    // Fire second search before first resolves and let its debounce elapse
    capturedOnFilter?.('abc')
    await vi.advanceTimersByTimeAsync(300)

    // Newer response (abc) resolves first
    await act(async () => {
      resolveSecond([{ id: 'u2', name: 'Fresh User', email: 'fresh@example.com' }])
    })

    // Stale response (ab) resolves second
    await act(async () => {
      resolveFirst([{ id: 'u1', name: 'Stale User', email: 'stale@example.com' }])
    })

    // Options must reflect the fresh response; stale must not overwrite
    expect(capturedOptions).toEqual([
      { label: 'Fresh User (fresh@example.com)', value: 'u2' },
    ])
  })
})
```

- [ ] **Step 2: Run the tests — confirm all three fail**

`npx vitest run src/pages/settings/administration/components/__tests__/AddUserModal.test.tsx`

Expected: all three fail — `searchUsers` is called immediately on every `onFilter` invocation and
`capturedOptions` is not guarded against stale resolutions.

- [ ] **Step 3: Add imports, constant, refs, and unmount cleanup to `AddUserModal.tsx`**

`AddUserModal.tsx:16` — add `useRef` and `useEffect` to the existing React import.

After `SEARCH_RESULTS_LIMIT = 10` (line 38), add the constant:

```ts
const SEARCH_DEBOUNCE_MS = 300
```

Inside the component body, after the state declarations (line 61), add:

```ts
const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
const requestIdRef = useRef(0)
useEffect(() => () => { clearTimeout(debounceRef.current) }, [])
```

- [ ] **Step 4: Replace `handleUserSearch` (lines 71–98) with `runSearch` + debounce wrapper**

`runSearch` is a new symbol — show in full. `handleUserSearch` replaces the existing callback
with the debounce wrapper:

```ts
const runSearch = useCallback(async (query: string) => {
  requestIdRef.current += 1
  const requestId = requestIdRef.current
  setIsLoadingUsers(true)
  try {
    const users = await userStore.searchUsers(query, SEARCH_RESULTS_LIMIT)
    if (requestId !== requestIdRef.current) return
    setUserOptions(users.map((u) => ({ label: `${u.name} (${u.email})`, value: u.id })))
  } catch (error: any) {
    if (requestId !== requestIdRef.current) return
    console.error('Failed to search users:', error)
    toaster.error(error?.parsedError?.message || error?.message || 'Failed to search users')
    setUserOptions([])
  } finally {
    if (requestId === requestIdRef.current) setIsLoadingUsers(false)
  }
}, [])

const handleUserSearch = useCallback((query: string) => {
  clearTimeout(debounceRef.current)
  setSelectedUserId(''); setUserIdError('')
  if (query.length < MIN_SEARCH_LENGTH) {
    requestIdRef.current += 1; setUserOptions([]); return
  }
  debounceRef.current = setTimeout(() => runSearch(query), SEARCH_DEBOUNCE_MS)
}, [runSearch])
```

- [ ] **Step 5: Cancel debounce in `resetFormState` (`AddUserModal.tsx:63–69`)**

Add `clearTimeout(debounceRef.current)` and `requestIdRef.current += 1` as the first two
statements of `resetFormState`, before the existing `reset()` call.

- [ ] **Step 6: Run the tests — confirm all three pass**

`npx vitest run src/pages/settings/administration/components/__tests__/AddUserModal.test.tsx`

---

### Task 2: Submit-path regression test

Test-first: no — adds coverage for pre-existing user-select and form-submit behavior that has no
test file

**Files:**
- Modify: `src/pages/settings/administration/components/__tests__/AddUserModal.test.tsx`

- [ ] **Step 1: Add submit-path test to the existing test file**

The mock setup in Task 1 already captures `capturedOnChange` and `capturedPopupSubmit`. Add a
second `describe` block after the debounce block. The `Popup` stub's `onSubmit` is
`handleSubmit(handleFormSubmit)`, which calls through to `props.onSubmit` once `selectedUserId`
is non-empty. Wrap the `capturedOnChange` call and the `capturedPopupSubmit` call each in their
own `await act(async () => { ... })` so React 19 has fully re-rendered and committed the
`selectedUserId` state before the submit handler reads it.

```tsx
import { waitFor } from '@testing-library/react'

describe('AddUserModal submit path', () => {
  it('calls props.onSubmit with userId and default role after user selection', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<AddUserModal visible onHide={vi.fn()} onSubmit={onSubmit} />)
    await act(async () => {
      capturedOnChange?.({ target: { value: 'user-abc' } })
    })
    await act(async () => {
      capturedPopupSubmit?.()
    })
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ userIdentifier: 'user-abc', role: 'user' })
    )
  })
})
```

---

## Negative-constraint pass

| Constraint | Honored by |
|---|---|
| Must not use `lodash.debounce` | Task 1 Step 4 uses only `setTimeout`/`clearTimeout`; no new imports added |
| Must not regress submit path | Task 2 adds a dedicated regression test; `handleFormSubmit`, `props.onSubmit`, and role state are untouched |
| Must not regress members table / role / assignment | No changes to `ProjectMembersManager.tsx`, `userStore`, `MultiSelect`, or role/assignment code paths |
| `resetFormState` must cancel the pending timer | Task 1 Step 5 adds `clearTimeout` + `requestIdRef.current += 1` as the first lines of `resetFormState` |
| `console.error` must be preserved in catch | Task 1 Step 4 includes `console.error('Failed to search users:', error)` as first line of catch |

negative-constraints: none beyond those listed above.
