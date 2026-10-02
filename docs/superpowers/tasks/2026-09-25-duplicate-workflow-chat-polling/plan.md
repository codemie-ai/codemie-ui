# Duplicate Workflow Chat Polling Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop an in-progress **workflow** chat from triggering the legacy `pollIncompleteChat` loop
in `chatsStore.getChat()`, so `useWorkflowExecutionPoll` remains the only poller for workflow chats.

**Architecture:** One conditional branch changes in `src/store/chats.ts`'s `getChat()`. No other
file needs code changes; two existing docs get additive addenda, and the Jira ticket gets an
appended note.

**Tech Stack:** React 18, TypeScript, Valtio, Vitest (fake timers).

**Requirements:** Requirements arrived inline (no spec.md) — see this task's `technical-analysis.md`
Section 1 for the verbatim root-cause writeup this plan implements.

Commit per task using the repository's existing convention (`EPMCDME-15256: <summary>`, ticket
prefix per `git log`).

## Global Constraints

- No change to `useWorkflowExecutionPoll`, `usePolling`, or `ChatPage.tsx`.
- No unification of `pollIncompleteChat` and `useWorkflowExecutionPoll` into one mechanism.
- No backend change.
- Docs updates are additive only — never rewrite or restructure existing content in the two
  EPMCDME-15256 planning docs.

## Review Focus

- A workflow chat with `openedChat` falsy must still skip `pollIncompleteChat` — the fix removes
  `isWorkflow` from the `else` catch-all entirely, not just when `openedChat` is truthy. Test in
  Task 1.
- The still-correct non-workflow reconnect path (`reconnectChatStream` via the dynamic
  `import('./chatGeneration')`) must keep firing — a fix that touches the `if` branch instead of
  only the `else` could silently break it. Test in Task 1.
- The Jira update in Task 3 must not fabricate ticket content if the lookup fails — a `needs_input`
  signal beats a guessed edit.

---

## Acceptance criteria

- [ ] `chatsStore.getChat()` never calls `pollIncompleteChat` for an in-progress workflow chat,
  regardless of `openedChat`.
- [ ] `chatsStore.getChat()` still calls `pollIncompleteChat` for an in-progress non-workflow chat
  when `openedChat` is falsy.
- [ ] `chatsStore.getChat()` still calls `reconnectChatStream` (not `pollIncompleteChat`) for an
  in-progress non-workflow chat when `openedChat` is truthy.
- [ ] `docs/superpowers/tasks/2026-09-25-epmcdme-15256-workflow-poll-fallback/spec.md` and its
  sibling `plan.md` each carry an additive addendum describing this fix, with everything already in
  them preserved unchanged.
- [ ] The EPMCDME-15256 Jira description carries an appended note about this fix, or the task
  reports `needs_input` if the ticket lookup fails.

---

### Task 1: Fix `getChat()`'s poll-trigger branch (TDD)

**Test-first:** yes — inverts the existing workflow-chat assertion to "not called" and adds two new
cases for the non-workflow paths.

**Files:**
- Modify: `src/store/chats.ts:364-373` (`getChat`'s `hasInProgress` branch)
- Test: `src/store/__tests__/chats.pollIncompleteChat.test.ts:59-88` (existing test) plus two new
  `it` cases in the same `describe` block

- [ ] **Step 1: Write/update the failing tests**

In `chats.pollIncompleteChat.test.ts`, rename and invert the test at lines 59-88 (still using
`is_workflow_conversation: true` and an in-progress history item) so it asserts
`expect(spyPoll).not.toHaveBeenCalled()` instead of `toHaveBeenCalledWith`. Then add two cases in
the same block:

```ts
it('calls pollIncompleteChat for a non-workflow in-progress chat when setOpenChat returns falsy', async () => {
  vi.mocked(api.get).mockResolvedValueOnce({
    json: () =>
      Promise.resolve({
        id: 'chat-2',
        conversation_name: 'Non-workflow',
        is_workflow_conversation: false,
        history: [
          { historyIndex: 0, message: 'Hi', date: '2026-09-25T12:00:00Z' },
          { historyIndex: 0, message: 'Pending', date: '2026-09-25T12:00:01Z', in_progress: true },
        ],
      }),
  } as any)
  vi.spyOn(chatsStore, 'setOpenChat').mockReturnValueOnce(undefined as any)
  const spyPoll = vi.spyOn(chatsStore, 'pollIncompleteChat')

  await chatsStore.getChat('chat-2')

  expect(spyPoll).toHaveBeenCalledWith('chat-2')
})

it('reconnects the stream instead of polling for a non-workflow in-progress chat with an openedChat', async () => {
  vi.mocked(api.get).mockResolvedValueOnce({
    json: () =>
      Promise.resolve({
        id: 'chat-3',
        conversation_name: 'Non-workflow open',
        is_workflow_conversation: false,
        history: [
          { historyIndex: 0, message: 'Hi', date: '2026-09-25T12:00:00Z' },
          { historyIndex: 0, message: 'Pending', date: '2026-09-25T12:00:01Z', in_progress: true },
        ],
      }),
  } as any)
  const spyPoll = vi.spyOn(chatsStore, 'pollIncompleteChat')
  const spyReconnect = vi.spyOn(chatGenerationStore, 'reconnectChatStream').mockResolvedValue()

  await chatsStore.getChat('chat-3')
  await vi.waitFor(() => expect(spyReconnect).toHaveBeenCalled())

  expect(spyPoll).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run tests to verify the three cases fail**

Run: `npx vitest run src/store/__tests__/chats.pollIncompleteChat.test.ts`
Expected: the inverted first case FAILs (current code still calls `pollIncompleteChat` for a
workflow chat); the second case passes already (documents pre-existing behavior, not new); the
third case FAILs or is flaky only if `reconnectChatStream` isn't awaited correctly — confirm it
currently passes before touching the source, since the `if` branch is unchanged by this fix.

- [ ] **Step 3: Implement**

Replace `src/store/chats.ts:365-373`'s branch body:

```ts
if (hasInProgress) {
  if (!chat.isWorkflow && openedChat) {
    import('./chatGeneration').then(({ chatGenerationStore }) => {
      chatGenerationStore.reconnectChatStream(openedChat)
    })
  } else if (!chat.isWorkflow) {
    chatsStore.pollIncompleteChat(id)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass, and confirm the keep-green list stays green**

Run: `npx vitest run src/store/__tests__/chats.pollIncompleteChat.test.ts`
Expected: PASS — all three cases above plus the four pre-existing tests that call
`pollIncompleteChat` directly (`'polls api and updates history reactively...'`, `'...currentChat
when chat is not in openedChatsHistory'`, `'...immediately without delay when immediate=true'`,
`'resets inProgress flags when exceeding MAX_CHAT_POLL_ATTEMPTS'`), none of which go through
`getChat()` and are therefore unaffected.

- [ ] **Step 5: Commit**

---

### Task 2: Add additive addenda to the EPMCDME-15256 planning docs

**Test-first:** no — documentation only, not code.

**Files:**
- Modify: `docs/superpowers/tasks/2026-09-25-epmcdme-15256-workflow-poll-fallback/spec.md`
  (append after the existing `## Open risks` section, currently ending at line 158)
- Modify: `docs/superpowers/tasks/2026-09-25-epmcdme-15256-workflow-poll-fallback/plan.md`
  (append after the existing `## Negative-Constraint Pass` section, currently ending at line 846)

- [ ] **Step 1: Append to `spec.md`**

Add a new `## Addendum: related duplicate-polling defect found on this branch` section at the end
of `spec.md`, 3-6 sentences: found while manually verifying this ticket's polling behavior; a
pre-existing, independent bug (confirmed via `git blame` against `main`, introduced by EPMCDME-14797)
where `chatsStore.getChat()` also started the legacy `pollIncompleteChat` loop for in-progress
**workflow** chats, doubling `GET /conversations/{id}` traffic against `useWorkflowExecutionPoll`;
fixing it further reduces redundant polling, reinforcing this ticket's own polling-efficiency goal,
but it was not part of this spec's original Fix 1/Fix 2. Link
`docs/tasks/2026-09-25-duplicate-workflow-chat-polling.md` and
`docs/superpowers/tasks/2026-09-25-duplicate-workflow-chat-polling/` (full detail lives there — do
not duplicate it). Do not edit any existing line above this new section.

- [ ] **Step 2: Append to `plan.md`**

Add a `### Task 6 (addendum): Duplicate workflow-chat polling fix` section after the existing
`## Negative-Constraint Pass` section: one paragraph summarizing the fix (the `getChat()` branch in
`src/store/chats.ts`, see Task 1 of this task's own plan), and a pointer to this task's `spec.md`/
`plan.md` for full detail (root cause, tests, acceptance criteria) rather than repeating them. Do
not edit any existing line above this new section.

- [ ] **Step 3: Commit**

---

### Task 3: Append a note to the EPMCDME-15256 Jira ticket

**Test-first:** no — a documentation/ticket update, not code.

- [ ] **Step 1: Fetch the current ticket description**

Use the `codemie-jira-assistant` skill to fetch EPMCDME-15256's current description. If the skill
or the ticket lookup is unavailable or errors, stop this task and report `needs_input` — do not
guess or fabricate the ticket's current content.

- [ ] **Step 2: Append the note**

Using the same skill, append (never replace) a short note to the description: this branch also
fixes a pre-existing, related duplicate-polling defect in `chatsStore.getChat()` (in-progress
workflow chats were double-polled via the legacy `pollIncompleteChat` loop alongside
`useWorkflowExecutionPoll`); the fix further reduces redundant `GET /conversations/{id}` traffic,
aligned with this ticket's polling-efficiency goal. Cite
`docs/tasks/2026-09-25-duplicate-workflow-chat-polling.md` for full detail.

- [ ] **Step 3: Confirm the update**

Re-fetch or otherwise confirm the description now contains both the original content and the new
note.

---

## Self-Review

**Spec coverage:** Task 1 covers the code fix and its three required test cases (workflow chat NOT
polled, non-workflow-no-openedChat still polled, non-workflow-with-openedChat still reconnects).
Task 2 covers both required doc addenda. Task 3 covers the Jira update, including the "return
`needs_input` rather than guess" requirement.

**Placeholder scan:** No step is code-free; both doc-addendum steps state the exact content to add
rather than "add a note".

**Type consistency:** `chatsStore.setOpenChat`, `chatsStore.pollIncompleteChat`,
`chatGenerationStore.reconnectChatStream` are used with their existing signatures only; no new
function is introduced.

**Review Focus:** all three items above are each covered by Task 1's tests or Task 3's explicit
failure handling.

## Negative-Constraint Pass

- "No change to `useWorkflowExecutionPoll`, `usePolling`, or `ChatPage.tsx`" — Task 1 touches only
  `src/store/chats.ts` and its own test file; no task modifies any of the three named files. Honored.
- "No unification of `pollIncompleteChat` and `useWorkflowExecutionPoll`" — Task 1's fix only scopes
  the existing `else` branch to non-workflow chats; neither mechanism's implementation changes.
  Honored.
- "No backend change" — all three tasks are frontend/doc/ticket edits. Honored.
- "Do NOT rewrite or restructure either existing document — additive notes only" — Task 2's steps
  both specify appending a new section after the existing content and explicitly forbid editing any
  existing line. Honored.
- "If the skill or ticket lookup is unavailable/fails, return `needs_input` rather than guessing" —
  Task 3 Step 1 states this explicitly as the stop condition. Honored.
