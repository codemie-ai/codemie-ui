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
import { FC, ReactNode } from 'react'

import ChevronRightIcon from '@/assets/icons/chevron-right.svg?react'
import { cn } from '@/utils/utils'

const accordionPt = {
  root: { className: 'flex flex-col min-h-10' },
}

const tabPt = {
  headerAction: { className: 'hover:no-underline', href: null },
  root: { className: 'flex flex-col overflow-hidden' },
  toggleableContent: { className: 'min-h-0 overflow-hidden flex flex-col' },
  content: { className: 'flex flex-col min-h-0' },
}

interface ChatSidebarAccordionProps {
  isExpanded?: boolean
  title: string
  children: ReactNode
  headerContentTemplate?: ReactNode
  onToggle: () => void
}

const ChatSidebarAccordion: FC<ChatSidebarAccordionProps> = ({
  isExpanded,
  title,
  children,
  headerContentTemplate,
  onToggle,
}) => {
  return (
    <Accordion
      activeIndex={isExpanded === true ? 0 : null}
      onTabChange={() => onToggle()}
      expandIcon={() => null}
      collapseIcon={() => null}
      pt={accordionPt}
    >
      <AccordionTab
        pt={tabPt}
        header={() => (
          <div
            className={cn(
              'flex items-center gap-2 text-text-heading px-2 justify-between text-xs uppercase py-3 hover:text-text-accent-hover transition font-medium'
            )}
          >
            <div className="flex items-center gap-2">
              <ChevronRightIcon className={cn('transition', isExpanded === true && 'rotate-90')} />
              {title}
            </div>
            {headerContentTemplate}
          </div>
        )}
      >
        <div className="flex flex-col overflow-y-auto min-h-0">{children}</div>
      </AccordionTab>
    </Accordion>
  )
}

export default ChatSidebarAccordion
