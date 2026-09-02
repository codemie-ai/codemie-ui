# Spec: Create User button on Users Management page

**Ticket:** EPMCDME-14535
**Scope:** Frontend only. Backend endpoint `POST /v1/admin/users` and its auth/config gating already exist and are unchanged by this work.

## Context

`UsersManagementPage.tsx` has no way to create a brand-new local user account. Superadmins and maintainers can only edit existing users' roles (`UserDetailsPopup.tsx`). This adds a "Create user" action that opens a modal collecting email, username, password, optional name, and the three platform-role flags, then calls the existing `POST /v1/admin/users` endpoint.

## Design

**Button.** Added to `UsersManagementPage.tsx`'s existing top-bar slot (~lines 365-380), alongside `UsersManagementFilters` and the `{isAdmin && <UsersManagementBulkActions/>}` control. Visible only when `(isAdmin || isMaintainer)` **and** the deployment is in local auth mode. Auditors never see it; on non-local deployments it is hidden entirely rather than shown disabled, matching the codebase's existing `{isAdmin && ...}` gating idiom and avoiding a control that always fails server-side. Local-auth-mode is read via `getIdpProvider()` (`src/store/appInfo.ts`), compared against `'local'`.

**Modal.** New component `CreateUserPopup.tsx`, sibling to `UserDetailsPopup.tsx` and `AddProjectPopup.tsx` under `usersManagement/components/popups/`. Built on `Popup` (never PrimeReact `Dialog` directly), React Hook Form + `@hookform/resolvers/yup` + `Controller`, following the `ChangeRolePopup.tsx` template. The page owns the modal's open/closed boolean state, consistent with how other page/action-level popups in this area are triggered.

Fields: email (required, email format), username (required, 3-50 chars per backend contract), password (required, `type="password"`, no visibility toggle, no confirm-password field, no client-side minimum-length check — the backend's `PASSWORD_MIN_LENGTH` isn't exposed to the frontend, so length errors surface via the existing `toaster.error` path on a 400 response), name (optional, free text), and three `Switch` controls — `is_admin`, `is_maintainer`, `is_auditor` — using `Switch` rather than `Checkbox` for visual consistency with `UserDetailsPopup.tsx`, which edits the same three flags.

**Role-interdependency.** The three switches mirror the interdependency rules already encoded in `UserDetailsPopup.tsx`: turning `is_maintainer` on forces `is_admin` on; turning `is_admin` on or `is_maintainer` on clears `is_auditor`. This keeps the set of role combinations a create action can produce identical to what the edit flow already treats as valid.

**Store.** New `createUser` method on `userStore` (`src/store/user.ts`), following the uniform shape used by every other admin method there: `api.post('v1/admin/users', payload, { skipErrorHandling: true }).then(r => r.json()).then(...).catch(error => { toaster.error(...); throw error })`. On success: `toaster.info(...)`, close the modal, and refresh the users list (existing `getUsers`) so the new user appears without a full page reload. On failure: the modal stays open with the backend's error message surfaced via `toaster.error`, so the admin/maintainer can correct input and resubmit.

**Types.** New type added to `src/types/entity/user.ts`, mirroring the backend's `UserCreateRequest`:

```ts
interface UserCreatePayload {
  email: string;
  username: string;
  password: string;
  name?: string;
  is_admin: boolean;
  is_maintainer: boolean;
  is_auditor: boolean;
}
```

## Acceptance Criteria

- "Create user" button appears in `UsersManagementPage.tsx`'s top bar, in the existing role-gated control slot.
- Button is visible only when `isAdmin || isMaintainer` is true; never visible to auditors.
- Button is hidden entirely (not disabled) when the deployment's IDP provider is not `'local'`.
- Clicking the button opens a `Popup`-based modal with email, username, password, name, and three `Switch` role toggles.
- Password input uses `type="password"`; no visibility toggle and no confirm-password field are present.
- Enabling `is_maintainer` forces `is_admin` on; enabling `is_admin` or `is_maintainer` clears `is_auditor`.
- Form validation (Yup): email format and presence, username 3-50 chars, password required, name optional.
- Submitting a valid form calls a new `userStore.createUser` method that performs `POST /v1/admin/users` with a `UserCreatePayload`-shaped body.
- On success: modal closes, a success toast is shown, and the users list reflects the new user without a manual page reload.
- On failure (e.g. backend 400 for validation or non-local-auth-mode): an error toast surfaces the backend's message and the modal remains open with entered values intact.
- New tests cover button visibility (admin/maintainer/auditor/non-local-auth-mode combinations), the role-switch interdependency behavior, and both the success and failure submission paths, following the mocking patterns in `UserDetailsPopup.auditor.test.tsx`.

## Non-goals

- No confirm-password field.
- No password visibility toggle or password-strength meter.
- No client-side minimum-length validation mirroring `config.PASSWORD_MIN_LENGTH`; that value is not exposed to the frontend today, so length errors are surfaced only via the backend's 400 response.
- No changes to `UserDetailsPopup.tsx` or the existing edit-user flow.
- No new or changed feature-flag gating (`useUserManagementEnabled()`); page-level access to `UsersManagementPage.tsx` is assumed already handled upstream, unchanged by this work.
- No bulk user creation or import.
- No changes to backend authorization (`admin_access_only`) or the `POST /v1/admin/users` contract itself.

## Decisions

- Plain `type="password"` input, no toggle or confirm field, over a visibility-toggle affordance — avoids introducing a new UI pattern for a first cut.
- `Switch` over `Checkbox` for the three role flags — consistency with `UserDetailsPopup.tsx` over literal ticket wording.
- Create-flow mirrors the edit-flow's role-interdependency rules exactly, rather than treating the three flags as independent — prevents the create form from producing role combinations the edit flow considers invalid.
- Button hidden entirely outside local auth mode, rather than shown-disabled with a tooltip — matches the existing `{isAdmin && ...}` gating idiom already used in this file.

## Open Risks

- Zero existing test coverage for any create-flow in this domain; new tests have no directly-extendable fixtures, only structurally similar patterns to copy from (`UserDetailsPopup.auditor.test.tsx`).
- `getIdpProvider()` must be populated by the time `UsersManagementPage.tsx` renders for the local-auth-mode gate to work correctly; this assumption should be verified during implementation.
