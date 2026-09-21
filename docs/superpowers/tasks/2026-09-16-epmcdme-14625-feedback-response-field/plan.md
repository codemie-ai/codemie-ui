# EPMCDME-14625 — Feedback `response` Field Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make negative (and, for parity, positive) assistant-message feedback submit successfully regardless of whether the message has response text, and show a friendly error instead of a raw/silent failure when submission does fail.

**Architecture:** The defect and the fix are both entirely inside `MessageFeedbackActions.tsx`: the payload sent to `chatsStore.submitFeedback` currently forwards `message.response` (possibly `undefined`) untouched; `JSON.stringify` then drops the key and the backend's required-field validation fails the POST. No store or HTTP-layer change is needed — coercing `response` to a string at the point the payload is built (the same `?? ''` convention already used at five other `message.response` call sites in this codebase) prevents the 422 outright. Each of the two existing `catch` blocks gets one hardcoded `toaster.error(...)` call, added alongside — not replacing — the existing optimistic-mark-revert behavior.

**Tech Stack:** React 18, TypeScript, Valtio, Vitest + React Testing Library (`unit` project).

## Global Constraints

- Frontend-only (`codemie-ui`) fix — no changes to the sibling `codemie` backend repo, its `FeedbackRequest` model, or any DB schema/migration.
- Leave `toaster.info('Thank you for your feedback')` as-is on both success paths — changing it to `toaster.success` is explicitly out of scope.
- Do not modify `src/utils/api.ts`'s generic error-formatting/toaster pipeline, and do not add a `ValidationError.fromParsedError` integration — the payload fix alone prevents the 422 that pipeline would otherwise mis-render.
- Never pass a caught error's own message/text into a user-facing toast — hardcode the friendly string so raw backend validation text can never reach the user through this path.
- Preserve the existing optimistic `setMark(newMark)` → `catch { setMark(oldMark) }` shape exactly in both functions.
- Commit per task using the repository's existing convention.

## Acceptance criteria

- [ ] Dislike-path feedback submits successfully when `message.response` is `undefined` (the outgoing payload's `response` is always a string, never `undefined`).
- [ ] Like-path feedback (`submitLikeFeedback`) gets the same `response` coercion, for parity with the dislike path.
- [ ] On a feedback submission failure (either path), the user sees a friendly, hardcoded `toaster.error(...)` message — never raw backend validation text — and the existing mark-revert behavior still runs.
- [ ] On success, the existing `toaster.info('Thank you for your feedback')` confirmation is unchanged on both paths.
- [ ] New tests cover: (a) the outgoing payload always has a string `response` for both paths, and (b) a failed submission shows the friendly error, does not show the success toast, and (for the dislike path) leaves the feedback popup open.

---

### Task 1: Fix and test the dislike path (`submitFeedback`)

**Test-first: yes — dislike-path payload always sends `response: ''` when `message.response` is `undefined`, and a failed submission calls `toaster.error` with a friendly message instead of the raw error, leaving the popup open.**

**Files:**
- Modify: `src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/MessageFeedbackActions.tsx:96` (payload) and `:104-107` (catch block)
- Create: `src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/__tests__/MessageFeedbackActions.test.tsx`

**Interfaces:**
- Consumes: `chatsStore.submitFeedback(conversationId, feedbackData: FeedbackSubmission, historyIndex, messageIndex)` (`src/store/chats.ts:612`) — mocked in the test, not changed by this task.
- Produces: the test file and its `mockChatsStore`/`Popup` mocks below are reused as-is by Task 2 (same file, new `describe` block).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/__tests__/MessageFeedbackActions.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import toaster from '@/utils/toaster'

import MessageFeedbackActions from '../MessageFeedbackActions'

const mockChatsStore = vi.hoisted(() => ({
  currentChat: { id: 'chat-1' } as { id: string } | null,
  submitFeedback: vi.fn(),
  deleteFeedback: vi.fn(),
}))

vi.mock('valtio', () => ({ proxy: (v: unknown) => v, useSnapshot: (s: unknown) => s }))
vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/appInfo', () => ({ appInfoStore: { configs: [] } }))
vi.mock('@/store/user', () => ({ userStore: { user: { userId: 'user-1' } } }))
vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}))
// The real Popup renders through a PrimeReact portal; this passthrough keeps the test focused on
// MessageFeedbackActions' own payload/error logic instead of PrimeReact's dialog plumbing.
vi.mock('@/components/Popup', () => ({
  default: ({ children, onSubmit, submitDisabled, visible }: any) =>
    visible ? (
      <div>
        {children}
        <button onClick={onSubmit} disabled={submitDisabled}>
          Send
        </button>
      </div>
    ) : null,
}))

const message = { role: 'Assistant', createdAt: '2026-09-16T00:00:00Z', assistantId: 'a1' } as any
const indexes = { historyIndex: 0, messageIndex: 0 }

beforeEach(() => {
  vi.clearAllMocks()
  mockChatsStore.currentChat = { id: 'chat-1' }
})

describe('MessageFeedbackActions — dislike path (EPMCDME-14625)', () => {
  it('sends a string response even when message.response is undefined', async () => {
    const user = userEvent.setup()
    mockChatsStore.submitFeedback.mockResolvedValue(undefined)
    render(<MessageFeedbackActions message={message} indexes={indexes} />)

    await user.click(screen.getByRole('button', { name: 'Dislike this response' }))
    await user.click(screen.getByRole('button', { name: 'Other' }))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() =>
      expect(mockChatsStore.submitFeedback).toHaveBeenCalledWith(
        'chat-1',
        expect.objectContaining({ response: '' }),
        0,
        0
      )
    )
  })

  it('shows a friendly error and keeps the popup open when submission fails', async () => {
    const user = userEvent.setup()
    mockChatsStore.submitFeedback.mockRejectedValue(new Error('body.response Field required'))
    render(<MessageFeedbackActions message={message} indexes={indexes} />)

    await user.click(screen.getByRole('button', { name: 'Dislike this response' }))
    await user.click(screen.getByRole('button', { name: 'Other' }))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() =>
      expect(toaster.error).toHaveBeenCalledWith(
        "We couldn't submit your feedback. Please try again."
      )
    )
    expect(toaster.info).not.toHaveBeenCalled()
    // Popup stays open — the catch block never hides it, only the try path does.
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:unit -- MessageFeedbackActions.test.tsx`
Expected: FAIL — first test fails because the payload's `response` is `undefined`, not `''`; second fails because `toaster.error` was never called.

- [ ] **Step 3: Implement the minimal fix**

At `MessageFeedbackActions.tsx:96`, change the payload's `response` field from `message.response` to `message.response ?? ''` (same coercion already used at `ChatAiMessage.tsx:126` etc.). At `MessageFeedbackActions.tsx:104-107`, add a `toaster.error("We couldn't submit your feedback. Please try again.")` call in the `catch` block, alongside the existing `console.error` and `setMark(oldMark)` — do not pass the caught `error` into the toast.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:unit -- MessageFeedbackActions.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

---

### Task 2: Fix and test the like path (`submitLikeFeedback`)

**Test-first: yes — like-path payload always sends `response: ''` when `message.response` is `undefined`, and a failed submission calls `toaster.error` with a friendly message instead of the raw error, with the mark reverted.**

**Files:**
- Modify: `src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/MessageFeedbackActions.tsx:141` (payload) and `:149-152` (catch block)
- Modify: `src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/__tests__/MessageFeedbackActions.test.tsx` (append a new `describe` block; reuses Task 1's mocks/fixtures)

**Interfaces:**
- Consumes: same `mockChatsStore`, `message`, `indexes` fixtures defined in Task 1's test file.
- With `appInfoStore.configs` mocked to `[]`, `isConfigItemEnabled` (`src/utils/settings.ts:195`) returns `false`, so `handleLike` (`MessageFeedbackActions.tsx:110-125`) calls `submitLikeFeedback()` directly on click — no popup needed to exercise this path.

- [ ] **Step 1: Write the failing tests**

```tsx
// Append to src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/__tests__/MessageFeedbackActions.test.tsx
describe('MessageFeedbackActions — like path (EPMCDME-14625)', () => {
  it('sends a string response even when message.response is undefined', async () => {
    const user = userEvent.setup()
    mockChatsStore.submitFeedback.mockResolvedValue(undefined)
    render(<MessageFeedbackActions message={message} indexes={indexes} />)

    await user.click(screen.getByRole('button', { name: 'Like this response' }))

    await waitFor(() =>
      expect(mockChatsStore.submitFeedback).toHaveBeenCalledWith(
        'chat-1',
        expect.objectContaining({ response: '' }),
        0,
        0
      )
    )
  })

  it('shows a friendly error and reverts the mark when submission fails', async () => {
    const user = userEvent.setup()
    mockChatsStore.submitFeedback.mockRejectedValue(new Error('body.response Field required'))
    render(<MessageFeedbackActions message={message} indexes={indexes} />)

    await user.click(screen.getByRole('button', { name: 'Like this response' }))

    await waitFor(() =>
      expect(toaster.error).toHaveBeenCalledWith(
        "We couldn't submit your feedback. Please try again."
      )
    )
    expect(toaster.info).not.toHaveBeenCalled()
    // Mark reverted to "not liked" — the label goes back to its pre-click text.
    expect(screen.getByRole('button', { name: 'Like this response' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:unit -- MessageFeedbackActions.test.tsx`
Expected: FAIL — first new test fails because `response` is `undefined`; second fails because `toaster.error` was never called.

- [ ] **Step 3: Implement the minimal fix**

At `MessageFeedbackActions.tsx:141`, change the payload's `response` field from `message.response` to `message.response ?? ''`. At `MessageFeedbackActions.tsx:149-152`, add the same `toaster.error("We couldn't submit your feedback. Please try again.")` call in the `catch` block, alongside the existing `console.error` and `setMark(oldMark)`.

- [ ] **Step 4: Run the full test file to verify everything passes**

Run: `npm run test:unit -- MessageFeedbackActions.test.tsx`
Expected: PASS (all 4 tests: dislike success/failure, like success/failure)

- [ ] **Step 5: Commit**
