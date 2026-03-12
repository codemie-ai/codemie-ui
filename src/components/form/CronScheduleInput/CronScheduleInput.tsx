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

import React, { useState, useEffect, forwardRef } from 'react'

import ExternalSvg from '@/assets/icons/external.svg?react'
import InfoBox from '@/components/form/InfoBox'
import Input from '@/components/form/Input'
import Select from '@/components/form/Select'
import Link from '@/components/Link'
import {
  SCHEDULE_PRESETS,
  SCHEDULE_PRESET_OPTIONS,
  CRON_PRESETS,
  CRON_HELP_TEXT,
  CRON_PLACEHOLDER,
  CRON_HELP_URL,
  REINDEX_TYPE_OPTIONS,
  REINDEX_TYPES,
  ReindexType,
} from '@/constants/dataSources'
import { cn } from '@/utils/utils'

interface CronScheduleInputProps {
  value?: string
  onChange: (cronExpression: string) => void
  reindexType?: ReindexType
  onReindexTypeChange?: (type: ReindexType) => void
  error?: string
  disabled?: boolean
  hint?: string
  className?: string
  required?: boolean
}

const CronScheduleInput = forwardRef<HTMLDivElement, CronScheduleInputProps>(
  (
    {
      value = '',
      onChange,
      reindexType = REINDEX_TYPES.SCHEDULER,
      onReindexTypeChange,
      error,
      disabled = false,
      hint,
      className,
      required = false,
    },
    ref
  ) => {
    const [preset, setPreset] = useState<string>(SCHEDULE_PRESETS.NONE)
    const [customCron, setCustomCron] = useState<string>('')

    useEffect(() => {
      if (!value) {
        setPreset(SCHEDULE_PRESETS.NONE)
        setCustomCron('')
        return
      }

      const matchingPreset = Object.entries(CRON_PRESETS).find(([, cronExpr]) => cronExpr === value)

      if (matchingPreset) {
        setPreset(matchingPreset[0])
        setCustomCron('')
      } else {
        setPreset(SCHEDULE_PRESETS.CUSTOM)
        setCustomCron(value)
      }
    }, [value])

    const handlePresetChange = (e: any) => {
      const newPreset = e.value
      setPreset(newPreset)

      if (newPreset === SCHEDULE_PRESETS.CUSTOM) {
        if (customCron) {
          onChange(customCron)
        }
      } else {
        const cronExpression = CRON_PRESETS[newPreset] ?? ''
        onChange(cronExpression)
        setCustomCron('')
      }
    }

    const handleCustomCronChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newCron = e.target.value
      setCustomCron(newCron)
      onChange(newCron)
    }

    const handleReindexTypeChange = (e: any) => {
      if (onReindexTypeChange) {
        onReindexTypeChange(e.value)
      }
    }

    const isCustom = preset === SCHEDULE_PRESETS.CUSTOM

    return (
      <div ref={ref} className={cn('flex flex-col gap-4', className)}>
        <Select
          label="Reindex Type"
          value={reindexType}
          onChange={handleReindexTypeChange}
          options={REINDEX_TYPE_OPTIONS}
          disabled={disabled}
          rootClassName="w-full"
        />

        <Select
          label="Expression"
          value={preset}
          onChange={handlePresetChange}
          options={SCHEDULE_PRESET_OPTIONS}
          disabled={disabled}
          rootClassName="w-full"
        />

        {hint && <InfoBox text={hint} />}

        {isCustom && (
          <Input
            name="cronExpression"
            label="Cron Expression:"
            value={customCron}
            onChange={handleCustomCronChange}
            placeholder={CRON_PLACEHOLDER}
            disabled={disabled}
            error={error}
            hint={CRON_HELP_TEXT}
            required={required}
            fullWidth
            labelContent={
              <Link
                url={CRON_HELP_URL}
                variant="dimmed"
                className="text-xs flex gap-1 items-center ml-auto w-fit"
              >
                Need help?
                <ExternalSvg className="opacity-70 w-3 h-3" />
              </Link>
            }
          />
        )}

        {preset === SCHEDULE_PRESETS.NONE && (
          <InfoBox text="Datasource will only be reindexed manually. You can trigger reindexing from the datasource actions menu." />
        )}
      </div>
    )
  }
)

CronScheduleInput.displayName = 'CronScheduleInput'

export default CronScheduleInput
