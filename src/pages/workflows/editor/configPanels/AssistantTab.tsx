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

import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { useForm } from 'react-hook-form'
import * as Yup from 'yup'

import Button from '@/components/Button'
import Input from '@/components/form/Input'
import Switch from '@/components/form/Switch'
import { useNewIntegrationPopup } from '@/hooks/useNewIntegrationPopup'
import FormGenAIPopup from '@/pages/assistants/components/AssistantForm/components/FormGenAIPopup'
import NewIntegrationPopup from '@/pages/integrations/components/NewIntegrationPopup'
import { AssistantAIGeneratedFields } from '@/types/entity/assistant'
import { ActorTypes, NodeTypes } from '@/types/workflowEditor/base'
import {
  AssistantConfiguration,
  AssistantStateConfiguration,
  WorkflowConfiguration,
} from '@/types/workflowEditor/configuration'
import { ConfigurationUpdate } from '@/utils/workflowEditor'
import { generateActorID, shouldReuseActorId } from '@/utils/workflowEditor/helpers/states'

import CommonStateFields, { CommonStateFieldsRef } from './CommonStateFields'
import AssistantSelector, { AssistantSelectorRef } from './components/AssistantSelector'
import ConfigAccordion from './components/ConfigAccordion'
import TabFooter from './components/TabFooter'
import ValidationError from './components/ValidationError'
import VirtualAssistantForm, { VirtualAssistantFormRef } from './components/VirtualAssistantForm'
import { buildCommonStateConfig } from './utils/formUtils'
import { registerFields } from '../utils/visualEditorFieldRegistry'
import FieldController from './components/FieldController'
import { useWorkflowContext } from '../hooks/useWorkflowContext'

registerFields(['limit_tool_output_tokens'], NodeTypes.ASSISTANT)
registerFields(['assistant_id'], NodeTypes.ASSISTANT, 'resource_validation')

interface AssistantTabProps {
  project: string
  stateId: string
  config: WorkflowConfiguration
  onConfigChange: (updates: ConfigurationUpdate) => void
  onClose: (skipDirtyCheck?: boolean) => void
  onDelete: () => void
  onDuplicate?: () => void
  validationError?: string
  onClearStateError?: (stateId: string) => void
}

export interface AssistantTabRef {
  isDirty: () => boolean
  save: () => Promise<boolean>
}

interface WorkflowAssistantFormValues {
  limit_tool_output_tokens?: number | string
}

const limitTokensValidationSchema = Yup.object().shape({
  limit_tool_output_tokens: Yup.number()
    .min(1, 'Tool output tokens limit must be at least 1')
    .integer('Tool output tokens limit must be an integer')
    .transform((value, originalValue) => (originalValue === '' ? undefined : value))
    .typeError('Tool output tokens limit must be a number')
    .optional(),
})

const getAssistantActorConfig = (
  config: WorkflowConfiguration,
  state: AssistantStateConfiguration
) => {
  const result = config.assistants?.find(
    (s) => s.id === state?.assistant_id
  ) as AssistantConfiguration
  if (!result) {
    return {
      id: state.id,
    }
  }
  return {
    ...result,
  }
}

const AssistantTab = forwardRef<AssistantTabRef, AssistantTabProps>(
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
    const state = config.states?.find((s) => s.id === stateId) as AssistantStateConfiguration
    const [assistantActorConfig, setAssistantActorConfig] = useState<AssistantConfiguration>(() =>
      getAssistantActorConfig(config, state)
    )
    const {
      showNewIntegration,
      selectedCredentialType,
      selectedProject,
      showNewIntegrationPopup,
      hideNewIntegrationPopup,
      onIntegrationSuccess,
    } = useNewIntegrationPopup()
    const [useVirtualAssistant, setUseVirtualAssistant] = useState(
      !assistantActorConfig?.assistant_id
    )

    const {
      control,
      getValues,
      trigger,
      formState: { isDirty: isLimitTokensDirty },
      reset,
    } = useForm<WorkflowAssistantFormValues>({
      resolver: yupResolver(limitTokensValidationSchema as any),
      mode: 'onChange',
      defaultValues: {
        limit_tool_output_tokens: assistantActorConfig?.limit_tool_output_tokens,
      },
    })

    const commonStateFieldsRef = useRef<CommonStateFieldsRef>(null)
    const virtualAssistantFormRef = useRef<VirtualAssistantFormRef>(null)
    const [showGenAIPopup, setShowGenAIPopup] = useState(false)
    const [isAssistantEmpty, setIsAssistantEmpty] = useState(true)

    const initialUseVirtualAssistant = useRef(!assistantActorConfig?.assistant_id)
    const initialAssistantId = useRef(assistantActorConfig?.assistant_id)

    const { getIssueField, markIssueDirty, issues } = useWorkflowContext()
    const assistantIdIssue = getIssueField<AssistantSelectorRef>('assistant_id')

    useEffect(() => {
      if (!state) return

      const assistantActorConfig = getAssistantActorConfig(config, state)
      if (!assistantActorConfig) return

      setAssistantActorConfig(assistantActorConfig)
      reset({
        limit_tool_output_tokens: assistantActorConfig.limit_tool_output_tokens,
      })
    }, [state?.assistant_id, config, state, reset])

    const handleAssistantConfigUpdate = (updatedConfig: AssistantConfiguration) => {
      setAssistantActorConfig(updatedConfig)
    }

    const handleAIGenerated = (fields: AssistantAIGeneratedFields) => {
      if (virtualAssistantFormRef.current) {
        virtualAssistantFormRef.current.setAIGeneratedFields(fields)
      }
    }

    const saveData = async (): Promise<boolean> => {
      if (validationError && onClearStateError) {
        onClearStateError(stateId)
      }

      if (!commonStateFieldsRef.current) return false
      const isCommonFieldsValid = await commonStateFieldsRef.current.validate()
      if (!isCommonFieldsValid) return false

      const isAssistantFormValid = await trigger()
      if (!isAssistantFormValid) return false

      const commonValues = commonStateFieldsRef.current.getValues()
      const assistantFormValues = getValues()

      const parsedLimit =
        assistantFormValues.limit_tool_output_tokens === '' ||
        assistantFormValues.limit_tool_output_tokens === undefined
          ? undefined
          : Number(assistantFormValues.limit_tool_output_tokens)

      const canReuseId = shouldReuseActorId(
        config,
        ActorTypes.Assistant,
        state.assistant_id,
        stateId
      )
      const assistantId =
        canReuseId && state.assistant_id
          ? state.assistant_id
          : generateActorID(ActorTypes.Assistant, config)

      let finalAssistantConfig

      if (useVirtualAssistant && virtualAssistantFormRef.current) {
        const isValid = await virtualAssistantFormRef.current.validate()
        if (!isValid) return false

        const virtualAssistantValues = virtualAssistantFormRef.current.getValues()

        finalAssistantConfig = {
          id: assistantId,
          model: virtualAssistantValues.llm_model_type,
          temperature: virtualAssistantValues.temperature,
          system_prompt: virtualAssistantValues.system_prompt,
          limit_tool_output_tokens: parsedLimit,
          mcp_servers: (virtualAssistantValues.mcp_servers || []).map((server) => ({
            ...server,
            settings: null,
            integration_alias: server.settings?.alias,
          })),
          tools: virtualAssistantValues.toolkits?.flatMap(
            (tk) =>
              tk.tools?.map((tool) => ({
                name: tool.name,
                integration_alias: tool.settings?.alias || tk.settings?.alias,
              })) || []
          ),
          datasource_ids: virtualAssistantValues.context.map((c) => c.id),
          skill_ids: virtualAssistantValues.skill_ids ?? [],
        }
      } else {
        finalAssistantConfig = {
          ...assistantActorConfig,
          id: assistantId,
          limit_tool_output_tokens: parsedLimit,
        }
      }

      const updatedStateConfig: AssistantStateConfiguration = {
        ...buildCommonStateConfig(commonValues, state),
        assistant_id: finalAssistantConfig?.id,
      }

      commonStateFieldsRef.current?.reset()
      virtualAssistantFormRef.current?.reset()
      reset(assistantFormValues)
      initialUseVirtualAssistant.current = useVirtualAssistant
      initialAssistantId.current = finalAssistantConfig?.assistant_id

      onConfigChange({
        state: { id: stateId, data: updatedStateConfig },
        actors: {
          assistants: finalAssistantConfig ? [finalAssistantConfig] : [],
        },
      })

      return true
    }

    useImperativeHandle(
      ref,
      () => ({
        isDirty: () => {
          const commonFieldsDirty = commonStateFieldsRef.current?.isDirty() ?? false
          const virtualAssistantDirty = useVirtualAssistant
            ? virtualAssistantFormRef.current?.isDirty() ?? false
            : false
          const virtualAssistantToggleChanged =
            useVirtualAssistant !== initialUseVirtualAssistant.current
          const assistantChanged =
            !useVirtualAssistant &&
            assistantActorConfig?.assistant_id !== initialAssistantId.current

          return (
            commonFieldsDirty ||
            virtualAssistantDirty ||
            virtualAssistantToggleChanged ||
            assistantChanged ||
            isLimitTokensDirty
          )
        },
        save: saveData,
      }),
      [
        useVirtualAssistant,
        assistantActorConfig?.assistant_id,
        isLimitTokensDirty,
        state,
        stateId,
        config,
        onConfigChange,
      ]
    )

    const handleSave = async () => {
      const success = await saveData()
      if (success) {
        onClose?.(true)
      }
    }

    const clearIssues = () => {
      issues?.forEach((issue) => {
        if (issue.stateId === stateId) markIssueDirty(issue)
      })
    }

    if (!state) return null

    return (
      <>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <ValidationError message={validationError} />

          <ConfigAccordion
            title="Assistant Configuration"
            defaultExpanded={true}
            headerActions={
              useVirtualAssistant &&
              isAssistantEmpty && (
                <Button
                  variant="magical"
                  size="small"
                  buttonType="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowGenAIPopup(true)
                  }}
                >
                  Generate with AI
                </Button>
              )
            }
          >
            <div className="flex flex-col gap-4">
              <Switch
                value={useVirtualAssistant}
                onChange={(e) => {
                  setUseVirtualAssistant(e.target.checked)
                  clearIssues()
                }}
                label="Use Virtual Assistant"
              />

              {useVirtualAssistant && (
                <VirtualAssistantForm
                  ref={virtualAssistantFormRef}
                  project={project}
                  assistantConfig={assistantActorConfig}
                  showNewIntegrationPopup={showNewIntegrationPopup}
                  onContentChange={(isEmpty) => setIsAssistantEmpty(isEmpty)}
                />
              )}

              {!useVirtualAssistant && assistantActorConfig && (
                <AssistantSelector
                  assistantConfig={assistantActorConfig}
                  onAssistantConfigUpdate={handleAssistantConfigUpdate}
                  ref={assistantIdIssue.ref}
                  issueError={assistantIdIssue.fieldError}
                  onIssueChange={assistantIdIssue.onChange}
                />
              )}

              <FieldController
                name="limit_tool_output_tokens"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    label="Limit Tool Output Tokens:"
                    placeholder="Enter limit"
                    error={fieldState.error?.message}
                    {...field}
                  />
                )}
              />
            </div>
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

        <FormGenAIPopup
          isVisible={showGenAIPopup}
          onHide={() => setShowGenAIPopup(false)}
          onGenerated={handleAIGenerated}
        />
      </>
    )
  }
)

AssistantTab.displayName = 'AssistantTab'

export default AssistantTab
