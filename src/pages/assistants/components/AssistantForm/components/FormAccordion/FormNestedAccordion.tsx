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
import { ReactNode, useState } from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import { cn } from '@/utils/utils'

export interface FormNestedAccordionProps<T> {
  items: T[]
  itemHeader: (item: T) => ReactNode
  itemContent: (item: T) => ReactNode
  defaultOpenIndexes?: number[]
}

const FormNestedAccordion = <T,>({
  items,
  itemHeader,
  itemContent,
  defaultOpenIndexes = [],
}: FormNestedAccordionProps<T>) => {
  const [activeTabIndexes, setActiveTabIndexes] = useState<number[]>(defaultOpenIndexes)

  return (
    <Accordion
      multiple
      expandIcon={() => null}
      collapseIcon={() => null}
      activeIndex={activeTabIndexes}
      onTabChange={(e) => setActiveTabIndexes(Array.isArray(e.index) ? e.index : [])}
      className="mx-4 mb-4"
    >
      {items.map((item, i) => (
        <AccordionTab
          key={i}
          pt={{
            root: (options) => ({
              className: cn(
                'border rounded-lg border-border-primary mb-3 group/item overflow-hidden transition-colors',
                options?.context.selected && 'border-border-primary-active'
              ),
            }),
            headerAction: () => 'hover:no-underline',
          }}
          header={
            <div className="flex justify-between items-center group/header gap-3 px-4 py-3">
              {itemHeader(item)}
              <ChevronDownSvg
                className={cn(
                  'text-text-quaternary transition group-hover/header:opacity-85',
                  activeTabIndexes.includes(i) && 'rotate-180'
                )}
              />
            </div>
          }
        >
          <div className="border-t border-border-specific-panel-outline flex flex-col">
            {itemContent(item)}
          </div>
        </AccordionTab>
      ))}
    </Accordion>
  )
}

export default FormNestedAccordion
