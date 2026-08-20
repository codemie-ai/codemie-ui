# Code review — 2026-08-20-epmcdme-14227-late-auth-callback (2026-08-20)

**request-changes** · confidence: medium · 1 blocking · 4 prior findings re-checked
Coverage: blind ✓ · edge-case ✓ · verification-gap — n/a (check round) · acceptance — n/a (check round)  (2/4 lenses ran)

## Fix-up status

- **CR-001 resolved** · **CR-003 resolved** · **CR-004 resolved** — all three verified against source at HEAD
- **CR-002 unresolved** — the fix closes the two headline paths but not the one the caller asked to be scrutinized

## Look here first

- `src/hooks/useAuthCallbackListener.ts:232` — [other: listener lifecycle] the retained-id exemption is safe on unmount, but once the hint-expiry rollback has already dropped the id from `trackedAuthConfigIds` no later cancel, `clearRows` or chat switch produces an untrack transition at all — retention and the 600 s acceptance timer survive unconditionally, so an abandoned flow still beacons `result:'timeout'` and `useChatAuthCallbacks` routes a late success at whichever chat is open rather than the originating one — CR-002

## Verified fixed

- `useAuthCallbackListener.ts:193` — the effect now calls `getAuthCallbackAcceptanceMs(resolvedHintMs)`; the dead `AUTH_CALLBACK_HINT_MS` export is gone and no other importer exists — CR-001
- `chatGeneration.promptAuth.test.ts:245` — substantive AC 6 chat pin: two distinct initiate calls, the consumed `auth_url` never reopened — CR-003
- `chatGeneration.ts:301` — one `isLateCallbackTarget` serves success and rollback per the user's explicit override of spec.md, pinned on both a rolled-back and an already-authenticated row — CR-004

## Checked and clean

commit-format ✓ · code-quality — n/a (no guide in repo) · security ✓ · no new high-risk finding from the confirmation pass
