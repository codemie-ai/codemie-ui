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

import { FC } from 'react'

import ExternalSvg from '@/assets/icons/external.svg?react'
import InputSvg from '@/assets/icons/input.svg?react'
import LightningSvg from '@/assets/icons/lightning.svg?react'
import NotificationSvg from '@/assets/icons/notification.svg?react'
import OutputSvg from '@/assets/icons/output.svg?react'
import ProcessingStatusSvg from '@/assets/icons/processing-status.svg?react'
import SheetSvg from '@/assets/icons/sheet.svg?react'
import Input from '@/components/form/Input'
import Textarea from '@/components/form/Textarea'
import { AgentCard } from '@/types/entity/assistant'
import { cn } from '@/utils/utils'

import RemoteAssistantFormAccordion from './RemoteAssistantFormAccordion'
import DetailsItem from '../RemoteAssistantDetails/components/DetailsItem'

interface RemoteAssistantFormCardProps {
  isChatConfig?: boolean
  assistant: AgentCard
  className?: string
}

const RemoteAssistantFormCard: FC<RemoteAssistantFormCardProps> = ({
  isChatConfig,
  assistant,
  className,
}) => {
  const getStatus = (value: unknown) => (value ? 'Supported' : 'Not supported')

  return (
    <div
      className={cn(
        'mt-6 bg-surface-base-chat rounded-lg border border-border-primary z-20 p-4 flex flex-col gap-6',
        className
      )}
    >
      <div className="flex justify-between items-center -mb-2">
        <h3 className="font-medium text-lg">Assistant Card</h3>
        {assistant.version && (
          <div className="px-2 py-0.5 rounded-full text-xs border border-in-progress-secondary bg-in-progress-tertiary text-in-progress-primary">
            V {assistant.version}
          </div>
        )}
      </div>

      <Input
        readOnly
        value={assistant.name}
        label="Original Name:"
        containerClass="hover:border-border-primary focus:border-border-primary"
      />
      <Textarea
        readOnly
        rows={3}
        label="Description:"
        value={assistant.description}
        className="hover:border-border-primary focus:border-border-primary"
      />

      {assistant.documentationUrl && (
        <div>
          <p className="text-xs text-text-quaternary">Documentation:</p>
          <div className="flex items-center h-8">
            <a
              href={assistant.documentationUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm flex items-center gap-1 cursor-pointer opacity-60 hover:opacity-100 transition"
            >
              <SheetSvg />
              View Documentation
            </a>
          </div>
        </div>
      )}

      {assistant.provider && (
        <div>
          <p className="block text-xs text-text-quaternary mb-2">Provider Information:</p>
          <div className="rounded-lg p-3 border border-border-specific-panel-outline">
            <div className="flex justify-between items-center gap-2">
              <span className="font-medium">{assistant.provider.organization}</span>
              {assistant.provider.url && (
                <a
                  href={assistant.provider.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center text-sm gap-1 transition opacity-60 hover:opacity-100 shrink-0"
                >
                  <ExternalSvg />
                  Visit Provider
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-xs text-text-quaternary">Capabilities:</p>
        <div className={cn('grid grid-cols-3 gap-4', isChatConfig && 'grid-cols-2')}>
          <DetailsItem
            title="Streaming"
            icon={<LightningSvg />}
            description={getStatus(assistant.capabilities?.streaming)}
          />
          <DetailsItem
            title="Notifications"
            icon={<NotificationSvg />}
            description={getStatus(assistant.capabilities?.pushNotifications)}
          />
          <DetailsItem
            title="State History"
            icon={<ProcessingStatusSvg />}
            description={getStatus(assistant.capabilities?.stateTransitionHistory)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-text-quaternary">Default Modes:</p>
        <div className={cn('grid grid-cols-3  gap-4', isChatConfig && 'grid-cols-2')}>
          <DetailsItem
            title="Input Modes"
            icon={<InputSvg />}
            description={assistant.defaultInputModes?.join(', ') ?? 'None specified'}
          />
          <DetailsItem
            title="Output Modes"
            icon={<OutputSvg />}
            description={assistant.defaultOutputModes?.join(', ') ?? 'None specified'}
          />
        </div>
      </div>

      <RemoteAssistantFormAccordion isChatConfig={isChatConfig} assistant={assistant} />
    </div>
  )
}

export default RemoteAssistantFormCard
