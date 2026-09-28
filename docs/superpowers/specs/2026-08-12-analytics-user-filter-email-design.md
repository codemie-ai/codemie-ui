# Design: Analytics Users filter email search and display + Administration dropdown panel width

**Tickets**: EPMCDME-14070, EPMCDME-14078
**Date**: 2026-08-12
**Branch**: EPMCDME-14070_analytics-user-filter-email

---

## Problem

### EPMCDME-14070
The Analytics page Users filter shows "No results found" when searching by email. Root cause: the backend `user_handler.py` PG path builds the response dict as `{"id": u.id, "name": u.name or u.username}` — email is never included even though `aquery_active_users` already searches by ILIKE on `email` and returns full `UserDB` objects. The frontend `formatUserOptions` therefore builds `{ label, value }` options with no email field, so the item display cannot show it.

Note: the backend search itself works correctly for super-admins — matching users are returned. The display is simply missing the email field.

Additionally, the item template shows only a plain name string. The product requirement is name on top, email below (smaller, dimmed) — matching the pattern already used for entity display elsewhere in the codebase.

### EPMCDME-14078
Five MultiSelect dropdowns in Administration settings open a panel that inherits the trigger element's width. When option labels are long they are truncated. The required panel minimum width is 320px. Affected dropdowns: Domain, Event type, Entity type (`ActivityEventsPage`), Project and Budget (`UsersManagementFilters`).

---

## Design

### Backend — `codemie`

**`src/codemie/rest_api/models/analytics.py`**

Add `email` to `UserListItem`. `UserDB.email` is a required `str` field (non-nullable in the DB), so the field is `str` for the PG path. The ES path does not populate this field, so it must be optional at the model level to remain backward-compatible with that path:

```python
class UserListItem(BaseModel):
    id: str = Field(..., description="User ID")
    name: str = Field(..., description="User display name")
    email: str | None = Field(None, description="User email address — populated on PG path only")
```

This is additive and backward-compatible — existing consumers that do not read `email` are unaffected.

**`src/codemie/service/analytics/handlers/user_handler.py`**

In the super-admin PG path, include `email` from the `UserDB` object:

```python
users_list = [
    {"id": u.id, "name": u.name or u.username, "email": u.email}
    for u in pg_users
]
```

The ES aggregation path is not changed — it returns no email source so `email` will be `None` for those entries.

---

### Frontend — `codemie-ui-next`

#### Option type

The option shape used throughout the analytics users filter is extended from `{ label: string; value: string }` to `{ label: string; value: string; email?: string }`. This is the type used by `formatUserOptions`, `getAnalyticsUsers`, `AnalyticsUserFilter`, and the sticky-options Map — all handle extra fields transparently.

#### `src/utils/user.ts` — `formatUserOptions`

After building the `label`, pick the first non-empty email from users grouped under the same `id`:

```ts
return Array.from(userMap.entries()).map(([id, allNames]) => {
  // ... existing label logic unchanged ...
  const email = users.find((u: any) => u.id === id && u.email)?.email as string | undefined
  return { label, value: id, ...(email ? { email } : {}) }
})
```

The function signature's return type annotation updates to `Array<{ label: string; value: string; email?: string }>`.

#### `src/pages/analytics/components/AnalyticsUserFilter.tsx`

A `renderUserOption` function is defined inline in the component file and passed as `renderOption` to `MultiSelect`:

```tsx
const renderUserOption = (option: { label: string; value: string; email?: string }) => (
  <div className="flex flex-col min-w-0">
    <p className="text-sm font-medium truncate">{option.label}</p>
    {option.email && (
      <p className="text-xs text-text-quaternary truncate">{option.email}</p>
    )}
  </div>
)
```

The `MultiSelect` call gains `renderOption={renderUserOption}` and `virtualScrollerOptions={{ itemSize: 48 }}` (up from 32) to accommodate the two-line row height.

The `AnalyticsUserFilterProps` type updates `userOptions` to `Array<{ label: string; value: string; email?: string }>`.

No changes to Me checkbox logic, sticky options, or search triggering.

#### `src/components/form/MultiSelect/MultiSelect.tsx`

Add one prop:

```ts
panelMinWidth?: number
```

Merge into `panelStyle`:

```ts
panelStyle={
  inputWidth
    ? { width: `${inputWidth}px`, ...(panelMinWidth ? { minWidth: `${panelMinWidth}px` } : {}) }
    : panelMinWidth
      ? { minWidth: `${panelMinWidth}px` }
      : {}
}
```

This means: panel is at least `panelMinWidth` px wide regardless of trigger width, but still expands if the trigger is wider. No existing call sites are affected (prop is optional, default `undefined`).

#### `src/pages/settings/administration/ActivityEventsPage.tsx`

Add `panelMinWidth={320}` to three MultiSelect components:
- Domain (line ~278)
- Event type (line ~287)
- Entity type (line ~297)

Container div widths are not changed.

#### `src/pages/settings/administration/usersManagement/components/UsersManagementFilters.tsx`

Add `panelMinWidth={320}` to two components:
- Project `ProjectSelector` — check if it accepts `panelMinWidth` via its underlying MultiSelect; if not, wrap via prop threading
- Budget `BudgetSelector` — same check

Note: `ProjectSelector` and `BudgetSelector` are wrappers; verify they forward `panelMinWidth` to the underlying `MultiSelect`. If not, add the prop forwarding as part of this task.

---

## Data flow (EPMCDME-14070)

```
aquery_active_users (UserDB.email available)
  → user_handler.py: {"id", "name", "email"}
  → UserListItem: {id, name, email?}
  → GET /v1/analytics/users response
  → getAnalyticsUsers: data.data.users
  → formatUserOptions: {label, value, email?}
  → AnalyticsFilters: userOptions state
  → AnalyticsUserFilter: mergedOptions
  → MultiSelect renderOption: name row + email row
```

---

## Out of scope

- Backend email search logic — `aquery_active_users` already searches by ILIKE on email; no backend search changes needed
- Email display for non-admin (ES) paths — no email source available in ES aggregations; email field will be `None`
- Any other administration filter dropdowns beyond the five named in EPMCDME-14078
- `ProjectSelector` / `BudgetSelector` internal refactoring beyond prop forwarding
