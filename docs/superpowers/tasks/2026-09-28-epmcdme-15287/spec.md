# Spec: Focused-view Pinned section sorts by pin time, not activity

**Ticket:** EPMCDME-15287

## Problem

The chat sidebar has two view modes, Unified and Focused, each built by its own pure
view-model function in `src/pages/chat/components/ChatSidebar/ChatSidebarLists/`. Both
render a Pinned section, and both are meant to keep that section ordered by *when a chat
was pinned*, immune to the chat's own activity (`updateDate`) — that stability requirement
was already implemented and tested for Unified under EPMCDME-15009, backed by
`pinOrderStore` (`src/store/pinOrder.ts`), which is per-user, `storage`-persisted, and
already recorded/cleared/backfilled on every pin/unpin/delete/load path in
`src/store/chats.ts`. No store-layer change is needed.

Focused was never wired to it. `buildFocusedChatSidebarViewModel` (in
`focusedChatSidebarViewModel.ts`, line 126) sorts `pinnedChats` with
`sortChatsByMostRecent` — the same recency comparator used for `recentChats` and
`workflowChats` — so pinned chats visibly reorder whenever one of them is used. The
call site, `ChatSidebarLists.tsx` (lines 98–109), doesn't pass a pin-order map into the
Focused builder at all, unlike its Unified call four lines above (line 92), which already
does.

### Second defect: assistant replies silently unpin a chat

A related bug independently violates AC2 and was found during review, not in the
original ticket text. `chatGenerationStore._updateChatMetadata`
(`src/store/chatGeneration.ts:679-705`) returns `pinned: !!chat.pinned`, where `chat` is
`chatsStore.currentChat` — built by `transformChatBEtoFE` when the chat was opened, not
the response to the message just sent. `transformChatBEtoFE`
(`src/utils/chatHelpers.ts:30-66`) never maps any `pinned` field onto that `Conversation`
shape, so `chat.pinned` is always `undefined`, and `!!undefined` is `false` — a *defined*
value, not `undefined`. `chatsStore.updateChatListItem` (`src/store/chats.ts:743-753`)
only skips `undefined` fields when merging, so this `false` overwrites the chat's
locally-tracked `pinned` state on every assistant reply (`chatGeneration.ts:566-569`),
dropping the chat out of the Pinned section immediately — even though the backend still
has `pinned = true` — until the next full reload, when `getChats` returns `pinned: true`
straight from the backend and restores it (`pinOrderStore`'s backfill only affects pin
*order*, not the `pinned` flag itself). This is a second, independent way a pinned chat's
position changes on ordinary use, so fixing only the sort comparator would leave AC2
failing in this path.

## Approach

### 1. Focused-view sort (primary fix)

Mirror the Unified view's existing pattern into the Focused view, verbatim in shape:

1. Give `buildFocusedChatSidebarViewModel` a `pinOrder: Record<string, string> = {}`
   parameter (same position/default convention as `buildUnifiedChatSidebarViewModel`'s).
2. Replace the `sortChatsByMostRecent(collections.pinnedChats)` call with a shared
   pin-order comparator applied only to `pinnedChats` (see item 2 below for where it
   lives): for each chat, sort key is
   `getValidDateTimestamp(pinOrder[chat.id]) || getValidDateTimestamp(chat.updateDate, chat.date)`,
   descending. `recentChats` and `workflowChats` keep calling `sortChatsByMostRecent`,
   unchanged.
3. In `ChatSidebarLists.tsx`, pass `pinOrderStore.getPinOrder()` as the new argument to
   the Focused call, matching the existing Unified call exactly (including leaving the
   `useMemo` dependency array as-is, consistent with the Unified call's own memo, which
   likewise omits `pinOrderStore` from its deps).

No change to `pinOrderStore`, `chatsStore`, `focusedChatSidebarCollections.ts`'s pin
classification, or any rendering component — `FocusedChatSidebar`/`FocusedConversationSections`
already render `viewModel.pinnedChats` in array order with no re-sort, so the corrected
order flows through unchanged.

### 2. De-duplicate the pin-order comparator

`sortPinnedByPinOrder` currently exists only inside
`unifiedChatSidebarViewModel.ts` (lines 82-88), private to that file. Move it into the
shared `chatSidebarCollectionHelpers.ts` (alongside `sortChatsByMostRecent` and
`getValidDateTimestamp`, which it already depends on), export it from there, and have
both `unifiedChatSidebarViewModel.ts` and `focusedChatSidebarViewModel.ts` import that
single implementation instead of each defining or duplicating it. This is a required
part of this change, not an optional refactor — the two view-model files must not carry
two copies of the same comparator once Focused needs it too.

### 3. Fix `_updateChatMetadata`'s `pinned` clobber

Remove `pinned` from the object `_updateChatMetadata` returns
(`chatGeneration.ts:697-704`). The function has no reliable source for that field from
the backend response, so it must stop asserting one; the locally-tracked `pinned` value
already set by `pinChat`/`pinOrderStore` remains untouched by the merge in
`updateChatListItem`, since an absent key is no longer part of `definedUpdates`.

### Fallback and tie-breaking

A pinned chat with no `pinOrder` entry (a state that should be rare given the existing
`ensurePinOrder` backfill on load, but is reachable for any edge the backfill misses) falls
back to its own `updateDate`/`date` — the same fallback Unified already uses. This is a
direct precedent copy, not a new design choice.

## Non-goals

- No change to `pinOrderStore`'s persistence, recording, or backfill logic.
- No change to how a chat is classified into the Pinned section (`collectFocusedChats`).
- No change to `recentChats`, `workflowChats`, or any Focused-view group/folder sort —
  all remain on `sortChatsByMostRecent` per AC5.
- No change to the Unified view's own pin-order sort *behavior* — only where
  `sortPinnedByPinOrder` physically lives moves, per item 2 above; Unified's output is
  unchanged.
- No new Focused-view rendering-level integration test is required by this spec; it is
  optional coverage, not an acceptance criterion.
- **Pin order is `localStorage`-only.** `pinOrderStore` persists per-browser, per-device,
  via `storage` (not a backend field). There is no `pinned_at`/equivalent on the backend
  `Conversation`/`ChatBackend` shape, and no cross-device or cross-browser sync of pin
  order. AC4 ("consistent after page refresh") is satisfied within a single
  browser/device by this existing persistence; making pin order survive a different
  browser or device is out of scope for this ticket.
- No change to `transformChatBEtoFE` to add a backend-sourced `pinned` field — the fix in
  item 3 above only stops the frontend from overwriting its own locally-tracked value; it
  does not introduce a new backend-sourced source of truth for `pinned`.

## Testing

- Update the two now-incorrect tests in
  `src/pages/chat/components/ChatSidebar/__tests__/chatSidebarListsHelpers.test.ts`
  (`describe('buildFocusedChatSidebarViewModel')`, currently around lines 654–695) that
  assert date-based pinned order as expected output — they encode the bug and must be
  changed to reflect pin-order-based expectations, passing a `pinOrder` map through their
  existing call sites.
- Add a `describe('pinned section ordering')` block under
  `buildFocusedChatSidebarViewModel`, mirroring the existing one already covering
  `buildUnifiedChatSidebarViewModel` (same file, lines 311–435): pin-order-driven sort
  order, immunity to an `updateDate` change on a pinned chat, unpin removing an entry
  while preserving relative order of the rest, and fallback-to-`updateDate` when a pinned
  chat has no `pinOrder` entry.
- All other call sites of `buildFocusedChatSidebarViewModel` in the same test file that
  don't currently exercise pinned ordering can omit the new argument (it defaults to `{}`)
  unless they already assert something about `pinnedChats` order.
- After moving `sortPinnedByPinOrder`, re-run the existing Unified `pinned section
  ordering` tests unchanged — they assert behavior, not location, and must keep passing
  against the relocated implementation with no test edits required.
- Add a test asserting that sending a message in a pinned chat keeps it pinned: send a
  message against a chat whose local `ChatListItem` has `pinned: true`, and assert that
  after `_updateChatMetadata`'s result is merged via `updateChatListItem`, the chat's
  `pinned` value is still `true`. `src/store/__tests__/chatGeneration.avatarPersistence.test.ts`
  is the existing test file covering `_updateChatMetadata`'s merge behavior and is the
  natural home for this case.

## Acceptance criteria

1. `buildFocusedChatSidebarViewModel`'s Pinned section is ordered by `pinOrder[chat.id]`
   (most-recently-pinned first), not by `updateDate`/`date`.
2. Updating a pinned chat's `updateDate` does not change its position among other pinned
   chats, **and** sending a message in a pinned chat does not clear its `pinned` state
   (fix to `_updateChatMetadata`).
3. A newly pinned chat is positioned per the same pin-order comparator as existing pinned
   chats.
4. Because `pinOrderStore` is `storage`-persisted per user **within one browser/device**,
   order survives a page refresh with no additional work in this change; cross-device
   sync is explicitly out of scope.
5. `recentChats`, `workflowChats`, and all Focused-view groups/folders remain sorted by
   `sortChatsByMostRecent`, unchanged.
6. `sortPinnedByPinOrder` exists once, in `chatSidebarCollectionHelpers.ts`, imported by
   both `unifiedChatSidebarViewModel.ts` and `focusedChatSidebarViewModel.ts` — no
   duplicate implementation remains in either view-model file.
