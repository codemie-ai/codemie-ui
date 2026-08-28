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

import { FC, useEffect } from 'react'

import OAuthSignInButton from '@/components/OAuthSignInButton/OAuthSignInButton'
import { UseOAuthConnectReturn } from '@/hooks/useOAuthConnect'
import { oauthConnectNotifiedStore } from '@/store/oauthConnectNotified'
import { OAuthProvider, OAuthStatus } from '@/types/entity/dataSource'

interface OAuthAuthGateRowProps {
  provider: OAuthProvider
  settingId: string
  integrationName: string
  /** The provider's per-user connect hook (useGitLabConnect / useJiraConnect / useConfluenceConnect). */
  useConnect: (settingId: string) => UseOAuthConnectReturn
  /** Fired once when the user's account becomes connected, so the caller can resend the turn. */
  onConnected: () => void
}

/**
 * One per-user OAuth connect row, parameterized by provider. Replaces the identical
 * GitLab/Jira/Confluence gate-row components; each provider now differs only by its `provider`
 * enum and its `useConnect` hook.
 */
const OAuthAuthGateRow: FC<OAuthAuthGateRowProps> = ({
  provider,
  settingId,
  integrationName,
  useConnect,
  onConnected,
}) => {
  const { status, username, error, handleConnect, refreshStatus } = useConnect(settingId)

  // Seed the current user's connection state (they may already be connected).
  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  // Notify exactly once per setting when the connection succeeds. The guard is stored by settingId
  // (not in a component-local ref) so a message remount does not re-fire onConnected.
  useEffect(() => {
    if (status === OAuthStatus.SUCCESS && !oauthConnectNotifiedStore.hasNotified(settingId)) {
      oauthConnectNotifiedStore.markNotified(settingId)
      onConnected()
    }
  }, [status, settingId, onConnected])

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border border-stroke-primary px-3 py-2"
      data-testid={`${provider.toLowerCase()}-auth-gate-row`}
    >
      <div className="text-sm text-text-primary">{integrationName}</div>
      <OAuthSignInButton
        provider={provider}
        status={status}
        user={username}
        authError={error}
        onSignIn={handleConnect}
        onReauthenticate={handleConnect}
        onCancel={() => {}}
      />
    </div>
  )
}

export default OAuthAuthGateRow
