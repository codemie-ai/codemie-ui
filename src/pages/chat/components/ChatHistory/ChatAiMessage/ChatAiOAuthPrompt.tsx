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

import { FC, useState } from 'react'

import { OAuthAuthGateRow } from '@/pages/chat/components/OAuthAuthGate'
import {
  OAUTH_PROMPT_CONFIG,
  OAuthPromptProvider,
} from '@/pages/chat/components/OAuthAuthGate/oauthProviderConfig'
import { cn } from '@/utils/utils'

export interface OAuthConnectPrompt {
  settingId: string
  integrationName: string
}

interface ChatAiOAuthPromptProps {
  provider: OAuthPromptProvider
  prompt: OAuthConnectPrompt
}

/**
 * One per-user OAuth connect gate for the chat transcript, parameterized by provider. Replaces the
 * identical ChatAiGitLabAuthPrompt / ChatAiJiraAuthPrompt / ChatAiConfluenceAuthPrompt components:
 * the heading, success note and test ids are derived from the provider, and only the connect hook
 * and one description line come from OAUTH_PROMPT_CONFIG.
 */
const ChatAiOAuthPrompt: FC<ChatAiOAuthPromptProps> = ({ provider, prompt }) => {
  const [connected, setConnected] = useState(false)
  const { useConnect, description } = OAUTH_PROMPT_CONFIG[provider]
  const base = provider.toLowerCase()

  if (connected) {
    return (
      <div
        className={cn(
          'mt-4 rounded-xl border border-success-primary/30 bg-success-secondary/15 px-4 py-3',
          'text-sm text-text-primary'
        )}
        data-testid={`chat-ai-${base}-auth-prompt-success`}
      >
        Connected to {provider}. Resend the failed turn to continue.
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3" data-testid={`chat-ai-${base}-auth-prompt`}>
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold text-text-primary">
          Connect your {provider} account
        </div>
        <div className="text-xs text-text-secondary">{description}</div>
      </div>

      <OAuthAuthGateRow
        provider={provider}
        settingId={prompt.settingId}
        integrationName={prompt.integrationName}
        useConnect={useConnect}
        onConnected={() => setConnected(true)}
      />
    </div>
  )
}

export default ChatAiOAuthPrompt
