# Technical Research

**Task**: user-management model-override bulk-actions context-menu
**Generated**: 2026-11-25T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-17878 — Bulk override models does not work: it is applied to only one user.

Summary: The bulk model override is applied to only one user instead of all selected users when started from the context menu on the right. It works only when used via the dropdown.

Description: An admin selects several users and applies a model override in one action. The context menu on the right saves the override for only one user, and the other selected users are unchanged. The context menu should not allow override changes while several users are selected. The parent story EPMCDME-15082 requires the same override to be saved for every selected user.

Preconditions:
- The user is a project or platform admin with access to user model overrides.
- The project has several users.
- Models are available in the User-Level Model Override.

Steps to Reproduce:
1. Select several users in bulk selection.
2. Apply the model override via the dropdown and check each selected user's override.
3. Select several users again.
4. Apply the model override via the context menu on the right.
5. Check each selected user's override.

Expected Result:
- The dropdown override is saved for every selected user.
- The context menu on the right is disabled while several users are selected.
- The bulk override can be applied only via the dropdown.

Actual Result:
- The override applied via the context menu is saved for only one user.
- The context menu stays enabled while several users are selected.

Acceptance Criteria:
1. A bulk model override applied via the dropdown to several selected users is saved for every selected user.
2. While several users are selected, the ability to choose override changes in the context menu on the right is disabled.
3. After the action, each selected user shows the same model override.
4. Users who are not selected are not changed.
5. Single-user model override via the context menu keeps working when only one user is selected.

Affected Areas: Bulk model override for users, bulk action dropdown, context menu on the right, User-Level Model Override, related EPMCDME-15082.

---

## 2. Codebase Findings

### Existing Implementations

**Purpose: apply the same model override to every selected user in one action (the bulk override, EPMCDME-15082).**
- `ProjectMembersBulkActions` (`src/pages/settings/administration/components/projectsManagement/ProjectMembersBulkActions.tsx:58-190`) — the "Bulk Actions" dropdown shown when ≥1 users are selected (`BulkActions`, `NavigationMore` with `customIcon="Bulk Actions"`). Its "Override models" item (`:148-156`) is `onClick: onOverrideModels` with no size guard.
- `onOverrideModels` is wired at the call site in `ProjectMembersManager.tsx:1094` as `() => openModelOverrides(selected)` — `selected` is the full table-selection array (`ProjectMembersManager.tsx:551`, passed to `ProjectMembersBulkActions` as `selectedUsers={selected}` at `:1084`). This is the only path that already does what AC1 asks: it hands every selected user's id to the modal.
- `openModelOverrides(members: UserListItem[])` (`ProjectMembersManager.tsx:797-811`) gates on `modelOverridesStatus === 'ready'` and stores the array in `setModelOverrideUsers(members)`.
- `ProjectMemberModelOverrideModal` (`ProjectMembersManager.tsx:1209-…`, component at `src/pages/settings/administration/projectsManagement/components/ProjectMemberModelOverrideModal.tsx:107`) reads `modelOverrideUsers`, builds a union/bulk view when `users.length > 1` (`ProjectMemberModelOverrideModal.tsx:162-172`, `getBulkSetting`), and on Apply calls `onApply(overrides, defaultModel, hasCustomDefault, projectAvailability)` (`:273-280`).
- `persistModelOverrides` (`ProjectMembersManager.tsx:106-149`) branches on `userIds.length`: a single id calls `userModelOverridesStore.setUserModelOverride` (PUT, one user); more than one calls `userModelOverridesStore.batchUserModelOverrides` with `operation: 'grant'` and `user_ids: userIds` (`:139-148`) — a true batch write, one call for all selected users. `userIds` is computed at the modal-apply call site as `modelOverrideUsers.map((user) => user.id)` (`ProjectMembersManager.tsx:1224`).
- `batchUserModelOverrides` / `BatchUserModelOverridePayload` (`src/store/userModelOverrides.ts:173-198`, `src/types/entity/userModelOverride.ts:32-39`) is the backend contract: `POST .../user-model-overrides/batch` with `user_ids: string[]`.

**Purpose: let an admin change one user's override from the row-level ("⋮" / right-hand) context menu.**
- `ProjectMembersManager.tsx:984-989`, inside the `actions` column's `customRenderColumns`: a "Override models" `NavigationMenuItem` whose `onClick` is `() => openModelOverrides([user])` — `user` is the row's own item, a locally-scoped single-element array. This item is `hidden: !isUserModelOverrideEnabled` only; it has **no dependency on the current table selection** (`selected`) and is never `hidden`/`disabled` based on `selected.length`.
- The same row menu also carries "Override budgets" (`:976-983`, `setOverrideContext` single-user) and "Unassign from Project" (`:992-997`), both likewise row-scoped and not selection-aware — this is the project's existing convention for per-row actions in this menu.
- `NavigationMore` / `NavigationMenuItem` (`src/components/NavigationMore/NavigationMore.tsx:91-…`) renders each item with `disabled:opacity-50 disabled:cursor-not-allowed` classes driven by an `item.disabled` flag (`:190,195`) and supports an `item.hidden` filter (`:123`) — both are the existing mechanisms available to gate a single menu entry; disabling a row via `NavigationMore` wholesale is not separately implemented here (each item is gated individually).

**Purpose: know which users are currently selected, to act on them.**
- `useTableSelection` → destructured as `selected`, `clearSelection`, `onSelectAllChange` (`ProjectMembersManager.tsx:551`); `selection` wraps it for the table's checkbox column (`:565`, used at `:1116-1118` as `{...(canManageProject ? selection : {})}` / `selected={canManageProject ? selected : undefined}`). `selected` is already the single source of truth the bulk dropdown path (above) consumes; it is in scope at the `actions` column closure (same component) but the "Override models" row item (above) does not read it.

Other touched code:
- `ProjectMembersManager.tsx:879-1032` — the `customRenderColumns` memo holding the `actions` cell; its dependency array (`:1011-1031`) already lists `openModelOverrides`, `isUserModelOverrideEnabled`, etc., but not `selected`.

### Decisions Already in the Code

- The project already distinguishes single-vs-multi persistence by **array length**, not by call site: `persistModelOverrides` (`ProjectMembersManager.tsx:126-148`) and `revokeModelOverrides` (`:151-161`) both do `if (userIds.length === 1) … else batch…`. Any path that reaches this function with the wrong `userIds` (e.g. a 1-element array while several rows are selected) silently takes the single-user branch — this is the exact mechanism the bug exploits, not a defect in `persistModelOverrides` itself.
- `ProjectMemberModelOverrideModal` already renders a correct multi-user UI (mixed-state checkboxes, bulk title "Model Override — N users", `ProjectMemberModelOverrideModal.tsx:162-172, 202-205`) regardless of how it was opened — the modal has no opinion on whether `[user]` or `selected` was passed in.
- Convention for per-row action availability in this menu is `hidden`, computed from flags/role (`canManageBudgets`, `isUserModelOverrideEnabled`, `isCreator`, …) — there is no existing example in this file of a menu item gated on `selected.length`, so a new condition of that shape would be the first of its kind here (not a deviation from convention, just unprecedented).
- "Override models" bulk dropdown already excludes the override budgets vs change-role self-protection pattern (`ProjectMembersBulkActions.tsx:84-91`, blocking a project admin from changing their own role) — no analogous self/role guard exists for model overrides in either path.

### Task Statements Checked Against the Code

- "It works only when used via the dropdown" — **holds**: the dropdown path (`onOverrideModels` → `openModelOverrides(selected)` → batch call) already sends every selected user id; the per-row context menu path always sends `[user]` for the clicked row only (`ProjectMembersManager.tsx:987`).
- "The context menu on the right saves the override for only one user" — **holds**: `openModelOverrides([user])` is the row's own user, independent of `selected`.
- "The context menu should not allow override changes while several users are selected" (AC2) — **contradicted today**: the "Override models" row item has no `disabled`/`hidden` tied to `selected.length`; it is enabled regardless of selection size.
- "Single-user model override via the context menu keeps working when only one user is selected" (AC5) — **keeps an existing mechanism in place**: the row item's current behavior (`openModelOverrides([user])` → single-id branch of `persistModelOverrides`) is exactly the single-user case the fix must not disturb; its consumer is the same row's "Override models" click.
- "The bulk override can be applied only via the dropdown" — **holds today only as a side effect of the context menu's bug**, not by design; once the context-menu item is correctly disabled for multi-select (fixing AC2), this statement becomes true by construction rather than by accident.

### Consumers of Changed Contracts

Searched for every reader of the symbols a fix would touch:
- `openModelOverrides` (`ProjectMembersManager.tsx:797`) — 1 caller found by codegraph: the row menu's `onClick` at `:987` (the bulk dropdown calls it too, at `:1094`, as noted above). No other file imports or calls it; it is private to this component.
- The "Override models" `NavigationMenuItem` object (`:984-989`) is local to the `actions` render function; no other column or component reads it.
- `selected` (table selection state, `:551`) is already consumed by: the bulk-actions row (`:1084`), role-change/delete cleanup (`:690-719`), and the selection checkbox column (`:1116-1118`); adding a read of `selected.length` inside the `actions` column's memo only adds a new dependency, it does not change any existing consumer's behavior.
- `persistModelOverrides` / `userModelOverridesStore.batchUserModelOverrides` — consumers are only the two call sites inside `ProjectMembersManager.tsx` (dropdown and row-menu paths funnel into the same modal-apply handler at `:1224-1232`); no other page calls this store method (per codegraph blast-radius: callers limited to `userModelOverrides.ts` itself and this manager).

### Architecture and Layers Affected

- **UI layer**: `ProjectMembersManager.tsx` (page-level orchestrator — table columns, selection, modal state) and `ProjectMembersBulkActions.tsx` (dropdown component). No new component is implied; the row `actions` cell's `menuItems` construction is the only rendering code in question.
- **Shared component layer**: `NavigationMore`/`NavigationMenuItem` (`src/components/NavigationMore/NavigationMore.tsx`) — already supports `disabled` and `hidden` per item; no change needed there.
- **Store/API layer**: `src/store/userModelOverrides.ts` and `src/types/entity/userModelOverride.ts` — unaffected; the batch contract already exists and is already exercised correctly by the dropdown path.

### Integration Points

- Internal: `ProjectMembersManager` ↔ `ProjectMembersBulkActions` (props `selectedUsers`, `onOverrideModels`) ↔ `ProjectMemberModelOverrideModal` (props `users`, `onApply`) ↔ `userModelOverridesStore` (`setUserModelOverride` / `batchUserModelOverrides`) ↔ backend `v1/projects/{project}/user-model-overrides[/batch]`.
- No external service integration beyond the existing REST endpoints already wired.

### Patterns and Conventions

- Per-row action menus in this file are arrays of `NavigationMenuItem` built inline per row, gated with `hidden` flags computed from role/feature flags (`ProjectMembersManager.tsx:949-997`).
- Bulk-vs-single branching is done by array length at the persistence boundary (`persistModelOverrides`, `revokeModelOverrides`), not by call site — any UI path reaching that boundary with the wrong set of ids is silently "correct" from that function's point of view.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/components/component-patterns.md` and `.ai-run/guides/patterns/state-management.md` cover general table/selection/modal conventions but do not mention this feature by name. No guide specifically documents the User-Level Model Override or EPMCDME-15082.

### Architectural Decisions
None recorded in guides for this feature; the only decisions found are inline in code (see § 2, Decisions Already in the Code).

### Derived Conventions
Row actions use `hidden` for role/flag-based gating; no existing row action is gated on the current table selection size, so this fix introduces the first selection-aware item in this menu (noted as a precedent, not a problem).

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/settings/administration/components/projectsManagement/__tests__/ProjectMembersBulkActions.test.tsx` and `...membershipLock.test.tsx` — cover the bulk dropdown's items and membership-lock hiding; relevant to confirming the dropdown's "Override models" item behavior is unaffected.
- `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectMemberModelOverrideModal.test.tsx` — covers the modal's single vs multi (`users.length`) rendering and apply payload shape.
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersManager.idpLock.integration.test.tsx` and `ProjectMembersDetails.integration.test.tsx` — integration-level coverage of `ProjectMembersManager`, but focused on IDP lock / details, not on the row context menu's model-override item or its interaction with multi-selection.
- `src/store/__tests__/projectBudgets.bulkOverride.test.ts` exists for the analogous budget bulk-override store call; no equivalent store-level test file was found specifically for `userModelOverridesStore.batchUserModelOverrides`.

### Testing Framework and Patterns
Vitest-based (per `package.json`/`vite.config.ts` convention referenced in guides); component tests use React Testing Library idioms consistent with the other `__tests__` files found above.

### Coverage Gaps
- No existing test asserts that the row-level "Override models" context menu item is disabled/hidden when `selected.length > 1`.
- No existing test exercises the row context menu's `openModelOverrides([user])` call in the presence of a non-empty, larger `selected` array (the exact regression scenario in the ticket).

---

## 5. Configuration and Environment

### Environment Variables
None specific to this feature found during exploration.

### Configuration Files
`isUserModelOverrideEnabled` is a prop passed into `ProjectMembersManager` (feature flag resolved by its caller); gates both the row menu item (`hidden: !isUserModelOverrideEnabled`) and the bulk dropdown item (`ProjectMembersBulkActions.tsx:148-156`).

### Feature Flags and Deployment Concerns
None beyond the `isUserModelOverrideEnabled` flag above; no deployment-manifest or secrets concerns touch this area.

---

## 6. Risk Indicators

- The fix point is narrow (one `NavigationMenuItem` definition, `ProjectMembersManager.tsx:984-989`) but sits inside a `useMemo` whose dependency array (`:1011-1031`) does not currently include `selected` — adding the guard requires also adding `selected` (or its length) to that dependency array, or the item will not re-evaluate when the selection changes.
- AC5 (single-user context menu must keep working) directly names the mechanism in § 2 ("keeps an existing mechanism in place": `openModelOverrides([user])` for the single-selection/no-selection case) — the guard must distinguish "exactly one row, nothing/one selected" from "several selected," not simply disable the item whenever any selection exists.
- No existing test covers the regression scenario (row context menu while >1 users selected); a fix without a new test leaves AC2/AC5 unverified by the suite.
- The row menu's other actions ("Override budgets", "Unassign from Project") have the same row-scoped-regardless-of-selection shape; scope creep risk if the fix is generalized to all row actions when only "Override models" is in scope per the ticket.
- `persistModelOverrides`'s length-based branching (§ Decisions) means any other future call path that passes a 1-element array while multiple users are logically intended would reproduce this same class of bug — worth noting for review, not for this fix.

---

## 7. Summary for Complexity Assessment

This is a narrowly-scoped UI fix inside a single file, `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx`. The bulk-override write path (dropdown → `openModelOverrides(selected)` → `persistModelOverrides` → `userModelOverridesStore.batchUserModelOverrides`) already exists end-to-end and already does what AC1/AC3/AC4 ask; nothing there needs to change. The actual defect is that the row-level ("⋮") context menu's "Override models" item always opens the modal for just the clicked row's user (`openModelOverrides([user])`) with no awareness of the table's current multi-selection (`selected`), so an admin who multi-selects and then uses that menu silently gets a single-user write instead of the intended bulk one.

The fix is a conditional (`disabled`/`hidden` based on `selected.length > 1`) on one `NavigationMenuItem`, plus adding `selected` to the surrounding `useMemo`'s dependency array so the column re-renders correctly as selection changes. No store, type, or API contract changes are needed — `batchUserModelOverrides` and its payload already exist and are already exercised by the dropdown path.

Test coverage exists for the bulk dropdown and for the modal's single/multi rendering, but nothing currently exercises the row context menu together with a multi-row selection — this is the gap a verification pass for this ticket should close. Risk is low: the change is localized, the backend contract is unchanged, and the single-user behavior (AC5) is an existing, already-tested code path that the guard must leave untouched rather than reimplement.

---

## 8. External References

None named by the task. The ticket (EPMCDME-17878) and its parent story (EPMCDME-15082) are referenced by key only, with no path or URL; the parent story's intent (one override applied to every selected user) is already implemented in the dropdown path and corroborated in code at `ProjectMembersManager.tsx:106-149` and `src/store/userModelOverrides.ts:173-198`.
