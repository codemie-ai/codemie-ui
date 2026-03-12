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

import ChevronDownIcon from '@/assets/icons/chevron-down.svg?react'
import ChevronRightIcon from '@/assets/icons/chevron-right.svg?react'

interface FilterAccordionItemProps {
  label: string
  children: ReactNode
  defaultExpanded?: boolean
}

const FilterAccordionItem: FC<FilterAccordionItemProps> = ({
  label,
  children,
  defaultExpanded = true,
}) => {
  return (
    <Accordion
      multiple
      collapseIcon={
        <ChevronDownIcon className="flex basis-[13px] text-text-heading group-hover:text-text-accent-hover transition-colors" />
      }
      expandIcon={
        <ChevronRightIcon className="flex basis-[13px] text-text-heading group-hover:text-text-accent-hover transition-colors" />
      }
      activeIndex={defaultExpanded ? [0] : []}
    >
      <AccordionTab
        unstyled
        headerClassName="pb-4"
        pt={{ header: { className: 'group' } }}
        className="[&>.p-accordion-header-link]:hover:no-underline tracking-wide"
        header={
          <span className="pl-[8px] text-sm-1 leading-normal font-semibold text-text-heading group-hover:text-text-accent-hover transition-colors">
            {label.toUpperCase()}
          </span>
        }
      >
        <div className="mb-4">{children}</div>
      </AccordionTab>
    </Accordion>
  )
}

export default FilterAccordionItem
