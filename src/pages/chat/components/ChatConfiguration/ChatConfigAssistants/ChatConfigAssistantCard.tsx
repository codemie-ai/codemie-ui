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

import ConfigurationSvg from '@/assets/icons/configuration.svg?react'
import CopySvg from '@/assets/icons/copy.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import Button from '@/components/Button'
import Link from '@/components/Link'
import { AvatarType } from '@/constants/avatar'
import { Assistant } from '@/types/entity/assistant'
import { canEdit } from '@/utils/entity'
import { copyToClipboard, getRootPath } from '@/utils/utils'

import { useChatContext } from '../../../hooks/useChatContext'

interface ChatConfigAssistantCardProps {
  assistant: Assistant
}

const ChatConfigAssistantCard: FC<ChatConfigAssistantCardProps> = ({ assistant }) => {
  const { openConfigForm } = useChatContext()
  const link = `${getRootPath()}/#/assistants/${assistant.id}`

  const renderCopyButton = (label: string, value: string) => (
    <button
      title={`Copy ${label}`}
      className="text-text-primary hover:opacity-80"
      onClick={() => copyToClipboard(value, `Assistant ${label} copied to clipboard`)}
    >
      <CopySvg className="w-3 h-3 ml-2" />
    </button>
  )

  return (
    <div className="flex flex-col p-4 rounded-lg border border-border-structural bg-surface-base-secondary transition-all ease-in-out duration-200 hover:border-border-specific-interactive-outline">
      <div className="flex gap-2">
        <Avatar iconUrl={assistant.icon_url} name={assistant.name} type={AvatarType.XS} />

        <div className="flex flex-col min-w-0">
          <h5 className="font-semibold truncate">{assistant.name}</h5>
          <div className="flex gap-1 text-xs mt-2">
            ID:
            <div
              data-tooltip-id="react-tooltip"
              data-tooltip-content={assistant.id}
              className="whitespace-nowrap truncate min-w-0 text-text-primary"
            >
              {assistant.id}
            </div>
            {renderCopyButton('ID', assistant.id)}
          </div>

          <div className="flex gap-2 text-xs mt-4">
            Link:{' '}
            <Link
              url={link}
              label={link}
              target="_blank"
              tooltip={link}
              className="text-text-primary break-all hover:text-secondary text-nowrap truncate"
            />
            {renderCopyButton('Link', link)}
          </div>
        </div>
      </div>

      {canEdit(assistant) && (
        <Button type="secondary" className="mt-4" onClick={() => openConfigForm(assistant.id)}>
          <ConfigurationSvg /> Configure & Test
        </Button>
      )}
    </div>
  )
}

export default ChatConfigAssistantCard
