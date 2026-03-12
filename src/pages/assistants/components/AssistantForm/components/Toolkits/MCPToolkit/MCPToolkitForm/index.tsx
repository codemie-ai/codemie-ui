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

import { useEffect, useMemo, useRef, useState } from 'react'

import Popup from '@/components/Popup'
import { Tool } from '@/types/entity/assistant'
import { MCPServerDetails } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'
import { cn } from '@/utils/utils'

import { buildServerConfig } from './formHelpers'
import MCPServerConfigStep from './MCPServerConfigStep'
import MCPToolsSelectionStep from './MCPToolsSelectionStep'
import { handleFormSubmit } from './submitHelpers'
import { useEnvVarMode } from './useEnvVarMode'
import { useMCPForm } from './useMCPForm'

const WIZARD_STEPS = {
  CONFIGURE_SERVER: 'configure_server',
  SELECT_TOOLS: 'select_tools',
} as const

type WizardStep = (typeof WIZARD_STEPS)[keyof typeof WIZARD_STEPS]

interface MCPToolkitFormProps {
  isVisible: boolean
  mcpServer?: MCPServerDetails
  mcpServerNames?: string[]
  settingsDefinitions: Setting[]
  onHide: () => void
  updateMcpServer: (mcpServer: MCPServerDetails) => void
  showNewIntegrationPopup: () => void
  project: string
  refreshSettings: () => Promise<any>
  singleToolSelection?: boolean
}

const MCPToolkitForm = ({
  isVisible,
  mcpServer,
  mcpServerNames = [],
  settingsDefinitions,
  onHide,
  updateMcpServer,
  showNewIntegrationPopup,
  project,
  refreshSettings,
  singleToolSelection = false,
}: MCPToolkitFormProps) => {
  const formRef = useRef<HTMLFormElement>(null)
  const [inputMode, setInputMode] = useState<'JSON' | 'Form'>('JSON')
  const [wizardStep, setWizardStep] = useState<WizardStep>(WIZARD_STEPS.CONFIGURE_SERVER)
  const [selectedTools, setSelectedTools] = useState<Tool[]>(
    mcpServer?.tools?.map((name) => ({ name } as Tool)) ?? []
  )

  const envVarHook = useEnvVarMode(mcpServer, project)
  const { form, configHasEnv, isEditing } = useMCPForm({
    mcpServer,
    mcpServerNames,
    inputMode,
    onInputModeChange: setInputMode,
  })

  const { control, setValue, getValues, watch, handleSubmit, reset, trigger } = form

  useEffect(() => {
    setSelectedTools(mcpServer?.tools?.map((name) => ({ name } as Tool)) ?? [])
  }, [mcpServer?.name])

  const serverConfig = useMemo(() => {
    const values = getValues()
    return buildServerConfig(values, inputMode)
  }, [watch(), inputMode])

  const onSubmit = handleSubmit(async () => {
    await handleFormSubmit({
      serverConfig,
      settings: envVarHook.settings,
      manualEnvVarValues: envVarHook.manualEnvVarValues,
      project,
      isEditing,
      mcpServer,
      selectedTools,
      shouldCreateNewEnvVarSetting: envVarHook.shouldCreateNewEnvVarSetting,
      validateManualEnvVars: envVarHook.validateManualEnvVars,
      refreshSettings,
      updateMcpServer,
      reset,
      resetEnvVarState: envVarHook.resetEnvVarState,
    })
    setWizardStep(WIZARD_STEPS.CONFIGURE_SERVER)
    if (mcpServer) envVarHook.resetEnvVarState()
  })

  const handleHide = () => {
    setWizardStep(WIZARD_STEPS.CONFIGURE_SERVER)
    onHide()
    if (mcpServer) envVarHook.resetEnvVarState()
  }

  const handleNext = () => {
    setWizardStep(WIZARD_STEPS.SELECT_TOOLS)
  }

  const handleBack = () => {
    setWizardStep(WIZARD_STEPS.CONFIGURE_SERVER)
  }

  const renderHeader = () => {
    return (
      <div className="flex items-center gap-2">
        <span className={cn(wizardStep !== WIZARD_STEPS.CONFIGURE_SERVER && 'opacity-70')}>
          Step 1: Configure MCP Server
        </span>
        <span className="opacity-70">•</span>
        <span className={cn(wizardStep !== WIZARD_STEPS.SELECT_TOOLS && 'opacity-70')}>
          Step 2: Select Tools
        </span>
      </div>
    )
  }

  return (
    <Popup
      hideFooter
      headerContent={renderHeader()}
      className="w-full max-w-3xl"
      visible={isVisible}
      onHide={handleHide}
    >
      <form ref={formRef} className="flex flex-col gap-4 pb-4" onSubmit={onSubmit}>
        {wizardStep === WIZARD_STEPS.CONFIGURE_SERVER ? (
          <MCPServerConfigStep
            control={control}
            isEditing={isEditing}
            inputMode={inputMode}
            configHasEnv={configHasEnv}
            onInputModeChange={setInputMode}
            setValue={setValue}
            mcpServer={mcpServer}
            envVarMode={envVarHook.envVarMode}
            settings={envVarHook.settings}
            manualEnvVarValues={envVarHook.manualEnvVarValues}
            envVarErrors={envVarHook.envVarErrors}
            settingsDefinitions={settingsDefinitions}
            serverConfigName={serverConfig.name}
            onEnvVarModeChange={envVarHook.setEnvVarMode}
            onSettingsChange={envVarHook.setSettings}
            onManualEnvVarValuesChange={envVarHook.setManualEnvVarValues}
            showNewIntegrationPopup={showNewIntegrationPopup}
            serverConfig={{ ...serverConfig, settings: envVarHook.settings }}
            validateManualEnvVars={envVarHook.validateManualEnvVars}
            triggerValidation={trigger}
            onCancel={handleHide}
            onNext={handleNext}
          />
        ) : (
          <MCPToolsSelectionStep
            isEditing={isEditing}
            mcpServer={{ ...serverConfig, settings: envVarHook.settings }}
            selectedTools={selectedTools}
            onToolsChange={setSelectedTools}
            onBack={handleBack}
            onCancel={handleHide}
            onSave={onSubmit}
            singleToolSelection={singleToolSelection}
          />
        )}
      </form>
    </Popup>
  )
}

export default MCPToolkitForm
