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

import { hostedApplicationsStore as store } from '@/store/hostedApplications'

import { isManager } from './hostedAccess'

export async function loadHostedDetails(id: string, signal: AbortSignal) {
  const app = await store.getApplication(id, signal)
  const page = isManager(app)
    ? await store.listVersionPage(id, undefined, signal)
    : { items: [], next_cursor: null }
  const pinned = [
    ...new Set(
      [app.active_version_id, app.selected_version_id].filter((value): value is string => !!value)
    ),
  ]
  const settled = await Promise.allSettled(
    pinned
      .filter((value) => !page.items.some((item) => item.id === value))
      .map((value) => store.getVersion(id, value, signal))
  )
  // A pinned version this person cannot read (403/404) is left out; the application still shows.
  const extra = settled.flatMap((result) => {
    if (result.status === 'fulfilled') return [result.value]
    const status = (result.reason as { status?: number } | null)?.status
    if (status === 403 || status === 404) return []
    throw result.reason
  })
  return { app, page, versions: [...page.items, ...extra] }
}
