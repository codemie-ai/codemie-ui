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

import { useSnapshot } from 'valtio'

import ChatSvg from '@/assets/icons/chat.svg?react'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import { chatsStore } from '@/store/chats'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { workflowsStore } from '@/store/workflows'

interface RunChatButtonProps {
  workflowId: string
  variant?: ButtonType
  className?: string
}

const RunChatButton = ({
  workflowId,
  variant = ButtonType.SECONDARY,
  className,
}: RunChatButtonProps) => {
  const router = useVueRouter()
  const { workflow } = useSnapshot(workflowExecutionsStore)

  const onStartChat = async () => {
    if (!workflow) return

    const chat = await chatsStore.createChat(workflowId, workflow.name, true)
    if (chat?.id) {
      router.push({ name: 'chats', params: { id: chat.id } })
      workflowsStore.updateRecentWorkflows(workflow as any)
    }
  }

  return (
    <Button variant={variant} onClick={onStartChat} className={className}>
      <ChatSvg className="w-4 h-4" />
      Run Chat
    </Button>
  )
}

export default RunChatButton
