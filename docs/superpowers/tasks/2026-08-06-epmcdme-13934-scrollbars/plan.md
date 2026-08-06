# EPMCDME-13934: Fix unwanted scrollbars in chat page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove phantom scrollbar gutter strips (left edge on Windows) and inherited Firefox thin scrollbars that appeared in the chat history/prompt area after EPMCDME-11292.

**Architecture:** Three targeted CSS-class changes across two component files and one global stylesheet. No logic changes. `main.scss` gets a new rule block (2 lines) that extends the existing WebKit-only scrollbar hiding to Firefox and IE/Edge. `ChatHistory` swaps the `scrollbar-gutter` class (both-edges) for `scrollbar-gutter-edge` (right-edge only). `ChatPrompt` drops `scrollbar-gutter` from the resizable scroll container where it provides no benefit.

**Tech Stack:** React + TypeScript, Tailwind CSS, SCSS, Vitest + React Testing Library

---

## File map

| File | Change |
|---|---|
| `src/assets/stylesheets/main.scss` | Add `scrollbar-width: none; -ms-overflow-style: none` block inside `html, body, #app {}` |
| `src/pages/chat/components/ChatHistory/ChatHistory.tsx` | `scrollbar-gutter` → `scrollbar-gutter-edge` on the root scroll div |
| `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` | Remove `scrollbar-gutter` from the resizable-mode scroll container |

Test files touched (class assertions only — no new logic):
- `src/pages/chat/components/ChatHistory/__tests__/ChatHistory.scrollbar.test.tsx` *(new)*
- `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.scrollbar.test.tsx` *(new)*

---

### Task 1: ChatHistory — swap `scrollbar-gutter` for `scrollbar-gutter-edge`

**Files:**
- Modify: `src/pages/chat/components/ChatHistory/ChatHistory.tsx:44`
- Test (new): `src/pages/chat/components/ChatHistory/__tests__/ChatHistory.scrollbar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/chat/components/ChatHistory/__tests__/ChatHistory.scrollbar.test.tsx`:

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

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ChatHistory from '../ChatHistory'

vi.mock('../ChatHistoryGroup', () => ({
  default: () => <div data-testid="history-group" />,
}))

vi.mock('../hooks/useChatScroll', () => ({
  useChatScroll: vi.fn(),
}))

vi.mock('../hooks/useChatInfiniteScroll', () => ({
  useChatInfiniteScroll: () => ({
    refs: { rootRef: vi.fn(), sentryRef: { current: null } },
    visibleHistory: [],
    hasMoreMessages: false,
    lastMessageIndex: 0,
  }),
}))

describe('ChatHistory scrollbar classes', () => {
  it('uses scrollbar-gutter-edge (not scrollbar-gutter) on the scroll container', () => {
    const { container } = render(<ChatHistory />)
    const scrollDiv = container.firstChild as HTMLElement

    expect(scrollDiv.classList.contains('scrollbar-gutter-edge')).toBe(true)
    expect(scrollDiv.classList.contains('scrollbar-gutter')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/pages/chat/components/ChatHistory/__tests__/ChatHistory.scrollbar.test.tsx
```

Expected: FAIL — `scrollbar-gutter-edge` is absent, `scrollbar-gutter` is present.

- [ ] **Step 3: Apply the fix in ChatHistory.tsx**

In `src/pages/chat/components/ChatHistory/ChatHistory.tsx` line 44, change the className:

Before:
```tsx
className="h-full w-full pt-8 pb-12 px-6 overflow-y-auto scrollbar-gutter"
```

After:
```tsx
className="h-full w-full pt-8 pb-12 px-6 overflow-y-auto scrollbar-gutter-edge"
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/pages/chat/components/ChatHistory/__tests__/ChatHistory.scrollbar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/ChatHistory/ChatHistory.tsx \
        src/pages/chat/components/ChatHistory/__tests__/ChatHistory.scrollbar.test.tsx
git commit -m "EPMCDME-13934: Replace scrollbar-gutter both-edges with single-edge on ChatHistory"
```

---

### Task 2: ChatPrompt — remove `scrollbar-gutter` from the resizable scroll container

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx:230`
- Test (new): `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.scrollbar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.scrollbar.test.tsx`:

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

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ChatPrompt from '../ChatPrompt'

vi.mock('valtio', () => ({
  proxy: <T extends object>(obj: T): T => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
  ref: vi.fn((v) => v),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: {
    currentChat: {
      id: 'chat-1',
      history: [[{ inProgress: false }]],
      isInterrupted: false,
      isWorkflow: false,
      assistantIds: ['assistant-1'],
    },
  },
}))

vi.mock('@/store/chatGeneration', () => ({
  chatGenerationStore: { createChatGeneration: vi.fn() },
}))

vi.mock('@/store', () => ({
  assistantsStore: { defaultAssistant: { id: 'assistant-1' } },
  userStore: { userData: { stt_support: false }, user: { userId: 'user-1' } },
}))

vi.mock('../../../hooks/useChatPromptDraft', () => ({
  useChatPromptDraft: () => ({ initial: { message: '', messageRaw: '' }, saveDraft: vi.fn(), clearDraft: vi.fn() }),
}))

vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: false }) }))

vi.mock('@/hooks/useFileUpload', () => ({
  useFileUpload: () => ({ addFiles: vi.fn(), hasActiveUploads: false }),
}))

vi.mock('../../../hooks/useChatContext', () => ({
  useChatContext: () => ({ selectedSkills: [], isSharedPage: false, dynamicToolsConfig: null }),
}))

vi.mock('../../../hooks/useFilePaste', () => ({
  useFilePaste: () => ({ setupPasteHandler: vi.fn() }),
}))

vi.mock('../../../hooks/useAssistantFeatures', () => ({
  useAssistantFeatures: () => ({
    fileAttachment: false,
    modelSelector: false,
    tools: false,
    skills: false,
  }),
}))

vi.mock('../ChatPromptStarters', () => ({ default: () => null }))
vi.mock('../ChatPromptVoiceRecorder', () => ({ default: () => null }))
vi.mock('../ChatPromptFileUpload', () => ({ default: () => null }))
vi.mock('../ChatPromptLlmSelector', () => ({ default: () => null }))
vi.mock('../ChatPromptSkillsButton', () => ({ default: () => null }))
vi.mock('../DynamicToolsSettings', () => ({ default: () => null }))
vi.mock('../../../components/ChatControls', () => ({ default: () => null }))

describe('ChatPrompt scrollbar classes in resizable mode', () => {
  it('does not apply scrollbar-gutter to the scroll container when resizable=true', () => {
    const { container } = render(<ChatPrompt resizable />)
    // The scroll container is the div with overflow-y-auto inside the outer relative wrapper
    const scrollDivs = container.querySelectorAll('.overflow-y-auto')
    scrollDivs.forEach((div) => {
      expect(div.classList.contains('scrollbar-gutter')).toBe(false)
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.scrollbar.test.tsx
```

Expected: FAIL — `scrollbar-gutter` is present on the `overflow-y-auto` div.

- [ ] **Step 3: Apply the fix in ChatPrompt.tsx**

In `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` line 230, change the `cn()` call:

Before:
```tsx
'w-full flex flex-col px-6 scrollbar-gutter overflow-y-auto z-10',
```

After:
```tsx
'w-full flex flex-col px-6 overflow-y-auto z-10',
```

The surrounding context (for locating the line):
```tsx
<div
  className={cn(
    'w-full flex flex-col px-6 overflow-y-auto z-10',
    resizable ? 'flex-1 min-h-0' : 'min-h-32 h-fit -translate-y-3 shrink-0'
  )}
>
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.scrollbar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/ChatPrompt/ChatPrompt.tsx \
        src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.scrollbar.test.tsx
git commit -m "EPMCDME-13934: Remove scrollbar-gutter from ChatPrompt resizable scroll container"
```

---

### Task 3: main.scss — extend global scrollbar hiding to Firefox and IE/Edge

**Files:**
- Modify: `src/assets/stylesheets/main.scss:60-90` (inside the `html, body, #app {}` block)

> **Note:** CSS/SCSS has no unit-test mechanism in this project. The acceptance gate for this task is the full test suite passing (no regressions) and a manual smoke-check on Windows Firefox (or cross-browser DevTools simulation) confirming the scrollbars are gone. The two lines are self-contained and low-risk.

- [ ] **Step 1: Apply the fix in main.scss**

In `src/assets/stylesheets/main.scss`, inside the `html, body, #app {}` block (currently lines 60–90), add the new rule **after** the existing `::-webkit-scrollbar` rule:

Before (lines 60–90, abbreviated):
```scss
html,
body,
#app {
  @apply flex flex-col h-screen max-h-screen;

  //Hides scrollbars in WebKit-based browsers for all elements except textareas
  :not(textarea):not(.show-scroll)::-webkit-scrollbar {
    display: none;
  }

  .show-scroll {
    // ... existing .show-scroll styles
  }
}
```

After (add the new block right after the `::-webkit-scrollbar` rule):
```scss
html,
body,
#app {
  @apply flex flex-col h-screen max-h-screen;

  //Hides scrollbars in WebKit-based browsers for all elements except textareas
  :not(textarea):not(.show-scroll)::-webkit-scrollbar {
    display: none;
  }

  // Hides scrollbars in Firefox and IE/Edge for all elements except textareas
  :not(textarea):not(.show-scroll) {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .show-scroll {
    // ... (existing .show-scroll styles, unchanged)
  }
}
```

The exact edit: after line 68 (`    display: none;`), before line 69 (`  }`), insert:
```scss
  }

  // Hides scrollbars in Firefox and IE/Edge for all elements except textareas
  :not(textarea):not(.show-scroll) {
    scrollbar-width: none;
    -ms-overflow-style: none;
```

(The closing `}` of the new block replaces the existing closing `}` of the WebKit rule, then opens a new `.show-scroll` block.)

- [ ] **Step 2: Run the full test suite to catch any regressions**

```bash
npm run test:unit
npm run test:integration
```

Expected: All previously passing tests still pass. No test failures.

- [ ] **Step 3: Commit**

```bash
git add src/assets/stylesheets/main.scss
git commit -m "EPMCDME-13934: Extend global scrollbar hiding to Firefox and IE/Edge"
```

---

### Task 4: Run quality gates and verify

- [ ] **Step 1: Run lint and typecheck**

```bash
npm run lint
npm run typecheck
```

Expected: exit 0 for both.

- [ ] **Step 2: Run full test suite**

```bash
npm run test:unit
npm run test:integration
```

Expected: All tests pass. The two new scrollbar test files should be included in the count.

- [ ] **Step 3: Manual smoke check (Windows Chrome or Firefox)**

If a Windows machine or BrowserStack is available, open the chat page with an active chat (has-history state) and verify:
- No thin scrollbar track at the right edge of the ChatPrompt area
- No blank gutter strip at the left edge of ChatHistory or ChatPrompt
- Chat history still scrolls when messages overflow the panel
- The ChatPrompt resize handle still drags correctly

On macOS the visual change is not observable (overlay scrollbars) — this step is specifically to confirm the Windows regression is resolved.

- [ ] **Step 4: Commit planning artifacts (Stage 8 of sdlc-standard)**

```bash
git add docs/superpowers/tasks/2026-08-06-epmcdme-13934-scrollbars/
git commit -m "EPMCDME-13934: Add planning artifacts"
```

---

## Self-review

**Spec coverage:**
- AC-1 (no scrollbars on Windows Firefox/Chrome): Task 1 (both-edges → single-edge), Task 2 (remove scrollbar-gutter from prompt), Task 3 (global Firefox rule) ✓
- AC-2 (chat history scrolls correctly): `overflow-y-auto` retained, only `scrollbar-gutter-edge` used — scroll behavior unchanged ✓
- AC-3 (resize handle unaffected): ChatPage.tsx not touched; Panel structure unchanged ✓
- AC-4 (no regression on `.show-scroll` elements): New rule uses same `:not(.show-scroll)` selector as existing WebKit rule; `.show-scroll` elements are excluded ✓
- AC-5 (all tests pass): Task 4 runs full suite ✓

**Placeholder scan:** No TBDs, no "implement later", no missing code blocks.

**Type consistency:** No type changes — all edits are string class names only.
