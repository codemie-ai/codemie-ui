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

import { useConfluenceConnect } from '@/hooks/useConfluenceConnect'
import { useGitLabConnect } from '@/hooks/useGitLabConnect'
import { useJiraConnect } from '@/hooks/useJiraConnect'
import { UseOAuthConnectReturn } from '@/hooks/useOAuthConnect'
import { OAuthProvider } from '@/types/entity/dataSource'

/** The per-user OAuth providers that surface an in-chat connect gate. */
export type OAuthPromptProvider =
  | OAuthProvider.GITLAB
  | OAuthProvider.JIRA
  | OAuthProvider.CONFLUENCE

export interface OAuthPromptConfig {
  /** The provider's per-user connect hook. */
  useConnect: (settingId: string) => UseOAuthConnectReturn
  /** Secondary line under the "Connect your X account" heading. */
  description: string
}

// The only per-provider differences left: which connect hook drives the row, and one copy line.
// Everything else (heading, success note, test ids) is derived from the OAuthProvider value.
export const OAUTH_PROMPT_CONFIG: Record<OAuthPromptProvider, OAuthPromptConfig> = {
  [OAuthProvider.GITLAB]: {
    useConnect: useGitLabConnect,
    description:
      'This integration runs under your own GitLab account. Sign in, then resend the failed turn.',
  },
  [OAuthProvider.JIRA]: {
    useConnect: useJiraConnect,
    description:
      'This integration runs under your own Atlassian account. Sign in, then resend the failed turn.',
  },
  [OAuthProvider.CONFLUENCE]: {
    useConnect: useConfluenceConnect,
    description:
      'This integration runs under your own Atlassian account. Sign in, then resend the failed turn.',
  },
}
