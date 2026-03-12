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

import { Tool } from '@/types/entity/assistant'
import { MCPServerDetails } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'

import { handleNewEnvVarMode } from './formHelpers'

interface SubmitParams {
  serverConfig: MCPServerDetails
  settings: Setting | undefined
  manualEnvVarValues: Record<string, string>
  project: string
  isEditing: boolean
  mcpServer?: MCPServerDetails
  selectedTools: Tool[]
  shouldCreateNewEnvVarSetting: () => boolean
  validateManualEnvVars: () => boolean
  refreshSettings: () => Promise<any>
  updateMcpServer: (mcpServer: MCPServerDetails) => void
  reset: () => void
  resetEnvVarState: () => void
}

export const handleFormSubmit = async ({
  serverConfig,
  settings,
  manualEnvVarValues,
  project,
  isEditing,
  mcpServer,
  selectedTools,
  shouldCreateNewEnvVarSetting,
  validateManualEnvVars,
  refreshSettings,
  updateMcpServer,
  reset,
  resetEnvVarState,
}: SubmitParams) => {
  let finalSettings = settings

  if (shouldCreateNewEnvVarSetting()) {
    const newSettings = await handleNewEnvVarMode(
      serverConfig,
      manualEnvVarValues,
      project,
      validateManualEnvVars
    )
    if (!newSettings) return

    await refreshSettings()
    finalSettings = newSettings
  }

  updateMcpServer({
    ...serverConfig,
    settings: finalSettings,
    enabled: isEditing ? !!mcpServer?.enabled : true,
    tools: selectedTools.map((t) => t.name),
  })

  reset()
  resetEnvVarState()
}
