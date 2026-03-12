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

import { useState, useEffect } from 'react'
import { subscribe } from 'valtio'

import { appInfoStore } from '@/store/appInfo'

export const useSidebarOffsetClass = () => {
  const [offsetClass, setOffsetClass] = useState<string | null>(null)

  const update = () => {
    if (!appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded)
      setOffsetClass('left-navbar')
    if (appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded)
      setOffsetClass('left-[calc(theme(spacing.navbar)+theme(spacing.sidebar))]')
    if (!appInfoStore.sidebarExpanded && appInfoStore.navigationExpanded)
      setOffsetClass('left-navbar-expanded')
    if (appInfoStore.sidebarExpanded && appInfoStore.navigationExpanded)
      setOffsetClass('left-[calc(theme(spacing.navbar-expanded)+theme(spacing.sidebar))]')
  }

  useEffect(() => {
    update()

    const unsubscribe = subscribe(appInfoStore, update)

    return () => {
      unsubscribe()
    }
  }, [])

  return offsetClass
}
