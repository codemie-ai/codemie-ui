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
import { guardrailSourceLabel } from '@/constants/guardrails'
import { GuardrailSource } from '@/types/entity/guardrail'
import { SelectOption } from '@/types/filters'
import { capitalize } from '@/utils/helpers'
import { cn } from '@/utils/utils'

const options: SelectOption<GuardrailSource>[] = [
  { label: guardrailSourceLabel[GuardrailSource.INPUT], value: GuardrailSource.INPUT },
  // { label: guardrailSourceLabel[GuardrailSource.OUTPUT], value: GuardrailSource.OUTPUT },
  // { label: guardrailSourceLabel[GuardrailSource.BOTH], value: GuardrailSource.BOTH }
]

interface GuardrailAssignmentSourceSelectorProps {
  disabled?: boolean
  error?: string
  className?: string
  value?: GuardrailSource | string | null
  onChange: (value: GuardrailSource) => void
}

const GuardrailAssignmentSourceSelector: FC<GuardrailAssignmentSourceSelectorProps> = ({
  disabled,
  error,
  className,
  value,
  onChange,
}) => {
  return (
    <Select
      placeholder="Source"
      options={options}
      onChange={(e) => onChange(e.value as GuardrailSource)}
      value={value}
      error={error}
      valueTemplate={capitalize(value ?? '')}
      disabled={disabled}
      className="[&_span.p-placeholder]:!text-text-primary"
      rootClassName={cn('w-28', className)}
      errorClassName="text-xs mt-1"
    />
  )
}

export default GuardrailAssignmentSourceSelector
