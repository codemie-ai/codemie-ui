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

import { useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { userStore } from '@/store'
import { projectDisplayNamesStore } from '@/store/projectDisplayNames'

/**
 * Builds a lookup of technical project name -> human display name.
 *
 * Display names come from two sources:
 *  - the current user's project roster (covers projects the user is assigned
 *    to — a hit means a display name exists), and
 *  - for Super Admins, an on-demand cache for projects they are *not* assigned
 *    to. Super Admins can view entities across projects outside their roster,
 *    so pass the project name(s) rendered on the current view via
 *    `namesToResolve` and the hook lazily fetches their display names.
 *
 * Non-admin users, and projects already covered by the roster, never trigger a
 * fetch, so existing behaviour is unchanged.
 */
export const useProjectDisplayNames = (
  namesToResolve?: string | Array<string | null | undefined>
): Map<string, string> => {
  const { user } = useSnapshot(userStore)
  const { cache } = useSnapshot(projectDisplayNamesStore)

  const rosterNames = useMemo(() => {
    const map = new Map<string, string>()
    user?.projects?.forEach((project) => {
      const displayName = project.display_name?.trim()
      if (displayName) map.set(project.name, displayName)
    })
    return map
  }, [user?.projects])

  const requestedNames = useMemo(() => {
    if (!namesToResolve) return [] as string[]
    const list = Array.isArray(namesToResolve) ? namesToResolve : [namesToResolve]
    return list.filter((name): name is string => !!name)
  }, [namesToResolve])

  useEffect(() => {
    if (!user?.isAdmin) return
    requestedNames.forEach((name) => {
      if (!rosterNames.has(name)) projectDisplayNamesStore.ensure(name)
    })
  }, [user?.isAdmin, requestedNames, rosterNames])

  return useMemo(() => {
    const map = new Map(rosterNames)
    Object.entries(cache).forEach(([name, displayName]) => {
      if (displayName && !map.has(name)) map.set(name, displayName)
    })
    return map
  }, [rosterNames, cache])
}
