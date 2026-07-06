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

import React, { useMemo } from 'react'

import { Checkbox } from '@/components/form/Checkbox'
import { cn } from '@/utils/utils'

export type BuiltinSubagentCatalogItem = {
  id: string
  display_name: string
}

export interface BuiltinSubagentToggleProps {
  catalog: BuiltinSubagentCatalogItem[]
  value: string[]
  onChange: (next: string[]) => void
  className?: string
}

const INHERIT_HINT =
  'The subagent inherits data sources, skills and tools, but uses built-in system prompt'

const BuiltinSubagentToggle: React.FC<BuiltinSubagentToggleProps> = ({
  catalog,
  value,
  onChange,
  className,
}) => {
  const first = catalog?.[0]
  const isChecked = (value?.length ?? 0) > 0
  const isCatalogEmpty = !catalog || catalog.length === 0
  // Important: if catalog is empty (fetch failed / permissions / etc),
  // we still must allow users to *disable* already-enabled built-ins.
  const isDisabled = isCatalogEmpty && !isChecked

  const label = useMemo(() => {
    const displayName = first?.display_name ?? 'General Purpose'
    return `Enable ${displayName} subagent`
  }, [first?.display_name])

  const labelHint =
    "General Purpose subagent has its own prompt but it will inherit main agent's tools, MCP servers and skills. Useful when the skill does something complex, and you need to perform some tasks with clear boundaries and outcome without overloading context of the main agent with all the details."

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Checkbox
        checked={isChecked}
        disabled={isDisabled}
        label={label}
        labelHint={labelHint}
        hint={isCatalogEmpty && !isChecked ? 'No built-in subagents available' : undefined}
        onChange={(checked) => {
          if (!checked) {
            onChange([])
            return
          }

          // Toggle ON:
          // - preserve existing non-empty list
          // - otherwise set first available built-in
          if (value?.length) {
            onChange(value)
            return
          }
          if (first?.id) {
            onChange([first.id])
            return
          }
          onChange([])
        }}
      />

      <p className="text-xs text-text-secondary ml-6">{INHERIT_HINT}</p>
    </div>
  )
}

export default BuiltinSubagentToggle
