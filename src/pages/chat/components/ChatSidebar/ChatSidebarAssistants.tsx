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

import { useEffect } from 'react'
import { useSnapshot } from 'valtio'

import PencilSquareSvg from '@/assets/icons/chat-new-filled.svg?react'
import ArchiveSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import { AvatarType } from '@/constants/avatar'
import { useVueRouter } from '@/hooks/useVueRouter'
import { assistantsStore, MAX_RECENT_ASSISTANTS } from '@/store/assistants'
import { chatsStore } from '@/store/chats'
import { Assistant } from '@/types/entity/assistant'
import { canEdit } from '@/utils/entity'

import ChatsSidebarSection from './ChatSidebarSection'

const MAX_NAME_LENGTH = 20

const truncateName = (assistant: Assistant) => {
  if (assistant.name.length <= MAX_NAME_LENGTH) {
    return assistant.name
  }
  return assistant.name.slice(0, MAX_NAME_LENGTH) + '...'
}

const ChatSidebarAssistants = () => {
  const router = useVueRouter()
  const { recentAssistants } = useSnapshot(assistantsStore)

  const viewAssistant = (assistant: Assistant) => {
    router.push({ name: 'assistant', params: { id: assistant.id } })
  }

  const editAssistant = (assistant: Assistant) => {
    router.push({ name: 'edit-assistant', params: { id: assistant.id } })
  }

  const deleteAssistant = async (assistant: Assistant) => {
    await assistantsStore.deleteRecentAssistant(assistant.id)
    assistantsStore.getRecentAssistants()
  }

  const createChat = async (assistant: Assistant) => {
    const chat = await chatsStore.createChat(assistant.id, assistant.name, false)

    if (chat?.id) {
      router.push({ name: 'chats', params: { id: chat.id } })
      assistantsStore.updateRecentAssistants(assistant)
    }
  }

  const getMenuItems = (assistant: Assistant) => [
    {
      title: 'New chat',
      onClick: () => createChat(assistant),
      icon: <PencilSquareSvg className="w-4 h-4" />,
    },
    {
      title: 'View',
      onClick: () => viewAssistant(assistant),
      icon: <InfoSvg />,
    },
    ...(canEdit(assistant) && assistant.type !== 'A2A'
      ? [
          {
            title: 'Edit',
            onClick: () => editAssistant(assistant),
            icon: <EditSvg className="h-4" />,
          },
        ]
      : []),
    {
      title: 'Remove',
      onClick: () => deleteAssistant(assistant),
      icon: <ArchiveSvg className="w-4 h-4" />,
    },
  ]

  useEffect(() => {
    assistantsStore.getRecentAssistants()
  }, [])

  return (
    <ChatsSidebarSection title="Assistants">
      <div className="flex flex-col">
        {recentAssistants.slice(0, MAX_RECENT_ASSISTANTS).map((assistant) => (
          <div key={assistant.id} className="flex justify-between items-center h-9 px-1.5">
            <button
              type="button"
              aria-label={`Start new chat with ${assistant.name}`}
              onClick={() => createChat(assistant)}
              className="flex justify-start items-center gap-2 cursor-pointer"
            >
              <Avatar
                withTooltip
                type={AvatarType.XS}
                iconUrl={assistant.icon_url}
                name={assistant.name}
              />
              <span className="block w-full truncate text-text-primary text-sm font-normal">
                {truncateName(assistant)}
              </span>
            </button>

            <div className="flex items-center">
              <NavigationMore hideOnClickInside items={getMenuItems(assistant)} />
            </div>
          </div>
        ))}
      </div>
    </ChatsSidebarSection>
  )
}

export default ChatSidebarAssistants
