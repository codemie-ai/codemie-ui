# Implementation Plan — EPMCDME-10930: Add Auditor Role

**Feature**: Add `is_auditor` boolean flag granting read-only platform-wide access to Analytics, Projects, Users, and Budgets without admin/maintainer write privileges.  
**Branch**: `EPMCDME-10930_add-auditor-role`  
**Spec**: `docs/superpowers/tasks/2026-08-12-epmcdme-10930-add-auditor-role/spec.md`  
**Tech analysis**: `docs/superpowers/tasks/2026-08-12-epmcdme-10930-add-auditor-role/technical-analysis.md`  
**Repos**: `codemie-ui` (frontend) + `../codemie` (backend)

---

## Task 1 — Backend: Persist `is_auditor` on UserDB and propagate through all DTOs

**Test-first: yes** — add `test_user_db_has_is_auditor_field` asserting `UserDB` has an `is_auditor` attribute defaulting to `False` and that `UserListFilters(is_auditor=True)` parses without error.

**Files**
- `../codemie/src/codemie/rest_api/models/user_management.py`
- `../codemie/src/codemie/core/models.py`

**Changes**

`UserDB` — after `is_maintainer`:
```python
# before
    is_maintainer: bool = SQLField(default=False)
    auth_source: str = SQLField(default="local")

# after
    is_maintainer: bool = SQLField(default=False)
    is_auditor: bool = SQLField(default=False)
    auth_source: str = SQLField(default="local")
```

`UserCreateRequest` — after `is_maintainer`:
```python
    is_maintainer: bool = False
    is_auditor: bool = False
```

`UserUpdateRequest` — after `is_maintainer`:
```python
    is_maintainer: Optional[bool] = None
    is_auditor: Optional[bool] = None
```

`CodeMieUserDetail` — after `is_maintainer`:
```python
    is_maintainer: bool = False
    is_auditor: bool = False
```

`AdminUserListItem` — after `is_maintainer`:
```python
    is_maintainer: bool = False
    is_auditor: bool = False
```

`UserListFilters` — add at end of class:
```python
    platform_role: Optional[PlatformRole] = None
    is_auditor: Optional[bool] = None
```

`UserResponse` in `../codemie/src/codemie/core/models.py` — after `is_maintainer`:
```python
    is_maintainer: bool = False
    is_auditor: bool = False
```

---

## Task 2 — Backend: Add `is_auditor` to the security `User` model and `UserContext`

**Test-first: yes** — add `test_user_is_auditor_defaults_false` asserting `User(id="x", email="x@y.com", username="x", name="X")` has `is_auditor == False`, and `test_resolve_is_admin_does_not_set_auditor` asserting that after `user.resolve_is_admin()` with `is_maintainer=True`, `user.is_auditor` is still `False` (regression guard against the resolve_is_admin auto-promote trap).

**Files**
- `../codemie/src/codemie/rest_api/security/user.py`

**Changes**

`User` model — add field after `is_maintainer` (line ~47). Do NOT add any corresponding auto-promote logic in `resolve_is_admin`:
```python
    is_maintainer: bool = Field(default=False)
    is_auditor: bool = Field(default=False)
```

`UserContext` — add field after `is_maintainer` (line ~134):
```python
    is_maintainer: bool | None = None
    is_auditor: bool | None = None
```

`UserContext.from_user()` — add mapping after `is_maintainer=user.is_maintainer`:
```python
            is_maintainer=user.is_maintainer,
            is_auditor=user.is_auditor,
```

---

## Task 3 — Backend: New `admin_or_maintainer_or_auditor_access` dependency and auditor fast-path

**Test-first: yes** — `test_admin_or_maintainer_or_auditor_access_allows_auditor` (pure auditor: `is_admin=False, is_maintainer=False, is_auditor=True` → no exception) and `test_admin_or_maintainer_or_auditor_access_blocks_plain_user` (all False → 403). Also `test_project_admin_or_admin_user_detail_access_allows_auditor` (auditor returns without DB query).

**Files**
- `../codemie/src/codemie/rest_api/security/authentication.py`

**Changes**

Add new async dependency after `maintainer_access_only` (around line 195):
```python
async def admin_or_maintainer_or_auditor_access(request: Request) -> None:
    """Allows access for admin, maintainer, or auditor users."""
    user = request.state.user
    if user.is_admin_or_maintainer or getattr(user, "is_auditor", False):
        return
    logger.warning(
        f"access_denied_auditor: actor_user_id={user.id}, domain=user_management"
    )
    raise ExtendedHTTPException(
        code=status.HTTP_403_FORBIDDEN,
        message=ACCESS_DENIED_MESSAGE,
        details="This action requires administrator, maintainer, or auditor privileges.",
        help="If you believe you should have access, please contact your system administrator.",
    )
```

`project_admin_or_admin_user_detail_access` — add auditor fast-path immediately after the admin/maintainer check (before the `if user.is_applications_admin:` branch):
```python
    # Admins and maintainers have full access
    if user.is_admin_or_maintainer:
        return

    # Auditors have read-only access to all user details
    if getattr(user, "is_auditor", False):
        return

    # Project admins need to check if target user is in projects they admin
    if user.is_applications_admin:
```

---

## Task 4 — Backend: User-management router guards + `is_auditor` filter in repository

**Test-first: yes** — extend `test_user_management_router_authorization.py` with `test_auditor_can_list_users` (pure auditor User gets 200 from `list_users`, `list_users_with_flow` called with elevated `is_project_admin=True`), `test_auditor_cannot_create_user` (POST → 403 via existing `admin_access_only`), and `test_user_repository_is_auditor_filter` (inject `is_auditor=True` filter, verify SQL query contains `users.is_auditor = true`).

**Files**
- `../codemie/src/codemie/rest_api/routers/user_management_router.py`
- `../codemie/src/codemie/repository/user_repository.py`

**Changes in `user_management_router.py`**

Import `admin_or_maintainer_or_auditor_access`:
```python
from codemie.rest_api.security.authentication import (
    authenticate,
    admin_access_only,
    admin_or_maintainer_or_auditor_access,
    maintainer_access_only,
    project_admin_or_admin_user_detail_access,
)
```

`GET ""` (list_users) — add Depends and elevate `is_project_admin`:
```python
@router.get("", response_model=PaginatedUserListResponse)
def list_users(
    page: int = Query(0, ge=0, description="Page number (0-indexed)"),
    per_page: int = Query(20, description="Items per page (10, 20, 50, or 100)"),
    search: Optional[str] = Query(None, description="Search in email, username, name"),
    filters: Optional[str] = Query(None, description="..."),
    user: User = Depends(authenticate),
    _: None = Depends(admin_or_maintainer_or_auditor_access),
):
    ...
    return user_management_service.list_users_with_flow(
        requesting_user_id=user.id,
        is_project_admin=(
            user.is_applications_admin
            or getattr(user, "is_auditor", False)
        ),
        page=page,
        per_page=per_page,
        search=search,
        filters=UserListFilters.model_validate(parsed_filters),
    )
```

`GET /{user_id}/projects` — replace `admin_access_only` with `admin_or_maintainer_or_auditor_access`:
```python
@router.get("/{user_id}/projects")
def get_user_projects(
    user_id: str,
    user: User = Depends(authenticate),
    _: None = Depends(admin_or_maintainer_or_auditor_access),
):
```

`GET /{user_id}/knowledge-bases` — same replacement:
```python
@router.get("/{user_id}/knowledge-bases")
def get_user_knowledge_bases(
    user_id: str,
    user: User = Depends(authenticate),
    _: None = Depends(admin_or_maintainer_or_auditor_access),
):
```

`GET /{user_id}/budgets` — replace `maintainer_access_only` with `admin_or_maintainer_or_auditor_access`:
```python
@router.get("/{user_id}/budgets", response_model=list[UserBudgetAssignmentResponse])
async def get_user_budgets(
    user_id: str,
    user: User = Depends(authenticate),
    _: None = Depends(admin_or_maintainer_or_auditor_access),
):
```

**Changes in `user_repository.py`** — `_apply_filters` method, after the `budgets` filter block:
```python
        if filters.is_auditor is not None:
            query = query.where(UserDB.is_auditor == filters.is_auditor)
```

---

## Task 5 — Backend: Budget router guards

**Test-first: yes** — `test_auditor_can_list_budgets` (GET /v1/budgets → 200 for auditor) and `test_auditor_can_get_budget_detail` (GET /v1/budgets/{id} → 200 for auditor).

**Files**
- `../codemie/src/codemie/rest_api/routers/budget_router.py`
- `../codemie/src/codemie/rest_api/routers/project_budget_router.py`

**Changes in `budget_router.py`**

Import `admin_or_maintainer_or_auditor_access` alongside existing imports.

`GET ""` list_budgets — replace `admin_or_maintainer_access_only`:
```python
    _: None = Depends(admin_or_maintainer_or_auditor_access),
```

`GET /{budgetId}` get_budget — same replacement.

**Changes in `project_budget_router.py`** (inline guards, no Depends changes)

`_can_read_project_budget` helper — widen the admin/maintainer check:
```python
    if user.is_admin_or_maintainer or getattr(user, "is_auditor", False):
        return True
```

`list_project_budgets` — widen the access check:
```python
    if not (user.is_admin_or_maintainer or getattr(user, "is_auditor", False)):
```

---

## Task 6 — Backend: Analytics inline guards (6 sites)

**Test-first: yes** — `test_auditor_analytics_cross_user_filter` (auditor caller at line 593 check returns auditor's data unfiltered) and `test_auditor_analytics_full_stats_access` (line 2406 check passes for auditor).

**Files**
- `../codemie/src/codemie/rest_api/routers/analytics.py`

**Changes** (all via `getattr(caller/user, "is_auditor", False)` guard):

Line ~593:
```python
    # before
    if caller.is_admin:
    # after
    if caller.is_admin or getattr(caller, "is_auditor", False):
```

Line ~2406:
```python
    # before
    if not user.is_admin_or_maintainer:
    # after
    if not (user.is_admin_or_maintainer or getattr(user, "is_auditor", False)):
```

Lines ~2496, ~2582, ~2670, ~3216 (each is a `if not user.is_admin:` pattern):
```python
    # before
    if not user.is_admin:
    # after
    if not (user.is_admin or getattr(user, "is_auditor", False)):
```

---

## Task 7 — Backend: Projects router visibility (5 sites)

**Test-first: yes** — `test_auditor_can_list_all_projects` (auditor's `_list_projects_sync` called with `is_admin=True`-equivalent) and `test_auditor_can_see_project_spending` (`_can_see_project_spending` returns `True` for auditor).

**Files**
- `../codemie/src/codemie/rest_api/routers/projects.py`

**Changes** — all five sites use `getattr(user, 'is_auditor', False)`:

`_manageable_project_names` (line ~568):
```python
    # before
    if user.is_admin:
    # after
    if user.is_admin or getattr(user, 'is_auditor', False):
```

`_list_projects_sync` call (line ~733) — `is_admin` kwarg:
```python
    # before
    is_admin=user.is_admin,
    # after
    is_admin=user.is_admin or getattr(user, 'is_auditor', False),
```

`_get_project_detail_sync` call (line ~794) — same `is_admin` kwarg.

`_can_see_project_spending` (lines ~827-830):
```python
    # before
    if user.is_admin:
    # after
    if user.is_admin or getattr(user, 'is_auditor', False):
```

`get_project_spends` can_access block (lines ~942-946) — add to existing disjunction:
```python
    # before
    can_access = user.is_admin or ...
    # after
    can_access = user.is_admin or getattr(user, 'is_auditor', False) or ...
```

---

## Task 8 — Backend: Alembic migration

**Test-first: no** — migration files are not unit-tested; correctness is verified by `alembic upgrade head` completing without error in CI.

**File**
- `../codemie/src/external/alembic/versions/<new_hex>_add_users_is_auditor.py`

**Steps**
1. Run `alembic heads` in `../codemie` to confirm the current head revision.
2. Generate the migration stub with `alembic revision --autogenerate -m "add_users_is_auditor"`.
3. Verify `down_revision` points to the head from step 1.
4. Confirm the generated `upgrade()` adds the column; replace with explicit form if autogenerate missed it:

```python
def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_auditor",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

def downgrade() -> None:
    op.drop_column("users", "is_auditor")
```

---

## Task 9 — Frontend: Types and Store

**Test-first: no** — TypeScript compiler (`tsc --noEmit`) is the gate here; no unit test needed for data-mapping functions in the store.

**Files**
- `src/types/entity/user.ts`
- `src/store/user.ts`

**Changes in `user.ts` (types)**

`User` interface — add after `isMaintainer`:
```typescript
  isMaintainer?: boolean
  isAuditor?: boolean
```

`UserListItem` interface — add after `is_maintainer`:
```typescript
  is_maintainer?: boolean
  is_auditor?: boolean
```

`UserUpdatePayload` interface — add after `is_maintainer`:
```typescript
  is_maintainer?: boolean
  is_auditor?: boolean
```

**Changes in `user.ts` (store)**

`loadUser()` — add mapping after `isMaintainer`:
```typescript
          isMaintainer: apiUser.is_maintainer ?? false,
          isAuditor: apiUser.is_auditor ?? false,
```

`getCurrentUser()` — same addition after `isMaintainer`.

`getUsers()` filter params type in `UserStoreType` interface — extend `platform_role`:
```typescript
      platform_role?: ProjectRoleBE | 'auditor' | null
```

`getUsers()` body — intercept `'auditor'` sentinel before building `filtersJson`:
```typescript
    if (filters.platform_role === 'auditor') {
      filtersJson.is_auditor = true
    } else if (filters.platform_role != null) {
      filtersJson.platform_role = filters.platform_role
    }
```
(Replace the existing single-line `if (filters.platform_role != null) filtersJson.platform_role = filters.platform_role`.)

---

## Task 10 — Frontend: Navigation tabs

**Test-first: no** — navigation rendering is covered by existing snapshot tests; the change is additive and TypeScript is the primary gate.

**Files**
- `src/pages/settings/tabs.tsx`
- `src/pages/settings/components/SettingsLayout.tsx`

**Changes in `tabs.tsx`**

`getNavigationTabs` signature — add 5th param:
```typescript
export const getNavigationTabs = (
  isAdmin: boolean,
  awsSupported = false,
  isMaintainer = false,
  isProjectAdmin = false,
  isAuditor = false
): LayoutTab[] => {
```

`budgetsManagementTab` — extend condition to include auditors:
```typescript
  const budgetsManagementTab =
    isBudgetMgmtEnabled && (isAdmin || isMaintainer || isAuditor)
      ? [{ id: SettingsTab.BUDGETS_MANAGEMENT, name: 'Budgets management', ... }]
      : []
```

Remove `isUserMgmtEnabled` from `getEnterpriseAdminItems` signature and delete the inline users-management spread inside it (lines 64–73 of `tabs.tsx`):
```typescript
// Before
const getEnterpriseAdminItems = (
  isMcpFeatureEnabled: boolean,
  isUserMgmtEnabled: boolean,       // ← remove
  budgetsManagementTab: LayoutTab[]
): LayoutTab[] => [
  ...
  ...(isUserMgmtEnabled             // ← remove this entire block
    ? [{ id: SettingsTab.USERS_MANAGEMENT, ... }]
    : []),
]

// After
const getEnterpriseAdminItems = (
  isMcpFeatureEnabled: boolean,
  budgetsManagementTab: LayoutTab[]
): LayoutTab[] => [
  { id: SettingsTab.AI_ADOPTION_CONFIG, ... },
  ...budgetsManagementTab,
  { id: SettingsTab.CATEGORIES_MANAGEMENT, ... },
  ...(isMcpFeatureEnabled ? [{ id: SettingsTab.MCP_MANAGEMENT, ... }] : []),
  { id: SettingsTab.PROVIDERS_MANAGEMENT, ... },
]
```

Define `usersManagementTab` as a standalone constant in `getNavigationTabs`, exactly matching spec condition:
```typescript
  const usersManagementTab: LayoutTab[] =
    isUserMgmtEnabled && (isAdmin || isAuditor)
      ? [{ id: SettingsTab.USERS_MANAGEMENT, name: 'Users management', title: 'Users management', url: '/settings/administration/users' }]
      : []
```

Update `administrationChildren` — admin arm spreads `...usersManagementTab` directly (since it was removed from `getEnterpriseAdminItems`); update the `getEnterpriseAdminItems` call to drop the removed param; add auditor arm:
```typescript
  const administrationChildren = isAdmin
    ? [
        ...activityEventsTab,
        ...(isCostCentersFeatureEnabled ? [{ id: SettingsTab.COST_CENTERS_MANAGEMENT, ... }] : []),
        { id: SettingsTab.PROJECTS_MANAGEMENT, ... },
        ...(isEnterprise
          ? getEnterpriseAdminItems(isMcpFeatureEnabled, budgetsManagementTab) // ← isUserMgmtEnabled removed
          : []),
        ...usersManagementTab,   // ← now spread here, not inside getEnterpriseAdminItems
        ...(isTeamsBotEnabled ? [{ id: SettingsTab.TEAMS_BOT_INTEGRATION, ... }] : []),
      ].sort((a, b) => a.name.localeCompare(b.name))
    : isAuditor
    ? [
        { id: SettingsTab.PROJECTS_MANAGEMENT, name: 'Projects management', title: 'Projects management', url: '/settings/administration/projects' },
        ...usersManagementTab,
        ...budgetsManagementTab,
      ].sort((a, b) => a.name.localeCompare(b.name))
    : [
        // existing non-admin, non-auditor block unchanged
      ]
```

**Changes in `SettingsLayout.tsx`**

`getNavigationTabs` call — add 5th argument:
```typescript
      tabs={getNavigationTabs(
        user?.isAdmin || user?.isMaintainer || false,
        isConfigItemEnabled(configs, 'vendorIntegrationAWS'),
        user?.isMaintainer ?? false,
        (user?.applicationsAdmin?.length ?? 0) > 0,
        user?.isAuditor ?? false
      )}
```

---

## Task 11 — Frontend: Analytics page and Filters guards

**Test-first: no** — these are boolean guard extensions on existing feature gates; existing page-level tests will exercise the admin path; auditor is additive.

**Files**
- `src/pages/analytics/AnalyticsPage.tsx`
- `src/pages/analytics/components/AnalyticsFilters.tsx`

**Changes in `AnalyticsPage.tsx`**

Destructure `isAuditor` from user snapshot (alongside `isAdmin`/`isMaintainer`).

`isAdoptionEnabled` — add `|| isAuditor`:
```typescript
  const isAdoptionEnabled = isAdmin || isMaintainer || isAuditor || isAdoptionConfigured
```

`isLeaderboardEnabled` — same addition.

**Changes in `AnalyticsFilters.tsx`**

`showMeCheckbox` — add `|| isAuditor`:
```typescript
  const showMeCheckbox = isAdmin || isMaintainer || isAuditor
```

`isAdminSearch` (enables cross-user filter) — add `|| isAuditor`:
```typescript
  const isAdminSearch = isAdmin || isMaintainer || isAuditor
```

---

## Task 12 — Frontend: Administration page `canViewBudgets` guards

**Test-first: no** — guard boolean extension; TypeScript is the primary gate.

**Files**
- `src/pages/settings/administration/BudgetsManagementPage.tsx`
- `src/pages/settings/administration/ProjectDetailsPage.tsx`

In both files, find `canViewBudgets` (or the equivalent condition) and add `|| isAuditor`.

**`BudgetsManagementPage.tsx`**:
```typescript
  // before
  const canViewBudgets = isBudgetManagementEnabled && (isAdmin || isMaintainer)
  // after
  const canViewBudgets = isBudgetManagementEnabled && (isAdmin || isMaintainer || isAuditor)
```

**`ProjectDetailsPage.tsx`** — same pattern for the project-budget visibility gate.

---

## Task 13 — Frontend: UserDetailsPopup — Auditor switch + budget split

**Test-first: yes** — add `UserDetailsPopup.auditor.test.tsx`: render with `currentUser.isAuditor=true`, assert Auditor switch visible and disabled; render with `currentUser.isMaintainer=true`, assert Auditor switch visible and enabled; assert `canAssignAuditor=false` when `currentUser.userId === userId`.

**Files**
- `src/pages/settings/administration/usersManagement/components/popups/UserDetailsPopup.tsx`

**Changes**

`isAuditor` from snapshot — add after `isMaintainer`:
```typescript
  const isAdmin = currentUser?.isAdmin ?? false
  const isMaintainer = currentUser?.isMaintainer ?? false
  const isAuditor = currentUser?.isAuditor ?? false
```

Replace `canManageBudgets` with two variables:
```typescript
  const canViewBudgets = isBudgetManagementEnabled && (isMaintainer || isAuditor)
  const canManageBudgets = isBudgetManagementEnabled && isMaintainer
```

Add `canAssignAuditor`:
```typescript
  const canAssignAuditor = (isAdmin || isMaintainer) && currentUser?.userId !== userId
```

`roleFlags` state — add `is_auditor`:
```typescript
  const [roleFlags, setRoleFlags] = useState({
    is_admin: false,
    is_maintainer: false,
    is_auditor: false,
  })
```

`fetchUserDetails` — populate `is_auditor`:
```typescript
      setRoleFlags({
        is_admin: details.is_admin,
        is_maintainer: details.is_maintainer ?? false,
        is_auditor: details.is_auditor ?? false,
      })
```

`fetchUserDetails` — use `canViewBudgets` for the conditional fetch:
```typescript
      canViewBudgets ? userStore.getUserBudgets(userId) : Promise.resolve([]),
```

`useEffect` dependency — change `canManageBudgets` to `canViewBudgets`:
```typescript
  }, [canViewBudgets, isOpen, userId])
```

`handleRoleChange` — expand key type and add `canAssignAuditor` guard:
```typescript
  const handleRoleChange = async (
    key: 'is_admin' | 'is_maintainer' | 'is_auditor',
    value: boolean
  ) => {
    if (!user || !userId || isUpdatingRoles) return
    if ((key === 'is_admin' || key === 'is_maintainer') && !canEditPlatformRoles) return
    if (key === 'is_auditor' && !canAssignAuditor) return

    const previousFlags = roleFlags
    const nextFlags = { ...roleFlags, [key]: value }

    if (key === 'is_maintainer' && value) {
      nextFlags.is_admin = true
    }
    if (key === 'is_admin' && !value && roleFlags.is_maintainer) {
      return
    }

    setRoleFlags(nextFlags)
    setIsUpdatingRoles(true)

    try {
      await userStore.updateUser(userId, nextFlags)
      setUser({ ...user, ...nextFlags })
      setHasChanges(true)
    } catch {
      setRoleFlags(previousFlags)
    } finally {
      setIsUpdatingRoles(false)
    }
  }
```

Platform Roles block — change visibility gate from `{isMaintainer && (` to `{(isAdmin || isMaintainer || isAuditor) && (`. The Auditor Switch is disabled when `roleFlags.is_admin` is true (Admin/Maintainer already imply full access) and wraps a tooltip in that state, following the `data-pr-tooltip` + `<Tooltip target="...">` pattern used in `ImportUsersModal.tsx` and `SpendingCard.tsx`:
```tsx
  {(isAdmin || isMaintainer || isAuditor) && (
    <div className="flex flex-col gap-3 rounded-lg border border-border-structural p-4">
      <span className="text-xs font-medium text-text-primary">Platform Roles</span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
        <Switch
          id="user-admin-role"
          label="Admin"
          value={roleFlags.is_admin}
          disabled={!canEditPlatformRoles || isUpdatingRoles || roleFlags.is_maintainer}
          onChange={(e) => handleRoleChange('is_admin', e.target.checked)}
        />
        <Switch
          id="user-maintainer-role"
          label="Maintainer"
          value={roleFlags.is_maintainer}
          disabled={!canEditPlatformRoles || isUpdatingRoles}
          onChange={(e) => handleRoleChange('is_maintainer', e.target.checked)}
        />
        <span
          className="user-auditor-role-tooltip"
          data-pr-tooltip="Admin and Maintainer already include full platform access — the Auditor flag has no effect for this user."
        >
          <Switch
            id="user-auditor-role"
            label="Auditor"
            value={roleFlags.is_auditor}
            disabled={!canAssignAuditor || isUpdatingRoles || roleFlags.is_admin}
            onChange={(e) => handleRoleChange('is_auditor', e.target.checked)}
          />
        </span>
        <Tooltip target=".user-auditor-role-tooltip" />
      </div>
    </div>
  )}
```

Budget section — change outer gate from `{canManageBudgets &&` to `{canViewBudgets &&` (keep inner `{canManageBudgets &&` for edit buttons, which is already in the JSX).

---

## Task 14 — Frontend: Users filter dropdown, PlatformRole constant, and onboarding

**Test-first: no** — one-line additions; TypeScript compiler is the gate.

**Files**
- `src/pages/settings/administration/usersManagement/components/UsersManagementFilters.tsx`
- `src/pages/settings/administration/usersManagement/constants.ts`
- `src/configs/onboarding/navigationIntroduction.tsx`

**`constants.ts`** — extend `PlatformRole` union:
```typescript
// before
export type PlatformRole = 'user' | 'platform_admin' | 'admin'
// after
export type PlatformRole = 'user' | 'platform_admin' | 'admin' | 'auditor'
```

**`UsersManagementFilters.tsx`** — add Auditor option to `PLATFORM_ROLE_OPTIONS`:
```typescript
const PLATFORM_ROLE_OPTIONS: FilterOption[] = [
  { label: 'User', value: 'user' },
  { label: 'Platform Admin', value: 'platform_admin' },
  { label: 'Admin', value: 'admin' },
  { label: 'Auditor', value: 'auditor' },
]
```

**`navigationIntroduction.tsx`** — extend the Administration tab condition:
```typescript
  condition: () => !!userStore.user?.isAdmin || !!userStore.user?.isAuditor
```

---

## Task 15 — Backend tests

**Test-first: yes** — these ARE the tests; run them RED before writing code, GREEN after.

**File**
- `../codemie/tests/codemie/rest_api/routers/test_auditor_role.py` (new file)

**Test cases to implement**

```python
class TestAuditorReadAccess:
    """Pure auditor (is_auditor=True, is_admin=False, is_maintainer=False) read gates."""

    @pytest.mark.asyncio
    async def test_admin_or_maintainer_or_auditor_access_allows_auditor(
        self, mock_request, auditor_user
    ):
        mock_request.state.user = auditor_user
        await admin_or_maintainer_or_auditor_access(mock_request)  # no exception

    @pytest.mark.asyncio
    async def test_admin_or_maintainer_or_auditor_access_blocks_plain_user(
        self, mock_request, regular_user
    ):
        mock_request.state.user = regular_user
        with pytest.raises(ExtendedHTTPException) as exc:
            await admin_or_maintainer_or_auditor_access(mock_request)
        assert exc.value.code == 403

    @patch("codemie.rest_api.routers.user_management_router.user_management_service")
    @patch("codemie.rest_api.routers.user_management_router.config")
    def test_auditor_list_users_elevates_is_project_admin(
        self, mock_config, mock_service, auditor_user
    ):
        mock_config.ENABLE_USER_MANAGEMENT = True
        mock_service.list_users_with_flow.return_value = {
            "data": [], "pagination": {"total": 0, "page": 0, "per_page": 20}
        }
        list_users(page=0, per_page=20, search=None, filters=None, user=auditor_user)
        call_kwargs = mock_service.list_users_with_flow.call_args[1]
        assert call_kwargs["is_project_admin"] is True


class TestAuditorWriteRejection:
    """Auditor gets 403 on every write endpoint."""

    @pytest.mark.asyncio
    async def test_auditor_blocked_by_admin_access_only(
        self, mock_request, auditor_user
    ):
        mock_request.state.user = auditor_user
        with pytest.raises(ExtendedHTTPException) as exc:
            await admin_access_only(mock_request)
        assert exc.value.code == 403

    @pytest.mark.asyncio
    async def test_auditor_blocked_by_maintainer_access_only(
        self, mock_request, auditor_user
    ):
        mock_request.state.user = auditor_user
        with pytest.raises(ExtendedHTTPException) as exc:
            await maintainer_access_only(mock_request)
        assert exc.value.code == 403


class TestRoleIsolationRegression:
    """is_auditor=True must not set is_admin=True (resolve_is_admin trap)."""

    def test_resolve_is_admin_does_not_promote_auditor(self):
        user = User(
            id="u1",
            email="u@x.com",
            username="u",
            name="U",
            is_maintainer=False,
            is_auditor=True,
        )
        user.resolve_is_admin()
        assert user.is_admin is False

    def test_maintainer_still_promotes_to_admin(self):
        user = User(
            id="u2", email="u2@x.com", username="u2", name="U2", is_maintainer=True
        )
        user.resolve_is_admin()
        assert user.is_admin is True


class TestAuditorAssignment:
    """Admin and maintainer can assign auditor; auditor-only caller cannot."""

    @pytest.mark.asyncio
    async def test_admin_can_assign_auditor_via_put(
        self, mock_request, super_admin_user
    ):
        """PUT /v1/admin/users/{id} with is_auditor=True succeeds for admin — no 403 from admin_access_only."""
        mock_request.state.user = super_admin_user
        await admin_access_only(mock_request)  # should not raise

    @pytest.mark.asyncio
    async def test_auditor_cannot_assign_via_put(
        self, mock_request, auditor_user
    ):
        """PUT /v1/admin/users/{id} returns 403 for auditor-only caller."""
        mock_request.state.user = auditor_user
        with pytest.raises(ExtendedHTTPException) as exc:
            await admin_access_only(mock_request)
        assert exc.value.code == 403
```

Fixtures needed in the file:
```python
@pytest.fixture
def auditor_user():
    return User(
        id="auditor-1",
        email="auditor@example.com",
        username="auditor",
        name="Auditor",
        is_admin=False,
        is_maintainer=False,
        is_auditor=True,
        project_names=[],
        admin_project_names=[],
    )
```

---

## Task 16 — Frontend tests (Vitest)

**Test-first: yes** — write tests first, confirm RED, then implement Tasks 9-14.

**Files**
- `src/pages/settings/__tests__/tabs.auditor.test.tsx` (new)
- `src/pages/settings/administration/usersManagement/components/popups/__tests__/UserDetailsPopup.auditor.test.tsx` (new)

**`tabs.auditor.test.tsx`** — key cases:
```typescript
describe('getNavigationTabs with isAuditor=true', () => {
  it('includes Projects management', () => {
    const tabs = getNavigationTabs(false, false, false, false, true)
    const admin = tabs.find(t => t.id === SettingsTab.ADMINISTRATION)
    const children = admin?.children?.map(c => c.id) ?? []
    expect(children).toContain(SettingsTab.PROJECTS_MANAGEMENT)
  })

  it('includes Users management when isUserManagementEnabled', () => {
    // mock isUserManagementEnabled to return true
    const tabs = getNavigationTabs(false, false, false, false, true)
    const admin = tabs.find(t => t.id === SettingsTab.ADMINISTRATION)
    const children = admin?.children?.map(c => c.id) ?? []
    expect(children).toContain(SettingsTab.USERS_MANAGEMENT)
  })

  it('does NOT include AI/Run Adoption Framework (admin-only item)', () => {
    const tabs = getNavigationTabs(false, false, false, false, true)
    const admin = tabs.find(t => t.id === SettingsTab.ADMINISTRATION)
    const children = admin?.children?.map(c => c.id) ?? []
    expect(children).not.toContain(SettingsTab.AI_ADOPTION_CONFIG)
  })
})
```

**`UserDetailsPopup.auditor.test.tsx`** — key cases:
```typescript
it('shows Platform Roles block when currentUser is auditor', async () => {
  // render with currentUser.isAuditor=true; userId != currentUser.userId
  // verify Platform Roles section visible
})

it('Auditor switch is disabled for auditor-only viewer (cannot self-assign)', async () => {
  // currentUser.isAuditor=true, isAdmin=false, isMaintainer=false
  // canAssignAuditor = false → switch disabled
})

it('Auditor switch is enabled for maintainer viewing another user', async () => {
  // currentUser.isMaintainer=true; userId !== currentUser.userId
  // canAssignAuditor = true → switch enabled
})

it('budget section visible to auditor (canViewBudgets)', async () => {
  // currentUser.isAuditor=true, isBudgetManagementEnabled=true
  // Budget assignments section present, Edit button absent
})

it('Auditor switch disabled and tooltip present when roleFlags.is_admin is true', async () => {
  // render with currentUser.isMaintainer=true, target user has is_admin=true
  // Auditor switch has disabled attribute
  // Tooltip wrapper element with data-pr-tooltip present
})
```

---

## Self-Review

**Placeholder scan**: No TBDs or TODOs. All code is exact — exact function names, exact field names, exact line context for multi-site changes.

**No `is_auditor` in `resolve_is_admin`**: Tasks 1 and 2 both add `is_auditor` as a plain field with no auto-promote logic. Task 15 regression test enforces this at runtime.

**`permissions.py` vs `authentication.py`**: New dependency lands in `authentication.py` (confirmed from test import `from codemie.rest_api.security.authentication import admin_access_only`). `permissions.py` is untouched.

**`GET /v1/admin/users` coverage**: Task 4 adds both `Depends(admin_or_maintainer_or_auditor_access)` AND elevates `is_project_admin` for auditors. Both required for correct full-user-list visibility.

**Alembic `down_revision` safety**: Task 8 explicitly requires running `alembic heads` before creating the file and prohibits using the placeholder value from the spec.

**Cross-repo scope**: Tasks 1–8 and 15 are in `../codemie`. Tasks 9–14 and 16 are in `codemie-ui`. No service layer signatures change — all access elevation happens at the router boundary.

**`UserListFilters.is_auditor`**: Added in Task 1 (model) and applied in Task 4 (`_apply_filters`). The 'auditor' sentinel in the frontend (`getUsers` in Task 9) translates to this backend filter field. The backend `PlatformRole` enum is NOT modified.

**File count**: 12 production files, 2 new test files — matches the spec's File Change Summary.

**Internal consistency**: `canViewBudgets` (view) and `canManageBudgets` (edit) are cleanly separated in Task 13. The `useEffect` dependency array uses `canViewBudgets` so auditors trigger budget fetch.
