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

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import { cn } from '@/utils/utils'

interface GuardrailAssignmentPanelAccordionProps {
  isOpen: boolean
  onToggle: (isOpen: boolean) => void
  children: ReactNode
}

const GuardrailAssignmentPanelAccordion: FC<GuardrailAssignmentPanelAccordionProps> = ({
  isOpen,
  onToggle,
  children,
}) => {
  return (
    <Accordion
      expandIcon={() => null}
      collapseIcon={() => null}
      activeIndex={isOpen ? 0 : null}
      onTabChange={() => onToggle(!isOpen)}
      pt={{
        root: {
          className:
            'border rounded-lg border-border-primary bg-surface-base-secondary overflow-hidden mt-px',
        },
      }}
    >
      <AccordionTab
        pt={{ headerAction: { className: 'hover:no-underline hover:opacity-85 transition-all' } }}
        headerTemplate={
          <div className="w-full flex justify-between items-center py-4 px-6 gap-3">
            <div>
              <h4 className="font-semibold">Guardrails</h4>
              <p className="text-xs text-text-quaternary">
                Manage guardrail settings to control operational behavior
              </p>
            </div>

            <ChevronDownSvg className={cn('shrink-0', isOpen && 'rotate-180')} />
          </div>
        }
      >
        <div className="flex flex-col border-t border-border-primary p-6 bg-surface-base-primary">
          {children}
        </div>
      </AccordionTab>
    </Accordion>
  )
}

export default GuardrailAssignmentPanelAccordion
