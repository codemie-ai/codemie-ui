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

import DiagramSvg from '@/assets/icons/diagram.svg?react'
import NotSharedSvg from '@/assets/icons/shared-no.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import { AvatarType } from '@/constants/avatar'
import { ASSISTANT_DETAILS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { Assistant } from '@/types/entity/assistant'
import { cn } from '@/utils/utils'

interface SidebarSubassistantsProps {
  assistants?: Assistant[]
}

const SidebarSubassistants = ({ assistants }: SidebarSubassistantsProps) => {
  const router = useVueRouter()

  const handleNavigationSubassistent = (subAssistantId: string) => {
    router.push({ name: ASSISTANT_DETAILS, params: { id: subAssistantId } })
  }

  const getAssistantStatus = (assistant: Assistant) => {
    // If published to marketplace, show Marketplace status
    if (assistant.is_global) {
      return {
        label: 'Marketplace',
        icon: <DiagramSvg className="w-3 h-3" />,
        className: 'text-text-quaternary',
      }
    }

    // If not published to marketplace, it's private
    return {
      label: 'Private',
      icon: <NotSharedSvg className="w-3 h-3" />,
      className: 'text-text-quaternary',
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-quaternary">SUB ASSISTANTS</p>
      {!assistants?.length && <p className="text-xs text-text-secondary">No assistants chosen</p>}
      {assistants?.map((subAssistant) => {
        const status = getAssistantStatus(subAssistant)

        return (
          <button
            key={subAssistant.id}
            type="button"
            onClick={() => handleNavigationSubassistent(subAssistant.id)}
            className={cn(
              'flex items-center gap-2 cursor-pointer p-2 -mx-2 rounded-lg w-full text-left',
              'hover:bg-surface-elevated transition-colors',
              'focus:outline-none'
            )}
          >
            <Avatar
              iconUrl={subAssistant.icon_url}
              name={subAssistant.name}
              type={AvatarType.SMALL}
            />
            <div className="flex flex-col flex-1 min-w-0">
              <p className="text-xs text-text-primary overflow-ellipsis overflow-hidden">
                {subAssistant.name}
              </p>
              <div className={cn('flex items-center gap-1 text-xs', status.className)}>
                {status.icon}
                <span>{status.label}</span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default SidebarSubassistants
