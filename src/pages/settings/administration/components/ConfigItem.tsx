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

import { FC } from 'react'

import { cn } from '@/utils/utils'

interface ConfigItemProps {
  label: string
  value: string | number | number[]
  description?: string
  unit?: string
  isEditing?: boolean
  onChange?: (value: string) => void
  error?: string
  className?: string
}

const ConfigItem: FC<ConfigItemProps> = ({
  label,
  value,
  description,
  unit,
  isEditing = false,
  onChange,
  error,
  className,
}) => {
  const displayValue = Array.isArray(value) ? value.join(', ') : value

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 pb-4 border-b border-border-primary last:border-b-0 last:pb-0',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-primary mb-1">{label}</div>
          {description && (
            <p className="text-xs text-text-quaternary leading-relaxed">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isEditing ? (
            <>
              <div
                className={cn(
                  'flex rounded-lg border bg-surface-base-content transition',
                  error
                    ? 'border-failed-secondary'
                    : 'border-border-primary hover:border-border-primary-hover focus-within:border-border-primary-hover'
                )}
              >
                <input
                  type="number"
                  value={displayValue}
                  onChange={(e) => onChange?.(e.target.value)}
                  className="w-24 h-8 px-3 py-[9px] text-sm bg-transparent text-text-primary outline-none placeholder:text-text-specific-input-placeholder"
                />
              </div>
              {unit && (
                <span className="text-sm text-text-quaternary whitespace-nowrap">{unit}</span>
              )}
            </>
          ) : (
            <p className="text-sm font-semibold text-text-primary whitespace-nowrap">
              {displayValue}
              {unit && <span className="text-text-quaternary ml-1">{unit}</span>}
            </p>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-text-error text-right">{error}</p>}
    </div>
  )
}

export default ConfigItem
