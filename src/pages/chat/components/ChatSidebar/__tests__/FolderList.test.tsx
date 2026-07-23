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
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { mockRouter } from '@/hooks/__mocks__/useVueRouter'

import FolderList from '../FolderList/FolderList'

vi.hoisted(() => vi.resetModules())

vi.mock('primereact/accordion', () => ({
  Accordion: ({ children, activeIndex }: any) => {
    const childrenWithContext = React.Children.map(children, (child: any, index: number) => {
      if (!React.isValidElement(child)) return child
      return React.cloneElement(child as React.ReactElement<any>, {
        _selected: activeIndex === index,
      })
    })
    return <div>{childrenWithContext}</div>
  },
  AccordionTab: ({ children, pt, header, _selected }: any) => {
    const haPt =
      typeof pt?.headerAction === 'function'
        ? pt.headerAction({ context: { selected: _selected ?? false } })
        : pt?.headerAction ?? {}
    return (
      <div>
        <div
          role={haPt.role}
          aria-expanded={haPt['aria-expanded']}
          aria-owns={haPt['aria-owns']}
          data-folder={haPt['data-folder']}
          data-testid="folder-header"
        >
          {header?.()}
        </div>
        {children}
      </div>
    )
  },
}))

vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => mockRouter }))

vi.mock('valtio', () => ({
  useSnapshot: vi.fn((store) => store),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: {
    chats: [],
    startNewChat: vi.fn(),
  },
}))

vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: () => <div data-testid="navigation-more" />,
}))

vi.mock('@/components/Tooltip', () => ({
  default: () => null,
}))

vi.mock('../FolderList/DeleteFolderPopup', () => ({
  default: () => null,
}))

vi.mock('../FolderList/FolderFormPopup', () => ({
  default: () => null,
}))

vi.mock('../ChatList/ChatList', () => ({
  default: () => <ul />,
}))

vi.mock('@/assets/icons/folder.svg?react', () => ({
  default: () => <span data-testid="folder-icon" />,
}))

vi.mock('@/assets/icons/delete.svg?react', () => ({
  default: () => <span data-testid="delete-icon" />,
}))

vi.mock('@/assets/icons/edit.svg?react', () => ({
  default: () => <span data-testid="edit-icon" />,
}))

vi.mock('@/assets/icons/plus.svg?react', () => ({
  default: () => <span data-testid="plus-icon" />,
}))

const mockChatActions = {
  moveChat: vi.fn(),
  deleteChat: vi.fn(),
}

const defaultProps = {
  folders: ['Work', 'Personal'],
  activeFolderIndex: null,
  chatActions: mockChatActions,
  currentChatId: undefined,
  foldersToChatsMap: { Work: [], Personal: [] },
  setActiveFolder: vi.fn(),
}

describe('FolderList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders folder headers with role="treeitem"', () => {
    render(<FolderList {...defaultProps} />)
    const treeitems = screen.getAllByRole('treeitem')
    expect(treeitems.length).toBeGreaterThanOrEqual(2)
  })

  it('sets aria-expanded="false" for all folders when none is active', () => {
    render(<FolderList {...defaultProps} activeFolderIndex={null} />)
    const headers = screen.getAllByTestId('folder-header')
    headers.forEach((header) => {
      expect(header).toHaveAttribute('aria-expanded', 'false')
    })
  })

  it('sets aria-expanded="true" for the active folder', () => {
    render(<FolderList {...defaultProps} activeFolderIndex={0} />)
    const headers = screen.getAllByTestId('folder-header')
    expect(headers[0]).toHaveAttribute('aria-expanded', 'true')
    expect(headers[1]).toHaveAttribute('aria-expanded', 'false')
  })

  it('sets aria-owns to the slugified folder group id on each header', () => {
    render(<FolderList {...defaultProps} />)
    const headers = screen.getAllByTestId('folder-header')
    expect(headers[0]).toHaveAttribute('aria-owns', 'chat-tree-folder-group-work')
    expect(headers[1]).toHaveAttribute('aria-owns', 'chat-tree-folder-group-personal')
  })
})
