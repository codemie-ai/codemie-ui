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
import { useState } from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import InfoBox from '@/components/form/InfoBox'
import { cn } from '@/utils/utils'

import FormNestedAccordion, { FormNestedAccordionProps } from './FormNestedAccordion'

interface FormAccordionProps<T> extends FormNestedAccordionProps<T> {
  title: string
  description?: string
  defaultOpen?: boolean
}

const FormAccordion = <T,>({
  title,
  description,
  defaultOpen = false,
  ...props
}: FormAccordionProps<T>) => {
  const [activeTabIndex, setActiveTabIndex] = useState<number | number[] | null>(
    defaultOpen ? 0 : null
  )

  return (
    <Accordion
      expandIcon={() => null}
      collapseIcon={() => null}
      activeIndex={activeTabIndex}
      onTabChange={(e) => setActiveTabIndex(e.index)}
      pt={{
        root: () => 'border rounded-lg border-border-primary bg-surface-base-chat',
      }}
    >
      <AccordionTab
        pt={{ headerAction: () => 'hover:no-underline' }}
        header={(props) => (
          <div className="flex flex-col gap-3 p-4 group transition hover:opacity-85">
            <div className="flex justify-between items-center">
              <h1 className="font-bold text-text-quaternary ">{title}</h1>
              <ChevronDownSvg
                className={cn(
                  'text-text-quaternary transition group-hover:opacity-85',
                  props.tabIndex === activeTabIndex && 'rotate-180'
                )}
              />
            </div>
            {description && <InfoBox>{description}</InfoBox>}
          </div>
        )}
      >
        <FormNestedAccordion {...props} />
      </AccordionTab>
    </Accordion>
  )
}

export default FormAccordion
