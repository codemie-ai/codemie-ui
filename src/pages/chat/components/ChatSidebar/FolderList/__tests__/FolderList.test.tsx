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

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { ChatListItemActions } from '../../ChatList/ChatListItem'
import FolderList from '../FolderList'

// Real FolderList + real NavigationMore.
// Accordion is stubbed to always render content (closed tabs hide content via CSS which
// JSDOM does not apply, so the stub is the only reliable way to keep group elements in DOM).
// ChatList is stubbed to preserve the production id + role relationship.

vi.mock('primereact/accordion', () => ({
  Accordion: ({ children }: any) => <div>{children}</div>,
  AccordionTab: ({ children, pt, header }: any) => {
    const haPt =
      typeof pt?.headerAction === 'function'
        ? pt.headerAction({ context: { selected: false } })
        : pt?.headerAction ?? {}
    return (
      <div>
        <div aria-owns={haPt['aria-owns']} data-testid="folder-header">
          {header?.()}
        </div>
        {children}
      </div>
    )
  },
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ push: vi.fn() }),
}))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: () => ({ chats: [] }),
  }
})

vi.mock('@/store/chats', () => ({
  chatsStore: { startNewChat: vi.fn(), chats: [] },
}))

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({
  default: () => <span data-testid="nav-more-icon" />,
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: () => [false, true],
  useFavoritesEnabled: () => [false],
}))

// Preserve production ID so ARIA IDREF assertions resolve the group element (fieldset has implicit role="group").
vi.mock('../../ChatList/ChatList', () => ({
  default: ({ id }: { id?: string }) => <fieldset id={id} />,
}))

const chatActions: ChatListItemActions = {
  moveChat: vi.fn(),
  deleteChat: vi.fn(),
}

const defaultProps = {
  activeFolderIndex: null as number | null,
  chatActions,
  foldersToChatsMap: {} as Record<string, any>,
  setActiveFolder: vi.fn(),
}

describe('FolderList accessibility', () => {
  it('folder name paragraph has id derived from the encoded folder name', () => {
    const { container } = render(<FolderList {...defaultProps} folders={['My Folder']} />)
    const folderNameP = container.querySelector('p[id]')
    expect(folderNameP).toHaveAttribute('id', 'folder-name-My%20Folder')
  })

  it('More Options button has exact aria-labelledby with trigger-id first and context-id second', () => {
    const { container } = render(<FolderList {...defaultProps} folders={['My Folder']} />)
    const moreBtn = container.querySelector('button[aria-haspopup]') as HTMLElement
    expect(moreBtn.getAttribute('aria-labelledby')).toBe(`${moreBtn.id} folder-name-My%20Folder`)
  })

  describe('collision safety — A/B and A-B produce distinct deterministic IDs', () => {
    it('finds triggers by computed accessible name', () => {
      render(
        <FolderList
          {...defaultProps}
          folders={['A/B', 'A-B']}
          foldersToChatsMap={{ 'A/B': [], 'A-B': [] }}
        />
      )
      expect(screen.getByRole('button', { name: 'More options A/B' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'More options A-B' })).toBeInTheDocument()
    })

    it('contextual triggers have no aria-label', () => {
      render(
        <FolderList
          {...defaultProps}
          folders={['A/B', 'A-B']}
          foldersToChatsMap={{ 'A/B': [], 'A-B': [] }}
        />
      )
      expect(screen.getByRole('button', { name: 'More options A/B' })).not.toHaveAttribute(
        'aria-label'
      )
      expect(screen.getByRole('button', { name: 'More options A-B' })).not.toHaveAttribute(
        'aria-label'
      )
    })

    it('exact aria-labelledby value and token order for each trigger', () => {
      render(
        <FolderList
          {...defaultProps}
          folders={['A/B', 'A-B']}
          foldersToChatsMap={{ 'A/B': [], 'A-B': [] }}
        />
      )
      const slashTrigger = screen.getByRole('button', { name: 'More options A/B' })
      expect(slashTrigger).toHaveAttribute(
        'aria-labelledby',
        `${slashTrigger.id} folder-name-A%2FB`
      )
      const dashTrigger = screen.getByRole('button', { name: 'More options A-B' })
      expect(dashTrigger).toHaveAttribute('aria-labelledby', `${dashTrigger.id} folder-name-A-B`)
    })

    it('context targets exist in the DOM and contain the expected folder text', () => {
      render(
        <FolderList
          {...defaultProps}
          folders={['A/B', 'A-B']}
          foldersToChatsMap={{ 'A/B': [], 'A-B': [] }}
        />
      )
      const slashContext = document.getElementById('folder-name-A%2FB')
      expect(slashContext).toBeInTheDocument()
      expect(slashContext).toHaveTextContent('A/B')

      const dashContext = document.getElementById('folder-name-A-B')
      expect(dashContext).toBeInTheDocument()
      expect(dashContext).toHaveTextContent('A-B')
    })

    it('context IDs are unique — A/B and A-B do not share the same context target', () => {
      render(
        <FolderList
          {...defaultProps}
          folders={['A/B', 'A-B']}
          foldersToChatsMap={{ 'A/B': [], 'A-B': [] }}
        />
      )
      const slashTrigger = screen.getByRole('button', { name: 'More options A/B' })
      const dashTrigger = screen.getByRole('button', { name: 'More options A-B' })
      const [, slashCtxId] = slashTrigger.getAttribute('aria-labelledby')!.split(/\s+/)
      const [, dashCtxId] = dashTrigger.getAttribute('aria-labelledby')!.split(/\s+/)
      expect(slashCtxId).not.toBe(dashCtxId)
    })

    it('headers have exact aria-owns values', () => {
      render(
        <FolderList
          {...defaultProps}
          folders={['A/B', 'A-B']}
          foldersToChatsMap={{ 'A/B': [], 'A-B': [] }}
        />
      )
      const ownsValues = screen
        .getAllByTestId('folder-header')
        .map((el) => el.getAttribute('aria-owns'))
      expect(ownsValues).toContain('chat-tree-folder-group-A%2FB')
      expect(ownsValues).toContain('chat-tree-folder-group-A-B')
    })

    it('aria-owns group targets exist with role="group"', () => {
      render(
        <FolderList
          {...defaultProps}
          folders={['A/B', 'A-B']}
          foldersToChatsMap={{ 'A/B': [], 'A-B': [] }}
        />
      )
      const slashGroup = document.getElementById('chat-tree-folder-group-A%2FB')
      expect(slashGroup).toBeInTheDocument()
      expect(slashGroup).toHaveRole('group')

      const dashGroup = document.getElementById('chat-tree-folder-group-A-B')
      expect(dashGroup).toBeInTheDocument()
      expect(dashGroup).toHaveRole('group')
    })

    it('group IDs are unique — A/B and A-B do not share the same group element', () => {
      render(
        <FolderList
          {...defaultProps}
          folders={['A/B', 'A-B']}
          foldersToChatsMap={{ 'A/B': [], 'A-B': [] }}
        />
      )
      expect(document.getElementById('chat-tree-folder-group-A%2FB')).not.toBe(
        document.getElementById('chat-tree-folder-group-A-B')
      )
    })

    it('each folder references only its own context and group — no cross-referencing', () => {
      render(
        <FolderList
          {...defaultProps}
          folders={['A/B', 'A-B']}
          foldersToChatsMap={{ 'A/B': [], 'A-B': [] }}
        />
      )
      const slashTrigger = screen.getByRole('button', { name: 'More options A/B' })
      const [, slashCtxId] = slashTrigger.getAttribute('aria-labelledby')!.split(/\s+/)
      expect(document.getElementById(slashCtxId)).toHaveTextContent('A/B')
      expect(document.getElementById(slashCtxId)?.textContent).not.toContain('A-B')

      const dashTrigger = screen.getByRole('button', { name: 'More options A-B' })
      const [, dashCtxId] = dashTrigger.getAttribute('aria-labelledby')!.split(/\s+/)
      expect(document.getElementById(dashCtxId)).toHaveTextContent('A-B')
      expect(document.getElementById(dashCtxId)?.textContent).not.toContain('A/B')

      // Headers own their own groups — use getAttribute since querySelector struggles with %2F
      const headers = screen.getAllByTestId('folder-header')
      const slashOwns = headers.find(
        (h) => h.getAttribute('aria-owns') === 'chat-tree-folder-group-A%2FB'
      )
      const dashOwns = headers.find(
        (h) => h.getAttribute('aria-owns') === 'chat-tree-folder-group-A-B'
      )
      expect(slashOwns).not.toBe(dashOwns)
    })
  })

  describe('insertion and reorder stability — Work folder relationships survive position changes', () => {
    it('Work trigger retains folder-name-Work and exact aria-labelledby after insertion', () => {
      const { rerender } = render(
        <FolderList
          {...defaultProps}
          folders={['Work', 'Personal']}
          foldersToChatsMap={{ Work: [], Personal: [] }}
        />
      )

      const workTrigger = screen.getByRole('button', { name: 'More options Work' })
      expect(workTrigger).toHaveAttribute('aria-labelledby', `${workTrigger.id} folder-name-Work`)
      expect(document.getElementById('folder-name-Work')).toHaveTextContent('Work')
      expect(document.getElementById('chat-tree-folder-group-Work')).toHaveRole('group')

      rerender(
        <FolderList
          {...defaultProps}
          folders={['New', 'Work', 'Personal']}
          foldersToChatsMap={{ New: [], Work: [], Personal: [] }}
        />
      )

      const workTriggerAfter = screen.getByRole('button', { name: 'More options Work' })
      expect(workTriggerAfter).toHaveAttribute(
        'aria-labelledby',
        `${workTriggerAfter.id} folder-name-Work`
      )
      expect(document.getElementById('folder-name-Work')).toBeInTheDocument()
      expect(document.getElementById('folder-name-Work')).toHaveTextContent('Work')
      expect(document.getElementById('chat-tree-folder-group-Work')).toHaveRole('group')
    })

    it('Work trigger retains folder-name-Work and exact aria-labelledby after reorder', () => {
      const { rerender } = render(
        <FolderList
          {...defaultProps}
          folders={['Work', 'Personal']}
          foldersToChatsMap={{ Work: [], Personal: [] }}
        />
      )

      rerender(
        <FolderList
          {...defaultProps}
          folders={['Personal', 'Work']}
          foldersToChatsMap={{ Personal: [], Work: [] }}
        />
      )

      const workTrigger = screen.getByRole('button', { name: 'More options Work' })
      expect(workTrigger).toHaveAttribute('aria-labelledby', `${workTrigger.id} folder-name-Work`)
      expect(document.getElementById('folder-name-Work')).toBeInTheDocument()
      expect(document.getElementById('folder-name-Work')).toHaveTextContent('Work')
      expect(document.getElementById('chat-tree-folder-group-Work')).toHaveRole('group')
    })

    it('Work header aria-owns remains chat-tree-folder-group-Work across insertion and reorder', () => {
      const { rerender } = render(
        <FolderList
          {...defaultProps}
          folders={['Work', 'Personal']}
          foldersToChatsMap={{ Work: [], Personal: [] }}
        />
      )

      const checkWorkRelationships = () => {
        const headers = screen.getAllByTestId('folder-header')
        const workHeader = headers.find(
          (h) => h.getAttribute('aria-owns') === 'chat-tree-folder-group-Work'
        )
        expect(workHeader).toBeInTheDocument()
        expect(document.getElementById('chat-tree-folder-group-Work')).toHaveRole('group')
      }

      checkWorkRelationships()

      rerender(
        <FolderList
          {...defaultProps}
          folders={['New', 'Work', 'Personal']}
          foldersToChatsMap={{ New: [], Work: [], Personal: [] }}
        />
      )
      checkWorkRelationships()

      rerender(
        <FolderList
          {...defaultProps}
          folders={['Personal', 'Work']}
          foldersToChatsMap={{ Personal: [], Work: [] }}
        />
      )
      checkWorkRelationships()
    })
  })
})
