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

import { APPS_ROOT, applicationsRoutes } from '../applicationsRoutes'

/** Paths of hosted applications inside the Applications area. */
export const hostedRoutes = {
  root: APPS_ROOT,
  collection: applicationsRoutes.collection,
  create: () => `${APPS_ROOT}/new`,
  share: {
    path: `${APPS_ROOT}/share/:token`,
    url: (token: string) => `${APPS_ROOT}/share/${encodeURIComponent(token)}`,
  },
  /** The application's details page: cover, overview, versions and actions. */
  details: (id: string) => `${APPS_ROOT}/${id}`,
  /** Runs the application's active version. */
  view: (id: string) => `${APPS_ROOT}/${id}/view`,
  /** The app alone in a browser tab, without the CodeMie layout. */
  standalone: (id: string) => `${APPS_ROOT}/${id}/standalone`,
  edit: (id: string) => `${APPS_ROOT}/${id}/edit`,
  /** Runs one version of the application. */
  preview: (id: string, versionId: string) => `${APPS_ROOT}/${id}/preview/${versionId}`,
}
