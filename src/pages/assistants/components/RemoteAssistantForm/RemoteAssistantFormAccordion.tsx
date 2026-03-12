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
import { FC, useState } from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import DetailsProperty from '@/components/details/DetailsProperty'
import { AgentCard } from '@/types/entity/assistant'
import { cn } from '@/utils/utils'

import DetailsTags from '../RemoteAssistantDetails/components/DetailsTags'

interface RemoteAssistantFormAccordionProps {
  isChatConfig?: boolean
  assistant: AgentCard
}

const RemoteAssistantFormAccordion: FC<RemoteAssistantFormAccordionProps> = ({
  isChatConfig,
  assistant,
}) => {
  const [activeIndexes, setActiveIndexes] = useState<number | number[]>([])

  if (!assistant.skills?.length) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="block text-xs font-medium text-text-quaternary">Skills:</p>
      <Accordion
        multiple
        expandIcon={() => null}
        collapseIcon={() => null}
        activeIndex={activeIndexes}
        onTabChange={({ index }) => setActiveIndexes(index)}
        className="remote-form-accordion flex flex-col gap-2"
        pt={{
          accordiontab: {
            content: { className: 'pt-1 pb-3 px-4 bg-transparent border-0' },
            root: {
              className:
                'border border-border-specific-panel-outline bg-surface-base-chat rounded-lg',
            },
            headerAction: {
              className:
                'py-4 transition bg-transparent border-0 hover:no-underline hover:opacity-75',
            },
          },
        }}
      >
        {assistant.skills.map((skill, i) => (
          <AccordionTab
            key={skill.id}
            pt={{ content: { className: 'border-t border-border-specific-panel-outline' } }}
            header={
              <div className="flex justify-between items-center w-full px-4 gap-4">
                <div>
                  <div className="font-medium text-text-primary mb-1 text-wrap break-word">
                    {skill.name}
                  </div>
                  <div className="text-xs font-normal text-text-secondary truncate max-w-lg text-wrap break-word">
                    {skill.description}
                  </div>
                </div>
                <ChevronDownSvg
                  className={cn(
                    'min-w-4 opacity-50 text-text-primary transition',
                    (activeIndexes as (number | undefined)[]).includes(i) && 'rotate-180'
                  )}
                />
              </div>
            }
          >
            <div className="flex flex-col gap-4 px-2 pb-2 pt-4">
              <DetailsProperty label="ID" value={skill.id} />
              <DetailsProperty label="Description" className="flex-col" value={skill.description} />

              {!!skill.examples?.length && (
                <DetailsProperty label="Examples" className="flex-col">
                  <ol className="list-disc ml-5 space-y-1 text-sm">
                    {skill.examples.map((example) => (
                      <li key={example} className="text-wrap break-words">
                        {example}
                      </li>
                    ))}
                  </ol>
                </DetailsProperty>
              )}

              <DetailsTags headline="Tags:" items={skill.tags} />

              {!!skill.inputModes?.length && !!skill.outputModes?.length && (
                <div className={cn('grid grid-cols-2 gap-4', isChatConfig && 'flex-col')}>
                  <DetailsTags headline="Input Modes:" items={skill.inputModes} />
                  <DetailsTags headline="Output Modes:" items={skill.outputModes} />
                </div>
              )}
            </div>
          </AccordionTab>
        ))}
      </Accordion>
    </div>
  )
}

export default RemoteAssistantFormAccordion
