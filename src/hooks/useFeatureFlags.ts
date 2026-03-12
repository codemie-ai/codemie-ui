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

/**
 * Feature Flag Hooks
 *
 * React hooks for reactive feature flag checking.
 * For non-React contexts, use utilities from @/utils/featureFlags instead.
 */

import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { appInfoStore } from '@/store/appInfo'

/**
 * Result of feature flag check with loading state
 */
export type FeatureFlagResult = [isEnabled: boolean, isLoaded: boolean]

/**
 * React hook to check if a feature is enabled (reactive)
 *
 * This hook provides automatic re-rendering when the config changes.
 * Returns a tuple [isEnabled, isLoaded] to handle loading states properly.
 *
 * @param featureName - The feature config ID to check
 * @returns Tuple of [isEnabled, isLoaded] where:
 *   - isEnabled: boolean indicating if feature is enabled
 *   - isLoaded: boolean indicating if config has been fetched
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const [isEnabled, isLoaded] = useFeatureFlag('mcpConnect')
 *
 *   if (!isLoaded) {
 *     return <LoadingSpinner />
 *   }
 *
 *   return (
 *     <div>
 *       {isEnabled && <MCPFeatures />}
 *     </div>
 *   )
 * }
 * ```
 */
export const useFeatureFlag = (featureName: string): FeatureFlagResult => {
  const { configs, isConfigFetched } = useSnapshot(appInfoStore)

  return useMemo(() => {
    const config = configs.find((c) => c.id === featureName)
    const isEnabled = config?.settings?.enabled ?? false
    return [isEnabled, isConfigFetched]
  }, [configs, isConfigFetched, featureName])
}

/**
 * React hook to check if MCP (Model Context Protocol) feature is enabled
 *
 * Convenience hook specifically for the mcpConnect feature.
 * Returns a tuple [isEnabled, isLoaded] to handle loading states properly.
 *
 * @returns Tuple of [isEnabled, isLoaded] where:
 *   - isEnabled: boolean indicating if mcpConnect is enabled
 *   - isLoaded: boolean indicating if config has been fetched
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const [isMcpEnabled, isLoaded] = useMcpEnabled()
 *
 *   if (!isLoaded) {
 *     return <LoadingSpinner />
 *   }
 *
 *   return (
 *     <div>
 *       {isMcpEnabled && <MCPFeatures />}
 *     </div>
 *   )
 * }
 * ```
 */
export const useMcpEnabled = (): FeatureFlagResult => {
  return useFeatureFlag('mcpConnect')
}
