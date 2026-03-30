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

import { Controller, Control, UseFormSetValue } from 'react-hook-form'

import Button from '@/components/Button'
import Input from '@/components/form/Input'
import { ButtonType } from '@/constants'
import { MCPServerDetails } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'

import MCPBasicFields from '../MCPBasicFields'
import MCPConfigSection from '../MCPConfigSection'
import MCPEnvVarsSection from '../MCPEnvVarsSection'
import MCPToolkitTest from '../MCPToolkitTest'

interface MCPServerConfigStepProps {
  control: Control<any>
  isEditing: boolean
  configHasEnv: boolean
  setValue: UseFormSetValue<any>
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
  serverConfig: MCPServerDetails & { settings: Setting | undefined }
  validateManualEnvVars: () => boolean
  triggerValidation: () => Promise<boolean>
  onCancel: () => void
  onNext: () => void
}

const MCPServerConfigStep = ({
  control,
  isEditing,
  configHasEnv,
  setValue,
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
  serverConfig,
  validateManualEnvVars,
  triggerValidation,
  onCancel,
  onNext,
}: MCPServerConfigStepProps) => {
  const handleNext = async () => {
    const isFormValid = await triggerValidation()

    if (!isFormValid) {
      return
    }

    if (envVarMode === 'new' && !validateManualEnvVars()) {
      return
    }

    onNext()
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <MCPBasicFields control={control} isEditing={isEditing} />

        <MCPConfigSection control={control} configHasEnv={configHasEnv} setValue={setValue} />

        <MCPEnvVarsSection
          mcpServer={mcpServer}
          envVarMode={envVarMode}
          settings={settings}
          manualEnvVarValues={manualEnvVarValues}
          envVarErrors={envVarErrors}
          settingsDefinitions={settingsDefinitions}
          serverConfigName={serverConfigName}
          onEnvVarModeChange={onEnvVarModeChange}
          onSettingsChange={onSettingsChange}
          onManualEnvVarValuesChange={onManualEnvVarValuesChange}
          showNewIntegrationPopup={showNewIntegrationPopup}
        />

        <Controller
          name="connectUrl"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              label="MCP-Connect URL (Optional)"
              placeholder="https://"
              error={fieldState.error?.message}
              {...field}
            />
          )}
        />
      </div>
      <div className="flex justify-end gap-4">
        <Button variant={ButtonType.SECONDARY} onClick={onCancel}>
          Cancel
        </Button>
        <MCPToolkitTest mcpServer={serverConfig} />
        <Button variant={ButtonType.PRIMARY} onClick={handleNext}>
          Next
        </Button>
      </div>
    </>
  )
}

export default MCPServerConfigStep
