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

import { Accordion as PrimeAccordion, AccordionTab } from 'primereact/accordion'
import { ReactNode, useState } from 'react'

import AIFieldSvg from '@/assets/icons/ai-field.svg?react'
import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import { cn } from '@/utils/utils'

interface AccordionProps {
  title: string | ReactNode
  description?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
  isAIGenerated?: boolean
}

const Accordion = ({
  title,
  description,
  children,
  defaultOpen = true,
  className,
  isAIGenerated = false,
}: AccordionProps) => {
  const [activeTabIndex, setActiveTabIndex] = useState<number | number[] | null>(
    defaultOpen ? 0 : null
  )

  return (
    <PrimeAccordion
      expandIcon={() => null}
      collapseIcon={() => null}
      activeIndex={activeTabIndex}
      onTabChange={(e) => setActiveTabIndex(e.index)}
      className={className}
      pt={{
        root: () => 'border rounded-lg border-border-primary bg-surface-base-chat overflow-hidden',
      }}
    >
      <AccordionTab
        pt={{
          headerAction: () => 'hover:no-underline',
          content: () => '!p-0 !pt-4',
        }}
        header={(props) => (
          <div className="flex items-center justify-between gap-3 p-4 bg-surface-base-float group transition hover:opacity-85">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-text-primary">{title}</h1>
                {isAIGenerated && <AIFieldSvg className="w-4 h-4" />}
              </div>
              {description &&
                (typeof description === 'string' ? (
                  <p className="text-sm text-text-quaternary">{description}</p>
                ) : (
                  description
                ))}
            </div>
            <ChevronDownSvg
              className={cn(
                'text-text-quaternary transition group-hover:opacity-85 flex-shrink-0',
                props.tabIndex === activeTabIndex && 'rotate-180'
              )}
            />
          </div>
        )}
      >
        {children}
      </AccordionTab>
    </PrimeAccordion>
  )
}

export default Accordion
