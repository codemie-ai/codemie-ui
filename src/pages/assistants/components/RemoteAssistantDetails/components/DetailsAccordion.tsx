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

import ChevronUpSvg from '@/assets/icons/chevron-up.svg?react'
import DetailsProperty from '@/components/details/DetailsProperty'
import { AgentCard } from '@/types/entity/assistant'

import DetailsSection from './DetailsSection'
import DetailsTags from './DetailsTags'

interface DetailsAccordionProps {
  agent_card?: AgentCard
}

const DetailsAccordion = ({ agent_card }: DetailsAccordionProps) => {
  if (!agent_card) return null

  return (
    <DetailsSection headline="Skills:">
      <Accordion
        multiple
        expandIcon={
          <ChevronUpSvg className="size-4 -rotate-180 mr-4 transition group-hover:opacity-60 opacity-80" />
        }
        collapseIcon={
          <ChevronUpSvg className="size-4 mr-4 transition group-hover:opacity-60 opacity-80" />
        }
        className="flex flex-col gap-2 bg-surface-base-chat [&_.p-accordion-tab]:rounded-lg [&_.p-accordion-tab]:border [&_.p-accordion-tab]:transition-colors [&_.p-accordion-tab]:border-border-specific-panel-outline [&_.p-accordion-tab-active]:!border-border-primary/60 [&_.p-accordion-tab-active_.p-accordion-header]:border-border-specific-panel-outline"
      >
        {agent_card.skills?.map((skill) => (
          <AccordionTab
            key={skill.id}
            className="[&_.p-accordion-header-link]:hover:no-underline [&_.p-accordion-header-link]:flex-row-reverse"
            headerClassName="border-b border-transparent transition"
            pt={{ headerIcon: { className: 'hidden' }, header: { className: 'group' } }}
            header={
              <div className="flex justify-between items-center p-4 transition group-hover:opacity-80">
                <div className="flex flex-col gap-1">
                  <p className="font">{skill.name}</p>
                  <p className="text-xs text-text-quaternary">{skill.description}</p>
                </div>
              </div>
            }
          >
            <div className="flex flex-col gap-3 p-4">
              <DetailsProperty label="ID" value={skill.id} />
              <DetailsProperty label="Description" value={skill.description} className="flex-col" />
              <DetailsProperty
                label="Examples"
                value={skill.examples?.map((example) => example).join('\n')}
                className="flex-col"
              />

              <DetailsTags headline="Tags:" items={skill.tags} />

              {(skill.inputModes || skill.outputModes) && (
                <div className="grid grid-cols-2 gap-4">
                  <DetailsTags headline="Input Modes:" items={skill.inputModes} />
                  <DetailsTags headline="Output Modes:" items={skill.outputModes} />
                </div>
              )}
            </div>
          </AccordionTab>
        ))}
      </Accordion>
    </DetailsSection>
  )
}

export default DetailsAccordion
