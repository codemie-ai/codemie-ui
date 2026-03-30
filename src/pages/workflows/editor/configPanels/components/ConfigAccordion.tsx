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
import React, { useState } from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import { cn } from '@/utils/utils'

interface ConfigAccordionProps {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  className?: string
  headerActions?: React.ReactNode
}

const ConfigAccordion: React.FC<ConfigAccordionProps> = ({
  title,
  children,
  defaultExpanded = true,
  expanded,
  onExpandedChange,
  className,
  headerActions,
}) => {
  const [internalActiveIndex, setInternalActiveIndex] = useState<number | number[] | null>(
    defaultExpanded ? 0 : null
  )

  const isControlled = expanded !== undefined
  const isExpanded = expanded ? 0 : null
  const activeTabIndex = isControlled ? isExpanded : internalActiveIndex

  const handleTabChange = (e: { index: number | number[] | null }) => {
    if (!isControlled) {
      setInternalActiveIndex(e.index)
    }
    onExpandedChange?.(e.index === 0)
  }

  const renderHeader = (props) => {
    return (
      <div className="flex items-center justify-between gap-3 mb-4 w-full">
        <div className="flex items-center gap-3 group transition hover:opacity-85">
          <ChevronDownSvg
            className={cn(
              'text-text-quaternary transition group-hover:opacity-85',
              props.tabIndex === activeTabIndex ? 'rotate-0' : '-rotate-90'
            )}
          />
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wide">
            {title}
          </h3>
        </div>
        {headerActions}
      </div>
    )
  }

  return (
    <Accordion
      expandIcon={() => null}
      collapseIcon={() => null}
      activeIndex={activeTabIndex}
      onTabChange={handleTabChange}
      className={className}
      pt={{
        root: () => '',
      }}
    >
      <AccordionTab
        pt={{
          headerAction: () => 'hover:no-underline',
          content: () => '!p-0',
        }}
        header={(props) => renderHeader(props)}
      >
        {children}
      </AccordionTab>
    </Accordion>
  )
}

export default ConfigAccordion
