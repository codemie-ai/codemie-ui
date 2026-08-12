# Fix UserSettings Tooltip Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `data-tooltip-content` from `UserSettingActionsCell` and replace it with `contextId`, eliminating the react-tooltip that blocks Playwright's click on the Delete menu item.

**Architecture:** `NavigationMore` supports two accessibility strategies: `data-tooltip-content` (shows a visible tooltip + sets `aria-label`) and `contextId` (sets `aria-labelledby` referencing an existing DOM element, no tooltip). This branch uses `contextId` across all admin tables; UserSettings.tsx incorrectly used `data-tooltip-content` instead. Fix: add `id` to the alias cell renderer, pass that `id` as `contextId` to the NavigationMore, remove the tooltip prop.

**Tech Stack:** React 18, TypeScript, NavigationMore shared component, react-tooltip

## Global Constraints

- No changes to test files.
- Naming convention: `user-setting-name-${item.id}` (matches `admin-mcp-name-${item.id}`, `admin-user-name-${item.id}` patterns on this branch).
- Only `src/pages/integrations/components/UserSettings/UserSettings.tsx` is modified.

---

### Task 1: Replace `data-tooltip-content` with `contextId` in UserSettings.tsx

**Files:**
- Modify: `src/pages/integrations/components/UserSettings/UserSettings.tsx:62-94, 205-214`

**Interfaces:**
- Consumes: `UserSetting.id` (string), `UserSetting.alias` (string, may be empty)
- Produces: `id="user-setting-name-{item.id}"` on alias cell; `contextId="user-setting-name-{item.id}"` on NavigationMore trigger button → `aria-labelledby="{buttonId} user-setting-name-{item.id}"`

**Test-first:** `no` — no unit test covers `UserSettingActionsCell`; the external Playwright test `test_delete_integration_with_confirmation` is the verification gate. Run the vitest suite after the change to confirm no regressions.

- [ ] **Step 1: Edit `UserSettingActionsCell` — remove `accessibleName`, replace `data-tooltip-content` with `contextId`**

In `src/pages/integrations/components/UserSettings/UserSettings.tsx`, change lines 62–68:

```tsx
// BEFORE (lines 62–68):
const UserSettingActionsCell: FC<UserSettingActionsCellProps> = ({ item, onEdit, onDelete }) => {
  const accessibleName = item.alias || item.credential_type || 'Integration'
  return (
    <NavigationMore
      childrenFirst
      hideOnClickInside
      data-tooltip-content={`More options for ${accessibleName}`}

// AFTER:
const UserSettingActionsCell: FC<UserSettingActionsCellProps> = ({ item, onEdit, onDelete }) => {
  return (
    <NavigationMore
      childrenFirst
      hideOnClickInside
      contextId={`user-setting-name-${item.id}`}
```

- [ ] **Step 2: Add `alias` renderer to `customTableColumns`**

In the same file, change lines 205–206:

```tsx
// BEFORE:
  const customTableColumns: TableProps<UserSetting>['customRenderColumns'] = {
    project_name: renderProjectNameCell,
    actions: (item) => (

// AFTER:
  const customTableColumns: TableProps<UserSetting>['customRenderColumns'] = {
    project_name: renderProjectNameCell,
    alias: (item) => <span id={`user-setting-name-${item.id}`}>{item.alias || '-'}</span>,
    actions: (item) => (
```

- [ ] **Step 3: Run vitest to confirm no regressions**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -20
```

Expected: all tests pass (or pre-existing failures only — none introduced by this change).

- [ ] **Step 4: Commit**

```bash
git add src/pages/integrations/components/UserSettings/UserSettings.tsx
git commit -m "EPMCDME-8420: fix UserSettings tooltip blocking Playwright delete click

Replace data-tooltip-content with contextId on NavigationMore in
UserSettingActionsCell. Adds id to alias cell renderer so aria-labelledby
can reference it. Matches pattern used by UsersManagementPage and
MCPServerActions on this branch. Eliminates react-tooltip that was
intercepting pointer events during automation."
```
