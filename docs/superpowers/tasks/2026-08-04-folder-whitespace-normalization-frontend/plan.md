# EPMCDME-13806: Frontend Whitespace Trim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a defensive frontend layer that trims leading/trailing whitespace from folder names before they're sent to the API, and defensively trims folder names at render time, so "FAQ" and " FAQ " never appear as visually distinct folders in the UI even before backend-migrated rows are fully clean.

**Architecture:** Trim-then-send in the Valtio store (`src/store/chats.ts`), mirroring the existing `renameChat` pattern exactly. Trim-on-submit in `FolderFormPopup.tsx`'s form handler (not via Yup `.transform()` — no such convention exists in this codebase). Defensive `.trim()` at render time in three display components. No backend, migration, or collision-handling changes — that's done and merged separately.

**Tech Stack:** React, TypeScript, Valtio (proxy store), React Hook Form + Yup, Vitest + React Testing Library.

## Global Constraints

- Store methods, not components, own all `api.*` calls (`.ai-run/guides/patterns/state-management.md`).
- `sonarjs/no-duplicate-string` is error-level with threshold 9 — do not introduce 9+ repeats of the same string literal across files without extracting a constant.
- `DEFAULT_CHAT_FOLDER` constant value is `'Chats section'` (`src/constants/chats.ts:19`) — folder values equal to this sentinel are normalized to `''` (meaning "no folder") in `moveChatToFolder`, `startNewChat`, and `createChat`. Trim the raw folder value *before* comparing it to `DEFAULT_CHAT_FOLDER`.
- `moveChatToFolder` and `startNewChat`/`createChat` treat an empty folder value (`''`) as a valid, meaningful state (chat has no folder) — do not add an empty-after-trim rejection to these three methods. Only `createFolder` and `renameChatFolder` (where an empty folder *name* is never valid) get the reject-and-toast guard, matching the existing `renameChat` pattern at `src/store/chats.ts:335-349`.

---

### Task 1: Trim + reject-empty in `createFolder`

**Files:**
- Modify: `src/store/chats.ts:453-455`
- Test: `src/store/__tests__/chats.folderWhitespace.test.ts` (new file)

**Interfaces:**
- Consumes: existing `api.post`, `chatsStore.getFolders()`, `toaster.error` (all already imported/used in `chats.ts`).
- Produces: `chatsStore.createFolder(folder: string): Promise<...>` — same public signature as before; internal behavior now trims and rejects empty-after-trim.

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/chats.folderWhitespace.test.ts`:

```ts
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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import api from '@/utils/api'
import toaster from '@/utils/toaster'

import { chatsStore } from '../chats'

vi.mock('valtio', () => ({ proxy: vi.fn((obj) => obj) }))
vi.mock('@/utils/api', () => ({
  default: {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    downloadFileStream: vi.fn(),
  },
}))
vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))
vi.mock('@/utils/storage', () => ({
  default: { put: vi.fn(), get: vi.fn(), getObject: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/store/recentChats', () => ({
  recentChatsStore: { removeRecentChat: vi.fn(), removeRecentChatsByFolder: vi.fn() },
}))
vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: {
    removeExecutionsByConversationId: vi.fn(),
    removeAllChatLinkedExecutions: vi.fn(),
  },
}))
vi.mock('@/hooks/useVueRouter', () => ({ router: { push: vi.fn(), replace: vi.fn() } }))

const mockUserStore = vi.hoisted(() => ({ user: { userId: 'user-1' } }))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))

const apiPost = api.post as ReturnType<typeof vi.fn>
const toasterError = toaster.error as ReturnType<typeof vi.fn>

const jsonResponse = (data: unknown = {}) =>
  ({ json: () => Promise.resolve(data) } as unknown as Response)

beforeEach(() => {
  vi.clearAllMocks()
  chatsStore.chats = []
  chatsStore.chatFolders = []
  chatsStore.currentChat = null
})

describe('createFolder — whitespace trim', () => {
  it('trims leading/trailing whitespace before posting', async () => {
    apiPost.mockResolvedValue(jsonResponse())
    const getFolders = vi.spyOn(chatsStore, 'getFolders').mockResolvedValue([])
    await chatsStore.createFolder('  FAQ  ')
    expect(apiPost).toHaveBeenCalledWith('v1/conversations/folder', { folder: 'FAQ' })
    getFolders.mockRestore()
  })

  it('rejects a whitespace-only folder name without calling the API', async () => {
    await chatsStore.createFolder('   ')
    expect(apiPost).not.toHaveBeenCalled()
    expect(toasterError).toHaveBeenCalledWith('Folder name cannot be empty')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/store/__tests__/chats.folderWhitespace.test.ts`
Expected: FAIL — `createFolder` currently posts `{ folder: '  FAQ  ' }` untrimmed, and never calls `toaster.error` for a whitespace-only name.

- [ ] **Step 3: Implement the minimal change**

In `src/store/chats.ts`, replace the `createFolder` method (lines 453-455):

```ts
  createFolder: (folder) => {
    const trimmedFolder = folder?.trim()
    if (!trimmedFolder) {
      toaster.error('Folder name cannot be empty')
      return Promise.resolve()
    }
    return api
      .post('v1/conversations/folder', { folder: trimmedFolder })
      .then(() => chatsStore.getFolders())
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/store/__tests__/chats.folderWhitespace.test.ts`
Expected: PASS (both `createFolder` tests)

- [ ] **Step 5: Commit**

```bash
git add src/store/chats.ts src/store/__tests__/chats.folderWhitespace.test.ts
git commit -m "EPMCDME-13806: trim folder name in createFolder"
```

---

### Task 2: Trim + reject-empty in `renameChatFolder`

**Files:**
- Modify: `src/store/chats.ts:489-494`
- Test: `src/store/__tests__/chats.folderWhitespace.test.ts` (append)

**Interfaces:**
- Consumes: same as Task 1.
- Produces: `chatsStore.renameChatFolder(oldFolder: string, newFolder: string): Promise<...>` — same public signature.

- [ ] **Step 1: Write the failing test**

Append to `src/store/__tests__/chats.folderWhitespace.test.ts`:

```ts
describe('renameChatFolder — whitespace trim', () => {
  it('trims both old and new folder names before the PUT call', async () => {
    const apiPut = api.put as ReturnType<typeof vi.fn>
    apiPut.mockResolvedValue(jsonResponse())
    const getFolders = vi.spyOn(chatsStore, 'getFolders').mockResolvedValue([])
    const getChats = vi.spyOn(chatsStore, 'getChats').mockResolvedValue([])
    await chatsStore.renameChatFolder('  Old  ', '  New  ')
    expect(apiPut).toHaveBeenCalledWith(
      `v1/conversations/folder/${encodeURIComponent('Old')}`,
      { folder: 'New' }
    )
    getFolders.mockRestore()
    getChats.mockRestore()
  })

  it('rejects a whitespace-only new folder name without calling the API', async () => {
    const apiPut = api.put as ReturnType<typeof vi.fn>
    await chatsStore.renameChatFolder('Old', '   ')
    expect(apiPut).not.toHaveBeenCalled()
    expect(toasterError).toHaveBeenCalledWith('Folder name cannot be empty')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/store/__tests__/chats.folderWhitespace.test.ts`
Expected: FAIL — `renameChatFolder` currently sends both names untrimmed and never guards an empty new name.

- [ ] **Step 3: Implement the minimal change**

In `src/store/chats.ts`, replace the `renameChatFolder` method (lines 489-494):

```ts
  renameChatFolder: (oldFolder, newFolder) => {
    const trimmedOldFolder = oldFolder?.trim()
    const trimmedNewFolder = newFolder?.trim()
    if (!trimmedNewFolder) {
      toaster.error('Folder name cannot be empty')
      return Promise.resolve()
    }
    return api
      .put(`v1/conversations/folder/${encodeURIComponent(trimmedOldFolder)}`, {
        folder: trimmedNewFolder,
      })
      .then(() => chatsStore.getFolders())
      .then(() => chatsStore.getChats())
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/store/__tests__/chats.folderWhitespace.test.ts`
Expected: PASS (all tests in the file so far)

- [ ] **Step 5: Commit**

```bash
git add src/store/chats.ts src/store/__tests__/chats.folderWhitespace.test.ts
git commit -m "EPMCDME-13806: trim folder names in renameChatFolder"
```

---

### Task 3: Trim in `moveChatToFolder`

**Files:**
- Modify: `src/store/chats.ts:496-517`
- Test: `src/store/__tests__/chats.folderWhitespace.test.ts` (append)

**Interfaces:**
- Consumes: same as Task 1/2, plus `chatsStore.findChat`, `DEFAULT_CHAT_FOLDER` (already imported in `chats.ts`).
- Produces: `chatsStore.moveChatToFolder(chatId: string, targetFolder: string): Promise<void>` — same public signature. No empty-after-trim guard here — `''` is a valid "no folder" target (see Global Constraints).

- [ ] **Step 1: Write the failing test**

Append to `src/store/__tests__/chats.folderWhitespace.test.ts`:

```ts
describe('moveChatToFolder — whitespace trim', () => {
  it('trims the target folder before sending it in the PUT body', async () => {
    chatsStore.chats = [{ id: 'chat-1', folder: '' } as any]
    const apiPut = api.put as ReturnType<typeof vi.fn>
    apiPut.mockResolvedValue(jsonResponse())
    const getChats = vi.spyOn(chatsStore, 'getChats').mockResolvedValue([])
    await chatsStore.moveChatToFolder('chat-1', '  FAQ  ')
    expect(apiPut).toHaveBeenCalledWith('v1/conversations/chat-1', { folder: 'FAQ' })
    getChats.mockRestore()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/store/__tests__/chats.folderWhitespace.test.ts`
Expected: FAIL — current code sends `{ folder: '  FAQ  ' }` untrimmed.

- [ ] **Step 3: Implement the minimal change**

In `src/store/chats.ts`, replace the `moveChatToFolder` method (lines 496-517):

```ts
  moveChatToFolder: async (chatId, targetFolder) => {
    const chat = chatsStore.findChat(chatId)

    if (!chat) return

    const trimmedTargetFolder = targetFolder?.trim()
    const folderValue = trimmedTargetFolder === DEFAULT_CHAT_FOLDER ? '' : trimmedTargetFolder
    await api
      .put(`v1/conversations/${chatId}`, { folder: folderValue })
      .then((response) => {
        chat.folder = folderValue
        return response.json()
      })
      .then(() => {
        const displayName =
          trimmedTargetFolder === DEFAULT_CHAT_FOLDER ? 'Chats section' : trimmedTargetFolder
        toaster.info(`Chat moved to ${displayName || 'Chats section'}`)
        return chatsStore.getChats()
      })
      .catch((error) => {
        toaster.error('Failed to move chat')
        console.error('Failed to move chat:', error)
      })
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/store/__tests__/chats.folderWhitespace.test.ts`
Expected: PASS (all tests in the file so far)

- [ ] **Step 5: Commit**

```bash
git add src/store/chats.ts src/store/__tests__/chats.folderWhitespace.test.ts
git commit -m "EPMCDME-13806: trim target folder in moveChatToFolder"
```

---

### Task 4: Trim in `startNewChat`

**Files:**
- Modify: `src/store/chats.ts:271-291`
- Test: `src/store/__tests__/chats.folderWhitespace.test.ts` (append)

**Interfaces:**
- Consumes: same as Task 3.
- Produces: `chatsStore.startNewChat(assistantId?: string, folder?: string, isWorkflow?: boolean): Promise<Conversation>` — same public signature; `chatsStore.newChatParams.folder` now always holds the trimmed value, which `createChat` (Task 5) reads.

- [ ] **Step 1: Write the failing test**

Append to `src/store/__tests__/chats.folderWhitespace.test.ts`:

```ts
vi.mock('@/utils/chatHelpers', async () => {
  const actual = await vi.importActual<typeof import('@/utils/chatHelpers')>('@/utils/chatHelpers')
  return { ...actual, transformChatBEtoFE: vi.fn((dto) => dto) }
})

describe('startNewChat — whitespace trim', () => {
  it('trims the folder before building the URL params and storing newChatParams', async () => {
    const apiGet = api.get as ReturnType<typeof vi.fn>
    apiGet.mockResolvedValue(jsonResponse({ id: 'chat-1' }))
    await chatsStore.startNewChat('assistant-1', '  FAQ  ', false)
    expect(apiGet).toHaveBeenCalledWith(
      expect.stringContaining(`folder=${encodeURIComponent('FAQ')}`)
    )
    expect(chatsStore.newChatParams?.folder).toBe('FAQ')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/store/__tests__/chats.folderWhitespace.test.ts`
Expected: FAIL — current code builds `folder=%20%20FAQ%20%20` (URL-encoded untrimmed value) and stores the untrimmed folder in `newChatParams`.

- [ ] **Step 3: Implement the minimal change**

In `src/store/chats.ts`, replace the `startNewChat` method (lines 271-291):

```ts
  startNewChat: async (assistantId = '', folder = '', isWorkflow = false) => {
    const trimmedFolder = folder?.trim()
    const folderValue = trimmedFolder === DEFAULT_CHAT_FOLDER ? '' : trimmedFolder

    const params = new URLSearchParams()
    if (assistantId) params.set('initial_assistant_id', assistantId)
    if (folderValue) params.set('folder', folderValue)
    params.set('is_workflow', String(isWorkflow))

    const templateResponse = await api.get(`v1/conversations/new?${params.toString()}`)
    const fullChatDto = await templateResponse.json()

    const newConversation = transformChatBEtoFE(fullChatDto)

    newConversation.id = ''

    chatsStore.isNewChat = true
    chatsStore.newChatParams = { assistantId, folder: folderValue, isWorkflow }
    chatsStore.currentChat = newConversation

    return newConversation
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/store/__tests__/chats.folderWhitespace.test.ts`
Expected: PASS (all tests in the file so far)

- [ ] **Step 5: Commit**

```bash
git add src/store/chats.ts src/store/__tests__/chats.folderWhitespace.test.ts
git commit -m "EPMCDME-13806: trim folder in startNewChat"
```

---

### Task 5: Trim in `createChat`

**Files:**
- Modify: `src/store/chats.ts:293-324`
- Test: `src/store/__tests__/chats.folderWhitespace.test.ts` (append)

**Interfaces:**
- Consumes: same as Task 3/4. `chatsStore.newChatParams` — set by Task 4's `startNewChat` (already trimmed on that path), but `createChat` re-trims defensively so it's correct regardless of how `newChatParams` was populated.
- Produces: `chatsStore.createChat(): Promise<Conversation>` — same public signature.

- [ ] **Step 1: Write the failing test**

Append to `src/store/__tests__/chats.folderWhitespace.test.ts`:

```ts
describe('createChat — whitespace trim', () => {
  it('trims newChatParams.folder before posting', async () => {
    chatsStore.newChatParams = { assistantId: 'assistant-1', folder: '  FAQ  ', isWorkflow: false }
    const apiPost = api.post as ReturnType<typeof vi.fn>
    apiPost.mockResolvedValue(jsonResponse({ id: 'chat-1' }))
    const apiGet = api.get as ReturnType<typeof vi.fn>
    apiGet.mockResolvedValue(jsonResponse({ id: 'chat-1' }))
    const getChats = vi.spyOn(chatsStore, 'getChats').mockResolvedValue([])
    const getFolders = vi.spyOn(chatsStore, 'getFolders').mockResolvedValue([])
    const getChat = vi.spyOn(chatsStore, 'getChat').mockResolvedValue({ id: 'chat-1' } as any)
    await chatsStore.createChat()
    expect(apiPost).toHaveBeenCalledWith(
      'v1/conversations',
      expect.objectContaining({ folder: 'FAQ' })
    )
    getChats.mockRestore()
    getFolders.mockRestore()
    getChat.mockRestore()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/store/__tests__/chats.folderWhitespace.test.ts`
Expected: FAIL — current code posts `folder: '  FAQ  '` untrimmed.

- [ ] **Step 3: Implement the minimal change**

In `src/store/chats.ts`, replace the `createChat` method (lines 293-324):

```ts
  createChat: async () => {
    const params = chatsStore.newChatParams ?? {
      assistantId: '',
      folder: '',
      isWorkflow: false,
    }

    const trimmedFolder = params.folder?.trim()
    const folderValue = trimmedFolder === DEFAULT_CHAT_FOLDER ? '' : trimmedFolder
    const response = await api.post(`v1/conversations`, {
      initial_assistant_id: params.assistantId,
      folder: folderValue,
      is_workflow: params.isWorkflow,
    })
    const newChat = await response.json()
    const transformedChat = transformChatListItemDTOs([newChat])[0]

    if (chatsStore.chats.length) {
      chatsStore.chats.unshift(transformedChat)
    } else {
      chatsStore.getChats()
    }
    chatsStore.getFolders()

    const fullChat = await chatsStore.getChat(newChat.id)

    chatsStore.isNewChat = false
    chatsStore.newChatParams = null

    router.replace({ name: 'chats', params: { id: newChat.id } })

    return fullChat
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/store/__tests__/chats.folderWhitespace.test.ts`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Commit**

```bash
git add src/store/chats.ts src/store/__tests__/chats.folderWhitespace.test.ts
git commit -m "EPMCDME-13806: trim folder in createChat"
```

---

### Task 6: Trim submitted value in `FolderFormPopup.tsx`

**Files:**
- Modify: `src/pages/chat/components/ChatSidebar/FolderList/FolderFormPopup.tsx:56-65`
- Test: `src/pages/chat/components/ChatSidebar/FolderList/__tests__/FolderFormPopup.test.tsx` (new file)

**Interfaces:**
- Consumes: `chatsStore.createFolder`, `chatsStore.renameChatFolder` (Tasks 1-2, already trim internally — this task additionally ensures the raw submitted value passed to `onCreate` is trimmed too, since that callback is not covered by the store trim).
- Produces: no change to `FolderFormPopupPopup` props/signature.

- [ ] **Step 1: Write the failing test**

Create `src/pages/chat/components/ChatSidebar/FolderList/__tests__/FolderFormPopup.test.tsx`:

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

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import FolderFormPopup from '../FolderFormPopup'

vi.mock('valtio', () => ({ useSnapshot: vi.fn((store) => store) }))

const mockCreateFolder = vi.fn()
const mockRenameChatFolder = vi.fn()
vi.mock('@/store/chats', () => ({
  chatsStore: {
    createFolder: (...args: unknown[]) => mockCreateFolder(...args),
    renameChatFolder: (...args: unknown[]) => mockRenameChatFolder(...args),
  },
}))

vi.mock('@/components/Popup', () => ({
  default: ({ children, onSubmit, submitText }: any) => (
    <div>
      {children}
      <button onClick={onSubmit}>{submitText}</button>
    </div>
  ),
}))

vi.mock('@/components/form/Input', () => ({
  default: ({ value, onChange, error }: any) => (
    <div>
      <input aria-label="folder-name-input" value={value ?? ''} onChange={onChange} />
      {error && <span>{error}</span>}
    </div>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FolderFormPopup — submit trim', () => {
  it('trims the folder name before calling createFolder and onCreate', async () => {
    const onCreate = vi.fn()
    mockCreateFolder.mockResolvedValue(undefined)
    render(<FolderFormPopup isVisible onHide={vi.fn()} onCreate={onCreate} />)

    const input = screen.getByLabelText('folder-name-input')
    fireEvent.change(input, { target: { value: '  FAQ  ' } })
    fireEvent.click(screen.getByText('Create'))

    await vi.waitFor(() => expect(mockCreateFolder).toHaveBeenCalledWith('FAQ'))
    expect(onCreate).toHaveBeenCalledWith('FAQ')
  })

  it('trims both stored folder and submitted name before calling renameChatFolder', async () => {
    const onCreate = vi.fn()
    mockRenameChatFolder.mockResolvedValue(undefined)
    render(
      <FolderFormPopup
        isEditing
        folder="Old"
        isVisible
        onHide={vi.fn()}
        onCreate={onCreate}
      />
    )

    const input = screen.getByLabelText('folder-name-input')
    fireEvent.change(input, { target: { value: '  New  ' } })
    fireEvent.click(screen.getByText('Save'))

    await vi.waitFor(() => expect(mockRenameChatFolder).toHaveBeenCalledWith('Old', 'New'))
    expect(onCreate).toHaveBeenCalledWith('New')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/pages/chat/components/ChatSidebar/FolderList/__tests__/FolderFormPopup.test.tsx`
Expected: FAIL — `onSubmit` currently calls `createFolder`/`renameChatFolder`/`onCreate` with the raw untrimmed `folderName` (`'  FAQ  '` / `'  New  '`).

- [ ] **Step 3: Implement the minimal change**

In `src/pages/chat/components/ChatSidebar/FolderList/FolderFormPopup.tsx`, replace the `onSubmit` handler (lines 56-65):

```ts
  const onSubmit = handleSubmit(async ({ folderName }) => {
    const trimmedFolderName = folderName.trim()

    if (isEditing && folder) {
      await renameChatFolder(folder, trimmedFolderName)
    } else {
      await createFolder(trimmedFolderName)
    }

    onCreate?.(trimmedFolderName)
    onHide()
  })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/pages/chat/components/ChatSidebar/FolderList/__tests__/FolderFormPopup.test.tsx`
Expected: PASS (both tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/ChatSidebar/FolderList/FolderFormPopup.tsx src/pages/chat/components/ChatSidebar/FolderList/__tests__/FolderFormPopup.test.tsx
git commit -m "EPMCDME-13806: trim submitted folder name in FolderFormPopup"
```

---

### Task 7: Defensive render-trim in `FolderList.tsx`, `SearchResultItem.tsx`, `MoveChatPopup.tsx`

**Files:**
- Modify: `src/pages/chat/components/ChatSidebar/FolderList/FolderList.tsx:114-166`
- Modify: `src/pages/chat/components/ChatSearchPanel/SearchResultItem.tsx:46-51`
- Modify: `src/pages/chat/components/ChatSidebar/ChatList/MoveChatPopup.tsx:61-75`

**Interfaces:**
- No signature changes to any component's props. Purely internal render-value normalization.

**Test-first: no** — per approved spec, render-layer defensive trims are code-only; existing component tests (`FolderList.test.tsx`) are not extended for this bug-level, low-risk display fix. Verify manually by running the existing test suite (must stay green) after the change.

- [ ] **Step 1: Update `FolderList.tsx`**

In `src/pages/chat/components/ChatSidebar/FolderList/FolderList.tsx`, inside the `folders.map((folder) => { ... })` callback (starting at line 114), trim `folder` once at the top and use the trimmed value everywhere else in that callback body:

```tsx
        {folders.map((rawFolder) => {
          const folder = rawFolder.trim()
          const isOverMaxLength = folder.length > MAX_CHAT_NAME_LENGTH
```

Then replace every remaining use of the original `folder` variable within that callback (the `pt.headerAction` object's `'aria-label'`, `'data-folder'`, `'aria-owns'` slug, the `data-pr-tooltip`/text content in the header, and the `id` passed to `<ChatList>`) — they already reference `folder`, so no further edits are needed there since `folder` now refers to the trimmed value. Confirm by reading the full callback body after the edit — every occurrence of `folder` inside it must resolve to the newly-declared trimmed `const folder`, not the outer `rawFolder` parameter.

- [ ] **Step 2: Update `SearchResultItem.tsx`**

In `src/pages/chat/components/ChatSearchPanel/SearchResultItem.tsx`, line 49, change:

```tsx
            <span className="truncate">{item.folder}</span>
```

to:

```tsx
            <span className="truncate">{item.folder?.trim()}</span>
```

- [ ] **Step 3: Update `MoveChatPopup.tsx`**

In `src/pages/chat/components/ChatSidebar/ChatList/MoveChatPopup.tsx`, inside `folderOptions` (lines 61-75), trim `name` when building each option:

```tsx
  const folderOptions = useMemo(() => {
    const options = chatFolders
      .map(({ name }) => {
        const trimmedName = name.trim()
        return {
          label: trimmedName,
          value: trimmedName,
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))

    const isDefaultOptIncluded = options.find((item) => item.value === DEFAULT_CHAT_FOLDER)
    if (!isDefaultOptIncluded) {
      options.unshift({ label: DEFAULT_CHAT_FOLDER, value: DEFAULT_CHAT_FOLDER })
    }

    return options.filter((option) => option.value !== selectedChat?.folder)
  }, [chatFolders, selectedChat])
```

- [ ] **Step 4: Run the existing test suites to confirm no regression**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/pages/chat/components/ChatSidebar/__tests__/FolderList.test.tsx src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarLists.test.tsx`
Expected: PASS (all existing assertions still hold — trimming `'Work'`/`'Personal'`, which have no whitespace, is a no-op for these fixtures)

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/ChatSidebar/FolderList/FolderList.tsx src/pages/chat/components/ChatSearchPanel/SearchResultItem.tsx src/pages/chat/components/ChatSidebar/ChatList/MoveChatPopup.tsx
git commit -m "EPMCDME-13806: defensive render-trim for folder names"
```

---

### Task 8: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit test suite**

Run: `LC_ALL=en_US.UTF-8 npm run test:unit`
Expected: PASS, zero regressions across the whole suite.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS — no `sonarjs/no-duplicate-string` violations or other lint errors introduced by the new files/edits.

- [ ] **Step 3: Commit (only if the above steps required fixes)**

```bash
git add -A
git commit -m "EPMCDME-13806: fix lint/test issues from full-suite verification"
```

If Steps 1-2 pass clean with no changes needed, skip this commit.
