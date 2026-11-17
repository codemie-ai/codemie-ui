# Let every manager share a hosted app (UI) — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Every hosted-app manager who gets `can_share` sees Share, the share dialog and the "Shared with" panel. The moderator-only "Revoke share link" menu item goes away. Assistant sharing does not change.

**Architecture:** Changes stay in the hosted presentation layer under `src/pages/applications/hosted/`. Access is still read only through the `hostedAccess.ts` helpers. The Shared-with panel is gated on `canShare` instead of `isCreator`. The access hint learns whether the viewer is the creator. `src/components/sharing/*` is left alone.

**Tech Stack:** React, TypeScript, Valtio, Vitest with React Testing Library.

Commit per task using the repository's existing convention.

Paths below are relative to `src/pages/applications/hosted/` unless they start with `src/`.

## Acceptance criteria

- [ ] AC1: A manager who is not the creator sees Share on the list entry, the page and the viewer. They can open the share dialog, add and remove people, and create, copy and revoke the link, no matter who added the person or created the link.
- [ ] AC2: On the app's page, a manager who is not the creator sees the "Shared with" panel listing everyone the app is shared with.
- [ ] AC3: A platform admin or maintainer has one way to revoke the link, from the share dialog. The app menu has no "Revoke share link" item.
- [ ] AC4: A person who cannot manage the app sees no Share and no "Shared with" panel.
- [ ] AC5: In the share dialog's people search, the creator is not offered. An API refusal is shown as an error message.
- [ ] AC6: The assistant share dialog looks and behaves exactly as before.

## Assumptions and decisions

- **Backend:** `manager-sharing-backend` sets `can_share` for every manager and moderator, and `sharable-users` leaves out the creator. Neither can be checked in this repo.
- **AC1:** Already met by the existing `canShare` gating (`hostedAccess.ts:23,68`, `HostedViewerActions.tsx:35`, `HostedSharePopup.tsx:79`). No task.
- **AC5:** No UI change. Excluding the creator is the backend's job. The existing `SharePopup` error toasts are the error message.
- **NG3 / AC6:** No edits under `src/components/sharing/*`.
- **Accepted gap:** A user who has `can_moderate` but not `can_share` has no way in the menu to revoke the link.

### Task 1: Remove the moderator "Revoke share link" menu item (AC3)

**Files:**
- Modify: `hostedAccess.ts:45,76-78`
- Modify: `useHostedCardActions.tsx:41,64,123-125,205-223`
- Test: `__tests__/hostedAccess.test.ts:111-119`
- Delete: `__tests__/admin-link-revoke.integration.test.tsx`

Test-first: yes — `hostedAccess.test.ts`: `hostedActions` returns no `revoke_link` for a moderator, whether `can_share` is true or false.

- [ ] Rewrite the test at `hostedAccess.test.ts:111-119` to assert that no action has key `revoke_link` for `{ can_moderate: true, can_share: false }` and for `{ can_moderate: true, can_share: true }`. Run `npx vitest run src/pages/applications/hosted/__tests__/hostedAccess.test.ts`. Expect a FAIL for the `can_share: false` case.
- [ ] Delete `'revoke_link'` from the `HostedActionKey` union (`:45`), and delete the comment and push at `:76-78`.
- [ ] In `useHostedCardActions.tsx`, delete the `revoke_link` member of the `Dialog` type (`:41`), the `ICONS.revoke_link` entry (`:64`), the `select` case (`:123-125`) and the confirmation modal block (`:205-223`). Remove any imports this leaves unused, such as the icon and the toast helper if nothing else uses them.
- [ ] Delete `__tests__/admin-link-revoke.integration.test.tsx`. Do not rewrite it.
- [ ] Re-run the test and expect PASS. Then run `npx tsc --noEmit -p .`. Expect no errors that mention `revoke_link`.

### Task 2: Show "Shared with" to every manager who can share (AC2, AC4)

**Files:**
- Modify: `HostedApplicationDetails.tsx:57-62,192-195`
- Modify: `HostedApplicationOverview.tsx:37-47` (docs only)
- Modify: `src/types/entity/hostedApplication.ts:73-76` (doc comment only)
- Test: `__tests__/HostedApplicationDetails.integration.test.tsx:266-271`

Test-first: yes — a non-creator manager with `can_share: true` sees the "Shared with" panel and `loadSharedWith` is called. A reader without `can_share` gets no panel and no call.

- [ ] Turn the test at `:266-271` ("hides Shared with from a manager who is not the creator") around. It should now render a non-creator manager with `can_share: true`, assert that the "Shared with" heading and the listed users appear, and assert that `loadSharedWith` was called. Add a test next to it for a reader (`user_abilities: ['read']`, `can_share: false`) that asserts no "Shared with" heading and no `loadSharedWith` call. Run `npx vitest run src/pages/applications/hosted/__tests__/HostedApplicationDetails.integration.test.tsx`. Expect the manager test to FAIL.
- [ ] In `HostedApplicationDetails.tsx`, add `const sharer = !!application && canShare(application)`, importing `canShare` from `./hostedAccess`. Pass it as `useSharedWith`'s `enabled` option. At `:192` use `sharedWith={sharer ? sharedWith.users : undefined}`. Leave `creator` alone: the "Created by you" line at `:120` still reads it. Change the `:58` comment to "Anyone who can share reads who the application is shared with."
- [ ] Rewrite the creator-only wording in the `sharedWith` and `hasGrants` prop docs (Overview `:37-47`) and in the `HostedApplication.shared` comment (`hostedApplication.ts:73-76`) so it says "people who can share (`can_share`)".
- [ ] Re-run the test file. Expect PASS, and the existing creator tests (`:247-264`, `:497`) still pass.

### Task 3: Non-creator wording for the access hint (AC2)

**Files:**
- Modify: `HostedApplicationOverview.tsx:58-70,135`
- Test: `__tests__/HostedApplicationDetails.integration.test.tsx` (near `:448-470`)

Test-first: yes — a non-creator manager with `can_share`, no grants, not shared with the project and not global sees "Only people who manage it can open this link until it is shared."

- [ ] Next to the creator access-hint tests (`:448-470`), add that case with `loadSharedWith` resolving to `[]`. Run the test file. Expect FAIL: the hint currently reads "Only you can open this link until you share it."
- [ ] Give `accessHint` a third parameter, `creator: boolean`. Change only line `:68` to `if (hasGrants === false) return creator ? 'Only you can open this link until you share it.' : 'Only people who manage it can open this link until it is shared.'`. At the call site (`:135`), pass `isCreator(app, userStore.user?.userId)`, which the file already uses at `:98`. Add no new prop and change no other branch.
- [ ] Re-run the test file. Expect PASS, and the existing creator hint tests are unchanged.

## Negative-constraint pass

- NG1 (no backend change): every task edits frontend files only.
- NG2 (no "who added"): no task adds attribution.
- NG3 / AC6 (shared share component unchanged): no task touches `src/components/sharing/*`. `useSharedWith` is only called with a different `enabled` value.
- AC4 (non-managers see no Share and no panel): Task 2 gates on `canShare` and adds the reader test. Share keeps its existing `canShare` gate.
- AC3 (the separate menu item is gone): Task 1. The share dialog's own revoke (`ShareLinkSection`) is not touched.
