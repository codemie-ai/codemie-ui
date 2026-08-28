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

import { OAuthProvider } from '@/types/entity/dataSource'
import { MCPAuthGateServer } from '@/types/entity/mcpAuth'

import ChatAiMcpAuthPrompt from './ChatAiMcpAuthPrompt'
import ChatAiOAuthPrompt, { OAuthConnectPrompt } from './ChatAiOAuthPrompt'

/** Every auth gate a single assistant turn can surface, mapped under one parent. */
export interface ChatAuthPrompt {
  mcpRows?: MCPAuthGateServer[]
  gitlab?: OAuthConnectPrompt
  jira?: OAuthConnectPrompt
  confluence?: OAuthConnectPrompt
}

interface ChatAiAuthPromptProps {
  authPrompt: ChatAuthPrompt
  /** MCP action context — only used by the MCP branch. */
  chatId: string
  historyIndex: number
  messageIndex: number
}

/**
 * Decides which auth gate to render for a turn. MCP auth (its own multi-row, status-driven UI with
 * per-row actions) takes precedence; otherwise the per-user OAuth connect gates are stacked, since
 * the aggregate gate can surface several providers at once (e.g. GitLab + Jira).
 */
const ChatAiAuthPrompt: FC<ChatAiAuthPromptProps> = ({
  authPrompt,
  chatId,
  historyIndex,
  messageIndex,
}) => {
  const { mcpRows, gitlab, jira, confluence } = authPrompt

  if (mcpRows?.length) {
    return (
      <ChatAiMcpAuthPrompt
        chatId={chatId}
        historyIndex={historyIndex}
        messageIndex={messageIndex}
        rows={mcpRows}
      />
    )
  }

  if (!gitlab && !jira && !confluence) return null

  return (
    <div className="flex flex-col gap-2">
      {gitlab && <ChatAiOAuthPrompt provider={OAuthProvider.GITLAB} prompt={gitlab} />}
      {jira && <ChatAiOAuthPrompt provider={OAuthProvider.JIRA} prompt={jira} />}
      {confluence && <ChatAiOAuthPrompt provider={OAuthProvider.CONFLUENCE} prompt={confluence} />}
    </div>
  )
}

export default ChatAiAuthPrompt
