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

import ExternalSvg from '@/assets/icons/external.svg?react'
import InputSvg from '@/assets/icons/input.svg?react'
import LightningSvg from '@/assets/icons/lightning.svg?react'
import NotificationSvg from '@/assets/icons/notification.svg?react'
import OutputSvg from '@/assets/icons/output.svg?react'
import ProcessingStatusSvg from '@/assets/icons/processing-status.svg?react'
import DetailsCopyField from '@/components/details/DetailsCopyField'
import DetailsProperty from '@/components/details/DetailsProperty'
import DetailsSidebar from '@/components/details/DetailsSidebar'
import DetailsSidebarSection from '@/components/details/DetailsSidebar/components/DetailsSidebarSection'
import { Assistant } from '@/types/entity/assistant'
import { getSharedValue } from '@/utils/utils'

import DetailsAccordion from './components/DetailsAccordion'
import DetailsItem from './components/DetailsItem'
import DetailsSection from './components/DetailsSection'
import DetailsTag from './components/DetailsTag'
import AssistantDetailsActions from '../AssistantDetails/components/AssistantDetailsActions'
import AssistantDetailsProfile from '../AssistantDetails/components/AssistantDetailsProfile'

interface RemoteAssistantDetailsProps {
  assistant: Assistant
  createChat: (assistant: Assistant) => void
  loadAssistant: () => Promise<void>
}

const RemoteAssistantDetails = ({
  assistant,
  createChat,
  loadAssistant,
}: RemoteAssistantDetailsProps) => {
  const { agent_card } = assistant
  const getStatus = (feature?: boolean) => (feature ? 'Supported' : 'Not supported')

  return (
    <div className="flex flex-col max-w-5xl mx-auto py-8">
      <div className="flex justify-between flex-wrap gap-4">
        <AssistantDetailsProfile assistant={assistant} />
        <AssistantDetailsActions
          assistant={assistant}
          createChat={createChat}
          loadAssistant={loadAssistant}
        />
      </div>

      <div className="mt-9 flex flex-col md:flex-row gap-9 z-10">
        <div className="flex flex-col gap-6 grow">
          <DetailsSection headline="About Assistant:">
            <p className="text-sm text-text-quaternary whitespace-pre-wrap">
              {assistant.description}
            </p>
            <DetailsCopyField
              label="Assistant URL"
              value={agent_card?.url}
              className="mt-2"
              notification="Assistant URL copied to clipboard"
            />
          </DetailsSection>

          {agent_card?.version && (
            <DetailsSection headline="Version:">
              <DetailsTag value={`V ${agent_card.version}`} />
            </DetailsSection>
          )}

          {agent_card?.documentationUrl && (
            <DetailsSection headline="Documentation:">
              <a
                target="_blank"
                rel="noreferrer"
                href={agent_card.documentationUrl}
                className="opacity-60 hover:opacity-100 text-sm flex items-center gap-1 cursor-pointer"
              >
                <ExternalSvg />
                View Documentation
              </a>
            </DetailsSection>
          )}

          {agent_card?.provider && (
            <DetailsSection headline="Provider:" className="flex-row justify-between items-center">
              <p>{agent_card.provider.organization}</p>
              {agent_card.provider?.url && (
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={agent_card.provider.url}
                  className="opacity-60 hover:opacity-100 text-sm flex items-center gap-1 cursor-pointer"
                >
                  <ExternalSvg />
                  Visit Provider
                </a>
              )}
            </DetailsSection>
          )}

          <DetailsAccordion agent_card={agent_card} />
        </div>

        <DetailsSidebar>
          <DetailsSidebarSection headline="OVERVIEW" itemsWrapperClassName="gap-2 -mt-2">
            <DetailsProperty label="Project" value={assistant.project} />
            <DetailsProperty
              label="Shared"
              value={getSharedValue(assistant.is_global, assistant.shared)}
            />
          </DetailsSidebarSection>

          <DetailsSidebarSection headline="CAPABILITIES">
            <DetailsItem
              icon={<LightningSvg />}
              title="Streaming"
              description={getStatus(agent_card?.capabilities?.streaming)}
            />
            <DetailsItem
              icon={<NotificationSvg />}
              title="Notifications"
              description={getStatus(agent_card?.capabilities?.pushNotifications)}
            />
            <DetailsItem
              icon={<ProcessingStatusSvg className="size-4" />}
              title="State History"
              description={getStatus(agent_card?.capabilities?.stateTransitionHistory)}
            />
          </DetailsSidebarSection>

          <DetailsSidebarSection headline="DEFAULT MODES">
            <DetailsItem
              icon={<InputSvg />}
              title="Input Modes"
              description={agent_card?.defaultInputModes?.join(', ') || 'None specified'}
            />
            <DetailsItem
              icon={<OutputSvg />}
              title="Output Modes"
              description={agent_card?.defaultOutputModes?.join(', ') || 'None specified'}
            />
          </DetailsSidebarSection>
        </DetailsSidebar>
      </div>
    </div>
  )
}

export default RemoteAssistantDetails
