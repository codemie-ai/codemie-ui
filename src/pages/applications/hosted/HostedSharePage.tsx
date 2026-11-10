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

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import Button from '@/components/Button'
import { hostedApplicationsStore as store, hostedErrorMessage } from '@/store/hostedApplications'
import { getIsLocalAuth } from '@/utils/utils'

import HostedNotAvailable from './HostedNotAvailable'
import { hostedRoutes } from './hostedRoutes'
import { hostedApplicationsOff, useHostedFeatureRedirect } from './useHostedFeatureRedirect'

type Outcome =
  | { kind: 'opening' }
  | { kind: 'unavailable' }
  | { kind: 'busy' }
  | { kind: 'error'; message: string }

/**
 * Opens a share link and replaces itself with the application's viewer. The token is never
 * rendered or logged. An opaque redirect (status 0) and the 401 that `api` turns into a sign-in
 * redirect keep the neutral loading state; any other 401 shows the not-available page. A 503
 * (SERVICE_BUSY) is retryable: the link may well be valid, so it offers to try again.
 */
const redirectedBySession = (cause: unknown) => {
  const { status, parsedError } = (cause ?? {}) as { status?: number; parsedError?: unknown }
  if (status === 0) return true
  // `api` redirects a local-auth 401 and rejects with the bare response, without a parsed error.
  return status === 401 && getIsLocalAuth() && parsedError === undefined
}

const HostedSharePage = () => {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  useHostedFeatureRedirect()
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'opening' })
  const [attempt, setAttempt] = useState(0)
  // The link is opened once per token and attempt, even when effects re-run (React StrictMode).
  const opened = useRef<string | null>(null)

  useEffect(() => {
    const key = `${attempt}:${token}`
    if (opened.current === key) return
    opened.current = key
    const open = async () => {
      // Custom applications are off: the redirect to Platform apps takes over, the link stays closed.
      if (await hostedApplicationsOff()) return
      const appId = await store.openShareLink(token)
      navigate(hostedRoutes.view(appId), { replace: true })
    }
    open().catch((cause) => {
      if (redirectedBySession(cause)) return
      const status = (cause as { status?: number } | null)?.status
      if (status === 503) setOutcome({ kind: 'busy' })
      else if (status === 401 || status === 403 || status === 404)
        setOutcome({ kind: 'unavailable' })
      else setOutcome({ kind: 'error', message: hostedErrorMessage(cause) })
    })
  }, [token, attempt, navigate])

  const retry = () => {
    setOutcome({ kind: 'opening' })
    setAttempt((value) => value + 1)
  }

  if (outcome.kind === 'unavailable') return <HostedNotAvailable />
  if (outcome.kind === 'error') return <HostedNotAvailable message={outcome.message} />
  if (outcome.kind === 'busy')
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-24 text-center">
        <h2 className="text-xl font-semibold">Applications are busy right now</h2>
        <p className="max-w-md text-sm text-text-tertiary">
          The link could not be opened this time. Wait a moment and try again.
        </p>
        <Button variant="secondary" onClick={retry}>
          Try again
        </Button>
      </div>
    )
  return (
    <output className="block py-24 text-center text-sm text-text-tertiary">
      Opening application...
    </output>
  )
}

export default HostedSharePage
