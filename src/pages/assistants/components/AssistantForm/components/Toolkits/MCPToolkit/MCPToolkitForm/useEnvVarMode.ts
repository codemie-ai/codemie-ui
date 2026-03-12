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

import { useState, useEffect } from 'react'

import { userSettingsStore } from '@/store/userSettings'
import { MCPServerDetails } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'

const hasRequiredEnvVars = (mcpServer?: MCPServerDetails): boolean => {
  return !!(mcpServer?.required_env_vars && mcpServer.required_env_vars.length > 0)
}

const isMarketplaceServer = (mcpServer?: MCPServerDetails): boolean => {
  return !!mcpServer?.isFromMarketplace
}

const getSettingName = (serverName: string): string => {
  return `${serverName.replace(/[^a-zA-Z0-9]/g, '_')}_env_vars`
}

export const useEnvVarMode = (mcpServer: MCPServerDetails | undefined, project: string) => {
  const [envVarMode, setEnvVarMode] = useState<'new' | 'existing'>('new')
  const [settings, setSettings] = useState<Setting>()
  const [manualEnvVarValues, setManualEnvVarValues] = useState<Record<string, string>>({})
  const [envVarErrors, setEnvVarErrors] = useState<Record<string, string>>({})

  const validateManualEnvVars = (): boolean => {
    const errors: Record<string, string> = {}
    let isValid = true

    mcpServer?.required_env_vars?.forEach((envVar) => {
      if (envVar.required && !manualEnvVarValues[envVar.name]?.trim()) {
        errors[envVar.name] = `${envVar.name} is required`
        isValid = false
      }
    })

    setEnvVarErrors(errors)
    return isValid
  }

  const shouldCreateNewEnvVarSetting = (): boolean => {
    return envVarMode === 'new' && hasRequiredEnvVars(mcpServer) && isMarketplaceServer(mcpServer)
  }

  useEffect(() => {
    const handleMarketplaceServer = async (server: MCPServerDetails) => {
      const settingName = getSettingName(server.name)
      const existingSetting = await userSettingsStore.findUserSetting(project, 'MCP', settingName)

      if (existingSetting) {
        setEnvVarMode('existing')
        setSettings(existingSetting as Setting)
      } else {
        setEnvVarMode('new')
      }
    }

    const initializeEnvVarMode = async () => {
      if (!mcpServer) return

      setSettings(mcpServer.settings)

      if (isMarketplaceServer(mcpServer) && hasRequiredEnvVars(mcpServer)) {
        await handleMarketplaceServer(mcpServer)
      } else if (!isMarketplaceServer(mcpServer)) {
        setEnvVarMode('existing')
      }
    }

    initializeEnvVarMode().catch((error) => {
      console.error('Error initializing env var mode:', error)
    })
  }, [mcpServer, project])

  const resetEnvVarState = () => {
    setSettings(undefined)
    setManualEnvVarValues({})
    setEnvVarErrors({})
  }

  return {
    envVarMode,
    setEnvVarMode,
    settings,
    setSettings,
    manualEnvVarValues,
    setManualEnvVarValues,
    envVarErrors,
    validateManualEnvVars,
    shouldCreateNewEnvVarSetting,
    resetEnvVarState,
  }
}
