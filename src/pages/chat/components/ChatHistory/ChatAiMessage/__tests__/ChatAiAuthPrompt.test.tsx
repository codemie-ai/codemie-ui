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

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { MCPAuthGateServer } from '@/types/entity/mcpAuth'

import ChatAiAuthPrompt from '../ChatAiAuthPrompt'

// Route targets are unit-tested elsewhere; here we only assert which one the decider renders.
vi.mock('../ChatAiMcpAuthPrompt', () => ({
  default: ({
    chatId,
    historyIndex,
    messageIndex,
    rows,
  }: {
    chatId: string
    historyIndex: number
    messageIndex: number
    rows: MCPAuthGateServer[]
  }) => (
    <div data-testid="mcp-prompt">{`${chatId}:${historyIndex}:${messageIndex}:${rows.length}`}</div>
  ),
}))
vi.mock('../ChatAiOAuthPrompt', () => ({
  default: ({ provider, prompt }: { provider: string; prompt: { integrationName: string } }) => (
    <div data-testid={`oauth-${provider}`}>{prompt.integrationName}</div>
  ),
}))

const baseProps = { chatId: 'chat-1', historyIndex: 2, messageIndex: 1 }
const oauth = (integrationName: string) => ({ settingId: 's1', integrationName })
const mcpRows = [{ mcp_config_id: 'm1' }] as unknown as MCPAuthGateServer[]

describe('ChatAiAuthPrompt (decider)', () => {
  it('routes MCP rows to the MCP prompt and passes the action context', () => {
    render(<ChatAiAuthPrompt {...baseProps} authPrompt={{ mcpRows }} />)
    expect(screen.getByTestId('mcp-prompt')).toHaveTextContent('chat-1:2:1:1')
    expect(screen.queryByTestId(/^oauth-/)).not.toBeInTheDocument()
  })

  it('routes a single OAuth provider to the OAuth prompt', () => {
    render(<ChatAiAuthPrompt {...baseProps} authPrompt={{ gitlab: oauth('Team GitLab') }} />)
    expect(screen.getByTestId('oauth-GitLab')).toHaveTextContent('Team GitLab')
    expect(screen.queryByTestId('mcp-prompt')).not.toBeInTheDocument()
  })

  it('stacks every OAuth provider that is set', () => {
    render(
      <ChatAiAuthPrompt
        {...baseProps}
        authPrompt={{
          gitlab: oauth('GL'),
          jira: oauth('JR'),
          confluence: oauth('CF'),
        }}
      />
    )
    expect(screen.getByTestId('oauth-GitLab')).toBeInTheDocument()
    expect(screen.getByTestId('oauth-Jira')).toBeInTheDocument()
    expect(screen.getByTestId('oauth-Confluence')).toBeInTheDocument()
  })

  it('prefers MCP over OAuth when both are present', () => {
    render(
      <ChatAiAuthPrompt {...baseProps} authPrompt={{ mcpRows, gitlab: oauth('Team GitLab') }} />
    )
    expect(screen.getByTestId('mcp-prompt')).toBeInTheDocument()
    expect(screen.queryByTestId('oauth-GitLab')).not.toBeInTheDocument()
  })

  it('renders nothing when the authPrompt is empty', () => {
    const { container } = render(<ChatAiAuthPrompt {...baseProps} authPrompt={{}} />)
    expect(container).toBeEmptyDOMElement()
  })
})
