# Technical Research

**Task**: auditor role permissions analytics settings budget users projects
**Generated**: 2026-08-12T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Add 'Auditor' Role to Allow Viewing Other Users' Workflow Runs (EPMCDME-10930). Story: As an auditor user, I want read-only visibility into the analytics page, project administration, user administration, and budget information so that I can review platform-wide usage and resource allocation without holding admin or maintainer privileges. Implementation: add an `is_auditor` boolean flag on user accounts (NOT a new PlatformRole enum value). Auditors get read-only access to: (1) Analytics - all sections (Insights, AI Adoption, Leaderboard, custom dashboards), cross-user filter same as admin; (2) Project management - view all projects+spending, no create/edit/delete; (3) User management - view all users+detail, no create/edit/deactivate; (4) Budget management - view all global+project budgets with spend, no create/edit/sync/assign. Role isolation: auditor+admin = admin unchanged; auditor alone cannot perform any writes. This is a cross-repo feature: frontend codemie-ui (current repo) and backend codemie at ../codemie relative to current dir.

---

## 2. Codebase Findings

### Existing Implementations — Frontend (`codemie-ui`)

- `src/types/entity/user.ts` — `User` interface has `isAdmin: boolean`, `isMaintainer: boolean`; `UserListItem` has `is_admin`, `is_maintainer`; `UserUpdatePayload` has optional role fields. **`isAuditor` / `is_auditor` do not exist yet** — greenfield addition required on all three interfaces.
- `src/store/user.ts` — `loadUser()` maps `apiUser.is_admin → isAdmin`, `apiUser.is_maintainer → isMaintainer`. Identical mapping in `getCurrentUser()` at line ~163. Both must be extended symmetrically to map `is_auditor → isAuditor`.
- `src/pages/settings/tabs.tsx` — `getNavigationTabs(isAdmin, awsSupported, isMaintainer, isProjectAdmin)` at line 76 is the single function computing which sidebar tabs are shown. **Three precise changes, no widening of the admin branch:**
  1. Add `isAuditor = false` parameter after `isProjectAdmin`.
  2. Widen the two tab-local guards: `budgetsManagementTab` from `isAdmin || isMaintainer` (line 90) to `isAdmin || isMaintainer || isAuditor`; `usersManagementTab` (currently inside `getEnterpriseAdminItems` at line 64, admin-only path) must become a standalone local const: `const usersManagementTab: LayoutTab[] = isUserMgmtEnabled && (isAdmin || isAuditor) ? [{ id: SettingsTab.USERS_MANAGEMENT, ... }] : []` — and removed from `getEnterpriseAdminItems`'s inline spread.
  3. Add an explicit auditor arm to `administrationChildren`. Current shape: `isAdmin ? [...full admin bundle] : [...regular-user branch]`. New shape: `isAdmin ? [...unchanged full admin bundle] : isAuditor ? [{ Projects Management }, ...usersManagementTab, ...budgetsManagementTab].sort(...)  : [...unchanged regular-user branch]`. **Do NOT add `activityEventsTab` to the auditor arm** — it stays `isMaintainer`-only per ticket's explicit out-of-scope item. **Do NOT add Teams Bot Integration or Cost Centers** — those are gated on `isProjectAdmin` / `isCostCentersFeatureEnabled` in the existing branches and are out of scope. `getEnterpriseAdminItems(...)` (AI/Run Adoption, Categories, MCPs, Providers) is called only in the admin branch and must remain there; widening its call site to auditors would violate the ticket's General AC.
- `src/pages/settings/components/SettingsLayout.tsx` — calls `getNavigationTabs(user?.isAdmin || user?.isMaintainer || false, ...)` at the call site. Add `user?.isAuditor ?? false` as the fifth argument once the parameter is added.
- `src/pages/analytics/AnalyticsPage.tsx` — `isAdoptionEnabled = isAdmin`; `isLeaderboardEnabled = isAdmin && isLeaderboardConfigEnabled`. Auditor must see all four analytics sections (Insights, AI Adoption, Leaderboard, custom dashboards). Both guards must be expanded to `isAdmin || isAuditor`.
- `src/pages/analytics/components/AnalyticsFilters.tsx` — `showMeCheckbox = isAdmin || isMaintainer`; `isAdminSearch = isAdmin && isUserManagementEnabled`. Cross-user filter must be available to auditors — `showMeCheckbox` and `isAdminSearch` need `|| isAuditor` (note: `isAdminSearch` only for read-only filter, not for write actions).
- `src/pages/settings/administration/BudgetsManagementPage.tsx` — `canViewBudgets = isAdmin || isMaintainer`; redirect away if false. Auditor must be added: `canViewBudgets = isAdmin || isMaintainer || isAuditor`. `canManageBudgets = isMaintainer` — unchanged.
- `src/pages/settings/administration/UsersManagementPage.tsx` — accessible only via sidebar (currently admin/maintainer gated at sidebar level). Bulk selection/actions gated on `isAdmin`. Auditor gets read-only view; bulk action controls must remain hidden.
- `src/pages/settings/administration/ProjectsManagementPage.tsx` / `ProjectsManagementFull.tsx` — `canManageProject = currentUser?.isAdmin`. Auditor has no manage rights. Create button and edit/delete controls must remain gated on `isAdmin` only.
- `src/pages/settings/administration/ProjectDetailsPage.tsx` — `canViewBudgets = isBudgetManagementEnabled && !isPersonalProject && (isAdmin || isMaintainer || isProjectAdmin)`. Must add `|| isAuditor`. `canManageProject` unchanged.
- `src/pages/settings/administration/usersManagement/components/popups/UserDetailsPopup.tsx` — **three changes required**:
  1. **Auditor Switch (new write control for admins and maintainers — supersedes the earlier maintainer-only resolution)**: `roleFlags` state is currently `{ is_admin: false, is_maintainer: false }` (line 58); `fetchUserDetails` populates it from `details.is_admin` / `details.is_maintainer` (lines 79–82); `handleRoleChange` key type is `'is_admin' | 'is_maintainer'` (line 141). Add `is_auditor: boolean` to all three. Add a **new, separate permission variable** (do NOT reuse `canEditPlatformRoles` — that variable governs only the existing Admin/Maintainer switches and must stay `isMaintainer`-only): `const canAssignAuditor = (isAdmin || isMaintainer) && currentUser?.userId !== userId`. Add a third Switch inside the Platform Roles block: `<Switch id="user-auditor-role" label="Auditor" value={roleFlags.is_auditor} disabled={!canAssignAuditor || isUpdatingRoles || roleFlags.is_admin} onChange={(e) => handleRoleChange('is_auditor', e.target.checked)} />`. The `roleFlags.is_admin` guard disables the Auditor toggle when the target user already has admin (which covers maintainer too, since the backend's `resolve_is_admin` auto-promotes `is_maintainer → is_admin`). **Do NOT force-clear `is_auditor` to false when the target becomes Admin/Maintainer** — the stored DB value stays as-is (it is inert per the ticket's role-isolation AC: "auditor+admin = admin unchanged"). Only the toggle interaction is disabled, not the underlying data. When the switch is disabled due to `roleFlags.is_admin`, wrap it in a `<span className="user-auditor-role-tooltip" data-pr-tooltip="Admin and Maintainer already include full platform access — the Auditor flag has no effect for this user.">` and add `<Tooltip target=".user-auditor-role-tooltip" />` alongside the other switches (following the `data-pr-tooltip` + `<Tooltip target="...">` pattern used in `ImportUsersModal.tsx`, `SpendingCard.tsx`, etc.; import `Tooltip` from `@/components/Tooltip`). Persisted via `userStore.updateUser(userId, nextFlags)` which includes `is_auditor` once `UserUpdatePayload` is extended.
  2. **Visibility gate change**: The Platform Roles block is currently gated `{isMaintainer && (` (line 215). Change to `{(isAdmin || isMaintainer || isAuditor) && (` — admins must see the block to be able to use the Auditor Switch that is now open to them; auditor viewers see the section in read-only form (their own `canAssignAuditor` evaluates to `false` when the self-edit guard triggers, and `roleFlags.is_admin` disables the toggle anyway for admin/maintainer targets). `isAuditor` must be destructured from `currentUser` alongside the existing `isAdmin`/`isMaintainer` at lines 62–63.
  3. **Type/store cascade**: `is_auditor` must be present on `UserListItem` (for `fetchUserDetails` to read `details.is_auditor`) and on `UserUpdatePayload` (for `userStore.updateUser` to accept it). These depend on the types and store changes already scoped in this analysis.
  4. **Budget assignments split — canViewBudgets vs canManageBudgets** *(Resolution of open question a — auditors must see per-user budget spend on the User detail panel)*: The `BudgetAssignmentsEditor` block and its fetch are currently both gated on `canManageBudgets = isBudgetManagementEnabled && isMaintainer`. Split into two separate constants: `const canViewBudgets = isBudgetManagementEnabled && (isAdmin || isMaintainer || isAuditor)` and `const canManageBudgets = isBudgetManagementEnabled && isMaintainer` (unchanged, write-only). Gate the `fetchUserDetails` budget call (`userStore.getUserBudgets(userId)`) on `canViewBudgets`. Gate the render of the "Budget assignments" block on `canViewBudgets`. Keep the Edit button and the entire edit flow (`handleStartBudgetEdit`, etc.) gated on `canManageBudgets` only — auditors see the read-only assignment list but not the Edit control.
- `src/pages/settings/administration/usersManagement/components/UsersManagementFilters.tsx` — **add Auditor filter option** *(Resolution of open question c)*. The `PLATFORM_ROLE_OPTIONS` array (line 35) currently has User / Project Admin / Super Admin using `ProjectRoleBE` enum values. Add `{ label: 'Auditor', value: 'auditor' }`. Since `is_auditor` is a separate boolean and not a `ProjectRoleBE` value, `'auditor'` must be treated as a UI-only sentinel: add `'auditor'` to the `PlatformRole` union type in `constants.ts` (currently `'user' | 'platform_admin' | 'admin'`); in `getUsers()` (`src/store/user.ts` line 422), detect `filters.platform_role === 'auditor'` and instead of sending `platform_role: 'auditor'` (invalid on the backend), emit `is_auditor: true` in `filtersJson` — skip the `platform_role` key entirely in this case. The `getUsers()` filter params type (line 82) also gains `is_auditor?: boolean | null`. On the backend, `GET /v1/admin/users` must accept `is_auditor: bool = None` as a new optional filter field in its `filters` JSON param, forwarding it to the service's query as `WHERE users.is_auditor = true`.
- `src/pages/settings/administration/ActivityEventsPage.tsx` — gated on `isMaintainer`. Auditor must NOT access this page (out of scope per ticket). No change here.
- `src/components/FeatureGuard.tsx` — gates only feature flags (e.g. `ENTERPRISE_EDITION`). No role gating at route level — per-role access lives in page components.
- `src/configs/onboarding/navigationIntroduction.tsx` — administration intro step: `condition: () => !!userStore.user?.isAdmin`. May need to include `|| userStore.user?.isAuditor` so auditors see the onboarding step for administration.
- `src/types/entity/project.ts` — `ProjectRoleBE` enum has `USER`, `PLATFORM_ADMIN`, `SUPER_ADMIN`. No `AUDITOR` added — consistent with spec (boolean flag).

### Existing Implementations — Backend (`../codemie`)

**Database model** — `src/codemie/rest_api/models/user_management.py`

- `UserDB` (line 38): `is_admin: bool = SQLField(default=False, index=True)` at line 51; `is_maintainer: bool = SQLField(default=False)` at line 52. `is_auditor` absent — add `is_auditor: bool = SQLField(default=False)` after line 52. No index needed (low cardinality flag, same as `is_maintainer`).
- `UserCreateRequest` (line 184): fields `is_admin: bool = False`, `is_maintainer: bool = False` at lines 191-192. Add `is_auditor: bool = False` after line 192.
- `UserUpdateRequest` (line 195): fields `is_admin: Optional[bool] = None` (line 218), `is_maintainer: Optional[bool] = None` (line 219). Add `is_auditor: Optional[bool] = None` after line 219. The `model_validator detect_project_limit_presence` (line 224) is unrelated — no change.
- `CodeMieUserDetail` (line 249): `is_admin: bool` (line 259), `is_maintainer: bool = False` (line 260). Add `is_auditor: bool = False` after line 260. This schema is returned by `GET /v1/admin/users/{user_id}` and `PUT /v1/admin/users/{user_id}`.
- `AdminUserListItem` (line 284): `is_admin: bool` (line 291), `is_maintainer: bool = False` (line 294). Add `is_auditor: bool = False` after line 294. This schema is the element type for `GET /v1/admin/users` list response.

**Core UserResponse** — `src/codemie/core/models.py`

- `UserResponse` (line 775): `is_admin: bool = False` (line 796), `is_maintainer: bool = False` (line 797). Add `is_auditor: bool = False` after line 797. This model is returned by `GET /v1/user` (the current-user endpoint consumed by `loadUser()` in the frontend store).

**Auth `User` model** — `src/codemie/rest_api/security/user.py`

- `User` (line 28): `is_admin: bool = Field(default=False)` (line 46), `is_maintainer: bool = Field(default=False)` (line 47). Add `is_auditor: bool = Field(default=False)` after line 47.
- **CRITICAL — `resolve_is_admin` validator (lines 52–70)**: Lines 67–68 read `if self.is_maintainer: self.is_admin = True`. This silently promotes any maintainer to admin. **DO NOT replicate this pattern for `is_auditor`.** Adding `if self.is_auditor: self.is_admin = True` (or any equivalent) would give auditors silent admin access and violate the ticket's "Role isolation" AC. `is_auditor` must stay completely independent — no mutation of `is_admin` or `is_maintainer` in this validator.
- `UserContext` (line 121): `is_admin: bool | None = None` (line 133), `is_maintainer: bool | None = None` (line 134). Add `is_auditor: bool | None = None` after line 134. Update `from_user()` (line 142) to include `is_auditor=user.is_auditor`.

**Permissions / access control** — `src/codemie/rest_api/security/authentication.py`

- `is_admin_or_maintainer()` (line 20): do NOT modify. Its name and semantics are correct — auditors are not admin-or-maintainer.
- `admin_access_only` (line 158): do NOT modify. Guards all user/project write endpoints; auditors must get 403 here.
- `admin_or_maintainer_access_only` (line 173): do NOT modify. Guards budget list reads — auditors need a separate new dependency rather than widening this one.
- `maintainer_access_only` (line 186): do NOT modify. Guards budget write and project-budget write endpoints.
- `project_admin_or_admin_user_detail_access` (line 198): grants access to `GET /v1/admin/users/{user_id}` for admins, maintainers, and project admins. Auditors must also be able to view any user's detail. Add an auditor fast-path before the `is_applications_admin` check (after line 227 `if user.is_admin_or_maintainer: return`): `if getattr(user, 'is_auditor', False): return`.
- **New dependency to add**: `async def admin_or_maintainer_or_auditor_access(request: Request)` — checks `request.state.user.is_admin_or_maintainer or getattr(request.state.user, 'is_auditor', False)`, raises 403 otherwise. Follow the exact same pattern as `admin_or_maintainer_access_only` (lines 173–183). Used on read-only endpoints opened to auditors.

**User management router** — `src/codemie/rest_api/routers/user_management_router.py`

- `GET ""` (list users, line 120): currently only requires `authenticate` (no explicit access gate); access control is handled in the service via `user.is_applications_admin`. A pure auditor (`is_applications_admin=False`) currently sees an empty or restricted list. Add `_: None = Depends(admin_or_maintainer_or_auditor_access)` to gate this endpoint explicitly and pass `is_auditor=getattr(user, 'is_auditor', False)` into `list_users_with_flow()` so the service can return all users.
- `GET /{user_id}` (line 165): guarded by `project_admin_or_admin_user_detail_access` (see above for auditor fast-path addition). No change to the route decorator.
- `PUT /{user_id}` (line 211): guarded by `admin_access_only` — **leave untouched**. Both admins and maintainers already pass `admin_access_only` today (maintainers because `resolve_is_admin` promotes `is_maintainer → is_admin`; plain admins directly). This means both admins and maintainers can assign/revoke `is_auditor` through the existing guard with no backend permission change — matching the ticket's answer that "Admin and Maintainer" can assign the role. Pure auditors get 403 on all write calls including toggling someone else's `is_auditor` flag. *(Resolution of open question b.)*
- `GET /{user_id}/projects` (line 283): guarded by `admin_access_only`. Auditors need to see project memberships. Change to `admin_or_maintainer_or_auditor_access`.
- `GET /{user_id}/knowledge-bases` (line 353): guarded by `admin_access_only`. Same — change to `admin_or_maintainer_or_auditor_access`.
- `GET /{user_id}/budgets` (line 429): guarded by `maintainer_access_only`. Change to `admin_or_maintainer_or_auditor_access`. *(Resolution of open question a — auditors must see per-user budget spend on the User detail panel; the `UserDetailsPopup` frontend split canViewBudgets / canManageBudgets is the corresponding frontend change.)*
- All write endpoints (`POST ""`, `DELETE /{user_id}`, `POST/PUT/DELETE /{user_id}/projects/*`, `POST/DELETE /{user_id}/knowledge-bases/*`, `PUT/POST /{user_id}/budgets`, etc.) stay guarded by `admin_access_only` or `maintainer_access_only` — no change.

**Project listing, detail, and spending visibility** — `src/codemie/rest_api/routers/projects.py`

Both `GET /v1/projects` (line 677) and `GET /v1/projects/{projectName}` (line 758) require only `Depends(authenticate)` — no role-level dependency. Role-scoping happens inside the router by threading `is_admin=user.is_admin` into the service/repository chain. A pure auditor (`is_admin=False`) falls into the non-admin branch in `application_repository.py` and sees only their own personal + shared-member projects — NOT all platform projects. This violates the ticket's Project management AC.

Five precise changes required, all in `projects.py`. `project_visibility_service.py` (which is imported at line 42 and delegates to the repository) and `application_repository.py` require NO signature changes — the fix is to compute the effective admin flag at the router boundary and pass it through the existing `is_admin: bool` parameter chain, consistent with the existing codebase style (user.is_admin already folds in is_maintainer via `resolve_is_admin`, so the pattern of using the pre-resolved flag rather than importing permissions.py helpers is correct here):

1. **`_list_projects_sync` call (line 733)**: Change `is_admin=user.is_admin` → `is_admin=user.is_admin or getattr(user, 'is_auditor', False)`. Propagates through `project_visibility_service.list_visible_projects_paginated` (line 76) → `application_repository.list_visible_projects_paginated` (`if is_admin:` at lines 382 and 401). Without this, auditors see only their own projects in the list.
2. **`_get_project_detail_sync` call (line 794)**: Same change — `is_admin=user.is_admin or getattr(user, 'is_auditor', False)`. Propagates through `project_visibility_service.get_visible_project_with_members` (line 153) → `application_repository.get_visible_project` (`if is_admin:` at line 475). Without this, auditors get a 404 on `/v1/projects/{projectName}` for any project they are not a member of.
3. **`_manageable_project_names` (line 568)**: Change `user.is_admin` → `user.is_admin or getattr(user, 'is_auditor', False)`. Controls which projects include spending summaries in the list view. Without this, auditors see no spending data in the project list even after fix 1 restores project visibility.
4. **`_can_see_project_spending` (lines 827–830)**: Same replacement. Controls whether `include_spending=true` attaches the spending summary to the project detail response. Without this, `GET /v1/projects/{projectName}?include_spending=true` silently skips spending for auditors.
5. **`get_project_spends` (lines 942–946)**: Add `or getattr(user, 'is_auditor', False)` to the `can_access` disjunction (currently `user.is_admin_or_maintainer or user.is_application_admin(...) or (is_personal and ...)`). Without this, `GET /v1/projects/{projectName}/spends` raises a simulated 404 for auditors.

**Budget router** — `src/codemie/rest_api/routers/budget_router.py`

- `GET /v1/budgets` (line 149): guarded by `admin_or_maintainer_access_only`. Change to `admin_or_maintainer_or_auditor_access`.
- `GET /v1/budgets/{budgetId}` (line 202): same.
- `POST ""`, `POST /sync`, `PUT`, `DELETE` stay `maintainer_access_only`.

**Project budget router** — `src/codemie/rest_api/routers/project_budget_router.py`

- `GET /v1/project-budgets` (line 278): no explicit Depends gate; internal guard at line 289: `if not user.is_admin_or_maintainer: ...`. Update to `if not (user.is_admin_or_maintainer or getattr(user, 'is_auditor', False)):`.
- `GET /v1/project-budgets/{budget_id}` (line 314): check if similar internal guard exists; apply same pattern.
- Write endpoints stay `maintainer_access_only`.

**Analytics router** — `src/codemie/rest_api/routers/analytics.py`

- Router uses `authenticate` at the router level (line 336) with per-endpoint `Depends(authenticate)`. No `admin_access_only` at route level.
All six internal guards resolved — confirmed read-only data visibility scoping, none touch write/admin actions:
- **Line 593** — `_authorize_admin_budget_view`: `if caller.is_admin: return` (else falls through to project-overlap check for scoped budget viewing). Change to `if caller.is_admin or getattr(caller, 'is_auditor', False): return`. Gates viewing another user's project-scoped budget data from within analytics — in scope per the ticket's budget-visibility AC.
- **Line 2406** — cross-user filter: `if not user.is_admin_or_maintainer:` restricts to own data. Change to `if not (user.is_admin_or_maintainer or getattr(user, 'is_auditor', False)):`.
- **Lines 2496, 2582, 2670** — CLI Insights pagination guards (inactive users, inactive workflows, inactive indexes respectively), identical pattern: `if not user.is_admin: accessible_projects = set(user.project_names or []) | set(user.admin_project_names or []); if request.project not in accessible_projects: raise 403`. Change each to `if not (user.is_admin or getattr(user, 'is_auditor', False)):`. These are already callable by regular users today (not admin-only), so the change only widens auditors to cross-project scope rather than unlocking a new admin-only feature — no risk of over-granting.
- **Line 3216** — `get_leaderboard_user_detail`: `if not user.is_admin: raise 403`. Change to `if not (user.is_admin or getattr(user, 'is_auditor', False)):`. Leaderboard per-user detail endpoint — directly in scope as Leaderboard is one of the ticket's four required Analytics sections.

**Alembic migration** — `src/external/alembic/versions/`

- Pattern to follow: `9b1c2d3e4f5a_add_users_is_maintainer.py` — `op.add_column("users", sa.Column("is_maintainer", sa.Boolean(), nullable=False, server_default=sa.text("false")))`.
- Current head: `t1u2v3w4x5y6` (file `t1u2v3w4x5y6_add_sort_indexes_to_assistants.py`). New migration must set `down_revision = "t1u2v3w4x5y6"`.
- Create: `<new_hex>_add_users_is_auditor.py` with `op.add_column("users", sa.Column("is_auditor", sa.Boolean(), nullable=False, server_default=sa.text("false")))` in `upgrade()` and `op.drop_column("users", "is_auditor")` in `downgrade()`. Generate `revision` hex with `alembic revision` or use a new random hex that does not collide with existing files.
- Do NOT add `index=True` to the migration column — `is_maintainer` has no index; `is_auditor` follows the same pattern.

### Architecture and Layers Affected

| Layer | Components |
|---|---|
| **Types** | `src/types/entity/user.ts` — `User`, `UserListItem`, `UserUpdatePayload` |
| **State / Store** | `src/store/user.ts` — `loadUser()`, `getCurrentUser()` mapping |
| **Settings nav** | `src/pages/settings/tabs.tsx`, `src/pages/settings/components/SettingsLayout.tsx` |
| **Analytics** | `src/pages/analytics/AnalyticsPage.tsx`, `src/pages/analytics/components/AnalyticsFilters.tsx` |
| **Administration pages** | `BudgetsManagementPage`, `UsersManagementPage`, `ProjectsManagementPage`, `ProjectsManagementFull`, `ProjectDetailsPage`, `UserDetailsPopup` (all under `src/pages/settings/administration/`) |
| **Onboarding** | `src/configs/onboarding/navigationIntroduction.tsx` |
| **Backend — DB model** | `../codemie/src/codemie/rest_api/models/user_management.py` — `UserDB`, `UserCreateRequest`, `UserUpdateRequest`, `CodeMieUserDetail`, `AdminUserListItem` |
| **Backend — Core model** | `../codemie/src/codemie/core/models.py` — `UserResponse` (returned by `GET /v1/user`) |
| **Backend — Auth model** | `../codemie/src/codemie/rest_api/security/user.py` — `User`, `UserContext` |
| **Backend — Permissions** | `../codemie/src/codemie/rest_api/security/authentication.py` — new `admin_or_maintainer_or_auditor_access` dependency; auditor fast-path in `project_admin_or_admin_user_detail_access` |
| **Backend — Routers** | `user_management_router.py`, `budget_router.py`, `project_budget_router.py`, `analytics.py` — targeted endpoint guard changes; `projects.py` — 5 is_admin flag fixes for project list/detail/spending visibility |
| **Backend — Migration** | `src/external/alembic/versions/<new_hex>_add_users_is_auditor.py` |

### Integration Points

- `src/store/user.ts` → `src/utils/api.ts` — custom fetch wrapper; `/v1/user` and `/v1/admin/users` endpoints must return `is_auditor` field from backend.
- `src/pages/settings/components/SettingsLayout.tsx` → `src/pages/settings/tabs.tsx` — sidebar tab factory is the single chokepoint for navigation visibility.
- `src/pages/analytics/AnalyticsPage.tsx` → `src/store/analytics.ts` — analytics data fetching unchanged; only visibility guards change.
- Feature flags `features:userManagement` and `features:budgetManagement` still gate tabs and columns; auditor check is additive on top of these flags.

### Patterns and Conventions

- **Boolean role flag pattern**: `isAdmin: boolean`, `isMaintainer: boolean` on `User`; `is_admin`, `is_maintainer` on `UserListItem`; mapping in `loadUser()` / `getCurrentUser()`. `isAuditor` / `is_auditor` follows the same pattern exactly.
- **Per-page permission constants**: every admin page computes `const isAdmin = user?.isAdmin ?? false; const isMaintainer = user?.isMaintainer ?? false; const canViewX = isAdmin || isMaintainer; const canManageX = isMaintainer;`. Auditor follows this naming: `canViewX = isAdmin || isMaintainer || isAuditor`.
- **No route-level role guards**: `FeatureGuard` handles feature flags only; per-role redirects live inside page components.
- **Valtio proxy store**: components subscribe via `useSnapshot(userStore)`. Store extension is trivial — add `isAuditor` to the proxy type and mapping.
- **`getNavigationTabs` signature extension**: add `isAuditor: boolean` parameter; replicate the `isMaintainer` branching pattern for auditor tabs.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/architecture.md` — confirms Component→Store→API pattern; documents `isAdmin`/`isMaintainer` as the user role fields; confirms `getNavigationTabs` as the sidebar tab factory. Directly relevant.
- `.ai-run/guides/patterns/state-management.md` — Valtio proxy store pattern; canonical template for store extension.
- `.ai-run/guides/testing/testing-patterns.md` — unit vs integration split, file naming, setup files, fixture patterns.
- `.ai-run/guides/architecture/routing-patterns.md` — covers `FeatureGuard` and route-level gating.

### Architectural Decisions

- Per-role access is enforced in page components, not at the router level.
- `isAdmin` and `isMaintainer` are the only two platform-level boolean flags on `User`; `isAuditor` follows this same boolean-flag pattern (not a new `ProjectRoleBE` enum value).
- `canViewX = isAdmin || isMaintainer` / `canManageX = isMaintainer` is the established permission variable naming convention.
- No ADR files found — decisions derived from code patterns.

### Derived Conventions

- `loadUser()` and `getCurrentUser()` are both mapping sites and must be updated symmetrically — missing one causes stale state.
- Integration test fixtures inline per file (no shared factory) — new `auditorUser` fixture needed per file that touches admin pages.
- `ActivityEventsPage` is explicitly `isMaintainer` gated and must remain that way; auditor sidebar must NOT include it.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/analytics/__tests__/AnalyticsPage.test.tsx` — covers `isCustomDashboard` tab logic; mocks `userStore.user.isAdmin: true`; does not test auditor analytics visibility.
- `src/store/__tests__/user.test.ts` — covers `getUserProjects`, `getAdminProjects`, `loadUser`; fixtures use `isAdmin: false / isMaintainer: false`; no auditor fixture.
- `src/pages/settings/administration/__tests__/AdminTablesPagination.integration.test.tsx` — integration; covers pagination for Users/Cost Centers/Activity Events/MCP/Budgets/Projects; defines `adminUser` and `maintainerUser` fixtures; no auditor fixture.
- `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` — unit; covers project detail rendering.
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.test.tsx` and `.editFlow.test.tsx` — unit; covers projects table and edit/delete flows.
- `src/utils/__tests__/settings.test.ts` — unit; covers `isAdmin`/`isMaintainer` logic.

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1; two workspace projects (`unit` / `integration`).
- **Unit**: `vi.mock('@/store', ...)` stubs `userStore.user`; `vi.mock('valtio', ...)` makes `useSnapshot` synchronous.
- **Integration**: `mockAPI('GET', 'v1/user', auditorUser)` via `requestRegistry`; `renderPage('/settings/administration/...')` with real Valtio.
- **Fixture shape**: `{ user_id, id, email, name, username, is_admin, is_maintainer, is_auditor, user_type, applications, projects }`.
- **Setup files**: `setupTests.unit.ts` (mocks api + valtio); `setupTests.tsx` (mocks useNavigate globally).

### Coverage Gaps

- No tests for auditor-role access anywhere — greenfield.
- No tests for `BudgetsManagementPage` `canViewBudgets` redirect logic.
- No tests for `AnalyticsFilters` cross-user filter visibility based on role.
- No tests for `getNavigationTabs` with auditor flag.
- No tests for `UsersManagementPage` read-only access (non-admin, non-maintainer).
- No tests for `loadUser()` / `getCurrentUser()` mapping `is_auditor`.
- No tests for `UserDetailsPopup` Platform Roles section visibility (auditor viewer sees section read-only; non-maintainer non-auditor does not see it).
- No tests for the Auditor Switch in `UserDetailsPopup` — both the maintainer-can-toggle case and the auditor-viewer-sees-disabled case.

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — backend base URL (`/api` locally); points to `../codemie` in dev.
- `VITE_ENV` — environment name.

### Configuration Files

- `vite.config.ts` — Vite build config (module federation host); no auditor-specific change.
- `src/constants/featureFlags.ts` — no auditor-specific feature flag needed per spec.
- `src/utils/featureFlags.ts` / `src/hooks/useFeatureFlags.ts` — `isUserManagementEnabled`, `isBudgetManagementEnabled` remain unchanged; auditor check is additive.

### Feature Flags and Deployment Concerns

- `features:enterpriseEdition` — gates analytics routes; auditor still requires enterprise edition.
- `features:userManagement` / `features:budgetManagement` — still gate tabs and columns; auditor cannot bypass feature flags.
- No new feature flag is needed for this task.
- Deployment: client-side permission change only in `codemie-ui`. Backend (`../codemie`) requires a schema migration to add `is_auditor` column and API serialization changes.

---

## 6. Risk Indicators

- **Cross-repo dependency**: backend `../codemie` must expose `is_auditor` in `/v1/user` (`UserResponse`) and `/v1/admin/users` (`AdminUserListItem`) API responses before any frontend change is testable end-to-end. Frontend can be developed against a mock but the integration is a hard dependency.
- **`resolve_is_admin` copy-paste trap** (`user.py:67–68`): the `if self.is_maintainer: self.is_admin = True` pattern is the single highest-risk line in the entire backend scope. Any copy-paste of this pattern for `is_auditor` silently grants admin-level write access to all auditors. `is_auditor` must be added to `User.__fields__` only — no mutation logic in `resolve_is_admin`.
- **Analytics cross-user guard breadth** (`analytics.py`): six `if not user.is_admin` / `if not user.is_admin_or_maintainer` checks (lines 593, 2406, 2496, 2582, 2670, 3216) required individual review — all six resolved. See the analytics router section above for per-line resolutions. All confirmed read-only data visibility scoping; none touch write/admin actions.
- **`project_admin_or_admin_user_detail_access` fast-path** (`authentication.py:198`): the new auditor branch must be inserted *before* the `is_applications_admin` project-scope check, not after. Inserting it in the wrong order causes auditors to go through the project-membership DB query unnecessarily.
- **Migration `down_revision` must point to current head `t1u2v3w4x5y6`**: the alembic chain is linear; a wrong `down_revision` silently creates a fork that fails on `alembic upgrade head`.
- **`GET /{user_id}/budgets` open question**: this endpoint is currently `maintainer_access_only`. The ticket explicitly lists it as unresolved. Without a decision, the frontend `UserDetailsPopup` cannot show budget spend for auditor-viewed users. This must be resolved before the spec is finalized.
- **Symmetric mapping gap**: `loadUser()` and `getCurrentUser()` are both mapping sites in `src/store/user.ts`. Forgetting to update one causes `isAuditor` to be `undefined` in certain contexts (e.g. on page refresh vs SSE push).
- **~15 frontend files touched**: analytics page, analytics filters, settings tabs, settings layout, budgets page, users management page, users management filters, constants, projects management page, projects management full, project details, user details popup, types, store, onboarding. Wide file surface raises merge-conflict risk on a busy branch (backend adds a further 9 files + 1 migration, but those are in a separate repo with separate PR).
- **`ActivityEventsPage` isolation**: sidebar must NOT add the activity events tab for auditors. `tabs.tsx` currently gates it on `isMaintainer`; a careless implementation could accidentally expose it to auditors.
- **`getNavigationTabs` signature breaking change**: adding `isAuditor` parameter requires all call sites to be updated. Currently only `SettingsLayout.tsx` calls it but a search for other callers is needed.
- **Write controls must remain hidden (except the Auditor Switch)**: `canManageX` guards are scattered across 6+ page components. Any missed guard allows an auditor to see a write-action button whose API call the backend should reject — a hidden-control miss is a UX defect. Note: the Auditor Switch in `UserDetailsPopup` IS a new write control, intentionally visible and enabled for admins and maintainers via the new `canAssignAuditor` guard; auditors see it disabled.
- **`canEditPlatformRoles` vs `canAssignAuditor` split**: `canEditPlatformRoles = isMaintainer && currentUser?.userId !== userId` remains the guard for the Admin and Maintainer switches. The new `canAssignAuditor = (isAdmin || isMaintainer) && currentUser?.userId !== userId` guards only the Auditor switch. These are intentionally separate — conflating them would either narrow auditor-assignment rights (back to maintainer-only) or inadvertently widen admin-switch rights to plain admins.
- **`onboarding/navigationIntroduction.tsx` condition**: auditor should see the admin onboarding step. If left as `isAdmin`-only the intro tour is broken for auditors.
- **Auditor filter sentinel value**: `platform_role === 'auditor'` must never be forwarded raw to the backend — it is an invalid `ProjectRoleBE` value. The `getUsers()` special-case (emit `is_auditor: true` in `filtersJson`, omit `platform_role`) is the single translation point; missing it causes a backend 422 or silently empty filter.
- **Open questions — all resolved**: *(a) per-user budget spend: auditors see it; `UserDetailsPopup` splits `canViewBudgets` / `canManageBudgets`; backend `GET /{user_id}/budgets` changes to `admin_or_maintainer_or_auditor_access`.* *(b) who assigns `is_auditor`: admins AND maintainers; new `canAssignAuditor` variable on frontend; `PUT /{user_id}` unchanged on backend.* *(c) auditor label: no visible label added; "Auditor" filter option added to `UsersManagementFilters.tsx` using a sentinel value mapped to `is_auditor=true` at the store boundary; backend `GET /v1/admin/users` gains `is_auditor` filter support.)*
- **No shared user fixture factory**: each test file defines its own inline fixture; adding `is_auditor: false` as a baseline field must be done per-file to avoid type errors once the `UserListItem` type is updated.

---

## 7. Summary for Complexity Assessment

This feature adds a new boolean role flag `is_auditor` to the frontend user model and propagates it across the permission-check logic in approximately 15 frontend files spanning the types layer, Valtio store, settings navigation factory, analytics page, five administration page components, `UsersManagementFilters.tsx` (new Auditor filter option with sentinel-to-`is_auditor` mapping), and `constants.ts` (PlatformRole union type extension). The implementation pattern is well-established — it directly mirrors how `isAdmin` and `isMaintainer` were added — so there is low technical novelty on the frontend. The main execution risk is breadth: every administration page independently computes `canViewX = isAdmin || isMaintainer` and must be updated to include `|| isAuditor`, with a parallel requirement to leave all `canManageX` guards unchanged. A missed guard produces a visible write-action control whose backend rejection would surface as a runtime error rather than a compile-time failure. One exception: `UserDetailsPopup` gains a genuine new write control — a third Auditor Switch in the Platform Roles section, enabling admins and maintainers to assign or revoke the auditor flag (via the new `canAssignAuditor = (isAdmin || isMaintainer) && currentUser?.userId !== userId` guard, which is intentionally separate from `canEditPlatformRoles`, the `isMaintainer`-only guard that continues to govern the existing Admin/Maintainer switches). This requires widening the Platform Roles visibility gate from `{isMaintainer && ...}` to `{(isAdmin || isMaintainer || isAuditor) && ...}` so plain admins can see and use the new switch, and auditor viewers see the section in read-only form.

Test coverage for the permission-gate logic is sparse. Existing tests stub `isAdmin: true` but none test a read-only role that can view but not write. The required new tests cover: `loadUser()` mapping, `getNavigationTabs` with auditor flag, `BudgetsManagementPage` redirect guards, `AnalyticsFilters` cross-user filter visibility, and at minimum one integration-level test confirming an auditor user can render the administration pages without write controls. The integration test fixture layer (`AdminTablesPagination.integration.test.tsx`) has established patterns (`auditorUser` fixture + `requestRegistry` override) that make new tests straightforward to write.

The backend scope is larger than a simple schema addition. Seven files in `../codemie` require changes: `UserDB` model + 4 Pydantic schemas (1 file), `UserResponse` (1 file), auth `User` + `UserContext` (1 file), authentication module (1 file, new dependency + auditor fast-path in existing dependency), and 5 router files with targeted guard changes (`user_management_router.py`, `budget_router.py`, `project_budget_router.py`, `analytics.py`, and `projects.py` with 5 is_admin→effective_admin fixes covering project list/detail/spending visibility). One Alembic migration is needed. The single highest-risk line is `user.py:67–68` — the `if self.is_maintainer: self.is_admin = True` auto-promote pattern. Any copy-paste of this for `is_auditor` silently grants full write access to auditors, violating the ticket's role-isolation acceptance criterion. All six internal analytics.py guards have been individually reviewed and resolved — see the analytics router section for per-line details. Each update is a read-only data visibility widening; none touch write or admin actions.

All three open questions are now resolved. Question (b) — who can assign `is_auditor` — is admins AND maintainers (superseding the earlier maintainer-only note): a new `canAssignAuditor = (isAdmin || isMaintainer) && currentUser?.userId !== userId` variable governs the Auditor Switch; `canEditPlatformRoles` stays `isMaintainer`-only and continues to govern only the Admin/Maintainer switches; the Platform Roles block's visibility gate widens to `{(isAdmin || isMaintainer || isAuditor) && ...}` so plain admins can see and use the block; no backend change is needed (`PUT /{user_id}` already passes `admin_access_only` for both admins and maintainers). Question (a) — per-user budget spend — is resolved: auditors see it; `UserDetailsPopup` splits `canManageBudgets` (write, maintainer-only) from `canViewBudgets` (read, admin/maintainer/auditor); backend `GET /{user_id}/budgets` changes to `admin_or_maintainer_or_auditor_access`. Question (c) — auditor label — resolved as: no visible label added to the user list or profile, but an "Auditor" option is added to the `platform_role` filter dropdown in `UsersManagementFilters.tsx`, using a UI sentinel value `'auditor'` that the store maps to `is_auditor: true` in the API call rather than forwarding an invalid `platform_role` enum value; the backend `GET /v1/admin/users` gains an `is_auditor` optional filter field.
