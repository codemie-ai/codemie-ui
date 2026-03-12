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

import { useEffect } from 'react'
import { matchRoutes, useLocation, useParams } from 'react-router'
import { proxy } from 'valtio'

import { router as hashRouter } from '@/router'

import { ParamsType, parseSearchParams, QueryType } from '../useVueRouter'

interface HistoryStoreItem {
  name: string
  params: ParamsType
  query: QueryType
}

interface HistoryStore {
  stack: HistoryStoreItem[]
  currentIndex: number
  updateStack: (item: HistoryStoreItem) => void
}

export const history = proxy<HistoryStore>({
  stack: [],
  currentIndex: -1,
  updateStack(item) {
    const nextIndex = this.currentIndex + 1
    this.stack = this.stack.slice(0, nextIndex)
    this.stack.push({ ...item })
    this.currentIndex = nextIndex
  },
})

export const useHistoryStack = () => {
  const location = useLocation()
  const params = useParams()

  useEffect(() => {
    const currentRoute = matchRoutes(hashRouter.routes, location.pathname)?.at(-1)
    if (!currentRoute) return

    history.updateStack({
      name: currentRoute.route.id,
      params,
      query: parseSearchParams(new URLSearchParams(location.search)),
    })
  }, [location, params])
}
