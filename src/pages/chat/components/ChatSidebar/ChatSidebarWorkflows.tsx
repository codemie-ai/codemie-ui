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
    router.push({ name: 'view-workflow', params: { workflowId: workflow.id } })
  }

  const createChat = async (workflow: any) => {
    await chatsStore.startNewChat(workflow.id, workflow.name, true)
    router.push({ name: 'new-chat' })
    workflowsStore.updateRecentWorkflows(workflow)
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
          <div
            key={workflow.id}
            className="flex h-9 min-w-0 items-center justify-between gap-2 px-1.5"
          >
            <button
              type="button"
              onClick={() => createChat(workflow)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  createChat(workflow)
                }
              }}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-inherit"
            >
              <Avatar
                iconUrl={workflow.icon_url}
                name={workflow.name}
                type={AvatarType.XS}
                className="shrink-0"
              />
              <span
                id={`sidebar-workflow-name-${workflow.id}`}
                className="block min-w-0 flex-1 truncate text-left text-sm font-normal text-text-primary"
                title="Start a new conversation with this Workflow"
              >
                {truncateName(workflow.name)}
              </span>
            </button>

            <div className="flex shrink-0 items-center">
              <NavigationMore
                renderInRoot
                placement="right-end"
                hideOnClickInside
                className="size-6 shrink-0"
                buttonClassName="m-0 flex size-6 items-center justify-center p-0"
                contextId={`sidebar-workflow-name-${workflow.id}`}
                items={getMenuItems(workflow)}
              />
            </div>
          </div>
        ))}
      </div>
    </ChatsSidebarSection>
  )
}

export default ChatSidebarWorkflows
