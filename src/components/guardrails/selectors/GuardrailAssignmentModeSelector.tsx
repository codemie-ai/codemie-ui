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

import Select from '@/components/form/Select'
import { guardrailModeLabel } from '@/constants/guardrails'
import { GuardrailMode } from '@/types/entity/guardrail'
import { SelectOption } from '@/types/filters'
import { capitalize } from '@/utils/helpers'
import { cn } from '@/utils/utils'

const options: SelectOption<GuardrailMode>[] = [
  { label: guardrailModeLabel[GuardrailMode.ALL], value: GuardrailMode.ALL },
  // { label: guardrailModeLabel[GuardrailMode.FILTERED], value: GuardrailMode.FILTERED }
]

interface GuardrailAssignmentModeSelectorProps {
  disabled?: boolean
  error?: string
  className?: string
  value?: GuardrailMode | string | null
  onChange: (value: GuardrailMode) => void
}

const GuardrailAssignmentModeSelector: FC<GuardrailAssignmentModeSelectorProps> = ({
  disabled,
  error,
  className,
  value,
  onChange,
}) => {
  return (
    <Select
      placeholder="Mode"
      options={options}
      onChange={(e) => onChange(e.value as GuardrailMode)}
      value={value}
      valueTemplate={capitalize(value ?? '')}
      error={error}
      disabled={disabled}
      className="[&_span.p-placeholder]:!text-text-primary !gap-0"
      rootClassName={cn('w-28', className)}
      errorClassName="text-xs mt-1"
    />
  )
}

export default GuardrailAssignmentModeSelector
