# Spec: Fix chat-skills storage shape mismatch causing /model 422 (EPMCDME-14520)

## Problem

`chatGeneration.ts`'s new-chat branch writes bare skill-id strings (`string[]`) into the same
localStorage slot (`chatSkillsKey(chatId)`) that `useChatConfiguration.tsx` reads/writes as
`SkillOption[]` (`{value, label, description?}`). After navigating away and back, the reload effect
reads the corrupted entry, each element's `.value` is `undefined`, and the next `/model` request
sends `skill_ids: [null]` → 422.

A second, coupled bug: `chatsStore.startNewChat()` sets `currentChat.id = ''` for a not-yet-created
chat. `handleSetSelectedSkills`'s guard `if (chatId && userId)` treats `''` as falsy, so skills
picked before the first message never persist anywhere — the wrong-shape write above is currently
the *only* thing that persists them at all, which is why simply deleting that write would silently
regress "skills picked on a brand-new chat survive a remount."

A third, related race: `src/utils/chatStorageUtils.ts:98` `sweepOrphanedChatKeys(userId,
validChatIds)` exists on this branch and is wired into `chatsStore.getChats()` at
`src/store/chats.ts:190`. Its existence-sweep branch (`chatStorageUtils.ts` lines 109-125) deletes
any `chatSkillsKey(chatId)` entry whose extracted `chatId` is not present in `validChatIds`. Because
`''` is never a real chat id, it is never in `validChatIds`, so a `chatSkillsKey('')` entry is always
"orphaned" from this sweep's point of view. `createChatGeneration`'s new-chat branch
(`chatGeneration.ts` lines 436-450) calls `await chatsStore.createChat()` before the real id is used;
`createChat()` (`src/store/chats.ts:354`), when the user's chat list is empty (first-ever chat, or
first chat after deleting all others), fires an un-awaited `chatsStore.getChats()` (line 373) that
runs `sweepOrphanedChatKeys` with a real, populated `validChatIds` list — this can delete the
`chatSkillsKey('')` entry before step 3's migration (in the reload effect) ever gets a chance to read
it. This only affects a user's very first-ever chat, or their first chat after deleting all others —
the empty-chat-list branch is what fires the un-awaited `getChats()`.

This is a revision of a prior spec draft, following reviewer feedback to minimize blast radius and
align with the prior-investigation plan at `~/codemie-dev/EPMCDME-14520_plan.md` (option 3,
refined) rather than the read-path shape filter the previous draft added. Design source: that plan
file, corrected on one point verified directly against current source rather than trusted from the
plan: the plan assumed `sweepOrphanedChatKeys` had been reverted from this branch. It has not — it is
present and wired in as described above — so the race it creates against the `''`-sentinel key is
real and is addressed as step 4 below, not waved off as already-removed. `superpowers:brainstorming`
was not re-invoked for this revision; this is a narrow, fully-specified addition to an
already-approved-in-substance design, confirmed against source rather than against the plan file.

## Approach

1. **Delete the wrong-shape write.** Remove `saveChatSkills(userId, newId, skillIds ?? [])` from
   `createChatGeneration`'s new-chat branch in `src/store/chatGeneration.ts`. `chatGeneration.ts`
   never holds `SkillOption[]`, only the bare wire-format `string[]` — it should not write to
   `chatSkillsKey(...)` at all. The `skill_ids: skillIds?.length ? skillIds : undefined` line for
   the `/model` payload is untouched.
2. **Fix the `''`-guard.** In `useChatConfiguration.tsx`, change `handleSetSelectedSkills`'s guard
   from `if (chatId && userId)` to `if (chatId !== undefined && userId)`, so `chatId === ''` (a
   brand-new, not-yet-created chat) is treated as a valid temporary key. This makes skills picked
   before the first message persist under `chatSkillsKey('')`.
3. **Migrate the `''` entry to the real id, in the reload effect.** In the effect keyed on
   `currentChat?.id`, `currentChat?.isWorkflow`, `closeConfigForm`: once `currentChat?.id` is a real
   (non-empty) id, read any `chatSkillsKey('')` entry; if non-empty, save it under the real id's key
   and remove the `''` entry; then load `selectedSkills` from the (now-migrated) real key as normal.
   Keep this migration in this one effect only — do not duplicate it in `chatGeneration.ts` or
   elsewhere.
4. **Harden `sweepOrphanedChatKeys` to never delete the `''`-sentinel key.** In the existence-sweep
   branch (`chatStorageUtils.ts` ~lines 116-123), when a key's extracted `chatId` is `''`, skip the
   delete for that key instead of treating it as orphaned. `''` is a known sentinel/placeholder for
   a not-yet-created chat, not a stray id to sweep by `validChatIds` membership. This is a one-line
   guard added to the existing condition, in the one function that owns this sweep logic — no new
   file, no new exported helper, and no change to the empty-value sweep branch (lines 127-132), which
   is unrelated: it sweeps by content, not by chat-id prefix-matching against `validChatIds`, so it
   does not have this problem. Without this guard, step 2/3's persistence-then-migration path for a
   user's first-ever chat (or first chat after deleting all others) can lose the `''` entry to this
   sweep before the migration in step 3 ever runs — see Problem, third paragraph.
5. **Minimal shape guard on `loadChatSkills`, scoped only to what AC2/AC3 require.** Steps 1-4 stop
   *new* corruption from being written, but `storage.get` (`src/utils/storage.ts:16-19`) is a bare
   `JSON.parse` with no shape check, so any entry already on a returning user's browser from before
   this fix ships (or any other future malformed write) still flows through unfiltered into
   `.map(s => s.value)` → `undefined` → `null` in the wire payload. That is a live gap against AC2
   ("never send `skill_ids` containing null/undefined") and AC3 ("exclude invalid/malformed skill
   entries gracefully"), so it cannot be dropped to shrink the diff — it is the smallest change that
   still meets those two criteria.
   Add one inline filter at the `loadChatSkills` read site in `useChatConfiguration.tsx`, following
   the existing `isDefaultToolsConfig`/`isEmptyChatValue` parse-and-check convention already in
   `chatStorageUtils.ts` (plain predicate function, no new exports, no new file): drop any array
   element that is not an object with a non-empty string `.value`. This is a shape guard against
   already-corrupted storage, not a live catalog-existence check — checking selected skills against
   the paginated skills-search fetch (`useChatConfigSkills`, `SKILLS_DROPDOWN_LIMIT`) is explicitly
   out of scope (see Non-goals): "not in the current fetch page" cannot be distinguished from "valid
   but on another search page," so no oracle for server-side deletion is built here.
6. Leave `ChatGenerationOptions` and `/model`'s `skill_ids` wire-payload construction untouched, per
   the plan's explicit non-goals. Leave `sweepOrphanedChatKeys`'s call sites and its `getChats()`
   await-ordering untouched — step 4 is a one-line guard inside the function's existing logic, not a
   change to when or how it is invoked.

## Testing

- `chatGeneration.ts` new-chat branch: assert `saveChatSkills`/storage `put` is never called from
  `createChatGeneration` (update/replace whatever test currently asserts the opposite, e.g.
  `chatGeneration.storageGuards.test.ts`).
- `handleSetSelectedSkills` with `currentChat.id === ''` persists under `chatSkillsKey('')`.
- Reload effect: a `chatSkillsKey('')` entry is migrated to the real id's key and removed once
  `currentChat.id` transitions from `''` to a real id; transitioning with nothing at `''` is a no-op
  (no throw, no spurious empty entry).
- `sweepOrphanedChatKeys`: a `chatSkillsKey('')` entry survives a sweep call with a real, populated
  `validChatIds` list that does not (and cannot) contain `''`; a `chatSkillsKey(<realId>)` entry not
  in `validChatIds` is still deleted as before (no regression to the existing sweep behavior for real
  ids).
- `loadChatSkills` shape guard: an entry containing bare strings or objects missing `.value` is
  filtered out rather than passed through.
- Integration regression test (real `chatsStore`/Valtio/`localStorage`, mocked `@/utils/api` only,
  per `vitest.workspace.ts`'s `integration` project — the `unit` project globally mocks
  `@/utils/storage`, per prior investigation, and would test the wrong thing): new chat → select
  skill(s) → send first message → remount the hook against the same `currentChat` (simulates
  Assistants navigation) → assert `selectedSkills` still holds the picked skill(s) and the second
  `/model` request's `skill_ids` contains only valid, non-null string ids. Cover this specifically
  for the first-ever-chat case (empty chat list before creation), since that is the only case where
  `createChat()`'s un-awaited `getChats()` fires a sweep with a populated `validChatIds`.

## Acceptance criteria

- Selected skills persist correctly across navigate-away-and-back, including for a brand-new chat.
- Selected skills persist correctly for a user's very first-ever chat (or first chat after deleting
  all others) — the case where `sweepOrphanedChatKeys` runs against a populated `validChatIds` during
  chat creation.
- `/model` requests never contain `null`/`undefined` in `skill_ids`.
- Malformed/invalid stored skill entries are excluded from the request, not surfaced as `null`.
- Continuing a chat with previously selected skills after visiting Assistants works without a 422.
- Regression test covers the full new-chat → skills → navigate → return → send flow, including the
  first-ever-chat/empty-chat-list variant.

## Non-goals

- No fix to the identical `chatId`-falsy guard in `handleSetDynamicToolsConfig` or
  `handleSetHideToolOutputs` (note as a follow-up only).
- No change to `ChatGenerationOptions` or any other shared type.
- No change to how the `/model` `skill_ids` wire payload itself is constructed.
- No other changes to `sweepOrphanedChatKeys`'s behavior or call sites beyond the one-line `''`
  guard in its existence-sweep branch — no new call sites, no change to the empty-value sweep
  branch, and no `getChats()` await-ordering change.
- No live catalog-existence check for selected skills against the paginated skills-search fetch.

## Open risks

- None outstanding for the scenarios covered above. The first-ever-chat race between
  `createChat()`'s un-awaited `getChats()` sweep and the `''`-sentinel key (see Problem, third
  paragraph) is resolved by design via step 4's guard, not merely flagged — it is covered by an
  explicit test (see Testing).
- Any other, not-yet-identified caller that constructs a `chatSkillsKey('')`-shaped key outside the
  paths audited here is out of scope; none is known to exist.
