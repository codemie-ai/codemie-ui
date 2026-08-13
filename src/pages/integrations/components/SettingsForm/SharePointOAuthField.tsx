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
import { UseFormSetValue } from 'react-hook-form'

import OAuthSignInButton from '@/components/OAuthSignInButton/OAuthSignInButton'
import { useOAuth } from '@/hooks/useOAuth'
import { userSettingsStore } from '@/store/userSettings'
import { OAuthProvider, OAuthStatus } from '@/types/entity/dataSource'

interface SharePointOAuthFieldProps {
  setValue: UseFormSetValue<any>
  formError?: string
  /** True when the stored integration already holds delegated credentials. */
  signedIn?: boolean
  initialUsername?: string
}

/**
 * "Sign in with Microsoft" for SharePoint integrations.
 *
 * The tokens never reach the browser: signing in only yields an `oauth_state`, which is
 * submitted with the setting so the backend can read the tokens from the completed flow.
 */
const SharePointOAuthField: FC<SharePointOAuthFieldProps> = ({
  setValue,
  formError,
  signedIn = false,
  initialUsername = '',
}) => {
  const { status, user, error, handleSignIn, handleReauthenticate, cancel } = useOAuth({
    initiate: userSettingsStore.initiateSharePointOAuth,
    getStatus: userSettingsStore.getSharePointOAuthStatus,
    initialStatus: signedIn ? OAuthStatus.SUCCESS : OAuthStatus.IDLE,
    initialUserEmail: initialUsername,
    onAuthStateChange: (state) => setValue('oauth_state', state),
  })

  return (
    <OAuthSignInButton
      provider={OAuthProvider.MICROSOFT}
      status={status}
      user={user}
      authError={error}
      formError={formError}
      onSignIn={handleSignIn}
      onReauthenticate={handleReauthenticate}
      onCancel={cancel}
    />
  )
}

export default SharePointOAuthField
