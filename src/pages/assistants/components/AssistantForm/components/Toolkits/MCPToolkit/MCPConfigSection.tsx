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
import React, { useCallback, useEffect } from 'react'
import { Controller, Control, useWatch } from 'react-hook-form'

import Textarea from '@/components/form/Textarea'
import InfoWarning from '@/components/InfoWarning'
import SelectButton from '@/components/SelectButton/SelectButton'
import TooltipButton from '@/components/TooltipButton'
import { InfoWarningType } from '@/constants'
import { MCP_CONFIG_SAMPLE } from '@/constants/assistants'
import { MCPServerConfig } from '@/types/entity/mcp'
import { cn } from '@/utils/utils'

import { McpConfigMode, MCPFormValues } from './formTypes'
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
  configHasEnv: boolean
  setValue: (name: keyof MCPFormValues, value: any) => void
  hasCatalogReference?: boolean
  catalogConfig?: MCPServerConfig
  catalogConfigLoading?: boolean
  catalogConfigError?: string | null
}

const ENV_SENSITIVE_WARNING =
  'Sensitive configuration must be provided through the MCP Integration or using the "Add Environment Variables" button.\nOnly insensitive data should be placed in the "env" section of MCP Config.'

const CONFIG_MODE_OPTIONS = [
  { label: 'Global', value: McpConfigMode.GLOBAL },
  { label: 'Custom', value: McpConfigMode.CUSTOM },
]

const MCPConfigSection: React.FC<MCPConfigSectionProps> = ({
  control,
  setValue,
  hasCatalogReference,
  catalogConfig,
  catalogConfigLoading,
  catalogConfigError,
}) => {
  const debouncedFormatJson = useCallback(
    debounce((value: string) => formatJson(value, setValue), 1000),
    [setValue]
  )

  const useCustomConfig = useWatch({ control, name: 'useCustomConfig' })
  const configJson = useWatch({ control, name: 'configJson' })
  const isReadOnly = hasCatalogReference && !useCustomConfig

  // When switching to Custom mode with empty config, populate from catalog
  useEffect(() => {
    const isEmpty = !configJson || configJson.trim() === '{}' || configJson.trim() === ''
    if (useCustomConfig && hasCatalogReference && catalogConfig && isEmpty) {
      setValue('configJson', JSON.stringify(catalogConfig, null, 2))
    }
  }, [useCustomConfig, hasCatalogReference, catalogConfig, configJson, setValue])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label htmlFor="json-config" className="font-bold text-sm">
          MCP Configuration
        </label>
        {hasCatalogReference && (
          <div className="flex items-center gap-2">
            <Controller
              name="useCustomConfig"
              control={control}
              render={({ field }) => (
                <SelectButton
                  value={field.value ? McpConfigMode.CUSTOM : McpConfigMode.GLOBAL}
                  options={CONFIG_MODE_OPTIONS}
                  onChange={(value) => field.onChange(value === McpConfigMode.CUSTOM)}
                />
              )}
            />
            <TooltipButton
              content="Global mode inherits configuration updates from the catalog. Custom mode creates an independent copy that won't receive future updates."
              iconClassName="w-4 h-4"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Controller
          name="configJson"
          control={control}
          render={({ field, fieldState }) => (
            <Textarea
              id="json-config"
              label="Configuration (JSON format)"
              rows={10}
              className={cn('font-mono', isReadOnly && 'opacity-75')}
              hint={MCP_CONFIG_SAMPLE}
              placeholder={
                isReadOnly && catalogConfigLoading
                  ? 'Loading global configuration...'
                  : JSON_CONFIG_PLACEHOLDER
              }
              error={fieldState.error?.message}
              aria-label={
                isReadOnly ? 'Configuration (JSON format) - Global' : 'Configuration (JSON format)'
              }
              readonly={isReadOnly}
              disabled={isReadOnly}
              {...field}
              value={
                !useCustomConfig && hasCatalogReference && catalogConfig
                  ? JSON.stringify(catalogConfig, null, 2)
                  : field.value
              }
              onChange={(e) => {
                if (isReadOnly) return
                field.onChange(e)
                debouncedFormatJson(e.target.value)
              }}
            />
          )}
        />
        {isReadOnly && catalogConfigError && (
          <div className="text-xs text-red-500">{catalogConfigError}</div>
        )}
        <div className="text-xs text-text-quaternary">
          Must include at least &rdquo;command&rdquo; or &rdquo;url&rdquo; field.
        </div>
        <InfoWarning type={InfoWarningType.ERROR} message={ENV_SENSITIVE_WARNING} />
      </div>
    </div>
  )
}

export default MCPConfigSection
