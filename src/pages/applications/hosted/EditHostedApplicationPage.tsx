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

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Spinner from '@/components/Spinner'
import { hostedApplicationsStore as store, hostedErrorMessage } from '@/store/hostedApplications'
import type { HostedApplication } from '@/types/entity/hostedApplication'
import { HOSTED_UUID } from '@/utils/hostedApplicationLaunch'

import ApplicationsSidebar from '../ApplicationsSidebar'
import { isManager } from './hostedAccess'
import HostedApplicationForm from './HostedApplicationForm'
import HostedNotAvailable from './HostedNotAvailable'
import { hostedRoutes } from './hostedRoutes'
import { hostedApplicationsOff, useHostedFeatureRedirect } from './useHostedFeatureRedirect'

type Loaded =
  | { status: 'loading' }
  | { status: 'ready'; application: HostedApplication }
  | { status: 'not_available' }
  | { status: 'failed'; error: string }

/** Where the edit page was opened from; the details page passes `details` to be returned to. */
export interface HostedEditState {
  from?: 'details'
}

/** The edit application page: name, description, project and sharing, for its managers only. */
const EditHostedApplicationPage = () => {
  useHostedFeatureRedirect()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' })
  const pending = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setLoaded({ status: 'loading' })
    // Missing, malformed and forbidden look the same: nothing about the application is revealed.
    if (!HOSTED_UUID.test(id)) {
      setLoaded({ status: 'not_available' })
      return
    }
    // Custom applications are off: the spinner stays while the redirect to Platform apps takes over.
    if (await hostedApplicationsOff()) return
    try {
      const application = await store.getApplication(id, controller.signal)
      if (controller.signal.aborted) return
      // Only managers edit; anyone else sees the details page instead.
      if (!isManager(application)) {
        navigate(hostedRoutes.details(id), { replace: true })
        return
      }
      setLoaded({ status: 'ready', application })
    } catch (cause) {
      if (controller.signal.aborted || (cause as Error)?.name === 'AbortError') return
      const status = (cause as { status?: number } | null)?.status
      setLoaded(
        status === 404 || status === 403
          ? { status: 'not_available' }
          : { status: 'failed', error: hostedErrorMessage(cause) }
      )
    }
  }, [id])

  useEffect(() => {
    store.ensureCapabilities()
    load()
    return () => pending.current?.abort()
  }, [load])

  // Back to the details page: the one it came from, or a fresh one for a link from a card.
  const fromDetails = (location.state as HostedEditState | null)?.from === 'details'
  const leave = () =>
    fromDetails ? navigate(-1) : navigate(hostedRoutes.details(id), { replace: true })

  return (
    <div className="flex h-full min-w-0">
      <ApplicationsSidebar />
      {loaded.status === 'ready' ? (
        <HostedApplicationForm application={loaded.application} onCancel={leave} onSaved={leave} />
      ) : (
        <PageLayout title="Edit application" showBack onBack={leave}>
          {loaded.status === 'loading' && (
            <div className="flex justify-center py-24">
              <Spinner />
            </div>
          )}
          {loaded.status === 'not_available' && <HostedNotAvailable />}
          {loaded.status === 'failed' && (
            <div className="flex flex-col items-center gap-3 py-24 text-center">
              <h2 className="text-xl font-semibold">Application unavailable</h2>
              <p role="alert" className="max-w-md break-words text-sm text-text-tertiary">
                {loaded.error}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={load}>
                  Retry
                </Button>
                <Link
                  to={hostedRoutes.root}
                  className="self-center text-sm text-text-accent hover:underline"
                >
                  Back to Applications
                </Link>
              </div>
            </div>
          )}
        </PageLayout>
      )}
    </div>
  )
}

export default EditHostedApplicationPage
