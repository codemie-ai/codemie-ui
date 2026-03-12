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

import React from 'react'

import SelectButton from '@/components/SelectButton/SelectButton'
import { MCPServerDetails } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'

import MCPServerEnvVars from './MCPServerEnvVars'
import IntegrationSelector from '../IntegrationSelector'

interface MCPEnvVarsSectionProps {
  mcpServer?: MCPServerDetails
  envVarMode: 'new' | 'existing'
  settings: Setting | undefined
  manualEnvVarValues: Record<string, string>
  envVarErrors: Record<string, string>
  settingsDefinitions: Setting[]
  serverConfigName: string
  onEnvVarModeChange: (mode: 'new' | 'existing') => void
  onSettingsChange: (settings: Setting | undefined) => void
  onManualEnvVarValuesChange: (values: Record<string, string>) => void
  showNewIntegrationPopup: () => void
}

const MCPEnvVarsSection: React.FC<MCPEnvVarsSectionProps> = ({
  mcpServer,
  envVarMode,
  settings,
  manualEnvVarValues,
  envVarErrors,
  settingsDefinitions,
  serverConfigName,
  onEnvVarModeChange,
  onSettingsChange,
  onManualEnvVarValuesChange,
  showNewIntegrationPopup,
}) => {
  const hasRequiredEnvVars = mcpServer?.required_env_vars && mcpServer.required_env_vars.length > 0
  const isFromMarketplace = mcpServer?.isFromMarketplace
  const showEnvVarModeSelector = hasRequiredEnvVars && isFromMarketplace

  return (
    <div className="flex flex-col gap-2">
      {showEnvVarModeSelector && (
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-sm">Environment Variables</h4>
          <SelectButton
            value={envVarMode}
            onChange={(value: typeof envVarMode) => onEnvVarModeChange(value)}
            options={['new', 'existing']}
          />
        </div>
      )}

      {envVarMode === 'new' && hasRequiredEnvVars && isFromMarketplace ? (
        <>
          <MCPServerEnvVars
            envVars={mcpServer.required_env_vars!}
            values={manualEnvVarValues}
            onChange={onManualEnvVarValuesChange}
            errors={envVarErrors}
          />
          <div className="text-xs text-text-quaternary">
            MCP integration setting name:{' '}
            <span className="font-mono">
              {serverConfigName.replace(/[^a-zA-Z0-9]/g, '_')}_env_vars
            </span>
            <br />
            (Will be created if it does not exist, or updated if it already exists)
          </div>
        </>
      ) : (
        <IntegrationSelector
          optionTruncateThreshold={54}
          value={settings}
          label={showEnvVarModeSelector ? '' : 'Environment Variables'}
          addButtonLabel="Add Environment Variables"
          placeholder="Environment Variables"
          settingsDefinitions={settingsDefinitions}
          onAddSettingClick={showNewIntegrationPopup}
          onChange={(settings) => onSettingsChange(settings)}
          selectClassName="max-w-none grow w-full min-w-full"
        />
      )}
    </div>
  )
}

export default MCPEnvVarsSection
