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

import { useCallback, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { WORKFLOW_STATUSES } from '@/constants/workflows'
import { usePolling } from '@/hooks/usePolling'
import { chatsStore } from '@/store/chats'

const WORKFLOW_CHAT_POLL_INTERVAL_MS = 4000

const isLiveStreaming = (message: { stream?: unknown }): boolean => Boolean(message.stream)

const hasInProgressExecution = (chat: typeof chatsStore.currentChat): boolean =>
  !!chat?.history?.some((group) =>
    group.some(
      (message) =>
        !message.generationStopped &&
        !isLiveStreaming(message) &&
        (message.executionStatus === WORKFLOW_STATUSES.RUNNING ||
          !!message.thoughts?.some((thought) => thought.in_progress))
    )
  )

export const useWorkflowExecutionPoll = (chatId: string | undefined): void => {
  const { currentChat } = useSnapshot(chatsStore)

  const enabled = useMemo(
    () => Boolean(chatId && currentChat?.id === chatId && hasInProgressExecution(currentChat)),
    [chatId, currentChat]
  )

  const fetchFn = useCallback(async () => {
    if (!chatId) return
    await chatsStore.refreshWorkflowExecutionIds(chatId)
  }, [chatId])

  usePolling({
    interval: WORKFLOW_CHAT_POLL_INTERVAL_MS,
    enabled,
    fetchFn,
  })
}
