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

import Button from '@/components/Button/Button'
import { Checkbox } from '@/components/form/Checkbox'
import InfoBox from '@/components/form/InfoBox'
import Select from '@/components/form/Select'
import Switch from '@/components/form/Switch'
import { useHeadroomEnabled } from '@/hooks/useFeatureFlags'
import { HEADROOM_STRATEGY_HELP } from '@/pages/assistants/components/AssistantForm/components/HeadroomConfig'
import { HeadroomOverride, HeadroomScope, HeadroomStrategy } from '@/types/entity/assistant'
import { FilterOption } from '@/types/filters'
import {
  HEADROOM_STRATEGIES,
  resolveEffective,
  setHeadroomField,
} from '@/utils/workflowEditor/headroom/headroomYaml'

const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)

const STRATEGY_OPTIONS: FilterOption[] = HEADROOM_STRATEGIES.map((s) => ({
  label: capitalize(s),
  value: s,
}))

const renderStrategyOption = (option: FilterOption) => (
  <div className="flex flex-col gap-0.5 px-2.5 py-2">
    <span className="text-sm leading-tight">{option.label}</span>
    <span className="text-xs text-text-tertiary leading-tight whitespace-normal">
      {HEADROOM_STRATEGY_HELP[option.value as HeadroomStrategy]}
    </span>
  </div>
)

interface HeadroomPanelProps {
  scope: HeadroomScope
  value: HeadroomOverride | undefined
  /** Workflow-level override, used as the fallback layer for node scope. */
  inherited?: HeadroomOverride
  onChange: (value: HeadroomOverride | undefined) => void
}

/**
 * Unset fields stay absent from the YAML and show the value that currently applies
 * (workflow setting for a node, built-in default otherwise); touching a control sets it.
 */
const HeadroomPanel: FC<HeadroomPanelProps> = ({ scope, value, inherited, onChange }) => {
  const isEnabled = useHeadroomEnabled()
  if (!isEnabled) return null

  const fallback = scope === HeadroomScope.Node ? inherited : undefined
  const effective = {
    enabled: resolveEffective('enabled', value, fallback).value,
    compress_user_messages: resolveEffective('compress_user_messages', value, fallback).value,
    compress_tool_outputs: resolveEffective('compress_tool_outputs', value, fallback).value,
    strategy: resolveEffective('strategy', value, fallback).value,
  }
  const subDisabled = !effective.enabled
  // A bare `headroom:` key in YAML parses to null, so guard with truthiness, not `!== undefined`.
  const hasOverride = !!value && Object.keys(value).length > 0

  return (
    <div className="flex flex-col gap-4">
      <Switch
        label="Enable context compression"
        value={effective.enabled}
        onChange={(e) => onChange(setHeadroomField(value, 'enabled', e.target.checked))}
      />
      <div className="flex flex-col gap-3">
        <Checkbox
          label="Compress user input"
          checked={effective.compress_user_messages}
          disabled={subDisabled}
          onChange={(checked) =>
            onChange(setHeadroomField(value, 'compress_user_messages', checked))
          }
        />
        <Checkbox
          label="Compress tool outputs"
          checked={effective.compress_tool_outputs}
          disabled={subDisabled}
          onChange={(checked) =>
            onChange(setHeadroomField(value, 'compress_tool_outputs', checked))
          }
        />
      </div>
      <Select
        id={`headroom-${scope}-strategy`}
        label="Strategy"
        value={value?.strategy ?? null}
        placeholder={capitalize(effective.strategy)}
        options={STRATEGY_OPTIONS}
        itemTemplate={renderStrategyOption}
        panelClassName="max-w-96"
        disabled={subDisabled}
        showClear={value?.strategy !== undefined}
        onChangeValue={(raw) =>
          onChange(setHeadroomField(value, 'strategy', (raw ?? undefined) as HeadroomStrategy))
        }
      />
      {hasOverride && (
        <Button type="secondary" size="small" onClick={() => onChange(undefined)}>
          {scope === HeadroomScope.Node ? 'Reset to workflow settings' : 'Reset to defaults'}
        </Button>
      )}
      <InfoBox>
        {scope === HeadroomScope.Node &&
          "A referenced assistant's own setting may apply when the workflow does not override it. "}
        Sub-assistants do not inherit this setting. Not compressed: system prompts, assistant
        replies, attached files and images.
      </InfoBox>
    </div>
  )
}

export default HeadroomPanel
