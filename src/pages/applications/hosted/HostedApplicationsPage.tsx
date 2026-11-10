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

import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Spinner from '@/components/Spinner'
import { hostedApplicationsStore as store } from '@/store/hostedApplications'

import { APPLICATION_COLLECTIONS, platformApplicationsPath } from '../applicationCollections'
import ApplicationsSidebar from '../ApplicationsSidebar'
import HostedCatalogFilters from './HostedCatalogFilters'
import HostedCatalogResults from './HostedCatalogResults'
import { HOSTED_COLLECTIONS } from './hostedCollections'
import { useHostedApplicationCatalog } from './useHostedApplicationCatalog'
import { useHostedCardActions } from './useHostedCardActions'

const Loading = () => (
  <div className="flex justify-center py-16">
    <Spinner />
  </div>
)

const HostedApplicationsPage = () => {
  const catalog = useHostedApplicationCatalog()
  const { state, scope, isCurrent, setActionError } = catalog
  const cardActions = useHostedCardActions({
    isCurrent,
    onError: setActionError,
    onChanged: () => {
      store.loadApplications()
    },
  })

  const canView = !!state.capabilities?.view
  const canCreate = !!state.capabilities?.create
  const status = state.capabilitiesStatus
  const error = catalog.actionError ?? state.error

  return (
    <div className="flex h-full min-w-0">
      <ApplicationsSidebar activeCollection={scope}>
        {canView && <HostedCatalogFilters query={catalog.query} scope={scope} />}
      </ApplicationsSidebar>
      <PageLayout
        title={catalog.title}
        subtitle={APPLICATION_COLLECTIONS[scope].subtitle}
        rightContent={
          canCreate &&
          HOSTED_COLLECTIONS[scope].offersCreate && (
            <Button onClick={catalog.create}>
              <PlusSvg aria-hidden className="size-4" />
              Create application
            </Button>
          )
        }
      >
        <div className="flex min-w-0 flex-col gap-5 py-4">
          {!state.capabilities && status !== 'failed' && <Loading />}
          {!state.capabilities && status === 'failed' && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border-structural px-6 py-12 text-center">
              <h2 className="text-base font-semibold">Applications are unavailable right now</h2>
              <p className="max-w-md text-sm text-text-tertiary">
                Check your connection and try again. Platform apps are still available.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" onClick={catalog.retry}>
                  Retry
                </Button>
                <Button
                  variant="tertiary"
                  onClick={() => catalog.navigate(platformApplicationsPath())}
                >
                  Browse Platform apps
                </Button>
              </div>
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-2 rounded-lg border border-failed-secondary bg-failed-tertiary px-4 py-3 text-sm text-failed-secondary"
            >
              <span className="min-w-0 flex-1 break-words">{error}</span>
              <Button variant="tertiary" size="small" onClick={catalog.retry}>
                Retry
              </Button>
            </div>
          )}
          {canView && (
            <HostedCatalogResults
              items={state.items}
              loading={state.loading}
              hasMore={!!state.nextCursor}
              query={catalog.query}
              filtered={catalog.filtered}
              collection={scope}
              canCreate={canCreate}
              onCreate={catalog.create}
              onOpen={catalog.open}
              onLoadMore={() => store.loadApplications(true)}
              // View has its own button on the card.
              menuItems={(app) => cardActions.menuItems(app, ['open'])}
            />
          )}
        </div>
      </PageLayout>
      {cardActions.dialogs}
    </div>
  )
}
export default HostedApplicationsPage
