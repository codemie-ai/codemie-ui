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
import { useParams } from 'react-router'

import Spinner from '@/components/Spinner'
import { hostedApplicationsStore as store, hostedErrorMessage } from '@/store/hostedApplications'
import { HOSTED_UUID, submitHostedLaunch } from '@/utils/hostedApplicationLaunch'

import HostedNotAvailable from './HostedNotAvailable'
import { hostedApplicationsOff, useHostedFeatureRedirect } from './useHostedFeatureRedirect'

/**
 * The application alone in its own tab, without the CodeMie layout: the page issues a launch for the
 * active version and hands the whole tab to the content origin. Its address can be copied and shared;
 * access is checked on every launch, as for the embedded viewer.
 */
const HostedStandaloneLaunch = () => {
  const { id = '' } = useParams()
  const [failure, setFailure] = useState<{ hidden: boolean; message?: string } | null>(null)
  const started = useRef<string | null>(null)
  useHostedFeatureRedirect()

  useEffect(() => {
    // One launch per id, also under React StrictMode's double effects.
    if (started.current === id) return
    started.current = id
    const launch = async () => {
      if (!HOSTED_UUID.test(id)) {
        setFailure({ hidden: true })
        return
      }
      try {
        if (await hostedApplicationsOff()) return
        submitHostedLaunch(await store.issueLaunch(id), '_self')
      } catch (cause) {
        // Missing and forbidden look the same, as everywhere else.
        const status = (cause as { status?: number } | null)?.status
        setFailure(
          status === 404 || status === 403
            ? { hidden: true }
            : { hidden: false, message: hostedErrorMessage(cause) }
        )
      }
    }
    launch()
  }, [id])

  if (failure) return <HostedNotAvailable message={failure.hidden ? undefined : failure.message} />
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3">
      <Spinner />
      <p className="text-sm text-text-secondary">Opening application…</p>
    </div>
  )
}

export default HostedStandaloneLaunch
