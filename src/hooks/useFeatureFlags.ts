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

import { FEATURE_FLAGS } from '@/constants/featureFlags'
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

export const useMcpEnabled = (): FeatureFlagResult => {
  return useFeatureFlag(FEATURE_FLAGS.MCP_CONNECT)
}

export const useFavoritesEnabled = (): FeatureFlagResult => {
  return useFeatureFlag(FEATURE_FLAGS.FAVORITES)
}

export const usePinnedAssistantsEnabled = (): FeatureFlagResult => {
  return useFeatureFlag(FEATURE_FLAGS.PINNED_ASSISTANTS)
}

export const useFavoritesPageEnabled = (): FeatureFlagResult => {
  return useFeatureFlag(FEATURE_FLAGS.FAVORITES_PAGE)
}

export const useRequestHedgingEnabled = (): FeatureFlagResult => {
  return useFeatureFlag(FEATURE_FLAGS.REQUEST_HEDGING)
}

export const useUserManagementEnabled = (): FeatureFlagResult => {
  return useFeatureFlag(FEATURE_FLAGS.USER_MANAGEMENT)
}

export const useBudgetManagementEnabled = (): FeatureFlagResult => {
  return useFeatureFlag(FEATURE_FLAGS.BUDGET_MANAGEMENT)
}

export const useProjectChargebackEnabled = (): FeatureFlagResult => {
  return useFeatureFlag(FEATURE_FLAGS.PROJECT_CHARGEBACK)
}

export const useEnterpriseEnabled = (): FeatureFlagResult => {
  return useFeatureFlag(FEATURE_FLAGS.ENTERPRISE_EDITION)
}

export const useInteractiveElementsEnabled = (): FeatureFlagResult => {
  return useFeatureFlag('features:interactiveElements')
}

export const useTeamsEnabled = (): FeatureFlagResult => {
  return useFeatureFlag(FEATURE_FLAGS.TEAMS_BOT_INTEGRATION)
}

export const useWorkflowAIEnabled = (): FeatureFlagResult => {
  return useFeatureFlag(FEATURE_FLAGS.WORKFLOW_AI)
}

export const useSubWorkflowEnabled = (): FeatureFlagResult => {
  return useFeatureFlag(FEATURE_FLAGS.SUB_WORKFLOW)
}
