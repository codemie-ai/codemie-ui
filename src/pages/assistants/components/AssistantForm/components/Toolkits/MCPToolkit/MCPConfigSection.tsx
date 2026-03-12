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

import debounce from 'lodash/debounce'
import React, { useCallback } from 'react'
import { Controller, Control } from 'react-hook-form'

import Input from '@/components/form/Input'
import Textarea from '@/components/form/Textarea'
import SelectButton from '@/components/SelectButton/SelectButton'
import { MCP_CONFIG_SAMPLE } from '@/constants/assistants'

import { MCPFormValues } from './formTypes'
import { formatJson } from './validators'

const JSON_CONFIG_PLACEHOLDER = `{
  "command": "uvx",
  "args": ["cli-mcp-server"],
  "env": {
    "ALLOWED_DIR": "/path/to/dir",
    "ALLOWED_COMMANDS": "all"
  },
  "auth_token": "your_auth_token"
}`

interface MCPConfigSectionProps {
  control: Control<MCPFormValues>
  inputMode: 'JSON' | 'Form'
  configHasEnv: boolean
  onInputModeChange: (mode: 'JSON' | 'Form') => void
  setValue: (name: keyof MCPFormValues, value: any) => void
}

const MCPConfigSection: React.FC<MCPConfigSectionProps> = ({
  control,
  inputMode,
  configHasEnv,
  onInputModeChange,
  setValue,
}) => {
  const debouncedFormatJson = useCallback(
    debounce((value: string) => formatJson(value, setValue), 1000),
    [setValue]
  )

  const isFormInput = inputMode === 'Form'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label htmlFor="json-config" className="font-bold text-sm">
          MCP Configuration
        </label>
        <SelectButton
          value={inputMode}
          onChange={(value: typeof inputMode) => onInputModeChange(value)}
          options={['JSON', 'Form']}
        />
      </div>

      {!isFormInput ? (
        <div className="flex flex-col gap-2">
          <Controller
            key="1"
            name="configJson"
            control={control}
            render={({ field, fieldState }) => (
              <Textarea
                id="json-config"
                label="Configuration (JSON format)"
                rows={10}
                className="font-mono"
                hint={MCP_CONFIG_SAMPLE}
                placeholder={JSON_CONFIG_PLACEHOLDER}
                error={fieldState.error?.message}
                aria-label="Configuration (JSON format)"
                {...field}
                onChange={(e) => {
                  field.onChange(e)
                  debouncedFormatJson(e.target.value)
                }}
              />
            )}
          />
          <div className="text-xs text-text-quaternary">
            Must include at least &rdquo;command&rdquo; or &rdquo;url&rdquo; field.
          </div>
          {configHasEnv && (
            <div className="text-failed-secondary">
              When using the &rdquo;env&rdquo; key in the configuration, ensure that it does not
              contain any sensitive information or secrets. For secret values, it is recommended to
              use &rdquo;Integrations&rdquo; instead.
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Controller
            key="2"
            name="command"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                label="Command"
                placeholder="Command*"
                error={fieldState.error?.message}
                {...field}
              />
            )}
          />

          <Controller
            name="arguments"
            control={control}
            render={({ field, fieldState }) => (
              <Textarea
                label="Arguments"
                placeholder="Arguments (space-separated)*"
                error={fieldState.error?.message}
                {...field}
              />
            )}
          />
        </div>
      )}
    </div>
  )
}

export default MCPConfigSection
