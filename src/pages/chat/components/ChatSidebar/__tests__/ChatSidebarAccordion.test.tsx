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

import ChatSidebarAccordion from '../ChatSidebarLists/ChatSidebarAccordion'

vi.mock('primereact/accordion', () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionTab: ({ children, pt, header }: any) => {
    const haPt =
      typeof pt?.headerAction === 'function' ? pt.headerAction({}) : pt?.headerAction ?? {}
    return (
      <div>
        <div
          role={haPt.role}
          aria-expanded={haPt['aria-expanded']}
          aria-owns={haPt['aria-owns']}
          data-testid="accordion-header"
        >
          {header?.()}
        </div>
        {children}
      </div>
    )
  },
}))

vi.mock('@/assets/icons/chevron-right.svg?react', () => ({
  default: () => <span data-testid="chevron" />,
}))

describe('ChatSidebarAccordion', () => {
  it('renders accordion header with role="treeitem"', () => {
    render(
      <ChatSidebarAccordion title="Chats" isExpanded={false} onToggle={() => {}}>
        <div>content</div>
      </ChatSidebarAccordion>
    )
    expect(screen.getByRole('treeitem')).toBeInTheDocument()
  })

  it('sets aria-expanded="false" when accordion is collapsed', () => {
    render(
      <ChatSidebarAccordion title="Chats" isExpanded={false} onToggle={() => {}}>
        <div>content</div>
      </ChatSidebarAccordion>
    )
    expect(screen.getByRole('treeitem')).toHaveAttribute('aria-expanded', 'false')
  })

  it('sets aria-expanded="true" when accordion is expanded', () => {
    render(
      <ChatSidebarAccordion title="Chats" isExpanded={true} onToggle={() => {}}>
        <div>content</div>
      </ChatSidebarAccordion>
    )
    expect(screen.getByRole('treeitem')).toHaveAttribute('aria-expanded', 'true')
  })

  it('sets aria-owns when groupId is provided', () => {
    render(
      <ChatSidebarAccordion
        title="Chats"
        isExpanded={false}
        onToggle={() => {}}
        groupId="chat-tree-group-chats"
      >
        <div>content</div>
      </ChatSidebarAccordion>
    )
    expect(screen.getByRole('treeitem')).toHaveAttribute('aria-owns', 'chat-tree-group-chats')
  })

  it('does not set aria-owns when groupId is not provided', () => {
    render(
      <ChatSidebarAccordion title="Chats" isExpanded={false} onToggle={() => {}}>
        <div>content</div>
      </ChatSidebarAccordion>
    )
    expect(screen.getByRole('treeitem')).not.toHaveAttribute('aria-owns')
  })
})
