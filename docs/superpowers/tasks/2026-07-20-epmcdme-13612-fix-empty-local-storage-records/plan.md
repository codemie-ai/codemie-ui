# EPMCDME-13612: Fix empty localStorage records causing QuotaExceededError

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop CodeMie from accumulating empty/orphaned localStorage entries that exhaust the browser quota and break chat.

**Architecture:** (1) A shared `sweepOrphanedChatKeys` utility removes empty and orphaned chat keys; it runs on startup and after chats load. (2) Write guards at two call sites prevent future empty writes. (3) Deletion functions clean up per-chat keys immediately when chats are deleted.

**Tech Stack:** TypeScript, Valtio, Vitest 1.6.1, jsdom, `@testing-library/react`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/utils/chatStorageUtils.ts` | `sweepOrphanedChatKeys(userId, validChatIds?)` |
| Create | `src/utils/__tests__/chatStorageUtils.test.ts` | Unit tests for the sweep utility |
| Modify | `src/store/chatGeneration.ts` lines 302–308 | Skip writes when skillIds is empty or toolsConfig is all-null; catch QuotaExceededError |
| Create | `src/store/__tests__/chatGeneration.storageGuards.test.ts` | Tests for write guards |
| Modify | `src/pages/chat/hooks/useChatConfiguration.tsx` lines 31–43 | Same guards in `saveChatTools` / `saveChatSkills` |
| Create | `src/pages/chat/hooks/__tests__/useChatConfiguration.storageGuards.test.ts` | Tests for hook guards |
| Modify | `src/store/chats.ts` — `deleteChat`, `deleteAllConversations`, `deleteChatFolder`, `getChats` | Remove per-chat keys on deletion; sweep after chats load |
| Create | `src/store/__tests__/chats.storageCleanup.test.ts` | Tests for deletion cleanup |
| Modify | `src/App.tsx` lines 52–56 | Call `sweepOrphanedChatKeys` in user-load effect (Pass 1) |

---

### Task 1: Create `sweepOrphanedChatKeys` utility

**Test-first: yes — `sweepOrphanedChatKeys` removes a chat-skills key with value [] from localStorage`**

**Files:**
- Create: `src/utils/chatStorageUtils.ts`
- Create: `src/utils/__tests__/chatStorageUtils.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/__tests__/chatStorageUtils.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { sweepOrphanedChatKeys } from '../chatStorageUtils'

const USER = 'user-1'
const OTHER = 'user-2'

beforeEach(() => localStorage.clear())

describe('sweepOrphanedChatKeys', () => {
  describe('empty-value sweep (no validChatIds)', () => {
    it('removes chat-skills key whose value is []', () => {
      localStorage.setItem(`${USER}_chat-skills-chat-1`, '[]')
      sweepOrphanedChatKeys(USER)
      expect(localStorage.getItem(`${USER}_chat-skills-chat-1`)).toBeNull()
    })

    it('keeps chat-skills key whose value is non-empty', () => {
      localStorage.setItem(`${USER}_chat-skills-chat-1`, '[{"value":"skill-a"}]')
      sweepOrphanedChatKeys(USER)
      expect(localStorage.getItem(`${USER}_chat-skills-chat-1`)).not.toBeNull()
    })

    it('removes chat-tools-config key whose both properties are null', () => {
      localStorage.setItem(
        `${USER}_chat-tools-config-chat-1`,
        '{"enableWebSearch":null,"enableCodeInterpreter":null}'
      )
      sweepOrphanedChatKeys(USER)
      expect(localStorage.getItem(`${USER}_chat-tools-config-chat-1`)).toBeNull()
    })

    it('keeps chat-tools-config key when enableWebSearch is non-null', () => {
      localStorage.setItem(
        `${USER}_chat-tools-config-chat-1`,
        '{"enableWebSearch":true,"enableCodeInterpreter":null}'
      )
      sweepOrphanedChatKeys(USER)
      expect(localStorage.getItem(`${USER}_chat-tools-config-chat-1`)).not.toBeNull()
    })

    it('keeps chat-tools-config key when enableCodeInterpreter is non-null', () => {
      localStorage.setItem(
        `${USER}_chat-tools-config-chat-1`,
        '{"enableWebSearch":null,"enableCodeInterpreter":true}'
      )
      sweepOrphanedChatKeys(USER)
      expect(localStorage.getItem(`${USER}_chat-tools-config-chat-1`)).not.toBeNull()
    })

    it('does not touch keys belonging to a different user', () => {
      localStorage.setItem(`${OTHER}_chat-skills-chat-1`, '[]')
      sweepOrphanedChatKeys(USER)
      expect(localStorage.getItem(`${OTHER}_chat-skills-chat-1`)).not.toBeNull()
    })

    it('does not touch unrelated keys for the same user', () => {
      localStorage.setItem(`${USER}_recent_chats`, '["chat-1"]')
      sweepOrphanedChatKeys(USER)
      expect(localStorage.getItem(`${USER}_recent_chats`)).not.toBeNull()
    })
  })

  describe('existence sweep (with validChatIds)', () => {
    it('removes chat-skills key whose chatId is not in validChatIds', () => {
      localStorage.setItem(`${USER}_chat-skills-old-chat`, '[{"value":"skill-a"}]')
      sweepOrphanedChatKeys(USER, ['current-chat'])
      expect(localStorage.getItem(`${USER}_chat-skills-old-chat`)).toBeNull()
    })

    it('keeps chat-skills key whose chatId is in validChatIds', () => {
      localStorage.setItem(`${USER}_chat-skills-current-chat`, '[{"value":"skill-a"}]')
      sweepOrphanedChatKeys(USER, ['current-chat'])
      expect(localStorage.getItem(`${USER}_chat-skills-current-chat`)).not.toBeNull()
    })

    it('removes empty-value key even when chatId is in validChatIds', () => {
      localStorage.setItem(`${USER}_chat-skills-current-chat`, '[]')
      sweepOrphanedChatKeys(USER, ['current-chat'])
      expect(localStorage.getItem(`${USER}_chat-skills-current-chat`)).toBeNull()
    })

    it('removes chat-tools-config key for unknown chatId', () => {
      localStorage.setItem(
        `${USER}_chat-tools-config-old-chat`,
        '{"enableWebSearch":true,"enableCodeInterpreter":null}'
      )
      sweepOrphanedChatKeys(USER, ['current-chat'])
      expect(localStorage.getItem(`${USER}_chat-tools-config-old-chat`)).toBeNull()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run src/utils/__tests__/chatStorageUtils.test.ts
```

Expected: FAIL — `Cannot find module '../chatStorageUtils'`

- [ ] **Step 3: Create the utility**

```typescript
// src/utils/chatStorageUtils.ts
const SKILLS_KEY = 'chat-skills-'
const TOOLS_KEY = 'chat-tools-config-'

const isDefaultToolsConfig = (value: unknown): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const cfg = value as Record<string, unknown>
  return cfg.enableWebSearch === null && cfg.enableCodeInterpreter === null
}

export const sweepOrphanedChatKeys = (userId: string, validChatIds?: string[]): void => {
  const skillsPrefix = `${userId}_${SKILLS_KEY}`
  const toolsPrefix = `${userId}_${TOOLS_KEY}`

  Object.keys(localStorage).forEach((key) => {
    const isSkills = key.startsWith(skillsPrefix)
    const isTools = key.startsWith(toolsPrefix)
    if (!isSkills && !isTools) return

    if (validChatIds !== undefined) {
      const chatId = isSkills ? key.slice(skillsPrefix.length) : key.slice(toolsPrefix.length)
      if (!validChatIds.includes(chatId)) {
        localStorage.removeItem(key)
        return
      }
    }

    try {
      const raw = localStorage.getItem(key)
      if (!raw) { localStorage.removeItem(key); return }
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length === 0) { localStorage.removeItem(key); return }
      if (isDefaultToolsConfig(parsed)) { localStorage.removeItem(key) }
    } catch {
      // unparseable — leave it
    }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx vitest run src/utils/__tests__/chatStorageUtils.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/chatStorageUtils.ts src/utils/__tests__/chatStorageUtils.test.ts
git commit -m "EPMCDME-13612: Add sweepOrphanedChatKeys utility"
```

---

### Task 2: Add write guards to `chatGeneration.ts`

**Test-first: yes — `storage.put` is not called with a chat-skills key when `skillIds` is `[]`**

**Files:**
- Modify: `src/store/chatGeneration.ts:297-312`
- Create: `src/store/__tests__/chatGeneration.storageGuards.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/store/__tests__/chatGeneration.storageGuards.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('valtio', () => ({ proxy: vi.fn((obj) => obj), ref: vi.fn((v) => v) }))
vi.mock('@/utils/api', () => ({
  default: { stream: vi.fn(), put: vi.fn(), get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  ABORT_ERROR: 'AbortError',
  DEFAULT_ERROR_MESSAGE: 'Error',
}))
vi.mock('@/store/assistants', () => ({
  assistantsStore: { getAssistant: vi.fn(), updateRecentAssistants: vi.fn() },
}))
vi.mock('@/store/user', () => ({ userStore: { user: { userId: 'user-1' } } }))
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }))
vi.mock('@/utils/stream', () => ({ default: vi.fn(), streamChunkToObject: vi.fn() }))
vi.mock('@/utils/chatHelpers', () => ({ transformChatHistoryFEtoBE: vi.fn(() => []) }))
vi.mock('@/utils/helpers', () => ({ fileToBase64: vi.fn() }))
vi.mock('@/utils/mcpAuth', () => ({ parseMCPAuthRequiredErrorPayload: vi.fn() }))
vi.mock('@/store/workflowExecutions', () => ({ workflowExecutionsStore: {} }))
vi.mock('@/utils/storage', () => ({ default: { put: vi.fn(), get: vi.fn(), remove: vi.fn() } }))

// Mutable chat store state controlled per test
const mockChatsStore = {
  currentChat: null as any,
  isNewChat: false,
  createChat: vi.fn(),
  updateChat: vi.fn(),
}
vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))

import storage from '@/utils/storage'
import { chatGenerationStore } from '../chatGeneration'

const storagePut = storage.put as ReturnType<typeof vi.fn>

const setupIsNewChat = (newChatId = 'new-id') => {
  mockChatsStore.currentChat = { id: 'old-id', llmModel: null, isWorkflow: false, history: [] }
  mockChatsStore.isNewChat = true
  mockChatsStore.createChat.mockImplementation(() => {
    mockChatsStore.isNewChat = false
    mockChatsStore.currentChat = null // causes recursive call to bail early
    return Promise.resolve()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockChatsStore.currentChat = null
  mockChatsStore.isNewChat = false
})

describe('chatGeneration write guards (isNewChat branch)', () => {
  it('does not write chat-skills when skillIds is []', async () => {
    setupIsNewChat()
    await chatGenerationStore.createChatGeneration({ skillIds: [] }).catch(() => {})
    expect(storagePut).not.toHaveBeenCalledWith(
      'user-1',
      expect.stringContaining('chat-skills-'),
      expect.anything()
    )
  })

  it('does not write chat-skills when skillIds is undefined', async () => {
    setupIsNewChat()
    await chatGenerationStore.createChatGeneration({}).catch(() => {})
    expect(storagePut).not.toHaveBeenCalledWith(
      'user-1',
      expect.stringContaining('chat-skills-'),
      expect.anything()
    )
  })

  it('writes chat-skills when skillIds is non-empty', async () => {
    setupIsNewChat('new-id')
    mockChatsStore.createChat.mockImplementation(() => {
      mockChatsStore.isNewChat = false
      mockChatsStore.currentChat = { id: 'new-id', llmModel: null }
      return Promise.resolve()
    })
    await chatGenerationStore.createChatGeneration({ skillIds: ['skill-a'] }).catch(() => {})
    expect(storagePut).toHaveBeenCalledWith('user-1', 'chat-skills-new-id', ['skill-a'])
  })

  it('does not write chat-tools-config when dynamicToolsConfig is all-null', async () => {
    setupIsNewChat()
    await chatGenerationStore
      .createChatGeneration({ dynamicToolsConfig: { enableWebSearch: null, enableCodeInterpreter: null } })
      .catch(() => {})
    expect(storagePut).not.toHaveBeenCalledWith(
      'user-1',
      expect.stringContaining('chat-tools-config-'),
      expect.anything()
    )
  })

  it('does not write chat-tools-config when dynamicToolsConfig is undefined', async () => {
    setupIsNewChat()
    await chatGenerationStore.createChatGeneration({}).catch(() => {})
    expect(storagePut).not.toHaveBeenCalledWith(
      'user-1',
      expect.stringContaining('chat-tools-config-'),
      expect.anything()
    )
  })

  it('writes chat-tools-config when enableWebSearch is non-null', async () => {
    mockChatsStore.createChat.mockImplementation(() => {
      mockChatsStore.isNewChat = false
      mockChatsStore.currentChat = { id: 'new-id', llmModel: null }
      return Promise.resolve()
    })
    mockChatsStore.currentChat = { id: 'old-id', llmModel: null, isWorkflow: false, history: [] }
    mockChatsStore.isNewChat = true
    await chatGenerationStore
      .createChatGeneration({ dynamicToolsConfig: { enableWebSearch: true, enableCodeInterpreter: null } })
      .catch(() => {})
    expect(storagePut).toHaveBeenCalledWith(
      'user-1',
      'chat-tools-config-new-id',
      { enableWebSearch: true, enableCodeInterpreter: null }
    )
  })

  it('silently swallows QuotaExceededError on chat-skills write', async () => {
    mockChatsStore.createChat.mockImplementation(() => {
      mockChatsStore.isNewChat = false
      mockChatsStore.currentChat = { id: 'new-id', llmModel: null }
      return Promise.resolve()
    })
    mockChatsStore.currentChat = { id: 'old-id', llmModel: null, isWorkflow: false, history: [] }
    mockChatsStore.isNewChat = true
    storagePut.mockImplementation((userId: string, key: string) => {
      if (key.includes('chat-skills-')) throw new DOMException('quota', 'QuotaExceededError')
    })
    await expect(
      chatGenerationStore.createChatGeneration({ skillIds: ['skill-a'] })
    ).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run src/store/__tests__/chatGeneration.storageGuards.test.ts
```

Expected: FAIL — tests asserting `not.toHaveBeenCalled` fail because current code writes unconditionally; QuotaExceededError test fails because the exception propagates.

- [ ] **Step 3: Apply write guards to `chatGeneration.ts` lines 302–308**

Replace:
```typescript
      if (userId) {
        storage.put(
          userId,
          `chat-tools-config-${newId}`,
          dynamicToolsConfig ?? { enableWebSearch: null, enableCodeInterpreter: null }
        )
        storage.put(userId, `chat-skills-${newId}`, skillIds ?? [])
      }
```

With:
```typescript
      if (userId) {
        const toolsConfig = dynamicToolsConfig ?? { enableWebSearch: null, enableCodeInterpreter: null }
        if (toolsConfig.enableWebSearch !== null || toolsConfig.enableCodeInterpreter !== null) {
          try {
            storage.put(userId, `chat-tools-config-${newId}`, toolsConfig)
          } catch (e) {
            console.error('EPMCDME-13612: failed to persist chat tools config', e)
          }
        }
        const resolvedSkillIds = skillIds ?? []
        if (resolvedSkillIds.length > 0) {
          try {
            storage.put(userId, `chat-skills-${newId}`, resolvedSkillIds)
          } catch (e) {
            console.error('EPMCDME-13612: failed to persist chat skills', e)
          }
        }
      }
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run src/store/__tests__/chatGeneration.storageGuards.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/chatGeneration.ts src/store/__tests__/chatGeneration.storageGuards.test.ts
git commit -m "EPMCDME-13612: Add write guards to chatGeneration storage writes"
```

---

### Task 3: Add write guards to `useChatConfiguration.tsx`

**Test-first: yes — `storage.put` is not called when `saveChatSkills` is called with an empty array**

**Files:**
- Modify: `src/pages/chat/hooks/useChatConfiguration.tsx:31-43`
- Create: `src/pages/chat/hooks/__tests__/useChatConfiguration.storageGuards.test.ts`

Both `saveChatSkills` and `saveChatTools` are module-scope functions. To test them directly, export them. This is the right API design — they are pure functions with no side effects on module state, so exporting them is safe.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/pages/chat/hooks/__tests__/useChatConfiguration.storageGuards.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/storage', () => ({
  default: { put: vi.fn(), get: vi.fn(() => []), getObject: vi.fn(() => ({})), remove: vi.fn() },
}))

import storage from '@/utils/storage'
import { saveChatSkills, saveChatTools } from '../useChatConfiguration'

const storagePut = storage.put as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

describe('saveChatSkills guard', () => {
  it('does not call storage.put when skills is []', () => {
    saveChatSkills('user-1', 'chat-1', [])
    expect(storagePut).not.toHaveBeenCalled()
  })

  it('calls storage.put when skills is non-empty', () => {
    saveChatSkills('user-1', 'chat-1', [{ value: 'skill-a', label: 'Skill A' }] as any)
    expect(storagePut).toHaveBeenCalledWith('user-1', 'chat-skills-chat-1', expect.any(Array))
  })
})

describe('saveChatTools guard', () => {
  it('does not call storage.put when both config properties are null', () => {
    saveChatTools('user-1', 'chat-1', { enableWebSearch: null, enableCodeInterpreter: null })
    expect(storagePut).not.toHaveBeenCalled()
  })

  it('calls storage.put when enableWebSearch is non-null', () => {
    saveChatTools('user-1', 'chat-1', { enableWebSearch: true, enableCodeInterpreter: null })
    expect(storagePut).toHaveBeenCalledWith('user-1', 'chat-tools-config-chat-1', {
      enableWebSearch: true,
      enableCodeInterpreter: null,
    })
  })

  it('calls storage.put when enableCodeInterpreter is non-null', () => {
    saveChatTools('user-1', 'chat-1', { enableWebSearch: null, enableCodeInterpreter: true })
    expect(storagePut).toHaveBeenCalledWith('user-1', 'chat-tools-config-chat-1', {
      enableWebSearch: null,
      enableCodeInterpreter: true,
    })
  })

  it('silently swallows QuotaExceededError', () => {
    storagePut.mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError') })
    expect(() =>
      saveChatTools('user-1', 'chat-1', { enableWebSearch: true, enableCodeInterpreter: null })
    ).not.toThrow()
  })
})
```

- [ ] **Step 4: Run tests to verify they fail**

```
npx vitest run src/pages/chat/hooks/__tests__/useChatConfiguration.storageGuards.test.ts
```

Expected: FAIL — `saveChatSkills` and `saveChatTools` are not exported; guard conditions don't exist yet.

- [ ] **Step 5: Apply guards and export the functions**

Replace lines 31–43 in `src/pages/chat/hooks/useChatConfiguration.tsx`:

```typescript
export const saveChatTools = (userId: string, chatId: string, config: DynamicToolsConfig): void => {
  if (config.enableWebSearch === null && config.enableCodeInterpreter === null) return
  try {
    storage.put(userId, `${CHAT_TOOLS_CONFIG_KEY}-${chatId}`, config)
  } catch (e) {
    console.error('EPMCDME-13612: failed to persist chat tools config', e)
  }
}

export const saveChatSkills = (userId: string, chatId: string, skills: SkillOption[]): void => {
  if (skills.length === 0) return
  try {
    storage.put(userId, `${CHAT_SKILLS_KEY}-${chatId}`, skills)
  } catch (e) {
    console.error('EPMCDME-13612: failed to persist chat skills', e)
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

```
npx vitest run src/pages/chat/hooks/__tests__/useChatConfiguration.storageGuards.test.ts
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/pages/chat/hooks/useChatConfiguration.tsx \
        src/pages/chat/hooks/__tests__/useChatConfiguration.storageGuards.test.ts
git commit -m "EPMCDME-13612: Add write guards to useChatConfiguration storage saves"
```

---

### Task 4: Add `storage.remove` to chat deletion functions in `chats.ts`

**Test-first: yes — `storage.remove` is called for both keys when `deleteChat` resolves**

**Files:**
- Modify: `src/store/chats.ts` — `deleteChat` (line 384), `deleteAllConversations` (line 418), `deleteChatFolder` (line 461)
- Create: `src/store/__tests__/chats.storageCleanup.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/store/__tests__/chats.storageCleanup.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('valtio', () => ({ proxy: vi.fn((obj) => obj), ref: vi.fn((v) => v) }))
vi.mock('@/utils/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), downloadFileStream: vi.fn() },
}))
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }))
vi.mock('@/utils/chatHelpers', () => ({ transformChatBEtoFE: vi.fn((c) => c) }))
vi.mock('@/store/utils/chats', () => ({
  transformChatListItemDTOs: vi.fn((c) => c),
  transformFolderListItemsDTOs: vi.fn((f) => f),
  getChatBEMessageIndex: vi.fn(),
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
vi.mock('@/hooks/useVueRouter', () => ({ router: { push: vi.fn() } }))
vi.mock('@/constants/chats', () => ({ DEFAULT_CHAT_FOLDER: '' }))
vi.mock('@/utils/utils', () => ({ getRootPath: vi.fn(() => '') }))
vi.mock('@/utils/storage', () => ({
  default: { put: vi.fn(), get: vi.fn(() => []), getObject: vi.fn(() => ({})), remove: vi.fn() },
}))
vi.mock('@/store/user', () => ({ userStore: { user: { userId: 'user-1' } } }))

import api from '@/utils/api'
import storage from '@/utils/storage'
import { chatsStore } from '../chats'

const storageRemove = storage.remove as ReturnType<typeof vi.fn>
const apiDelete = api.delete as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  ;(chatsStore as any).chats = []
  ;(chatsStore as any).chatFolders = []
  ;(chatsStore as any).currentChat = null
  ;(chatsStore as any).openedChatsHistory = []
})

describe('deleteChat storage cleanup', () => {
  it('calls storage.remove for chat-skills and chat-tools-config after successful delete', async () => {
    apiDelete.mockResolvedValue({ json: vi.fn().mockResolvedValue({}) })
    await chatsStore.deleteChat('chat-abc')
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-skills-chat-abc')
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-tools-config-chat-abc')
  })
})

describe('deleteAllConversations storage cleanup', () => {
  it('calls storage.remove for all chats before clearing the list', async () => {
    ;(chatsStore as any).chats = [{ id: 'chat-1' }, { id: 'chat-2' }]
    apiDelete.mockResolvedValue({ json: vi.fn().mockResolvedValue({}) })
    await chatsStore.deleteAllConversations()
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-skills-chat-1')
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-tools-config-chat-1')
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-skills-chat-2')
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-tools-config-chat-2')
  })
})

describe('deleteChatFolder storage cleanup', () => {
  it('removes keys for chats in the deleted folder when deleteChats=true', async () => {
    ;(chatsStore as any).chats = [
      { id: 'chat-in-folder', folder: 'my-folder' },
      { id: 'chat-other', folder: 'other-folder' },
    ]
    apiDelete.mockResolvedValue({ json: vi.fn().mockResolvedValue({}) })
    // getFolders and getChats called afterward — mock them too
    const getFoldersSpy = vi.spyOn(chatsStore, 'getFolders').mockResolvedValue([])
    const getChatsSpy = vi.spyOn(chatsStore, 'getChats').mockResolvedValue([])

    await chatsStore.deleteChatFolder('my-folder', true)

    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-skills-chat-in-folder')
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-tools-config-chat-in-folder')
    expect(storageRemove).not.toHaveBeenCalledWith('user-1', 'chat-skills-chat-other')

    getFoldersSpy.mockRestore()
    getChatsSpy.mockRestore()
  })

  it('does not call storage.remove when deleteChats=false', async () => {
    ;(chatsStore as any).chats = [{ id: 'chat-in-folder', folder: 'my-folder' }]
    apiDelete.mockResolvedValue({ json: vi.fn().mockResolvedValue({}) })
    const getFoldersSpy = vi.spyOn(chatsStore, 'getFolders').mockResolvedValue([])
    const getChatsSpy = vi.spyOn(chatsStore, 'getChats').mockResolvedValue([])

    await chatsStore.deleteChatFolder('my-folder', false)
    expect(storageRemove).not.toHaveBeenCalled()

    getFoldersSpy.mockRestore()
    getChatsSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run src/store/__tests__/chats.storageCleanup.test.ts
```

Expected: FAIL — `storage.remove` is never called in any deletion function.

- [ ] **Step 3: Apply cleanup to `deleteChat`**

Replace `deleteChat` (line 384):
```typescript
  deleteChat: (id) => {
    return api.delete(`v1/conversations/${id}`).then((response) => {
      const userId = userStore.user?.userId
      if (userId) {
        storage.remove(userId, `chat-skills-${id}`)
        storage.remove(userId, `chat-tools-config-${id}`)
      }
      chatsStore.chats = chatsStore.chats.filter((chat) => chat.id !== id)
      recentChatsStore.removeRecentChat(id)
      workflowExecutionsStore.removeExecutionsByConversationId(id)
      return response.json()
    })
  },
```

- [ ] **Step 4: Apply cleanup to `deleteAllConversations`**

Replace `deleteAllConversations` (line 418):
```typescript
  deleteAllConversations: async () => {
    await api.delete(`v1/conversations`).then((response) => response.json())
    const userId = userStore.user?.userId
    if (userId) {
      chatsStore.chats.forEach((chat) => {
        storage.remove(userId, `chat-skills-${chat.id}`)
        storage.remove(userId, `chat-tools-config-${chat.id}`)
      })
    }
    chatsStore.chats = []
    chatsStore.chatFolders = []
    chatsStore.currentChat = null
    chatsStore.openedChatsHistory = []
    workflowExecutionsStore.removeAllChatLinkedExecutions()
    toaster.info('All conversations have been successfully deleted.')
  },
```

- [ ] **Step 5: Apply cleanup to `deleteChatFolder`**

Replace `deleteChatFolder` (line 461):
```typescript
  deleteChatFolder: (folder, deleteChats = false) => {
    const chatsToDelete = deleteChats
      ? chatsStore.chats.filter((c) => c.folder === folder)
      : []
    return api
      .delete(
        `v1/conversations/folder/${encodeURIComponent(folder)}?remove_conversations=${deleteChats}`
      )
      .then(() => {
        if (deleteChats) {
          recentChatsStore.removeRecentChatsByFolder(folder)
          const userId = userStore.user?.userId
          if (userId) {
            chatsToDelete.forEach((chat) => {
              storage.remove(userId, `chat-skills-${chat.id}`)
              storage.remove(userId, `chat-tools-config-${chat.id}`)
            })
          }
        }
        return chatsStore.getFolders()
      })
      .then(() => chatsStore.getChats())
  },
```

- [ ] **Step 6: Run tests to verify they pass**

```
npx vitest run src/store/__tests__/chats.storageCleanup.test.ts
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/store/chats.ts src/store/__tests__/chats.storageCleanup.test.ts
git commit -m "EPMCDME-13612: Remove per-chat localStorage keys on chat deletion"
```

---

### Task 5: Wire up Pass 1 startup sweep in `App.tsx`

**Test-first: no — this is pure wiring of the already-tested utility; no new logic**

**Files:**
- Modify: `src/App.tsx:52-56`

- [ ] **Step 1: Add import and call in `App.tsx`**

Add to the imports at the top of `src/App.tsx`:
```typescript
import { sweepOrphanedChatKeys } from '@/utils/chatStorageUtils'
```

Update the user-load effect (lines 52–56):
```typescript
  useEffect(() => {
    if (user) {
      floatingKataStore.loadFromLocalStorage()
      sweepOrphanedChatKeys(user.userId)
    }
  }, [user])
```

- [ ] **Step 2: Verify TypeScript compiles**

```
npm run typecheck
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "EPMCDME-13612: Run startup sweep of orphaned chat keys on user load"
```

---

### Task 6: Wire up Pass 2 existence sweep in `chats.ts::getChats`

**Test-first: no — wiring only; the sweep logic is tested in Task 1**

**Files:**
- Modify: `src/store/chats.ts:164-175`

- [ ] **Step 1: Add import and call in `chats.ts`**

Add to the imports at the top of `src/store/chats.ts`:
```typescript
import { sweepOrphanedChatKeys } from '@/utils/chatStorageUtils'
```

Update `getChats` (lines 164–175):
```typescript
  getChats: async () => {
    if (!chatsStore.isInitialDataFetched) chatsStore.isChatsLoading = true
    try {
      const response = await api.get('v1/conversations')
      const chats = transformChatListItemDTOs(await response.json())
      chatsStore.chats = chats
      const userId = userStore.user?.userId
      if (userId) {
        sweepOrphanedChatKeys(userId, chats.map((c) => c.id))
      }
      return chats
    } finally {
      chatsStore.isChatsLoading = false
      chatsStore.isInitialDataFetched = true
    }
  },
```

- [ ] **Step 2: Verify TypeScript compiles**

```
npm run typecheck
```

Expected: No errors

- [ ] **Step 3: Run full test suite**

```
npm test
```

Expected: All tests PASS (no regressions)

- [ ] **Step 4: Commit**

```bash
git add src/store/chats.ts
git commit -m "EPMCDME-13612: Sweep orphaned chat keys after chat list loads"
```
