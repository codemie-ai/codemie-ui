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

import { Checkbox } from '@/components/form/Checkbox'
import InfoBox from '@/components/form/InfoBox'
import Select from '@/components/form/Select'
import Switch from '@/components/form/Switch'
import { HeadroomConfig as HeadroomConfigType, HeadroomStrategy } from '@/types/entity/assistant'
import { FilterOption } from '@/types/filters'

export const DEFAULT_HEADROOM_CONFIG: HeadroomConfigType = {
  enabled: false,
  compress_user_messages: true,
  compress_tool_outputs: true,
  strategy: 'balanced',
}

export const HEADROOM_STRATEGY_HELP: Record<HeadroomStrategy, string> = {
  lossless: 'Safest. Predictable results, no loss of detail.',
  balanced: 'Shortens older messages and long tool results. Some detail may be lost.',
  aggressive: 'Shortens more than Balanced to save more tokens. More detail may be lost.',
}

const STRATEGY_OPTIONS: { label: string; value: HeadroomStrategy }[] = [
  { label: 'Lossless', value: 'lossless' },
  { label: 'Balanced', value: 'balanced' },
  { label: 'Aggressive', value: 'aggressive' },
]

const renderStrategyOption = (option: FilterOption) => (
  <div className="flex flex-col gap-0.5 px-2.5 py-2">
    <span className="text-sm leading-tight">{option.label}</span>
    <span className="text-xs text-text-tertiary leading-tight whitespace-normal">
      {HEADROOM_STRATEGY_HELP[option.value as HeadroomStrategy]}
    </span>
  </div>
)

interface HeadroomConfigProps {
  value: HeadroomConfigType | null | undefined
  onChange: (value: HeadroomConfigType) => void
  error?: string
}

const HeadroomConfig: FC<HeadroomConfigProps> = ({ value, onChange, error }) => {
  const config = value ?? DEFAULT_HEADROOM_CONFIG
  const disabled = !config.enabled

  return (
    <div className="flex flex-col gap-4">
      <Switch
        label="Enable context compression"
        value={config.enabled}
        onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
      />
      <div className="flex flex-col gap-3">
        <Checkbox
          label="Compress user input"
          checked={config.compress_user_messages}
          disabled={disabled}
          onChange={(checked) => onChange({ ...config, compress_user_messages: checked })}
        />
        <Checkbox
          label="Compress tool outputs"
          checked={config.compress_tool_outputs}
          disabled={disabled}
          onChange={(checked) => onChange({ ...config, compress_tool_outputs: checked })}
        />
      </div>
      <Select
        label="Strategy"
        value={config.strategy}
        options={STRATEGY_OPTIONS}
        itemTemplate={renderStrategyOption}
        panelClassName="max-w-96"
        disabled={disabled}
        error={error}
        onChange={(e) => onChange({ ...config, strategy: e.value as HeadroomStrategy })}
      />
      <InfoBox>
        Not compressed: system prompts, assistant replies, attached files and images, and
        sub-assistant calls (sub-assistants do not inherit this setting).
      </InfoBox>
    </div>
  )
}

export default HeadroomConfig
