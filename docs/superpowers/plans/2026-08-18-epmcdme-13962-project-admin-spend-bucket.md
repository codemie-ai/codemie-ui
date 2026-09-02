# EPMCDME-13962: Allow project admins to change spend bucket distribution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Widen `canManageBudgets` in `ProjectDetailsPage.tsx` so project admins can manage spend bucket distribution in projects they administer.

**Architecture:** One boolean expression change at line 64 of `ProjectDetailsPage.tsx` adds `|| (isProjectAdmin && !isPersonalProject)` to the existing `isMaintainer` check. The existing `mode: 'manage' | 'view'` prop mechanism already propagates this through `ProjectBudgetsSection` — no other production files change. New unit tests verify the five access-control scenarios.

**Tech Stack:** React 18, TypeScript 5, Valtio, Vitest 1.6.1 + React Testing Library

**Spec:** `docs/superpowers/tasks/2026-08-18-epmcdme-13962-project-admin-spend-bucket/spec.md`

## Global Constraints

- Touch only `ProjectDetailsPage.tsx` (production) and its existing test file.
- Do not change `ProjectBudgetsSection`, `UnifiedProjectBudgetModal`, `ProjectBudgetCard`, or any store.
- `!isPersonalProject` guard is required — mirrors `canManageProject`.
- The `isBudgetManagementEnabled` feature flag must still gate the entire budget management path.
- Commit message format: `EPMCDME-13962: <Capital sentence>` (no period at end).

---

## File Map

| Action | Path |
|---|---|
| Modify | `src/pages/settings/administration/ProjectDetailsPage.tsx` |
| Modify (tests) | `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` |

---

### Task 1: Widen canManageBudgets to include project admins

**Files:**
- Modify: `src/pages/settings/administration/ProjectDetailsPage.tsx:64`
- Test: `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx`

**Interfaces:**
- Consumes: `isProjectAdmin: boolean` (line 62), `isPersonalProject: boolean` (line 58), `isBudgetManagementEnabled: boolean` (line 23), `isMaintainer: boolean` (line 60)
- Produces: `canManageBudgets: boolean` used at lines 69 (`budgetMode`), 252 (`onBudgetsChanged`), 263 (`budgets`/`onBudgetsChanged` to `ProjectMembersManager`)

**Test-first: yes — write the failing test before changing the production line**

- [ ] **Step 1: Add mocks and helpers to the test file**

Open `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx`.

After the existing `vi.mock` blocks (after line ~74) and before the `mockProject` constant, add the following. This sets up `valtio`, `userStore`, and `useFeatureFlags` mocks that the new describe block will rely on:

```tsx
const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: {
    user: null as null | {
      isAdmin: boolean
      isMaintainer: boolean
      isAuditor: boolean
      applicationsAdmin: string[]
    },
  },
}))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: vi.fn((store: unknown) => store),
  }
})

vi.mock('@/store/user', () => ({ userStore: mockUserStore }))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn(() => [false, false]),
  useBudgetManagementEnabled: vi.fn(() => [false, false]),
}))

const projectBudgetsSectionMock = vi.fn()

vi.mock(
  '@/pages/settings/administration/projectsManagement/ProjectBudgetsSection',
  () => ({
    default: (props: any) => {
      projectBudgetsSectionMock(props)
      return <div data-testid="project-budgets-section" data-mode={props.mode} />
    },
  })
)
```

> **Note:** The existing test file already imports from `@/store/user` and `@/store/projects` directly (not via `vi.hoisted`). The new `vi.mock('valtio', ...)` override must come before the existing `vi.mock` calls or in the same hoisted block — Vitest hoists all `vi.mock` calls to the top of the file automatically, so order in source does not matter as long as they are at the module top level. The existing tests use `useSnapshot` through the real `valtio` import — the new mock returns the store object directly, which matches the existing test behaviour (the existing tests set `projectsStore.getProject` directly on the imported store object).

- [ ] **Step 2: Write failing tests — budget mode for project admins**

Append a new `describe` block at the end of the file, before the closing `})` of the outer `describe('ProjectDetailsPage', ...)`:

Add this import at the top of the file alongside the existing imports:

```tsx
import { useBudgetManagementEnabled } from '@/hooks/useFeatureFlags'
```

Then append:

```tsx
describe('canManageBudgets — project-admin access control (EPMCDME-13962)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    projectsStore.getProject = vi.fn().mockResolvedValue(mockProject)
    vi.mocked(useBudgetManagementEnabled).mockReturnValue([true, true])
  })

  it('project admin of this project sees manage mode when flag is on and project is not personal', async () => {
    mockUserStore.user = {
      isAdmin: false,
      isMaintainer: false,
      isAuditor: false,
      applicationsAdmin: ['Test Project'],
    }

    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectBudgetsSectionMock).toHaveBeenCalled()
    })

    expect(projectBudgetsSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'manage' })
    )
  })

  it('project admin of this project sees view mode when project is personal', async () => {
    mockUserStore.user = {
      isAdmin: false,
      isMaintainer: false,
      isAuditor: false,
      applicationsAdmin: ['Test Project'],
    }
    projectsStore.getProject = vi.fn().mockResolvedValue({
      ...mockProject,
      project_type: 'personal',
    })

    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectBudgetsSectionMock).toHaveBeenCalled()
    })

    expect(projectBudgetsSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'view' })
    )
  })

  it('project admin of a different project sees view mode', async () => {
    mockUserStore.user = {
      isAdmin: false,
      isMaintainer: false,
      isAuditor: false,
      applicationsAdmin: ['Other Project'],
    }

    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectBudgetsSectionMock).toHaveBeenCalled()
    })

    expect(projectBudgetsSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'view' })
    )
  })

  it('auditor sees view mode', async () => {
    mockUserStore.user = {
      isAdmin: false,
      isMaintainer: false,
      isAuditor: true,
      applicationsAdmin: [],
    }

    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectBudgetsSectionMock).toHaveBeenCalled()
    })

    expect(projectBudgetsSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'view' })
    )
  })

  it('regular user does not see the budget section', async () => {
    mockUserStore.user = {
      isAdmin: false,
      isMaintainer: false,
      isAuditor: false,
      applicationsAdmin: [],
    }

    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectsStore.getProject).toHaveBeenCalled()
    })

    expect(screen.queryByTestId('project-budgets-section')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
npx vitest run src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx
```

Expected: the 5 new tests fail (the production code still gates on `isMaintainer` only, so the project-admin manage test asserts `mode: 'manage'` but gets `mode: 'view'` or the section does not render at all).

- [ ] **Step 4: Change the production expression**

In `src/pages/settings/administration/ProjectDetailsPage.tsx`, find line 64:

```ts
const canManageBudgets = isBudgetManagementEnabled && isMaintainer
```

Replace with:

```ts
const canManageBudgets = isBudgetManagementEnabled && (isMaintainer || (isProjectAdmin && !isPersonalProject))
```

No other lines change in this file.

- [ ] **Step 5: Run tests — verify they pass**

```bash
npx vitest run src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx
```

Expected: all tests in the file pass. Quote the `Test Files` line from the output.

- [ ] **Step 6: Run type-check**

```bash
npm run type-check
```

Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/settings/administration/ProjectDetailsPage.tsx
git add src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx
git commit -m "EPMCDME-13962: Allow project admins to manage spend bucket distribution"
```
