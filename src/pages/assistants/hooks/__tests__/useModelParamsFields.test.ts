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

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { appInfoStore } from '@/store/appInfo'
import { EffortLevel } from '@/types/entity/assistant'
import { ModelOption } from '@/types/entity/configuration'

import { useModelParamsFields } from '../useModelParamsFields'

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { llmModels: [] as ModelOption[] },
}))

const EFFORT_MODEL = 'effort-model'
const TEMPERATURE_MODEL = 'temperature-model'

const model = (over: Partial<ModelOption>): ModelOption => ({
  value: 'model-value',
  label: 'Model Label',
  isDefault: false,
  ...over,
})

const renderFields = (options: {
  selectedModel?: string
  temperature?: unknown
  effort?: string
}) => {
  const clearField = vi.fn()
  const validateField = vi.fn().mockResolvedValue(true)
  const { result } = renderHook(() =>
    useModelParamsFields({ temperature: undefined, ...options, clearField, validateField })
  )
  return { result, clearField, validateField }
}

describe('useModelParamsFields', () => {
  beforeEach(() => {
    appInfoStore.llmModels = [
      model({
        value: EFFORT_MODEL,
        effortLevels: [EffortLevel.LOW, EffortLevel.MEDIUM, EffortLevel.HIGH, EffortLevel.MAX],
        temperatureSupported: true,
      }),
      model({ value: TEMPERATURE_MODEL }),
    ]
  })

  it('shows temperature and no effort levels for a temperature-only model', () => {
    const { result } = renderFields({ selectedModel: TEMPERATURE_MODEL })

    expect(result.current.showTemperature).toBe(true)
    expect(result.current.effortLevels).toEqual([])
  })

  it('hides temperature for an effort model without a saved temperature', () => {
    const { result } = renderFields({ selectedModel: EFFORT_MODEL })

    expect(result.current.showTemperature).toBe(false)
    expect(result.current.effortLevels).toEqual([
      EffortLevel.LOW,
      EffortLevel.MEDIUM,
      EffortLevel.HIGH,
      EffortLevel.MAX,
    ])
  })

  it('keeps a saved temperature visible on an effort model', () => {
    const { result } = renderFields({ selectedModel: EFFORT_MODEL, temperature: 0.5 })

    expect(result.current.showTemperature).toBe(true)
  })

  it('hides temperature when the model reports no temperature support', () => {
    appInfoStore.llmModels = [model({ value: EFFORT_MODEL, temperatureSupported: false })]

    const { result } = renderFields({ selectedModel: EFFORT_MODEL, temperature: 0.5 })

    expect(result.current.showTemperature).toBe(false)
  })

  it('warns on max but not on high', () => {
    expect(
      renderFields({ selectedModel: EFFORT_MODEL, effort: EffortLevel.MAX }).result.current
        .showEffortWarning
    ).toBe(true)
    expect(
      renderFields({ selectedModel: EFFORT_MODEL, effort: EffortLevel.HIGH }).result.current
        .showEffortWarning
    ).toBe(false)
  })

  it('validates temperature and effort on mount', () => {
    const { validateField } = renderFields({ selectedModel: TEMPERATURE_MODEL })

    expect(validateField).toHaveBeenCalledWith('temperature')
    expect(validateField).toHaveBeenCalledWith('effort')
  })

  it('clears temperature, top_p and effort on model params reset', () => {
    const { result, clearField, validateField } = renderFields({ selectedModel: EFFORT_MODEL })
    validateField.mockClear()

    result.current.resetModelParams()

    expect(clearField.mock.calls.flat()).toEqual(['temperature', 'top_p', 'effort'])
    expect(validateField.mock.calls.flat()).toEqual(['temperature', 'effort'])
  })

  it('clears only temperature and top_p when an effort is picked', () => {
    const { result, clearField } = renderFields({ selectedModel: EFFORT_MODEL })

    result.current.clearTemperature()

    expect(clearField.mock.calls.flat()).toEqual(['temperature', 'top_p'])
  })
})
