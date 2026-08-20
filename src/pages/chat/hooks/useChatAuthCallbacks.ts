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

import { useMemo } from 'react'

import {
  AUTH_CALLBACK_HINT_MESSAGE,
  useAuthCallbackListener,
} from '@/hooks/useAuthCallbackListener'
import { chatGenerationStore } from '@/store/chatGeneration'
import { ChatHistoryGroup, Conversation } from '@/types/entity/conversation'
import { MCPAuthGateServer } from '@/types/entity/mcpAuth'
import { getLiveAuthConfigIds, isAuthenticatingGateRow } from '@/utils/mcpAuth'

const getPromptRows = (history: ChatHistoryGroup[]): MCPAuthGateServer[] =>
  history.flat().flatMap((msg) => msg.mcpAuthPromptRows ?? [])

const getAuthenticatingPromptIds = (rows: MCPAuthGateServer[]): string[] => [
  ...new Set(rows.filter(isAuthenticatingGateRow).map((row) => row.auth_config_id as string)),
]

// A chat this hook does not drive reports no live ids at all rather than an empty list:
// an empty list would end an acceptance window another chat is still waiting on.
const NO_TRACKED_CHAT = {
  contextKey: '',
  trackedAuthConfigIds: [] as string[],
  liveAuthConfigIds: undefined as string[] | undefined,
  onSuccess: (_authConfigId: string) => {},
  onError: (_authConfigId: string, _errorCode?: string) => {},
  onTimeout: (_authConfigId: string) => {},
}

export const useChatAuthCallbacks = (currentChat: Conversation | null | undefined) => {
  const { trackedAuthConfigIds, liveAuthConfigIds, contextKey, ...handlers } = useMemo(() => {
    if (!currentChat || currentChat.isWorkflow) {
      return NO_TRACKED_CHAT
    }
    const promptRows = getPromptRows(currentChat.history)
    return {
      // Scopes every flow started here to this chat, so a late callback still reaches it
      // after the user has moved on, and a switch away never ends it.
      contextKey: currentChat.id,
      trackedAuthConfigIds: getAuthenticatingPromptIds(promptRows),
      liveAuthConfigIds: getLiveAuthConfigIds(promptRows),
      onSuccess: (authConfigId: string) =>
        chatGenerationStore.markPromptAuthSuccess(currentChat.id, authConfigId),
      onError: (authConfigId: string, errorCode?: string) =>
        chatGenerationStore.rollbackPromptAuthRow(currentChat.id, authConfigId, errorCode ?? null),
      onTimeout: (authConfigId: string) =>
        chatGenerationStore.rollbackPromptAuthRow(
          currentChat.id,
          authConfigId,
          AUTH_CALLBACK_HINT_MESSAGE
        ),
    }
  }, [currentChat])

  useAuthCallbackListener({ trackedAuthConfigIds, liveAuthConfigIds, contextKey, ...handlers })
}
