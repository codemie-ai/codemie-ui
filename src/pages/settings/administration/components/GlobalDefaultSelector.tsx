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

import { FC, useMemo } from 'react'

import Button from '@/components/Button'
import DetailsBadge from '@/components/details/DetailsBadge'
import Select from '@/components/form/Select/Select'
import { ButtonSize, ButtonType } from '@/constants'
import { AdminModel } from '@/types/entity/adminModel'

import { isSelectableDefaultModel } from '../utils/modelsSettingsDraft'

const PLATFORM_CONFIGURATION_VALUE = '__platform_configuration__'

interface GlobalDefaultSelectorProps {
  models: ReadonlyArray<AdminModel>
  value: string | null
  usePlatformDefault: boolean
  loading?: boolean
  isDirty?: boolean
  error?: string | null
  onSelect: (baseName: string) => void
  onReset: () => void
}

/**
 * Follow platform configuration or save a manually selected default. Manual
 * choices require enabled status, a reachable provider, and a model that is
 * not a switchyard router.
 */
const GlobalDefaultSelector: FC<GlobalDefaultSelectorProps> = ({
  models,
  value,
  usePlatformDefault,
  loading = false,
  isDirty = false,
  error,
  onSelect,
  onReset,
}) => {
  const options = useMemo(
    () => [
      { label: 'Use configured default', value: PLATFORM_CONFIGURATION_VALUE },
      ...models
        .filter(isSelectableDefaultModel)
        .map((model) => ({ label: model.label, value: model.base_name })),
    ],
    [models]
  )

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border-structural bg-surface-base-secondary p-4"
      data-testid="global-default-card"
    >
      <div className="flex items-center gap-2">
        <label htmlFor="global-default-model" className="text-xs font-medium text-text-quaternary">
          Global default model
        </label>
        {isDirty && (
          <DetailsBadge
            value="Unsaved Changes"
            className="border-0 bg-in-progress-tertiary text-in-progress-primary px-2 py-1 text-xs font-medium"
          />
        )}
      </div>
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-full md:w-1/2">
          <Select
            id="global-default-model"
            value={usePlatformDefault ? PLATFORM_CONFIGURATION_VALUE : value}
            options={options}
            disabled={loading || options.length === 1}
            placeholder="Select a model"
            onChangeValue={(selectedValue) => {
              if (selectedValue == null) return
              const next = String(selectedValue)
              if (next === PLATFORM_CONFIGURATION_VALUE) {
                onReset()
                return
              }
              if (!usePlatformDefault && next === value) return
              onSelect(next)
            }}
            rootClassName="w-full"
          />
          {error && (
            <p role="alert" className="mt-1 text-xs text-text-error">
              {error}
            </p>
          )}
        </div>
        <Button
          size={ButtonSize.MEDIUM}
          variant={ButtonType.SECONDARY}
          onClick={onReset}
          disabled={loading || usePlatformDefault}
        >
          Reset to configured default
        </Button>
      </div>
    </div>
  )
}

export default GlobalDefaultSelector
