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

import { FC } from 'react'

import Button from '@/components/Button'
import { ButtonSize } from '@/constants'
import { OAuthStatus } from '@/types/entity/dataSource'

interface Props {
  oauthStatus: OAuthStatus
  oauthUsername: string
  oauthError: string
  onSignIn: () => void
  isDark: boolean
  validationError?: string
  hideWaitingMessage?: boolean
}

const SharePointMicrosoftSignIn: FC<Props> = ({
  oauthStatus,
  oauthUsername,
  oauthError,
  onSignIn,
  isDark,
  validationError,
  hideWaitingMessage = false,
}) => (
  <div className="mb-4 flex flex-col gap-2">
    {oauthStatus === OAuthStatus.SUCCESS ? (
      <>
        <p className="text-xs text-text-success">
          {oauthUsername ? (
            <>
              Signed in as: <strong>{oauthUsername}</strong>
            </>
          ) : (
            'Microsoft authentication configured — re-authenticate before reindexing'
          )}
        </p>
        <Button
          type={isDark ? 'primary' : 'secondary'}
          size={ButtonSize.SMALL}
          onClick={onSignIn}
          className="py-4 px-10 w-fit"
        >
          Re-authenticate
        </Button>
      </>
    ) : (
      <>
        <Button
          type={isDark ? 'primary' : 'secondary'}
          size={ButtonSize.SMALL}
          onClick={onSignIn}
          disabled={oauthStatus === OAuthStatus.WAITING}
          className="py-4 px-10 w-fit"
        >
          {oauthStatus === OAuthStatus.WAITING
            ? 'Waiting for sign-in...'
            : 'Sign in with Microsoft'}
        </Button>

        {oauthStatus === OAuthStatus.WAITING && !hideWaitingMessage && (
          <p className="text-xs text-text-secondary">
            Sign-in window opened — complete authentication in the browser.
          </p>
        )}

        {oauthStatus === OAuthStatus.ERROR && (
          <p className="text-sm text-failed-secondary">{oauthError}</p>
        )}

        {validationError && <p className="text-sm text-failed-secondary">{validationError}</p>}
      </>
    )}
  </div>
)

export default SharePointMicrosoftSignIn
