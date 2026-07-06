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

import React from 'react'

import Button from '@/components/Button'
import { ButtonSize, ButtonType } from '@/constants'
import { OAuthProvider, OAuthStatus } from '@/types/entity/dataSource'
import { cn } from '@/utils/utils'

export interface OAuthSignInButtonProps {
  provider: OAuthProvider
  status: OAuthStatus
  user?: string
  authError?: string
  formError?: string
  onSignIn: () => void
  onReauthenticate: () => void
  onCancel: () => void
}

interface StateConfig {
  buttonLabel: string
  onClick: () => void
  message?: string
}

const OAuthSignInButton: React.FC<OAuthSignInButtonProps> = ({
  provider,
  status,
  user,
  authError,
  formError,
  onSignIn,
  onReauthenticate,
  onCancel,
}) => {
  const configByStatus: Record<OAuthStatus, StateConfig> = {
    [OAuthStatus.WAITING]: {
      buttonLabel: 'Waiting for sign-in...',
      onClick: onCancel,
      message: 'Sign-in window opened — complete authentication in the browser.',
    },
    [OAuthStatus.SUCCESS]: {
      buttonLabel: 'Re-authenticate',
      onClick: onReauthenticate,
      message: `Signed in as: ${user}`,
    },
    [OAuthStatus.ERROR]: {
      buttonLabel: `Sign in with ${provider}`,
      onClick: onSignIn,
      message: authError,
    },
    [OAuthStatus.IDLE]: {
      buttonLabel: `Sign in with ${provider}`,
      onClick: onSignIn,
    },
  }

  const { buttonLabel, onClick, message } = configByStatus[status]

  return (
    <div className="flex flex-col">
      <label className="mb-2 text-xs text-text-tertiary">Authentication</label>

      <div className="flex flex-col gap-2">
        {message && (
          <span
            className={cn(
              'text-xs text-text-secondary',
              status === OAuthStatus.ERROR && 'text-failed-secondary'
            )}
          >
            {message}
          </span>
        )}

        <Button
          type={ButtonType.PRIMARY}
          size={ButtonSize.SMALL}
          onClick={onClick}
          className="py-4 px-10 w-fit"
          disabled={status === OAuthStatus.WAITING}
        >
          {buttonLabel}
        </Button>

        {formError && <div className="text-text-error text-sm">{formError}</div>}
      </div>
    </div>
  )
}

export default OAuthSignInButton
