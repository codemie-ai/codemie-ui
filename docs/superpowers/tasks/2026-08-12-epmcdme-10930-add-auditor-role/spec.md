# Spec: Add Auditor Role (EPMCDME-10930)

**Feature**: Add `is_auditor` boolean flag granting read-only platform-wide visibility into Analytics, Projects, Users, and Budgets without admin/maintainer write privileges.  
**Repos**: `codemie-ui` (frontend) and `codemie` (backend, `../codemie`)  
**Branch**: `EPMCDME-10930_add-auditor-role`

---

## 1. Overview

Add `is_auditor: bool` as a peer boolean alongside `isAdmin`/`isMaintainer` on user accounts. Auditors get read-only access to four areas:

1. **Analytics** — all sections (Insights, AI Adoption, Leaderboard, custom dashboards) with cross-user filter enabled.
2. **Projects** — view all platform projects, detail, and spending; no create/edit/delete.
3. **Users** — view full user list and per-user detail (including budget spend); no create/edit/deactivate.
4. **Budgets** — view global and project budgets with spend data; no create/edit/sync/assign.

**Role isolation**: `auditor + admin = admin` (unchanged). Auditor alone cannot perform any write action.  
**Not a new PlatformRole enum value** — boolean flag only, consistent with `isAdmin`/`isMaintainer` pattern.  
**Who can assign**: admins and maintainers (via a new `canAssignAuditor` UI variable; backend `PUT /v1/admin/users/{id}` is already accessible to both via `admin_access_only` + `resolve_is_admin` auto-promotion; no backend permission change needed for assignment).  
**Out of scope**: Activity Events page (stays `isMaintainer`-only), Teams Bot Integration, Cost Centers, enterprise admin items (AI/Run Adoption, Categories, MCPs, Providers).

---

## 2. Data Model

### 2.1 Backend: new `is_auditor` field

Add `is_auditor: bool = False` (no index) to:

| File | Model | After line |
|---|---|---|
| `rest_api/models/user_management.py` | `UserDB` | after `is_maintainer` SQLField |
| `rest_api/models/user_management.py` | `UserCreateRequest` | after `is_maintainer: bool = False` |
| `rest_api/models/user_management.py` | `UserUpdateRequest` | after `is_maintainer: Optional[bool] = None` |
| `rest_api/models/user_management.py` | `CodeMieUserDetail` | after `is_maintainer: bool = False` |
| `rest_api/models/user_management.py` | `AdminUserListItem` | after `is_maintainer: bool = False` |
| `core/models.py` | `UserResponse` | after `is_maintainer: bool = False` |
| `rest_api/security/user.py` | `User` | after `is_maintainer: bool = Field(default=False)` |
| `rest_api/security/user.py` | `UserContext` | after `is_maintainer: bool \| None = None`; include `is_auditor=user.is_auditor` in `from_user()` |

**Critical**: do NOT touch `resolve_is_admin` (lines 52–70 of `user.py`). The `if self.is_maintainer: self.is_admin = True` auto-promote must never be replicated for `is_auditor`. `is_auditor` is added to `User.__fields__` only — no mutation logic.

### 2.2 Alembic migration

New file: `src/external/alembic/versions/<new_hex>_add_users_is_auditor.py`

```python
down_revision = "t1u2v3w4x5y6"  # current head

def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_auditor", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

def downgrade() -> None:
    op.drop_column("users", "is_auditor")
```

No index. Follows the exact pattern of `9b1c2d3e4f5a_add_users_is_maintainer.py`.

**Important**: verify `t1u2v3w4x5y6` is still the current Alembic head via `alembic heads` immediately before creating the migration file — do not assume this value is still current at implementation time. A wrong `down_revision` silently creates a branch fork that fails on `alembic upgrade head`.

### 2.3 Frontend: type extensions

`src/types/entity/user.ts`:
- `User` interface: add `isAuditor: boolean`
- `UserListItem` interface: add `is_auditor: boolean`
- `UserUpdatePayload` interface: add `is_auditor?: boolean`

`src/store/user.ts`:
- `loadUser()`: add `isAuditor: apiUser.is_auditor` to the mapping
- `getCurrentUser()`: same mapping (both sites must be updated symmetrically)
- Filter params type (line 82): add `is_auditor?: boolean | null`
- `getUsers()`: detect `filters.platform_role === 'auditor'` and emit `is_auditor: true` in `filtersJson`, omitting `platform_role` entirely — `'auditor'` is a UI sentinel, not a valid `ProjectRoleBE` value

---

## 3. Backend Permissions

### 3.1 New Depends function (`authentication.py`)

```python
async def admin_or_maintainer_or_auditor_access(request: Request) -> None:
    user = request.state.user
    if user.is_admin_or_maintainer or getattr(user, "is_auditor", False):
        return
    raise HTTPException(status_code=403, detail="Forbidden")
```

Modelled exactly on `admin_or_maintainer_access_only` (lines 173–183).

### 3.2 Auditor fast-path in existing dependency (`authentication.py`)

In `project_admin_or_admin_user_detail_access` (line 198), insert before the `is_applications_admin` DB query:

```python
if getattr(user, "is_auditor", False):
    return
```

This must be inserted **before** the `is_applications_admin` check to avoid an unnecessary DB query for auditors.

### 3.3 Route guard changes

**Routes gaining `Depends(admin_or_maintainer_or_auditor_access)` (replacing or adding a Depends guard):**

| Router file | Route | Change |
|---|---|---|
| `user_management_router.py` | `GET ""` (list users) | Add new Depends (currently only `authenticate`); also pass `is_auditor=getattr(user, 'is_auditor', False)` into `list_users_with_flow()` |
| `user_management_router.py` | `GET /{user_id}/projects` | Replace `admin_access_only` |
| `user_management_router.py` | `GET /{user_id}/knowledge-bases` | Replace `admin_access_only` |
| `user_management_router.py` | `GET /{user_id}/budgets` | Replace `maintainer_access_only` |
| `budget_router.py` | `GET /v1/budgets` | Replace `admin_or_maintainer_access_only` |
| `budget_router.py` | `GET /v1/budgets/{budgetId}` | Replace `admin_or_maintainer_access_only` |

**Routes using inline guard edits only (no new Depends):**

`project_budget_router.py` — two read endpoints have inline `if not user.is_admin_or_maintainer:` checks in the function body. Update to:
```python
if not (user.is_admin_or_maintainer or getattr(user, "is_auditor", False)):
```

`analytics.py` — six inline guards:

| Line | Current guard | Change |
|---|---|---|
| 593 | `if caller.is_admin:` | `if caller.is_admin or getattr(caller, "is_auditor", False):` |
| 2406 | `if not user.is_admin_or_maintainer:` | `if not (user.is_admin_or_maintainer or getattr(user, "is_auditor", False)):` |
| 2496 | `if not user.is_admin:` | `if not (user.is_admin or getattr(user, "is_auditor", False)):` |
| 2582 | `if not user.is_admin:` | same |
| 2670 | `if not user.is_admin:` | same |
| 3216 | `if not user.is_admin:` | same |

`projects.py` — five router-boundary calls:

| Line | Change |
|---|---|
| 568 | `user.is_admin` → `user.is_admin or getattr(user, 'is_auditor', False)` |
| 733 | `is_admin=user.is_admin` → `is_admin=user.is_admin or getattr(user, 'is_auditor', False)` |
| 794 | same |
| 827–830 | same |
| 942–946 | add `or getattr(user, 'is_auditor', False)` to the `can_access` disjunction |

**All write endpoints remain unchanged.** `PUT /v1/admin/users/{id}` stays `admin_access_only` — admins and maintainers already satisfy it via `resolve_is_admin` auto-promotion; pure auditors get 403.

---

## 4. Frontend Navigation and Access Gates

### 4.1 Settings navigation (`tabs.tsx` + `SettingsLayout.tsx`)

`getNavigationTabs(isAdmin, awsSupported, isMaintainer, isProjectAdmin, isAuditor = false)`:

- Add `isAuditor` as fifth parameter.
- `usersManagementTab` becomes a standalone local const (removed from `getEnterpriseAdminItems`'s inline spread): visible when `isUserMgmtEnabled && (isAdmin || isAuditor)`.
- `budgetsManagementTab`: widen guard from `isAdmin || isMaintainer` to `isAdmin || isMaintainer || isAuditor`.
- `administrationChildren` gains an explicit auditor arm:
  ```
  isAdmin ? [...unchanged full admin bundle]
  : isAuditor ? [Projects Management, ...usersManagementTab, ...budgetsManagementTab].sort(...)
  : [...unchanged regular-user branch]
  ```
- `getEnterpriseAdminItems(...)` (AI/Run Adoption, Categories, MCPs, Providers) stays in the admin arm only.
- Activity Events tab remains `isMaintainer`-only; not added to auditor arm.

`SettingsLayout.tsx`: add `user?.isAuditor ?? false` as the fifth argument to `getNavigationTabs(...)`.

### 4.2 Administration pages

The following files require guard changes. `UsersManagementPage.tsx`, `ProjectsManagementPage.tsx`, and `ProjectsManagementFull.tsx` need no code changes — write controls are already gated on `isAdmin` (which auditors don't satisfy), so they render read-only for auditors automatically once the sidebar exposes them.

| File | Change |
|---|---|
| `BudgetsManagementPage.tsx` | `canViewBudgets`: add `\|\| isAuditor` |
| `ProjectDetailsPage.tsx` | `canViewBudgets`: add `\|\| isAuditor` |
| `AnalyticsPage.tsx` | `isAdoptionEnabled`, `isLeaderboardEnabled`: add `\|\| isAuditor` |
| `AnalyticsFilters.tsx` | `showMeCheckbox`, `isAdminSearch`: add `\|\| isAuditor` |

### 4.3 UserDetailsPopup — four changes

**1. Auditor Switch (new write control):**

- Add `is_auditor: boolean` to `roleFlags` state, `fetchUserDetails` population, and `handleRoleChange` key union.
- New permission variable (separate from `canEditPlatformRoles`):
  ```ts
  const canAssignAuditor = (isAdmin || isMaintainer) && currentUser?.userId !== userId;
  ```
- New Switch in the Platform Roles block:
  ```tsx
  <Switch
    id="user-auditor-role"
    label="Auditor"
    value={roleFlags.is_auditor}
    disabled={!canAssignAuditor || isUpdatingRoles || roleFlags.is_admin}
    onChange={(e) => handleRoleChange('is_auditor', e.target.checked)}
  />
  ```
- When `roleFlags.is_admin` is true (switch disabled), wrap in:
  ```tsx
  <span className="user-auditor-role-tooltip"
        data-pr-tooltip="Admin and Maintainer already include full platform access — the Auditor flag has no effect for this user.">
    <Switch ... />
  </span>
  <Tooltip target=".user-auditor-role-tooltip" />
  ```
  Follow the `data-pr-tooltip` + `<Tooltip target="...">` pattern used in `ImportUsersModal.tsx`, `SpendingCard.tsx`.
- Do NOT force-clear `is_auditor` when the target becomes Admin/Maintainer — DB value stays as-is; the toggle is merely disabled.

**2. Visibility gate change:**

`{isMaintainer && (` → `{(isAdmin || isMaintainer || isAuditor) && (`

Destructure `isAuditor` from `currentUser` at lines 62–63 alongside existing `isAdmin`/`isMaintainer`.

**3. Type/store cascade:**

`is_auditor` must be present on `UserListItem` and `UserUpdatePayload` (covered in Section 2.3).

**4. Budget split (`canViewBudgets` vs `canManageBudgets`):**

```ts
const canViewBudgets = isBudgetManagementEnabled && (isAdmin || isMaintainer || isAuditor);
const canManageBudgets = isBudgetManagementEnabled && isMaintainer;
```

- Gate the `fetchUserDetails` budget fetch (`userStore.getUserBudgets(userId)`) on `canViewBudgets`.
- Gate the "Budget assignments" render block on `canViewBudgets`.
- Keep Edit button and edit flow gated on `canManageBudgets` only.

### 4.4 Users Management filter and type

`UsersManagementFilters.tsx` — `PLATFORM_ROLE_OPTIONS`:
```ts
{ label: 'Auditor', value: 'auditor' }
```

`constants.ts` — `PlatformRole` union:
```ts
type PlatformRole = 'user' | 'platform_admin' | 'admin' | 'auditor';
```

`'auditor'` is a UI sentinel — never forwarded raw to the backend (see Section 2.3 `getUsers()` mapping).

### 4.5 Onboarding

`src/configs/onboarding/navigationIntroduction.tsx`:
```ts
condition: () => !!userStore.user?.isAdmin || !!userStore.user?.isAuditor
```

---

## 5. Testing

### 5.1 Frontend (Vitest)

| Test file | Type | Coverage |
|---|---|---|
| `src/store/__tests__/user.test.ts` | unit | `loadUser()` and `getCurrentUser()` map `is_auditor → isAuditor`; `getUsers()` maps `platform_role === 'auditor'` to `is_auditor: true` without forwarding `platform_role` |
| `src/pages/settings/__tests__/tabs.test.ts` | unit | `getNavigationTabs` with `isAuditor=true`: Projects/Users/Budgets visible; Activity Events, enterprise admin items absent |
| `src/pages/settings/administration/usersManagement/components/popups/__tests__/UserDetailsPopup.test.tsx` | unit | (a) auditor viewer sees Platform Roles section, all switches disabled; (b) admin can toggle Auditor Switch; (c) tooltip appears when `roleFlags.is_admin=true` |
| `src/pages/settings/administration/__tests__/BudgetsManagementPage.test.tsx` | unit | auditor is not redirected away |
| `src/pages/analytics/components/__tests__/AnalyticsFilters.test.tsx` | unit | `showMeCheckbox` and `isAdminSearch` visible for auditor |
| `src/pages/settings/administration/__tests__/AdminTablesPagination.integration.test.tsx` | integration | `auditorUser` fixture (`is_auditor: true, is_admin: false, is_maintainer: false`); auditor renders Users/Projects/Budgets pages; bulk-action controls absent |

### 5.2 Backend (pytest)

**Read access (200)** — pure auditor fixture (`is_auditor=True, is_admin=False, is_maintainer=False`) returns 200 with full cross-user data on:
- `GET /v1/admin/users` — full user list (not empty/restricted)
- `GET /v1/admin/users/{id}`
- `GET /v1/admin/users/{id}/projects`
- `GET /v1/admin/users/{id}/knowledge-bases`
- `GET /v1/admin/users/{id}/budgets`
- `GET /v1/budgets`
- `GET /v1/budgets/{id}`
- `GET /v1/project-budgets`
- `GET /v1/projects` (all platform projects visible)
- `GET /v1/projects/{name}?include_spending=true` (spending data included)
- `GET /v1/projects/{name}/spends`
- Each of the six analytics endpoints behind the updated guards (lines 593, 2406, 2496, 2582, 2670, 3216)

**Write rejection (403)** — same pure auditor fixture gets 403 on:
- `PUT /v1/admin/users/{id}`, `POST /v1/admin/users`, `DELETE /v1/admin/users/{id}`
- `POST /v1/budgets`, `PUT /v1/budgets/{id}`, `DELETE /v1/budgets/{id}`, `POST /v1/budgets/sync`
- `POST /v1/project-budgets`, `PUT /v1/project-budgets/{id}`, `DELETE /v1/project-budgets/{id}`
- Any project create/update/delete endpoint

**Role-isolation regression** — assert that a `User` instance with `is_auditor=True` does not have `is_admin=True` after `resolve_is_admin` runs. Guards against accidental future copy-paste of the `if self.is_maintainer: self.is_admin = True` pattern.

**Auditor assignment** — `PUT /v1/admin/users/{id}` with `{"is_auditor": true}`:
- Returns 200 when caller is a plain admin (`is_admin=True, is_maintainer=False`)
- Returns 200 when caller is a maintainer (`is_maintainer=True`)
- Returns 403 when caller is auditor-only (`is_auditor=True, is_admin=False, is_maintainer=False`)

---

## 6. File Change Summary

### Frontend (`codemie-ui`)

**Production files modified (12):**

1. `src/types/entity/user.ts`
2. `src/store/user.ts`
3. `src/pages/settings/tabs.tsx`
4. `src/pages/settings/components/SettingsLayout.tsx`
5. `src/pages/analytics/AnalyticsPage.tsx`
6. `src/pages/analytics/components/AnalyticsFilters.tsx`
7. `src/pages/settings/administration/BudgetsManagementPage.tsx`
8. `src/pages/settings/administration/ProjectDetailsPage.tsx`
9. `src/pages/settings/administration/usersManagement/components/popups/UserDetailsPopup.tsx`
10. `src/pages/settings/administration/usersManagement/components/UsersManagementFilters.tsx`
11. `src/pages/settings/administration/usersManagement/constants.ts`
12. `src/configs/onboarding/navigationIntroduction.tsx`

**Test files new/extended (6):** `user.test.ts`, `tabs.test.ts`, `UserDetailsPopup.test.tsx`, `BudgetsManagementPage.test.tsx`, `AnalyticsFilters.test.tsx`, `AdminTablesPagination.integration.test.tsx`

**Inspect only, no code changes:** `UsersManagementPage.tsx`, `ProjectsManagementPage.tsx`, `ProjectsManagementFull.tsx`

### Backend (`../codemie`) — 9 files + 1 migration

1. `src/codemie/rest_api/models/user_management.py`
2. `src/codemie/core/models.py`
3. `src/codemie/rest_api/security/user.py`
4. `src/codemie/rest_api/security/authentication.py`
5. `src/codemie/rest_api/routers/user_management_router.py`
6. `src/codemie/rest_api/routers/budget_router.py`
7. `src/codemie/rest_api/routers/project_budget_router.py`
8. `src/codemie/rest_api/routers/analytics.py`
9. `src/codemie/rest_api/routers/projects.py`
10. `src/external/alembic/versions/<new_hex>_add_users_is_auditor.py` (new)

---

## 7. Constraints and Non-Goals

- `ActivityEventsPage` remains `isMaintainer`-only — no auditor access.
- `getEnterpriseAdminItems` (AI/Run Adoption, Categories, MCPs, Providers) remains admin-only.
- No new `ProjectRoleBE` enum value — boolean flag only.
- No new feature flag needed — auditor check is additive on top of existing `features:userManagement` / `features:budgetManagement` flags.
- `UsersManagementPage` bulk selection/action controls stay `isAdmin`-gated.
- `canManageBudgets` remains `isMaintainer`-only throughout.
- `canEditPlatformRoles` (Admin/Maintainer switches) remains `isMaintainer`-only; only the new `canAssignAuditor` is widened to include admins.
