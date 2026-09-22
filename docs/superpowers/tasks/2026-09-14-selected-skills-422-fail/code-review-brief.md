# Code review — 2026-09-14-selected-skills-422-fail (2026-09-14)

**approve** · confidence: high · 0 blocking · 2 resolved
Coverage: targeted verifier ✓ (2/2 prior blocking findings graded)

## Resolved

- `src/store/chats.ts:351` — [state] CR-001 cross-chat leak: `startNewChat` now clears the `""` sentinel via `storage.remove(userId, chatSkillsKey(''))` before arming the new placeholder chat, mirroring `premiumModelTipStore.clearPendingDismissals()`. New test asserts `storageRemove` called with the sentinel key.
- `src/utils/chatStorageUtils.ts:49` — [state] CR-002 stale-data leak: `saveChatSkills` now calls `storage.remove` instead of no-op'ing when `skills.length === 0`. New test asserts `storage.remove` called and `storage.put` not called.

## Checked and clean

commit-format ✓ · security ✓ · code-quality na (no guide) — carried forward from the prior verdict, unchanged this round.
