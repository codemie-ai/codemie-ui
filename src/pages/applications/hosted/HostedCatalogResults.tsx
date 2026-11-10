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

import ApplicationsIcon from '@/assets/icons/applications.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import type { NavigationMenuItem } from '@/components/NavigationMore/NavigationMore'
import Spinner from '@/components/Spinner'
import type { HostedApplication } from '@/types/entity/hostedApplication'

import HostedApplicationCard from './HostedApplicationCard'
import { HOSTED_COLLECTIONS, type HostedCollectionId } from './hostedCollections'

interface Props {
  items: readonly HostedApplication[]
  loading: boolean
  hasMore: boolean
  query: string
  filtered?: boolean
  collection: HostedCollectionId
  canCreate: boolean
  onCreate(): void
  onOpen(app: HostedApplication): void
  onLoadMore(): void
  menuItems?(app: HostedApplication): NavigationMenuItem[]
}

const HostedCatalogResults = ({
  items,
  loading,
  hasMore,
  query,
  filtered = false,
  collection,
  canCreate,
  onCreate,
  onOpen,
  onLoadMore,
  menuItems,
}: Props) => {
  if (loading && !items.length)
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  if (!items.length) {
    const searching = !!query || filtered
    const { empty, offersCreate } = HOSTED_COLLECTIONS[collection]
    let { title, description } = empty
    if (searching) {
      title = 'No matching applications'
      description = 'Try another name or description, or clear the filters.'
    }
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-structural px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl border border-border-structural bg-surface-base-secondary">
          <ApplicationsIcon aria-hidden className="size-6 text-icon-accent" />
        </div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="max-w-md text-sm text-text-tertiary">{description}</p>
        {offersCreate && !searching && canCreate && (
          <Button className="mt-2" onClick={onCreate}>
            <PlusSvg aria-hidden className="size-4" />
            Create application
          </Button>
        )}
      </div>
    )
  }
  return (
    <>
      <section
        aria-label="Applications"
        aria-busy={loading}
        className="grid grid-cols-1 gap-4 card-grid-2:grid-cols-2 card-grid-3:grid-cols-3"
      >
        {items.map((app) => (
          <HostedApplicationCard
            key={app.id}
            application={app}
            onOpen={onOpen}
            menuItems={menuItems?.(app)}
          />
        ))}
      </section>
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="secondary" disabled={loading} isLoading={loading} onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </>
  )
}

export default HostedCatalogResults
