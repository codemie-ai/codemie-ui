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

import {
  CONFLUENCE_OAUTH_CREDENTIAL_TYPE,
  GITLAB_OAUTH_CREDENTIAL_TYPE,
  JIRA_OAUTH_CREDENTIAL_TYPE,
} from '@/constants/integration'
import { userSettingsStore } from '@/store/userSettings'
import { OAuthProvider } from '@/types/entity/dataSource'

import OAuthTestButton from './SettingsForm/OAuthTestButton'

interface OAuthTestActionProps {
  credentialType: string
  credentialValues: Record<string, unknown>
}

/**
 * Renders a "Test Integration" button for GitLab / Jira / Confluence OAuth integrations, to sit in
 * the integration form footer alongside Save (same slot as the non-OAuth TestIntegration). The test
 * runs the provider OAuth flow in non-persisting mode (persist_token=false) against the credentials
 * currently in the form; nothing is saved. Returns null for non-OAuth credential types.
 */
const OAuthTestAction: FC<OAuthTestActionProps> = ({ credentialType, credentialValues }) => {
  // Credential form values are strings; anything else (undefined/object) is treated as empty
  // rather than stringified, so a non-string never leaks in as "[object Object]".
  const value = (key: string): string => {
    const raw = credentialValues[key]
    return typeof raw === 'string' ? raw : ''
  }

  if (credentialType === GITLAB_OAUTH_CREDENTIAL_TYPE) {
    return (
      <OAuthTestButton
        provider={OAuthProvider.GITLAB}
        initiate={() =>
          userSettingsStore.initiateGitLabOAuth({
            client_id: value('client_id'),
            client_secret: value('client_secret'),
            callback_base_url: value('callback_base_url'),
            instance_url: value('instance_url'),
          })
        }
      />
    )
  }

  if (credentialType === JIRA_OAUTH_CREDENTIAL_TYPE) {
    return (
      <OAuthTestButton
        provider={OAuthProvider.JIRA}
        initiate={() =>
          userSettingsStore.initiateJiraOAuth({
            client_id: value('client_id'),
            client_secret: value('client_secret'),
            callback_base_url: value('callback_base_url'),
          })
        }
      />
    )
  }

  if (credentialType === CONFLUENCE_OAUTH_CREDENTIAL_TYPE) {
    return (
      <OAuthTestButton
        provider={OAuthProvider.CONFLUENCE}
        initiate={() =>
          userSettingsStore.initiateConfluenceOAuth({
            client_id: value('client_id'),
            client_secret: value('client_secret'),
            callback_base_url: value('callback_base_url'),
          })
        }
      />
    )
  }

  return null
}

export default OAuthTestAction
