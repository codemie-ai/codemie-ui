# Spec: EPMCDME-14079 — Activity Events Actor Filter Rename and Search

## Problem

On `settings/administration/activity-events`, the "Actor ID" filter:
1. Is mislabeled — the table shows actor name and email, not actor IDs.
2. Does not work for visible values — the backend requires an exact UUID; searching by name or email returns no results.

## Solution

Frontend-only change. Replace the plain `<Input label="Actor ID">` with a server-search `<MultiSelect singleValue>`. On typing, debounce and call `userStore.searchUsers(query)` to fetch matching users; display options as `name (email)`; on selection resolve the chosen `UserListItem.id` (UUID) and pass it as `actor_id` to `activityEventsStore.listEvents()`.

No backend changes — `GET /v1/admin/users?search=<query>` already searches by name, email, and username via ILIKE and returns `AdminUserListItem[]` with `id`.

## Acceptance Criteria

- Filter label reads "Actor", not "Actor ID".
- Filter placeholder reads "Filter by actor".
- Typing in the filter calls `userStore.searchUsers(query, 10)` and shows options as `${name} (${email})`.
- Selecting an option resolves to the user's UUID and passes it as `actor_id` to the events query.
- Clearing the selection resets `actor_id` to `null`.
- If `ENABLE_USER_MANAGEMENT=false` (backend returns 400), the dropdown shows empty options — no crash, no toast.
- `clearFilters` resets the actor filter alongside all other filters.
- No regression on other filters (domain, event type, entity type, entity ID, date range, sort).

## Component Changes — `ActivityEventsPage.tsx`

### State

| Before | After |
|---|---|
| `actorId: string` (raw input) | `actorId: string \| null` (resolved UUID) |
| — | `actorOptions: Array<{ label: string; value: string }>` |
| — | `actorLoading: boolean` |

`clearFilters` resets: `actorId → null`, `actorOptions → []`.

### Search handler

```ts
const handleActorSearch = useCallback(async (query: string) => {
  setActorId(null)
  if (!query) { setActorOptions([]); return }
  setActorLoading(true)
  try {
    const users = await userStore.searchUsers(query, 10)
    setActorOptions(users.map(u => ({ label: `${u.name} (${u.email})`, value: u.id })))
  } catch {
    setActorOptions([])
  } finally {
    setActorLoading(false)
  }
}, [])
```

### JSX replacement

```tsx
<MultiSelect
  label="Actor"
  value={actorId ? [actorId] : []}
  options={actorOptions}
  onChange={(e) => setActorId(e.value?.[0] ?? null)}
  onFilter={(e) => handleActorSearch(e.filter)}
  loading={actorLoading}
  placeholder="Filter by actor"
  filterPlaceholder="Search by name or email"
  singleValue
/>
```

`hasActiveFilters` check (`!!actorId`) remains valid — `null` is falsy.

## Error Handling

`userStore.searchUsers` throws on HTTP 400 (`ENABLE_USER_MANAGEMENT=false`) or network error. The catch block sets `actorOptions` to `[]`, showing an empty dropdown. No toast, no crash — same pattern as `AddUserModal.tsx`.

## Prior Art

- `src/pages/settings/administration/components/AddUserModal.tsx` — identical `userStore.searchUsers` + `<MultiSelect onFilter singleValue>` pattern
- `src/pages/analytics/components/AnalyticsUserFilter.tsx` — search-driven MultiSelect resolving display label to backend ID

## Tests

### Unit (`ActivityEventsPage.test.tsx`)
- Render the filter section; assert label text is "Actor" (not "Actor ID").

### Integration (new `ActivityEventsFilters.integration.test.tsx` or existing `AdminTablesPagination.integration.test.tsx`)
- Mock `GET /v1/admin/users?search=john` → return one user `{ id: 'uuid-1', name: 'John Doe', email: 'john@example.com' }`.
- Type "john" into the actor filter; assert option "John Doe (john@example.com)" appears.
- Select the option; assert `GET /v1/admin/activity-events` is called with `actor_id=uuid-1`.
- Clear filters; assert `actor_id` is absent from the next events request.
