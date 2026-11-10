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
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useSnapshot } from 'valtio'

import {
  hostedApplicationsStore as store,
  hostedAuthenticationGeneration,
} from '@/store/hostedApplications'
import type { HostedApplication } from '@/types/entity/hostedApplication'

import { APPLICATION_COLLECTIONS } from '../applicationCollections'
import {
  hasHostedFilters,
  isHostedCollection,
  loadHostedCollection,
  readHostedCatalogSearch,
  type HostedCollectionId,
} from './hostedCollections'
import { hostedRoutes } from './hostedRoutes'

const SEARCH_DEBOUNCE_MS = 300

export const useHostedApplicationCatalog = () => {
  const state = useSnapshot(store)
  const navigate = useNavigate()
  const location = useLocation()
  const authentication = hostedAuthenticationGeneration()
  const contextPath = location.pathname + (location.search ?? '')
  const visit = useRef({ path: contextPath, authentication, generation: 0 })
  if (visit.current.path !== contextPath || visit.current.authentication !== authentication)
    visit.current = {
      path: contextPath,
      authentication,
      generation: visit.current.generation + 1,
    }
  const { generation } = visit.current
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const isCurrent = useCallback(
    () =>
      alive.current &&
      visit.current.generation === generation &&
      authentication === hostedAuthenticationGeneration(),
    [generation, authentication]
  )
  const [search] = useSearchParams()
  const tail = location.pathname.split('/').filter(Boolean).at(-1)
  const scope: HostedCollectionId = isHostedCollection(tail) ? tail : 'mine'
  // The collection registry decides which URL filters this tab reads and sends.
  const catalogSearch = readHostedCatalogSearch(search, scope)
  const { query } = catalogSearch
  // A new object on every render; the effect below follows its content.
  const searchKey = JSON.stringify(catalogSearch)
  // The create page returns to the tab it was opened from.
  const create = () => navigate(hostedRoutes.create(), { state: { from: scope } })
  const [actionError, setActionError] = useState<string | null>(null)
  const [contextRevision, setContextRevision] = useState(0)

  useEffect(() => {
    store.ensureCapabilities()
  }, [])
  // An error belongs to the collection it happened in.
  useEffect(() => setActionError(null), [contextPath])

  // Scope and filter changes apply at once (and clear stale results in the store);
  // only free-text search is debounced while the user types.
  const lastQuery = useRef(query)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    if (state.capabilities?.view) {
      // Each collection loads its own list (MOD-2) with the filters it declares.
      const apply = () => loadHostedCollection(scope, JSON.parse(searchKey))
      const typing = lastQuery.current !== query
      lastQuery.current = query
      if (typing) timer = setTimeout(apply, SEARCH_DEBOUNCE_MS)
      else apply()
    }
    return () => clearTimeout(timer)
  }, [scope, searchKey, state.capabilities?.view, contextRevision])

  const open = (app: HostedApplication) => navigate(hostedRoutes.view(app.id))
  return {
    state,
    navigate,
    scope,
    query,
    filtered: hasHostedFilters(scope, catalogSearch),
    create,
    actionError,
    setActionError,
    open,
    isCurrent,
    retry: () => {
      setActionError(null)
      setContextRevision((value) => value + 1)
      store.ensureCapabilities(true)
    },
    title: APPLICATION_COLLECTIONS[scope].label,
  }
}
