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

import { FC, useCallback } from 'react'
import { useSnapshot } from 'valtio'

import EditOutputForm from '@/components/EditOutputForm/EditOutputForm'
import { chatGenerationStore } from '@/store/chatGeneration'
import { chatsStore } from '@/store/chats'

interface ChatEditOutputFormProps {
  chatId: string
  onCancel: () => void
  onUpdate: () => void
}

const ChatEditOutputForm: FC<ChatEditOutputFormProps> = ({ chatId, onUpdate, onCancel }) => {
  const { currentChat } = useSnapshot(chatsStore)

  const fetchOutput = useCallback(async () => {
    const lastHistoryGroup = currentChat?.history.at(-1)
    const lastMessage = lastHistoryGroup?.at(-1)
    return lastMessage?.response || ''
  }, [currentChat?.history])

  const updateOutput = useCallback(
    async (output: string) => {
      return chatGenerationStore.updateWorkflowChatOutput(chatId, output)
    },
    [chatId]
  )

  return (
    <EditOutputForm
      fetchOutput={fetchOutput}
      updateOutput={updateOutput}
      onCancel={onCancel}
      onUpdate={onUpdate}
    />
  )
}

export default ChatEditOutputForm
