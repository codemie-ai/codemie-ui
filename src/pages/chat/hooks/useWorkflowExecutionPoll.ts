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
import type { Conversation } from '@/types/entity/conversation'

const WORKFLOW_CHAT_POLL_INTERVAL_MS = 4000
const WORKFLOW_CHAT_POLL_IDLE_BACKOFF = { threshold: 3, multiplier: 2, maxInterval: 30_000 }

// Covers every field the backend changes during a run, so real updates never count as idle.
// Workflow thoughts are hydrated flat (children always empty, no routing/content).
const progressSignature = (chat: Conversation): string =>
  JSON.stringify({
    isInterrupted: chat.isInterrupted ?? false,
    history: chat.history.map((group) =>
      group.map((message) => ({
        executionId: message.executionId,
        executionStatus: message.executionStatus ?? null,
        inProgress: message.inProgress ?? false,
        response: message.response ?? '',
        thoughts: (message.thoughts ?? []).map((thought) => ({
          id: thought.id,
          in_progress: thought.in_progress,
          aborted: thought.aborted ?? false,
          interrupted: thought.interrupted ?? false,
          message: thought.message ?? '',
          tool_name: thought.tool_name ?? '',
          author_name: thought.author_name ?? '',
          input_text: thought.input_text ?? '',
          output_format: thought.output_format ?? '',
          error: thought.error ?? false,
        })),
      }))
    ),
  })

const isLiveStreaming = (message: { stream?: unknown }): boolean => Boolean(message.stream)

// executionStatus alone decides liveness: the backend copies the run's status onto every turn.
const hasInProgressExecution = (chat: typeof chatsStore.currentChat): boolean =>
  !!chat?.history?.some((group) =>
    group.some(
      (message) =>
        !message.generationStopped &&
        !isLiveStreaming(message) &&
        message.executionStatus === WORKFLOW_STATUSES.RUNNING
    )
  )

export const useWorkflowExecutionPoll = (chatId: string | undefined): void => {
  const { currentChat } = useSnapshot(chatsStore)

  const enabled = useMemo(
    () => Boolean(chatId && currentChat?.id === chatId && hasInProgressExecution(currentChat)),
    [chatId, currentChat]
  )

  const fetchFn = useCallback(async () => {
    if (!chatId) return false
    const findChat = () => chatsStore.openedChatsHistory.find((chat) => chat.id === chatId)

    const before = findChat()
    const beforeSignature = before ? progressSignature(before) : null

    await chatsStore.refreshWorkflowExecutionIds(chatId)

    const after = findChat()
    const afterSignature = after ? progressSignature(after) : null

    return beforeSignature !== afterSignature
  }, [chatId])

  usePolling({
    interval: WORKFLOW_CHAT_POLL_INTERVAL_MS,
    enabled,
    fetchFn,
    pauseWhenHidden: true,
    idleBackoff: WORKFLOW_CHAT_POLL_IDLE_BACKOFF,
  })
}
