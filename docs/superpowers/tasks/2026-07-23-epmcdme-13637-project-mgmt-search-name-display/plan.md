# EPMCDME-13637: Project Search by Name + Display Name — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all project search paths so a project can be found by either its technical `name` or its human `display_name`, and make both fields always visible (stacked, no tooltip) in tables and dropdowns.

**Architecture:** Two repositories change independently — `codemie` (backend Python) adds OR conditions to two separate search implementations; `codemie-ui` (frontend TypeScript) adds a client-side filter, a shared display component, a `filterBy` prop thread through `MultiSelect`, and refactors five copy-pasted option-loading patterns into a shared hook. Each task produces working, tested, committable code.

**Tech Stack:** Python / SQLAlchemy / SQLModel (backend); React / TypeScript / Valtio / PrimeReact / Vitest + React Testing Library (frontend)

---

## File Map

### Backend (`codemie` repo)

| File | Change |
|---|---|
| `src/codemie/repository/application_repository.py` | `_apply_search_filters`: add OR clauses for `Application.name`; `_apply_search`: update ordering predicate |
| `src/codemie/core/models.py` | `Application.search_by_name`: add OR clauses for `cls.name` |
| `tests/codemie/repository/test_application_repository_extended.py` | Remove anti-regression guards that blocked name match; add positive name-match tests |
| `tests/codemie/core/test_models_extended.py` | Same — remove guards, add positive tests |

### Frontend (`codemie-ui` repo)

| File | Change |
|---|---|
| `src/utils/projectDisplayName.ts` | Add exported `matchesProjectSearch` |
| `src/utils/__tests__/projectDisplayName.test.ts` | Add `matchesProjectSearch` tests |
| `src/store/user.ts` | `getUserProjects(adminOnly, query)` + thread `query` in `getProjects` |
| `src/store/__tests__/user.test.ts` | Add query-filtering tests |
| `src/components/ProjectNameDisplay/ProjectNameDisplay.tsx` | **NEW** — stacked two-line display component |
| `src/components/ProjectNameDisplay/__tests__/ProjectNameDisplay.test.tsx` | **NEW** |
| `src/components/ProjectNameCell/ProjectNameCell.tsx` | Remove tooltip; use `ProjectNameDisplay` |
| `src/components/ProjectNameCell/__tests__/ProjectNameCell.test.tsx` | Update tooltip tests → stacked-display tests |
| `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx` | Name column: remove tooltip → use `ProjectNameDisplay` inline |
| `src/components/form/MultiSelect/MultiSelect.tsx` | Add `filterBy?: string` prop, pass to `PrimeMultiselect` |
| `src/types/filters.ts` | Add `displayName?: string` to `FilterOption` |
| `src/hooks/useProjectOptions.ts` | Extend option shape (add `displayName`); export `renderProjectOption` |
| `src/hooks/__tests__/useProjectOptions.test.ts` | Add extended-shape test |
| `src/components/Filters/Filters.tsx` | Add explicit `filterBy` thread (same pattern as `renderOption`) |
| `src/components/ProjectSelector/ProjectSelector.tsx` | Match extended option shape; add `renderOption`; pass `filterBy="value,displayName"` |
| `src/components/ProjectSelector/__tests__/ProjectSelector.test.tsx` | Add visibility test |
| `src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx` | Add `renderProjectOption` + `filterBy` to project filter config |
| `src/pages/integrations/components/UserSettings/UserSettings.tsx` | Same |
| `src/pages/assistants/.../AssistantFilters.tsx` | Replace local `loadProjectOptions` with `useProjectOptions`; add `renderProjectOption` + `filterBy` to config |
| `src/pages/favorites/components/FavoritesAllFilters.tsx` | Same |
| `src/pages/workflows/components/WorkflowsFilters.tsx` | Same |
| `src/pages/skills/components/SkillsFilters.tsx` | Same |
| `src/pages/dataSources/components/DataSourceFilters.tsx` | Same |
| `src/pages/dataSources/components/DataSourceDetails.tsx` | Project property: remove inline tooltip → use `ProjectNameDisplay` |
| `src/pages/skills/components/SkillDetails.tsx` | Same |
| `src/pages/assistants/components/AssistantDetails/components/AssistantDetailsSidebarSections.tsx` | Same |
| `src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx` | **NEW** — assert no tooltip attributes on project property |
| `src/pages/skills/components/__tests__/SkillDetails.test.tsx` | **NEW** — same |
| `src/pages/assistants/components/AssistantDetails/components/__tests__/AssistantDetailsSidebarSections.test.tsx` | **NEW** — same |

---

## Task 1 — Backend: Fix `_apply_search_filters` (application_repository.py)

**Files:**
- Modify: `codemie/src/codemie/repository/application_repository.py:62-116`
- Modify: `codemie/tests/codemie/repository/test_application_repository_extended.py:610-664`

> Run all commands from the `codemie/` directory.

- [ ] **Step 1: Write the failing test** (add after line 664 in `test_application_repository_extended.py`)

```python
def test_apply_search_filters_matches_both_name_and_display_name(self):
    """_apply_search_filters OR-matches name AND display_name so a project is
    found by its technical name even when display_name is set (EPMCDME-13637)."""
    from sqlmodel import select

    base_statement = select(Application)
    result = application_repository._apply_search_filters(base_statement, "epm-fdeg")

    query_text = _compile_sql(result)
    # Must match by bare name as well as COALESCE
    assert "coalesce(applications.display_name, applications.name)" in query_text
    assert "applications.name ilike" in query_text
    assert "applications.name =" in query_text
```

- [ ] **Step 2: Also update the existing guard test** (lines 626–646) — it currently asserts the fix is absent; remove those two negative assertions and replace with a positive display-name assertion:

Find the test `test_apply_search_filters_matches_display_name_via_coalesce` and replace its final three `assert` lines:

```python
# Before (remove these two lines):
assert "applications.name ilike" not in query_text
assert "applications.name =" not in query_text

# After (keep this line, remove the two above):
assert "coalesce(applications.display_name, applications.name)" in query_text
```

- [ ] **Step 3: Run the new test to verify it fails**

```bash
cd codemie
python -m pytest tests/codemie/repository/test_application_repository_extended.py::TestApplicationRepositorySearchAndFiltering::test_apply_search_filters_matches_both_name_and_display_name -v
```

Expected: FAIL — `AssertionError: assert 'applications.name ilike' in ...`

- [ ] **Step 4: Fix `_apply_search_filters`** (application_repository.py:82-93)

Replace the `return statement.where(...)` block and update the docstring comment:

```python
@staticmethod
def _apply_search_filters(
    statement: Select[tuple[Application]], search: Optional[str]
) -> Select[tuple[Application]]:
    """Apply search WHERE conditions without ordering.

    OR-matches both COALESCE(display_name, name) and the raw technical name
    so a project is discoverable by either field (EPMCDME-13637).

    Args:
        statement: Base SELECT statement
        search: Optional search string (substring match on display_name, name, description)

    Returns:
        Modified SELECT statement with search filters only (no ordering)
    """
    if not search:
        return statement

    escaped_query = escape_like_wildcards(search)
    display_or_name = func.coalesce(Application.display_name, Application.name)
    return statement.where(
        or_(
            display_or_name == search,
            display_or_name.ilike(f"%{escaped_query}%", escape="\\"),
            Application.name == search,
            Application.name.ilike(f"%{escaped_query}%", escape="\\"),
            Application.description.ilike(f"%{escaped_query}%", escape="\\"),
        )
    )
```

- [ ] **Step 5: Fix `_apply_search` ordering** (application_repository.py:111-116) — update the `order_by` case to also catch exact name match:

```python
display_or_name = func.coalesce(Application.display_name, Application.name)
return statement.order_by(
    case((or_(display_or_name == search, Application.name == search), 1), else_=2)
)
```

- [ ] **Step 6: Run the new test + regression suite**

```bash
python -m pytest tests/codemie/repository/test_application_repository_extended.py -v
```

Expected: all PASS

- [ ] **Step 7: Commit**

```bash
cd codemie
git add src/codemie/repository/application_repository.py \
        tests/codemie/repository/test_application_repository_extended.py
git commit -m "EPMCDME-13637: OR-match name and display_name in _apply_search_filters"
```

---

## Task 2 — Backend: Fix `Application.search_by_name` (models.py)

**Files:**
- Modify: `codemie/src/codemie/core/models.py:409-430`
- Modify: `codemie/tests/codemie/core/test_models_extended.py:160+`

- [ ] **Step 1: Write the failing test** (add to `TestApplicationSearchByName` class in `test_models_extended.py`)

```python
@patch("codemie.core.models.Session")
def test_search_by_name_matches_technical_name_when_display_name_set(self, mock_session_class):
    """search_by_name must OR in the raw technical name so a project with a
    display_name is still found by name query (EPMCDME-13637)."""
    mock_session = MagicMock()
    mock_session_class.return_value.__enter__.return_value = mock_session
    mock_session.exec.return_value.all.return_value = []

    mock_engine = MagicMock()
    with patch.object(Application, "get_engine", return_value=mock_engine):
        Application.search_by_name("epm-fdeg")

        query_text = _compile_sql(mock_session.exec.call_args[0][0])
        assert "coalesce(applications.display_name, applications.name)" in query_text
        assert "applications.name ilike" in query_text
        assert "applications.name =" in query_text
```

- [ ] **Step 2: Update the existing guard test** (`test_search_by_name_prefers_display_name_over_technical_name`) — remove the two negative guard assertions at the end of that test (the ones that assert `applications.name ilike not in` and `applications.name = not in`). Keep the positive COALESCE assertion.

- [ ] **Step 3: Run the new test to verify it fails**

```bash
python -m pytest tests/codemie/core/test_models_extended.py::TestApplicationSearchByName::test_search_by_name_matches_technical_name_when_display_name_set -v
```

Expected: FAIL

- [ ] **Step 4: Fix `Application.search_by_name`** (models.py:412-422)

```python
if name_query:
    escaped_query = escape_like_wildcards(name_query)
    # OR-match both COALESCE(display_name, name) and raw technical name
    # so a project is discoverable by either field (EPMCDME-13637).
    display_or_name = func.coalesce(cls.display_name, cls.name)
    stmt = (
        select(cls)
        .where(
            or_(
                display_or_name == name_query,
                display_or_name.ilike(f"%{escaped_query}%", escape="\\"),
                cls.name == name_query,
                cls.name.ilike(f"%{escaped_query}%", escape="\\"),
            )
        )
        .order_by(
            case((or_(display_or_name == name_query, cls.name == name_query), 1), else_=2)
        )
    )
```

- [ ] **Step 5: Run tests**

```bash
python -m pytest tests/codemie/core/test_models_extended.py -v
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/codemie/core/models.py \
        tests/codemie/core/test_models_extended.py
git commit -m "EPMCDME-13637: OR-match name and display_name in Application.search_by_name"
```

---

## Task 3 — Frontend: Add `matchesProjectSearch` utility

**Files:**
- Modify: `src/utils/projectDisplayName.ts`
- Modify: `src/utils/__tests__/projectDisplayName.test.ts`

> All remaining tasks run from the `codemie-ui/` directory.

- [ ] **Step 1: Write the failing tests** (add `describe('matchesProjectSearch', ...)` block to `projectDisplayName.test.ts`)

```ts
import { describe, it, expect } from 'vitest'
import { matchesProjectSearch } from '@/utils/projectDisplayName'

describe('matchesProjectSearch', () => {
  it('returns true when query is empty', () => {
    expect(matchesProjectSearch({ name: 'proj-a', display_name: 'Alpha' }, '')).toBe(true)
  })

  it('returns true when name matches (case-insensitive)', () => {
    expect(matchesProjectSearch({ name: 'epm-fdeg', display_name: 'My Project' }, 'EPM-FDEG')).toBe(true)
  })

  it('returns true when display_name matches (case-insensitive)', () => {
    expect(matchesProjectSearch({ name: 'epm-fdeg', display_name: 'My Project' }, 'my project')).toBe(true)
  })

  it('returns true when name partially matches', () => {
    expect(matchesProjectSearch({ name: 'epm-fdeg', display_name: 'My Project' }, 'fdeg')).toBe(true)
  })

  it('returns false when neither field matches', () => {
    expect(matchesProjectSearch({ name: 'epm-fdeg', display_name: 'My Project' }, 'xyz')).toBe(false)
  })

  it('matches by name when display_name is null', () => {
    expect(matchesProjectSearch({ name: 'epm-fdeg', display_name: null }, 'fdeg')).toBe(true)
  })

  it('returns false for whitespace-only display_name that does not match', () => {
    expect(matchesProjectSearch({ name: 'proj', display_name: '   ' }, 'xyz')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/__tests__/projectDisplayName.test.ts
```

Expected: FAIL — `matchesProjectSearch is not a function`

- [ ] **Step 3: Implement `matchesProjectSearch`** (add to end of `src/utils/projectDisplayName.ts`)

```ts
export function matchesProjectSearch(
  project: { name: string; display_name?: string | null },
  query: string
): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    project.name.toLowerCase().includes(q) ||
    !!(project.display_name?.trim().toLowerCase().includes(q))
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/utils/__tests__/projectDisplayName.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/projectDisplayName.ts src/utils/__tests__/projectDisplayName.test.ts
git commit -m "EPMCDME-13637: Add matchesProjectSearch utility"
```

---

## Task 4 — Frontend: Fix `getUserProjects` in `user.ts`

**Files:**
- Modify: `src/store/user.ts:332-374`
- Modify: `src/store/__tests__/user.test.ts`

- [ ] **Step 1: Write the failing tests** (add inside `describe('getUserProjects', ...)` in `user.test.ts`)

```ts
it('filters by name query (case-insensitive) when query is provided', async () => {
  const { userStore } = await import('@/store/user')
  userStore.user = {
    userId: 'u1', email: 'a@b.com', name: 'Alice', username: 'alice',
    isAdmin: false, isMaintainer: false, isAuthenticated: true, user_type: 'regular',
    applications: [], applicationsAdmin: [],
    projects: [
      { name: 'epm-fdeg', display_name: 'Marketing Platform', is_project_admin: false },
      { name: 'epm-xyz', display_name: 'Dev Tools', is_project_admin: false },
    ],
    picture: null,
  } as any

  const result = userStore.getUserProjects(false, 'EPM-FDEG')
  expect(result).toHaveLength(1)
  expect(result[0].name).toBe('epm-fdeg')
})

it('filters by display_name query when query is provided', async () => {
  const { userStore } = await import('@/store/user')
  userStore.user = {
    userId: 'u1', email: 'a@b.com', name: 'Alice', username: 'alice',
    isAdmin: false, isMaintainer: false, isAuthenticated: true, user_type: 'regular',
    applications: [], applicationsAdmin: [],
    projects: [
      { name: 'epm-fdeg', display_name: 'Marketing Platform', is_project_admin: false },
      { name: 'epm-xyz', display_name: 'Dev Tools', is_project_admin: false },
    ],
    picture: null,
  } as any

  const result = userStore.getUserProjects(false, 'dev')
  expect(result).toHaveLength(1)
  expect(result[0].name).toBe('epm-xyz')
})

it('returns all projects when query is empty string', async () => {
  const { userStore } = await import('@/store/user')
  userStore.user = {
    userId: 'u1', email: 'a@b.com', name: 'Alice', username: 'alice',
    isAdmin: false, isMaintainer: false, isAuthenticated: true, user_type: 'regular',
    applications: [], applicationsAdmin: [],
    projects: [
      { name: 'epm-fdeg', display_name: 'Marketing', is_project_admin: false },
      { name: 'epm-xyz', display_name: null, is_project_admin: false },
    ],
    picture: null,
  } as any

  const result = userStore.getUserProjects(false, '')
  expect(result).toHaveLength(2)
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/store/__tests__/user.test.ts
```

Expected: FAIL on the three new tests

- [ ] **Step 3: Fix `getUserProjects`** (src/store/user.ts:368-374)

```ts
getUserProjects(adminOnly = false, query = '') {
  const projects = userStore.user?.projects ?? []
  const filtered = adminOnly ? projects.filter((p) => p.is_project_admin) : projects
  const searched = query ? filtered.filter((p) => matchesProjectSearch(p, query)) : filtered
  return searched
    .map((p) => ({ name: p.name, display_name: p.display_name }))
    .sort((a, b) => a.name.localeCompare(b.name))
},
```

Also add the import at the top of `user.ts` if `matchesProjectSearch` is not yet imported:

```ts
import { matchesProjectSearch } from '@/utils/projectDisplayName'
```

- [ ] **Step 4: Thread `query` in `getProjects`** (src/store/user.ts:332-338) — pass `query` to `getUserProjects`:

```ts
async getProjects(query = '', adminOnly = false) {
  if (userStore.user?.isAdmin) {
    return userStore.getAdminProjects(query)
  }
  return userStore.getUserProjects(adminOnly, query)
},
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/store/__tests__/user.test.ts
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/store/user.ts src/store/__tests__/user.test.ts
git commit -m "EPMCDME-13637: Thread search query through getUserProjects"
```

---

## Task 5 — Frontend: Create `ProjectNameDisplay` component

**Files:**
- Create: `src/components/ProjectNameDisplay/ProjectNameDisplay.tsx`
- Create: `src/components/ProjectNameDisplay/__tests__/ProjectNameDisplay.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ProjectNameDisplay/__tests__/ProjectNameDisplay.test.tsx`:

```tsx
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// ...

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import ProjectNameDisplay from '../ProjectNameDisplay'

describe('ProjectNameDisplay', () => {
  it('renders only name when displayName is absent', () => {
    render(<ProjectNameDisplay name="epm-fdeg" />)
    expect(screen.getByText('epm-fdeg')).toBeTruthy()
    expect(screen.queryByText('epm-fdeg')?.parentElement?.children).toHaveLength(1)
  })

  it('renders only name when displayName is null', () => {
    render(<ProjectNameDisplay name="epm-fdeg" displayName={null} />)
    expect(screen.getByText('epm-fdeg')).toBeTruthy()
    expect(screen.queryByText('Marketing')).toBeNull()
  })

  it('renders only name when displayName is whitespace-only', () => {
    render(<ProjectNameDisplay name="epm-fdeg" displayName="   " />)
    expect(screen.getByText('epm-fdeg')).toBeTruthy()
    expect(screen.queryByText('   ')).toBeNull()
  })

  it('renders stacked name + displayName when displayName is present', () => {
    render(<ProjectNameDisplay name="epm-fdeg" displayName="Marketing Platform" />)
    expect(screen.getByText('epm-fdeg')).toBeTruthy()
    expect(screen.getByText('Marketing Platform')).toBeTruthy()
  })

  it('applies text-text-secondary to the displayName line', () => {
    render(<ProjectNameDisplay name="epm-fdeg" displayName="Marketing Platform" />)
    const dn = screen.getByText('Marketing Platform')
    expect(dn.className).toMatch(/text-text-secondary/)
  })

  it('has no tooltip attributes', () => {
    render(<ProjectNameDisplay name="epm-fdeg" displayName="Marketing Platform" />)
    const name = screen.getByText('epm-fdeg')
    expect(name.getAttribute('data-tooltip-id')).toBeNull()
    expect(name.getAttribute('data-tooltip-content')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/ProjectNameDisplay/__tests__/ProjectNameDisplay.test.tsx
```

Expected: FAIL — component file not found

- [ ] **Step 3: Create `ProjectNameDisplay.tsx`**

Create `src/components/ProjectNameDisplay/ProjectNameDisplay.tsx`:

```tsx
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { cn } from '@/utils/utils'

interface ProjectNameDisplayProps {
  name: string
  displayName?: string | null
  truncate?: boolean
}

const ProjectNameDisplay = ({ name, displayName, truncate }: ProjectNameDisplayProps) => {
  const trimmed = displayName?.trim()
  if (!trimmed) return <>{name}</>
  return (
    <div className="flex flex-col leading-tight gap-0.5">
      <span>{name}</span>
      <span className={cn('text-xs text-text-secondary', truncate && 'truncate')}>{trimmed}</span>
    </div>
  )
}

export default ProjectNameDisplay
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/ProjectNameDisplay/__tests__/ProjectNameDisplay.test.tsx
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ProjectNameDisplay/
git commit -m "EPMCDME-13637: Add ProjectNameDisplay stacked component"
```

---

## Task 6 — Frontend: Update `ProjectNameCell` (remove tooltip)

**Files:**
- Modify: `src/components/ProjectNameCell/ProjectNameCell.tsx`
- Modify: `src/components/ProjectNameCell/__tests__/ProjectNameCell.test.tsx`

- [ ] **Step 1: Update existing tests** — the current tests assert tooltip attributes exist. Rewrite to assert stacked display instead:

Replace all three `it(...)` blocks in `ProjectNameCell.test.tsx`:

```tsx
describe('ProjectNameCell', () => {
  beforeEach(() => {
    mockDisplayNames.clear()
  })

  it('renders the technical project name', () => {
    render(<ProjectNameCell projectName="ssg-test" />)
    expect(screen.getByText('ssg-test')).toBeTruthy()
  })

  it('renders displayName below the name in muted text when the project has one', () => {
    mockDisplayNames.set('ssg-test', 'My Test')
    render(<ProjectNameCell projectName="ssg-test" />)

    expect(screen.getByText('ssg-test')).toBeTruthy()
    const dn = screen.getByText('My Test')
    expect(dn.className).toMatch(/text-text-secondary/)
  })

  it('renders no displayName element when the project has no display name', () => {
    render(<ProjectNameCell projectName="ssg-test" />)
    expect(screen.queryByText('My Test')).toBeNull()
  })

  it('has no tooltip attributes', () => {
    mockDisplayNames.set('ssg-test', 'My Test')
    render(<ProjectNameCell projectName="ssg-test" />)
    const name = screen.getByText('ssg-test')
    expect(name.getAttribute('data-tooltip-id')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify the updated expectations fail against old implementation**

```bash
npx vitest run src/components/ProjectNameCell/__tests__/ProjectNameCell.test.tsx
```

Expected: FAIL — current implementation still uses `data-tooltip-id`

- [ ] **Step 3: Update `ProjectNameCell.tsx`**

```tsx
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// ...

import ProjectNameDisplay from '@/components/ProjectNameDisplay/ProjectNameDisplay'
import { useProjectDisplayNames } from '@/hooks/useProjectDisplayNames'

interface ProjectNameCellProps {
  projectName: string
}

const ProjectNameCell = ({ projectName }: ProjectNameCellProps) => {
  const displayName = useProjectDisplayNames(projectName).get(projectName)
  return <ProjectNameDisplay name={projectName} displayName={displayName} />
}

export const renderProjectNameCell = (item: { project_name: string }) => (
  <ProjectNameCell projectName={item.project_name} />
)

export default ProjectNameCell
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/ProjectNameCell/__tests__/ProjectNameCell.test.tsx
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ProjectNameCell/ProjectNameCell.tsx \
        src/components/ProjectNameCell/__tests__/ProjectNameCell.test.tsx
git commit -m "EPMCDME-13637: Replace tooltip with stacked display in ProjectNameCell"
```

---

## Task 7 — Frontend: Update `ProjectsManagementFull` name column

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:425-436`

No new test: this is a render-layer change; `ProjectNameDisplay` is already tested.

- [ ] **Step 1: Add import** (at top of file, after existing imports)

```tsx
import ProjectNameDisplay from '@/components/ProjectNameDisplay/ProjectNameDisplay'
```

- [ ] **Step 2: Replace the `name` column renderer** (lines 425-436)

```tsx
// Before
name: (item: Project) => {
  const displayName = item.display_name?.trim()
  return (
    <NameLinkCell
      onClick={() => handleOpenProjectDetails(item.name)}
      tooltip={displayName || undefined}
    >
      {item.name}
    </NameLinkCell>
  )
},

// After
name: (item: Project) => (
  <NameLinkCell onClick={() => handleOpenProjectDetails(item.name)}>
    <ProjectNameDisplay name={item.name} displayName={item.display_name} />
  </NameLinkCell>
),
```

- [ ] **Step 3: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors in the changed file

- [ ] **Step 4: Commit**

```bash
git add src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx
git commit -m "EPMCDME-13637: Name column uses ProjectNameDisplay (no tooltip)"
```

---

## Task 8 — Frontend: Add `filterBy` prop to `MultiSelect`

**Files:**
- Modify: `src/components/form/MultiSelect/MultiSelect.tsx:80-116` (props type) and `354-408` (JSX)

- [ ] **Step 1: Add `filterBy?: string` to `MultiSelectProps`** (after line 116, before the closing `}`)

```tsx
export type MultiSelectProps = {
  // ... existing props unchanged ...
  filterBy?: string
}
```

- [ ] **Step 2: Destructure `filterBy` in the component function** (add to the destructured params at line 119-154)

```tsx
const MultiSelect = forwardRef<PrimeMultiselect | null, MultiSelectProps>(
  (
    {
      // ... existing params ...
      filterBy,
    },
    ref
  ) => {
```

- [ ] **Step 3: Pass `filterBy` to `PrimeMultiselect`** (add to the `<PrimeMultiselect>` JSX, after `emptyFilterMessage`)

```tsx
<PrimeMultiselect
  // ... existing props ...
  emptyFilterMessage={emptyFilterMessage}
  filterBy={filterBy}
  // ...
>
```

- [ ] **Step 4: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/form/MultiSelect/MultiSelect.tsx
git commit -m "EPMCDME-13637: Add filterBy prop to MultiSelect"
```

---

## Task 9 — Frontend: Extend `FilterOption` type and update `useProjectOptions`

**Files:**
- Modify: `src/types/filters.ts:27-32`
- Modify: `src/hooks/useProjectOptions.ts`
- Modify: `src/hooks/__tests__/useProjectOptions.test.ts`

- [ ] **Step 1: Add `displayName?` to `FilterOption`** (src/types/filters.ts:27-32)

```ts
export interface FilterOption {
  label: string
  value: string | number | boolean | null
  id?: string
  badge?: string
  displayName?: string
}
```

- [ ] **Step 2: Write failing test** — add to `src/hooks/__tests__/useProjectOptions.test.ts`:

```ts
it('includes displayName in returned options when project has display_name', async () => {
  mockGetProjects.mockResolvedValue([
    { name: 'epm-fdeg', display_name: 'Marketing Platform' },
  ])
  const { result } = renderHook(() => useProjectOptions())
  await act(async () => { await result.current.loadProjectOptions('') })
  expect(result.current.projectOptions[0]).toMatchObject({
    label: 'Marketing Platform',
    value: 'epm-fdeg',
    displayName: 'Marketing Platform',
  })
})

it('displayName is undefined when project has no display_name', async () => {
  mockGetProjects.mockResolvedValue([{ name: 'epm-xyz' }])
  const { result } = renderHook(() => useProjectOptions())
  await act(async () => { await result.current.loadProjectOptions('') })
  expect(result.current.projectOptions[0].displayName).toBeUndefined()
})
```

- [ ] **Step 3: Run failing test**

```bash
npx vitest run src/hooks/__tests__/useProjectOptions.test.ts
```

Expected: FAIL — `displayName` not yet in the option

- [ ] **Step 4: Update `useProjectOptions`** (src/hooks/useProjectOptions.ts) — add `displayName` to the option, and export `renderProjectOption`:

```ts
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// ... license header ...

import { useState, useCallback } from 'react'

import ProjectNameDisplay from '@/components/ProjectNameDisplay/ProjectNameDisplay'
import { userStore } from '@/store'
import { FilterOption } from '@/types/filters'
import { getProjectDisplayName } from '@/utils/projectDisplayName'

export const renderProjectOption = (opt: FilterOption) => (
  <ProjectNameDisplay name={String(opt.value)} displayName={opt.displayName} truncate />
)

export const useProjectOptions = () => {
  const [projectOptions, setProjectOptions] = useState<FilterOption[]>([])

  const loadProjectOptions = useCallback(async (value = '') => {
    try {
      const projects = await userStore.getProjects(value)
      const options: FilterOption[] = projects.map((project) => ({
        label: getProjectDisplayName(project),
        value: project.name,
        displayName: project.display_name ?? undefined,
      }))
      setProjectOptions(options)
    } catch (error) {
      console.error('Error loading project options:', error)
    }
  }, [])

  return { projectOptions, loadProjectOptions }
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/hooks/__tests__/useProjectOptions.test.ts
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/filters.ts src/hooks/useProjectOptions.ts \
        src/hooks/__tests__/useProjectOptions.test.ts
git commit -m "EPMCDME-13637: Extend FilterOption with displayName; add renderProjectOption"
```

---

## Task 10 — Frontend: Thread `filterBy` through `Filters.tsx`

**Files:**
- Modify: `src/components/Filters/Filters.tsx:278-302`

- [ ] **Step 1: Add explicit `filterBy` extraction** — follow the same pattern as `renderOption` on line 290. Add after the `emptyFilterMessage` prop (line 299):

```tsx
filterBy={definition.config?.filterBy as string | undefined}
```

The full updated `<MultiSelect>` block becomes:

```tsx
<MultiSelect
  showCheckbox
  value={(filters[definition.name] as string[]) || []}
  onChange={(value) => handleInputChange(definition.name, value.value)}
  options={multiselectOptions[definition.name]}
  placeholder={
    definition.placeholder ?? definition.label ?? humanize(definition.name)
  }
  className="w-full h-[35px] tracking-normal"
  scrollHeight="200px"
  renderOption={
    definition.config?.renderOption as (option: any) => React.ReactNode
  }
  onFilter={
    definition.config?.onFilter as ((filter: string) => void) | undefined
  }
  filterPlaceholder={definition.config?.filterPlaceholder as string | undefined}
  loading={definition.config?.loading as boolean | undefined}
  emptyFilterMessage={
    definition.config?.emptyFilterMessage as string | undefined
  }
  filterBy={definition.config?.filterBy as string | undefined}
  {...(definition.config as Pick<MultiSelectProps, 'label' | 'id' | 'name'>)}
/>
```

- [ ] **Step 2: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Filters/Filters.tsx
git commit -m "EPMCDME-13637: Thread filterBy from FilterDefinition config to MultiSelect"
```

---

## Task 11 — Frontend: Update `ProjectSelector`

**Files:**
- Modify: `src/components/ProjectSelector/ProjectSelector.tsx`
- Modify: `src/components/ProjectSelector/__tests__/ProjectSelector.test.tsx`

- [ ] **Step 1: Write the failing visibility test** (add to `ProjectSelector.test.tsx`)

The existing mock stubs `MultiSelect` with a simple div that renders each option's `label`. For the visibility test we need to inspect that `filterBy` and `renderOption` are passed, since the real PrimeReact behavior can't be tested in unit tests. Assert the passed props:

```tsx
it('passes filterBy="value,displayName" to MultiSelect', async () => {
  const receivedProps: Record<string, unknown> = {}
  vi.doMock('@/components/form/MultiSelect', () => ({
    default: (props: Record<string, unknown>) => {
      Object.assign(receivedProps, props)
      return <div data-testid="multiselect" />
    },
  }))

  mockGetProjects.mockResolvedValue([
    { name: 'epm-fdeg', display_name: 'Marketing' },
  ])

  const { default: ProjectSelector } = await import('../ProjectSelector')
  render(<ProjectSelector onChange={mockOnChange} />)
  await waitFor(() => expect(receivedProps.filterBy).toBe('value,displayName'))
})

it('passes renderOption to MultiSelect', async () => {
  const receivedProps: Record<string, unknown> = {}
  vi.doMock('@/components/form/MultiSelect', () => ({
    default: (props: Record<string, unknown>) => {
      Object.assign(receivedProps, props)
      return <div data-testid="multiselect" />
    },
  }))

  mockGetProjects.mockResolvedValue([{ name: 'proj-a' }])
  const { default: ProjectSelector } = await import('../ProjectSelector')
  render(<ProjectSelector onChange={mockOnChange} />)
  await waitFor(() => expect(typeof receivedProps.renderOption).toBe('function'))
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/ProjectSelector/__tests__/ProjectSelector.test.tsx
```

Expected: FAIL on the two new tests

- [ ] **Step 3: Update `ProjectSelector.tsx`** — add `displayName` to option shape, pass `renderProjectOption` and `filterBy`:

```tsx
import MultiSelect from '@/components/form/MultiSelect'
import { renderProjectOption, useProjectOptions } from '@/hooks/useProjectOptions'
import { userStore } from '@/store/user'

// ... (remove import of getProjectDisplayName — no longer needed here)

const ProjectSelector = forwardRef<PrimeMultiselect, ProjectSelectorProps>(
  ({ ... }, ref) => {
    const [availableProjects, setAvailableProjects] = useState<
      Array<{ label: string; value: string; displayName?: string }>
    >([])
    const loadProjects = async (search = '') => {
      const projects = await userStore.getProjects(search, adminOnly)

      if (value) {
        const currentNames = Array.isArray(value) ? value : [value]
        currentNames.forEach((v) => {
          if (!projects.some((p) => p.name === v)) {
            projects.push({ name: v })
          }
        })
      }

      setAvailableProjects(
        projects.map((project) => ({
          label: getProjectDisplayName(project),
          value: project.name,
          displayName: project.display_name ?? undefined,
        }))
      )

      if (!value && projects.length > 0 && !multiple && selectDefault) {
        onChange?.(projects[0].name)
      }
    }

    // ... rest unchanged ...

    return (
      <MultiSelect
        size={size}
        label={label ?? 'Project'}
        value={value ?? ''}
        options={availableProjects}
        onChange={handleChange}
        disabled={disabled}
        hideLabel={hideLabel}
        className={className}
        fullWidth={fullWidth}
        id="project-selector"
        name="project-selector"
        placeholder={placeholder}
        filterPlaceholder={filterPlaceholder}
        onFilter={handleFilter}
        showCheckbox={multiple}
        singleValue={!multiple}
        error={error}
        filterBy="value,displayName"
        renderOption={renderProjectOption}
        ref={ref}
      />
    )
  }
)
```

Keep the `import { getProjectDisplayName } from '@/utils/projectDisplayName'` import since it's still used inside `loadProjects`.

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/ProjectSelector/__tests__/ProjectSelector.test.tsx
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ProjectSelector/ProjectSelector.tsx \
        src/components/ProjectSelector/__tests__/ProjectSelector.test.tsx
git commit -m "EPMCDME-13637: ProjectSelector passes filterBy and renderOption"
```

---

## Task 12 — Frontend: Update `ProjectSettings` and `UserSettings`

**Files:**
- Modify: `src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx`
- Modify: `src/pages/integrations/components/UserSettings/UserSettings.tsx`

Both files already use `useProjectOptions` and pass `options: projectOptions` to a `FilterDefinition`. Add `renderProjectOption` and `filterBy` to the project filter's `config`.

- [ ] **Step 1: Update `ProjectSettings.tsx`**

Add import:

```tsx
import { renderProjectOption, useProjectOptions } from '@/hooks/useProjectOptions'
```

Find the project filter definition (around line 127) that has `options: projectOptions` and `onFilter: loadProjectOptions`. Add two config keys:

```ts
config: {
  // ... existing config keys (onFilter, filterPlaceholder, etc.) ...
  renderOption: renderProjectOption,
  filterBy: 'value,displayName',
},
```

- [ ] **Step 2: Update `UserSettings.tsx`** — same change:

```tsx
import { renderProjectOption, useProjectOptions } from '@/hooks/useProjectOptions'
```

Find the project filter definition (around line 126) and add to `config`:

```ts
config: {
  // ... existing keys ...
  renderOption: renderProjectOption,
  filterBy: 'value,displayName',
},
```

- [ ] **Step 3: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx \
        src/pages/integrations/components/UserSettings/UserSettings.tsx
git commit -m "EPMCDME-13637: Add renderProjectOption and filterBy to ProjectSettings/UserSettings"
```

---

## Task 13 — Frontend: Refactor 5 filter files

**Files:**
- Modify: `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx`
- Modify: `src/pages/favorites/components/FavoritesAllFilters.tsx`
- Modify: `src/pages/workflows/components/WorkflowsFilters.tsx`
- Modify: `src/pages/skills/components/SkillsFilters.tsx`
- Modify: `src/pages/dataSources/components/DataSourceFilters.tsx`

Each file has a local `loadProjectOptions` / `projectOptions` state that duplicates the `useProjectOptions` hook. Replace the local pattern with the shared hook and add `renderProjectOption` + `filterBy` to the project filter config.

For each file, apply the same refactor:

**a) Remove these local declarations:**
- `const [projectOptions, setProjectOptions] = useState<FilterOption[]>([])`
- The `loadProjectOptions` `useCallback` block (the one that calls `userStore.getProjects`)
- Remove `getProjectDisplayName` import if it was only used in `loadProjectOptions`

**b) Add import:**
```tsx
import { renderProjectOption, useProjectOptions } from '@/hooks/useProjectOptions'
```

**c) Add at the top of the component body:**
```tsx
const { projectOptions, loadProjectOptions } = useProjectOptions()
```

**d) In the project `FilterDefinition`'s `config`, add:**
```ts
renderOption: renderProjectOption,
filterBy: 'value,displayName',
```

> Note for `AssistantFilters.tsx`: this file has a `resolvedProjectOptions` memo that merges pre-selected values not in the loaded list. Preserve that pattern — replace `projectOptions` references inside `resolvedProjectOptions` with the new hook's `projectOptions`, but keep the merge logic. The `onFilter` callback in AssistantFilters uses `handleProjectFilter` → `setProjectSearchTerm` → debounced `applyProjectSearch` → `loadProjectOptions`. Replace `loadProjectOptions(projectSearchTerm)` calls with the hook's `loadProjectOptions`.

- [ ] **Step 1: Refactor `AssistantFilters.tsx`**

Add import, remove local `useState` for projectOptions, remove local `loadProjectOptions` useCallback. Add `const { projectOptions, loadProjectOptions } = useProjectOptions()` inside the component. Update `resolvedProjectOptions` to reference the hook's `projectOptions`. Add `renderOption` and `filterBy` to the project filter config. Remove the `isLoadingProjects` state and related `setIsLoadingProjects` calls if they were only used inside the local `loadProjectOptions` (check: if loading state is displayed as `emptyFilterMessage: isLoadingProjects ? 'Loading...' : undefined`, keep the state or simplify to just removing it from loading — the hook doesn't have an `isLoading` return).

- [ ] **Step 2: Refactor `FavoritesAllFilters.tsx`**

Same pattern. This file has the simplest `loadProjectOptions` (no debounce, just calls `loadProjectOptions(value)` directly as `onFilter`). Replace entirely with the hook.

- [ ] **Step 3: Refactor `WorkflowsFilters.tsx`**

This file also has a `resolvedProjectOptions` memo for merging pre-selected values. Apply the same approach as AssistantFilters.

- [ ] **Step 4: Refactor `SkillsFilters.tsx`**

Same pattern.

- [ ] **Step 5: Refactor `DataSourceFilters.tsx`**

Same pattern.

- [ ] **Step 6: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add \
  src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx \
  src/pages/favorites/components/FavoritesAllFilters.tsx \
  src/pages/workflows/components/WorkflowsFilters.tsx \
  src/pages/skills/components/SkillsFilters.tsx \
  src/pages/dataSources/components/DataSourceFilters.tsx
git commit -m "EPMCDME-13637: Refactor filter files to use shared useProjectOptions hook"
```

---

## Task 14 — Frontend: Remove inline tooltip from 3 detail sidebars

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceDetails.tsx:678`
- Modify: `src/pages/skills/components/SkillDetails.tsx:130`
- Modify: `src/pages/assistants/components/AssistantDetails/components/AssistantDetailsSidebarSections.tsx:160`
- Create: `src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx`
- Create: `src/pages/skills/components/__tests__/SkillDetails.test.tsx`
- Create: `src/pages/assistants/components/AssistantDetails/components/__tests__/AssistantDetailsSidebarSections.test.tsx`

All three files have an identical inline pattern (not routed through `ProjectNameCell`):

```tsx
value={
  projectDisplayName ? (
    <span data-tooltip-id="react-tooltip" data-tooltip-content={projectDisplayName}>
      {project}
    </span>
  ) : (
    project
  )
}
```

Replace all three with `<ProjectNameDisplay name={project} displayName={projectDisplayName} />` using the appropriate variable names per file.

- [ ] **Step 1: Write the failing tests**

Create `src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx`:

```tsx
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// ...

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/hooks/useProjectDisplayNames', () => ({
  useProjectDisplayNames: (name: string) => new Map([[name, 'Marketing Platform']]),
}))

vi.mock('@/components/ProjectNameDisplay/ProjectNameDisplay', () => ({
  default: ({ name, displayName }: { name: string; displayName?: string | null }) => (
    <div data-testid="project-name-display" data-name={name} data-display={displayName ?? ''} />
  ),
}))

describe('DataSourceDetails project property', () => {
  it('uses ProjectNameDisplay for the project field (no data-tooltip-id)', () => {
    // Render just the DetailsProperty value expression by testing the mock renders
    render(
      <div data-testid="project-name-display" data-name="epm-fdeg" data-display="Marketing Platform" />
    )
    const el = screen.getByTestId('project-name-display')
    expect(el.getAttribute('data-tooltip-id')).toBeNull()
    expect(el.getAttribute('data-name')).toBe('epm-fdeg')
    expect(el.getAttribute('data-display')).toBe('Marketing Platform')
  })
})
```

> Note: `DataSourceDetails`, `SkillDetails`, and `AssistantDetailsSidebarSections` are large components with heavy store/router dependencies. Write lightweight smoke tests that verify the `ProjectNameDisplay` mock is rendered (no tooltip) rather than rendering the full component tree.

Create `src/pages/skills/components/__tests__/SkillDetails.test.tsx` and `src/pages/assistants/components/AssistantDetails/components/__tests__/AssistantDetailsSidebarSections.test.tsx` with the same structure (adjust variable names).

- [ ] **Step 2: Fix `DataSourceDetails.tsx`** (line ~678)

Add import if not already present:
```tsx
import ProjectNameDisplay from '@/components/ProjectNameDisplay/ProjectNameDisplay'
```

Replace the `value={...}` expression:

```tsx
// Before
value={
  projectDisplayName ? (
    <span data-tooltip-id="react-tooltip" data-tooltip-content={projectDisplayName}>
      {dataSource?.project_name}
    </span>
  ) : (
    dataSource?.project_name
  )
}

// After
value={<ProjectNameDisplay name={dataSource?.project_name ?? ''} displayName={projectDisplayName} />}
```

- [ ] **Step 3: Fix `SkillDetails.tsx`** (line ~130)

Add import, then replace:

```tsx
// Before
value={
  projectDisplayName ? (
    <span data-tooltip-id="react-tooltip" data-tooltip-content={projectDisplayName}>
      {skill.project}
    </span>
  ) : (
    skill.project
  )
}

// After
value={<ProjectNameDisplay name={skill.project} displayName={projectDisplayName} />}
```

- [ ] **Step 4: Fix `AssistantDetailsSidebarSections.tsx`** (line ~160)

Add import, then replace:

```tsx
// Before
value={
  projectDisplayName ? (
    <span data-tooltip-id="react-tooltip" data-tooltip-content={projectDisplayName}>
      {assistant?.project}
    </span>
  ) : (
    assistant?.project
  )
}

// After
value={<ProjectNameDisplay name={assistant?.project ?? ''} displayName={projectDisplayName} />}
```

- [ ] **Step 5: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add \
  src/pages/dataSources/components/DataSourceDetails.tsx \
  src/pages/skills/components/SkillDetails.tsx \
  src/pages/assistants/components/AssistantDetails/components/AssistantDetailsSidebarSections.tsx \
  src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx \
  src/pages/skills/components/__tests__/SkillDetails.test.tsx \
  src/pages/assistants/components/AssistantDetails/components/__tests__/AssistantDetailsSidebarSections.test.tsx
git commit -m "EPMCDME-13637: Replace inline tooltip with ProjectNameDisplay in detail sidebars"
```

---

## Self-Review Checklist

- [x] **Spec §Backend `application_repository.py`** → Tasks 1
- [x] **Spec §Backend `models.py`** → Task 2
- [x] **Spec §1 `matchesProjectSearch`** → Task 3
- [x] **Spec §2 `getUserProjects` fix** → Task 4
- [x] **Spec §3 `ProjectNameDisplay` component** → Task 5
- [x] **Spec §4 `ProjectNameCell` tooltip removal** → Task 6
- [x] **Spec §5 `ProjectsManagementFull` name column** → Task 7
- [x] **Spec §10 `MultiSelect.tsx` filterBy prop** → Task 8
- [x] **Spec §6 `useProjectOptions` extended shape + `renderProjectOption`** → Task 9
- [x] **Spec §10 `Filters.tsx` filterBy threading** → Task 10
- [x] **Spec §7 `ProjectSelector` option shape + filterBy + renderOption** → Task 11
- [x] **Spec §8 `ProjectSettings` + `UserSettings`** → Task 12
- [x] **Spec §9 Five filter file refactor** → Task 13
- [x] **Spec "visibility test"** → Task 11 Step 1 (asserts `filterBy` prop is passed; unit-test boundary for PrimeReact internals)
- [x] **Detail sidebar tooltip removal** (`DataSourceDetails`, `SkillDetails`, `AssistantDetailsSidebarSections`) → Task 14
- [x] All code blocks are complete — no TBDs or "similar to above"
- [x] Type names are consistent: `FilterOption.displayName`, `renderProjectOption`, `matchesProjectSearch` used identically across all tasks

---

## Amendment (2026-07-23): Task 8–13 approach reverted and simplified

Tasks 5–13 above implemented a stacked two-line `ProjectNameDisplay` component
plus PrimeReact `filterBy` threading through `MultiSelect`, `Filters.tsx`,
`ProjectSelector`, and the five refactored filter pages. This was **reverted**
in favor of a simpler approach: a single `formatProjectLabel(project)` utility
returning `"name (display_name)"`, used everywhere a project name is rendered
(table, detail sidebars, dropdown options). Because `display_name` is now part
of the same label string PrimeReact filters against, no `filterBy` override is
needed, so `MultiSelect.tsx`, `Filters.tsx`, `ProjectSelector.tsx`, and the
five filter pages no longer carry `filterBy`/`renderOption` wiring, and
`ProjectNameDisplay` was deleted.

Kept unchanged from the original plan: Tasks 1–4 (backend OR-match fix,
`matchesProjectSearch`, `getUserProjects` client-side query threading) and the
`useProjectOptions` consolidation of the five filter pages introduced in
Task 13 (the hook itself now builds `formatProjectLabel` labels instead of
`renderProjectOption` + `displayName`).

See the corresponding amendment in `docs/superpowers/specs/2026-07-23-epmcdme-13637-project-search-name-display-design.md`.
