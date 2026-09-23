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
import React, { ReactNode, useState } from 'react'

import ChevronRightIcon from '@/assets/icons/chevron-right.svg?react'
import { cn } from '@/utils/utils'

export interface ChatsSidebarSectionProps {
  title: string
  children?: ReactNode
  headerContent?: ReactNode
}

const ChatsSidebarSection: React.FC<ChatsSidebarSectionProps> = ({
  title,
  children,
  headerContent,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(0)

  return (
    <Accordion
      expandIcon={() => null}
      collapseIcon={() => null}
      activeIndex={activeIndex}
      onTabChange={(e) => setActiveIndex(e.index as number | null)}
      pt={{ root: { className: 'shrink-0' } }}
    >
      <AccordionTab
        pt={{
          headerAction: { href: null, className: 'hover:no-underline' },
        }}
        header={({ tabIndex }) => (
          <div className="flex min-w-0 grow items-center justify-between gap-2 pr-1.5">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-2 py-4 text-xs font-medium uppercase text-text-heading transition hover:text-text-accent-hover">
              <ChevronRightIcon
                className={cn('shrink-0 transition', activeIndex === tabIndex && 'rotate-90')}
              />
              <span className="truncate">{title}</span>
            </div>
            {headerContent && <div className="shrink-0">{headerContent}</div>}
          </div>
        )}
      >
        {children}
      </AccordionTab>
    </Accordion>
  )
}

export default ChatsSidebarSection
