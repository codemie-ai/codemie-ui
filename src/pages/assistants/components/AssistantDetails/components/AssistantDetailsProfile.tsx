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

import { useRef } from 'react'

import DiagramSvg from '@/assets/icons/diagram.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import Tooltip from '@/components/Tooltip'
import { AssistantType } from '@/constants/assistants'
import { AvatarType } from '@/constants/avatar'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { Assistant } from '@/types/entity/assistant'
import { createdBy as getCreatedBy } from '@/utils/utils'

interface AssistantDetailsProfileProps {
  assistant: Assistant
}

const AssistantDetailsProfile = ({ assistant }: AssistantDetailsProfileProps) => {
  const formattedTotalUses = Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  })
    .format(Number(assistant.unique_users_count) || 0)
    .toLocaleLowerCase()

  const nameEl = useRef<HTMLParagraphElement>(null)
  const isNameTruncated = useIsTruncated(nameEl)

  return (
    <div className="flex gap-4 justify-center min-w-0 max-w-full">
      {assistant.type !== AssistantType.A2A && (
        <Avatar iconUrl={assistant.icon_url} name={assistant.name} type={AvatarType.MEDIUM} />
      )}
      <Tooltip target=".name-target" position="left" showDelay={100} />

      <div className="flex flex-col gap-1 h-full mt-2 min-w-0 overflow-hidden">
        <h4
          className="name-target text-2xl font-semibold leading-9 min-w-0 truncate"
          ref={nameEl}
          data-pr-tooltip={isNameTruncated ? assistant.name : ''}
          data-pr-position="bottom"
        >
          {assistant.name}
        </h4>
        <div className="flex gap-2 text-xs text-text-quaternary">
          <p>by {getCreatedBy(assistant.created_by)}</p>
          {assistant.unique_users_count !== undefined && assistant?.is_global && (
            <p className="flex gap-2">
              |
              <DiagramSvg className="opacity-80" /> {formattedTotalUses}
              {assistant.unique_users_count === 1 ? ' total use' : ' total uses'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AssistantDetailsProfile
