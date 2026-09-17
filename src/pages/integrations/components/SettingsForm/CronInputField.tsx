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

import React, { useState, useEffect } from 'react'
import { Control, useWatch } from 'react-hook-form'

import Input from '@/components/form/Input'
import { getCronDescription, getNextCronRun, isValidCronExpression } from '@/utils/cronValidator'

interface CronPreview {
  desc: string
  nextRun: Date | null
}

export interface CronInputFieldProps {
  name: string
  value: string
  error?: string
  resolvedPlaceholder: string
  resolvedLabel: string
  autoComplete?: string
  onManualFieldEdit?: (name: string) => void
  field: { onChange: (v: string) => void; onBlur: () => void }
  control: Control
}

const computeCronPreview = (v: string): CronPreview | null => {
  if (!v.trim() || !isValidCronExpression(v)) return null
  return { desc: getCronDescription(v), nextRun: getNextCronRun(v) }
}

const formatNextRun = (date: Date, tz?: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz || undefined,
    }).format(date)
  } catch {
    return date.toLocaleString()
  }
}

const CronInputField: React.FC<CronInputFieldProps> = ({
  name,
  value,
  error,
  resolvedPlaceholder,
  resolvedLabel,
  autoComplete,
  onManualFieldEdit,
  field,
  control,
}) => {
  const timezone = useWatch({ control, name: 'timezone', defaultValue: '' }) as string
  const [preview, setPreview] = useState<CronPreview | null>(null)

  // Clear preview when value is externally reset to empty (e.g. form reset())
  useEffect(() => {
    if (!(value ?? '').trim()) setPreview(null)
  }, [value])

  return (
    <>
      <Input
        id={name}
        name={name}
        value={value}
        error={error}
        placeholder={resolvedPlaceholder}
        label={resolvedLabel}
        onChange={(e) => {
          onManualFieldEdit?.(name)
          field.onChange(e.target.value)
        }}
        onBlur={(e) => {
          field.onBlur()
          setPreview(computeCronPreview(e.target.value))
        }}
        autoComplete={autoComplete}
      />
      {preview && (
        <output className="mt-1 rounded border border-border-primary bg-fill-secondary p-2.5 block">
          <p className="font-mono text-sm font-semibold text-text-primary">{preview.desc}</p>
          {preview.nextRun && (
            <p className="mt-0.5 text-xs text-text-secondary">
              {'Next run: '}
              {formatNextRun(preview.nextRun, timezone || undefined)}
              {timezone ? ` (${timezone})` : ''}
            </p>
          )}
        </output>
      )}
    </>
  )
}

export default CronInputField
