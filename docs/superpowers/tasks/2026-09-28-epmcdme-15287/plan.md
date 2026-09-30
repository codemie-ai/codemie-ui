# Focused-View Pinned-Chat Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Focused view's Pinned section sort by pin time (not last-activity recency), matching the Unified view's already-shipped behavior, and stop an unrelated bug from silently unpinning a chat on every assistant reply.

**Architecture:** Relocate the Unified view's private `sortPinnedByPinOrder` comparator into the shared `chatSidebarCollectionHelpers.ts` so both view-model builders import one implementation; wire `buildFocusedChatSidebarViewModel` and its `ChatSidebarLists.tsx` call site to use it exactly as the Unified view already does; separately stop `chatGenerationStore._updateChatMetadata` from returning a `pinned` field it cannot source correctly.

**Tech Stack:** TypeScript, Vitest (`unit` workspace project), Valtio store (`pinOrderStore`, untouched).

**Spec:** `docs/superpowers/tasks/2026-09-28-epmcdme-15287/spec.md`

**Commit per task using the repository's existing convention.**

## Global Constraints

- No change to `pinOrderStore`'s persistence, recording, or backfill logic.
- No change to how a chat is classified into the Pinned section (`collectFocusedChats`).
- `recentChats`, `workflowChats`, and all Focused-view groups/folders remain sorted by `sortChatsByMostRecent`, unchanged (AC5).
- Unified view's sort *output* is unchanged — only `sortPinnedByPinOrder`'s file location moves (AC6).
- No new Focused-view rendering-level integration test is required by this spec.
- Pin order stays `localStorage`-only (per-browser, per-device via `pinOrderStore`); no backend `pinned_at` field, no cross-device sync.
- No change to `transformChatBEtoFE` to add a backend-sourced `pinned` field.

## Review Focus

- A pinned chat with no `pinOrder` entry (an edge the existing `ensurePinOrder` backfill misses) must fall back to its own `updateDate`/`date`, not crash or sort last unconditionally — Task 2's fallback test.
- Unpinning a chat must drop it from `pinnedChats` while the remaining pinned chats keep their prior relative order — Task 2's unpin test.
- Sending a message in a pinned chat must not silently clear its `pinned` flag via `_updateChatMetadata`'s merge into `updateChatListItem` — Task 3.
- After `sortPinnedByPinOrder` moves file, the existing Unified `describe('pinned section ordering')` tests must keep passing with zero test edits (behavior, not location) — Task 1's verification step.
- `recentChats`, `workflowChats`, and `groups` must not be accidentally resorted by the new `pinOrder` parameter — Task 2's implementation only touches the `pinnedChats` sort call.

---

### Task 1: Extract the shared `sortPinnedByPinOrder` comparator

**Files:**
- Modify: `src/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarCollectionHelpers.ts` (add export near `sortChatsByMostRecent`, line 38)
- Modify: `src/pages/chat/components/ChatSidebar/ChatSidebarLists/unifiedChatSidebarViewModel.ts` (import list lines 19-24; delete private definition lines 82-88)

**Interfaces:**
- Produces: `sortPinnedByPinOrder(chats: ChatListItem[], pinOrder: Record<string, string>): void`, exported from `chatSidebarCollectionHelpers.ts` — Task 2 imports this same function into `focusedChatSidebarViewModel.ts`.

**Test-first: no** — pure relocation, no behavior change. The existing Unified `describe('pinned section ordering')` block (`src/pages/chat/components/ChatSidebar/__tests__/chatSidebarListsHelpers.test.ts:311-435`, 4 tests) already pins this exact behavior and is the regression guard; per spec, it must keep passing with no edits.

- [ ] **Step 1:** In `chatSidebarCollectionHelpers.ts`, add directly after `sortChatsByMostRecent` (line 38):

```ts
export const sortPinnedByPinOrder = (chats: ChatListItem[], pinOrder: Record<string, string>) => {
  chats.sort((a, b) => {
    const aTs = getValidDateTimestamp(pinOrder[a.id]) || getValidDateTimestamp(a.updateDate, a.date)
    const bTs = getValidDateTimestamp(pinOrder[b.id]) || getValidDateTimestamp(b.updateDate, b.date)
    return bTs - aTs
  })
}
```

  In `unifiedChatSidebarViewModel.ts`, delete the identical private function at lines 82-88, and add `sortPinnedByPinOrder` to the existing import from `./chatSidebarCollectionHelpers` at lines 19-24 (alongside `getValidDateTimestamp`, `sortChatsByMostRecent`). No other line in that file changes — line 143's call site (`sortPinnedByPinOrder(viewModel.pinnedChats, pinOrder)`) already has the right call shape and now resolves to the imported function.

  Run `npx vitest run src/pages/chat/components/ChatSidebar/__tests__/chatSidebarListsHelpers.test.ts` and confirm the `buildUnifiedChatSidebarViewModel > pinned section ordering` block (4 tests, lines 311-435) still passes unchanged.

---

### Task 2: Wire the Focused view's Pinned section to pin-order sort

**Files:**
- Modify: `src/pages/chat/components/ChatSidebar/ChatSidebarLists/focusedChatSidebarViewModel.ts` (import lines 19-23; signature lines 93-98; sort call line 126)
- Modify: `src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarLists.tsx` (call site lines 98-107)
- Modify: `src/pages/chat/components/ChatSidebar/__tests__/chatSidebarListsHelpers.test.ts` (two tests at lines 654-666 and 668-695; new `describe` block inserted before line 814)

**Interfaces:**
- Consumes: `sortPinnedByPinOrder` from Task 1 (`chatSidebarCollectionHelpers.ts`); `pinOrderStore.getPinOrder(): Record<string, string>` (already used by the Unified call at `ChatSidebarLists.tsx:92`).
- Produces: `buildFocusedChatSidebarViewModel(chats, settings, assistantFolders = [], chatFolders = [], pinOrder: Record<string, string> = {})` — the new `pinOrder` param is appended **after** `chatFolders`, not inserted before it, so every existing positional call site in the test file (which passes at most `assistantFolders`/`chatFolders`) keeps compiling and keeps its current default (`{}`) behavior untouched.

**Test-first: yes** — failing test: the new `describe('pinned section ordering')` block under `buildFocusedChatSidebarViewModel` asserts pin-order-driven sort, which fails today because line 126 calls `sortChatsByMostRecent` and the builder has no `pinOrder` parameter to accept a map at all.

- [ ] **Step 1: Write/update the failing tests** in `chatSidebarListsHelpers.test.ts`.

  Update the test at lines 654-666 (`'keeps a pinned chat as a chat and does not add an annotated assistant row'`) to pass a `pinOrder` map through the call (still one pinned chat, so the expected order is unchanged — this only exercises the new parameter, per spec):

  ```ts
  const pinOrder = { 'pinned-a': '2026-08-01T00:00:00.000Z' }
  const viewModel = buildFocusedChatSidebarViewModel(chats, focusedSettings, [], [], pinOrder)
  ```

  Replace the test at lines 668-695 (`'shows two pinned folder chats as individual rows without aggregation'`) — rename it and invert the pin-order timestamps relative to `date` so the assertion proves pin order wins over date, not the reverse:

  ```ts
  it('shows two pinned folder chats as individual rows ordered by pin time, not date', () => {
    const chats = [
      createChat({ id: 'older-pinned', folder: 'Project', pinned: true, date: '2026-07-29T08:00:00.000Z' }),
      createChat({ id: 'newer-pinned', folder: 'Project', pinned: true, date: '2026-07-29T10:00:00.000Z' }),
      createChat({ id: 'recent-in-folder', folder: 'Project', date: '2026-07-29T09:00:00.000Z' }),
    ]
    // older-pinned was pinned more recently than newer-pinned, despite having the older `date`.
    const pinOrder = {
      'older-pinned': '2026-08-02T00:00:00.000Z',
      'newer-pinned': '2026-08-01T00:00:00.000Z',
    }

    const viewModel = buildFocusedChatSidebarViewModel(chats, focusedSettings, [], [], pinOrder)

    expect(viewModel.pinnedChats.map((chat) => chat.id)).toEqual(['older-pinned', 'newer-pinned'])
    expect(viewModel.chatLocations['newer-pinned']).toEqual({ section: 'pinned' })
    expect(viewModel.chatLocations['older-pinned']).toEqual({ section: 'pinned' })
    expect(viewModel.groups.find((group) => group.name === 'Project')?.chats).toHaveLength(3)
  })
  ```

  Insert a new block immediately before `describe('assistantHistory', ...)` (currently line 814), mirroring the Unified block at lines 311-435:

  ```ts
  describe('pinned section ordering', () => {
    it('sorts pinned chats by pin-order, not by updateDate', () => {
      const olderPin = createChat({ id: 'older-pin', pinned: true, updateDate: '2026-07-01T00:00:00.000Z' })
      const newerPin = createChat({ id: 'newer-pin', pinned: true, updateDate: '2026-01-01T00:00:00.000Z' })
      const pinOrder = { 'older-pin': '2026-08-01T00:00:00.000Z', 'newer-pin': '2026-09-01T00:00:00.000Z' }

      const viewModel = buildFocusedChatSidebarViewModel([olderPin, newerPin], focusedSettings, [], [], pinOrder)

      expect(viewModel.pinnedChats.map((chat) => chat.id)).toEqual(['newer-pin', 'older-pin'])
    })

    it('does not reorder the Pinned section when a pinned chat gets a fresh updateDate from real usage', () => {
      const firstPinned = createChat({ id: 'first-pinned', pinned: true, updateDate: '2026-01-01T00:00:00.000Z' })
      const secondPinned = createChat({ id: 'second-pinned', pinned: true, updateDate: '2026-01-02T00:00:00.000Z' })
      const pinOrder = { 'first-pinned': '2026-08-01T00:00:00.000Z', 'second-pinned': '2026-08-02T00:00:00.000Z' }

      const before = buildFocusedChatSidebarViewModel([firstPinned, secondPinned], focusedSettings, [], [], pinOrder)
      expect(before.pinnedChats.map((chat) => chat.id)).toEqual(['second-pinned', 'first-pinned'])

      const firstPinnedAfterUsage = { ...firstPinned, updateDate: '2026-09-01T00:00:00.000Z' }
      const after = buildFocusedChatSidebarViewModel([firstPinnedAfterUsage, secondPinned], focusedSettings, [], [], pinOrder)
      expect(after.pinnedChats.map((chat) => chat.id)).toEqual(['second-pinned', 'first-pinned'])
    })

    it('unpinning a chat preserves the relative order of the remaining pinned chats', () => {
      const chatA = createChat({ id: 'chat-a', pinned: true })
      const chatB = createChat({ id: 'chat-b', pinned: true })
      const chatC = createChat({ id: 'chat-c', pinned: true })
      const pinOrder = {
        'chat-a': '2026-08-01T00:00:00.000Z',
        'chat-b': '2026-08-02T00:00:00.000Z',
        'chat-c': '2026-08-03T00:00:00.000Z',
      }

      const before = buildFocusedChatSidebarViewModel([chatA, chatB, chatC], focusedSettings, [], [], pinOrder)
      expect(before.pinnedChats.map((chat) => chat.id)).toEqual(['chat-c', 'chat-b', 'chat-a'])

      const chatBUnpinned = { ...chatB, pinned: false }
      const { 'chat-b': _removed, ...pinOrderAfterUnpin } = pinOrder
      const after = buildFocusedChatSidebarViewModel([chatA, chatBUnpinned, chatC], focusedSettings, [], [], pinOrderAfterUnpin)
      expect(after.pinnedChats.map((chat) => chat.id)).toEqual(['chat-c', 'chat-a'])
    })

    it('falls back to updateDate for a pinned chat with no recorded pin-order entry', () => {
      const withEntry = createChat({ id: 'with-entry', pinned: true, updateDate: '2026-01-01T00:00:00.000Z' })
      const withoutEntry = createChat({ id: 'without-entry', pinned: true, updateDate: '2026-06-01T00:00:00.000Z' })
      const pinOrder = { 'with-entry': '2026-02-01T00:00:00.000Z' }

      const viewModel = buildFocusedChatSidebarViewModel([withEntry, withoutEntry], focusedSettings, [], [], pinOrder)

      expect(viewModel.pinnedChats.map((chat) => chat.id)).toEqual(['without-entry', 'with-entry'])
    })
  })
  ```

- [ ] **Step 2:** Run `npx vitest run src/pages/chat/components/ChatSidebar/__tests__/chatSidebarListsHelpers.test.ts` and confirm the new/updated `buildFocusedChatSidebarViewModel` tests fail (still sorting by recency; `pinOrder` argument not yet accepted).

- [ ] **Step 3: Implement.** In `focusedChatSidebarViewModel.ts`, add `sortPinnedByPinOrder` to the existing import from `./chatSidebarCollectionHelpers` at lines 19-23. Change the signature at lines 93-98 to append the new parameter:

  ```ts
  export const buildFocusedChatSidebarViewModel = (
    chats: ChatListItem[],
    settings: UnifiedChatViewSettings,
    assistantFolders: AssistantFolderListItem[] = [],
    chatFolders: FolderListItem[] = [],
    pinOrder: Record<string, string> = {}
  ): FocusedChatSidebarViewModel => {
  ```

  Replace line 126 — `sortChatsByMostRecent(collections.pinnedChats)` — with `sortPinnedByPinOrder(collections.pinnedChats, pinOrder)`. Leave lines 127-128 (`recentChats`, `workflowChats`) untouched.

  In `ChatSidebarLists.tsx`, add a fifth argument to the `buildFocusedChatSidebarViewModel(...)` call at lines 99-107: `pinOrderStore.getPinOrder()`, mirroring the sibling Unified call's argument at line 92 exactly. Leave the `useMemo` dependency array at line 109 as-is (the Unified call's own memo likewise omits `pinOrderStore` from its deps).

- [ ] **Step 4:** Run `npx vitest run src/pages/chat/components/ChatSidebar/__tests__/chatSidebarListsHelpers.test.ts` and confirm all tests pass, including the new `pinned section ordering` block and the two updated tests.

---

### Task 3: Stop `_updateChatMetadata` from clobbering the `pinned` flag

**Files:**
- Modify: `src/store/chatGeneration.ts:697-704`
- Modify: `src/store/__tests__/chatGeneration.avatarPersistence.test.ts` (new test in the existing `describe('_updateChatMetadata — returns correct chat list item payload')` block)

**Interfaces:**
- Consumes: nothing new — `_updateChatMetadata(chat: Conversation, assistant: Assistant): Partial<ChatListItem> & { id: string }` keeps its existing signature; only the shape of the returned object changes (one fewer key).
- Produces: the returned object no longer includes `pinned`, so `chatsStore.updateChatListItem`'s merge (`src/store/chats.ts:743-753`, which filters out `undefined` keys before spreading) leaves an existing chat's locally-tracked `pinned` value untouched.

**Test-first: yes** — failing test: `_updateChatMetadata`'s return value must not include a `pinned` key at all, so `updateChatListItem`'s merge (which filters out `undefined` keys before spreading) leaves an existing chat's locally-tracked `pinned` value untouched; today it includes `pinned: !!chat.pinned`, which is `false` since `chat.pinned` (from `Conversation`) is always `undefined`.

- [ ] **Step 1: Write the failing test** in `chatGeneration.avatarPersistence.test.ts`, inside the existing `describe('_updateChatMetadata — returns correct chat list item payload')` block:

```ts
it('does not clobber an existing pinned chat list item (EPMCDME-15287)', () => {
  const chat = makeConversation({
    assistantIds: ['a1'],
    assistantData: [{ id: 'a1', name: 'Assistant A1' }],
    history: [[makeMsg()]],
  })
  const update = chatGenerationStore._updateChatMetadata(chat, makeAssistant('a1', 'Assistant A1'))

  expect(update).not.toHaveProperty('pinned')
})
```

- [ ] **Step 2:** Run `npx vitest run src/store/__tests__/chatGeneration.avatarPersistence.test.ts` and confirm the new test fails (`update` has `pinned: false`).

- [ ] **Step 3: Implement.** In `chatGeneration.ts`, delete line 703 (`pinned: !!chat.pinned,`) from the object literal returned by `_updateChatMetadata` (lines 697-704). No other line in the function changes.

- [ ] **Step 4:** Run `npx vitest run src/store/__tests__/chatGeneration.avatarPersistence.test.ts` and confirm all tests, including the new one, pass.

---

## Negative-Constraint Pass

- "No change to `pinOrderStore`'s persistence, recording, or backfill logic" — honored: no task touches `src/store/pinOrder.ts`.
- "No change to how a chat is classified into the Pinned section (`collectFocusedChats`)" — honored: no task touches `focusedChatSidebarCollections.ts`.
- "`recentChats`, `workflowChats`, and all Focused-view groups/folders remain sorted by `sortChatsByMostRecent`" (AC5) — honored: Task 2 changes only line 126's `pinnedChats` call; lines 127-128 are explicitly left untouched.
- "No change to the Unified view's own pin-order sort *behavior* — only where `sortPinnedByPinOrder` physically lives moves" — honored: Task 1 is a pure relocation (Test-first: no) verified against the existing, unmodified Unified test block.
- "No new Focused-view rendering-level integration test is required" — honored: no task adds a `ChatSidebarLists.test.tsx`-level (rendering) test; Task 2's tests are all at the pure view-model level.
- "Pin order is `localStorage`-only... no cross-device or cross-browser sync" — honored: no task adds any backend field, network call, or alternate persistence for pin order.
- "No change to `transformChatBEtoFE` to add a backend-sourced `pinned` field" — honored: Task 3 only removes a key from `_updateChatMetadata`'s return value; `src/utils/chatHelpers.ts` is not touched.
- "It must not touch `updateDate`" (pre-existing `pinChat` constraint, referenced in the spec) — honored: no task modifies `pinChat` or any `updateDate` write path.

negative-constraints: all checked above — none violated.
