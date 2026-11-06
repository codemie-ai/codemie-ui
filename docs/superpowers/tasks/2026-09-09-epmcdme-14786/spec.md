# EPMCDME-14786: Share Assistant with Selected Users

**Status**: Draft  
**Generated**: 2026-09-09  
**Complexity**: M (15/36) — 2-3 days

---

## Goal

Allow assistant owners to share their assistant with specific internal users. Recipients gain read-only access (can use but not edit); shared assistants appear in their visible assistant lists. A Share action appears in the existing owner-gated action menu; clicking it opens a modal with a user search chip-input and a live list of people who currently have access.

---

## Background

The backend already implements four endpoints:

- `GET /v1/assistants/{id}/shared-with` — list users currently granted access
- `POST /v1/assistants/{id}/share` — grant access (`body: { user_ids: [] }`)
- `DELETE /v1/assistants/{id}/share` — revoke access (`body: { user_ids: [] }`)
- `GET /v1/assistants/{id}/sharable-users?q=<query>` — search eligible internal users

No frontend changes exist yet. The existing `shared: boolean` field on `Assistant` is an unrelated marketplace/project visibility flag and must not be confused with per-user sharing.

---

## Requirements

### Share Action Entry Point

- A "Share" action item is added to `AssistantActions` (`src/pages/assistants/AssistantActions/AssistantActions.tsx`).
- Visibility: `canEdit(assistant)` — same gate used for Edit, Publish, Unpublish (`src/utils/entity.ts`).
- Because `AssistantActions` renders in three places (`AssistantDetailsActions`, `AssistantGrid`, `FavoritesPage`), all three surfaces gain the Share button with no additional changes.
- Clicking Share opens `ShareAssistantPopup` with the current assistant.

### Share Assistant Popup

The modal is a new component `ShareAssistantPopup` under `src/pages/assistants/components/ShareAssistantPopup/`.

**Header**: "Share for Collaboration"

**Body — user search chip-input**:
- Uses `MultiSelect` (`src/components/form/MultiSelect/MultiSelect.tsx`) with `display="chip"`.
- `onFilter` triggers a debounced call (300 ms, cleaned up on unmount) to `getSharableUsers(assistant.id, query)`.
- Dropdown options are populated from search results; each option shows name and email.
- Selected items appear as chips inside the input; removing a chip deselects the user.
- The dropdown is empty until the user types (no default list on open).
- Users already in the "People With Access" list must not appear in search results (filter on the client side by ID after the API call, or rely on backend exclusion — the spec does not mandate which).

**Body — People With Access list**:
- Populated by `getSharedWith(assistant.id)` on every modal open (no cache).
- Each row: `Avatar` or `UserAvatar` component + display name + email + Remove button.
- Clicking Remove marks the user for removal locally (the row disappears immediately from the list). No API call fires until Share is clicked.
- The owner is never expected to appear in this list; if the backend returns them, the frontend filters them out by matching against the current user's ID.

**Footer — Cancel and Share buttons**:
- Cancel closes the modal without any API calls; any local changes (chips, removed users) are discarded.
- Share fires:
  - `shareWith(assistant.id, selectedUsers.map(u => u.id))` if `selectedUsers` is non-empty.
  - `removeShare(assistant.id, removedIds)` if any users were removed from the list.
  - Calls can be dispatched in parallel.
  - On success: close modal; optionally show a success toast.
  - On failure: show an error toast; keep the modal open so the user can retry. Do not attempt a partial rollback.
- While saving: Share button shows a loading/spinner state and both footer buttons are disabled.
- Share button is disabled when `selectedUsers` is empty AND `removedIds` is empty (nothing to save).

---

## Type Interfaces

New interfaces in `src/types/entity/sharing.ts`:

```ts
export interface SharedWithUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

export interface SharableUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
}
```

These types cover the API response shapes for both sharing endpoints. `UserListItem` (`src/types/entity/user.ts`) overlaps but is not used here to avoid coupling the sharing feature to a broader user management type.

---

## Store Methods

Four new async methods added to `src/store/assistants.ts` (Valtio proxy pattern):

| Method | Endpoint | Notes |
|---|---|---|
| `getSharedWith(id)` | `GET /v1/assistants/{id}/shared-with` | Returns `SharedWithUser[]` |
| `shareWith(id, userIds)` | `POST /v1/assistants/{id}/share` | Body: `{ user_ids: userIds }` |
| `removeShare(id, userIds)` | `DELETE /v1/assistants/{id}/share` | Body: `{ user_ids: userIds }` — no `.json()` call on response unless backend confirms a body |
| `getSharableUsers(id, query)` | `GET /v1/assistants/{id}/sharable-users?q=query` | Returns `SharableUser[]` |

All four follow the existing store pattern: `api.get/post/delete(url, body?)` — no direct `api.*` calls from the component.

---

## Acceptance Criteria

1. The Share action appears in the assistant action menu for owners (users with `ABILITIES.WRITE` on the assistant) on all three surfaces: assistant grid cards, assistant detail view, favorites page.
2. The Share action is not visible to non-owners.
3. Opening the modal fetches and displays the current list of users with access.
4. Typing in the chip-input searches users via `/sharable-users`; results appear as dropdown options.
5. Selecting a user from the dropdown adds them as a chip; removing the chip deselects them.
6. Removing a user from the People With Access list marks them for removal; the row disappears immediately.
7. Clicking Share fires `POST /share` for newly selected users and `DELETE /share` for removed users; the modal closes on success.
8. A failure toast is shown on API error; the modal stays open.
9. Clicking Cancel closes the modal without any API side effects.
10. The Share button is disabled when there are no pending adds or removes.
11. Footer buttons are disabled while the save is in progress.

---

## Non-Goals

- Editing or revoking the owner's own access to the assistant.
- Sharing with users outside the organisation (external sharing).
- Changing the permission level of an already-shared user (e.g., promoting from READ to WRITE).
- Bulk-share from a multi-assistant selection view.
- Real-time updates to the "People With Access" list while the modal is open (no WebSocket/polling).
- Email notifications to recipients when they are granted access.
- Tests for `ShareAssistantPopup` (matching the zero-test posture of comparable popups; add if explicitly requested).
- Changes to the `shared: boolean` field or marketplace visibility logic.
- Modifying the nginx config, Dockerfiles, or build pipeline.

---

## Decisions Made

- **Batch save over live-apply**: adds and removes are staged locally and applied on "Share" click, not immediately on chip/remove action. Consistent with modal UX; avoids partial-state API calls.
- **No cache for shared-with list**: fetched fresh on every modal open. Simple and correct; caching would require invalidation logic not justified at this scale.
- **Empty search until user types**: `/sharable-users` is not called on open. Avoids loading potentially large user lists unnecessarily.
- **Client-side owner filter**: if the backend returns the owner in `shared-with`, the frontend filters them out. Guard is cheap; backend behavior is not specified.
- **Error handling: toast, modal stays open**: non-destructive; user can retry without re-entering their selections.
- **`sharing.ts` as separate type file** over inlining in the component: keeps types discoverable and reusable if a second sharing surface appears.
- **`canEdit(assistant)` for Share gate** over a dedicated `canShare` check: no separate ability exists in the backend spec; `WRITE` ability is the correct proxy for ownership.

---

## Open Risks

- `AssistantActions.accessibility.test.tsx` may assert on a specific set of action items — adding Share could break it. Verify before merging.
- `mock-server/db.json` has uncommitted changes; adding mock routes for the four new endpoints needs manual coordination to avoid conflicts.
- DELETE with body (`removeShare`) is an uncommon HTTP pattern; verify the mock server supports it before assuming correctness.
- The backend does not specify whether `/sharable-users` excludes already-shared users from results — if it does not, the frontend must filter them client-side.
