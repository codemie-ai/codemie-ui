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

import { hostedApplicationsStore as store, type CatalogFilters } from '@/store/hostedApplications'
import {
  HOSTED_SHARED_FILTERS,
  HOSTED_STATUS_FILTERS,
  type HostedScope,
  type HostedSharedFilter,
  type HostedStatusFilter,
} from '@/types/entity/hostedApplication'

import type { ApplicationCollectionId } from '../applicationsRoutes'

export type HostedCollectionId = Exclude<ApplicationCollectionId, 'platform'>

const MAX_FILTER_LENGTH = 200

/** The catalog filters read from the URL; a filter the tab does not accept is left out. */
export interface HostedCatalogSearch {
  query: string
  project: string[]
  createdBy?: string
  shared?: HostedSharedFilter
  status?: HostedStatusFilter
}

/** URL keys a hosted tab may accept; the API rejects any its scope does not support. */
export type HostedFilterKey = 'project' | 'created_by' | 'shared' | 'status'

interface HostedFilter {
  /** Reads the key from the URL; unknown values are ignored. */
  read(search: URLSearchParams): Partial<HostedCatalogSearch>
  /** The API parameters it sends; nothing while it is unset. */
  params(search: HostedCatalogSearch): Partial<CatalogFilters>
}

const pick = <T extends string>(value: string | null, allowed: readonly T[]) =>
  allowed.includes(value as T) ? (value as T) : undefined

/** How each URL filter is read and which API parameter it becomes. */
const HOSTED_FILTERS: Record<HostedFilterKey, HostedFilter> = {
  project: {
    read: (search) => ({ project: [...new Set(search.getAll('project').filter(Boolean))] }),
    params: ({ project }) => (project.length ? { project } : {}),
  },
  created_by: {
    read: (search) => {
      const createdBy = (search.get('created_by') ?? '').slice(0, MAX_FILTER_LENGTH)
      return createdBy ? { createdBy } : {}
    },
    params: ({ createdBy }) => (createdBy ? { created_by: createdBy } : {}),
  },
  shared: {
    read: (search) => {
      const shared = pick(search.get('shared'), HOSTED_SHARED_FILTERS)
      return shared ? { shared } : {}
    },
    params: ({ shared }) => (shared ? { shared } : {}),
  },
  status: {
    read: (search) => {
      const status = pick(search.get('status'), HOSTED_STATUS_FILTERS)
      return status ? { status } : {}
    },
    params: ({ status }) => (status ? { status } : {}),
  },
}

/** One Applications tab served by hosted applications. */
export interface HostedCollection {
  /** The catalog API scope that lists this tab. */
  scope: HostedScope
  /**
   * The URL filters this tab accepts, in the order the filter bar shows them. The URL reader,
   * the filter bar and the loader read only these; any other key is dropped and never sent.
   */
  filters: readonly HostedFilterKey[]
  empty: { title: string; description: string }
  /** The tab offers Create application, in its header and when it is empty. */
  offersCreate?: boolean
}

/** Filters every hosted tab accepts. */
const COMMON_FILTERS: readonly HostedFilterKey[] = ['project', 'created_by']

export const HOSTED_COLLECTIONS: Record<HostedCollectionId, HostedCollection> = {
  mine: {
    scope: 'mine',
    filters: [...COMMON_FILTERS, 'shared', 'status'],
    empty: {
      title: 'Bring an idea to life',
      description:
        'Upload an HTML visual or a prebuilt static app. It stays private until you share it.',
    },
    offersCreate: true,
  },
  project: {
    scope: 'project',
    filters: COMMON_FILTERS,
    empty: {
      title: 'Nothing shared with your project yet',
      description: 'Applications shared with your project will appear here.',
    },
  },
  marketplace: {
    scope: 'marketplace',
    filters: COMMON_FILTERS,
    empty: {
      title: 'Nothing in the marketplace yet',
      description: 'Applications published to the marketplace will appear here.',
    },
  },
  shared: {
    scope: 'shared',
    filters: COMMON_FILTERS,
    empty: {
      title: 'Nothing shared with you yet',
      description: 'Applications that colleagues share with you will appear here.',
    },
  },
}

export const isHostedCollection = (value?: string): value is HostedCollectionId =>
  !!value && Object.hasOwn(HOSTED_COLLECTIONS, value)

/** Whether collection `id` accepts the URL filter `key`. */
export const acceptsFilter = (id: HostedCollectionId, key: HostedFilterKey) =>
  HOSTED_COLLECTIONS[id].filters.includes(key)

/** Reads the filters `id` accepts from the URL; everything else in it is ignored. */
export const readHostedCatalogSearch = (
  search: URLSearchParams,
  id: HostedCollectionId
): HostedCatalogSearch =>
  Object.assign(
    { query: (search.get('q') ?? '').slice(0, MAX_FILTER_LENGTH), project: [] },
    ...HOSTED_COLLECTIONS[id].filters.map((key) => HOSTED_FILTERS[key].read(search))
  )

/** The catalog request for `id`: its scope plus the API parameters of the filters it accepts. */
export const hostedCatalogParams = (
  id: HostedCollectionId,
  search: HostedCatalogSearch
): CatalogFilters =>
  Object.assign(
    { scope: HOSTED_COLLECTIONS[id].scope, q: search.query, sort: 'updated_desc' as const },
    ...HOSTED_COLLECTIONS[id].filters.map((key) => HOSTED_FILTERS[key].params(search))
  )

/** Whether any filter `id` accepts is set (the search text aside). */
export const hasHostedFilters = (id: HostedCollectionId, search: HostedCatalogSearch) =>
  Object.keys(hostedCatalogParams(id, search)).some((key) => !['scope', 'q', 'sort'].includes(key))

/** Fills the hosted store with collection `id` for the filters in the URL. */
export const loadHostedCollection = (id: HostedCollectionId, search: HostedCatalogSearch) => {
  store.setFilters(hostedCatalogParams(id, search))
  store.loadApplications()
}
