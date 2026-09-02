# Technical Research

**Task**: settings administration users-management modal
**Generated**: 2026-08-29T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Add a "Create user" button on the CodeMie UI Users Management page (src/pages/settings/administration/UsersManagementPage.tsx), visible only to superadmin (isAdmin) and maintainer (isMaintainer) roles — not auditors. Clicking it opens a modal to create a brand-new local user account (email, username, password, name, and role checkboxes: is_admin, is_maintainer, is_auditor), which calls the existing backend endpoint POST /v1/admin/users. This is frontend-only work — the backend endpoint (user_management_router.py, EPM-CDME "codemie" repo) and its auth dependency (admin_access_only, which already permits is_admin_or_maintainer) already support this. There is currently no frontend call to this endpoint anywhere in src/store/user.ts (which only has GET/PUT/budget/project sub-resource calls for existing users). Jira ticket: EPMCDME-14535.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/settings/administration/UsersManagementPage.tsx` — the target page. Top bar (lines ~365-380) renders `UsersManagementFilters` and, only `{isAdmin && ...}`, `UsersManagementBulkActions`. This is the existing slot pattern for role-gated controls next to the filter bar; a "Create user" button would sit here.
- `src/store/user.ts` (`userStore`, a Valtio proxy) — confirmed **no** `createUser`/`create` method exists. Existing admin endpoints on this store: `getUsers` (`GET v1/admin/users`), `getUserById` (`GET v1/admin/users/{id}`), `updateUser` (`PUT v1/admin/users/{id}`), `getUserBudgets`/`updateUserBudgets`, `addUserProjectAccess`/`updateUserProjectAccess`/`removeUserProjectAccess`, bulk variants, `resetUserBudget`. All follow the same shape: `api.<verb>(path, body?, { skipErrorHandling: true })`, `.then(r => r.json())`, success `toaster.info(...)`, `catch` logs + `toaster.error(...)` + rethrow.
- `src/pages/settings/administration/usersManagement/components/popups/UserDetailsPopup.tsx` — existing modal that edits an existing user's platform roles (`is_admin`, `is_maintainer`, `is_auditor`) via `Switch` components, gated by `canEditPlatformRoles = isMaintainer && currentUser?.userId !== userId` and `canAssignAuditor = (isAdmin || isMaintainer) && ...`. Contains the closest existing role-interdependency logic (checking `is_maintainer` forces `is_admin` true; setting admin/maintainer clears `is_auditor`), useful precedent for a create-form's role checkboxes.
- `src/pages/settings/administration/usersManagement/components/popups/AddProjectPopup.tsx` — simplest existing `Popup`-based create-style modal (single-field, no react-hook-form).
- `src/pages/settings/administration/usersManagement/components/bulkPopups/ChangeRolePopup.tsx` — best-fit template: `Popup` + `react-hook-form` (`useForm`) + `yupResolver` + `Controller` fields, calls a `userStore` method in `onSubmit`, `console.error` on failure (no rethrow after catch here).
- `src/pages/settings/administration/usersManagement/components/UsersManagementBulkActions.tsx` — shows the pattern for owning several popups' open/close state (`activePopup` union type) beside a page-level action.
- `src/types/entity/user.ts` — `UserListItem`, `UserUpdatePayload` (`is_admin?`, `is_maintainer?`, `is_auditor?`, `user_type?`, `budget_assignments?`) exist; there is **no** `UserCreatePayload`/`UserCreateRequest` type defined anywhere in the frontend.
- `src/components/form/Checkbox.tsx` — a `Checkbox` component exists (`label`, `checked`, `onChange(checked: boolean)`, `error`), but the existing role-flag UI in `UserDetailsPopup.tsx` uses `Switch` (`src/components/form/Switch`), not `Checkbox`, for boolean role toggles — two components exist for the same conceptual control.
- `src/components/form/Input/Input.tsx` — generic input; grep for `type="password"` usage across the codebase only match is inside `Input.tsx` itself (its type prop plumbing) — no other component in `src/pages` or `src/components/form` currently renders a password field, so there is no existing "password input" pattern to imitate beyond passing `type="password"` to `Input`.

### Architecture and Layers Affected
- **Page layer**: `UsersManagementPage.tsx` — button placement and role gating (`isAdmin`, `isMaintainer` from `userStore.user` via `useSnapshot`).
- **Component layer**: a new modal component under `src/pages/settings/administration/usersManagement/components/popups/` (sibling to `UserDetailsPopup.tsx`, `AddProjectPopup.tsx`, `ResetBudgetPopup.tsx`).
- **Store layer**: `src/store/user.ts` (`userStore`) — needs a new method calling `POST v1/admin/users`.
- **Type layer**: `src/types/entity/user.ts` — no create-request type currently defined.
- **HTTP layer**: `src/utils/api.ts` — the single HTTP client (`api.post`, etc.) used by every store method; not read in full, but its usage contract (`.then(r => r.json())`, `skipErrorHandling` option) is consistent across all `userStore` methods above.

### Integration Points
- Backend: `POST /v1/admin/users` in `/Users/Nikita_Levyankov/repos/codemie-ai/codemie/src/codemie/rest_api/routers/user_management_router.py` (external repo — see Section 8), guarded by `admin_access_only`, gated additionally by `config.ENABLE_USER_MANAGEMENT` and `config.IDP_PROVIDER == "local"` (400 otherwise).
- Frontend feature flag: `useUserManagementEnabled()` (`src/hooks/useFeatureFlags.ts`, backed by `FEATURE_FLAGS.USER_MANAGEMENT = 'features:userManagement'`) already gates the Users Management page area elsewhere (`ProjectsManagementPage.tsx`, `AnalyticsFilters.tsx`, `AdminTablesPagination.integration.test.tsx`) but `UsersManagementPage.tsx` itself does not read it directly (it is presumably gated at the route/nav level, not confirmed in this pass).
- `src/store/appInfo.ts` exposes `getIdpProvider()` reading `CONFIG_KEYS.IDP_PROVIDER` (`'idpProvider'`) from `GET /v1/config`; used in `src/utils/utils.ts` and `src/hooks/useOAuth.ts`, not currently consumed anywhere in the users-management UI.

### Patterns and Conventions
- Modals: **must** use `Popup` from `@/components/Popup` (never PrimeReact `Dialog` directly) — enforced by `.ai-run/guides/patterns/modal-patterns.md`.
- Forms: React Hook Form 7 + `@hookform/resolvers/yup` + `yup`, schema in `formSchema.ts` when the form grows, `Controller` wrapping form components, `??` not `||` for defaults — `.ai-run/guides/patterns/form-patterns.md`.
- Store methods: `api.<verb>(...).then(r => r.json()).then(...).catch(error => { toaster.error(...); throw error })` — consistent in every `userStore` admin method.
- Role-gating in JSX: `{isAdmin && <Component/>}` / `canX = isAdmin || isMaintainer` computed once near the top of the component from `useSnapshot(userStore)`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/patterns/modal-patterns.md` — mandates `Popup`, documents `PopupProps`, focus/reset/debounce checklist.
- `.ai-run/guides/patterns/form-patterns.md` — RHF + Yup stack, component table (`Input`, `Checkbox`, `Switch`, etc.), minimal form template, schema conventions.
- `.ai-run/guides/patterns/state-management.md` — not read in full this pass; referenced by `AGENTS.md` for Valtio store conventions.
- `.ai-run/guides/development/api-integration.md` — referenced by `AGENTS.md` for backend-call conventions; not read in full this pass (store patterns were sufficiently evident from `user.ts` directly).
- `.ai-run/guides/testing/testing-patterns.md` — referenced by `AGENTS.md`; not read in full this pass, but concrete evidence gathered directly from `UserDetailsPopup.auditor.test.tsx`.

### Architectural Decisions
- No ADRs found. `UserDetailsPopup.tsx` inline logic documents role-precedence business rules (maintainer implies admin; admin/maintainer clears auditor) via code, not comments — this is the de facto convention for role-flag interaction that a create-user form should likely mirror, though the exact interaction rule for the create form is a design decision, not a documented one.

### Derived Conventions
- New popups live under `usersManagement/components/popups/`; new page-level action buttons are wired directly into `UsersManagementPage.tsx`'s top bar, gated by role booleans already computed in that component (`isAdmin`, `isMaintainer`, `isAuditor`).
- Test files co-locate under `__tests__/` next to the component (e.g., `popups/__tests__/UserDetailsPopup.auditor.test.tsx`), and heavily mock `@/store/user`, `valtio`, `@/components/Popup`, and any heavy sub-components, asserting on real logic (role toggling, disabled state) through minimal DOM stand-ins.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/settings/administration/usersManagement/components/popups/__tests__/UserDetailsPopup.auditor.test.tsx` — mocks `userStore` (`vi.hoisted`), mocks `valtio.useSnapshot` to return the store directly, mocks `Popup`, `Switch`, `Button`, and several sub-components; tests role-flag/permission behavior for an existing-user-edit flow.
- `src/pages/settings/administration/__tests__/AdminTablesPagination.integration.test.tsx` and `usersManagement/components/__tests__/UserProjectSpendingTable.test.tsx` — cover other users-management-adjacent behavior (pagination, spending), not create-user.
- No test file references `create user`, `UserCreateRequest`, `v1/admin/users` POST, or any create-modal component — this endpoint has zero frontend test coverage today.

### Testing Framework and Patterns
- Vitest with two projects (`unit`, `integration`) per `vitest.workspace.ts`; React Testing Library (`@testing-library/react`); `vi.hoisted` for store mocks; `vi.mock('@/store/...')` to replace Valtio proxies with a plain mock object; `vi.mock('valtio', ...)` to short-circuit `useSnapshot`.

### Coverage Gaps
- No existing tests for any create-flow anywhere in `usersManagement/` (only edit/update/bulk flows are tested).
- No existing tests exercise `POST v1/admin/users` or a `UserCreateRequest`-shaped payload from the frontend.
- No frontend test currently exercises IDP-provider/local-mode gating (`config.IDP_PROVIDER`) despite the backend rejecting creation outside local auth mode.

---

## 5. Configuration and Environment

### Environment Variables
- No `.env`/`import.meta.env` variable specific to user creation found. Feature gating for the broader Users Management area runs through the runtime `FEATURE_FLAGS.USER_MANAGEMENT` (`'features:userManagement'`) served via `GET /v1/config`/`window._env_`, not a build-time env var.

### Configuration Files
- `src/constants/featureFlags.ts` — declares `FEATURE_FLAGS.USER_MANAGEMENT` and other flags.
- `src/constants/configKeys.ts` — declares `CONFIG_KEYS.IDP_PROVIDER = 'idpProvider'`, read by `src/store/appInfo.ts::getIdpProvider()`.

### Feature Flags and Deployment Concerns
- `useUserManagementEnabled()` (`src/hooks/useFeatureFlags.ts`) is the established flag for gating the whole users-management surface elsewhere in the app; whether `UsersManagementPage.tsx` itself (vs. its route/nav entry) reads this flag was not confirmed by this pass.
- Backend gates user creation on `config.IDP_PROVIDER == "local"` in addition to role; the frontend currently has `getIdpProvider()` available (`appInfo.ts`) but does not use it anywhere in the users-management UI today.

---

## 6. Risk Indicators

- No frontend precedent exists for a password-entry field (`type="password"`) anywhere outside `Input.tsx`'s own prop plumbing — styling/masking/visibility-toggle conventions for password entry will have to be established from scratch.
- Two different boolean-toggle components exist for the same conceptual control (`Checkbox` vs. `Switch`); `UserDetailsPopup.tsx` (the closest analog, editing the same three role flags) uses `Switch`, but the ticket explicitly says "role checkboxes" — a design decision is needed on which component to use for consistency with the ticket wording vs. the existing edit-modal's `Switch` usage.
- Speculative: the backend rejects creation with a 400 when `config.IDP_PROVIDER != "local"`; no frontend surface currently reads `getIdpProvider()` in the users-management area, so if the button is not additionally conditioned on local-auth mode, maintainers/admins on non-local deployments could see a "Create user" button that always fails server-side. Confirming this is in scope for spec/plan, not established fact from research.
- Zero existing test coverage for anything create-related in this domain — the new store method, form, and role-gating will all be net-new test surface with no existing fixtures/mocks to extend (only patterns to copy from `UserDetailsPopup.auditor.test.tsx` and `ChangeRolePopup`-style tests, though no test file for `ChangeRolePopup.tsx` itself was located).
- No `UserCreateRequest`/create-payload type exists in `src/types/entity/user.ts` — this is new type surface, not an extension of an existing type.
- Role-flag interaction rules (e.g., maintainer implies admin, admin/maintainer clears auditor) exist as inline logic in `UserDetailsPopup.tsx` for the *edit* flow; whether the same interdependency should apply to the *create* form is undecided and could cause inconsistent UX if not addressed deliberately.

---

## 7. Summary for Complexity Assessment

This is a frontend-only, single-feature addition touching three layers: the page component (`UsersManagementPage.tsx`, adding a role-gated button using the same `isAdmin`/`isMaintainer` booleans it already computes), a new modal component (net-new file under `usersManagement/components/popups/`, following the well-established `Popup` + React Hook Form + Yup pattern seen in `ChangeRolePopup.tsx`), and the `userStore` (`src/store/user.ts`, adding one new method following the uniform `api.post(...).then(r.json()).catch(toaster.error + throw)` shape used by every other admin method in that file). The backend contract is fully confirmed from the sibling `codemie` repo's `user_management_router.py` and `UserCreateRequest` model (email, username 3-50 chars, password ≥ `config.PASSWORD_MIN_LENGTH`, optional name, three boolean role flags), so there is no backend ambiguity.

Technical novelty is moderate: the modal/form pattern itself is well-precedented (three to four near-identical examples exist), but two sub-areas are genuinely new to this codebase — password-field UX (no existing pattern anywhere) and the choice/consistency of role-toggle control (`Checkbox` per the ticket wording vs. `Switch` per the closest existing analog, `UserDetailsPopup.tsx`). Local-auth-mode gating is a real integration point the backend enforces but the frontend has never surfaced in this domain, raising a design question about whether the button/form should also condition on `getIdpProvider()`.

Test coverage posture is a clear gap: no test in the repository touches user creation, `POST v1/admin/users`, or any create-modal in this area, so this task adds a fully new component, a fully new store method, and fully new tests with only structurally similar (not directly extendable) fixtures to copy from (`UserDetailsPopup.auditor.test.tsx` is the best analog for mocking `userStore` and `Popup`). Overall this reads as a small-to-medium, well-bounded frontend feature with low architectural risk and a short list of concrete open design questions (password UX, checkbox-vs-switch, local-mode gating, role-interdependency in the create form) that plan/spec should resolve explicitly rather than infer.

---

## 8. External References

- **`/Users/Nikita_Levyankov/repos/codemie-ai/codemie/src/codemie/rest_api/routers/user_management_router.py`** (resolved, sibling repo `codemie` under `/Users/Nikita_Levyankov/repos/codemie-ai/`, matching "EPM-CDME 'codemie' repo" named in the task). Confirms:
  - `POST /v1/admin/users` (prefix `/v1/admin/users`) — handler `create_user(data: UserCreateRequest, user=Depends(authenticate), _=Depends(admin_access_only))`.
  - Response model: `CodeMieUserDetail`.
  - Gating inside the handler: `if not config.ENABLE_USER_MANAGEMENT: raise ExtendedHTTPException(400, "User management not enabled")`; `if config.IDP_PROVIDER != "local": raise ExtendedHTTPException(400, "User creation only available in local auth mode")`.
  - Delegates to `user_management_service.create_local_user_with_flow(email=..., username=..., password=..., name=..., is_admin=..., is_maintainer=..., is_auditor=..., actor_user_id=user.id)`.
  - Docstring: `"""Create a new local user\n\n    SuperAdmin only.\n    Only available in local auth mode.\n    """` — note this docstring says "SuperAdmin only" while the task and the `admin_access_only` dependency (see below) permit admin-or-maintainer; trust the dependency implementation over the docstring.
- **`admin_access_only`** dependency, imported in the same router from `codemie.rest_api.security.authentication` (file not opened in this pass — the task's claim that it "already permits is_admin_or_maintainer" was not independently re-verified byte-for-byte, but the router also separately imports and uses a distinct `admin_or_maintainer_or_auditor_access` and `maintainer_access_only` dependency for other endpoints in the same file, confirming the codebase does distinguish these three role-tiers as separate FastAPI dependencies).
- **`UserCreateRequest`** model, `/Users/Nikita_Levyankov/repos/codemie-ai/codemie/src/codemie/rest_api/models/user_management.py:185-194` (resolved):
  ```python
  class UserCreateRequest(BaseModel):
      """Admin user creation request"""
      email: EmailStr
      username: str = Field(min_length=3, max_length=50)
      password: str = Field(min_length=config.PASSWORD_MIN_LENGTH)
      name: Optional[str] = None
      is_admin: bool = False
      is_maintainer: bool = False
      is_auditor: bool = False
  ```
