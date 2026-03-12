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

import { useCallback, useMemo, useEffect } from 'react'
import { UseFormGetValues, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { useSnapshot } from 'valtio'

import { TEXT_EMBEDDING_ADA, GPT_3_5_TURBO } from '@/constants'
import { INDEX_TYPES } from '@/constants/dataSources'
import { appInfoStore } from '@/store/appInfo'
import { userSettingsStore } from '@/store/userSettings'
import { getConfigItemSettings, isConfigItemEnabled } from '@/utils/settings'

import { FormValues } from './useEditPopupForm'

interface UseEditPopupProps {
  getValues: UseFormGetValues<FormValues>
  setValue: UseFormSetValue<FormValues>
  watch: UseFormWatch<FormValues>
}

export const useEditPopup = ({ getValues, setValue, watch }: UseEditPopupProps) => {
  const projectName = watch('projectName')
  const indexType = watch('indexType')
  const { settings } = useSnapshot(userSettingsStore) as typeof userSettingsStore

  const getSettingOptions = useCallback(
    (indexType) => {
      const allSettings = settings[indexType] || []
      return allSettings.filter(
        (setting) => setting.project_name === projectName || setting.is_global
      )
    },
    [projectName, settings]
  )

  const filteredSettings = useMemo(
    () => ({
      [INDEX_TYPES.CONFLUENCE]: getSettingOptions(INDEX_TYPES.CONFLUENCE),
      [INDEX_TYPES.JIRA]: getSettingOptions(INDEX_TYPES.JIRA),
      [INDEX_TYPES.XRAY]: getSettingOptions(INDEX_TYPES.XRAY),
      [INDEX_TYPES.GIT]: getSettingOptions(INDEX_TYPES.GIT),
      [INDEX_TYPES.AZURE_DEVOPS_WIKI]: getSettingOptions('azuredevops'),
      [INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM]: getSettingOptions('azuredevops'),
    }),
    [getSettingOptions]
  )

  const checkCustomerConfig = async () => {
    const customerEnabledComponents = await appInfoStore.fetchCustomerConfig()
    const isEnabled = isConfigItemEnabled(customerEnabledComponents, 'userGuide')
    return {
      googleDocsGuideEnabled: isEnabled,
      googleDocsGuideConfig:
        isEnabled && getConfigItemSettings(customerEnabledComponents, 'userGuide'),
    }
  }

  const getDefaultEmbeddingModel = (prevOption: string): string | undefined => {
    if (prevOption?.trim()) return prevOption
    const { embeddingModels } = appInfoStore
    return (
      embeddingModels.find((model) => model.value.includes(TEXT_EMBEDDING_ADA))?.value ||
      embeddingModels[0]?.value
    )
  }

  const getDefaultSummarizationModel = (prevOption: string): string | undefined => {
    if (prevOption?.trim()) return prevOption
    const { llmModels } = appInfoStore
    return (
      llmModels.find((model) => model.value.includes(GPT_3_5_TURBO))?.value || llmModels[0]?.value
    )
  }

  const hasNoSettings = (indexType) => {
    return !filteredSettings[indexType] || filteredSettings[indexType].length === 0
  }

  const isDropdownShown = (indexType) => {
    return filteredSettings[indexType] && filteredSettings[indexType].length > 0
  }

  useEffect(() => {
    const newSettingOptions = getSettingOptions(indexType)

    if (newSettingOptions.length === 1) {
      if (
        indexType === INDEX_TYPES.JIRA ||
        indexType === INDEX_TYPES.XRAY ||
        indexType === INDEX_TYPES.CONFLUENCE ||
        indexType === INDEX_TYPES.GIT ||
        indexType === INDEX_TYPES.AZURE_DEVOPS_WIKI ||
        indexType === INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM
      ) {
        setValue('setting_id', newSettingOptions[0].id)
      }
    } else if (projectName !== getValues('projectName')) {
      setValue('setting_id', undefined)
    }
  }, [projectName, indexType])

  return {
    getDefaultEmbeddingModel,
    getDefaultSummarizationModel,
    checkCustomerConfig,
    getSettingOptions,
    filteredSettings,
    hasNoSettings,
    isDropdownShown,
  }
}
