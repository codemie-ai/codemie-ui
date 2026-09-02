# Create User Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a role-gated "Create user" button + modal to `UsersManagementPage.tsx` that calls the existing `POST /v1/admin/users` endpoint.

**Architecture:** Three layers, each already precedented in this file/area: a type + `userStore.createUser` method following the uniform admin-method shape in `src/store/user.ts`; a new `Popup`+React-Hook-Form modal (`CreateUserPopup.tsx`) modeled on `ChangeRolePopup.tsx`, reusing `UserDetailsPopup.tsx`'s role-interdependency logic; a button wired into `UsersManagementPage.tsx`'s existing top-bar slot, gated on `(isAdmin || isMaintainer)` and `appInfoStore.getIdpProvider() === 'local'`.

**Tech Stack:** React 18, TypeScript, react-hook-form + `@hookform/resolvers/yup` + yup, Valtio, Vitest + React Testing Library.

**Spec:** `docs/superpowers/tasks/2026-08-29-create-user-button/spec.md`

## Global Constraints

- Modals must use `Popup` from `@/components/Popup` — never PrimeReact `Dialog` directly.
- Password field: plain `type="password"` input — no visibility toggle, no confirm field, no client-side min-length check.
- Role switches: `Switch` (not `Checkbox`), mirroring `UserDetailsPopup.tsx`'s interdependency (`is_maintainer` on forces `is_admin` on; `is_admin` or `is_maintainer` on clears `is_auditor`).
- Button hidden entirely (not disabled) for auditors and on non-`'local'` IDP deployments.
- No changes to `UserDetailsPopup.tsx`, `useUserManagementEnabled()`, or the backend contract.

Commit per task using the repository's existing convention.

---

### Task 1: `UserCreatePayload` type + `userStore.createUser`

**Files:**
- Modify: `src/types/entity/user.ts` (add interface near `UserUpdatePayload`, line ~70-76)
- Modify: `src/store/user.ts` (add method after `getUserById`, ~line 466; add `createUser` to `UserStoreType`, ~line 87)
- Test: `src/store/__tests__/user.createUser.test.ts`

**Interfaces:**
- Produces: `UserCreatePayload { email: string; username: string; password: string; name?: string; is_admin: boolean; is_maintainer: boolean; is_auditor: boolean }`
- Produces: `userStore.createUser(payload: UserCreatePayload): Promise<UserListItem>` — posts, refreshes nothing itself (callers refresh via existing `userStore.getUsers`), rejects on failure after toasting.

Test-first: yes — `createUser` posts to `v1/admin/users` with the payload, resolves with the parsed user on success (toasting info), and on a rejected `api.post` toasts an error and rethrows.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '@/utils/api'
import toaster from '@/utils/toaster'
import { userStore } from '@/store/user'

vi.mock('@/utils/api')
vi.mock('@/utils/toaster')

describe('userStore.createUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('posts payload and returns created user on success', async () => {
    const payload = {
      email: 'a@b.com', username: 'newuser', password: 'secret123',
      is_admin: false, is_maintainer: false, is_auditor: false,
    }
    const created = { id: '1', ...payload }
    vi.mocked(api.post).mockResolvedValue({ json: () => Promise.resolve(created) } as any)

    const result = await userStore.createUser(payload)

    expect(api.post).toHaveBeenCalledWith('v1/admin/users', payload, { skipErrorHandling: true })
    expect(result).toEqual(created)
    expect(toaster.info).toHaveBeenCalled()
  })

  it('toasts an error and rethrows on failure', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('boom'))
    await expect(
      userStore.createUser({
        email: 'a@b.com', username: 'newuser', password: 'secret123',
        is_admin: false, is_maintainer: false, is_auditor: false,
      })
    ).rejects.toThrow('boom')
    expect(toaster.error).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/user.createUser.test.ts`
Expected: FAIL — `userStore.createUser is not a function`

- [ ] **Step 3: Add the type and store method**

In `src/types/entity/user.ts`, add:

```ts
export interface UserCreatePayload {
  email: string
  username: string
  password: string
  name?: string
  is_admin: boolean
  is_maintainer: boolean
  is_auditor: boolean
}
```

In `src/store/user.ts`, add `createUser: (payload: UserCreatePayload) => Promise<UserListItem>` to `UserStoreType`, import `UserCreatePayload`, and add the method (same shape as `updateUser`, line 468-480):

```ts
createUser(payload) {
  return api
    .post('v1/admin/users', payload, { skipErrorHandling: true })
    .then((response) => response.json())
    .then((data) => {
      toaster.info('User created successfully')
      return data
    })
    .catch((error) => {
      console.error('Failed to create user:', error)
      toaster.error('Failed to create user')
      throw error
    })
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/__tests__/user.createUser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

---

### Task 2: `CreateUserPopup` component

**Files:**
- Create: `src/pages/settings/administration/usersManagement/components/popups/CreateUserPopup.tsx`
- Test: `src/pages/settings/administration/usersManagement/components/popups/__tests__/CreateUserPopup.test.tsx`

**Interfaces:**
- Consumes: `userStore.createUser(payload: UserCreatePayload)` (Task 1), `Switch` (`@/components/form/Switch`), `Input` (`@/components/form/Input/Input`), `Popup` (`@/components/Popup`).
- Produces: `CreateUserPopup: FC<{ isOpen: boolean; onClose: () => void; onCreated: () => void }>`. The popup never closes itself on success — it only calls `onCreated()`, and the caller (page, Task 3) decides whether/when to close and refresh, so there is exactly one place that owns "close after success."

Test-first: yes — role-switch interdependency (turning on Maintainer also turns on Admin and clears Auditor; turning on Admin clears Auditor), Yup validation (missing email/short username/missing password blocks submit), and both success (`onCreated` called, no `onClose` call) and failure (`userStore.createUser` rejects — modal stays open, `onCreated` never called) submission paths.

- [ ] **Step 1: Write the failing tests**

Mirror `UserDetailsPopup.auditor.test.tsx`'s mocking shape: `vi.hoisted` mock of `userStore` (`createUser: vi.fn()`), mock `@/components/Popup` to render children behind a `data-testid="popup"` div plus a submit button wired to the passed `onSubmit`, mock `@/components/form/Switch` as a checkbox stand-in keyed by `id` (same as the existing test), use the real `Input` component.

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CreateUserPopup from '../CreateUserPopup'

const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: { createUser: vi.fn() },
}))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))
vi.mock('@/components/Popup', () => ({
  default: ({ visible, children, onSubmit }: any) =>
    visible ? (
      <div data-testid="popup">
        {children}
        <button onClick={onSubmit}>Submit</button>
      </div>
    ) : null,
}))
vi.mock('@/components/form/Switch', () => ({
  default: ({ id, label, value, onChange }: any) => (
    <label>
      {label}
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange({ target: { checked: e.target.checked } })}
        data-testid={`switch-${id}`}
      />
    </label>
  ),
}))

const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } })
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'newuser' } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } })
}

describe('CreateUserPopup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('turning on Maintainer forces Admin on and clears Auditor', () => {
    render(<CreateUserPopup isOpen onClose={vi.fn()} onCreated={vi.fn()} />)
    fireEvent.click(screen.getByTestId('switch-create-user-auditor'))
    fireEvent.click(screen.getByTestId('switch-create-user-maintainer'))
    expect(screen.getByTestId('switch-create-user-admin')).toBeChecked()
    expect(screen.getByTestId('switch-create-user-auditor')).not.toBeChecked()
  })

  it('turning on Admin clears Auditor', () => {
    render(<CreateUserPopup isOpen onClose={vi.fn()} onCreated={vi.fn()} />)
    fireEvent.click(screen.getByTestId('switch-create-user-auditor'))
    fireEvent.click(screen.getByTestId('switch-create-user-admin'))
    expect(screen.getByTestId('switch-create-user-auditor')).not.toBeChecked()
  })

  it('does not submit when required fields are missing', async () => {
    render(<CreateUserPopup isOpen onClose={vi.fn()} onCreated={vi.fn()} />)
    fireEvent.click(screen.getByText('Submit'))
    await waitFor(() => expect(mockUserStore.createUser).not.toHaveBeenCalled())
  })

  it('calls createUser and onCreated on successful submit, without calling onClose', async () => {
    mockUserStore.createUser.mockResolvedValue({ id: '1' })
    const onCreated = vi.fn()
    const onClose = vi.fn()
    render(<CreateUserPopup isOpen onClose={onClose} onCreated={onCreated} />)
    fillRequiredFields()
    fireEvent.click(screen.getByText('Submit'))
    await waitFor(() => expect(mockUserStore.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.com', username: 'newuser', password: 'secret123' })
    ))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps modal open and does not call onCreated when createUser rejects', async () => {
    mockUserStore.createUser.mockRejectedValue(new Error('400'))
    const onCreated = vi.fn()
    render(<CreateUserPopup isOpen onClose={vi.fn()} onCreated={onCreated} />)
    fillRequiredFields()
    fireEvent.click(screen.getByText('Submit'))
    await waitFor(() => expect(mockUserStore.createUser).toHaveBeenCalled())
    expect(onCreated).not.toHaveBeenCalled()
    expect(screen.getByTestId('popup')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/settings/administration/usersManagement/components/popups/__tests__/CreateUserPopup.test.tsx`
Expected: FAIL — module `../CreateUserPopup` not found

- [ ] **Step 3: Implement `CreateUserPopup.tsx`**

Follow `ChangeRolePopup.tsx`'s structure (`useForm` + `yupResolver` + `Controller`, `Popup` with `header`/`submitText`/`visible`/`onHide`/`onSubmit`). Role-flag state and interdependency mirror `UserDetailsPopup.tsx:150-183`'s `handleRoleChange`, applied to local form state (not a store call) via `Controller`-driven `Switch` fields for `is_admin`/`is_maintainer`/`is_auditor`, ids `create-user-admin`/`create-user-maintainer`/`create-user-auditor`. Fields: `email` (`Input type="email"`), `username` (`Input`), `password` (`Input type="password"`), `name` (`Input`, optional), plus the three switches. Yup schema: `email: yup.string().email().required()`, `username: yup.string().min(3).max(50).required()`, `password: yup.string().required()`, `name: yup.string().optional()`. `onSubmit` calls `userStore.createUser(data)`; on success calls only `onCreated()` (never `onClose()` — the caller owns closing); on failure (`userStore.createUser` already toasts) leaves the popup open — catch the rejection locally (`catch { /* toasted by store */ }`) so the unhandled rejection doesn't propagate past `onSubmit`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/settings/administration/usersManagement/components/popups/__tests__/CreateUserPopup.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

---

### Task 3: Wire the "Create user" button into `UsersManagementPage.tsx`

**Files:**
- Modify: `src/pages/settings/administration/UsersManagementPage.tsx` (top bar, lines 364-380; imports, ~line 47)
- Test: `src/pages/settings/administration/__tests__/UsersManagementPage.createUserButton.test.tsx`

**Interfaces:**
- Consumes: `CreateUserPopup` (Task 2) props `{ isOpen, onClose, onCreated }`; existing `refreshFromFirstPage` (already used for `UsersManagementBulkActions`'s `refresh` prop); `appInfoStore.getIdpProvider()` (`@/store/appInfo`); existing `isAdmin`/`isMaintainer` booleans (lines 75-76).

Test-first: yes — button renders only when `(isAdmin || isMaintainer)` is true AND `getIdpProvider() === 'local'`; hidden for auditor-only and for non-local IDP; clicking it opens `CreateUserPopup`; a successful `onCreated` closes the popup and triggers `refreshFromFirstPage`.

- [ ] **Step 1: Write the failing test**

Mock `@/store/user` (`user: {...}`), mock `@/store/appInfo` (`appInfoStore.getIdpProvider`), mock `usersManagement/components/popups/CreateUserPopup` as a stand-in rendering a `data-testid="create-user-popup"` div (with an "Onboard" button that calls `onCreated`) when `isOpen`, mock the other heavy sub-components already exercised by `AdminTablesPagination.integration.test.tsx` (`Table`, filters, bulk actions) to keep the test focused.

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import UsersManagementPage from '../UsersManagementPage'

const { mockUserStore, mockAppInfoStore } = vi.hoisted(() => ({
  mockUserStore: { user: { isAdmin: false, isMaintainer: false, isAuditor: false } },
  mockAppInfoStore: { getIdpProvider: vi.fn(() => 'local'), configs: [] },
}))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))
vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: any) => store }
})
vi.mock('../usersManagement/components/popups/CreateUserPopup', () => ({
  default: ({ isOpen, onCreated }: any) =>
    isOpen ? (
      <div data-testid="create-user-popup">
        <button onClick={onCreated}>Simulate created</button>
      </div>
    ) : null,
}))
// ... existing mocks for Table/UsersManagementFilters/UsersManagementBulkActions/UserDetailsPopup/ResetBudgetPopup as in AdminTablesPagination.integration.test.tsx

describe('UsersManagementPage — Create user button', () => {
  it('is hidden for a plain user on a local IDP', () => {
    mockUserStore.user = { isAdmin: false, isMaintainer: false, isAuditor: false }
    render(<UsersManagementPage />)
    expect(screen.queryByRole('button', { name: /create user/i })).not.toBeInTheDocument()
  })

  it('is hidden for an admin when IDP is not local', () => {
    mockUserStore.user = { isAdmin: true, isMaintainer: false, isAuditor: false }
    mockAppInfoStore.getIdpProvider.mockReturnValue('keycloak')
    render(<UsersManagementPage />)
    expect(screen.queryByRole('button', { name: /create user/i })).not.toBeInTheDocument()
  })

  it('is visible for a maintainer on a local IDP, opens the popup, and refreshes on created', () => {
    mockUserStore.user = { isAdmin: false, isMaintainer: true, isAuditor: false }
    mockAppInfoStore.getIdpProvider.mockReturnValue('local')
    render(<UsersManagementPage />)
    fireEvent.click(screen.getByRole('button', { name: /create user/i }))
    expect(screen.getByTestId('create-user-popup')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Simulate created'))
    expect(screen.queryByTestId('create-user-popup')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/settings/administration/__tests__/UsersManagementPage.createUserButton.test.tsx`
Expected: FAIL — no "Create user" button rendered

- [ ] **Step 3: Add the button and popup wiring**

In `UsersManagementPage.tsx`: import `CreateUserPopup` and `appInfoStore`; add `useSnapshot(appInfoStore)` alongside the existing `useSnapshot(userStore)` (line 73) for reactivity to config loading, and `const isLocalAuth = appInfoStore.getIdpProvider() === 'local'`; add `const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)`. In the top bar (lines 372-379, alongside the existing `{isAdmin && <UsersManagementBulkActions .../>}` block), add:

```tsx
{(isAdmin || isMaintainer) && isLocalAuth && (
  <Button onClick={() => setIsCreateUserOpen(true)}>Create user</Button>
)}
```

Alongside the other popups already rendered in this file (e.g. near `UserDetailsPopup`/`ResetBudgetPopup`), render:

```tsx
<CreateUserPopup
  isOpen={isCreateUserOpen}
  onClose={() => setIsCreateUserOpen(false)}
  onCreated={() => {
    setIsCreateUserOpen(false)
    refreshFromFirstPage()
  }}
/>
```

This makes `UsersManagementPage` the single place that decides to close the popup and refresh the list after a successful create.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/settings/administration/__tests__/UsersManagementPage.createUserButton.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

---

## Negative-Constraint Pass

- **No confirm-password field / no visibility toggle / no strength meter** — Task 2 uses a single plain `type="password"` `Input`; no second password field or toggle state is introduced.
- **No client-side min-length check on password** — Task 2's Yup schema only requires presence (`.required()`), never `.min(n)`, for `password`.
- **No changes to `UserDetailsPopup.tsx` or the edit flow** — no task modifies that file; Task 2 only reads its interdependency logic as a pattern to replicate independently in `CreateUserPopup.tsx`.
- **No changes to `useUserManagementEnabled()` feature-flag gating** — Task 3 adds a second, independent gate (`isAdmin || isMaintainer`, `isLocalAuth`) without touching the feature-flag hook or its call sites.
- **Button never shown to auditors, hidden (not disabled) outside local auth mode** — Task 3's gate is a single `&&`-chained JSX condition (`(isAdmin || isMaintainer) && isLocalAuth`), so an auditor-only or non-local case renders nothing, never a disabled control; tested in Task 3, Step 1.
- **No bulk user creation or import** — no task adds multi-row creation; `CreateUserPopup` creates exactly one user per submit.
- **No backend or `POST /v1/admin/users` contract changes** — no task touches the sibling `codemie` repo; `UserCreatePayload` mirrors the existing `UserCreateRequest` field-for-field.
