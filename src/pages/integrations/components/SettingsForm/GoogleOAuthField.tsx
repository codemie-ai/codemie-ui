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

interface GoogleOAuthFieldProps {
  setValue: UseFormSetValue<any>
  formError?: string
  editing?: boolean
  initialUserEmail?: string
}

const GoogleOAuthField: FC<GoogleOAuthFieldProps> = ({
  setValue,
  formError,
  editing = false,
  initialUserEmail = '',
}) => {
  const { status, user, error, handleSignIn, handleReauthenticate, cancel } = useOAuth({
    initiate: userSettingsStore.initiateGoogleDocsOAuth,
    getStatus: userSettingsStore.getGoogleDocsOAuthStatus,
    initialStatus: editing ? OAuthStatus.SUCCESS : OAuthStatus.IDLE,
    initialUserEmail,
    onAuthStateChange: (state) => setValue('oauth_state', state),
  })

  return (
    <OAuthSignInButton
      provider={OAuthProvider.GOOGLE}
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

export default GoogleOAuthField
