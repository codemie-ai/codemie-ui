# EPMCDME-8420: Triple-Dot Button Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add accessible names, `aria-expanded`, `aria-controls`, and `aria-labelledby` to the "⁝" (More Options) button in the chats sidebar so screen readers announce "More Options Chat 1, button, collapsed/expanded".

**Architecture:** Add an optional `contextId` prop to the shared `NavigationMore` component; when provided, it generates stable IDs via `useId()` and wires `aria-labelledby` (compound: button's own id + context element id) and `aria-controls` (button → menu container). `ChatListItem` and `FolderList` assign IDs to their name elements and pass `contextId` down. No new files required.

**Tech Stack:** React 18 (`useId`), `@floating-ui/react`, Tailwind CSS (`sr-only`), vitest + `@testing-library/react`.

## Global Constraints

- `aria-haspopup="menu"` is already present and correct per ARIA 1.2 — do NOT change to `"true"`.
- `contextId` prop is optional — all 28 existing `NavigationMore` callers that don't pass it must remain unmodified and fully functional.
- Use `useId()` from React 18 (already available) for stable, unique ID generation — not `Math.random()` or counter globals.
- Tailwind `sr-only` class is available (confirmed by existing `<span className="sr-only">Pinned</span>` in `ChatListItem.tsx`).
- For folders: use slug pattern `folder.toLowerCase().replace(/[^a-z0-9]+/g, '-')`, consistent with the existing `aria-owns` slugs in `FolderList.tsx`.
- For chats: use `chat.id` (stable UUID) as the basis for DOM IDs.
- Do NOT change the `role="menu"` → `role="listbox"` or any existing ARIA roles.

---

### Task 1: Update NavigationMore — add aria-controls, aria-labelledby, contextId prop

**Files:**
- Modify: `src/components/NavigationMore/NavigationMore.tsx`
- Test: `src/components/NavigationMore/__tests__/NavigationMore.test.tsx`

**Interfaces:**
- Produces: `NavigationMoreProps.contextId?: string` — callers pass the DOM `id` of the element whose text names this button's context (e.g., the chat name button id or folder name paragraph id)

- [x] **Step 1: Write the failing tests**

Open `src/components/NavigationMore/__tests__/NavigationMore.test.tsx` and add these tests at the bottom (before the closing brace of the describe block, or in a new describe block):

```tsx
describe('NavigationMore accessibility attributes', () => {
  it('trigger button has no aria-controls when closed and points to menu when open', () => {
    render(<NavigationMore items={makeItems()} />)
    const trigger = screen.getByRole('button', { name: 'More options' })
    expect(trigger).not.toHaveAttribute('aria-controls')

    fireEvent.click(trigger)
    const menuId = trigger.getAttribute('aria-controls')
    expect(menuId).toBeTruthy()
    expect(document.getElementById(menuId!)).toBeInTheDocument()
    expect(document.getElementById(menuId!)).toHaveAttribute('role', 'menu')
  })

  it('without contextId keeps aria-label and no aria-labelledby', () => {
    render(<NavigationMore items={makeItems()} />)
    const trigger = screen.getByRole('button', { name: 'More options' })
    expect(trigger).toHaveAttribute('aria-label', 'More options')
    expect(trigger).not.toHaveAttribute('aria-labelledby')
  })

  it('with contextId adds compound aria-labelledby and sr-only More Options span', () => {
    const { container } = render(
      <div>
        <button id="chat-name-abc">My Chat</button>
        <NavigationMore
          contextId="chat-name-abc"
          items={makeItems()}
        />
      </div>
    )
    const trigger = container.querySelector('button[aria-haspopup]') as HTMLElement
    expect(trigger).toHaveAttribute('id')
    const buttonId = trigger.getAttribute('id')!
    expect(trigger).toHaveAttribute('aria-labelledby', `${buttonId} chat-name-abc`)
    expect(trigger).not.toHaveAttribute('aria-label')
    const srOnly = trigger.querySelector('.sr-only')
    expect(srOnly).toBeInTheDocument()
    expect(srOnly).toHaveTextContent('More options')
  })

  it('with contextId aria-controls links trigger to menu only when open', () => {
    const { container } = render(
      <div>
        <button id="chat-name-xyz">Chat</button>
        <NavigationMore
          renderInRoot
          contextId="chat-name-xyz"
          items={makeItems()}
        />
      </div>
    )
    const trigger = container.querySelector('button[aria-haspopup]') as HTMLElement
    expect(trigger).not.toHaveAttribute('aria-controls')

    fireEvent.click(trigger)
    const menuId = trigger.getAttribute('aria-controls')!
    expect(document.getElementById(menuId)).toHaveAttribute('role', 'menu')
  })
})
```

- [x] **Step 2: Run the failing tests**

```bash
cd "/Users/Dmytro_Pishchanetskyi/Documents/repos/AI Workspace/codemie-dev/codemie-ui"
npx vitest run src/components/NavigationMore/__tests__/NavigationMore.test.tsx --reporter=verbose 2>&1 | tail -40
```

Expected: 4 new tests FAIL — `aria-controls` not on button, `aria-labelledby` not on button, sr-only span not found.

- [x] **Step 3: Implement the changes in NavigationMore.tsx**

Replace the entire file content with:

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

import {
  useFloating,
  offset,
  shift,
  autoPlacement,
  useDismiss,
  useInteractions,
  useClick,
  FloatingPortal,
  Alignment,
} from '@floating-ui/react'
import React, { memo, MouseEventHandler, useId, useState } from 'react'

import NavigationMoreSvg from '@/assets/icons/navigation-more.svg?react'
import { cn } from '@/utils/utils'

export interface NavigationItem {
  title: string
  tooltip?: string
  onClick: MouseEventHandler<HTMLButtonElement>
  icon?: React.ReactNode
  disabled?: boolean
  hidden?: boolean
}

interface NavigationMoreProps {
  children?: React.ReactNode
  items?: Array<NavigationItem>
  hideOnClickInside?: boolean
  customIcon?: React.ReactNode
  childrenFirst?: boolean
  renderInRoot?: boolean
  alignment?: Alignment | null
  autoAlignment?: boolean
  onClick?: MouseEventHandler<Element>
  className?: string
  buttonClassName?: string
  'data-tooltip-content'?: string
  contextId?: string
}

const NavigationMore: React.FC<NavigationMoreProps> = ({
  children,
  childrenFirst,
  items,
  hideOnClickInside = false,
  customIcon = null,
  renderInRoot,
  alignment = 'end',
  autoAlignment,
  className,
  buttonClassName,
  onClick,
  'data-tooltip-content': dataTooltipContent,
  contextId,
}) => {
  const [show, setShow] = useState(false)
  const id = useId()
  const menuId = `nav-more-menu-${id}`
  const buttonId = `nav-more-btn-${id}`

  const { refs, floatingStyles, context } = useFloating({
    open: show,
    middleware: [offset(4), shift(), autoPlacement({ alignment, autoAlignment })],
    onOpenChange: setShow,
  })

  const dismiss = useDismiss(context)
  const click = useClick(context)

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    {
      reference: { onClick },
    },
  ])

  const handleClickInside = () => {
    if (!hideOnClickInside) return
    setShow(false)
  }

  const visibleItems = items?.filter((item) => !item.hidden)

  const menu = (
    <div
      ref={refs.setFloating}
      className="z-50"
      style={floatingStyles}
      onClick={handleClickInside}
      {...getFloatingProps()}
    >
      <div
        id={menuId}
        className="flex flex-col bg-surface-base-secondary rounded-lg border border-border-structural z-50 w-44 py-2 px-2"
        role="menu"
        aria-label="Options"
      >
        {childrenFirst && children}
        {visibleItems && visibleItems.length > 0 && (
          <ul role="none">
            {visibleItems.map((item) => (
              <li key={item.title} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={cn(
                    'flex items-center gap-4 px-1 py-2 text-xs w-full font-medium rounded-md outline-none text-text-primary leading-4 tracking-tight disabled:opacity-50 disabled:cursor-not-allowed',
                    !item.disabled &&
                      'hover:bg-surface-specific-dropdown-hover hover:text-text-accent',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500'
                  )}
                  onClick={(e) => {
                    if (!item.disabled) item.onClick(e)
                    if (hideOnClickInside) setShow(false)
                  }}
                  disabled={item.disabled}
                  aria-label={item.title}
                  data-tooltip-id="react-tooltip"
                  data-tooltip-content={item.tooltip}
                >
                  <span
                    className="w-[18px] h-[18px] flex justify-center items-center"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span className="text-left grow">{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!childrenFirst && children}
      </div>
    </div>
  )

  return (
    <div className={cn('flex items-center relative', className)}>
      <button
        type="button"
        id={buttonId}
        ref={refs.setReference}
        className={cn(
          'm-1 p-1 rounded-md border border-transparent hover:bg-surface-specific-dropdown-hover transition',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
          buttonClassName
        )}
        {...getReferenceProps()}
        aria-label={contextId ? undefined : dataTooltipContent || 'More options'}
        aria-labelledby={contextId ? `${buttonId} ${contextId}` : undefined}
        aria-haspopup="menu"
        aria-expanded={show}
        aria-controls={show ? menuId : undefined}
        data-tooltip-id="react-tooltip"
        data-tooltip-content={dataTooltipContent}
      >
        {contextId && <span className="sr-only">More options</span>}
        {customIcon || <NavigationMoreSvg />}
      </button>

      {show && (renderInRoot ? <FloatingPortal>{menu}</FloatingPortal> : menu)}
    </div>
  )
}

export default memo(NavigationMore)
```

- [x] **Step 4: Run tests — verify new tests pass and existing tests still pass**

```bash
cd "/Users/Dmytro_Pishchanetskyi/Documents/repos/AI Workspace/codemie-dev/codemie-ui"
npx vitest run src/components/NavigationMore/__tests__/NavigationMore.test.tsx --reporter=verbose 2>&1 | tail -40
```

Expected: ALL tests PASS, including the 4 new ones and all pre-existing ones.

- [x] **Step 5: Commit**

```bash
cd "/Users/Dmytro_Pishchanetskyi/Documents/repos/AI Workspace/codemie-dev/codemie-ui"
git add src/components/NavigationMore/NavigationMore.tsx src/components/NavigationMore/__tests__/NavigationMore.test.tsx
git commit -m "feat(a11y): add aria-controls, aria-labelledby support to NavigationMore

- Generate stable menuId/buttonId via useId()
- Add id to trigger button and menu container
- Add optional contextId prop for compound aria-labelledby
- Render sr-only 'More Options' span when contextId is provided
- Existing callers without contextId fall back to aria-label unchanged

EPMCDME-8420"
```

Test-first: yes — 4 new tests in NavigationMore.test.tsx covering aria-controls linkage, aria-labelledby compound value, and sr-only span presence.

---

### Task 2: Wire accessible names in ChatListItem

**Files:**
- Modify: `src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx`

**Interfaces:**
- Consumes: `NavigationMoreProps.contextId?: string` from Task 1
- Produces: chat name button with `id="chat-name-{chat.id}"`, NavigationMore receives `contextId` pointing to that button

- [x] **Step 1: Write the failing test**

There are no existing tests for `ChatListItem`. Create a minimal test file to verify the accessibility wiring:

Create `src/pages/chat/components/ChatSidebar/ChatList/__tests__/ChatListItem.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ChatListItem, { ChatListItemActions } from '../ChatListItem'

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ push: vi.fn() }),
}))

vi.mock('valtio', () => ({
  useSnapshot: () => ({ renameChat: vi.fn(), pinChat: vi.fn() }),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: { renameChat: vi.fn(), pinChat: vi.fn() },
}))

const actions: ChatListItemActions = {
  moveChat: vi.fn(),
  deleteChat: vi.fn(),
}

const chat = {
  id: 'test-chat-id-123',
  name: 'My Test Chat',
  folder: '',
  pinned: false,
  date: '',
  assistantIds: [],
  initialAssistantId: null,
  isGroup: false,
  isWorkflow: false,
}

describe('ChatListItem accessibility', () => {
  it('chat name button has id derived from chat.id', () => {
    render(<ChatListItem chat={chat} actions={actions} />)
    const chatNameBtn = screen.getByRole('button', { name: 'My Test Chat' })
    expect(chatNameBtn).toHaveAttribute('id', `chat-name-${chat.id}`)
  })

  it('More Options button has aria-labelledby referencing both button id and chat name id', () => {
    const { container } = render(<ChatListItem chat={chat} actions={actions} />)
    const moreBtn = container.querySelector('button[aria-haspopup]') as HTMLElement
    const chatNameId = `chat-name-${chat.id}`
    expect(moreBtn.getAttribute('aria-labelledby')).toBe(`${moreBtn.id} ${chatNameId}`)
  })
})
```

- [x] **Step 2: Run the failing test**

```bash
cd "/Users/Dmytro_Pishchanetskyi/Documents/repos/AI Workspace/codemie-dev/codemie-ui"
npx vitest run "src/pages/chat/components/ChatSidebar/ChatList/__tests__/ChatListItem.test.tsx" --reporter=verbose 2>&1 | tail -30
```

Expected: Both tests FAIL — chat name button has no `id`, NavigationMore has no `aria-labelledby`.

- [x] **Step 3: Add id to chat name button and contextId to NavigationMore**

In `src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx`, make two changes:

**Change 1** — add `id` to the chat name button (line ~103):

```tsx
            <button
              type="button"
              id={`chat-name-${chat.id}`}
              onClick={select}
              className="text-inherit hover:no-underline truncate pl-2 grow text-sm h-full text-left"
            >
```

**Change 2** — pass `contextId` to NavigationMore (line ~119):

```tsx
            <NavigationMore
              renderInRoot
              hideOnClickInside
              contextId={`chat-name-${chat.id}`}
              items={[
```

- [x] **Step 4: Run the test — verify it passes**

```bash
cd "/Users/Dmytro_Pishchanetskyi/Documents/repos/AI Workspace/codemie-dev/codemie-ui"
npx vitest run "src/pages/chat/components/ChatSidebar/ChatList/__tests__/ChatListItem.test.tsx" --reporter=verbose 2>&1 | tail -20
```

Expected: Both tests PASS.

- [x] **Step 5: Commit**

```bash
cd "/Users/Dmytro_Pishchanetskyi/Documents/repos/AI Workspace/codemie-dev/codemie-ui"
git add src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx \
        "src/pages/chat/components/ChatSidebar/ChatList/__tests__/ChatListItem.test.tsx"
git commit -m "feat(a11y): add accessible name wiring to chat list item

- Add id='chat-name-{chat.id}' to the chat name button
- Pass contextId to NavigationMore for compound aria-labelledby
- Screen reader now announces 'More Options {chat name}, button, collapsed/expanded'

EPMCDME-8420"
```

Test-first: yes — 2 new tests in ChatListItem.test.tsx covering `id` on chat name button and `aria-labelledby` on More Options trigger.

---

### Task 3: Wire accessible names in FolderList

**Files:**
- Modify: `src/pages/chat/components/ChatSidebar/FolderList/FolderList.tsx`

**Interfaces:**
- Consumes: `NavigationMoreProps.contextId?: string` from Task 1
- Produces: folder name `<p>` with `id="folder-name-{slug}"`, NavigationMore receives matching `contextId`

- [x] **Step 1: Write the failing test**

There are no existing tests for `FolderList`. Create a minimal test file:

Create `src/pages/chat/components/ChatSidebar/FolderList/__tests__/FolderList.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FolderList from '../FolderList'
import { ChatListItemActions } from '../../ChatList/ChatListItem'

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ push: vi.fn() }),
}))

vi.mock('valtio', () => ({
  useSnapshot: () => ({ chats: [] }),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: { startNewChat: vi.fn(), chats: [] },
}))

const chatActions: ChatListItemActions = {
  moveChat: vi.fn(),
  deleteChat: vi.fn(),
}

describe('FolderList accessibility', () => {
  it('folder name paragraph has id derived from index and folder slug', () => {
    const { container } = render(
      <FolderList
        folders={['My Folder']}
        activeFolderIndex={null}
        chatActions={chatActions}
        foldersToChatsMap={{}}
        setActiveFolder={vi.fn()}
      />
    )
    const folderNameP = container.querySelector('p[id]')
    expect(folderNameP).toHaveAttribute('id', 'folder-name-0-my-folder')
  })

  it('More Options button has aria-labelledby referencing the folder name id', () => {
    const { container } = render(
      <FolderList
        folders={['My Folder']}
        activeFolderIndex={null}
        chatActions={chatActions}
        foldersToChatsMap={{}}
        setActiveFolder={vi.fn()}
      />
    )
    const moreBtn = container.querySelector('button[aria-haspopup]') as HTMLElement
    expect(moreBtn.getAttribute('aria-labelledby')).toBe(`${moreBtn.id} folder-name-0-my-folder`)
  })
})
```

- [x] **Step 2: Run the failing test**

```bash
cd "/Users/Dmytro_Pishchanetskyi/Documents/repos/AI Workspace/codemie-dev/codemie-ui"
npx vitest run "src/pages/chat/components/ChatSidebar/FolderList/__tests__/FolderList.test.tsx" --reporter=verbose 2>&1 | tail -30
```

Expected: Both tests FAIL — folder name `<p>` has no `id`, NavigationMore has no `aria-labelledby`.

- [x] **Step 3: Add id to folder name paragraph and contextId to NavigationMore**

In `src/pages/chat/components/ChatSidebar/FolderList/FolderList.tsx`, inside the `folders.map((folder, folderIndex) => { ... })` callback, compute a composite key from index + slug and use it throughout:

> **CR-003 deviation**: the original plan used slug-only IDs (e.g. `folder-name-my-folder`). The actual implementation uses a composite format `${folderIndex}-${slug}` (e.g. `folder-name-0-my-folder`) to guarantee uniqueness even when two folder names produce the same slug, while keeping human-readable output in devtools.

```tsx
        {folders.map((folder, folderIndex) => {
          const isOverMaxLength = folder.length > MAX_CHAT_NAME_LENGTH
          const folderKey = `${folderIndex}-${folder.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

          return (
            <AccordionTab
              key={folder}
              pt={{
                headerAction: (opts) => ({
                  href: null,
                  tabIndex: 0,
                  'aria-label': folder,
                  'data-folder': folder,
                  'data-folder-open': opts?.context.selected,
                  role: 'treeitem',
                  'aria-expanded': opts?.context.selected ?? false,
                  'aria-owns': `chat-tree-folder-group-${folderKey}`,
                }),
              }}
              header={() => (
                <div className="flex items-center justify-between my-1 ml-2 text-sm">
                  <div className="flex items-center whitespace-nowrap overflow-hidden text-ellipsis h-12">
                    <FolderIcon className="mr-2 h-8" />
                    <p
                      id={`folder-name-${folderKey}`}
                      data-pr-tooltip={isOverMaxLength ? folder : ''}
                      className="font-semibold whitespace-nowrap h-full flex items-center overflow-hidden text-ellipsis chat-sidebar-folder"
                    >
                      {folder.slice(0, MAX_CHAT_NAME_LENGTH) + (isOverMaxLength ? '...' : '')}
                    </p>
                  </div>

                  <div className="flex items-center">
                    <NavigationMore
                      renderInRoot
                      autoAlignment
                      hideOnClickInside
                      contextId={`folder-name-${folderKey}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                      }}
                      items={getMenuItems(folder)}
                    />
                  </div>
                </div>
              )}
            >
              <div className="flex flex-col border-l ml-4 pl-4 border-border-secondary">
                <ChatList
                  chats={foldersToChatsMap[folder] ?? []}
                  chatActions={chatActions}
                  currentChatId={currentChatId}
                  id={`chat-tree-folder-group-${folderKey}`}
                />
              </div>
            </AccordionTab>
          )
        })}
```

- [x] **Step 4: Run the test — verify it passes**

```bash
cd "/Users/Dmytro_Pishchanetskyi/Documents/repos/AI Workspace/codemie-dev/codemie-ui"
npx vitest run "src/pages/chat/components/ChatSidebar/FolderList/__tests__/FolderList.test.tsx" --reporter=verbose 2>&1 | tail -20
```

Expected: Both tests PASS.

- [x] **Step 5: Run full test suite to confirm no regressions**

```bash
cd "/Users/Dmytro_Pishchanetskyi/Documents/repos/AI Workspace/codemie-dev/codemie-ui"
npx vitest run --reporter=verbose 2>&1 | tail -40
```

Expected: All tests PASS.

- [x] **Step 6: Commit**

```bash
cd "/Users/Dmytro_Pishchanetskyi/Documents/repos/AI Workspace/codemie-dev/codemie-ui"
git add src/pages/chat/components/ChatSidebar/FolderList/FolderList.tsx \
        "src/pages/chat/components/ChatSidebar/FolderList/__tests__/FolderList.test.tsx"
git commit -m "feat(a11y): add accessible name wiring to folder list item

- Hoist folderSlug variable to reuse across aria-owns and new id/contextId
- Add id='folder-name-{slug}' to folder name <p>
- Pass contextId to NavigationMore for compound aria-labelledby
- Screen reader now announces 'More Options {folder name}, button, collapsed/expanded'

EPMCDME-8420"
```

Test-first: yes — 2 new tests in FolderList.test.tsx covering `id` on folder name `<p>` and `aria-labelledby` on More Options trigger.
