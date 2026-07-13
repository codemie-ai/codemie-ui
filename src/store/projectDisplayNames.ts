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

import { proxy } from 'valtio'

import api from '@/utils/api'

interface ProjectDisplayNamesStore {
  /**
   * Technical project name -> resolved human display name. An empty string
   * marks a project as "resolved, but no display name" so it is never
   * fetched again.
   */
  cache: Record<string, string>
  ensure: (projectName: string) => Promise<void>
  invalidate: (projectName: string) => void
}

/**
 * Tracks in-flight lookups so concurrent renders — e.g. many rows of a table
 * showing the same project — do not fire duplicate requests. Kept outside the
 * proxy because it is bookkeeping, not reactive UI state.
 */
const inFlight = new Set<string>()

/**
 * Reactive cache of project display names resolved on demand.
 *
 * The roster-based {@link useProjectDisplayNames} hook only knows display names
 * for projects the current user is assigned to. Super Admins, however, can view
 * entities in projects they are not assigned to, so their display names must be
 * fetched individually. This store performs that lookup against the projects
 * endpoint directly — deliberately not via `projectsStore.getProject`, which
 * would mutate `selectedProject` and the global loading flag as a side effect.
 */
export const projectDisplayNamesStore = proxy<ProjectDisplayNamesStore>({
  cache: {},

  async ensure(projectName) {
    if (!projectName) return
    if (projectName in this.cache) return
    if (inFlight.has(projectName)) return

    inFlight.add(projectName)
    try {
      const response = await api.get(`v1/projects/${encodeURIComponent(projectName)}`)
      const data = await response.json()
      // Cache the trimmed display name, or '' to mark the lookup resolved with
      // no name; either way the project is never fetched again.
      this.cache[projectName] = data?.display_name?.trim() || ''
    } catch {
      // A failed lookup (e.g. the project is not visible) simply yields no
      // tooltip. Leave it uncached so a later attempt can still succeed.
    } finally {
      inFlight.delete(projectName)
    }
  },

  /**
   * Drops a cached lookup so the next `ensure` call re-fetches it — used
   * after a project's display name changes so stale entries don't linger
   * for the rest of the session.
   */
  invalidate(projectName) {
    delete this.cache[projectName]
  },
})
