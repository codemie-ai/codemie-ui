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

/** Canonical in-app paths of the Applications area. `/apps` is the only catalog root. */
export const APPS_ROOT = '/apps'

/** The Applications area tabs, in order. Each is served by one collection provider. */
export const APPLICATION_COLLECTION_IDS = [
  'mine',
  'project',
  'marketplace',
  'shared',
  'platform',
] as const

export type ApplicationCollectionId = (typeof APPLICATION_COLLECTION_IDS)[number]

export const isApplicationCollection = (value?: string): value is ApplicationCollectionId =>
  APPLICATION_COLLECTION_IDS.includes(value as ApplicationCollectionId)

export const applicationsRoutes = {
  root: APPS_ROOT,
  /** My apps sits at the root; every other collection has its own path segment. */
  collection: (id: ApplicationCollectionId) => (id === 'mine' ? APPS_ROOT : `${APPS_ROOT}/${id}`),
}
