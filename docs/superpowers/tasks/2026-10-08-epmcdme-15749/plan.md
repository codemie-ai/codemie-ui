# Share Dialog MR Review Fixes (EPMCDME-15749) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the nine MR review fixes to the assistant Share flow: ownership-based gating, access-list error/retry, 2-char search floor, backend-rejection surfacing, single toast, dialog copy, project-member status visibility, and Remove button labels.

**Architecture:** Add one centralized `isOwner()` helper in `src/utils/entity.ts` and thread it through the three gating sites (`AssistantActions`, `ShareAssistantPopup`, `AssistantDetailsSidebarSections`). Everything else is a local, independent fix inside the file the spec names for it. No new components, no new store shape beyond dropping a try/catch.

**Tech Stack:** React 18, TypeScript, Valtio, Vitest + RTL.

**Spec:** `docs/superpowers/tasks/2026-10-08-epmcdme-15749/spec.md`

Commit per task using the repository's existing convention.

## Global Constraints

- Ownership check is `assistant.created_by?.id === userStore.user?.userId` — no second `creator` field exists on `Assistant`.
- Do not touch `canEdit`/`canDelete` gating on Edit/Clone/Delete/Publish/Unpublish — only Share's gate moves.
- Do not add any personal-integration check to Share's visibility or the dialog — backend is sole enforcer.
- Read backend rejection messages via `err.parsedError?.message` with a generic fallback string; do not hardcode the backend's exact wording.
- Dialog header becomes "Share assistant"; subtitle "Can chat and view setup; cannot edit".

## Review Focus

- A `getSharedWith` rejection with no `.message` on `parsedError` (network error, non-JSON body) must still show the Retry UI, not throw past the component.
- Typing 2 chars then quickly deleting to 1 char before the debounce fires must still clear `searchOptions` (guard checks the query at schedule time, not just the floor case alone).
- `handleShare` rejection must leave `selectedUsers` and `visible` exactly as before the click, so Cancel/retry both still work.
- A non-owner opening `AssistantDetailsSidebarSections` for an assistant they do not own must trigger zero `getSharedWith` calls, not just render nothing after a wasted fetch.
- `StatusLabel` for a `GLOBAL` assistant must keep rendering regardless of `isOwned`, since the guard change only concerns `SHARED`/`NOT_SHARED`.

---

### Task 1: `isOwner` helper

**Files:**
- Modify: `src/utils/entity.ts` (add export after `canView`, L41-43)
- Test: `src/utils/__tests__/entity.test.ts` (create if absent, else append)

**Interfaces:**
- Produces: `isOwner(assistant: { created_by?: { id?: string } }, userId?: string): boolean`

Test-first: yes — failing test asserts `isOwner({ created_by: { id: 'u1' } }, 'u1')` is `true` and `isOwner({ created_by: { id: 'u1' } }, 'u2')` is `false`, and `isOwner({}, 'u1')` is `false`.

- [ ] Step 1: Write the failing test above (new file or appended describe block).
- [ ] Step 2: Run it, confirm it fails with "isOwner is not a function" or import error.
- [ ] Step 3: Implement:
```ts
export const isOwner = (
  assistant: { created_by?: { id?: string } },
  userId?: string
): boolean => {
  return !!userId && assistant.created_by?.id === userId
}
```
- [ ] Step 4: Run test, confirm PASS.
- [ ] Step 5: Commit.

---

### Task 2: Gate Share action on ownership + user management

**Files:**
- Modify: `src/pages/assistants/AssistantActions/AssistantActions.tsx:33` (import `isOwner` alongside `canDelete`, `canEdit`), `:82` (keep `canEditAssistant`), `:118` (`share` action's `isVisible`)
- Modify: imports to add `isUserManagementEnabled` from `@/utils/featureFlags`, `userStore` from `@/store/user`
- Test: `src/pages/assistants/AssistantActions/__tests__/AssistantActions.accessibility.test.tsx` (or sibling test file covering `assistantActions` visibility — locate via existing suite)

**Interfaces:**
- Consumes: `isOwner` from Task 1, existing `isUserManagementEnabled()` (`src/utils/featureFlags.ts:81`).

Test-first: yes — failing test: owner + user management enabled → Share item visible; owner + user management disabled → Share item absent; non-owner (any `canEdit` value) → Share item absent.

- [ ] Step 1: Add the three cases above to the existing accessibility/actions test, mocking `userStore.user.userId` and `isUserManagementEnabled`.
- [ ] Step 2: Run the test file, confirm the new cases fail (Share still gated on `canEditAssistant`).
- [ ] Step 3: Change line 118's `isVisible: canEditAssistant` to `isVisible: isOwner(assistant, userStore.user?.userId) && isUserManagementEnabled()`. Leave `edit`/`clone`/`delete`/`publish`/`unpublish` untouched.
- [ ] Step 4: Run the test file, confirm PASS.
- [ ] Step 5: Commit.

---

### Task 3: Gate sidebar `/shared-with` fetch on ownership

**Files:**
- Modify: `src/pages/assistants/components/AssistantDetails/components/AssistantDetailsSidebarSections.tsx:93-103`
- Test: existing `__tests__` file for this component (find via `src/pages/assistants/components/AssistantDetails/components/__tests__/`)

**Interfaces:**
- Consumes: `isOwner` from Task 1.

Test-first: yes — failing test: non-owner viewing the sidebar triggers zero `assistantsStore.getSharedWith` calls; owner still triggers one and the section renders with results.

- [ ] Step 1: Add both cases to the existing test file, mocking `userStore.user.userId` against an assistant's `created_by.id`.
- [ ] Step 2: Run, confirm the non-owner case fails (fetch still fires).
- [ ] Step 3: Wrap the effect body: `if (!isOwner(assistant, userStore.user?.userId)) { setSharedWith([]); return }` before the existing `getSharedWith` call at line 97; import `isOwner` and `userStore`.
- [ ] Step 4: Run, confirm PASS.
- [ ] Step 5: Commit.

---

### Task 4: Project-member visibility in `StatusLabel`

**Files:**
- Modify: `src/pages/assistants/components/AssistantList/AssistantCard/StatusLabel.tsx:65-67`
- Test: `src/pages/assistants/components/AssistantList/AssistantCard/__tests__/StatusLabel.test.tsx`

Test-first: yes — failing test: `isOwned=false, isShared=true` renders "Shared with project"; `isOwned=false, isShared=false` (non-global) renders "Not shared with project"; `isOwned=false` with `is_global` assistant still renders the global uses text (unchanged).

- [ ] Step 1: Add the three cases to the existing suite.
- [ ] Step 2: Run, confirm the two non-owner `SHARED`/`NOT_SHARED` cases fail (component returns null).
- [ ] Step 3: Replace the guard `if (statusType !== StatusType.GLOBAL && !isOwned) { return null }` with `if (statusType === StatusType.OWNED && !isOwned) { return null }` — this is unreachable in practice (`getStatusType` only returns `OWNED` when `isOwned` is true) but preserves the original "collaborator has no stake" intent for any future caller passing `isOwned=false` with no `isShared` flag; the real behavior change is that `SHARED`/`NOT_SHARED` no longer hit the early return at all.
- [ ] Step 4: Run, confirm PASS.
- [ ] Step 5: Commit.

---

### Task 5: Access-list load error with Retry

**Files:**
- Modify: `src/store/assistants.ts:1135-1148` (drop the try/catch in `getSharedWith`)
- Modify: `src/pages/assistants/components/ShareAssistantPopup/ShareAssistantPopup.tsx:81-97` (add `loadError` state, Retry UI, re-run on retry)
- Test: `src/pages/assistants/components/ShareAssistantPopup/__tests__/ShareAssistantPopup.test.tsx`

**Interfaces:**
- Produces: `ShareAssistantPopup` internal state `loadError: boolean`; a `loadSharedWith()` function the effect and the Retry button both call.

Test-first: yes — failing test: `getSharedWith` rejects → popup shows an error message and a "Retry" button, "People With Access" list is not rendered, Search/Add stay enabled; clicking Retry re-calls `getSharedWith` and on success shows the list.

- [ ] Step 1: Add the test (mock `mockStore.getSharedWith.mockRejectedValueOnce(new Error('x'))` then resolve on the second call).
- [ ] Step 2: Run, confirm it fails (store swallows the error, no Retry UI exists).
- [ ] Step 3: In `store/assistants.ts`, remove the try/catch wrapping lines 1136-1147, keeping the `skipErrorHandling: true` fetch and the `shared_with`-vs-array unwrap; let rejections propagate.
- [ ] Step 4: In `ShareAssistantPopup.tsx`, add `const [loadError, setLoadError] = useState(false)`; extract the fetch body (lines 86-96) into `const loadSharedWith = () => { setLoadError(false); assistantsStore.getSharedWith(assistant.id).then(...).catch(() => setLoadError(true)) }`, called from the `visible && assistant` effect in place of the inline chain. Render, right above the `sharedWith.length > 0` block: an error message plus a `Button` labelled "Retry" (`onClick={loadSharedWith}`) when `loadError` is true, and only render the "People With Access" list when `!loadError`.
- [ ] Step 5: Run, confirm PASS.
- [ ] Step 6: Commit.

---

### Task 6: Search floor (2 characters)

**Files:**
- Modify: `src/pages/assistants/components/ShareAssistantPopup/ShareAssistantPopup.tsx:111-116`
- Test: same test file as Task 5.

Test-first: yes — failing test: typing a 1-character query never calls `getSharableUsers` and clears `searchOptions`; a 2-character query still schedules the debounced call.

- [ ] Step 1: Add both cases to the test file (use `vi.useFakeTimers()` / `act(() => vi.advanceTimersByTime(300))` matching the existing debounce test pattern in this file).
- [ ] Step 2: Run, confirm the 1-character case fails (request still fires).
- [ ] Step 3: Change the guard at line 113 from `if (!query || !assistant)` to `if (!query || query.length < 2 || !assistant)`.
- [ ] Step 4: Run, confirm PASS.
- [ ] Step 5: Commit.

---

### Task 7: Single error toast on share/remove

**Files:**
- Modify: `src/store/assistants.ts:1150-1156` (`shareWith`, `removeShare`)
- Test: a store-level test for `assistantsStore.shareWith`/`removeShare` if one exists; otherwise extend `ShareAssistantPopup.test.tsx` to assert `toaster.error` is called exactly once on a rejected share/remove.

Test-first: yes — failing test: a rejected `shareWith` call results in `toaster.error` being called exactly once (not twice).

- [ ] Step 1: Add the assertion (mock `api.post` to reject, spy on `toaster.error` call count) to the chosen test file.
- [ ] Step 2: Run, confirm it fails (count is 2 — one from `utils/api.ts`'s `handleError`, one from the popup's catch).
- [ ] Step 3: Add `{ skipErrorHandling: true }` as the third argument to the `api.post` call in `shareWith` (line 1151) and the `api.delete` call in `removeShare` (line 1155), matching `getSharedWith`'s existing convention.
- [ ] Step 4: Run, confirm PASS.
- [ ] Step 5: Commit.

---

### Task 8: Backend rejection surfaced in `ShareAssistantPopup.handleShare`

**Files:**
- Modify: `src/pages/assistants/components/ShareAssistantPopup/ShareAssistantPopup.tsx:156-171` (`handleShare`)
- Test: same test file as Task 5.

**Interfaces:**
- Produces: `shareError: string | null` state, rendered as inline text above the footer.

Test-first: yes — failing test: `shareWith` rejects with `{ parsedError: { message: 'Assistant uses a personal integration...' } }` → that exact text renders inside the popup, the popup stays `visible` (no `onHide()` call), and `selectedUsers` is unchanged (the selected chip is still shown).

- [ ] Step 1: Add the test, rejecting `mockStore.shareWith` with an object carrying `.parsedError.message`.
- [ ] Step 2: Run, confirm it fails (current catch only toasts a generic string and never calls `onHide` either way, so assert the inline text specifically — it will be absent).
- [ ] Step 3: Add `const [shareError, setShareError] = useState<string | null>(null)`. In `handleShare`, clear it at the top (`setShareError(null)`), and in the catch branch read `(error as any)?.parsedError?.message` with fallback `'Failed to add some users. Please try again.'`, store it in `shareError`, and skip the `toaster.error` call for this path (Task 7 already made this the single error path for this call). On success keep clearing `shareError` via the top-of-function reset. Render `shareError` as a line above `footerContent` inside the `Popup` children when non-null.
- [ ] Step 4: Run, confirm PASS.
- [ ] Step 5: Commit.

---

### Task 9: Backend rejection surfaced on `AssistantForm`

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/AssistantForm.tsx:421-432` (`handleFormSubmit`), JSX near L615-623 to render the message
- Test: `src/pages/assistants/components/AssistantForm/__tests__/AssistantForm.test.tsx` (locate existing submit-flow test)

**Interfaces:**
- Produces: `formSubmitError: string | null` state.

Test-first: yes — failing test: `handleMissingIntegrationsSubmit` resolving to `{ success: false, error: 'Personal integrations cannot be used...' }` renders that text inline in the form and does not clear any form field value.

- [ ] Step 1: Add the test, mocking the submit path to return that result shape (same mocking approach the existing submit tests in this file already use).
- [ ] Step 2: Run, confirm it fails (message only reaches `toaster.error`, nothing inline).
- [ ] Step 3: Add `const [formSubmitError, setFormSubmitError] = useState<string | null>(null)` near the other form state. In `handleFormSubmit`, before calling `handleMissingIntegrationsSubmit`, reset it to `null`; after getting `result`, when `result?.error` set `setFormSubmitError(result.error)` in addition to the existing `toaster.error(result.error)` call — do not remove the toast, the spec asks to add inline display alongside it. Render `{formSubmitError && <p className="text-xs text-danger-500">{formSubmitError}</p>}` directly inside the `<form>`, immediately after the opening tag (before `AssistantSetupSection` at line 639).
- [ ] Step 4: Run, confirm PASS.
- [ ] Step 5: Commit.

---

### Task 10: Dialog title, subtitle, and Remove button accessible name

**Files:**
- Modify: `src/pages/assistants/components/ShareAssistantPopup/ShareAssistantPopup.tsx:202` (`header` prop), add `headerDescription` prop, L235-241 (Remove `Button`)
- Test: same test file as Task 5.

Test-first: yes — failing test: popup renders "Share assistant" (not "Share for Collaboration") and "Can chat and view setup; cannot edit"; each Remove button has `aria-label="Remove " + user.name`.

- [ ] Step 1: Update the existing "renders the header" test to assert the new copy, and update every other test in the file asserting `'Share for Collaboration'` to the new string (grep the file for that literal). Add a new case asserting `getByRole('button', { name: \`Remove ${otherUser.name}\` })` exists.
- [ ] Step 2: Run, confirm failures (old copy still present; Remove buttons have no name beyond "Remove").
- [ ] Step 3: Change `header="Share for Collaboration"` to `header="Share assistant"` and add `headerDescription="Can chat and view setup; cannot edit"` (prop confirmed on `Popup`, `src/components/Popup/Popup.tsx:32`). Add `` aria-label={`Remove ${user.name}`} `` to the Remove `Button` at line 235.
- [ ] Step 4: Run, confirm PASS.
- [ ] Step 5: Commit.

---

## Negative-constraint pass

- "Do NOT disable Share on the client for assistants with personal integrations" (a5) — no task adds an integration-type check anywhere; Tasks 8/9 only read backend rejection text after the backend already rejected.
- "won't fix: adds batched to Save, Remove fires immediately" (a11) — no task changes `handleRemove`'s immediate-fire behavior or `handleShare`'s batching; Task 8 only adds error display around the existing calls.
- "Any change to `canEdit`/`canDelete`-gated actions... out of scope" — Task 2 touches only the `share` entry's `isVisible`; `edit`/`clone`/`delete`/`publish`/`unpublish` lines are left byte-identical.
- "Changing `getSharableUsers`' or `getConfig`'s own error handling beyond what's listed" — Task 7 adds `skipErrorHandling` only to `shareWith`/`removeShare`, not `getSharableUsers`.
- "Inventing a specific backend error code/shape" — Tasks 8/9 read a generic `.message` string with a fallback, never branch on an error code.
- a21 ACS parity (five-grade permission selector, pinned rows, chip, atomic save) — no task touches permission granularity or save atomicity.
- negative-constraints: all addressed above; none left unexamined.
