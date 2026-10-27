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

import { FC } from 'react'

import AssistantAuthGateRow from '@/pages/chat/components/AssistantAuthGate/AssistantAuthGateRow'
import { chatGenerationStore } from '@/store/chatGeneration'
import { MCPAuthGateServer } from '@/types/entity/mcpAuth'
import { cn } from '@/utils/utils'

interface ChatAiMcpAuthPromptProps {
  chatId: string
  historyIndex: number
  messageIndex: number
  rows: MCPAuthGateServer[]
}

const getPromptHeading = (rows: MCPAuthGateServer[]): string => {
  const pending = rows.filter((row) => row.status !== 'authenticated')
  if (pending.every((row) => row.status === 'discovery_failed')) {
    return 'MCP server unavailable'
  }
  return pending.some((row) => row.status === 'session_expired')
    ? 'Re-authentication required'
    : 'Authentication required'
}

const getPromptSubtitle = (rows: MCPAuthGateServer[]): string => {
  const pending = rows.filter((row) => row.status !== 'authenticated')
  return pending.every((row) => row.status === 'discovery_failed')
    ? 'Authentication discovery failed for one or more MCP servers. See the details below.'
    : 'Complete sign-in for the affected MCP server, then resend the failed turn.'
}

const ChatAiMcpAuthPrompt: FC<ChatAiMcpAuthPromptProps> = ({
  chatId,
  historyIndex,
  messageIndex,
  rows,
}) => {
  if (!rows.length) return null

  const allAuthenticated = rows.every((row) => row.status === 'authenticated')

  if (allAuthenticated) {
    return (
      <div
        className={cn(
          'mt-4 rounded-xl border border-success-primary/30 bg-success-secondary/15 px-4 py-3',
          'text-sm text-text-primary'
        )}
        data-testid="chat-ai-auth-prompt-success"
      >
        Re-authenticated successfully. Resend the failed turn or continue the conversation.
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3" data-testid="chat-ai-auth-prompt">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold text-text-primary">{getPromptHeading(rows)}</div>
        <div className="text-xs text-text-secondary">{getPromptSubtitle(rows)}</div>
      </div>

      {rows.map((row) => (
        <AssistantAuthGateRow
          key={row.syntheticKey ?? `${row.mcp_config_id}-${row.status}`}
          row={row}
          onAuthenticate={(mcpConfigId) =>
            chatGenerationStore.initiatePromptAuth(chatId, historyIndex, messageIndex, mcpConfigId)
          }
          onContinue={(mcpConfigId) =>
            chatGenerationStore.continuePromptAuth(chatId, historyIndex, messageIndex, mcpConfigId)
          }
          onCancel={(mcpConfigId) =>
            chatGenerationStore.cancelPromptAuth(chatId, historyIndex, messageIndex, mcpConfigId)
          }
        />
      ))}
    </div>
  )
}

export default ChatAiMcpAuthPrompt
