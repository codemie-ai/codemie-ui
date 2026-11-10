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

import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Spinner from '@/components/Spinner'
import { hostedApplicationsStore as store } from '@/store/hostedApplications'

import ApplicationsSidebar from '../ApplicationsSidebar'
import HostedApplicationForm from './HostedApplicationForm'
import { isHostedCollection } from './hostedCollections'
import { hostedRoutes } from './hostedRoutes'
import { useHostedFeatureRedirect } from './useHostedFeatureRedirect'

/** The create application page, opened from a catalog collection (`state.from`) or a direct link. */
const NewHostedApplicationPage = () => {
  useHostedFeatureRedirect()
  const navigate = useNavigate()
  const location = useLocation()
  const { capabilities, capabilitiesStatus } = useSnapshot(store)
  const origin = (location.state as { from?: string } | null)?.from
  const catalog = hostedRoutes.collection(isHostedCollection(origin) ? origin : 'mine')
  const canCreate = !!capabilities?.create

  useEffect(() => {
    store.ensureCapabilities()
  }, [])
  // Someone who cannot create lands on the catalog, as the hidden Create button implies.
  useEffect(() => {
    if (capabilities?.view && !capabilities.create) navigate(catalog, { replace: true })
  }, [capabilities?.view, capabilities?.create])

  // Back to the collection the page was opened from, with its filters; a direct link has none.
  const cancel = () => (origin ? navigate(-1) : navigate(catalog, { replace: true }))

  return (
    <div className="flex h-full min-w-0">
      <ApplicationsSidebar />
      {canCreate ? (
        <HostedApplicationForm
          onCancel={cancel}
          // Replace /apps/new so Back returns to the catalog, not to the create page.
          onSaved={(app) => navigate(hostedRoutes.details(app.id), { replace: true })}
        />
      ) : (
        <PageLayout title="Create application" showBack onBack={cancel}>
          {capabilitiesStatus === 'failed' ? (
            <div className="flex flex-col items-center gap-3 py-24 text-center">
              <h2 className="text-xl font-semibold">Applications are unavailable right now</h2>
              <p className="max-w-md text-sm text-text-tertiary">
                Check your connection and try again.
              </p>
              <Button variant="secondary" onClick={() => store.ensureCapabilities(true)}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex justify-center py-24">
              <Spinner />
            </div>
          )}
        </PageLayout>
      )}
    </div>
  )
}

export default NewHostedApplicationPage
