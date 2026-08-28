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

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { OAuthPromptProvider } from '@/pages/chat/components/OAuthAuthGate/oauthProviderConfig'
import { OAuthProvider } from '@/types/entity/dataSource'

import ChatAiOAuthPrompt from '../ChatAiOAuthPrompt'

// Stand in for the real gate row (hooks + popup); expose an onConnected trigger.
vi.mock('@/pages/chat/components/OAuthAuthGate', () => ({
  OAuthAuthGateRow: ({
    integrationName,
    onConnected,
  }: {
    integrationName: string
    onConnected: () => void
  }) => <button onClick={onConnected}>{`row:${integrationName}`}</button>,
}))

const cases: [OAuthPromptProvider, string, string, RegExp][] = [
  [OAuthProvider.GITLAB, 'gitlab', 'GitLab', /your own GitLab account/i],
  [OAuthProvider.JIRA, 'jira', 'Jira', /your own Atlassian account/i],
  [OAuthProvider.CONFLUENCE, 'confluence', 'Confluence', /your own Atlassian account/i],
]

describe.each(cases)('ChatAiOAuthPrompt (%s)', (provider, base, label, descriptionRe) => {
  const prompt = { settingId: 's1', integrationName: 'Team Integration' }

  it('renders the connect heading, description and the gate row', () => {
    render(<ChatAiOAuthPrompt provider={provider} prompt={prompt} />)
    expect(screen.getByTestId(`chat-ai-${base}-auth-prompt`)).toBeInTheDocument()
    expect(screen.getByText(`Connect your ${label} account`)).toBeInTheDocument()
    expect(screen.getByText(descriptionRe)).toBeInTheDocument()
    expect(screen.getByText('row:Team Integration')).toBeInTheDocument()
  })

  it('switches to the success note after the account connects', () => {
    render(<ChatAiOAuthPrompt provider={provider} prompt={prompt} />)
    fireEvent.click(screen.getByText('row:Team Integration'))
    expect(screen.getByTestId(`chat-ai-${base}-auth-prompt-success`)).toBeInTheDocument()
    expect(screen.getByText(/resend the failed turn/i)).toBeInTheDocument()
  })
})
