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

import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { userStore } from '@/store'

/**
 * Builds a lookup of technical project name -> human display name from the
 * current user's project roster. Only projects that actually have a display
 * name are included, so a hit can be treated as "a display name exists" —
 * useful for showing the human name as a hint next to the technical one.
 */
export const useProjectDisplayNames = (): Map<string, string> => {
  const { user } = useSnapshot(userStore)

  return useMemo(() => {
    const map = new Map<string, string>()
    user?.projects?.forEach((project) => {
      const displayName = project.display_name?.trim()
      if (displayName) map.set(project.name, displayName)
    })
    return map
  }, [user?.projects])
}
