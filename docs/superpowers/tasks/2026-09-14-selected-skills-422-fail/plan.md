# Fix chat-skills storage shape mismatch causing /model 422 (EPMCDME-14520) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `/model` requests from sending `skill_ids: [null]` after a user navigates away from
a chat (e.g. to Assistants) and back, by fixing the storage shape mismatch, the `''`-chatId guard
skip, and the sweep race that all funnel into the same `chatSkillsKey(chatId)` localStorage slot.

**Architecture:** Three surgical edits at the existing seam (`chatGeneration.ts` → `saveChatSkills`
→ `useChatConfiguration.tsx` → `loadChatSkills`) plus a one-line sweep guard in
`chatStorageUtils.ts`. No new files, stores, or components.

**Tech Stack:** React 18, TypeScript 5, Valtio, Vitest (`unit` + `integration` projects per
`vitest.workspace.ts`).

**Spec:** `docs/superpowers/tasks/2026-09-14-selected-skills-422-fail/spec.md`

## Global Constraints

- No change to `ChatGenerationOptions` or any other shared type.
- No change to how the `/model` `skill_ids` wire payload itself is constructed
  (`src/store/chatGeneration.ts:478` stays untouched).
- No fix to the identical `chatId`-falsy guard in `handleSetDynamicToolsConfig` or
  `handleSetHideToolOutputs` (follow-up only, not in scope).
- No change to `sweepOrphanedChatKeys`'s call sites, its `getChats()` await-ordering, or its
  empty-value sweep branch — only the one-line `''`-skip inside the existence-sweep branch.
- No live catalog-existence check for selected skills against the paginated skills-search fetch.
- Commit per task using the repository's existing convention.

---

### Task 1: Remove the wrong-shape write from `createChatGeneration`'s new-chat branch

**Files:**
- Modify: `src/store/chatGeneration.ts:442-445`
- Test: `src/store/__tests__/chatGeneration.storageGuards.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `createChatGeneration`'s new-chat branch no longer calls `saveChatSkills` at all;
  `saveChatTools` at line 443 is untouched. Later tasks rely on `chatSkillsKey(newId)` never being
  written by this branch.

Test-first: yes — "does not write chat-skills when skillIds is non-empty" (inverts the current
assertion, which expects a write).

- [ ] **Step 1: Update the failing test**

In `src/store/__tests__/chatGeneration.storageGuards.test.ts`, replace the existing "writes
chat-skills when skillIds is non-empty" test (lines 90-94) with:

```typescript
it('never writes chat-skills, even when skillIds is non-empty', async () => {
  setupIsNewChat('new-id')
  await chatGenerationStore.createChatGeneration({ skillIds: ['skill-a'] }).catch(() => {})
  expect(storagePut).not.toHaveBeenCalledWith(
    'user-1',
    expect.stringContaining('chat-skills-'),
    expect.anything()
  )
})
```

Also delete the now-obsolete "silently swallows QuotaExceededError on chat-skills write" test
(lines 133-144) — there is no longer a chat-skills write in this branch to throw from.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/chatGeneration.storageGuards.test.ts --project unit`
Expected: FAIL — the current code still calls `saveChatSkills`, so `storagePut` is still called
with a `chat-skills-` key.

- [ ] **Step 3: Remove the write**

In `src/store/chatGeneration.ts`, delete line 444 (`saveChatSkills(userId, newId, skillIds ?? [])`)
from inside the `if (userId) { ... }` block at lines 442-445, leaving only the `saveChatTools` call.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/__tests__/chatGeneration.storageGuards.test.ts --project unit`
Expected: PASS, all tests in the file green.

- [ ] **Step 5: Commit**

```bash
git add src/store/chatGeneration.ts src/store/__tests__/chatGeneration.storageGuards.test.ts
```
Commit per the repository's existing convention.

---

### Task 2: Fix the `''`-chatId guard in `handleSetSelectedSkills`

**Files:**
- Modify: `src/pages/chat/hooks/useChatConfiguration.tsx:120-124`
- Test: `src/pages/chat/hooks/__tests__/useChatConfiguration.storageGuards.test.ts`

**Interfaces:**
- Consumes: `saveChatSkills(userId: string, chatId: string, skills: unknown[])` (unchanged,
  `src/utils/chatStorageUtils.ts:49`).
- Produces: `handleSetSelectedSkills` now persists under `chatSkillsKey('')` when
  `currentChat?.id === ''`. Task 3's migration effect relies on this write existing.

Test-first: yes — "persists under chatSkillsKey('') when currentChat.id is the empty-string
placeholder" (does not exist yet; current guard skips the write).

- [ ] **Step 1: Write the failing test**

Add to `src/pages/chat/hooks/__tests__/useChatConfiguration.storageGuards.test.ts` (this file
imports `saveChatSkills`/`saveChatTools` re-exported from `useChatConfiguration.tsx` — the guard
itself lives in `handleSetSelectedSkills`, a closure inside the hook, not in the exported
`saveChatSkills`. Testing the guard directly requires rendering the hook, so add a new test file
instead — the existing file only covers the pure storage functions):

Create `src/pages/chat/hooks/__tests__/useChatConfiguration.newChatGuard.test.ts`:

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

import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import storage from '@/utils/storage'

import { useChatConfiguration } from '../useChatConfiguration'

vi.mock('@/utils/storage', () => ({
  default: { put: vi.fn(), get: vi.fn(() => []), getObject: vi.fn(() => ({})), remove: vi.fn() },
}))
vi.mock('@/store', () => ({ assistantsStore: { getAssistant: vi.fn() } }))
vi.mock('@/store/chats', () => ({ chatsStore: { currentChat: { id: '', history: [] } } }))
vi.mock('@/store/user', () => ({ userStore: { user: { userId: 'user-1' } } }))

const storagePut = storage.put as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('handleSetSelectedSkills with currentChat.id === "" (not-yet-created chat)', () => {
  it('persists under chatSkillsKey(\'\') instead of skipping the write', () => {
    const { result } = renderHook(() => useChatConfiguration())
    const skill = { value: 'skill-a', label: 'Skill A' }

    result.current.setSelectedSkills([skill])

    expect(storagePut).toHaveBeenCalledWith('user-1', 'chat-skills-', [skill])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/chat/hooks/__tests__/useChatConfiguration.newChatGuard.test.ts --project unit`
Expected: FAIL — `storagePut` is not called at all, because `if (chatId && userId)` treats
`chatId === ''` as falsy.

- [ ] **Step 3: Fix the guard**

In `src/pages/chat/hooks/useChatConfiguration.tsx`, change line 122 from:
`if (chatId && userId) {` to `if (chatId !== undefined && userId) {`, inside
`handleSetSelectedSkills` only (lines 117-127). Do not change the sibling guards in
`handleSetDynamicToolsConfig` (line 98) or `handleSetHideToolOutputs` (line 110) — out of scope
per spec Non-goals.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/chat/hooks/__tests__/useChatConfiguration.newChatGuard.test.ts --project unit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/hooks/useChatConfiguration.tsx src/pages/chat/hooks/__tests__/useChatConfiguration.newChatGuard.test.ts
```
Commit per the repository's existing convention.

---

### Task 3: Migrate the `''`-keyed entry to the real chat id in the reload effect

**Files:**
- Modify: `src/pages/chat/hooks/useChatConfiguration.tsx:184-198` (the reload `useEffect`), and add
  one helper near `loadChatSkills`/`saveChatSkills` imports (lines 39-49).
- Test: `src/pages/chat/hooks/__tests__/useChatConfiguration.newChatGuard.test.ts` (extend from
  Task 2)

**Interfaces:**
- Consumes: `loadChatSkills(userId, chatId)` (line 47), `saveChatSkills` (imported, line 30),
  `storage.remove(userId, key)` (`src/utils/storage.ts:34`), `chatSkillsKey` (imported, line 25).
- Produces: once `currentChat?.id` transitions from `''` to a real id, any `chatSkillsKey('')`
  entry is copied to `chatSkillsKey(realId)` and the `''` entry is removed, before
  `setSelectedSkills` runs. Task 5's shape guard wraps this same read.

Test-first: yes — "migrates the '' entry to the real id and removes the '' entry once currentChat.id
becomes real" (does not exist yet; no migration code exists).

- [ ] **Step 1: Write the failing test**

Extend `src/pages/chat/hooks/__tests__/useChatConfiguration.newChatGuard.test.ts` — change the
`chatsStore` mock to a mutable object so the test can simulate a chat-id transition, and add:

```typescript
vi.mock('@/store/chats', () => ({ chatsStore: { currentChat: { id: '', history: [] } } }))
```
becomes (replace the mock declaration):
```typescript
const mockChatsStore = { currentChat: { id: '', history: [] as unknown[] } }
vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
```

Add:

```typescript
describe('reload effect migrates the "" entry to the real chat id', () => {
  it('copies chatSkillsKey(\'\') to the real id key and removes the \'\' entry', () => {
    const skill = { value: 'skill-a', label: 'Skill A' }
    const storageGet = storage.get as ReturnType<typeof vi.fn>
    const storageRemove = storage.remove as ReturnType<typeof vi.fn>
    storageGet.mockImplementation((_userId: string, key: string) =>
      key === 'chat-skills-' ? [skill] : []
    )
    mockChatsStore.currentChat = { id: '', history: [] }

    const { rerender } = renderHook(() => useChatConfiguration())

    mockChatsStore.currentChat = { id: 'real-id', history: [{ role: 'user' }] }
    rerender()

    expect(storagePut).toHaveBeenCalledWith('user-1', 'chat-skills-real-id', [skill])
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-skills-')
  })

  it('is a no-op when nothing is stored under chatSkillsKey(\'\')', () => {
    const storageGet = storage.get as ReturnType<typeof vi.fn>
    storageGet.mockReturnValue([])
    mockChatsStore.currentChat = { id: '', history: [] }

    const { rerender } = renderHook(() => useChatConfiguration())

    mockChatsStore.currentChat = { id: 'real-id', history: [{ role: 'user' }] }
    expect(() => rerender()).not.toThrow()
    expect(storagePut).not.toHaveBeenCalledWith('user-1', 'chat-skills-real-id', expect.anything())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/chat/hooks/__tests__/useChatConfiguration.newChatGuard.test.ts --project unit`
Expected: FAIL on the first new test — no migration happens, so `storagePut`/`storageRemove` are
never called with those arguments.

- [ ] **Step 3: Implement the migration**

In `src/pages/chat/hooks/useChatConfiguration.tsx`, inside the reload `useEffect` (lines 184-198),
before the existing `if (chatId && userId) { ... }` block, insert a migration step that only runs
when `chatId` is a real (non-empty) id:

```typescript
    const chatId = currentChat?.id
    const userId = userStore.user?.userId

    if (chatId && userId) {
      const pendingSkills = loadChatSkills(userId, '')
      if (pendingSkills.length) {
        saveChatSkills(userId, chatId, pendingSkills)
        storage.remove(userId, chatSkillsKey(''))
      }
      if (currentChat?.history.length) {
        setDynamicToolsConfig(loadChatTools(userId, chatId))
        setSelectedSkills(loadChatSkills(userId, chatId))
      }
      setHideToolOutputs(loadChatHideToolOutputs(userId, chatId))
    } else {
      setDynamicToolsConfig(DEFAULT_TOOLS_CONFIG)
      setSelectedSkills([])
      setHideToolOutputs(false)
    }
```

This reuses `loadChatSkills`/`saveChatSkills`/`storage.remove`/`chatSkillsKey` already imported at
the top of the file — no new exports, no new file.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/chat/hooks/__tests__/useChatConfiguration.newChatGuard.test.ts --project unit`
Expected: PASS, both new tests and the Task 2 test green.

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/hooks/useChatConfiguration.tsx src/pages/chat/hooks/__tests__/useChatConfiguration.newChatGuard.test.ts
```
Commit per the repository's existing convention.

---

### Task 4: Harden `sweepOrphanedChatKeys` to never delete the `''`-sentinel key

**Files:**
- Modify: `src/utils/chatStorageUtils.ts:109-125` (existence-sweep branch)
- Test: `src/utils/__tests__/chatStorageUtils.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `sweepOrphanedChatKeys(userId, validChatIds)`'s existence-sweep branch now leaves any
  `chatSkillsKey('')`/`chatToolsConfigKey('')`/`chatHideToolOutputsKey('')` key alone regardless of
  `validChatIds` membership. The empty-value sweep (lines 127-132) is untouched and can still
  delete a `''`-keyed entry if its *content* is empty — that is correct, pre-existing behavior.

Test-first: yes — "chatSkillsKey('') entry survives an existence sweep with a populated
validChatIds list that does not contain ''" (does not exist yet; current code deletes it).

- [ ] **Step 1: Write the failing test**

Add to `src/utils/__tests__/chatStorageUtils.test.ts`, inside the `describe('existence sweep
(with validChatIds)', ...)` block (after line 104):

```typescript
    it('keeps the "" sentinel chat-skills key even when validChatIds is populated and excludes it', () => {
      localStorage.setItem(`${USER}_chat-skills-`, '[{"value":"skill-a"}]')
      sweepOrphanedChatKeys(USER, ['current-chat'])
      expect(localStorage.getItem(`${USER}_chat-skills-`)).not.toBeNull()
    })

    it('still removes the "" sentinel chat-skills key when its content is empty (empty-value sweep)', () => {
      localStorage.setItem(`${USER}_chat-skills-`, '[]')
      sweepOrphanedChatKeys(USER, ['current-chat'])
      expect(localStorage.getItem(`${USER}_chat-skills-`)).toBeNull()
    })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/chatStorageUtils.test.ts --project unit`
Expected: FAIL on the first new test — the existence sweep currently deletes `chat-skills-`
because `''` is not in `['current-chat']`. The second new test should already pass (verifies the
guard does not disable the unrelated empty-value sweep).

- [ ] **Step 3: Add the one-line guard**

In `src/utils/chatStorageUtils.ts`, inside the existence-sweep branch (lines 109-125), change:

```typescript
        if (!validChatIds.includes(chatId)) {
          localStorage.removeItem(key)
          return
        }
```

to:

```typescript
        if (chatId !== '' && !validChatIds.includes(chatId)) {
          localStorage.removeItem(key)
          return
        }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/chatStorageUtils.test.ts --project unit`
Expected: PASS, all tests in the file green including the pre-existing ones (no regression to
real-id sweep behavior).

- [ ] **Step 5: Commit**

```bash
git add src/utils/chatStorageUtils.ts src/utils/__tests__/chatStorageUtils.test.ts
```
Commit per the repository's existing convention.

---

### Task 5: Shape guard on `loadChatSkills` to filter malformed entries

**Files:**
- Modify: `src/pages/chat/hooks/useChatConfiguration.tsx:47-49`
- Test: new file `src/pages/chat/hooks/__tests__/useChatConfiguration.skillShapeGuard.test.ts`

**Interfaces:**
- Consumes: `storage.get<SkillOption>(userId, key)` (unchanged signature).
- Produces: `loadChatSkills(userId, chatId): SkillOption[]` now returns only elements that are
  objects with a non-empty string `.value`; bare strings, `null`, and objects missing `.value` are
  dropped. No caller-visible signature change — `handleSetSelectedSkills`, the reload effect
  (Task 3), and Task 6's integration test all consume this return value unchanged.

Test-first: yes — "loadChatSkills drops a bare-string element and an object missing .value" (does
not exist yet; current code returns the raw parsed array unfiltered).

- [ ] **Step 1: Write the failing test**

Create `src/pages/chat/hooks/__tests__/useChatConfiguration.skillShapeGuard.test.ts`:

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

import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import storage from '@/utils/storage'

import { useChatConfiguration } from '../useChatConfiguration'

vi.mock('@/utils/storage', () => ({
  default: {
    put: vi.fn(),
    get: vi.fn(() => ['skill-a', { value: 'skill-b', label: 'Skill B' }, { label: 'no value' }]),
    getObject: vi.fn(() => ({})),
    remove: vi.fn(),
  },
}))
vi.mock('@/store', () => ({ assistantsStore: { getAssistant: vi.fn() } }))
vi.mock('@/store/chats', () => ({
  chatsStore: { currentChat: { id: 'real-id', history: [{ role: 'user' }] } },
}))
vi.mock('@/store/user', () => ({ userStore: { user: { userId: 'user-1' } } }))

describe('loadChatSkills shape guard', () => {
  it('filters out a bare-string element and an object missing .value', () => {
    const { result } = renderHook(() => useChatConfiguration())

    expect(result.current.selectedSkills).toEqual([{ value: 'skill-b', label: 'Skill B' }])
    expect(storage.get).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/chat/hooks/__tests__/useChatConfiguration.skillShapeGuard.test.ts --project unit`
Expected: FAIL — `selectedSkills` currently equals the raw unfiltered
`['skill-a', { value: 'skill-b', label: 'Skill B' }, { label: 'no value' }]`.

- [ ] **Step 3: Add the shape guard**

In `src/pages/chat/hooks/useChatConfiguration.tsx`, change lines 47-49 from:

```typescript
const loadChatSkills = (userId: string, chatId: string): SkillOption[] => {
  return storage.get<SkillOption>(userId, chatSkillsKey(chatId))
}
```

to:

```typescript
const isValidSkillOption = (value: unknown): value is SkillOption =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { value?: unknown }).value === 'string' &&
  (value as { value: string }).value.length > 0

const loadChatSkills = (userId: string, chatId: string): SkillOption[] => {
  return storage.get<SkillOption>(userId, chatSkillsKey(chatId)).filter(isValidSkillOption)
}
```

This follows the same parse-and-check predicate style as `isDefaultToolsConfig`/`isEmptyChatValue`
in `chatStorageUtils.ts` — a plain function, no new exports, no new file.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/chat/hooks/__tests__/useChatConfiguration.skillShapeGuard.test.ts --project unit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/hooks/useChatConfiguration.tsx src/pages/chat/hooks/__tests__/useChatConfiguration.skillShapeGuard.test.ts
```
Commit per the repository's existing convention.

---

### Task 6: Integration regression test — new chat → skills → navigate → return → send

**Files:**
- Create: `src/pages/chat/hooks/__tests__/useChatConfiguration.skillsPersistence.integration.test.ts`

**Interfaces:**
- Consumes: `useChatConfiguration()` (real hook, Tasks 2/3/5 behavior), real `chatsStore` from
  `@/store/chats` (`startNewChat`, `createChat`, `getChats`), real `localStorage`, mocked
  `@/utils/api` only (per `vitest.workspace.ts`'s `integration` project — the `unit` project
  globally mocks `@/utils/storage`, which would test the wrong thing here).
- Produces: nothing consumed by later tasks — this is the terminal regression test named in the
  spec's Testing section and acceptance criteria.

Test-first: yes — "selected skills survive a remount simulating Assistants navigation, for a
user's first-ever chat where createChat()'s un-awaited getChats() sweep fires" (no existing test
combines `useChatConfiguration` + real `chatsStore` end to end).

- [ ] **Step 1: Write the failing integration test**

Create `src/pages/chat/hooks/__tests__/useChatConfiguration.skillsPersistence.integration.test.ts`:

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

import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { chatsStore } from '@/store/chats'
import { userStore } from '@/store/user'

import { useChatConfiguration } from '../useChatConfiguration'

const fetchMock = vi.fn()

const jsonResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  type: 'basic',
  json: () => Promise.resolve(body),
  clone: () => ({ json: () => Promise.resolve(body) }),
})

beforeEach(() => {
  localStorage.clear()
  userStore.user = { userId: 'user-1' } as typeof userStore.user
  chatsStore.chats = []
  chatsStore.currentChat = null
  fetchMock.mockReset()
  fetchMock.mockImplementation((url: string, init?: { method?: string }) => {
    const method = init?.method ?? 'GET'
    if (String(url).includes('v1/conversations/new')) {
      return Promise.resolve(
        jsonResponse({ id: '', history: [], is_workflow: false, llm_model: null })
      )
    }
    if (String(url).includes('v1/conversations') && method === 'POST') {
      return Promise.resolve(jsonResponse({ id: 'real-chat-1' }))
    }
    if (String(url).match(/v1\/conversations\/real-chat-1$/)) {
      return Promise.resolve(
        jsonResponse({
          id: 'real-chat-1',
          history: [{ role: 'user' }],
          is_workflow: false,
          llm_model: null,
        })
      )
    }
    if (String(url).includes('v1/conversations') && method === 'GET') {
      // getChats() during an empty chat list — this is the un-awaited sweep call
      return Promise.resolve(jsonResponse({ items: [{ id: 'real-chat-1' }] }))
    }
    return Promise.resolve(jsonResponse({}))
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('chat-skills persistence across a simulated Assistants navigation', () => {
  it('keeps selected skills for a first-ever chat despite the empty-chat-list sweep', async () => {
    await chatsStore.startNewChat()
    expect(chatsStore.currentChat?.id).toBe('')

    const { result, rerender, unmount } = renderHook(() => useChatConfiguration())

    const skill = { value: 'skill-a', label: 'Skill A' }
    result.current.setSelectedSkills([skill])
    expect(localStorage.getItem('user-1_chat-skills-')).not.toBeNull()

    await chatsStore.createChat()
    // createChat() triggers an un-awaited getChats() when chats.length was 0 at call time —
    // give its promise chain a tick to run before asserting the sentinel survived.
    await Promise.resolve()
    await Promise.resolve()

    rerender()

    expect(result.current.selectedSkills).toEqual([skill])
    expect(localStorage.getItem('user-1_chat-skills-')).toBeNull()
    expect(localStorage.getItem('user-1_chat-skills-real-chat-1')).toContain('skill-a')

    // Simulate navigating to Assistants and back: unmount and remount against the same chat.
    unmount()
    const { result: remounted } = renderHook(() => useChatConfiguration())

    expect(remounted.current.selectedSkills).toEqual([skill])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/chat/hooks/__tests__/useChatConfiguration.skillsPersistence.integration.test.ts --project integration`
Expected: FAIL before Tasks 1-5 are applied (or if any regresses) — either the `''` entry is
missing after `setSelectedSkills` (pre-Task-2 guard), or it is gone after `createChat()` (pre-Task-4
sweep guard), or `selectedSkills` is empty/malformed after remount (pre-Task-3 migration or
pre-Task-5 shape guard).

- [ ] **Step 3: Confirm it passes with Tasks 1-5 applied**

No new implementation code in this task — it exercises the combined behavior of Tasks 1-5. If any
assertion fails, identify which task's change is incomplete and fix that task's implementation
(do not add new logic here).

Run: `npx vitest run src/pages/chat/hooks/__tests__/useChatConfiguration.skillsPersistence.integration.test.ts --project integration`
Expected: PASS.

- [ ] **Step 4: Run the full unit + integration suites for the touched files to check for regressions**

Run: `npx vitest run --project unit src/store/__tests__/chatGeneration.storageGuards.test.ts src/pages/chat/hooks/__tests__/useChatConfiguration.newChatGuard.test.ts src/pages/chat/hooks/__tests__/useChatConfiguration.skillShapeGuard.test.ts src/utils/__tests__/chatStorageUtils.test.ts`
Run: `npx vitest run --project integration src/pages/chat/hooks/__tests__/useChatConfiguration.skillsPersistence.integration.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/hooks/__tests__/useChatConfiguration.skillsPersistence.integration.test.ts
```
Commit per the repository's existing convention.

---

## Self-Review Notes

**Spec coverage:** Approach steps 1-6 map to Tasks 1 (step 1), 2 (step 2), 3 (step 3), 4 (step 4),
5 (step 5) respectively; step 6 ("leave X untouched") is a constraint, not a task, and is captured
in Global Constraints. The Testing section's five bullet points map to Tasks 1, 2, 3, 4, 5's tests
respectively, and its integration-regression bullet maps to Task 6. All six Acceptance Criteria are
covered: navigate-away-and-back for a brand-new chat (Tasks 2+3, verified in Task 6); first-ever-chat
sweep race (Task 4, verified in Task 6); no null/undefined in `skill_ids` (Task 5 filters at the
read boundary before it ever reaches a `skillIds` option); malformed entries excluded gracefully
(Task 5); continuing a chat without a 422 (end-to-end result of Tasks 1-5); regression test
including the first-ever-chat variant (Task 6).

**Negative-constraint pass:**
- "No fix to the identical guard in `handleSetDynamicToolsConfig`/`handleSetHideToolOutputs`" —
  honored: Task 2 Step 3 explicitly touches only `handleSetSelectedSkills`'s guard.
- "No change to `ChatGenerationOptions` or any other shared type" — honored: no task modifies
  `src/types/chatGeneration.ts`.
- "No change to how `/model`'s `skill_ids` wire payload is constructed" — honored: Task 1 removes
  only the `saveChatSkills` storage write at line 444; line 478's `skill_ids: skillIds?.length ?
  skillIds : undefined` is untouched by every task.
- "No other changes to `sweepOrphanedChatKeys`'s behavior or call sites beyond the one-line `''`
  guard... no new call sites, no change to the empty-value sweep branch, no `getChats()`
  await-ordering change" — honored: Task 4 Step 3 is exactly a one-line condition change inside the
  existing existence-sweep branch; no task touches `chats.ts`'s `createChat`/`getChats` call
  ordering, and Task 4's second new test explicitly asserts the empty-value sweep still fires
  unchanged.
- "No live catalog-existence check for selected skills against the paginated skills-search fetch" —
  honored: Task 5's `isValidSkillOption` checks only shape (`.value` is a non-empty string), never
  calls `useChatConfigSkills` or any skills-search endpoint.
- No task adds a new dependency, new storage abstraction, or new exported helper beyond the
  file-local `isValidSkillOption` predicate, consistent with the spec's "no new file, no new
  exported helper" instruction for both Task 4 and Task 5's changes.

negative-constraints: addressed above — none skipped.
