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

import { useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { VALIDATION_CONSTRAINTS } from '@/constants/validation'
import { getEffortLevels, isWarningEffortLevel } from '@/pages/assistants/utils/effortConstraints'
import {
  getTemperatureMax,
  isTemperatureSupported,
} from '@/pages/assistants/utils/temperatureConstraints'
import { appInfoStore } from '@/store/appInfo'

export type ModelParamsField = 'temperature' | 'top_p' | 'effort'

interface UseModelParamsFieldsOptions {
  selectedModel?: string
  temperature: unknown
  effort?: string
  clearField: (name: ModelParamsField) => void
  validateField: (name: ModelParamsField) => Promise<boolean>
}

export const useModelParamsFields = ({
  selectedModel,
  temperature,
  effort,
  clearField,
  validateField,
}: UseModelParamsFieldsOptions) => {
  const { llmModels } = useSnapshot(appInfoStore)
  const temperatureMax = getTemperatureMax(selectedModel, llmModels)
  const effortLevels = getEffortLevels(selectedModel, llmModels)
  const temperatureSupported = isTemperatureSupported(selectedModel, llmModels)

  // Surfaces an invalid saved value on mount, before the user touches the field.
  useEffect(() => {
    validateField('temperature')
    validateField('effort')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetModelParams = () => {
    clearField('temperature')
    clearField('top_p')
    clearField('effort')
    validateField('temperature')
    validateField('effort')
  }

  const clearTemperature = () => {
    clearField('temperature')
    clearField('top_p')
    validateField('temperature')
  }

  return {
    temperaturePlaceholder: `${VALIDATION_CONSTRAINTS.TEMPERATURE_MIN}-${temperatureMax}`,
    effortLevels,
    showEffortWarning: isWarningEffortLevel(effort, effortLevels),
    // On an effort model, Temperature stays only while a saved value exists.
    showTemperature: temperatureSupported && (effortLevels.length === 0 || temperature != null),
    resetModelParams,
    clearTemperature,
  }
}
