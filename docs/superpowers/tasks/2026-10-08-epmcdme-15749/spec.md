# Spec — Share dialog MR review fixes (EPMCDME-15749)

Child of EPMCDME-14786. All design decisions below were settled by the story owner
(a3/a5/a10/a11/a12/a19/a20); this spec carries them into one coherent change set.

## Problem

The assistant Share flow has nine review findings: it gates on edit rights instead of
ownership, swallows access-list load errors, fires requests on 1-character search input,
double-toasts failures, mislabels the dialog, hides the project-share status from
non-owners, and omits accessible names on Remove buttons. Non-owners currently trigger an
owner-only fetch (`/shared-with`) and can see it 403.

## Design

**Ownership helper.** Add `isOwner(assistant): boolean` to `src/utils/entity.ts`, reading
`assistant.created_by?.id === userStore.user?.userId`. This is the exact check already used
ad hoc at `AssistantDetailsSidebarSections.tsx:186`; centralizing it removes the duplicate
and gives every gating site below one source of truth. (No separate `creator` field exists
on `Assistant` in this codebase — "creator fallback" in the analysis refers to the backend's
naming across entities, not a second client-side field to check.)

**Gating on ownership, not `canEdit`.**
- `AssistantActions.tsx`: the `share` action's `isVisible` switches from `canEditAssistant` to
  `isOwner(assistant) && isUserManagementEnabled()` (AC#1, AC#2). `edit`/`clone`/`delete`/
  `publish` keep using `canEdit`/`canDelete` — those abilities are correct for those actions
  and out of scope here.
- `ShareAssistantPopup.tsx`: the `getSharedWith` fetch in the `visible && assistant` effect
  only runs when `isOwner(assistant)` — but since the popup is now only ever opened via the
  gated Share action, this is a defensive second gate, not new plumbing.
- `AssistantDetailsSidebarSections.tsx`: the `getSharedWith` effect (lines 93-103) gates on
  `isOwner(assistant)`; when false, `sharedWith` stays `[]` and the "SHARED WITH" section does
  not render (AC#11). This is the sidebar fetch a20 and AC#1/AC#11 both target.

**Access-list load error with Retry (a12, AC#3).** `assistantsStore.getSharedWith` currently
catches and returns `[]`, hiding failures. Change it to let the error propagate (drop its
try/catch; keep the `shared_with`-vs-flat-array unwrap). In `ShareAssistantPopup`, track a
`loadError: boolean` state. On fetch failure, set it, show an inline error message with a
"Retry" button that re-runs the same fetch, and keep the "People With Access" list and Remove
buttons inert (not rendered, or rendered disabled) until a load succeeds. Search and Add stay
usable — the story only blocks editing the *existing* access list, not discovering new users
to add once connectivity recovers.

**Search floor (a3, AC#4).** `handleFilter` already debounces 300ms; add a length guard so a
query under 2 characters clears `searchOptions` and returns before scheduling the debounced
request (mirrors the existing `!query` early return).

**No client-side disabling for personal integrations (a5).** Do not add any check against
integration type to the Share action's visibility or the dialog. The backend is the sole
enforcer; the UI's job is to surface what it says.

**Backend rejection surfacing (a5, AC#5, AC#6).** The API layer already normalizes every
error body to `{ error: { message, details?, help? } }` (`utils/api.ts` `ErrorBody`,
`parseErrorBody`) and attaches it to the rejected response/`HttpError` as `.parsedError`. No
new parsing is needed — both sites below read `err.parsedError?.message` with a generic
fallback string, so this works regardless of the exact wording the backend child story ships.
- `ShareAssistantPopup.handleShare`: on a `shareWith` rejection, show the backend's message as
  inline dialog text (not just a toast) above the footer, and do not close the dialog — remove
  the current unconditional `onHide()`-on-success-only path's implicit "any failure might still
  look recoverable" ambiguity by explicitly keeping `visible` controlled by the parent and
  leaving `selectedUsers` untouched so the user can retry or adjust the recipient list.
- `AssistantForm.handleFormSubmit`: when `handleMissingIntegrationsSubmit` returns
  `{ error, success: false }` for a save rejected because a personal integration was added
  while named grants exist, render that message inline on the form (reuse the existing
  `result.error` value — add inline display alongside, or instead of, the current
  `toaster.error`) and do not reset/clear any field. The function already skips
  `blockTransition()` reset when `!result.success`, so edits already survive; this item is
  about making the message visible on the form, not losing data.

**Single error toast (a20, AC#7).** `shareWith` and `removeShare` in `store/assistants.ts`
don't pass `skipErrorHandling: true`, so `utils/api.ts`'s global `handleError` toasts once and
the popup's own `catch` toasts again. Add `skipErrorHandling: true` to both calls (matching
the convention already used by `getSharedWith`), leaving the popup's existing catch-toasts as
the single source.

**Copy (a19, AC#8).** `ShareAssistantPopup`'s `Popup` `header` prop changes from `"Share for
Collaboration"` to `"Share assistant"`. Add a subtitle "Can chat and view setup; cannot edit"
immediately under the header (check `Popup`'s props for a subtitle/description slot; if none
exists, render it as the first child inside the content `div`).

**Project-share status for non-owners (a19, AC#9).** `StatusLabel.tsx` line 65's
`if (statusType !== StatusType.GLOBAL && !isOwned) return null` currently hides
"Shared with project"/"Not shared with project" from everyone but the owner. Change the guard
so it only suppresses the label when the status is specifically about *collaborator* sharing
context the viewer has no stake in — concretely: remove the `!isOwned` suppression entirely
for `SHARED`/`NOT_SHARED` statuses, since those describe the assistant's project-visibility,
which is meaningful to any project member, not just the owner. `isOwned` continues to decide
*which* text/icon (`OWNED` vs `NOT_SHARED` map to the same copy already) — no caller change
needed in `AssistantCard`, since `isOwned`/`isShared` are already passed in from existing
props.

**Remove button accessible name (a20, AC#10).** In `ShareAssistantPopup`, add
`aria-label={`Remove ${user.name}`}` to each row's Remove `Button`.

## Non-goals

- a11: Add/Remove staging — Add stays batched behind Save, Remove still fires immediately.
  Not touched.
- Disabling the Share action up front for assistants with personal integrations. The backend
  rejects; the UI only surfaces that rejection.
- a21 ACS parity: five-grade permission selector, pinned owner/project rows, FR-32 chip,
  atomic save. None of this exists today and none is added.
- Per-user sharing indicators on assistant cards.
- Any change to `canEdit`/`canDelete`-gated actions (Edit, Clone, Delete, Publish/Unpublish).
  Only the Share action's gate moves to ownership.
- Inventing a specific backend error code/shape for the three new rejection kinds. The design
  reads a generic `message` field already supported end-to-end; if the backend child ships
  something richer (an error code to drive different UI treatments per rejection kind), that
  is a follow-up, not blocking this change.
- Changing `getSharableUsers`' or `getConfig`'s own error handling beyond what's listed above.

## Testing

Existing suites to update rather than rewrite: `ShareAssistantPopup.test.tsx` (retry flow,
2-char floor, single toast, aria-label, title/subtitle), `StatusLabel.test.tsx` (non-owner
project-member visibility), `AssistantDetailsSidebarSections` tests (no fetch for non-owner),
`AssistantActions.accessibility.test.tsx` (Share visibility now ownership-driven). Add cases
for: owner + user-management-disabled hides Share; non-owner triggers zero sharing fetches;
backend rejection message rendering in popup and form while preserving dialog/form state.

## Backend contract (resolved)

The sibling backend story (EPMCDME-15748) has shipped on `codemie` (handoff complete). Verified
directly against `src/codemie/rest_api/routers/assistant.py:921-925` and
`src/codemie/service/assistant/assistant_share_service.py:61-66`: both rejections use the
standard `ExtendedHTTPException(code=400, message=...)` shape already covered by this spec's
generic `err.parsedError.message` read — no spec change needed.

- Grant rejection (share, personal integration): *"Assistant uses a personal integration and
  cannot be shared with users. Replace personal integrations with project integrations before
  sharing."*
- Save rejection (update, personal integration added while named grants exist): *"Personal
  integrations cannot be used in a shared assistant. Remove sharing first, or switch to project
  integrations."*
- User-management-disabled gate reuses the existing `_USER_MGMT_NOT_ENABLED` constant/message
  from `user_management_router.py`, same `ExtendedHTTPException` shape.
