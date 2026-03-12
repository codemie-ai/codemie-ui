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
 * Feature Flag Utilities
 *
 * Non-reactive utility functions for feature flag checking.
 * For React components, use hooks from @/hooks/useFeatureFlags instead.
 */

import { appInfoStore } from '@/store/appInfo'

/**
 * Check if a feature is enabled (non-reactive utility)
 *
 * For React components, prefer useFeatureFlag() hook which is reactive.
 * For non-React contexts, consider awaiting config initialization first.
 *
 * @param featureName - The feature config ID to check
 * @returns boolean indicating if feature is enabled
 *
 * @example
 * ```ts
 * // In non-React context (after initialization)
 * await appInfoStore.fetchCustomerConfig()
 * if (isFeatureEnabled('mcpConnect')) {
 *   // Do something
 * }
 * ```
 */
export const isFeatureEnabled = (featureName: string): boolean => {
  // Return false if configs haven't been fetched yet
  if (!appInfoStore.isConfigFetched || !appInfoStore.configs) {
    return false
  }
  const config = appInfoStore.configs.find((c) => c.id === featureName)
  return config?.settings?.enabled ?? false
}

/**
 * Check if MCP feature is enabled (non-reactive utility)
 *
 * Convenience function specifically for the mcpConnect feature.
 * Equivalent to isFeatureEnabled('mcpConnect').
 *
 * @returns boolean indicating if mcpConnect is enabled
 */
export const isMcpEnabled = (): boolean => {
  return isFeatureEnabled('mcpConnect')
}
