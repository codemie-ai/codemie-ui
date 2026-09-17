# Scheduler User/Project Type Switch — Spec

**Ticket:** EPMCDME-15020  
**Date:** 2026-09-15  
**Branch:** EPMCDME-15020_scheduler-user-project-type-switch

---

## Goal

Add a User/Project type switch to the Schedulers page so users can view either user-owned or project-owned schedulers, mirroring the identical pattern on the Integrations page.

---

## Background

The Integrations page uses a `SelectButton` component to switch between `IntegrationOption.USER` and `IntegrationOption.PROJECT` scopes. All building blocks already exist and are reusable: `SelectButton`, `IntegrationOption`, `clearUrlFilters()`, and `userStore` permission fields. This feature ports the pattern to the Schedulers page with minimal net-new code.

---

## Acceptance Criteria

1. A **Scheduler Type** switch (`SelectButton`) appears in the Schedulers page header, defaulting to `User`.
2. Selecting **User** fetches only user-owned schedulers; selecting **Project** fetches only project-owned schedulers.
3. Switching type calls `clearUrlFilters()` and resets pagination to page 0.
4. The **Project** option is hidden for users without `applicationsAdmin` (non-empty) or `isAdmin` permission. If the user cannot see the Project option, the switch is not rendered at all (only one option remaining means no toggle needed).
5. The `ownerType` value is forwarded to `GET /v1/schedulers` as a query parameter.
6. All other filters (resource type, project, status, etc.) continue to work normally in combination with the type selection.

---

## Backend Contract

If not yet implemented, the backend must accept an optional `ownerType` query parameter:

```
GET /v1/schedulers?ownerType=User      → returns only user-owned schedulers
GET /v1/schedulers?ownerType=Project   → returns only project-owned schedulers
GET /v1/schedulers                     → current behavior (no filter applied)
```

- `ownerType` is optional; its absence preserves backward compatibility.
- Valid values: `"User"` | `"Project"` — matching `IntegrationOption` enum values exactly.

---

## Design

### Files changed

| File | Change |
|---|---|
| `src/store/schedulers.ts` | Add `ownerType?: IntegrationOption` to `SchedulersQuery` interface; forward it in `fetchSchedulers` |
| `src/pages/schedulers/SchedulersPage.tsx` | Add type state, options memo, handler, updated query memo, and `SelectButton` render |

### Store change (`src/store/schedulers.ts`)

Add to `SchedulersQuery`:
```ts
ownerType?: IntegrationOption
```

Add to the `params` construction in `fetchSchedulers`:
```ts
if (query.ownerType) params.ownerType = query.ownerType
```

### Page change (`src/pages/schedulers/SchedulersPage.tsx`)

```ts
const currentUser = userStore.user
const schedulerOptions = useMemo(() => {
  const hasProjectPermission = currentUser?.applicationsAdmin?.length || currentUser?.isAdmin
  return [IntegrationOption.USER, IntegrationOption.PROJECT].filter(
    (opt) => opt !== IntegrationOption.PROJECT || hasProjectPermission
  )
}, [currentUser])

const [schedulerType, setSchedulerType] = useState(IntegrationOption.USER)

const handleChangeSchedulerType = (type: IntegrationOption) => {
  clearUrlFilters()
  setPage(0)
  setSchedulerType(type)
}
```

Add `ownerType: schedulerType` to the `query` memo.

Render in header (wrapped in `PageLayout`'s `rightContent` prop):
```tsx
{schedulerOptions.length > 1 && (
  <SelectButton
    caption="Scheduler Type:"
    value={schedulerType}
    options={schedulerOptions}
    onChange={handleChangeSchedulerType}
  />
)}
```

---

## Out of Scope

- Creating schedulers in user vs. project scope from this page.
- Merging scopes in a single view.
- Any backend changes beyond the `ownerType` query param described above.
