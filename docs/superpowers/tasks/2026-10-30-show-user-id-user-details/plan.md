# Show User ID on User Details Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the selected user's ID in the User Details identity section, alongside the existing name and email.

**Architecture:** Single-file, display-only addition to `UserDetailsPopup.tsx`. Reuse the `DetailsCopyField` component already rendering the email row (`readOnlyText` variant) for a new, labeled "ID" row directly below it. `user.id` is already fetched by `userStore.getUserById` and already used internally — no store, type, or API change.

**Tech Stack:** React, TypeScript, Vitest + React Testing Library.

**Spec:** No spec document for this task (EPMCDME-16611, requirements supplied inline). Technical analysis: `docs/superpowers/tasks/2026-10-30-show-user-id-user-details/technical-analysis.md`.

## Acceptance criteria

- [ ] The User Details view displays the selected user's ID alongside their name and email.
- [ ] The displayed ID belongs to the user whose details are open (matches `user.id` from `getUserById`).
- [ ] Adding the ID does not remove or alter the existing name and email information.
- [ ] The existing User Details content and interactions remain available.

## Global Constraints

- Single file for implementation: `UserDetailsPopup.tsx`. No store, type, or API change.
- Reuse `DetailsCopyField` (already imported) — no new component, no new pattern.
- Commit per task using the repository's existing convention.

## Negative constraints

- "Do not remove or alter the existing name and email" → Task 1 only *adds* a new `DetailsCopyField` element after the existing email one; the `<h3>{user.name}</h3>` and email `DetailsCopyField` lines are untouched.
- "No store, type, or API change is needed" → Task 1 touches only `UserDetailsPopup.tsx` (plus a new test file); `src/store/user.ts` and `src/types/entity/user.ts` are not edited.
- "Do not introduce a new component or pattern" → Task 1 reuses the existing `DetailsCopyField` import, same `readOnlyText` variant as the email row.

---

### Task 1: Render the user ID via `DetailsCopyField` in the identity section

**Files:**
- Modify: `src/pages/settings/administration/usersManagement/components/popups/UserDetailsPopup.tsx:251-256`
- Create: `src/pages/settings/administration/usersManagement/components/popups/__tests__/UserDetailsPopup.identityId.test.tsx`

**Test-first: yes — new test asserts `DetailsCopyField` is invoked with `{ label: 'ID', value: 'target-1' }` for a rendered user, which fails today because no such call is made.**

- [ ] **Step 1: Write the failing test**

Create the test file. It mocks every dependency `UserDetailsPopup` imports (store, `valtio`, feature flag, `Popup`, `Spinner`, `Button`, `Tooltip`, `Switch`, `Select`, `SpendingCard`, `BudgetAssignmentsEditor`, `UserAvatar`, `UserProjectsTable`) the same way the existing sibling test files in this directory do, but replaces the blanket `DetailsCopyField` → `() => null` stub with a spy that records its props so the new "ID" row is verifiable without unstubbing the whole component:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { UserListItem } from '@/types/entity/user'

import UserDetailsPopup from '../UserDetailsPopup'

const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: { user: null as any, getUserById: vi.fn(), getUserBudgets: vi.fn() },
}))
const detailsCopyFieldSpy = vi.fn(() => null)

vi.mock('@/store/user', () => ({ userStore: mockUserStore }))
vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: any) => store }
})
vi.mock('@/hooks/useFeatureFlags', () => ({ useBudgetManagementEnabled: () => [true, true] }))
vi.mock('@/components/Popup', () => ({
  default: ({ visible, children }: any) =>
    visible ? <div data-testid="popup">{children}</div> : null,
}))
vi.mock('@/components/Spinner', () => ({ default: () => <div data-testid="spinner" /> }))
vi.mock('@/components/Button', () => ({
  default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))
vi.mock('@/components/Tooltip', () => ({ default: () => null }))
vi.mock('@/components/form/Switch', () => ({ default: () => null }))
vi.mock('@/components/form/Select/Select', () => ({ default: () => null }))
vi.mock('@/components/details/DetailsCopyField', () => ({
  default: (props: any) => detailsCopyFieldSpy(props),
}))
vi.mock('@/components/details/DetailsProperty', () => ({ default: () => null }))
vi.mock('@/pages/settings/components/SpendingCard', () => ({ default: () => null }))
vi.mock('@/pages/settings/administration/components/BudgetAssignmentsEditor', () => ({
  default: () => null,
}))
vi.mock('@/pages/settings/administration/usersManagement/components/UserAvatar', () => ({
  default: () => null,
}))
vi.mock('@/pages/settings/administration/usersManagement/components/UserProjectsTable', () => ({
  default: () => null,
}))

const makeUser = (): UserListItem => ({
  id: 'target-1',
  name: 'Target User',
  username: 'target',
  email: 'target@example.com',
  is_admin: false,
  is_maintainer: false,
  is_auditor: false,
  is_active: true,
  user_type: 'regular',
  auth_source: 'internal',
  last_login_at: null,
  projects: [],
  picture: null,
  date: null,
})

describe('UserDetailsPopup — identity ID (EPMCDME-16611)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.user = {
      userId: 'viewer-1',
      isAdmin: true,
      isMaintainer: false,
      isAuditor: false,
    }
    mockUserStore.getUserBudgets.mockResolvedValue([])
    mockUserStore.getUserById.mockResolvedValue(makeUser())
  })

  it('renders the user ID via DetailsCopyField labeled "ID", alongside name and email', async () => {
    render(<UserDetailsPopup userId="target-1" isOpen onClose={vi.fn()} />)
    await waitFor(() => expect(screen.queryByTestId('spinner')).not.toBeInTheDocument())

    expect(detailsCopyFieldSpy).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'ID', value: 'target-1' })
    )
    expect(screen.getByText('Target User')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/pages/settings/administration/usersManagement/components/popups/__tests__/UserDetailsPopup.identityId.test.tsx`
Expected: FAIL — `detailsCopyFieldSpy` was never called with `label: 'ID'` (only called once, for the email row, with no `label`).

- [ ] **Step 3: Implement the ID row**

After the existing email block at `UserDetailsPopup.tsx:251-255` (`<DetailsCopyField readOnlyText value={user.email} notification="Email copied to clipboard" />`), add a second `DetailsCopyField` for the ID, inside the same `<div className="flex flex-col gap-1">` wrapper:

```tsx
<DetailsCopyField
  readOnlyText
  label="ID"
  value={user.id}
  notification="ID copied to clipboard"
/>
```

Do not change the `<h3>{user.name}</h3>` line or the existing email `DetailsCopyField` call.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/pages/settings/administration/usersManagement/components/popups/__tests__/UserDetailsPopup.identityId.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit per the repository's existing convention (ticket-prefixed message, e.g. `EPMCDME-16611: ...`).
