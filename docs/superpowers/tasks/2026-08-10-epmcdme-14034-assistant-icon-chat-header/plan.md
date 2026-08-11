# EPMCDME-14034: Assistant Icon Missing in Chat Header

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the assistant `Avatar` component to the single-assistant branch of `ChatHeader.tsx` so the icon appears next to the assistant name, matching behavior in the group-chat branch and message area.

**Architecture:** Single-file UI fix. The `Avatar` component, `AvatarType.SMALL` constant, and `handleAvatarClick` handler are already imported and in scope in `ChatHeader.tsx`. The group-chat branch already renders avatars correctly; the single-assistant branch renders only a name `<span>`. Adding one `<Avatar>` element inside a JSX fragment before the span is the complete change.

**Tech Stack:** React, TypeScript, Valtio (snapshot), Vitest + Testing Library

## Global Constraints

- Commit format: `EPMCDME-14034: Capital sentence` (enforced by CI; no trailing period)
- Avatar sizing in chat headers: `AvatarType.SMALL` (32 px)
- No new imports in `ChatHeader.tsx` — Avatar, AvatarType, handleAvatarClick already imported
- No store, type, or API changes

---

### Task 1: Add avatar to single-assistant chat header

**Test-first: yes — single-assistant chat renders an Avatar button with the assistant's aria-label**

**Files:**
- Modify: `src/pages/chat/components/ChatHeader/__tests__/ChatHeader.test.tsx`
- Modify: `src/pages/chat/components/ChatHeader/ChatHeader.tsx:117-125`

**Interfaces:**
- Consumes: `Avatar` (already imported at line 23), `AvatarType.SMALL` (line 26), `handleAvatarClick` (line 79), `currentChat?.assistantData[0]?.iconUrl`, `assistantDisplayName`
- Produces: `Avatar` renders in single-assistant header; `handleAvatarClick` fires on click

---

- [ ] **Step 1: Add fixtures and failing tests in `ChatHeader.test.tsx`**

Add two fixtures after the existing `mockWorkflowChat` block (around line 132) and three new `it(...)` cases inside the `describe('ChatHeader', ...)` block.

**Fixtures to add after `mockWorkflowChat`:**

```tsx
const mockSingleAssistantChat = {
  id: 'chat-single',
  name: 'Single Assistant Chat',
  isGroup: false,
  assistantData: [{ id: 'assistant-abc', name: 'Assistant One', iconUrl: 'https://example.com/icon.png' }],
  initialAssistantId: 'assistant-abc',
  assistantIds: ['assistant-abc'],
} as unknown as Conversation

const mockSingleAssistantChatNoIcon = {
  id: 'chat-single-noicon',
  name: 'Single No Icon Chat',
  isGroup: false,
  assistantData: [{ id: 'assistant-xyz', name: 'Single No Icon', iconUrl: undefined }],
  initialAssistantId: 'assistant-xyz',
  assistantIds: ['assistant-xyz'],
} as unknown as Conversation
```

**Tests to add inside `describe('ChatHeader', () => { ... })`** (add after the existing `'does not show assistant avatars for non-group chat'` test):

```tsx
it('renders avatar for single-assistant chat with iconUrl', () => {
  mockChatsStore.currentChat = mockSingleAssistantChat
  render(<ChatHeader />)
  expect(screen.getByLabelText('Assistant One')).toBeInTheDocument()
})

it('renders avatar for single-assistant chat without iconUrl', () => {
  mockChatsStore.currentChat = mockSingleAssistantChatNoIcon
  render(<ChatHeader />)
  expect(screen.getByLabelText('Single No Icon')).toBeInTheDocument()
})

it('calls handleAvatarClick when single-assistant header avatar is clicked', async () => {
  mockChatsStore.currentChat = mockSingleAssistantChat
  render(<ChatHeader />)
  await user.click(screen.getByLabelText('Assistant One'))
  expect(mockChatContext.attemptToggleConfigVisibility).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run the new tests to confirm they fail (RED)**

```bash
npm run test:unit -- --reporter=verbose src/pages/chat/components/ChatHeader/__tests__/ChatHeader.test.tsx
```

Expected: 3 new tests FAIL — `Unable to find an accessible element with the label text of: Assistant One` (or similar). All existing tests should still PASS.

- [ ] **Step 3: Fix `ChatHeader.tsx` — add Avatar to single-assistant branch**

Replace lines 117–125 in `src/pages/chat/components/ChatHeader/ChatHeader.tsx`.

**Before:**
```tsx
        {assistantDisplayName && (currentChat?.assistantData?.length ?? 0) <= 1 && (
          <span
            className="ml-2 line-clamp-1 font-semibold text-text-primary"
            data-tooltip-id="react-tooltip"
            data-tooltip-content={assistantDisplayName}
          >
            {assistantDisplayName}
          </span>
        )}
```

**After:**
```tsx
        {assistantDisplayName && (currentChat?.assistantData?.length ?? 0) <= 1 && (
          <>
            <Avatar
              iconUrl={currentChat?.assistantData[0]?.iconUrl}
              name={assistantDisplayName}
              type={AvatarType.SMALL}
              onClick={handleAvatarClick}
              withTooltip
            />
            <span
              className="ml-2 line-clamp-1 font-semibold text-text-primary"
              data-tooltip-id="react-tooltip"
              data-tooltip-content={assistantDisplayName}
            >
              {assistantDisplayName}
            </span>
          </>
        )}
```

- [ ] **Step 4: Run the full ChatHeader test suite (GREEN)**

```bash
npm run test:unit -- --reporter=verbose src/pages/chat/components/ChatHeader/__tests__/ChatHeader.test.tsx
```

Expected: All tests PASS including the 3 new ones. The existing `'does not show assistant avatars for non-group chat'` test continues to pass because `mockChat.assistantData` is empty, so `assistantDisplayName` is `undefined` and the block does not render.

- [ ] **Step 5: Run full unit suite and type-check**

```bash
npm run typecheck && npm run test:unit
```

Expected: exit code 0 for both; no TS errors; all test suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/chat/components/ChatHeader/ChatHeader.tsx \
        src/pages/chat/components/ChatHeader/__tests__/ChatHeader.test.tsx
git commit -m "EPMCDME-14034: Add assistant avatar to single-assistant chat header"
```
