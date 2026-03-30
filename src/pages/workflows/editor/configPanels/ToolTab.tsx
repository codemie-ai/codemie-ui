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

import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'

import { useNewIntegrationPopup } from '@/hooks/useNewIntegrationPopup'
import NewIntegrationPopup from '@/pages/integrations/components/NewIntegrationPopup'
import { ActorTypes } from '@/types/workflowEditor/base'
import {
  ToolConfiguration,
  ToolStateConfiguration,
  WorkflowConfiguration,
} from '@/types/workflowEditor/configuration'
import { extractToolkitSettings } from '@/utils/toolkit'
import { ConfigurationUpdate } from '@/utils/workflowEditor'
import { generateActorID, shouldReuseActorId } from '@/utils/workflowEditor/helpers/states'

import CommonStateFields, { CommonStateFieldsRef } from './CommonStateFields'
import { useWorkflowContext } from '../hooks/useWorkflowContext'
import ConfigAccordion from './components/ConfigAccordion'
import TabFooter from './components/TabFooter'
import ToolForm, { ToolFormRef } from './components/ToolForm'
import ValidationError from './components/ValidationError'
import { buildCommonStateConfig } from './utils/formUtils'

interface ToolTabProps {
  project: string
  stateId: string
  config: WorkflowConfiguration
  onConfigChange: (updates: ConfigurationUpdate) => void
  onClose: (forceClose?: boolean) => void
  onDelete: () => void
  onDuplicate?: () => void
  validationError?: string
  onClearStateError?: (stateId: string) => void
}

export interface ToolTabRef {
  isDirty: () => boolean
  save: () => Promise<boolean>
}

const getToolActorConfig = (config: WorkflowConfiguration, state: ToolStateConfiguration) => {
  const result = config.tools?.find((t) => t.id === state?.tool_id) as ToolConfiguration
  if (!result) {
    return {
      id: state.id,
      tool: '',
    }
  }
  return result
}

const extractToolFromToolkits = (toolkits: any[]) => {
  if (!toolkits?.[0]?.tools?.[0]) {
    return { tool: '', integration_alias: undefined }
  }

  const toolkit = toolkits[0]
  const firstTool = toolkit.tools[0]
  const { alias: integration_alias } = extractToolkitSettings(toolkit, firstTool)
  return {
    tool: firstTool.name,
    integration_alias,
  }
}

const extractMcpServer = (mcpServers: any[]) => {
  return mcpServers?.[0]
}

const ToolTab = forwardRef<ToolTabRef, ToolTabProps>(
  (
    {
      stateId,
      project,
      config,
      onConfigChange,
      onClose,
      onDelete,
      onDuplicate,
      validationError,
      onClearStateError,
    },
    ref
  ) => {
    const state = config.states?.find((s) => s.id === stateId) as ToolStateConfiguration
    const [toolActorConfig, setToolActorConfig] = useState<ToolConfiguration>(() =>
      getToolActorConfig(config, state)
    )
    const {
      showNewIntegration,
      selectedCredentialType,
      selectedProject,
      showNewIntegrationPopup,
      hideNewIntegrationPopup,
      onIntegrationSuccess,
    } = useNewIntegrationPopup()

    const { activeIssue } = useWorkflowContext()
    const [toolConfigExpanded, setToolConfigExpanded] = useState(true)

    const commonStateFieldsRef = useRef<CommonStateFieldsRef>(null)
    const toolFormRef = useRef<ToolFormRef>(null)

    useEffect(() => {
      if (!activeIssue?.path) return

      const toolFields = [
        'tool',
        'tool_args',
        'tool_result_json_pointer',
        'integration_alias',
        'trace',
        'resolve_dynamic_values_in_response',
        'mcp_server',
      ]

      if (
        toolFields.some(
          (field) => activeIssue.path === field || activeIssue.path.startsWith(`${field}.`)
        )
      ) {
        setToolConfigExpanded(true)
      }
    }, [activeIssue?.path])

    useEffect(() => {
      if (!state) return

      const toolActorConfig = getToolActorConfig(config, state)
      if (!toolActorConfig) return

      setToolActorConfig(toolActorConfig)
    }, [state?.tool_id, config, state])

    const saveData = async (): Promise<boolean> => {
      if (validationError && onClearStateError) {
        onClearStateError(stateId)
      }

      if (!commonStateFieldsRef.current) return false
      const isCommonFieldsValid = await commonStateFieldsRef.current.validate()
      if (!isCommonFieldsValid) return false

      const commonValues = commonStateFieldsRef.current.getValues()

      const canReuseId = shouldReuseActorId(config, ActorTypes.Tool, state.tool_id, stateId)
      const toolId =
        canReuseId && state.tool_id ? state.tool_id : generateActorID(ActorTypes.Tool, config)

      // Validate and get tool form values
      if (!toolFormRef.current) return false
      const isValid = await toolFormRef.current.validate()
      if (!isValid) return false

      const toolFormValues = toolFormRef.current.getValues()

      const mcp_server = extractMcpServer(toolFormValues.mcpServers)
      const { tool, integration_alias } = extractToolFromToolkits(toolFormValues.toolkits)

      const toolName = mcp_server?.tools?.[0] ?? tool

      const finalToolConfig: ToolConfiguration = {
        id: toolId,
        tool: toolName,
        tool_args: toolFormValues.tool_args,
        integration_alias,
        trace: toolFormValues.trace,
        tool_result_json_pointer: toolFormValues.tool_result_json_pointer,
        resolve_dynamic_values_in_response: toolFormValues.resolve_dynamic_values_in_response,
      }

      if (mcp_server) {
        finalToolConfig.mcp_server = {
          ...mcp_server,
          tools: undefined,
          settings: undefined,
          integration_alias: mcp_server?.settings?.alias,
        }
      }

      const updatedStateConfig: ToolStateConfiguration = {
        ...buildCommonStateConfig(commonValues, state),
        tool_id: finalToolConfig.id,
      }

      commonStateFieldsRef.current?.reset()
      toolFormRef.current?.reset()

      onConfigChange({
        state: { id: stateId, data: updatedStateConfig },
        actors: {
          tools: [finalToolConfig],
        },
      })

      return true
    }

    useImperativeHandle(
      ref,
      () => ({
        isDirty: () => {
          const commonFieldsDirty = commonStateFieldsRef.current?.isDirty() ?? false
          const toolFormDirty = toolFormRef.current?.isDirty() ?? false

          return commonFieldsDirty || toolFormDirty
        },
        save: saveData,
      }),
      [state, stateId, config, onConfigChange]
    )

    const handleSave = async () => {
      const success = await saveData()
      if (success) {
        onClose?.(true)
      }
    }

    if (!state) return null

    return (
      <>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <ValidationError message={validationError} />

          <ConfigAccordion
            title="Tool Configuration"
            defaultExpanded={true}
            expanded={toolConfigExpanded}
            onExpandedChange={setToolConfigExpanded}
          >
            <ToolForm
              ref={toolFormRef}
              project={project}
              toolConfig={toolActorConfig}
              showNewIntegrationPopup={showNewIntegrationPopup}
            />
          </ConfigAccordion>

          <CommonStateFields ref={commonStateFieldsRef} state={state} />
        </form>

        <TabFooter
          onCancel={() => onClose(true)}
          onSave={handleSave}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />

        <NewIntegrationPopup
          visible={showNewIntegration}
          onHide={hideNewIntegrationPopup}
          onSuccess={onIntegrationSuccess}
          project={selectedProject}
          credentialType={selectedCredentialType}
        />
      </>
    )
  }
)

ToolTab.displayName = 'ToolTab'

export default ToolTab
