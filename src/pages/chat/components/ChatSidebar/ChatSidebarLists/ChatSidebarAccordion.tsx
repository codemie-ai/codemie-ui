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

import { Accordion, AccordionTab } from 'primereact/accordion'
import { CSSTransitionProps } from 'primereact/csstransition'
import { FC, ReactNode, useState } from 'react'

import ChevronRightIcon from '@/assets/icons/chevron-right.svg?react'
import { cn } from '@/utils/utils'

import { ChatListScrollElementContext } from '../ChatList/chatListVirtualization'

const accordionPt = {
  root: { className: 'flex flex-col min-h-10 shrink-0' },
}

const scrollableAccordionPt = {
  root: { className: 'flex flex-col min-h-12' },
}

const tabPt = {
  headerAction: { className: 'hover:no-underline', href: null },
  root: { className: 'flex flex-col overflow-hidden' },
  toggleableContent: { className: 'min-h-0 overflow-hidden flex flex-col' },
  content: { className: 'flex flex-col min-h-0' },
}

const scrollableTabPt = {
  headerAction: { className: 'hover:no-underline', href: null },
  root: { className: 'flex flex-col overflow-hidden flex-1 min-h-0' },
  toggleableContent: { className: 'flex-1 min-h-0 overflow-hidden flex flex-col' },
  content: { className: 'flex flex-col min-h-0 flex-1' },
}

interface ChatSidebarAccordionProps {
  className?: string
  isExpanded?: boolean
  isCollapsible?: boolean
  title: string
  count?: number
  children: ReactNode
  headerContentTemplate?: ReactNode
  onToggle?: () => void
  transitionOptions?: CSSTransitionProps
  groupId?: string
  scrollable?: boolean
  contentClassName?: string
}

const ChatSidebarAccordion: FC<ChatSidebarAccordionProps> = ({
  className,
  isExpanded,
  isCollapsible = true,
  title,
  count,
  children,
  headerContentTemplate,
  onToggle,
  transitionOptions,
  groupId,
  scrollable,
  contentClassName,
}) => {
  // State rather than a ref: lists inside mount before this div's ref is attached, so they need
  // a re-render once the scroll element exists.
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)

  const header = (
    <div
      className={cn(
        'flex min-w-0 items-center justify-between gap-2 px-2 py-4 text-xs font-medium uppercase text-text-heading',
        isCollapsible && 'transition hover:text-text-accent-hover'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isCollapsible && (
          <ChevronRightIcon
            className={cn('shrink-0 transition', isExpanded === true && 'rotate-90')}
          />
        )}
        <span className="truncate">{title}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {count !== undefined && (
          <span className="flex w-6 shrink-0 justify-center text-text-tertiary">{count}</span>
        )}
        {headerContentTemplate}
      </div>
    </div>
  )

  const content = (
    <div
      ref={setScrollElement}
      className={cn(
        // No browser scroll anchoring: the virtualized lists inside swap rows for spacers, which
        // Chrome misreads as content shifting and "corrects" by jumping the scroll position.
        'flex flex-col overflow-y-auto [overflow-anchor:none] min-h-0 pb-2',
        !isCollapsible && scrollable && 'flex-1',
        contentClassName
      )}
    >
      <ChatListScrollElementContext.Provider value={scrollElement}>
        {children}
      </ChatListScrollElementContext.Provider>
    </div>
  )

  if (!isCollapsible) {
    return (
      <section
        className={cn(
          scrollable ? 'flex min-h-12 flex-1 flex-col' : 'flex min-h-10 shrink-0 flex-col',
          className
        )}
      >
        {header}
        {content}
      </section>
    )
  }

  return (
    <Accordion
      className={className}
      activeIndex={isExpanded === true ? 0 : null}
      onTabChange={() => onToggle?.()}
      expandIcon={() => null}
      collapseIcon={() => null}
      pt={scrollable ? scrollableAccordionPt : accordionPt}
      transitionOptions={transitionOptions}
    >
      <AccordionTab
        pt={{
          ...(scrollable ? scrollableTabPt : tabPt),
          headerAction: {
            className: 'hover:no-underline',
            href: null,
            role: 'treeitem',
            tabIndex: 0,
            'aria-expanded': isExpanded === true,
            ...(groupId ? { 'aria-owns': groupId } : {}),
          },
        }}
        header={header}
      >
        {content}
      </AccordionTab>
    </Accordion>
  )
}

export default ChatSidebarAccordion
