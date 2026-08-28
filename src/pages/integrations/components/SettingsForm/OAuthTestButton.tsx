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

import { FC, useEffect, useRef } from 'react'

import Checker from '@/components/Checker'
import { CHECKER_STATUSES, CheckerStatus } from '@/constants'
import { useToolOAuthTest } from '@/hooks/useToolOAuthTest'
import { OAuthInitiateResponse, OAuthProvider, OAuthStatus } from '@/types/entity/dataSource'
import toaster from '@/utils/toaster'

interface OAuthTestButtonProps {
  provider: OAuthProvider
  initiate: () => Promise<OAuthInitiateResponse>
}

const CHECKER_STATUS_BY_OAUTH: Record<OAuthStatus, CheckerStatus> = {
  [OAuthStatus.IDLE]: CHECKER_STATUSES.UNDEFINED,
  [OAuthStatus.WAITING]: CHECKER_STATUSES.IN_PROGRESS,
  [OAuthStatus.SUCCESS]: CHECKER_STATUSES.SUCCESS,
  [OAuthStatus.ERROR]: CHECKER_STATUSES.FAILED,
}

/**
 * Validates a tool OAuth integration's app credentials by running the OAuth flow WITHOUT persisting
 * a token. `initiate` calls the provider's `/initiate` (which the backend forces to
 * persist_token=false) with the form's current app credentials; the result is reported through the
 * shared Checker + toaster affordance, mirroring the non-OAuth "Test integration" UX. No oauth_state
 * is produced — the per-user token is connected later via the chat auth gate.
 */
const OAuthTestButton: FC<OAuthTestButtonProps> = ({ provider, initiate }) => {
  const { status, user, error, handleSignIn } = useToolOAuthTest({ initiate })
  const prevStatus = useRef(status)

  useEffect(() => {
    if (prevStatus.current === status) return
    prevStatus.current = status
    if (status === OAuthStatus.SUCCESS) {
      toaster.info(
        user
          ? `${provider} test successful — authenticated as ${user}`
          : `${provider} test successful`
      )
    } else if (status === OAuthStatus.ERROR) {
      toaster.error(error || `${provider} test failed — please try again.`)
    }
  }, [status, user, error, provider])

  return (
    <Checker label="Test" status={CHECKER_STATUS_BY_OAUTH[status]} onCheck={() => handleSignIn()} />
  )
}

export default OAuthTestButton
