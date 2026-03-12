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
}

const ChatsSidebarSection: React.FC<ChatsSidebarSectionProps> = ({ title, children }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(0)

  return (
    <Accordion
      expandIcon={() => null}
      collapseIcon={() => null}
      activeIndex={activeIndex}
      onTabChange={(e) => setActiveIndex(e.index as number | null)}
    >
      <AccordionTab
        pt={{
          headerAction: { href: null, className: 'hover:no-underline' },
        }}
        header={({ tabIndex }) => (
          <div className="flex items-center gap-2 font-bold text-text-heading px-2 text-xs uppercase py-3 hover:text-text-accent-hover transition">
            <ChevronRightIcon
              className={cn('transition', activeIndex === tabIndex && 'rotate-90')}
            />
            {title}
          </div>
        )}
      >
        {children}
      </AccordionTab>
    </Accordion>
  )
}

export default ChatsSidebarSection
