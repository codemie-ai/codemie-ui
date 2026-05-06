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
  AUTH_CALLBACK_TIMEOUT_MESSAGE,
  useAuthCallbackListener,
} from '@/hooks/useAuthCallbackListener'
import { chatGenerationStore } from '@/store/chatGeneration'
import { ChatHistoryGroup, Conversation } from '@/types/entity/conversation'

const getAuthenticatingPromptIds = (history: ChatHistoryGroup[]): string[] => [
  ...new Set(
    history
      .flat()
      .flatMap((msg) => msg.mcpAuthPromptRows ?? [])
      .filter((row) => row.status === 'authenticating' && !!row.auth_config_id)
      .map((row) => row.auth_config_id as string)
  ),
]

const NOOP_HANDLERS = {
  onSuccess: (_authConfigId: string) => {},
  onError: (_authConfigId: string, _errorCode?: string) => {},
  onTimeout: (_authConfigId: string) => {},
}

export const useChatAuthCallbacks = (currentChat: Conversation | null | undefined) => {
  const { trackedAuthConfigIds, ...handlers } = useMemo(() => {
    if (!currentChat || currentChat.isWorkflow) {
      return { trackedAuthConfigIds: [] as string[], ...NOOP_HANDLERS }
    }
    const promptIds = getAuthenticatingPromptIds(currentChat.history)
    return {
      trackedAuthConfigIds: promptIds,
      onSuccess: (authConfigId: string) =>
        chatGenerationStore.markPromptAuthSuccess(currentChat.id, authConfigId),
      onError: (authConfigId: string, errorCode?: string) =>
        chatGenerationStore.rollbackPromptAuthRow(currentChat.id, authConfigId, errorCode ?? null),
      onTimeout: (authConfigId: string) =>
        chatGenerationStore.rollbackPromptAuthRow(
          currentChat.id,
          authConfigId,
          AUTH_CALLBACK_TIMEOUT_MESSAGE
        ),
    }
  }, [currentChat])

  useAuthCallbackListener({ trackedAuthConfigIds, ...handlers })
}
