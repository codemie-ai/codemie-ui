# Resizable Chat Configuration Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the chat configuration panel (`ChatConfiguration.tsx`) horizontally resizable using `react-resizable-panels`, following the same pattern used for the chat sidebar in `useChatSidebarResize.ts`.

**Architecture:** Replace the inner `<div className="flex h-full">` in `ChatPage.tsx` with a `<Group orientation="horizontal">` containing a main-area `<Panel>` and a config `<Panel>` (starting collapsed at `defaultSize={0}`) separated by `ChatConfigResizableSeparator`. A new `useChatConfigResize` hook (mirrors `useChatSidebarResize`) manages `panelRef`, drag detection via `pointerDownRef`/`isConfigVisibleRef`, and `isConfigVisible`-driven collapse/expand. Width resets to 384 px on every open (hook calls `panel.resize(DEFAULT)` when expanding).

**Tech Stack:** React, `react-resizable-panels` v4 (already installed), `ResizableSeparator` shared component, Vitest + `@testing-library/react`.

---

## File Map

| Action | File |
|--------|------|
| Create | `src/pages/chat/components/ChatConfiguration/chatConfigWidth.ts` |
| Create | `src/pages/chat/components/ChatConfiguration/useChatConfigResize.ts` |
| Create | `src/pages/chat/components/ChatConfiguration/__tests__/useChatConfigResize.test.ts` |
| Create | `src/pages/chat/components/ChatConfiguration/ChatConfigResizableSeparator.tsx` |
| Modify | `src/pages/chat/components/ChatConfiguration/ChatConfiguration.tsx` |
| Modify | `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfiguration.test.tsx` |
| Modify | `src/pages/chat/ChatPage.tsx` |
| Modify | `src/pages/chat/__tests__/ChatPage.test.tsx` |
| Modify | `src/components/ResizableSeparator/ResizableSeparator.tsx` |

---

## Task 1: Width constants

**Files:**
- Create: `src/pages/chat/components/ChatConfiguration/chatConfigWidth.ts`

- [ ] **Step 1: Write the failing test**

Create `src/pages/chat/components/ChatConfiguration/__tests__/chatConfigWidth.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  CHAT_CONFIG_DEFAULT_WIDTH,
  CHAT_CONFIG_MIN_WIDTH,
  CHAT_CONFIG_MAX_WIDTH,
} from '../chatConfigWidth'

describe('chatConfigWidth constants', () => {
  it('DEFAULT_WIDTH matches current w-96 (24rem × 16px)', () => {
    expect(CHAT_CONFIG_DEFAULT_WIDTH).toBe(384)
  })

  it('MIN_WIDTH is less than DEFAULT_WIDTH', () => {
    expect(CHAT_CONFIG_MIN_WIDTH).toBeLessThan(CHAT_CONFIG_DEFAULT_WIDTH)
  })

  it('MAX_WIDTH is greater than DEFAULT_WIDTH', () => {
    expect(CHAT_CONFIG_MAX_WIDTH).toBeGreaterThan(CHAT_CONFIG_DEFAULT_WIDTH)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/pages/chat/components/ChatConfiguration/__tests__/chatConfigWidth.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `chatConfigWidth.ts`**

```ts
export const CHAT_CONFIG_DEFAULT_WIDTH = 384
export const CHAT_CONFIG_MIN_WIDTH = 260
export const CHAT_CONFIG_MAX_WIDTH = 640
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/pages/chat/components/ChatConfiguration/__tests__/chatConfigWidth.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/ChatConfiguration/chatConfigWidth.ts \
        src/pages/chat/components/ChatConfiguration/__tests__/chatConfigWidth.test.ts
git commit -m "EPMCDME-9820: Add chat config panel width constants"
```

---

## Task 2: `useChatConfigResize` hook

**Files:**
- Create: `src/pages/chat/components/ChatConfiguration/__tests__/useChatConfigResize.test.ts`
- Create: `src/pages/chat/components/ChatConfiguration/useChatConfigResize.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/chat/components/ChatConfiguration/__tests__/useChatConfigResize.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PanelImperativeHandle, PanelSize } from 'react-resizable-panels'

import { CHAT_CONFIG_DEFAULT_WIDTH } from '../chatConfigWidth'
import { useChatConfigResize } from '../useChatConfigResize'

const makeMockPanel = (): PanelImperativeHandle =>
  ({
    collapse: vi.fn(),
    expand: vi.fn(),
    resize: vi.fn(),
    isCollapsed: vi.fn().mockReturnValue(false),
    isExpanded: vi.fn().mockReturnValue(true),
    getSize: vi.fn().mockReturnValue({ inPixels: 384, percentage: 25, sizeStyle: '384px' }),
    getId: vi.fn().mockReturnValue('chat-config'),
  }) as unknown as PanelImperativeHandle

describe('useChatConfigResize', () => {
  let mockOnClose: ReturnType<typeof vi.fn>
  let mockPanel: PanelImperativeHandle

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnClose = vi.fn()
    mockPanel = makeMockPanel()
  })

  it('handleResize is a no-op when pointer is not down', () => {
    const { result } = renderHook(() =>
      useChatConfigResize({ isConfigVisible: true, onClose: mockOnClose })
    )

    act(() => {
      result.current.handleResize({ inPixels: 300, percentage: 20, sizeStyle: '300px' } as PanelSize)
    })

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('handleResize calls onClose when panel is dragged to 0px', () => {
    const { result } = renderHook(() =>
      useChatConfigResize({ isConfigVisible: true, onClose: mockOnClose })
    )

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerdown'))
    })

    act(() => {
      result.current.handleResize({ inPixels: 0, percentage: 0, sizeStyle: '0px' } as PanelSize)
    })

    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('handleResize does NOT call onClose for non-zero width when pointer is down', () => {
    const { result } = renderHook(() =>
      useChatConfigResize({ isConfigVisible: true, onClose: mockOnClose })
    )

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerdown'))
    })

    act(() => {
      result.current.handleResize({ inPixels: 500, percentage: 35, sizeStyle: '500px' } as PanelSize)
    })

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('resets pointerDownRef on pointerup', () => {
    const { result } = renderHook(() =>
      useChatConfigResize({ isConfigVisible: true, onClose: mockOnClose })
    )

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerdown'))
      window.dispatchEvent(new PointerEvent('pointerup'))
    })

    // After pointerup, handleResize should be a no-op again
    act(() => {
      result.current.handleResize({ inPixels: 0, percentage: 0, sizeStyle: '0px' } as PanelSize)
    })

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('expands panel to DEFAULT_WIDTH when isConfigVisible changes to true', () => {
    vi.mocked(mockPanel.isCollapsed).mockReturnValue(true)

    const { result, rerender } = renderHook(
      ({ isVisible }: { isVisible: boolean }) =>
        useChatConfigResize({ isConfigVisible: isVisible, onClose: mockOnClose }),
      { initialProps: { isVisible: false } }
    )

    result.current.panelRef.current = mockPanel

    act(() => {
      rerender({ isVisible: true })
    })

    expect(mockPanel.resize).toHaveBeenCalledWith(CHAT_CONFIG_DEFAULT_WIDTH)
  })

  it('collapses panel when isConfigVisible changes to false', () => {
    vi.mocked(mockPanel.isCollapsed).mockReturnValue(false)

    const { result, rerender } = renderHook(
      ({ isVisible }: { isVisible: boolean }) =>
        useChatConfigResize({ isConfigVisible: isVisible, onClose: mockOnClose }),
      { initialProps: { isVisible: true } }
    )

    result.current.panelRef.current = mockPanel

    act(() => {
      rerender({ isVisible: false })
    })

    expect(mockPanel.collapse).toHaveBeenCalled()
  })

  it('does not expand an already-expanded panel', () => {
    vi.mocked(mockPanel.isCollapsed).mockReturnValue(false)

    const { result, rerender } = renderHook(
      ({ isVisible }: { isVisible: boolean }) =>
        useChatConfigResize({ isConfigVisible: isVisible, onClose: mockOnClose }),
      { initialProps: { isVisible: false } }
    )

    result.current.panelRef.current = mockPanel

    act(() => {
      rerender({ isVisible: true })
    })

    expect(mockPanel.resize).not.toHaveBeenCalled()
    expect(mockPanel.expand).not.toHaveBeenCalled()
  })

  it('does not collapse an already-collapsed panel', () => {
    vi.mocked(mockPanel.isCollapsed).mockReturnValue(true)

    const { result, rerender } = renderHook(
      ({ isVisible }: { isVisible: boolean }) =>
        useChatConfigResize({ isConfigVisible: isVisible, onClose: mockOnClose }),
      { initialProps: { isVisible: true } }
    )

    result.current.panelRef.current = mockPanel

    act(() => {
      rerender({ isVisible: false })
    })

    expect(mockPanel.collapse).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/pages/chat/components/ChatConfiguration/__tests__/useChatConfigResize.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `useChatConfigResize.ts`**

Create `src/pages/chat/components/ChatConfiguration/useChatConfigResize.ts`:

```ts
import { useCallback, useEffect, useRef } from 'react'
import type { PanelImperativeHandle, PanelSize } from 'react-resizable-panels'

import { CHAT_CONFIG_DEFAULT_WIDTH } from './chatConfigWidth'

interface UseChatConfigResizeOptions {
  isConfigVisible: boolean
  onClose: () => void
  onOpen: () => void
}

export const useChatConfigResize = ({
  isConfigVisible,
  onClose,
  onOpen,
}: UseChatConfigResizeOptions) => {
  const panelRef = useRef<PanelImperativeHandle>(null)
  const pointerDownRef = useRef(false)
  // Track current visibility in a ref so handleResize can read it without being re-created
  const isConfigVisibleRef = useRef(isConfigVisible)
  isConfigVisibleRef.current = isConfigVisible

  useEffect(() => {
    const onPointerDown = () => {
      pointerDownRef.current = true
    }
    const endDrag = () => {
      pointerDownRef.current = false
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointerup', endDrag, true)
    window.addEventListener('pointercancel', endDrag, true)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointerup', endDrag, true)
      window.removeEventListener('pointercancel', endDrag, true)
    }
  }, [])

  const handleResize = useCallback(
    (panelSize: PanelSize) => {
      if (!pointerDownRef.current) return

      if (panelSize.inPixels === 0) {
        onClose()
      } else if (!isConfigVisibleRef.current) {
        // User dragged the separator to expand the panel from collapsed state;
        // sync React visibility state so content renders and the header button updates.
        onOpen()
      }
    },
    [onClose, onOpen]
  )

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    if (isConfigVisible && panel.isCollapsed()) {
      // Always resize to default on open — implements "reset on close/reopen"
      panel.resize(CHAT_CONFIG_DEFAULT_WIDTH)
    } else if (!isConfigVisible && !panel.isCollapsed()) {
      panel.collapse()
    }
  }, [isConfigVisible])

  return { panelRef, handleResize }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/pages/chat/components/ChatConfiguration/__tests__/useChatConfigResize.test.ts
```

Expected: 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/ChatConfiguration/useChatConfigResize.ts \
        src/pages/chat/components/ChatConfiguration/__tests__/useChatConfigResize.test.ts
git commit -m "EPMCDME-9820: Add useChatConfigResize hook"
```

---

## Task 3: Migrate `ChatConfiguration.tsx` and its tests

Strip hardcoded width Tailwind classes from the `<aside>` and inner div. Migrate class-based test assertions to content-visibility assertions.

**Files:**
- Modify: `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfiguration.test.tsx`
- Modify: `src/pages/chat/components/ChatConfiguration/ChatConfiguration.tsx`

- [ ] **Step 1: Update test assertions first (they should still pass before the component change)**

In `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfiguration.test.tsx`, replace the two test bodies that assert Tailwind class names:

Replace:
```ts
it('renders sidebar with collapsed state initially', () => {
  mockChatContext.isConfigVisible = false
  const { container } = render(
    <ChatConfiguration showNewIntegrationPopup={mockShowNewIntegrationPopup} />
  )

  const aside = container.querySelector('aside')
  expect(aside).toHaveClass('w-0')
  expect(screen.queryByText('General')).not.toBeInTheDocument()
})

it('expands sidebar and shows general settings when config is visible', () => {
  mockChatContext.isConfigVisible = true
  const { container } = render(
    <ChatConfiguration showNewIntegrationPopup={mockShowNewIntegrationPopup} />
  )

  const aside = container.querySelector('aside')
  expect(aside).toHaveClass('w-96')
  expect(screen.getByText('General')).toBeInTheDocument()
  expect(screen.getByText('LLM Model')).toBeInTheDocument()
  expect(screen.getByText('Image generation')).toBeInTheDocument()
})
```

With:
```ts
it('renders sidebar with collapsed state initially', () => {
  mockChatContext.isConfigVisible = false
  render(<ChatConfiguration showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

  expect(screen.queryByText('General')).not.toBeInTheDocument()
})

it('expands sidebar and shows general settings when config is visible', () => {
  mockChatContext.isConfigVisible = true
  render(<ChatConfiguration showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

  expect(screen.getByText('General')).toBeInTheDocument()
  expect(screen.getByText('LLM Model')).toBeInTheDocument()
  expect(screen.getByText('Image generation')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the full ChatConfiguration test suite — all should still pass**

```bash
npx vitest run src/pages/chat/components/ChatConfiguration/__tests__/ChatConfiguration.test.tsx
```

Expected: 5 tests PASS (content-visibility assertions work with both old and new component).

- [ ] **Step 3: Update `ChatConfiguration.tsx`**

Replace the entire component file with this content (license header preserved):

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

import { FC } from 'react'
import { useSnapshot } from 'valtio'

import { useAssistantFeatures } from '@/pages/chat/hooks/useAssistantFeatures'
import { useChatContext } from '@/pages/chat/hooks/useChatContext'
import { chatsStore } from '@/store/chats'

import ChatConfigAssistantForm from './ChatConfigAssistants/ChatConfigAssistantForm'
import ChatConfigAssistants from './ChatConfigAssistants/ChatConfigAssistants'
import ChatConfigImageGeneration from './ChatConfigImageGeneration'
import ChatConfigLlmSelector from './ChatConfigLlmSelector'
import ChatConfigSkillsSelector from './ChatConfigSkillsSelector'

interface ChatConfigurationProps {
  showNewIntegrationPopup: (project: string, credentialType: string) => void
}

const ChatConfiguration: FC<ChatConfigurationProps> = ({ showNewIntegrationPopup }) => {
  const { isConfigVisible, isConfigFormVisible } = useChatContext()
  const { currentChat } = useSnapshot(chatsStore)
  const assistantFeatures = useAssistantFeatures(currentChat?.assistantData ?? [])

  return (
    <aside
      id="chat-configuration-panel"
      className="flex flex-col h-full overflow-x-hidden bg-surface-base-sidebar shadow-surface-base-sidebar border-l border-border-specific-panel-outline"
    >
      {isConfigVisible && (
        <div className="flex flex-col w-full pl-2 pr-2 h-full">
          {isConfigFormVisible ? (
            <ChatConfigAssistantForm showNewIntegrationPopup={showNewIntegrationPopup} />
          ) : (
            <div className="py-7 px-4 overflow-y-auto">
              {(assistantFeatures.modelSelector || assistantFeatures.skills) && (
                <>
                  <h3 className="font-semibold mb-3">General</h3>
                  {assistantFeatures.modelSelector && <ChatConfigLlmSelector />}
                  {assistantFeatures.skills && <ChatConfigSkillsSelector />}
                  {assistantFeatures.modelSelector && <ChatConfigImageGeneration />}
                </>
              )}
              <ChatConfigAssistants />
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

export default ChatConfiguration
```

Key changes:
- `<aside>` className: removed `shrink-0`, `transition-all duration-150 ease-in-out`, removed `cn(...)` conditional, removed `w-96 max-w-96`/`w-0`
- Inner div: `w-96` → `w-full`
- Removed unused `cn` import

- [ ] **Step 4: Run tests to verify the migrated assertions still pass**

```bash
npx vitest run src/pages/chat/components/ChatConfiguration/__tests__/ChatConfiguration.test.tsx
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/ChatConfiguration/ChatConfiguration.tsx \
        src/pages/chat/components/ChatConfiguration/__tests__/ChatConfiguration.test.tsx
git commit -m "EPMCDME-9820: Strip hardcoded width classes from ChatConfiguration"
```

---

## Task 4: Update `ChatPage.tsx` with Group/Panel layout

Wrap the inner flex row in a `<Group orientation="horizontal">` with a main-area `<Panel>` and a config `<Panel>`. Update `ChatPage.test.tsx` to mock the new hook and `react-resizable-panels`.

**Files:**
- Modify: `src/pages/chat/ChatPage.tsx`
- Modify: `src/pages/chat/__tests__/ChatPage.test.tsx`

- [ ] **Step 1: Add mock for `useChatConfigResize` and `react-resizable-panels` in `ChatPage.test.tsx`**

In `src/pages/chat/__tests__/ChatPage.test.tsx`, add these two `vi.mock` calls alongside the existing ones (after the existing mocks block):

```ts
vi.mock('../components/ChatConfiguration/useChatConfigResize', () => ({
  useChatConfigResize: vi.fn(() => ({
    panelRef: { current: null },
    handleResize: vi.fn(),
  })),
}))

vi.mock('react-resizable-panels', () => ({
  Group: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Separator: ({ className }: { className?: string }) => <div className={className} />,
}))
```

Also add `closeConfig: vi.fn()` to `mockChatConfiguration`:

```ts
const mockChatConfiguration = {
  isConfigVisible: false,
  closeConfig: vi.fn(),
  toggleConfigVisibility: vi.fn(),
  attemptToggleConfigVisibility: vi.fn(),
  openConfigForm: vi.fn(),
}
```

- [ ] **Step 2: Run `ChatPage.test.tsx` to get a baseline (may already fail — that's OK)**

```bash
npx vitest run src/pages/chat/__tests__/ChatPage.test.tsx
```

Note the current pass/fail status. The mocks added in Step 1 are already in place, so this should still pass at this point (ChatPage.tsx hasn't changed yet).

- [ ] **Step 3: Update `ChatPage.tsx`**

Replace the file with this content:

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

import { FC, useEffect, useMemo } from 'react'
import { Group, Panel } from 'react-resizable-panels'
import { useSnapshot } from 'valtio'

import PageLayout from '@/components/Layouts/Layout'
import ResizableSeparator from '@/components/ResizableSeparator/ResizableSeparator'
import { useNewIntegrationPopup } from '@/hooks/useNewIntegrationPopup'
import { useVueRouter } from '@/hooks/useVueRouter'
import NewIntegrationPopup from '@/pages/integrations/components/NewIntegrationPopup'
import { chatsStore } from '@/store/chats'

import ChatConfiguration from './components/ChatConfiguration/ChatConfiguration'
import {
  CHAT_CONFIG_MAX_WIDTH,
  CHAT_CONFIG_MIN_WIDTH,
} from './components/ChatConfiguration/chatConfigWidth'
import ChatConfigResizableSeparator from './components/ChatConfiguration/ChatConfigResizableSeparator'
import { useChatConfigResize } from './components/ChatConfiguration/useChatConfigResize'
import ChatHeader from './components/ChatHeader/ChatHeader'
import ChatHistory from './components/ChatHistory/ChatHistory'
import ChatPrompt from './components/ChatPrompt/ChatPrompt'
import ChatSidebar from './components/ChatSidebar/ChatSidebar'
import { useChatAuthCallbacks } from './hooks/useChatAuthCallbacks'
import { useChatConfiguration } from './hooks/useChatConfiguration'
import { ChatContext, ChatContextValue } from './hooks/useChatContext'
import { useChatInitialPrompt } from './hooks/useChatInitialPrompt'
import { useChatNavigation } from './hooks/useChatNavigation'

const ChatPage: FC = () => {
  const {
    showNewIntegration,
    selectedCredentialType,
    selectedProject,
    showNewIntegrationPopup,
    hideNewIntegrationPopup,
    onIntegrationSuccess,
  } = useNewIntegrationPopup()
  useChatNavigation()
  useChatInitialPrompt()

  const router = useVueRouter()
  const { currentChat } = useSnapshot(chatsStore) as typeof chatsStore
  const chatId = router.currentRoute.value.params.id as string

  useEffect(() => {
    if (chatId) {
      chatsStore.getChat(chatId, { saveAsRecent: true })
      chatsStore.isNewChat = false
      chatsStore.newChatParams = null
    }
  }, [chatId])

  useChatAuthCallbacks(currentChat)

  const chatConfiguration = useChatConfiguration()
  const { panelRef: configPanelRef, handleResize: handleConfigResize } = useChatConfigResize({
    isConfigVisible: chatConfiguration.isConfigVisible,
    onClose: chatConfiguration.closeConfig,
    onOpen: chatConfiguration.toggleConfigVisibility,
  })
  const chatContextValue: ChatContextValue = useMemo(
    () => ({ ...chatConfiguration, isSharedPage: false }),
    [chatConfiguration]
  )

  return (
    <ChatContext.Provider value={chatContextValue}>
      <div className="flex h-full">
        <ChatSidebar />

        <PageLayout key={currentChat?.id} childrenClassName="px-0" renderHeader={<ChatHeader />}>
          <Group orientation="horizontal" className="h-full">
            <Panel id="chat-area" minSize={400}>
              {currentChat && (
                <div className="flex flex-col items-center h-full pb-4">
                  {!!currentChat?.history.length && <ChatHistory />}
                  <ChatPrompt />
                </div>
              )}
            </Panel>

            <ChatConfigResizableSeparator />

            <Panel
              id="chat-config"
              panelRef={configPanelRef}
              defaultSize={0}
              minSize={CHAT_CONFIG_MIN_WIDTH}
              maxSize={CHAT_CONFIG_MAX_WIDTH}
              collapsible
              collapsedSize={0}
              groupResizeBehavior="preserve-pixel-size"
              onResize={handleConfigResize}
            >
              <ChatConfiguration showNewIntegrationPopup={showNewIntegrationPopup} />
            </Panel>
          </Group>
        </PageLayout>
      </div>

      <NewIntegrationPopup
        visible={showNewIntegration}
        onHide={hideNewIntegrationPopup}
        onSuccess={onIntegrationSuccess}
        project={selectedProject}
        credentialType={selectedCredentialType}
      />
    </ChatContext.Provider>
  )
}

export default ChatPage
```

Key changes vs the original:
- Added imports: `Group`, `Panel` from `react-resizable-panels`; `ResizableSeparator`; `useChatConfigResize`; width constants
- `useChatConfigResize` called with `isConfigVisible` and `closeConfig` from `chatConfiguration`
- Inner `<div className="flex h-full">` → `<Group orientation="horizontal" className="h-full">`
- Main content wrapped in `<Panel id="chat-area" minSize={400}>`; inner div loses `grow min-w-0`, gains `h-full`
- `<ChatConfiguration>` wrapped in a resizable `<Panel id="chat-config">`
- `<ResizableSeparator orientation="horizontal" />` between the two panels

- [ ] **Step 4: Run `ChatPage.test.tsx` to verify tests still pass**

```bash
npx vitest run src/pages/chat/__tests__/ChatPage.test.tsx
```

Expected: all tests PASS. If any fail due to the layout change, check whether the test asserts on DOM structure that changed (e.g., the presence of a wrapper div). Fix assertions to match the new structure.

- [ ] **Step 5: Run the full chat test suite**

```bash
npx vitest run src/pages/chat/
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/chat/ChatPage.tsx \
        src/pages/chat/__tests__/ChatPage.test.tsx
git commit -m "EPMCDME-9820: Wrap chat layout in Group/Panel for resizable config panel"
```

---

## Task 5: Visual resize indicator (`ChatConfigResizableSeparator`)

Following the EPMCDME-11292 `ChatResizableSeparator` pattern. Update `ResizableSeparator` to support children, create the new separator component with a decorative pill and dark-mode contrast fix.

**Files:**
- Modify: `src/components/ResizableSeparator/ResizableSeparator.tsx`
- Create: `src/pages/chat/components/ChatConfiguration/ChatConfigResizableSeparator.tsx`

- [ ] **Step 1: Add `children` support to `ResizableSeparator`**

```tsx
import { ReactNode } from 'react'
import { Separator } from 'react-resizable-panels'

interface ResizableSeparatorProps {
  orientation: 'horizontal' | 'vertical'
  className?: string
  children?: ReactNode
}

const ResizableSeparator = ({ orientation, className = '', children }: ResizableSeparatorProps) => {
  const baseClasses =
    'relative bg-black/20 transition-all duration-200 ease-in-out z-[1] box-border bg-clip-padding !outline-none'
  // ... orientation classes unchanged ...
  return (
    <Separator className={`${baseClasses} ${orientationClasses} ${className}`}>
      {children}
    </Separator>
  )
}
```

- [ ] **Step 2: Create `ChatConfigResizableSeparator.tsx`**

```tsx
import { Separator } from 'react-resizable-panels'

const ChatConfigResizableSeparator = () => (
  <Separator
    aria-label="Resize configuration panel"
    aria-controls="chat-area chat-config"
    aria-orientation="vertical"
    className="relative w-4 -mx-2 bg-transparent !cursor-[ew-resize] !outline-none z-[1] flex items-center justify-center group"
  >
    <div
      aria-hidden="true"
      className="h-10 w-1 rounded-full bg-black/20 [.codemieDark_&]:bg-white/25 pointer-events-none transition-all duration-150 group-hover:bg-black/45 [.codemieDark_&]:group-hover:bg-white/50 group-hover:h-12 group-focus-visible:bg-black/60 [.codemieDark_&]:group-focus-visible:bg-white/65 group-focus-visible:h-12 group-focus-visible:w-[3px] group-focus-visible:ring-2 group-focus-visible:ring-black/30 [.codemieDark_&]:group-focus-visible:ring-white/50"
    />
  </Separator>
)

export default ChatConfigResizableSeparator
```

Note: `[.codemieDark_&]` is Tailwind's arbitrary-variant syntax for `.codemieDark .element`. The app applies `codemieDark` class to `<html>` for dark mode — Tailwind's `dark:` modifier is disabled (`darkMode: ['variant', '.nottused * &']`).

- [ ] **Step 3: Replace `<ResizableSeparator orientation="horizontal" />` in `ChatPage.tsx` with `<ChatConfigResizableSeparator />`**

- [ ] **Step 4: Run typecheck and tests**

```bash
npm run typecheck
npx vitest run src/pages/chat/__tests__/ChatPage.test.tsx
```

Expected: TypeScript clean, 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ResizableSeparator/ResizableSeparator.tsx \
        src/pages/chat/components/ChatConfiguration/ChatConfigResizableSeparator.tsx \
        src/pages/chat/ChatPage.tsx
git commit -m "EPMCDME-9820: Add resize indicator pill to config panel separator"
```

---

## Task 6: Manual smoke test

- [ ] **Step 1: Start the dev server (if not running)**

```bash
npm run dev
```

Navigate to `http://localhost:5173/chats`.

- [ ] **Step 2: Open a chat and click "Configuration"**

The config panel should slide open at its default width (~384px). Verify the panel is visible and content (LLM Model, Skills, Image generation, Connected Assistants) renders correctly.

- [ ] **Step 3: Drag the resize handle**

Hover near the left edge of the config panel — cursor should change to `ew-resize`. Drag left to widen the panel (up to 640px), drag right to narrow it (down to 260px). Verify content reflows without overflow.

- [ ] **Step 4: Test close + reopen resets width**

1. Drag the panel to ~600px.
2. Click "Configuration" to close.
3. Click "Configuration" to reopen.
4. Panel should open at ~384px (default), not 600px.

- [ ] **Step 5: Test drag-to-close**

Drag the resize handle all the way to the right edge. The panel should collapse and the "Configuration" button in the header should reflect the closed state (not highlighted).

- [ ] **Step 6: Verify the main chat area is unaffected**

Send a message in the chat. Verify ChatHistory and ChatPrompt render and function correctly with the panel both open and closed.

---

## Test-first line per task

| Task | Test-first | Failing test description |
|------|-----------|--------------------------|
| Task 1 | Yes | `chatConfigWidth.test.ts` fails with module not found |
| Task 2 | Yes | `useChatConfigResize.test.ts` fails with module not found; 10 tests cover `onOpen`, `onClose`, pointer guard, and collapse/expand effects |
| Task 3 | Yes | Updated assertions in `ChatConfiguration.test.tsx` pass before AND after component change |
| Task 4 | Yes | `ChatPage.test.tsx` baseline captured before `ChatPage.tsx` change |
| Task 5 | No | TypeScript + existing test suite validate the separator (visual indicator has no unit tests) |
