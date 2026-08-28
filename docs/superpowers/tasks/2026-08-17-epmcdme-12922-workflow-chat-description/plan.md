# EPMCDME-12922 — Workflow Chat Description Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Workflow chat's intro/start screen shows the workflow's configured description, the same way assistant chat already shows the assistant description.

**Architecture:** `ChatPromptStarters.tsx` is the single shared intro component for both assistant and workflow chats. Its description-fetch `useEffect` currently only knows how to fetch assistant descriptions. Add a branch on the existing `currentChat?.isWorkflow` discriminator so the workflow path fetches via `workflowsStore.getWorkflow()` instead of `assistantsStore.getAssistant()`. `getWorkflow` needs a `skipErrorHandling` param added (mirroring `getAssistant`) so a fetch failure degrades silently instead of popping an error toast. No rendering/JSX changes — the existing markup already renders whatever is in `description` state generically.

**Tech Stack:** React, TypeScript, Valtio (state), Vitest + React Testing Library (tests).

## Global Constraints

- Tailwind-only styling, semantic theme tokens only, `cn()` for conditional classes — no new styling needed, this plan reuses existing markup verbatim.
- `??` for defaults, never `||`.
- Store access only via `useSnapshot(store)` outside effects/handlers; direct store method calls only inside effects/handlers (existing pattern already followed in this file).
- 300-line file cap per `.ai-run/guides/components/component-patterns.md` — `ChatPromptStarters.tsx` is currently 137 lines; this change adds ~15 lines, well within budget.
- Existing assistant chat description behavior must not change.

---

### Task 1: Add `skipErrorHandling` to `workflowsStore.getWorkflow`

**Files:**
- Modify: `src/store/workflows.ts:79` (interface signature), `src/store/workflows.ts:225-228` (implementation)
- Test: `src/store/__tests__/workflows.getWorkflow.test.ts` (new file)

**Interfaces:**
- Produces: `getWorkflow: (id: string | number, skipErrorHandling?: boolean) => Promise<Workflow>` — used by Task 2.

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/workflows.getWorkflow.test.ts`:

```tsx
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

import { describe, expect, it, vi } from 'vitest'

import { workflowsStore } from '../workflows'

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ id: 1, description: 'd' }) })),
  },
}))

describe('workflowsStore.getWorkflow', () => {
  it('passes skipErrorHandling through to the api client', async () => {
    const api = (await import('@/utils/api')).default

    await workflowsStore.getWorkflow(1, true)

    expect(api.get).toHaveBeenCalledWith('v1/workflows/id/1', { skipErrorHandling: true })
  })

  it('defaults skipErrorHandling to false when not passed', async () => {
    const api = (await import('@/utils/api')).default

    await workflowsStore.getWorkflow(1)

    expect(api.get).toHaveBeenCalledWith('v1/workflows/id/1', { skipErrorHandling: false })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/store/__tests__/workflows.getWorkflow.test.ts`
Expected: FAIL — `api.get` is called with `('v1/workflows/id/1')` (one arg), not `('v1/workflows/id/1', { skipErrorHandling: ... })`, so the `toHaveBeenCalledWith` assertions fail.

- [ ] **Step 3: Write minimal implementation**

In `src/store/workflows.ts`, change the interface line (79):

```ts
  getWorkflow: (id: string | number, skipErrorHandling?: boolean) => Promise<Workflow>
```

And the implementation (225-228):

```ts
  async getWorkflow(id: string | number, skipErrorHandling = false): Promise<Workflow> {
    const response = await api.get(`v1/workflows/id/${id}`, { skipErrorHandling })
    return response.json()
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/store/__tests__/workflows.getWorkflow.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/store/workflows.ts src/store/__tests__/workflows.getWorkflow.test.ts
git commit -m "EPMCDME-12922: Add skipErrorHandling param to workflowsStore.getWorkflow"
```

---

### Task 2: Fetch and render the workflow description in `ChatPromptStarters`

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/ChatPromptStarters.tsx`
- Test: `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptStarters.test.tsx` (new file)

**Interfaces:**
- Consumes: `workflowsStore.getWorkflow(id: string | number, skipErrorHandling?: boolean): Promise<Workflow>` from Task 1; `workflowsStore.workflows: Workflow[]` (existing cache array); `currentChat.isWorkflow: boolean` (existing field on `Conversation`, already used in `ChatHeader.tsx`).

- [ ] **Step 1: Write the failing test**

Create `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptStarters.test.tsx`:

```tsx
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

import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ChatPromptStarters from '../ChatPromptStarters'

const { mockChatsStore, mockAssistantsStore, mockWorkflowsStore } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: {
      id: 'chat-1',
      isWorkflow: false,
      assistantIds: ['entity-1'],
      assistantData: [{ id: 'entity-1', name: 'My Assistant', iconUrl: null, conversationStarters: [] }],
    },
  },
  mockAssistantsStore: {
    assistants: [],
    getAssistant: vi.fn(() => Promise.resolve({ description: 'Assistant description' })),
  },
  mockWorkflowsStore: {
    workflows: [],
    getWorkflow: vi.fn(() => Promise.resolve({ description: 'Workflow description' })),
  },
}))

vi.mock('valtio', () => ({
  proxy: <T extends object>(obj: T): T => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
  ref: vi.fn((v) => v),
}))

vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/assistants', () => ({ assistantsStore: mockAssistantsStore }))
vi.mock('@/store/workflows', () => ({ workflowsStore: mockWorkflowsStore }))
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ appearance: null }) }))

afterEach(() => {
  cleanup()
  mockChatsStore.currentChat = {
    id: 'chat-1',
    isWorkflow: false,
    assistantIds: ['entity-1'],
    assistantData: [{ id: 'entity-1', name: 'My Assistant', iconUrl: null, conversationStarters: [] }],
  }
  mockAssistantsStore.assistants = []
  mockAssistantsStore.getAssistant = vi.fn(() => Promise.resolve({ description: 'Assistant description' }))
  mockWorkflowsStore.workflows = []
  mockWorkflowsStore.getWorkflow = vi.fn(() => Promise.resolve({ description: 'Workflow description' }))
})

describe('ChatPromptStarters', () => {
  it('shows the assistant description when the chat is an assistant chat', async () => {
    render(<ChatPromptStarters onStarterClick={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Assistant description')).toBeInTheDocument())
    expect(mockWorkflowsStore.getWorkflow).not.toHaveBeenCalled()
  })

  it('does not show a description when the assistant has none', async () => {
    mockAssistantsStore.getAssistant = vi.fn(() => Promise.resolve({ description: null }))

    render(<ChatPromptStarters onStarterClick={vi.fn()} />)

    await waitFor(() => expect(mockAssistantsStore.getAssistant).toHaveBeenCalled())
    expect(screen.queryByText('Assistant description')).not.toBeInTheDocument()
  })

  it('shows the workflow description when the chat is a workflow chat', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      isWorkflow: true,
      assistantIds: ['entity-1'],
      assistantData: [{ id: 'entity-1', name: 'My Workflow', iconUrl: null, conversationStarters: [] }],
    }

    render(<ChatPromptStarters onStarterClick={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Workflow description')).toBeInTheDocument())
    expect(mockWorkflowsStore.getWorkflow).toHaveBeenCalledWith('entity-1', true)
    expect(mockAssistantsStore.getAssistant).not.toHaveBeenCalled()
  })

  it('does not show a placeholder when the workflow has no description configured', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      isWorkflow: true,
      assistantIds: ['entity-1'],
      assistantData: [{ id: 'entity-1', name: 'My Workflow', iconUrl: null, conversationStarters: [] }],
    }
    mockWorkflowsStore.getWorkflow = vi.fn(() => Promise.resolve({ description: null }))

    render(<ChatPromptStarters onStarterClick={vi.fn()} />)

    await waitFor(() => expect(mockWorkflowsStore.getWorkflow).toHaveBeenCalled())
    expect(screen.queryByText('Workflow description')).not.toBeInTheDocument()
  })

  it('degrades to no description when the workflow fetch fails', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      isWorkflow: true,
      assistantIds: ['entity-1'],
      assistantData: [{ id: 'entity-1', name: 'My Workflow', iconUrl: null, conversationStarters: [] }],
    }
    mockWorkflowsStore.getWorkflow = vi.fn(() => Promise.reject(new Error('network error')))

    render(<ChatPromptStarters onStarterClick={vi.fn()} />)

    await waitFor(() => expect(mockWorkflowsStore.getWorkflow).toHaveBeenCalled())
    expect(screen.queryByText('Workflow description')).not.toBeInTheDocument()
    expect(screen.getByText('My Workflow')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/pages/chat/components/ChatPrompt/__tests__/ChatPromptStarters.test.tsx`
Expected: FAIL — the "workflow chat" tests fail because the component currently calls `assistantsStore.getAssistant('entity-1', true)` for every chat regardless of `isWorkflow`, so `workflowsStore.getWorkflow` is never called and `'Workflow description'` never renders.

- [ ] **Step 3: Write minimal implementation**

In `src/pages/chat/components/ChatPrompt/ChatPromptStarters.tsx`, add the `workflowsStore` import (after the `chatsStore` import, line 25):

```ts
import { chatsStore } from '@/store/chats'
import { workflowsStore } from '@/store/workflows'
```

Replace the `useSnapshot`/`useEffect` block (lines 32-57) with:

```tsx
  const { currentChat } = useSnapshot(chatsStore) as typeof chatsStore
  const { assistants } = useSnapshot(assistantsStore) as typeof assistantsStore
  const { workflows } = useSnapshot(workflowsStore) as typeof workflowsStore
  const [description, setDescription] = useState<string | null>(null)
  const { appearance } = useTheme()

  const lastAssistant = currentChat?.assistantData.find(
    ({ id }) => id === currentChat.assistantIds[0]
  )

  useEffect(() => {
    if (!lastAssistant) {
      setDescription(null)
      return
    }

    if (currentChat?.isWorkflow) {
      const cachedWorkflow = workflows.find((w) => w.id === lastAssistant.id)
      if (cachedWorkflow?.description) {
        setDescription(cachedWorkflow.description)
        return
      }

      workflowsStore
        .getWorkflow(lastAssistant.id, true)
        .then((workflow) => setDescription(workflow.description ?? null))
        .catch(() => setDescription(null))
      return
    }

    const cached = assistants.find((a) => a.id === lastAssistant.id)
    if (cached?.description) {
      setDescription(cached.description)
      return
    }

    assistantsStore
      .getAssistant(lastAssistant.id, true)
      .then((assistant) => setDescription(assistant.description ?? null))
      .catch(() => setDescription(null))
  }, [lastAssistant?.id, currentChat?.isWorkflow])
```

No other lines in the file change — the render section (lines 82-133 in the original) already renders `description` generically.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/pages/chat/components/ChatPrompt/__tests__/ChatPromptStarters.test.tsx`
Expected: PASS (5 tests)

Also run the full existing suite for this feature area to confirm no regression:

Run: `npm run test -- src/pages/chat/components/ChatPrompt`
Expected: PASS (all tests, including the pre-existing `ChatPrompt.test.tsx`, which stubs `ChatPromptStarters` entirely and is unaffected)

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/ChatPrompt/ChatPromptStarters.tsx src/pages/chat/components/ChatPrompt/__tests__/ChatPromptStarters.test.tsx
git commit -m "EPMCDME-12922: Show workflow description in workflow chat intro"
```

---

## Task Summary

| Task | Test-first | Failing test description |
|---|---|---|
| 1 | yes | `workflowsStore.getWorkflow` test asserts `api.get` receives `{ skipErrorHandling }`; fails because current implementation calls `api.get(url)` with no options object. |
| 2 | yes | `ChatPromptStarters` workflow-chat tests assert `workflowsStore.getWorkflow` is called and its description renders; fails because the component always calls `assistantsStore.getAssistant` regardless of `isWorkflow`. |
