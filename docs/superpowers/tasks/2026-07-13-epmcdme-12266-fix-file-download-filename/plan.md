# EPMCDME-12266: Fix unintelligible UUID filename on file download

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every file download from the CodeMie assistant presents a human-readable filename instead of a raw UUID.

**Architecture:** Three independent call sites each have a distinct filename-resolution gap. Fix each in isolation: (1) `filesStore.downloadFile` falls back to the streaming download API when the legacy base64 decoder fails on a UUID fileId; (2) `agentWorkspaceStore.downloadSelectedFile` passes the already-available workspace path basename; (3) `chatsStore.exportChat` / `exportConversationAIMessage` pass a name derived from chat state. No new abstractions — all utilities exist.

**Tech Stack:** TypeScript, Valtio stores, `api.downloadFileStream` (fetch + file-saver), Vitest + jsdom

## Global Constraints

- Never rename or change the public signature of `downloadFileStream(url, _type?, fileName?)` — callers may pass only the first argument; the second is unused/legacy.
- `sanitizeFileName` (named export from `src/utils/api.ts`) is the canonical sanitizer; apply it to every caller-derived name that comes from user content (chat names).
- `formatDateTime` is NOT available in chats.ts — do not add it for this ticket.
- Commit message format: `EPMCDME-12266: Capital sentence` (CI enforces this regex).
- Test project: single Vitest config (`vite.config.ts:90`), run with `npx vitest run <path>`.

---

### Task 1: Fix `filesStore.downloadFile` — UUID falls back to `downloadFileStream`

**Files:**
- Modify: `src/store/files.ts:87-96`
- Create: `src/store/__tests__/files.test.ts`

**Interfaces:**
- Consumes: `decodeFileName(fileUrl): string[]` from `@/utils/helpers` — returns `[]` on UUID input (atob throws on hyphens)
- Consumes: `api.downloadFileStream(url: string): Promise<boolean>` — reads Content-Disposition, calls saveAs
- Produces: no API change; behavior change: UUID fileIds now produce a server-named file instead of a blank `download` anchor

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/files.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
const mockDownloadFileStream = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    downloadFileStream: (...args: unknown[]) => mockDownloadFileStream(...args),
    post: vi.fn(),
  },
}))

describe('filesStore.downloadFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls downloadFileStream when fileId is a UUID (not base64)', async () => {
    mockDownloadFileStream.mockResolvedValue(true)

    const { filesStore } = await import('@/store/files')
    await filesStore.downloadFile('a1b2c3d4-e5f6-7890-abcd-ef1234567890')

    expect(mockDownloadFileStream).toHaveBeenCalledWith(
      'v1/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    )
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('uses the anchor approach when fileId is base64-encoded', async () => {
    // valid base64 encoding of "application/xlsx~user~report.xlsx" (legacy format)
    const encoded = btoa('application/xlsx_user_report.xlsx')
    mockGet.mockResolvedValue({
      blob: async () => new Blob(['data'], { type: 'application/xlsx' }),
    })

    const { filesStore } = await import('@/store/files')
    await filesStore.downloadFile(encoded)

    expect(mockGet).toHaveBeenCalledWith(`v1/files/${encoded}`)
    expect(mockDownloadFileStream).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/store/__tests__/files.test.ts
```

Expected: FAIL — `expect(mockDownloadFileStream).toHaveBeenCalledWith(...)` is never satisfied (current code uses anchor, not downloadFileStream).

- [ ] **Step 3: Implement the fix in `src/store/files.ts`**

Replace lines 87-97:

```typescript
  async downloadFile(fileUrl) {
    const [_mimeType, _user, originalFileName] = decodeFileName(fileUrl)

    if (originalFileName) {
      // Legacy base64-encoded fileId: name decoded directly from the id
      const response = await api.get(`v1/files/${fileUrl}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = originalFileName
      a.click()
      window.URL.revokeObjectURL(url)
    } else {
      // UUID fileId: name comes from Content-Disposition header
      await api.downloadFileStream(`v1/files/${fileUrl}`)
    }
  },
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/store/__tests__/files.test.ts
```

Expected: PASS — both `it(...)` cases green.

- [ ] **Step 5: Commit**

```bash
git add src/store/files.ts src/store/__tests__/files.test.ts
git commit -m "EPMCDME-12266: Fall back to downloadFileStream for UUID file attachments"
```

---

### Task 2: Fix `agentWorkspaceStore.downloadSelectedFile` — pass path basename as fileName

**Files:**
- Modify: `src/store/agentWorkspace.ts:205-218`
- Modify: `src/store/__tests__/agentWorkspace.test.ts:196-220`

**Interfaces:**
- Consumes: `this.selectedFilePath: string | null` — e.g. `"scripts/example.py"` or `"outputs/report.xlsx"` (server-side workspace relative path, always safe as filename basename)
- Produces: `api.downloadFileStream(url, undefined, fileName)` — third arg activates the caller-supplied name priority in `downloadFileStream`

- [ ] **Step 1: Write the failing test**

In `src/store/__tests__/agentWorkspace.test.ts`, the existing test at line ~200 currently asserts:

```typescript
expect(mockDownloadFileStream).toHaveBeenCalledWith(
  'v1/workspaces/workspace-1/files/download?file_path=scripts%2Fexample.py'
)
```

Update that assertion (the test should fail before the fix):

```typescript
expect(mockDownloadFileStream).toHaveBeenCalledWith(
  'v1/workspaces/workspace-1/files/download?file_path=scripts%2Fexample.py',
  undefined,
  'example.py'
)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/store/__tests__/agentWorkspace.test.ts
```

Expected: FAIL — actual call has only 1 argument; updated assertion expects 3.

- [ ] **Step 3: Implement the fix in `src/store/agentWorkspace.ts`**

Replace lines 205-219:

```typescript
  async downloadSelectedFile() {
    if (!this.workspace || !this.selectedFilePath) return false

    this.isDownloading = true

    try {
      const fileName = this.selectedFilePath.split('/').pop()
      return await api.downloadFileStream(
        `v1/workspaces/${this.workspace.id}/files/download?file_path=${encodeURIComponent(
          this.selectedFilePath
        )}`,
        undefined,
        fileName
      )
    } finally {
      this.isDownloading = false
    }
  },
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/store/__tests__/agentWorkspace.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/agentWorkspace.ts src/store/__tests__/agentWorkspace.test.ts
git commit -m "EPMCDME-12266: Pass workspace file path basename as download filename"
```

---

### Task 3: Fix `chatsStore.exportChat` and `exportConversationAIMessage` — derive filenames

**Files:**
- Modify: `src/store/chats.ts:393-397` and `src/store/chats.ts:428-432`
- Create: `src/store/__tests__/chats.export.test.ts`

**Interfaces:**
- Consumes: `chatsStore.currentChat.name?: string` — chat name from state (may be undefined for new chats)
- Consumes: `sanitizeFileName(name: string | undefined): string | undefined` — named export from `@/utils/api`
- Produces:
  - `exportChat(format)` → `api.downloadFileStream(url, undefined, '<ChatName>.<format>')` 
  - `exportConversationAIMessage(chatID, historyIndex, messageIndex, format)` → `api.downloadFileStream(url, undefined, 'message_export.<format>')`

- [ ] **Step 1: Write the failing tests**

Create `src/store/__tests__/chats.export.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockDownloadFileStream = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    downloadFileStream: (...args: unknown[]) => mockDownloadFileStream(...args),
  },
  sanitizeFileName: (name: string | undefined) => name?.replace(/[/\\:*?"<>|]/g, '_'),
}))

vi.mock('@/utils/storage', () => ({
  default: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
}))

vi.mock('@/utils/chatHelpers', () => ({
  transformChatBEtoFE: vi.fn((x) => x),
}))

vi.mock('@/store/recentChats', () => ({
  recentChatsStore: { removeRecentChat: vi.fn(), addRecentChat: vi.fn() },
}))

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: {
    removeExecutionsByConversationId: vi.fn(),
    removeAllChatLinkedExecutions: vi.fn(),
  },
}))

vi.mock('@/store/user', () => ({
  userStore: { currentUser: null },
}))

vi.mock('@/hooks/useVueRouter', () => ({
  router: { push: vi.fn() },
}))

describe('chatsStore export methods', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    const { chatsStore } = await import('@/store/chats')
    chatsStore.currentChat = null
  })

  describe('exportChat', () => {
    it('passes sanitized chat name + format as fileName', async () => {
      mockDownloadFileStream.mockResolvedValue(true)
      const { chatsStore } = await import('@/store/chats')
      chatsStore.currentChat = {
        id: 'chat-123',
        name: 'Sprint 39 Release Notes',
        assistantIds: [],
        assistantData: [],
        history: [],
      }

      await chatsStore.exportChat('docx')

      expect(mockDownloadFileStream).toHaveBeenCalledWith(
        'v1/conversations/chat-123/export?export_format=docx',
        undefined,
        'Sprint 39 Release Notes.docx'
      )
    })

    it('uses fallback name when chat.name is undefined', async () => {
      mockDownloadFileStream.mockResolvedValue(true)
      const { chatsStore } = await import('@/store/chats')
      chatsStore.currentChat = {
        id: 'chat-456',
        name: undefined,
        assistantIds: [],
        assistantData: [],
        history: [],
      }

      await chatsStore.exportChat('pdf')

      expect(mockDownloadFileStream).toHaveBeenCalledWith(
        'v1/conversations/chat-456/export?export_format=pdf',
        undefined,
        'chat_export.pdf'
      )
    })
  })

  describe('exportConversationAIMessage', () => {
    it('passes a generic derived filename', async () => {
      mockDownloadFileStream.mockResolvedValue(true)
      const { chatsStore } = await import('@/store/chats')

      await chatsStore.exportConversationAIMessage('chat-789', 0, 2, 'pptx')

      expect(mockDownloadFileStream).toHaveBeenCalledWith(
        'v1/conversations/chat-789/history/0/2/export?export_format=pptx',
        undefined,
        'message_export.pptx'
      )
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/store/__tests__/chats.export.test.ts
```

Expected: FAIL — `downloadFileStream` called with only 1 argument currently.

- [ ] **Step 3: Update imports in `src/store/chats.ts`**

Change the existing api import line (line ~29) from:

```typescript
import api from '@/utils/api'
```

to:

```typescript
import api, { sanitizeFileName } from '@/utils/api'
```

- [ ] **Step 4: Update `exportChat` in `src/store/chats.ts` (lines 393-397)**

Replace:

```typescript
  exportChat: (format) => {
    const chat = chatsStore.currentChat
    if (!chat) return null
    return api.downloadFileStream(`v1/conversations/${chat.id}/export?export_format=${format}`)
  },
```

with:

```typescript
  exportChat: (format) => {
    const chat = chatsStore.currentChat
    if (!chat) return null
    const name = sanitizeFileName(chat.name) ?? 'chat_export'
    return api.downloadFileStream(
      `v1/conversations/${chat.id}/export?export_format=${format}`,
      undefined,
      `${name}.${format}`
    )
  },
```

- [ ] **Step 5: Update `exportConversationAIMessage` in `src/store/chats.ts` (lines 428-432)**

Replace:

```typescript
  exportConversationAIMessage: (chatID, historyIndex, messageIndex, format) => {
    return api.downloadFileStream(
      `v1/conversations/${chatID}/history/${historyIndex}/${messageIndex}/export?export_format=${format}`
    )
  },
```

with:

```typescript
  exportConversationAIMessage: (chatID, historyIndex, messageIndex, format) => {
    return api.downloadFileStream(
      `v1/conversations/${chatID}/history/${historyIndex}/${messageIndex}/export?export_format=${format}`,
      undefined,
      `message_export.${format}`
    )
  },
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run src/store/__tests__/chats.export.test.ts
```

Expected: PASS — all 3 `it(...)` cases green.

- [ ] **Step 7: Run full test suite to check for regressions**

```bash
npx vitest run
```

Expected: same pass count as before this task; no regressions.

- [ ] **Step 8: Commit**

```bash
git add src/store/chats.ts src/store/__tests__/chats.export.test.ts
git commit -m "EPMCDME-12266: Derive human-readable filenames for chat export downloads"
```

---

## Self-Review

**Spec coverage:**
- UUID fileId → `downloadFileStream` fallback: Task 1 ✓
- `downloadSelectedFile` passes basename: Task 2 ✓
- `exportChat` / `exportConversationAIMessage` pass derived names: Task 3 ✓
- Markdown renderer skip (backend concern, out of scope): documented, no task needed ✓
- `sanitizeFileName` applied to user content (chat name): Task 3 Step 4 ✓

**Placeholder scan:** No TBDs, no "implement later", all code blocks complete.

**Type consistency:**
- `sanitizeFileName(chat.name): string | undefined` — nullish coalesced to `'chat_export'` before use ✓
- `this.selectedFilePath.split('/').pop(): string | undefined` — `downloadFileStream` accepts `fileName?: string`, so `undefined` is valid (safe) ✓
- `api.downloadFileStream(url, undefined, fileName)` signature consistent across all tasks ✓
