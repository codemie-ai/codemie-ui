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
import InfoSvg from '@/assets/icons/info.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import { AvatarType } from '@/constants/avatar'
import { useVueRouter } from '@/hooks/useVueRouter'
import { chatsStore } from '@/store/chats'
import { workflowsStore, MAX_RECENT_WORKFLOWS } from '@/store/workflows'

import ChatsSidebarSection from './ChatSidebarSection'

const MAX_NAME_LENGTH = 20

const truncateName = (name: string) => {
  if (name.length <= MAX_NAME_LENGTH) {
    return name
  }
  return name.slice(0, MAX_NAME_LENGTH) + '...'
}

const ChatSidebarWorkflows = () => {
  const router = useVueRouter()
  const { recentWorkflows } = useSnapshot(workflowsStore)

  const viewWorkflow = (workflow: any) => {
    router.push({ name: 'view-workflow', params: { id: workflow.id } })
  }

  const createChat = async (workflow: any) => {
    const chat = await chatsStore.createChat(workflow.id, workflow.name, true)

    if (chat?.id) {
      router.push({ name: 'chats', params: { id: chat.id } })
      workflowsStore.updateRecentWorkflows(workflow)
    }
  }

  const getMenuItems = (workflow: any) => [
    {
      title: 'New chat',
      onClick: () => createChat(workflow),
      icon: <PencilSquareSvg className="w-4 h-4" />,
    },
    {
      title: 'View',
      onClick: () => viewWorkflow(workflow),
      icon: <InfoSvg />,
    },
  ]

  useEffect(() => {
    workflowsStore.getRecentWorkflows()
  }, [])

  return (
    <ChatsSidebarSection title="Workflows">
      <div className="flex flex-col">
        {recentWorkflows.slice(0, MAX_RECENT_WORKFLOWS).map((workflow) => (
          <div key={workflow.id} className="flex justify-between items-center h-9 px-1.5">
            <button
              type="button"
              onClick={() => createChat(workflow)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  createChat(workflow)
                }
              }}
              className="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0 text-inherit"
            >
              <Avatar iconUrl={workflow.icon_url} name={workflow.name} type={AvatarType.XS} />
              <span
                className="block w-full truncate text-text-primary text-sm font-normal"
                title="Start a new conversation with this Workflow"
              >
                {truncateName(workflow.name)}
              </span>
            </button>

            <div className="flex items-center">
              <NavigationMore hideOnClickInside items={getMenuItems(workflow)} />
            </div>
          </div>
        ))}
      </div>
    </ChatsSidebarSection>
  )
}

export default ChatSidebarWorkflows
