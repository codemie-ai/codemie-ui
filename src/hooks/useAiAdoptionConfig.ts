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

import { useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import { analyticsStore } from '@/store/analytics'
import { AiAdoptionConfig, AnalyticsDashboard, ConfigParam } from '@/types/analytics'
import toaster from '@/utils/toaster'

interface UseAiAdoptionConfigOptions {
  fetchOnMount?: boolean
  onSaveSuccess?: () => void
}

export const useAiAdoptionConfig = (options: UseAiAdoptionConfigOptions = {}) => {
  const { fetchOnMount = false, onSaveSuccess } = options
  const { aiAdoptionConfig, loading, error } = useSnapshot(analyticsStore)
  const [editingConfig, setEditingConfig] = useState<AiAdoptionConfig | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showResetConfirmation, setShowResetConfirmation] = useState(false)

  useEffect(() => {
    if (fetchOnMount) {
      analyticsStore.fetchAiAdoptionConfig(AnalyticsDashboard.adoption).catch(console.error)
    }
  }, [fetchOnMount])

  useEffect(() => {
    if (aiAdoptionConfig?.data) {
      setEditingConfig(JSON.parse(JSON.stringify(aiAdoptionConfig.data)))
    }
  }, [aiAdoptionConfig])

  const handleCancel = useCallback(
    (section: string) => {
      if (aiAdoptionConfig?.data) {
        setEditingConfig(JSON.parse(JSON.stringify(aiAdoptionConfig.data)))
      }
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        Object.keys(newErrors).forEach((key) => {
          if (key.startsWith(section)) {
            delete newErrors[key]
          }
        })
        return newErrors
      })
    },
    [aiAdoptionConfig]
  )

  const validateWeights = (
    weights: Record<string, ConfigParam>,
    section: string,
    expectedSum = 1.0
  ): boolean => {
    const total = Object.values(weights).reduce((sum, param) => sum + Number(param.value), 0)
    const tolerance = expectedSum === 1.0 ? 0.01 : 0.1
    const isValid = Math.abs(total - expectedSum) < tolerance

    if (!isValid) {
      const displayFormat = expectedSum === 1.0 ? total.toFixed(2) : `${total.toFixed(1)}%`
      const expectedFormat = expectedSum === 1.0 ? expectedSum.toFixed(1) : `${expectedSum}%`
      setValidationErrors((prev) => ({
        ...prev,
        [section]: `Weights must sum to ${expectedFormat} (current: ${displayFormat})`,
      }))
    } else {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[section]
        return newErrors
      })
    }

    return isValid
  }

  const handleSaveMaturity = useCallback(async () => {
    if (!editingConfig) return

    // Validate adoption index weights sum to 1.0
    const weights = editingConfig.ai_maturity.adoption_index_weights
    if (!validateWeights(weights, 'ai_maturity-adoption-index-weights')) {
      return
    }

    try {
      await analyticsStore.saveAiAdoptionConfig(editingConfig)
      toaster.info('Configuration Saved<br/>AI Maturity settings saved successfully')
      onSaveSuccess?.()
    } catch (error) {
      console.error('Failed to save maturity settings:', error)
      toaster.error('Save Failed<br/>Failed to save AI Maturity settings')
    }
  }, [editingConfig, onSaveSuccess])

  const createDimensionSaveHandler = useCallback(
    (dimensionKey: keyof AiAdoptionConfig, dimensionId: string) => {
      return async () => {
        if (!editingConfig) return

        const dimension = editingConfig[dimensionKey] as any
        if (!dimension?.component_weights) return

        if (!validateWeights(dimension.component_weights, `${dimensionId}-weights`)) {
          return
        }

        try {
          await analyticsStore.saveAiAdoptionConfig(editingConfig)
          const dimensionName = dimensionId
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
          toaster.info(`Configuration Saved<br/>${dimensionName} settings saved successfully`)
          onSaveSuccess?.()
        } catch (error) {
          console.error(`Failed to save ${dimensionId} settings:`, error)
          toaster.error(`Save Failed<br/>Failed to save ${dimensionId} settings`)
        }
      }
    },
    [editingConfig, onSaveSuccess]
  )

  const handleSaveUserEngagement = createDimensionSaveHandler('user_engagement', 'user_engagement')
  const handleSaveAssetReusability = createDimensionSaveHandler(
    'asset_reusability',
    'asset_reusability'
  )
  const handleSaveExpertiseDistribution = createDimensionSaveHandler(
    'expertise_distribution',
    'expertise_distribution'
  )
  const handleSaveFeatureAdoption = createDimensionSaveHandler(
    'feature_adoption',
    'feature_adoption'
  )

  const handleReset = useCallback(() => {
    setShowResetConfirmation(true)
  }, [])

  const handleResetConfirm = useCallback(async () => {
    try {
      await analyticsStore.resetAiAdoptionConfig()
      setValidationErrors({})
      toaster.info('Configuration Reset<br/>Configuration reset to defaults successfully')
      onSaveSuccess?.()
    } catch (error) {
      console.error('Failed to reset config:', error)
      toaster.error('Reset Failed<br/>Failed to reset configuration')
    } finally {
      setShowResetConfirmation(false)
    }
  }, [onSaveSuccess])

  const handleResetCancel = useCallback(() => {
    setShowResetConfirmation(false)
  }, [])

  const updateNestedValue = useCallback((path: string[], value: string) => {
    setEditingConfig((prev) => {
      if (!prev) return prev
      const newConfig = { ...prev }
      let current: any = newConfig

      for (let i = 0; i < path.length - 1; i += 1) {
        current[path[i]] = { ...current[path[i]] }
        current = current[path[i]]
      }

      const lastKey = path[path.length - 1]
      current[lastKey] = {
        ...current[lastKey],
        value: Number.isNaN(Number(value)) ? value : Number(value),
      }

      return newConfig
    })
  }, [])

  return {
    aiAdoptionConfig,
    loading,
    error,
    editingConfig,
    validationErrors,
    showResetConfirmation,
    handleCancel,
    handleSaveMaturity,
    handleSaveUserEngagement,
    handleSaveAssetReusability,
    handleSaveExpertiseDistribution,
    handleSaveFeatureAdoption,
    handleReset,
    handleResetConfirm,
    handleResetCancel,
    updateNestedValue,
  }
}
