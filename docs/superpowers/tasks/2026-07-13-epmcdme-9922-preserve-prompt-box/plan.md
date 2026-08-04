# EPMCDME-9922 — Preserve Prompt Box Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist and restore the chat prompt text across chat switches and route navigation using `localStorage`, mirroring the existing `useChatConfiguration` pattern.

**Architecture:** A new `useChatPromptDraft` hook owns all draft lifecycle: it reads the stored draft synchronously from `localStorage` via a `useRef` guard on first render, returns the value as `initial`, and exposes `saveDraft`/`clearDraft` callbacks. `ChatPrompt` initialises its `prompt` state with `useState(initial)` so the Quill editor receives the draft text before its `onLoad` fires. A `useEffect` auto-saves on every prompt change; `handleSubmit` explicitly calls `clearDraft` before resetting state.

**Tech Stack:** React 18, Valtio, `localStorage` via `src/utils/storage/index.ts`, Vitest + @testing-library/react

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/pages/chat/hooks/useChatPromptDraft.ts` | **Create** | `readPromptDraft` helper + `useChatPromptDraft` hook |
| `src/pages/chat/hooks/__tests__/useChatPromptDraft.test.ts` | **Create** | Unit tests for hook (real jsdom `localStorage`) |
| `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` | **Modify** | Wire hook: init state, save effect, clear on submit |
| `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx` | **Modify** | Add draft tests; update `@/store` mock to include `user` |

---

## Task 1: `useChatPromptDraft` hook (TDD)

**Files:**
- Create: `src/pages/chat/hooks/__tests__/useChatPromptDraft.test.ts`
- Create: `src/pages/chat/hooks/useChatPromptDraft.ts`

---

- [ ] **Step 1.1 — Write failing tests for `readPromptDraft`**

Create `src/pages/chat/hooks/__tests__/useChatPromptDraft.test.ts`:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { readPromptDraft, useChatPromptDraft } from '../useChatPromptDraft'

describe('readPromptDraft', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when no draft is stored', () => {
    expect(readPromptDraft('user-1', 'chat-1')).toBeNull()
  })

  it('returns the stored draft when the key exists', () => {
    const draft = { message: 'hello', messageRaw: '<p>hello</p>' }
    localStorage.setItem('user-1_chat-prompt-draft-chat-1', JSON.stringify(draft))

    expect(readPromptDraft('user-1', 'chat-1')).toEqual(draft)
  })
})

describe('useChatPromptDraft', () => {
  beforeEach(() => localStorage.clear())

  it('returns the empty-prompt default as initial when no draft stored', () => {
    const { result } = renderHook(() => useChatPromptDraft('chat-1', 'user-1'))

    expect(result.current.initial).toEqual({ message: '', messageRaw: '' })
  })

  it('returns the stored draft as initial when a draft exists', () => {
    const draft = { message: 'hello', messageRaw: '<p>hello</p>' }
    localStorage.setItem('user-1_chat-prompt-draft-chat-1', JSON.stringify(draft))

    const { result } = renderHook(() => useChatPromptDraft('chat-1', 'user-1'))

    expect(result.current.initial).toEqual(draft)
  })

  it('saveDraft writes to localStorage when messageRaw is non-empty', () => {
    const { result } = renderHook(() => useChatPromptDraft('chat-1', 'user-1'))

    act(() => result.current.saveDraft({ message: 'hello', messageRaw: '<p>hello</p>' }))

    expect(localStorage.getItem('user-1_chat-prompt-draft-chat-1')).toBe(
      JSON.stringify({ message: 'hello', messageRaw: '<p>hello</p>' })
    )
  })

  it('saveDraft removes the key when messageRaw is empty', () => {
    localStorage.setItem(
      'user-1_chat-prompt-draft-chat-1',
      JSON.stringify({ message: 'hello', messageRaw: '<p>hello</p>' })
    )
    const { result } = renderHook(() => useChatPromptDraft('chat-1', 'user-1'))

    act(() => result.current.saveDraft({ message: '', messageRaw: '' }))

    expect(localStorage.getItem('user-1_chat-prompt-draft-chat-1')).toBeNull()
  })

  it('clearDraft removes the key', () => {
    localStorage.setItem(
      'user-1_chat-prompt-draft-chat-1',
      JSON.stringify({ message: 'hello', messageRaw: '<p>hello</p>' })
    )
    const { result } = renderHook(() => useChatPromptDraft('chat-1', 'user-1'))

    act(() => result.current.clearDraft())

    expect(localStorage.getItem('user-1_chat-prompt-draft-chat-1')).toBeNull()
  })

  it('saveDraft is a no-op when chatId is undefined', () => {
    const { result } = renderHook(() => useChatPromptDraft(undefined, 'user-1'))

    act(() => result.current.saveDraft({ message: 'hello', messageRaw: '<p>hello</p>' }))

    expect(localStorage.length).toBe(0)
  })

  it('saveDraft is a no-op when userId is undefined', () => {
    const { result } = renderHook(() => useChatPromptDraft('chat-1', undefined))

    act(() => result.current.saveDraft({ message: 'hello', messageRaw: '<p>hello</p>' }))

    expect(localStorage.length).toBe(0)
  })

  it('clearDraft is a no-op when chatId is undefined', () => {
    const { result } = renderHook(() => useChatPromptDraft(undefined, 'user-1'))

    act(() => result.current.clearDraft())

    expect(localStorage.length).toBe(0)
  })
})
```

- [ ] **Step 1.2 — Run tests to verify they fail**

```bash
npx vitest run --project unit src/pages/chat/hooks/__tests__/useChatPromptDraft.test.ts
```

Expected: all tests fail with `Cannot find module '../useChatPromptDraft'`.

---

- [ ] **Step 1.3 — Create the hook**

Create `src/pages/chat/hooks/useChatPromptDraft.ts`:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { useCallback, useRef } from 'react'

import { getObject, put, remove } from '@/utils/storage'

export type PromptDraft = { message: string; messageRaw: string }

const DRAFT_KEY = 'chat-prompt-draft'
const DEFAULT_PROMPT: PromptDraft = { message: '', messageRaw: '' }

export const readPromptDraft = (userId: string, chatId: string): PromptDraft | null =>
  getObject<PromptDraft | null>(userId, `${DRAFT_KEY}-${chatId}`, null)

export const useChatPromptDraft = (
  chatId: string | undefined,
  userId: string | undefined
) => {
  const initialRef = useRef<PromptDraft | undefined>(undefined)
  if (initialRef.current === undefined) {
    initialRef.current =
      chatId && userId ? (readPromptDraft(userId, chatId) ?? DEFAULT_PROMPT) : DEFAULT_PROMPT
  }

  const saveDraft = useCallback(
    (draft: PromptDraft) => {
      if (!chatId || !userId) return
      if (draft.messageRaw === '') {
        remove(userId, `${DRAFT_KEY}-${chatId}`)
      } else {
        put(userId, `${DRAFT_KEY}-${chatId}`, draft)
      }
    },
    [chatId, userId]
  )

  const clearDraft = useCallback(() => {
    if (!chatId || !userId) return
    remove(userId, `${DRAFT_KEY}-${chatId}`)
  }, [chatId, userId])

  return { initial: initialRef.current, saveDraft, clearDraft }
}
```

- [ ] **Step 1.4 — Run tests to verify they pass**

```bash
npx vitest run --project unit src/pages/chat/hooks/__tests__/useChatPromptDraft.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 1.5 — Commit**

```bash
git add src/pages/chat/hooks/useChatPromptDraft.ts src/pages/chat/hooks/__tests__/useChatPromptDraft.test.ts
git commit -m "EPMCDME-9922: add useChatPromptDraft hook with localStorage persistence"
```

---

## Task 2: Wire `useChatPromptDraft` into `ChatPrompt` (TDD)

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx`
- Modify: `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`

---

- [ ] **Step 2.1 — Add failing tests to `ChatPrompt.test.tsx`**

Open `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx`.

**a) Add `useChatPromptDraft` to the hoisted mocks block.** Replace the existing `vi.hoisted` call that defines `mockChatGenerationStore` and `mockChatsStore`:

```tsx
const { mockChatGenerationStore, mockChatsStore, mockUseChatPromptDraft } = vi.hoisted(() => ({
  mockChatGenerationStore: {
    stopChatGeneration: vi.fn(),
    createChatGeneration: vi.fn(),
    resumeWorkflowExecution: vi.fn(),
  },
  mockChatsStore: {
    currentChat: {
      id: 'chat-1',
      history: [[{ inProgress: true }]],
      isInterrupted: false,
      isWorkflow: false,
      assistantIds: ['assistant-1'],
    },
  },
  mockUseChatPromptDraft: {
    initial: { message: '', messageRaw: '' },
    saveDraft: vi.fn(),
    clearDraft: vi.fn(),
  },
}))
```

**b) Add the mock for `useChatPromptDraft`** after the existing `vi.mock` blocks (e.g., after the `@/assets/icons/play.svg?react` mock):

```tsx
vi.mock('../../../hooks/useChatPromptDraft', () => ({
  useChatPromptDraft: () => mockUseChatPromptDraft,
}))
```

**c) Replace the existing `@/store` mock** to add `user` to `userStore` (required because `ChatPrompt` will destructure `user` from `useSnapshot(userStore)` after this task):

```tsx
vi.mock('@/store', () => ({
  assistantsStore: { defaultAssistant: { id: 'assistant-1' } },
  userStore: { userData: { stt_support: false }, user: { userId: 'user-1' } },
}))
```

**d) Append two new `describe` blocks** at the end of the outer `describe('ChatPrompt', ...)` block:

```tsx
describe('draft initialization', () => {
  it('calls saveDraft with the initial draft value on first render', () => {
    mockUseChatPromptDraft.initial = { message: 'saved draft', messageRaw: '<p>saved draft</p>' }
    mockUseChatPromptDraft.saveDraft = vi.fn()

    render(<ChatPrompt />)

    expect(mockUseChatPromptDraft.saveDraft).toHaveBeenCalledWith({
      message: 'saved draft',
      messageRaw: '<p>saved draft</p>',
    })
  })
})

describe('draft cleared on submit', () => {
  beforeEach(() => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      history: [],
      isInterrupted: false,
      isWorkflow: false,
      assistantIds: ['assistant-1'],
    }
    mockUseChatPromptDraft.initial = { message: 'draft text', messageRaw: '<p>draft text</p>' }
    mockUseChatPromptDraft.clearDraft = vi.fn()
  })

  afterEach(() => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      history: [[{ inProgress: true }]],
      isInterrupted: false,
      isWorkflow: false,
      assistantIds: ['assistant-1'],
    }
    mockUseChatPromptDraft.initial = { message: '', messageRaw: '' }
  })

  it('calls clearDraft when the send button is clicked', () => {
    render(<ChatPrompt />)

    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(mockUseChatPromptDraft.clearDraft).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2.2 — Run tests to verify the new tests fail**

```bash
npx vitest run --project unit src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx
```

Expected: the two new tests fail (`useChatPromptDraft` not yet imported in `ChatPrompt.tsx`; existing tests continue to pass).

---

- [ ] **Step 2.3 — Modify `ChatPrompt.tsx`**

Open `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`.

**a) Add the import** after the existing `useChatContext` import:

```tsx
import { useChatPromptDraft } from '@/pages/chat/hooks/useChatPromptDraft'
```

**b) Update the `userStore` snapshot line** (line 78) to also destructure `user`:

```tsx
const { userData, user } = useSnapshot(userStore) as typeof userStore
```

**c) Add the hook call** directly after the `useChatContext` line (after `const { selectedSkills, isSharedPage, dynamicToolsConfig } = useChatContext()`):

```tsx
const { initial, saveDraft, clearDraft } = useChatPromptDraft(currentChat?.id, user?.userId)
```

**d) Change the `prompt` state initializer** from the hardcoded empty object to `initial`:

Before:
```tsx
const [prompt, setPrompt] = useState<{ message: string; messageRaw: string }>({
  message: '',
  messageRaw: '',
})
```

After:
```tsx
const [prompt, setPrompt] = useState<{ message: string; messageRaw: string }>(initial)
```

**e) Add the auto-save effect** after the existing `useEffect(() => { editorRef.current?.focus() }, [currentChat?.id])` block:

```tsx
useEffect(() => {
  saveDraft(prompt)
}, [prompt, saveDraft])
```

**f) Add `clearDraft()` to the interrupted submit path.** Find the `if (isInterrupted)` block in `handleSubmit`:

Before:
```tsx
setPrompt({ message: '', messageRaw: '' })
setFiles([])
chatGenerationStore.resumeWorkflowExecution(userInput, fileNames)
return
```

After:
```tsx
clearDraft()
setPrompt({ message: '', messageRaw: '' })
setFiles([])
chatGenerationStore.resumeWorkflowExecution(userInput, fileNames)
return
```

**g) Add `clearDraft()` to the normal submit path.** Find the two consecutive lines that reset state before `createChatGeneration`:

Before:
```tsx
setPrompt({ message: '', messageRaw: '' })
setFiles([])

chatGenerationStore.createChatGeneration({
```

After:
```tsx
clearDraft()
setPrompt({ message: '', messageRaw: '' })
setFiles([])

chatGenerationStore.createChatGeneration({
```

- [ ] **Step 2.4 — Run all `ChatPrompt` tests to verify they pass**

```bash
npx vitest run --project unit src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx
```

Expected: all tests pass, including the two new ones.

- [ ] **Step 2.5 — Run the full unit suite to check for regressions**

```bash
npm run test:unit
```

Expected: all unit tests pass with no regressions.

- [ ] **Step 2.6 — Commit**

```bash
git add src/pages/chat/components/ChatPrompt/ChatPrompt.tsx src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx
git commit -m "EPMCDME-9922: wire useChatPromptDraft into ChatPrompt for prompt draft persistence"
```

---

## Async Upgrade Path (not implemented now — documented for future reference)

If `localStorage` is replaced with async storage, change only `useChatPromptDraft.ts`:

1. Replace the `useRef` synchronous read with `useLayoutEffect`.
2. Add `draftLoaded: boolean` to the return type (starts `false`, set `true` after load).
3. In `ChatPrompt`, gate the `<Editor>` render on `draftLoaded`:
   ```tsx
   {draftLoaded && <Editor value={prompt} ... />}
   ```

`ChatPrompt` state init (`useState(initial)`) stays unchanged.
