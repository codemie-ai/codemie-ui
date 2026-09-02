# Spec: Allow project admins to change spend bucket distribution

**Ticket**: EPMCDME-13962
**Complexity**: S (10/36)

## Problem

Project admins (`applicationsAdmin` / `isProjectAdmin`) can view budget sections on the Project Details page but cannot manage them (edit spend bucket distribution). The `canManageBudgets` flag is gated on `isMaintainer` only.

## Solution

Widen `canManageBudgets` in `ProjectDetailsPage.tsx` to include project admins, with the same personal-project exclusion that applies to `canManageProject`.

### Change

**`src/pages/settings/administration/ProjectDetailsPage.tsx` — line 64**

```ts
// before
const canManageBudgets = isBudgetManagementEnabled && isMaintainer

// after
const canManageBudgets = isBudgetManagementEnabled && (isMaintainer || (isProjectAdmin && !isPersonalProject))
```

No other production files change. The existing `mode: 'manage' | 'view'` prop on `ProjectBudgetsSection` carries the permission downstream automatically — no changes needed in `ProjectBudgetsSection`, `UnifiedProjectBudgetModal`, `ProjectBudgetCard`, or the store.

### Constraints

- `isProjectAdmin` is already computed at line 62 via `currentUser?.applicationsAdmin?.includes(project?.name ?? '') ?? false`.
- `!isPersonalProject` guard is required — mirrors `canManageProject` and prevents personal-project admins from getting manage access.
- The existing `isBudgetManagementEnabled` feature flag continues to gate the entire budget management path.
- Backend note: `PUT v1/admin/project-budget-groups/{id}` is currently `maintainer_access_only`. The frontend change is forward-compatible; save operations will return a 403 toast for project admins until the backend widens access.

## Acceptance Criteria

- Project admin of a non-personal project they administer sees `mode="manage"` on `ProjectBudgetsSection` when the budget management feature flag is on.
- Project admin of a personal project sees `mode="view"` (personal projects are excluded).
- Project admin of a *different* project sees `mode="view"` for this project.
- Auditor sees `mode="view"`.
- Regular user (not admin/maintainer/auditor/project-admin) does not see the budget section at all.
- Maintainer behaviour is unchanged.

## Tests

New cases in `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx`:

1. Project admin of this project + flag on + non-personal → `ProjectBudgetsSection` receives `mode="manage"`
2. Project admin of this project + personal project → `mode="view"`
3. Project admin of a different project → `mode="view"`
4. Auditor + flag on → `mode="view"`
5. Regular user + flag on → budget section not rendered (`canViewBudgets` is false)
