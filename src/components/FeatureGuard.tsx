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

import { FC, ReactNode } from 'react'
import { useSnapshot } from 'valtio'

import { FeatureFlag } from '@/constants'
import { appInfoStore } from '@/store/appInfo'
import { isConfigItemEnabled } from '@/utils/settings'

interface FeatureGuardProps {
  featureFlag: FeatureFlag
  children: ReactNode
}

/**
 * Component that guards route access based on feature flags.
 * Throws 404 Response if the feature is disabled, triggering ErrorBoundary.
 *
 * @example
 * ```tsx
 * <Route
 *   path="/analytics"
 *   element={
 *     <FeatureGuard featureFlag="features:enterpriseEdition">
 *       <AnalyticsPage />
 *     </FeatureGuard>
 *   }
 * />
 * ```
 */
export const FeatureGuard: FC<FeatureGuardProps> = ({ featureFlag, children }) => {
  const { configs } = useSnapshot(appInfoStore)

  const isEnabled = isConfigItemEnabled(configs, featureFlag)
  if (!isEnabled) {
    const error = new Error('Not Found')

    // React Router redirects to 404 page only when error has these fields.
    // No proper built-in way to throw 404 error is available in the lib
    Object.assign(error, {
      status: 404,
      statusText: 'Not Found',
      internal: false,
      data: null,
    })

    throw error
  }

  return children
}
